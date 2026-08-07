import { describe, it, expect } from "vitest";
import { getPages } from "./pageState";
import { buildAllMenuBarTitles } from "./titleBuilder";
import { DEFAULT_SETTINGS } from "@/shared/constants";
import { type HaEntityState, type Settings } from "@/shared/types";

describe("titleBuilder - getMenuBarPages", () => {
  it("should return a single page if pagination is disabled", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      menuBarPaginationEnabled: false,
      menuBarSensors: ["sensor.one", "sensor.two", "sensor.three"],
    };

    const pages = getPages(settings);
    expect(pages).toEqual([["sensor.one", "sensor.two", "sensor.three"]]);
  });

  it("should split sensors into multiple pages based on the sensorsPerPage limit", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      menuBarPaginationEnabled: true,
      menuBarSensorsPerPage: 2,
      menuBarSensors: ["sensor.one", "sensor.two", "sensor.three", "sensor.four", "sensor.five"],
    };

    const pages = getPages(settings);
    expect(pages).toEqual([
      ["sensor.one", "sensor.two"],
      ["sensor.three", "sensor.four"],
      ["sensor.five"],
    ]);
  });

  it("should explicitly break pages at 'page_break:X' group tags", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      menuBarPaginationEnabled: true,
      menuBarSensorsPerPage: 5, // High limit, so breaks should ONLY happen at page_breaks
      menuBarSensors: ["sensor.one", "page_break:a", "sensor.two", "page_break:b", "sensor.three"],
    };

    const pages = getPages(settings);
    expect(pages).toEqual([
      ["sensor.one"],
      ["sensor.two"],
      ["sensor.three"],
    ]);
  });

  it("should count group titles toward the limit if menuBarPaginationExcludeGroups is false", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      menuBarPaginationEnabled: true,
      menuBarSensorsPerPage: 2,
      menuBarPaginationExcludeGroups: false,
      menuBarSensors: ["group:a", "sensor.one", "sensor.two", "group:b", "sensor.three"],
    };

    const pages = getPages(settings);
    expect(pages).toEqual([
      ["group:a", "sensor.one"],
      ["sensor.two", "group:b"],
      ["sensor.three"],
    ]);
  });

  it("should ignore group titles in page count if menuBarPaginationExcludeGroups is true", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      menuBarPaginationEnabled: true,
      menuBarSensorsPerPage: 2,
      menuBarPaginationExcludeGroups: true,
      menuBarSensors: ["group:a", "sensor.one", "sensor.two", "group:b", "sensor.three"],
    };

    const pages = getPages(settings);
    // Page 1 gets "group:a", "sensor.one", "sensor.two" (only 2 standard sensors)
    // Page 2 gets "group:b", "sensor.three"
    expect(pages).toEqual([
      ["group:a", "sensor.one", "sensor.two", "group:b"],
      ["sensor.three"],
    ]);
  });
});

describe("titleBuilder - buildAllMenuBarTitles", () => {
  it("should build accurate titles with custom separators and page stabilization", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      menuBarPaginationEnabled: true,
      menuBarSensorsPerPage: 2,
      menuBarSeparator: " | ",
      menuBarFormat: "{value}",
      menuBarSensorNames: {
        "group:header": "Env",
      },
      menuBarSensors: ["group:header", "sensor.temp", "sensor.humidity"],
    };

    const states = new Map<string, HaEntityState>([
      ["sensor.temp", { entity_id: "sensor.temp", state: "22", attributes: {}, last_changed: "", last_updated: "" }],
      ["sensor.humidity", { entity_id: "sensor.humidity", state: "50", attributes: {}, last_changed: "", last_updated: "" }],
    ]);

    const titles = buildAllMenuBarTitles(states, settings);
    expect(titles).toEqual([
      "Env  |  22",
      "50"
    ]);
  });
});
