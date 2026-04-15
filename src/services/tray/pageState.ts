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
 * Whether pagination is currently active for the given settings snapshot
 * (toggle on, positive per-page, and more sensors than fit on one page).
 * @param settings - The settings to check.
 */
export function isPaginationActive(settings: Settings): boolean {
  return (
    settings.menuBarPaginationEnabled &&
    settings.menuBarSensorsPerPage > 0 &&
    settings.menuBarSensors.length > settings.menuBarSensorsPerPage
  );
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
  const perPage = settings.menuBarSensorsPerPage;
  const totalPages = Math.max(1, Math.ceil(settings.menuBarSensors.length / perPage));
  if (currentPage >= totalPages) currentPage = 0;
  return { page: currentPage, totalPages, perPage };
}

/**
 * The slice of sensors to show on the current page — or all sensors when
 * pagination is inactive.
 * @param settings - The settings snapshot to slice.
 */
export function getPagedSensors(settings: Settings): string[] {
  const info = getPaginationInfo(settings);
  if (!info) return settings.menuBarSensors;
  const start = info.page * info.perPage;
  return settings.menuBarSensors.slice(start, start + info.perPage);
}
