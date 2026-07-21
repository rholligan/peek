/**
 * Menu bar title building utilities.
 * @module services/tray/titleBuilder
 */

import { getPagedSensors, getPaginationInfo } from "./pageState";
import { formatSensor } from "./sensorFormatter";
import { UI_LIMITS, type HaEntityState, type HaConnectionStatus, type Settings } from "@/shared";

const TRUNCATION_INDICATOR = "...";

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

  // Find current page title prefix if pagination is active
  const pagInfo = getPaginationInfo(settings);
  const pageIndex = pagInfo ? pagInfo.page : 0;
  const pageTitle = settings.menuBarPageTitles?.[pageIndex];
  const prefix = pageTitle && pageTitle.trim() !== "" ? `${pageTitle.trim()}: ` : "";

  // Build separator with spaces around it (empty separator = single space)
  const separatorChar = settings.menuBarSeparator ?? "|";
  const separator = separatorChar ? ` ${separatorChar} ` : " ";

  const parts: string[] = [];
  let totalLength = prefix.length;
  let truncated = false;

  for (const entityId of getPagedSensors(settings)) {
    const entity = states.get(entityId);
    const customName = settings.menuBarSensorNames?.[entityId];
    const sensorFormat = settings.sensorFormats?.[entityId] || settings.menuBarFormat;
    const formatted = formatSensor(
      entityId,
      entity,
      customName,
      sensorFormat,
      { hideUnavailable: true, useShortId: true }
    );

    if (!formatted) continue;

    // Check if adding this would exceed max length
    const addedSeparator = parts.length > 0 ? separator : "";
    const newLength = totalLength + addedSeparator.length + formatted.length;

    if (newLength > UI_LIMITS.MAX_MENU_BAR_LENGTH) {
      if (parts.length === 0) {
        // First item alone exceeds limit - truncate it
        const maxFirstLength = UI_LIMITS.MAX_MENU_BAR_LENGTH - TRUNCATION_INDICATOR.length;
        parts.push(formatted.slice(0, maxFirstLength) + TRUNCATION_INDICATOR);
        totalLength = prefix.length + parts[0].length;
      } else {
        // Check if we can fit truncation indicator
        const indicatorLength =
          totalLength + addedSeparator.length + TRUNCATION_INDICATOR.length;
        if (indicatorLength <= UI_LIMITS.MAX_MENU_BAR_LENGTH) {
          truncated = true;
        }
      }
      break;
    }

    parts.push(formatted);
    totalLength = newLength;
  }

  if (truncated) {
    parts.push(TRUNCATION_INDICATOR);
  }

  return prefix + parts.join(separator);
}
