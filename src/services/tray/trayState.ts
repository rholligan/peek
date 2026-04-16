/**
 * Tray state interface and initialization.
 * @module services/tray/trayState
 */

import type {
  HaConnectionStatus,
  Settings,
} from "../../shared/types";
import type { Menu, MenuItem } from "@tauri-apps/api/menu";
import type { TrayIcon } from "@tauri-apps/api/tray";

/**
 * Module state for the tray service.
 */
export interface TrayState {
  /** Tray icon instance (null if initialization failed) */
  tray: TrayIcon | null;
  /** Whether the icon is currently hidden */
  iconHidden: boolean;
  /** Promise chain for serializing title/icon updates */
  pendingTitleUpdate: Promise<void>;
  /** Last title set (for deduplication) */
  latestTitle: string | null;
  /** Current connection status */
  status: HaConnectionStatus;
  /** Current error message */
  error: string | null;
  /** Latest settings - used for text updates when only states change */
  latestSettings: Settings | null;
  /** Prevents double-click on reconnect button */
  reconnectInProgress: boolean;
  /** Current menu instance (Rust resource) */
  currentMenu: Menu | null;
  /** References to menu items by ID for in-place setText() updates */
  itemRefs: Map<string, MenuItem>;
  /** Last-known text per item ID — skip no-op setText() calls */
  itemTexts: Map<string, string>;
}

/**
 * Create initial tray state.
 */
export function createInitialState(): TrayState {
  return {
    tray: null,
    iconHidden: false,
    pendingTitleUpdate: Promise.resolve(),
    latestTitle: null,
    status: "disconnected",
    error: null,
    latestSettings: null,
    reconnectInProgress: false,
    currentMenu: null,
    itemRefs: new Map(),
    itemTexts: new Map(),
  };
}

