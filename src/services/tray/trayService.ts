/**
 * System tray service - main orchestrator.
 * Manages the menu bar display and dropdown menu for sensor data.
 *
 * Two update paths:
 * - renderTray(): text-only updates via MenuItem.setText() — called on every WS state update
 * - rebuildTrayMenu(): full menu rebuild — called explicitly when menu structure changes
 *
 * @module services/tray/trayService
 */

import { MenuItem } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { buildMenu } from "./menuBuilder";
import { formatSensor } from "./sensorFormatter";
import { buildMenuBarTitle } from "./titleBuilder";
import { createInitialState } from "./trayState";
import { hasCredentials } from "@/services/haConnection";
import { getUpdateVersion, isUpdateAvailable } from "@/services/updater";
import { formatConnectionStatus, createLogger, type Settings, type HaEntityState, type HaConnectionStatus } from "@/shared";

const logger = createLogger("[Tray]");

const TRAY_ID = "peek-icon";

// Module state
const state = createInitialState();

/**
 * Compute the desired text for each menu item by ID.
 *
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 */
function computeMenuItemTexts(
  states: Map<string, HaEntityState>,
  settings: Settings | null,
): Map<string, string> {
  const texts = new Map<string, string>();

  const wantReconnect =
    state.status === "disconnected" && hasCredentials() && !state.reconnectInProgress;
  if (wantReconnect) {
    texts.set("reconnect", "Reconnect to Home Assistant");
  } else {
    texts.set("conn-status", formatConnectionStatus(state.status, state.error));
  }

  if (settings) {
    for (let i = 0; i < settings.dropdownSensors.length; i++) {
      const entityId = settings.dropdownSensors[i];
      
      if (entityId.startsWith("group:")) {
        const groupText = settings.dropdownSensorNames?.[entityId] || "Group";
        texts.set(`sensor-${i}`, groupText);
        continue;
      }

      const entity = states.get(entityId);
      const customName = settings.dropdownSensorNames?.[entityId];
      const customFormat = settings.sensorFormats?.[entityId] || settings.dropdownFormat;
      const numericConfig = settings.sensorConfigs?.[entityId];
      texts.set(
        `sensor-${i}`,
        formatSensor(entityId, entity, customName, customFormat, { numericConfig }),
      );
    }
  }

  if (isUpdateAvailable()) {
    const version = getUpdateVersion();
    texts.set("update-available", version ? `Update to version ${version}` : "Update available");
  }

  return texts;
}

/**
 * Update only the text of existing menu items via setText().
 *
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 */
async function applyMenuItemText(
  states: Map<string, HaEntityState>,
  settings: Settings | null,
): Promise<void> {
  const desiredTexts = computeMenuItemTexts(states, settings);
  const updates: Promise<void>[] = [];

  for (const [id, text] of desiredTexts) {
    if (state.itemTexts.get(id) === text) continue;
    const item = state.itemRefs.get(id);
    if (item) {
      updates.push(item.setText(text));
      state.itemTexts.set(id, text);
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

/**
 * Close all current menu resources (items and menu).
 */
async function cleanupCurrentMenu(): Promise<void> {
  const closeTasks: Promise<void>[] = [];
  for (const item of state.itemRefs.values()) {
    closeTasks.push(item.close().catch(() => {}));
  }
  if (state.currentMenu) {
    closeTasks.push(state.currentMenu.close().catch(() => {}));
  }
  state.itemRefs.clear();
  state.itemTexts.clear();
  state.currentMenu = null;
  await Promise.all(closeTasks);
}

/**
 * After a structural rebuild, extract MenuItem references from build result
 * into state.itemRefs and initialize state.itemTexts.
 *
 * @param items - Menu items from buildMenu result
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 */
function cacheMenuItemRefs(
  items: Awaited<ReturnType<typeof buildMenu>>["items"],
  states: Map<string, HaEntityState>,
  settings: Settings | null,
): void {
  state.itemRefs.clear();
  state.itemTexts.clear();

  for (const item of items) {
    if (item instanceof MenuItem) {
      state.itemRefs.set(item.id, item);
    }
  }

  const texts = computeMenuItemTexts(states, settings);
  for (const [id, text] of texts) {
    state.itemTexts.set(id, text);
  }
}

/**
 * Initialize the tray. The icon is created by tauri.conf.json's trayIcon config,
 * so we grab the existing instance by ID and set up the initial menu from JS.
 */
export async function initTray(): Promise<void> {
  state.tray = await TrayIcon.getById(TRAY_ID);
  if (!state.tray) return;

  const { menu, items } = await buildMenu(new Map(), null, state);
  await state.tray.setMenu(menu);
  state.currentMenu = menu;
  cacheMenuItemRefs(items, new Map(), null);
  await state.tray.setShowMenuOnLeftClick(true);
}

/**
 * Full menu rebuild. Called explicitly when menu structure changes
 * (settings saved, connection state changed, update found).
 *
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 */
export async function rebuildTrayMenu(
  states: Map<string, HaEntityState>,
  settings: Settings,
): Promise<void> {
  if (!state.tray) return;

  state.latestSettings = settings;
  updateMenuBarTitle(states, settings);
  updateMenuBarIcon(settings);

  try {
    await cleanupCurrentMenu();
    const { menu, items } = await buildMenu(states, settings, state);
    await state.tray.setMenu(menu);
    state.currentMenu = menu;
    cacheMenuItemRefs(items, states, settings);
  } catch (err) {
    logger.error("Tray rebuild failed:", err);
  }
}

/**
 * Update the connection state and rebuild the tray menu.
 * Rebuilds because connection changes can toggle the reconnect button.
 *
 * @param status - Current connection status
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 * @param error - Optional error message for display
 */
export async function setTrayConnectedState(
  status: HaConnectionStatus,
  states: Map<string, HaEntityState>,
  settings: Settings,
  error?: string | null
): Promise<void> {
  state.status = status;
  if (error !== undefined) state.error = error;
  if (status === "connected") state.error = null;
  await rebuildTrayMenu(states, settings);
}

let activeTransitionTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Animate transition between two titles in the menu bar using a character scramble/dissolve.
 * Returns a Promise that resolves when the animation is completed.
 *
 * @param source - The starting title string
 * @param target - The ending title string
 * @param tray - The Tauri TrayIcon instance
 */
function animateTitleTransition(source: string, target: string, tray: TrayIcon): Promise<void> {
  return new Promise<void>((resolve) => {
    if (activeTransitionTimer) {
      clearInterval(activeTransitionTimer);
      activeTransitionTimer = null;
    }

    const steps = 6;
    const interval = 25; // 25ms per step -> 150ms total animation duration (super snappy!)
    let currentStep = 0;

    activeTransitionTimer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        if (activeTransitionTimer) {
          clearInterval(activeTransitionTimer);
          activeTransitionTimer = null;
        }
        tray.setTitle(target)
          .then(() => resolve())
          .catch(() => resolve());
        return;
      }

      const ratio = currentStep / steps;
      const blended = blendStrings(source, target, ratio);
      tray.setTitle(blended).catch(() => {});
    }, interval);
  });
}

/**
 * Blend two strings based on progress ratio (0 to 1).
 * Replaces random characters of source with target characters or scramble symbols.
 *
 * @param source - The source starting string
 * @param target - The target ending string
 * @param ratio - Progress ratio from 0 to 1
 */
function blendStrings(source: string, target: string, ratio: number): string {
  const maxLength = Math.max(source.length, target.length);
  let result = "";

  for (let i = 0; i < maxLength; i++) {
    // Probability of using the target character increases as ratio increases
    if (Math.random() < ratio) {
      if (i < target.length) {
        result += target[i];
      }
    } else {
      if (i < source.length) {
        // Occasionally show a light scramble character (e.g. . or · or space) for a "dissolve" effect
        if (Math.random() < 0.25) {
          result += "·";
        } else {
          result += source[i];
        }
      } else {
        result += " ";
      }
    }
  }

  return result;
}

/**
 * Update the menu bar title.
 * Serializes updates to prevent racing async setTitle calls from causing flicker.
 *
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 */
function updateMenuBarTitle(
  states: Map<string, HaEntityState>,
  settings: Settings
): void {
  if (!state.tray) return;
  const titleToSet = buildMenuBarTitle(states, settings, state.status);

  if (titleToSet === state.latestTitle) return;
  const oldTitle = state.latestTitle || "";
  state.latestTitle = titleToSet;

  state.pendingTitleUpdate = state.pendingTitleUpdate
    .then(() => {
      if (titleToSet === state.latestTitle) {
        if (oldTitle && oldTitle !== titleToSet && state.status === "connected") {
          return animateTitleTransition(oldTitle, titleToSet, state.tray!);
        } else {
          return state.tray?.setTitle(titleToSet);
        }
      }
    })
    .catch((err) => logger.error("Title update failed:", err));
}

/**
 * Update icon visibility based on whether menu bar sensors are configured.
 *
 * @param settings - Current app settings
 */
function updateMenuBarIcon(settings: Settings): void {
  if (!state.tray) return;

  const shouldHideIcon = settings.menuBarSensors.length > 0;
  if (shouldHideIcon === state.iconHidden) return;
  state.iconHidden = shouldHideIcon;

  state.pendingTitleUpdate = state.pendingTitleUpdate
    .then(() => {
      if (shouldHideIcon) {
        return state.tray?.setIcon(null);
      } else {
        return state.tray?.setIcon("icons/tray.png");
      }
    })
    .catch((err) => logger.error("Icon update failed:", err));
}

/**
 * Text-only tray update. Called on every WS entity state change.
 * Updates menu bar title, icon, and dropdown item texts via setText().
 *
 * @param states - Current entity states from Home Assistant
 * @param settings - Current app settings
 */
export function renderTray(
  states: Map<string, HaEntityState>,
  settings: Settings
): void {
  state.latestSettings = settings;
  updateMenuBarTitle(states, settings);
  updateMenuBarIcon(settings);

  applyMenuItemText(states, settings).catch((err) =>
    logger.error("Tray text update failed:", err)
  );
}
