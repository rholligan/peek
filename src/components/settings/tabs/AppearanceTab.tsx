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
import { Switch } from "@/components/ui/Switch";
import { useAutoSaveField, useAutoSaveSettings } from "@/hooks/useAutoSaveField";
import { applyFormat } from "@/services/tray";
import { type Settings } from "@/shared";
import { SEPARATOR_OPTIONS } from "@/shared/constants";

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
 * Includes menu bar separator, format templates, alignments, and transitions.
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

            {settings.menuBarPaginationEnabled && (
              <>
                <Separator />
                
                <Field
                  label="Vertical alignment"
                  helperText="Nudge text vertically to either center geometrically with icons, or align perfectly with the macOS system clock's text baseline."
                  orientation="horizontal"
                >
                  <Select
                    aria-label="Vertical alignment"
                    value={settings.menuBarVerticalAlignment}
                    onChange={(e) => savePartial({ menuBarVerticalAlignment: e.target.value as "clock" | "middle" })}
                    className="w-44"
                  >
                    <option value="clock">Align with system clock baseline</option>
                    <option value="middle">Middle-align with system icons</option>
                  </Select>
                </Field>

                <Separator />

                <Field
                  label="Stabilize width"
                  helperText="Natively lock the menu bar item's physical width to the widest page, preventing surrounding system icons from shifting."
                  orientation="horizontal"
                >
                  <Switch
                    checked={settings.menuBarPageWidthStabilizationEnabled}
                    onCheckedChange={(checked) => savePartial({ menuBarPageWidthStabilizationEnabled: checked })}
                    aria-label="Stabilize menu bar width"
                  />
                </Field>

                <Separator />

                <Field
                  label="Page transitions"
                  helperText="Briefly blank out the text before showing the next page to reduce visual distraction."
                  orientation="horizontal"
                >
                  <Switch
                    checked={settings.menuBarPageTransitionsEnabled}
                    onCheckedChange={(checked) => savePartial({ menuBarPageTransitionsEnabled: checked })}
                    aria-label="Enable page transitions"
                  />
                </Field>

                {settings.menuBarPageTransitionsEnabled && (
                  <>
                    <Separator />
                    <Field
                      label="Page transition duration"
                      helperText="Transition duration in milliseconds (50ms to 2000ms)."
                      orientation="horizontal"
                    >
                      <NumberStepperInput
                        value={settings.menuBarPageTransitionDuration || 300}
                        onChange={(val) => {
                          const updates: Partial<Settings> = { menuBarPageTransitionDuration: val };
                          const cycleIntervalMs = settings.menuBarCycleIntervalSeconds * 1000;
                          if (val > cycleIntervalMs) {
                            updates.menuBarPageTransitionDuration = cycleIntervalMs;
                          }
                          savePartial(updates);
                        }}
                        min={50}
                        max={2000}
                        ariaLabel="Page transition duration"
                      />
                    </Field>
                  </>
                )}
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
