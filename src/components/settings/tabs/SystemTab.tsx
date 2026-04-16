/**
 * System settings tab for OS-level application preferences.
 * @module settings/tabs/SystemTab
 */

import type { Theme } from "@/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import { useAutoSaveField } from "@/hooks/useAutoSaveField";

/**
 * Tab for configuring system-level settings such as auto-start on login and theme.
 */
export function SystemTab() {
  const { value: autoStartOnLogin, onChange: setAutoStartOnLogin } =
    useAutoSaveField({ field: "autoStartOnLogin", debounce: 0 });
  const { value: theme, onChange: setTheme } =
    useAutoSaveField({ field: "theme", debounce: 0 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>System</CardTitle>
        <CardDescription>
          Control how the application integrates with your operating system.
        </CardDescription>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <Field
            label="Start at login"
            helperText="Automatically launch the application when you log in."
            orientation="horizontal"
          >
            <Switch
              aria-label="Start at login"
              checked={autoStartOnLogin}
              onCheckedChange={setAutoStartOnLogin}
            />
          </Field>

          <Separator />

          <Field
            label="Theme"
            helperText="Select the color scheme used across the application. System matches your macOS appearance."
            orientation="horizontal"
          >
            <Select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="w-44"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
        </div>
      </CardBody>
    </Card>
  );
}
