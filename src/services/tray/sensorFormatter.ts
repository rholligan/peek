/**
 * Sensor formatting utilities for tray display.
 * Pure functions for formatting sensor data.
 * @module services/tray/sensorFormatter
 */

import { type HaEntityState, type SensorConfig } from "@/shared";

/**
 * Options for formatting a sensor.
 */
export interface FormatSensorOptions {
  /** Return empty string instead of showing unavailable state (for menu bar) */
  hideUnavailable?: boolean;
  /** Use short entity ID (after the dot) as fallback instead of full ID */
  useShortId?: boolean;
  /** Custom numeric configuration */
  numericConfig?: SensorConfig;
}

/**
 * Apply a format template to sensor data.
 *
 * @param format - Template string with {name} and {value} placeholders
 * @param name - Sensor display name
 * @param value - Sensor value (including unit if applicable)
 * @returns Formatted string with placeholders replaced
 *
 * @example
 * applyFormat("{name}: {value}", "Temperature", "72°F") // "Temperature: 72°F"
 * applyFormat("{value}", "Temperature", "72°F") // "72°F"
 */
export function applyFormat(format: string, name: string, value: string): string {
  return format.replaceAll("{name}", name).replaceAll("{value}", value);
}

/**
 * Format a raw state value, applying HA precision, custom scale multipliers, units, and decimal overrides.
 *
 * @param state - The raw state string from HA (e.g. "5555")
 * @param entity - The full HA entity state snapshot
 * @param config - Optional custom numeric scaling/unit configurations
 */
function formatNumericValue(
  state: string,
  entity: HaEntityState | undefined,
  config?: SensorConfig
): { formattedValue: string; formattedUnit: string } {
  const rawUnit = entity?.attributes?.unit_of_measurement as string | undefined;
  const unit = config?.customUnit !== undefined ? config.customUnit : (rawUnit || "");

  if (state === "unavailable" || state === "unknown") {
    return { formattedValue: state, formattedUnit: "" };
  }

  const num = Number(state);
  if (!Number.isFinite(num)) {
    return { formattedValue: state, formattedUnit: unit };
  }

  // Apply custom scale multiplier if defined
  let scaledNum = num;
  if (config?.scaleMultiplier !== undefined && config.scaleMultiplier !== 1) {
    scaledNum = num * config.scaleMultiplier;
  }

  // Apply decimal places precision override (fallback to entity precision or 2)
  const precision = config?.decimalPlaces !== undefined 
    ? config.decimalPlaces 
    : (entity?.displayPrecision !== undefined ? entity.displayPrecision : undefined);

  const formattedValue = precision !== undefined 
    ? scaledNum.toFixed(precision) 
    : String(scaledNum);

  return { formattedValue, formattedUnit: unit };
}

/**
 * Format a sensor for display.
 * Used for both dropdown menu items and menu bar title.
 *
 * @param entityId - Entity ID (e.g., "sensor.temperature")
 * @param entity - Entity state from Home Assistant (undefined if not found)
 * @param customName - Custom display name from settings (optional)
 * @param format - Format template (optional, defaults to "{name}: {value}")
 * @param options - Formatting options
 * @returns Formatted sensor string
 *
 * @example
 * formatSensor("sensor.temp", entity, undefined, "{value}") // "72°F"
 * formatSensor("sensor.temp", undefined, "Temp") // "Temp: N/A"
 */
export function formatSensor(
  entityId: string,
  entity: HaEntityState | undefined,
  customName?: string,
  format?: string,
  options: FormatSensorOptions = {}
): string {
  const { hideUnavailable = false, useShortId = false, numericConfig } = options;

  const friendlyName = entity?.attributes?.friendly_name as string | undefined;
  const fallbackId = useShortId ? entityId.split(".")[1] : entityId;
  
  // Differentiate between "no custom name" (undefined) and "explicit blank/empty title" (" " or "")
  const isBlank = customName === " " || customName === "";
  const label = isBlank ? "" : (customName ?? friendlyName ?? fallbackId);

  if (label === "") {
    if (!entity) {
      return hideUnavailable ? "" : "N/A";
    }
    const sensorState = entity.state;
    if (sensorState === "unavailable" || sensorState === "unknown") {
      return hideUnavailable ? "" : sensorState;
    }
    const { formattedValue, formattedUnit } = formatNumericValue(sensorState, entity, numericConfig);
    return `${formattedValue}${formattedUnit ? ` ${formattedUnit}` : ""}`;
  }

  if (!entity) {
    return hideUnavailable
      ? ""
      : format
        ? applyFormat(format, label, "N/A")
        : `${label}: N/A`;
  }

  const sensorState = entity.state;
  if (sensorState === "unavailable" || sensorState === "unknown") {
    return hideUnavailable
      ? ""
      : format
        ? applyFormat(format, label, sensorState)
        : `${label}: ${sensorState}`;
  }

  const { formattedValue, formattedUnit } = formatNumericValue(sensorState, entity, numericConfig);
  const value = `${formattedValue}${formattedUnit ? ` ${formattedUnit}` : ""}`;
  return format ? applyFormat(format, label, value) : `${label}: ${value}`;
}

