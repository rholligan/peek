import { getCurrentWindow } from "@tauri-apps/api/window";
import { enable as enableAutostart, disable as disableAutostart } from "@tauri-apps/plugin-autostart";
import { loadSettings } from "./configStore";
import {
  configureMenuBarCycleShortcut,
  syncMenuBarCycleShortcut,
  unregisterMenuBarCycleShortcut,
} from "./globalShortcut";
import { connect, entitiesToMap, getStates, onStateUpdate, onStatusChange } from "./haConnection";
import {
  advanceMenuBarPage,
  getMenuBarPaginationInfo,
  initTray,
  rebuildTrayMenu,
  renderTray,
  resetMenuBarPage,
  setTrayConnectedState,
} from "./tray";
import { onUpdateFound, startPeriodicChecks } from "./updater";
import type { HassEntities } from "home-assistant-js-websocket";
import { createLogger, getTrackedSensorIds, type Settings } from "@/shared";

const logger = createLogger("[Lifecycle]");

let currentSettings: Settings | null = null;
let appInitialized = false;
let unsubscribeStatus: (() => void) | null = null;
let unsubscribeStates: (() => void) | null = null;
/** Cached tracked sensor IDs — recomputed only when settings change */
let trackedIds: string[] = [];

function updateTrackedIds(settings: Settings): void {
  trackedIds = getTrackedSensorIds(settings);
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function paginationInputsChanged(prev: Settings | null, next: Settings): boolean {
  if (!prev) return true;
  return (
    prev.menuBarPaginationEnabled !== next.menuBarPaginationEnabled ||
    prev.menuBarSensorsPerPage !== next.menuBarSensorsPerPage ||
    !arraysEqual(prev.menuBarSensors, next.menuBarSensors)
  );
}

/** Global-shortcut callback: advance to the next page and re-render the tray. */
function cycleMenuBarPage(): void {
  if (!currentSettings) return;
  const info = getMenuBarPaginationInfo(currentSettings);
  if (!info) return;
  advanceMenuBarPage(info.totalPages);
  renderTray(getStates(trackedIds), currentSettings);
}

/**
 * Initialize the application: tray, window handling, and HA connection.
 * Safe to call multiple times (guards against HMR re-initialization).
 */
export async function initializeApp(): Promise<void> {
  if (appInitialized) return;
  appInitialized = true;

  // Set up the system tray
  await initTray();

  // Set up close event handler - hide instead of close
  const mainWindow = getCurrentWindow();
  await mainWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    await mainWindow.hide();
  });

  // Load settings and attempt HA connection
  currentSettings = await loadSettings();
  updateTrackedIds(currentSettings);

  // Clean up previous subscriptions (e.g. HMR re-init)
  unsubscribeStatus?.();
  unsubscribeStates?.();
  await unregisterMenuBarCycleShortcut();

  // Wire connection status changes to tray renderer
  unsubscribeStatus = onStatusChange((status, error) => {
    if (currentSettings) {
      setTrayConnectedState(status, getStates(trackedIds), currentSettings, error);
    }
  });

  // Wire state updates to tray renderer
  unsubscribeStates = onStateUpdate((entities: HassEntities) => {
    if (currentSettings) {
      renderTray(entitiesToMap(entities, trackedIds), currentSettings);
    }
  });

  // Rebuild tray when a background update check finds a new version (adds "Update available" item)
  onUpdateFound(() => {
    if (currentSettings) {
      rebuildTrayMenu(getStates(trackedIds), currentSettings);
    }
  });

  // Connect if URL and token are available, otherwise show preferences
  if (currentSettings.haUrl && currentSettings.haToken) {
    connect(currentSettings.haUrl, currentSettings.haToken).catch((err) => {
      logger.error("Initial connection failed:", err);
    });
  } else {
    await mainWindow.show();
    await mainWindow.setFocus();
  }

  // Start periodic update checks (skips if checked recently)
  startPeriodicChecks(currentSettings.lastUpdateCheck);

  configureMenuBarCycleShortcut(currentSettings, cycleMenuBarPage);
  await syncMenuBarCycleShortcut();
}

/**
 * Called from the settings UI after saving to refresh tray and reconnect if needed.
 */
export async function onSettingsChanged(): Promise<void> {
  const previousSettings = currentSettings;
  currentSettings = await loadSettings();
  updateTrackedIds(currentSettings);

  // Reset paging when the sensor list or pagination settings change so the
  // user isn't stranded on a page that no longer exists.
  if (paginationInputsChanged(previousSettings, currentSettings)) {
    resetMenuBarPage();
  }

  // Rebuild tray menu with new settings (sensors/URL may have changed)
  await rebuildTrayMenu(getStates(trackedIds), currentSettings);

  configureMenuBarCycleShortcut(currentSettings, cycleMenuBarPage);
  await syncMenuBarCycleShortcut();

  // Only reconnect if connection settings (URL or token) changed
  const connectionChanged =
    previousSettings?.haUrl !== currentSettings.haUrl ||
    previousSettings?.haToken !== currentSettings.haToken;

  if (connectionChanged && currentSettings.haUrl && currentSettings.haToken) {
    connect(currentSettings.haUrl, currentSettings.haToken).catch((err) => {
      logger.error("Reconnection failed:", err);
    });
  }

  // Update autostart setting if it changed
  const autostartChanged = previousSettings?.autoStartOnLogin !== currentSettings.autoStartOnLogin;
  if (autostartChanged) {
    try {
      if (currentSettings.autoStartOnLogin) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
    } catch (error) {
      logger.error("Failed to update autostart setting:", error);
    }
  }
}
