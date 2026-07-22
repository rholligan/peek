/**
 * Menu bar pagination state and derived helpers.
 * Page index is module-local and not persisted — resets to 0 on app launch.
 * @module services/tray/pageState
 */

import type { Settings } from "@/shared";

let currentPage = 0;
let autoReturnTimer: ReturnType<typeof setTimeout> | null = null;

/** Current page index (0-based). */
export function getCurrentPage(): number {
  return currentPage;
}

/**
 * Set the current page index, clamped to >= 0.
 * @param page - The page index to set.
 */
export function setCurrentPage(page: number): void {
  currentPage = page < 0 ? 0 : page;
}

/**
 * Advance to the next page, wrapping at totalPages.
 * @param totalPages - The number of pages available.
 */
export function advancePage(totalPages: number): void {
  currentPage = totalPages > 0 ? (currentPage + 1) % totalPages : 0;
}

/** Reset the page index to 0. */
export function resetPage(): void {
  currentPage = 0;
}

/**
 * Schedule an automatic return to page 0 after `minutes` of inactivity.
 * Replaces any pending timer. No-op when `minutes <= 0` or already on page 0.
 * @param minutes - Inactivity window before resetting.
 * @param onFire - Invoked after the page is reset (e.g. to re-render the tray).
 */
export function scheduleAutoReturn(minutes: number, onFire: () => void): void {
  clearAutoReturn();
  if (minutes <= 0 || currentPage === 0) return;
  autoReturnTimer = setTimeout(() => {
    autoReturnTimer = null;
    if (currentPage === 0) return;
    resetPage();
    onFire();
  }, minutes * 60_000);
}

/** Cancel any pending auto-return timer. */
export function clearAutoReturn(): void {
  if (autoReturnTimer) {
    clearTimeout(autoReturnTimer);
    autoReturnTimer = null;
  }
}

/**
 * Partition the list of sensors and groups into separate pages based on settings.
 * Supports manual page breaks and automatic chunking (with optional group exclusion).
 * @param settings - The settings snapshot to partition.
 */
export function getPages(settings: Settings): string[][] {
  const sensors = settings.menuBarSensors;
  const perPage = settings.menuBarSensorsPerPage;
  const excludeGroups = settings.menuBarPaginationExcludeGroups;

  if (!settings.menuBarPaginationEnabled || sensors.length === 0) {
    return [sensors];
  }

  // Check if manual page breaks are used
  const hasPageBreaks = sensors.some((item) => item.startsWith("page_break:"));

  if (hasPageBreaks) {
    const pages: string[][] = [];
    let currentPageItems: string[] = [];

    for (const item of sensors) {
      if (item.startsWith("page_break:")) {
        if (currentPageItems.length > 0) {
          pages.push(currentPageItems);
          currentPageItems = [];
        }
      } else {
        currentPageItems.push(item);
      }
    }

    if (currentPageItems.length > 0) {
      pages.push(currentPageItems);
    }

    return pages.length > 0 ? pages : [[]];
  }

  // Automatic pagination chunking
  if (perPage <= 0) return [sensors];

  if (!excludeGroups) {
    const pages: string[][] = [];
    for (let i = 0; i < sensors.length; i += perPage) {
      pages.push(sensors.slice(i, i + perPage));
    }
    return pages;
  }

  // Automatic pagination with group exclusion
  const pages: string[][] = [];
  let currentPageItems: string[] = [];
  let currentSensorCount = 0;

  for (const item of sensors) {
    const isGroup = item.startsWith("group:");
    
    if (isGroup) {
      currentPageItems.push(item);
    } else {
      if (currentSensorCount >= perPage) {
        pages.push(currentPageItems);
        currentPageItems = [];
        currentSensorCount = 0;
      }
      currentPageItems.push(item);
      currentSensorCount++;
    }
  }

  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }

  return pages;
}

/**
 * Whether pagination is currently active for the given settings snapshot
 * (toggle on, positive per-page, and more sensors than fit on one page).
 * @param settings - The settings to check.
 */
export function isPaginationActive(settings: Settings): boolean {
  if (!settings.menuBarPaginationEnabled || settings.menuBarSensors.length === 0) {
    return false;
  }
  return getPages(settings).length > 1;
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  perPage: number;
}

/**
 * Returns the effective page/totalPages/perPage for a settings snapshot, or
 * null when pagination is inactive. If the stored page index has drifted
 * past the current total (e.g. sensors were removed), it's clamped to 0
 * as a side effect so subsequent reads are consistent.
 * @param settings - The settings snapshot to derive pagination info from.
 */
export function getPaginationInfo(settings: Settings): PaginationInfo | null {
  if (!isPaginationActive(settings)) return null;
  const pages = getPages(settings);
  const totalPages = pages.length;
  if (currentPage >= totalPages) currentPage = 0;
  return { page: currentPage, totalPages, perPage: settings.menuBarSensorsPerPage };
}

/**
 * The slice of sensors to show on the current page — or all sensors when
 * pagination is inactive.
 * @param settings - The settings snapshot to slice.
 */
export function getPagedSensors(settings: Settings): string[] {
  if (!isPaginationActive(settings)) return settings.menuBarSensors;
  const pages = getPages(settings);
  const info = getPaginationInfo(settings);
  if (!info) return settings.menuBarSensors;
  return pages[info.page] || [];
}
