/**
 * Global keyboard shortcut registration for menu bar page cycling.
 * Uses tauri-plugin-global-shortcut so the shortcut fires regardless of
 * which app is focused.
 * @module services/globalShortcut
 */

import {
  register,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { isMenuBarPaginationActive } from "./tray";
import { toast } from "@/components/ui/Toaster";
import { createLogger, type Settings } from "@/shared";

const logger = createLogger("[Shortcut]");

function conflictMessage(accelerator: string): string {
  return `Couldn't register shortcut "${accelerator}" — it may already be in use by another app.`;
}

let currentShortcut: string | null = null;
let activeSettings: Settings | null = null;
let activeOnCycle: (() => void) | null = null;
/** Serializes reconcile operations so concurrent callers don't race each other. */
let syncQueue: Promise<void> = Promise.resolve();

function desiredAccelerator(): string {
  if (!activeSettings || !isMenuBarPaginationActive(activeSettings)) return "";
  return (activeSettings.menuBarCycleShortcut ?? "").trim();
}

/**
 * Unregister every shortcut Peek owns. We rely on the fact that this app
 * only ever registers one shortcut — using the plugin's `unregisterAll` is
 * more robust than tracking a single accelerator string, because module
 * state (e.g. across HMR reloads or settings drift) can get out of sync
 * with what's actually bound at the OS level.
 */
async function tearDown(): Promise<void> {
  try {
    await unregisterAll();
  } catch (err) {
    logger.error("unregisterAll failed:", err);
  }
  currentShortcut = null;
}

async function reconcile(): Promise<void> {
  const desired = desiredAccelerator();
  if (desired === currentShortcut) return;

  await tearDown();
  if (!desired) return;

  try {
    await register(desired, (event) => {
      if (event.state && event.state !== "Pressed") return;
      activeOnCycle?.();
    });
    currentShortcut = desired;
  } catch (err) {
    logger.error(`Failed to register "${desired}":`, err);
    currentShortcut = null;
    toast.error(conflictMessage(desired));
  }
}

/**
 * Update the settings snapshot and cycle callback used by the next reconcile.
 * Callers should follow this with `syncMenuBarCycleShortcut()` to apply changes.
 * @param settings - Current settings (determines whether/which shortcut to bind).
 * @param onCycle - Invoked on every key-down edge of the registered shortcut.
 */
export function configureMenuBarCycleShortcut(
  settings: Settings,
  onCycle: () => void,
): void {
  activeSettings = settings;
  activeOnCycle = onCycle;
}

/**
 * Reconcile the registered global shortcut with the latest configured settings.
 * Serialized — overlapping callers queue behind each other so two syncs fired
 * back-to-back (e.g. settings save and recorder resume) don't fight.
 */
export function syncMenuBarCycleShortcut(): Promise<void> {
  syncQueue = syncQueue.then(reconcile, reconcile);
  return syncQueue;
}

/** Tear down any registered shortcut (used on HMR / shutdown / while recording). */
export function unregisterMenuBarCycleShortcut(): Promise<void> {
  syncQueue = syncQueue.then(tearDown, tearDown);
  return syncQueue;
}

/**
 * Test whether `accelerator` can be bound right now without persisting it.
 * Lets the settings UI surface a conflict (shortcut already in use) as an
 * error toast instead of writing a broken value to disk and only discovering
 * the failure on the next reconcile. Empty string is treated as valid
 * (means "no shortcut").
 */
export function probeMenuBarCycleShortcut(accelerator: string): Promise<boolean> {
  const trimmed = accelerator.trim();
  if (!trimmed) return Promise.resolve(true);

  const probe = async (): Promise<boolean> => {
    try {
      await register(trimmed, () => {});
      await tearDown();
      return true;
    } catch (err) {
      logger.error(`Probe register "${trimmed}" failed:`, err);
      toast.error(conflictMessage(trimmed));
      return false;
    }
  };

  const next = syncQueue.then(probe, probe);
  syncQueue = next.then(() => {}, () => {});
  return next;
}
