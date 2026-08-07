import { describe, it, expect, vi } from "vitest";
import { loadSettings } from "./configStore";

// Mock Tauri plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => {
  let mockFileContent = JSON.stringify({
    haUrl: "http://192.168.1.1:8123",
    haToken: "token123",
    menuBarSensorsPerPage: 200, // Invalid: exceeds max 10
    menuBarCycleIntervalSeconds: -5, // Invalid: below min 1
    theme: "purple", // Invalid: not light/dark/system
  });

  return {
    readTextFile: vi.fn().mockImplementation(() => Promise.resolve(mockFileContent)),
    writeTextFile: vi.fn().mockImplementation((_path: string, content: string) => {
      mockFileContent = content;
      return Promise.resolve();
    }),
    mkdir: vi.fn().mockImplementation(() => Promise.resolve()),
    BaseDirectory: { Home: "Home" },
  };
});

describe("configStore - Config recovery and validation", () => {
  it("should recover valid fields and use default for invalid fields on partial failure", async () => {
    const settings = await loadSettings(true);

    // haUrl and haToken should be recovered successfully
    expect(settings.haUrl).toBe("http://192.168.1.1:8123");
    expect(settings.haToken).toBe("token123");

    // menuBarSensorsPerPage was invalid (200, max is 10), so it should fallback to DEFAULT_SETTINGS value (3)
    expect(settings.menuBarSensorsPerPage).toBe(3);

    // menuBarCycleIntervalSeconds was invalid (-5, min is 1), so it should fallback to DEFAULT_SETTINGS value (10)
    expect(settings.menuBarCycleIntervalSeconds).toBe(10);

    // theme was invalid ("purple"), so it should fallback to DEFAULT_SETTINGS value ("system")
    expect(settings.theme).toBe("system");
  });
});
