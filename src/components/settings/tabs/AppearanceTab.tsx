/**
 * Appearance settings tab for menu bar and dropdown format templates.
 * @module settings/tabs/AppearanceTab
 */

import { FormatInput } from "@/components/settings/FormatInput";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NumberStepperInput } from "@/components/ui/NumberStepperInput";
import { Select } from "@/components/ui/Select";
import { Separator } from "@/components/ui/Separator";
import { ShortcutInput } from "@/components/ui/ShortcutInput";
import { Switch } from "@/components/ui/Switch";
import { useAutoSaveField, useAutoSaveSettings } from "@/hooks/useAutoSaveField";
import {
  probeMenuBarCycleShortcut,
  syncMenuBarCycleShortcut,
  unregisterMenuBarCycleShortcut,
} from "@/services/globalShortcut";
import { applyFormat } from "@/services/tray";
import { SEPARATOR_OPTIONS } from "@/shared/constants";

const SENSORS_PER_PAGE_MIN = 1;
const SENSORS_PER_PAGE_MAX = 10;
const AUTO_RETURN_MINUTES_MIN = 1;
const AUTO_RETURN_MINUTES_MAX = 120;

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
  const { settings, savePartial } = useAutoSaveSettings();
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
  const { value: autoReturnEnabled, onChange: setAutoReturnEnabled } =
    useAutoSaveField({ field: "menuBarAutoReturnEnabled", debounce: 0 });
  const { value: autoReturnMinutes, onChange: setAutoReturnMinutes } =
    useAutoSaveField({ field: "menuBarAutoReturnMinutes", debounce: 500 });
  const { value: cycleIntervalEnabled, onChange: setCycleIntervalEnabled } =
    useAutoSaveField({ field: "menuBarCycleIntervalEnabled", debounce: 0 });
  const { value: cycleIntervalSeconds, onChange: setCycleIntervalSeconds } =
    useAutoSaveField({ field: "menuBarCycleIntervalSeconds", debounce: 500 });

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
              <NumberStepperInput
                value={sensorsPerPage}
                onChange={setSensorsPerPage}
                min={SENSORS_PER_PAGE_MIN}
                max={SENSORS_PER_PAGE_MAX}
                disabled={!paginationEnabled}
                ariaLabel="Sensors per page"
              />
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
                validate={probeMenuBarCycleShortcut}
              />
            </Field>

            <Separator />

            <Field
              label="Auto-return to first page"
              helperText="Return to the first page when the shortcut hasn't been pressed for a while."
              orientation="horizontal"
            >
              <Switch
                checked={autoReturnEnabled}
                onCheckedChange={setAutoReturnEnabled}
                disabled={!paginationEnabled}
                aria-label="Auto-return to first page"
              />
            </Field>

            <Separator />

            <Field
              label="Return after"
              helperText="Minutes to wait after the last shortcut press."
              orientation="horizontal"
            >
              <NumberStepperInput
                value={autoReturnMinutes}
                onChange={setAutoReturnMinutes}
                min={AUTO_RETURN_MINUTES_MIN}
                max={AUTO_RETURN_MINUTES_MAX}
                disabled={!paginationEnabled || !autoReturnEnabled}
                ariaLabel="Auto-return minutes"
              />
            </Field>

            <Separator />

            <Field
              label="Enable auto-cycle"
              helperText="Automatically rotate menu bar sensor pages on a timer."
              orientation="horizontal"
            >
              <Switch
                checked={cycleIntervalEnabled}
                onCheckedChange={setCycleIntervalEnabled}
                disabled={!paginationEnabled}
                aria-label="Enable auto-cycle"
              />
            </Field>

            <Separator />

            <Field
              label="Cycle interval"
              helperText="Seconds to wait before rotating to the next page."
              orientation="horizontal"
            >
              <NumberStepperInput
                value={cycleIntervalSeconds}
                onChange={setCycleIntervalSeconds}
                min={5}
                max={60}
                disabled={!paginationEnabled || !cycleIntervalEnabled}
                ariaLabel="Cycle interval seconds"
              />
            </Field>

            {paginationEnabled && settings.menuBarSensors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-fg mb-1">Page/Group Titles</h4>
                    <p className="text-xs text-fg-muted">Provide a custom title prefix for each page (e.g., &quot;Home&quot;, &quot;Office&quot;). Leave blank to hide.</p>
                  </div>
                  <div className="space-y-3 pl-2">
                    {Array.from({ length: Math.ceil(settings.menuBarSensors.length / sensorsPerPage) }).map((_, idx) => (
                      <Field
                        key={idx}
                        label={`Page ${idx + 1} Title`}
                        helperText={`Prefix for page ${idx + 1}.`}
                        orientation="horizontal"
                      >
                        <input
                          type="text"
                          value={settings.menuBarPageTitles?.[idx] || ""}
                          onChange={(e) => {
                            const newTitles = [...(settings.menuBarPageTitles || [])];
                            newTitles[idx] = e.target.value;
                            savePartial({ menuBarPageTitles: newTitles });
                          }}
                          className="font-medium text-sm bg-bg-panel border border-border rounded-lg px-3 py-1.5 w-44 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                          placeholder={`Page ${idx + 1}`}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              </>
            )}
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
