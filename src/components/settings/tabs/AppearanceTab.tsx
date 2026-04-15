/**
 * Appearance settings tab for menu bar and dropdown format templates.
 * @module settings/tabs/AppearanceTab
 */

import { ChevronDown, ChevronUp } from "lucide-react";
import { FormatInput } from "@/components/settings/FormatInput";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Separator } from "@/components/ui/Separator";
import { ShortcutInput } from "@/components/ui/ShortcutInput";
import { Switch } from "@/components/ui/Switch";
import { useAutoSaveField } from "@/hooks/useAutoSaveField";
import {
  syncMenuBarCycleShortcut,
  unregisterMenuBarCycleShortcut,
} from "@/services/globalShortcut";
import { applyFormat } from "@/services/tray";
import { SEPARATOR_OPTIONS } from "@/shared/constants";

const SENSORS_PER_PAGE_MIN = 1;
const SENSORS_PER_PAGE_MAX = 10;

function clampSensorsPerPage(n: number): number {
  if (!Number.isFinite(n)) return SENSORS_PER_PAGE_MIN;
  return Math.max(SENSORS_PER_PAGE_MIN, Math.min(SENSORS_PER_PAGE_MAX, Math.floor(n)));
}

/** Reusable description for format template inputs */
const formatDescription = (
  <>
    Use{" "}
    <code className="text-xs bg-bg-muted px-1 py-0.5 rounded-lg">
      {"{name}"}
    </code>{" "}
    for the sensor name and{" "}
    <code className="text-xs bg-bg-muted px-1 py-0.5 rounded-lg">
      {"{value}"}
    </code>{" "}
    for the value.
  </>
);

/**
 * Tab for configuring appearance preferences.
 * Includes menu bar icon visibility, separator, and format templates.
 * Uses auto-save pattern with immediate save for toggles and debounced save for text.
 */
export function AppearanceTab() {
  const { value: menuBarSeparator, onChange: setMenuBarSeparator } =
    useAutoSaveField({ field: "menuBarSeparator", debounce: 0 });
  const { value: menuBarFormat, onChange: setMenuBarFormat } = useAutoSaveField(
    { field: "menuBarFormat", debounce: 500 }
  );
  const { value: dropdownFormat, onChange: setDropdownFormat } =
    useAutoSaveField({ field: "dropdownFormat", debounce: 500 });
  const { value: paginationEnabled, onChange: setPaginationEnabled } =
    useAutoSaveField({ field: "menuBarPaginationEnabled", debounce: 0 });
  const { value: sensorsPerPage, onChange: setSensorsPerPage } =
    useAutoSaveField({ field: "menuBarSensorsPerPage", debounce: 500 });
  const { value: cycleShortcut, onChange: setCycleShortcut } =
    useAutoSaveField({ field: "menuBarCycleShortcut", debounce: 0 });

  return (
    <>
      {/* Menu Bar Card */}
      <Card>
        <CardHeader>
          <CardTitle>Menu bar</CardTitle>
          <CardDescription>
            Customize how sensors appear in your menu bar.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <Field
              label="Sensor separator"
              helperText="Character displayed between sensors in the menu bar."
              orientation="horizontal"
            >
              <Select
                aria-label="Sensor separator"
                value={menuBarSeparator}
                onChange={(e) => setMenuBarSeparator(e.target.value)}
                className="w-44"
              >
                {SEPARATOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Separator />

            <FormatInput
              label="Display format"
              description={<>Format for sensors shown in the menu bar. {formatDescription}</>}
              value={menuBarFormat}
              onChange={setMenuBarFormat}
              placeholder="{value}"
              previewFn={(f) => applyFormat(f, "Living Room", "22°C")}
            />

            <Separator />

            <Field
              label="Enable pagination"
              helperText="Split sensors into pages and cycle between them with a keyboard shortcut."
              orientation="horizontal"
            >
              <Switch
                checked={paginationEnabled}
                onCheckedChange={setPaginationEnabled}
                aria-label="Enable pagination"
              />
            </Field>

            <Separator />

            <Field
              label="Sensors per page"
              helperText="Maximum sensors shown per page. Some may be trimmed if they don't fit in the available menu bar space."
              orientation="horizontal"
            >
              <div className="relative inline-flex w-20">
                <Input
                  type="number"
                  min={SENSORS_PER_PAGE_MIN}
                  max={SENSORS_PER_PAGE_MAX}
                  value={sensorsPerPage}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isFinite(parsed)) return;
                    setSensorsPerPage(clampSensorsPerPage(parsed));
                  }}
                  disabled={!paginationEnabled}
                  aria-label="Sensors per page"
                  className={
                    "w-full pr-9 " +
                    "[&::-webkit-inner-spin-button]:appearance-none " +
                    "[&::-webkit-outer-spin-button]:appearance-none " +
                    "[appearance:textfield]"
                  }
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex flex-col justify-center">
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Increase"
                    disabled={!paginationEnabled || sensorsPerPage >= SENSORS_PER_PAGE_MAX}
                    onClick={() => setSensorsPerPage(clampSensorsPerPage(sensorsPerPage + 1))}
                    className="pointer-events-auto flex h-3 items-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Decrease"
                    disabled={!paginationEnabled || sensorsPerPage <= SENSORS_PER_PAGE_MIN}
                    onClick={() => setSensorsPerPage(clampSensorsPerPage(sensorsPerPage - 1))}
                    className="pointer-events-auto flex h-3 items-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </Field>

            <Separator />

            <Field
              label="Cycle shortcut"
              helperText="Global shortcut to advance to the next page."
              orientation="horizontal"
            >
              <ShortcutInput
                value={cycleShortcut}
                onChange={setCycleShortcut}
                disabled={!paginationEnabled}
                onRecordingChange={(rec) => {
                  // Pause the live OS binding while recording so the keypress
                  // reaches the DOM instead of firing the shortcut.
                  if (rec) void unregisterMenuBarCycleShortcut();
                  else void syncMenuBarCycleShortcut();
                }}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Dropdown Menu Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dropdown menu</CardTitle>
          <CardDescription>
            Customize how sensors appear in the dropdown menu.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <FormatInput
            label="Display format"
            description={<>Format for sensors shown in the dropdown. {formatDescription}</>}
            value={dropdownFormat}
            onChange={setDropdownFormat}
            placeholder="{name}: {value}"
            previewFn={(f) => applyFormat(f, "Living Room", "22°C")}
          />
        </CardBody>
      </Card>
    </>
  );
}
