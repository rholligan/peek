/**
 * Configuration persistence service using Tauri filesystem API.
 * Stores settings in ~/.peek/config.json.
 * @module services/configStore
 */

import { readTextFile, writeTextFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { z } from 'zod';
import { DEFAULT_SETTINGS, type Settings, createLogger } from '@/shared';

const logger = createLogger('[ConfigStore]');

const CONFIG_DIR = '.peek';
const CONFIG_FILE = `${CONFIG_DIR}/config.json`;
const BASE_DIR = BaseDirectory.Home;

// In-memory cache to avoid reading file on every save
let cachedConfig: Settings | null = null;

/**
 * Zod schema for validating config files.
 * All fields are optional since config may be partial.
 */
const configSchema = z.object({
  haUrl: z.string().optional(),
  haToken: z.string().optional(),
  menuBarSensors: z.array(z.string()).optional(),
  dropdownSensors: z.array(z.string()).optional(),
  menuBarSensorNames: z.record(z.string(), z.string()).optional(),
  dropdownSensorNames: z.record(z.string(), z.string()).optional(),
  menuBarFormat: z.string().optional(),
  dropdownFormat: z.string().optional(),
  menuBarSeparator: z.string().optional(),
  menuBarPaginationEnabled: z.boolean().optional(),
  menuBarSensorsPerPage: z.number().int().min(1).max(10).optional(),
  menuBarCycleShortcut: z.string().optional(),
  menuBarAutoReturnEnabled: z.boolean().optional(),
  menuBarAutoReturnMinutes: z.number().int().min(1).max(120).optional(),
  menuBarPaginationExcludeGroups: z.boolean().optional(),
  menuBarCycleIntervalEnabled: z.boolean().optional(),
  menuBarCycleIntervalSeconds: z.number().int().min(1).max(60).optional(),
  menuBarPageTransitionsEnabled: z.boolean().optional(),
  menuBarPageTransitionDuration: z.number().int().min(50).max(2000).optional(),
  menuBarPageWidthStabilizationEnabled: z.boolean().optional(),
  menuBarVerticalAlignment: z.enum(["clock", "middle"]).optional(),
  sensorFormats: z.record(z.string(), z.string()).optional(),
  sensorConfigs: z.record(z.string(), z.object({
    scaleMultiplier: z.number().optional(),
    customUnit: z.string().optional(),
    decimalPlaces: z.number().int().min(0).max(10).optional(),
  })).optional(),
  autoStartOnLogin: z.boolean().optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  lastUpdateCheck: z.string().optional(),
}).catchall(z.unknown()); // Allow unknown fields for forward compatibility

async function readConfig(bypassCache = false): Promise<Settings> {
  // Return cached config if available and not bypassing
  if (!bypassCache && cachedConfig) {
    return { ...cachedConfig };
  }

  try {
    const raw = await readTextFile(CONFIG_FILE, { baseDir: BASE_DIR });
    const parsed: unknown = JSON.parse(raw);

    // Validate with Zod schema
    const result = configSchema.safeParse(parsed);
    if (result.success) {
      cachedConfig = { ...DEFAULT_SETTINGS, ...result.data };
      return { ...cachedConfig };
    }

    // Schema validation failed (e.g. hand-edited file with invalid field values).
    // To prevent wiping out the entire user config (including haUrl/haToken),
    // we recover all valid fields and fall back to defaults ONLY for invalid ones.
    logger.info("Config file contains some invalid or out-of-range fields. Recovering valid fields...");

    const merged = { ...DEFAULT_SETTINGS };
    if (parsed && typeof parsed === "object") {
      const dataObj = parsed as Record<string, unknown>;
      // For each expected field in configSchema, validate individually
      for (const [key, fieldSchema] of Object.entries(configSchema.shape)) {
        if (key in dataObj) {
          const fieldResult = fieldSchema.safeParse(dataObj[key]);
          if (fieldResult.success) {
            if (fieldResult.data !== undefined) {
              (merged as Record<string, unknown>)[key] = fieldResult.data;
            }
          } else {
            logger.info(`Config field "${key}" is invalid (value: ${dataObj[key]}). Falling back to default.`);
          }
        }
      }
    }

    cachedConfig = merged;
    return { ...cachedConfig };
  } catch {
    // File or directory doesn't exist yet, or JSON parse failed — return defaults
    cachedConfig = { ...DEFAULT_SETTINGS };
    return { ...cachedConfig };
  }
}

async function writeConfig(config: Settings): Promise<void> {
  // Ensure the config directory exists (no-op if it already does)
  await mkdir(CONFIG_DIR, { baseDir: BASE_DIR, recursive: true });
  await writeTextFile(CONFIG_FILE, JSON.stringify(config, null, 2), { baseDir: BASE_DIR });
  // Update cache after successful write
  cachedConfig = { ...config };
}

// --- Public API ---

/**
 * Load settings from the config file.
 * Returns default settings if config file doesn't exist.
 *
 * @param forceReload - If true, bypasses cache and reads from disk
 */
export async function loadSettings(forceReload = false): Promise<Settings> {
  return readConfig(forceReload);
}

/**
 * Save partial settings by merging with existing config.
 *
 * @param partial - Settings fields to update (merged with existing)
 * @returns The complete updated settings object
 */
export async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  const config = await readConfig();
  const updated = { ...config, ...partial };
  await writeConfig(updated);
  return updated;
}

