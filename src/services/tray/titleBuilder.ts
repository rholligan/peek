/**
 * Menu bar title building utilities.
 * @module services/tray/titleBuilder
 */

import { getPagedSensors, getPages } from "./pageState";
import { formatSensor } from "./sensorFormatter";
import { UI_LIMITS, type HaEntityState, type HaConnectionStatus, type Settings } from "@/shared";

/**
 * Helper to build the raw title text for a specific slice of sensors/groups.
 *
 * @param sensorsList - List of sensor entity IDs
 * @param states - Map of Home Assistant entity states
 * @param settings - Current application settings
 */
function buildTitleForSensors(
  sensorsList: string[],
  states: Map<string, HaEntityState>,
  settings: Settings
): string {
  // Build separator with spaces around it (empty separator = single space)
  const separatorChar = settings.menuBarSeparator ?? "|";
  const separator = separatorChar ? ` ${separatorChar} ` : " ";

  let title = "";
  let skipNextSeparator = false;

  for (const item of sensorsList) {
    let formatted = "";
    let isGroup = false;

    if (item.startsWith("group:")) {
      formatted = settings.menuBarSensorNames?.[item] ?? "";
      isGroup = true;
    } else {
      const entity = states.get(item);
      const customName = settings.menuBarSensorNames?.[item];
      const sensorFormat = settings.sensorFormats?.[item] || settings.menuBarFormat;
      const numericConfig = settings.sensorConfigs?.[item];
      formatted = formatSensor(
        item,
        entity,
        customName,
        sensorFormat,
        { hideUnavailable: true, useShortId: true, numericConfig }
      );
    }

    if (!formatted) continue;

    if (title.length > 0 && !skipNextSeparator) {
      title += separator;
    }

    title += formatted;

    // Skip separator if group ends with space (e.g. "Home: ") or is a custom divider (e.g. "│")
    if (isGroup) {
      skipNextSeparator = formatted.endsWith(" ") || ["│", "•", "-", "│", "|", "·"].includes(formatted.trim());
    } else {
      skipNextSeparator = false;
    }
  }

  // Handle total length truncation
  if (title.length > UI_LIMITS.MAX_MENU_BAR_LENGTH) {
    title = title.slice(0, UI_LIMITS.MAX_MENU_BAR_LENGTH - 3) + "...";
  }

  return title;
}

/**
 * Build the menu bar title from menuBarSensors.
 * Returns status text when not connected, sensor values when connected.
 *
 * @param states - Current entity states
 * @param settings - App settings with sensor configuration
 * @param status - Current connection status
 * @returns Menu bar title string
 *
 * @example
 * // When connected with sensors
 * buildMenuBarTitle(states, settings, "connected") // "72°F | 45%"
 *
 * // When disconnected
 * buildMenuBarTitle(states, settings, "disconnected") // "Disconnected"
 */
export function buildMenuBarTitle(
  states: Map<string, HaEntityState>,
  settings: Settings,
  status: HaConnectionStatus
): string {
  // Show status indicator when not connected
  if (status !== "connected") {
    switch (status) {
      case "connecting":
        return "Connecting...";
      case "auth_invalid":
        return "Auth Error";
      default:
        return "Disconnected";
    }
  }
  if (settings.menuBarSensors.length === 0) return "";

  // Build the base title for the current paged slice
  const pagedSensors = getPagedSensors(settings);
  return buildTitleForSensors(pagedSensors, states, settings);
}

/**
 * Build raw titles for all pages to allow physical width calculations.
 *
 * @param states - Map of Home Assistant entity states
 * @param settings - Current application settings
 */
export function buildAllMenuBarTitles(
  states: Map<string, HaEntityState>,
  settings: Settings
): string[] {
  if (settings.menuBarSensors.length === 0) return [];
  const pages = getPages(settings);
  return pages.map((pageSensors) => buildTitleForSensors(pageSensors, states, settings));
}
