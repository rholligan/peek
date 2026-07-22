/**
 * Tray service public API.
 * @module services/tray
 */

export { initTray, setTrayConnectedState, renderTray, rebuildTrayMenu } from "./trayService";
export { applyFormat, formatSensor } from "./sensorFormatter";
export type { FormatSensorOptions } from "./sensorFormatter";
export {
  advancePage as advanceMenuBarPage,
  resetPage as resetMenuBarPage,
  getPaginationInfo as getMenuBarPaginationInfo,
  getPages as getMenuBarPages,
  isPaginationActive as isMenuBarPaginationActive,
  scheduleAutoReturn as scheduleMenuBarAutoReturn,
  clearAutoReturn as clearMenuBarAutoReturn,
} from "./pageState";
