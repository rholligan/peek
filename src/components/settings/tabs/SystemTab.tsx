/**
 * System settings tab for OS-level application preferences.
 * @module settings/tabs/SystemTab
 */

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { useAutoSaveField } from "@/hooks/useAutoSaveField";

/**
 * Tab for configuring system-level settings such as auto-start on login.
 */
export function SystemTab() {
  const { value: autoStartOnLogin, onChange: setAutoStartOnLogin } =
    useAutoSaveField({ field: "autoStartOnLogin", debounce: 0 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>System</CardTitle>
        <CardDescription>
          Control how the application integrates with your operating system.
        </CardDescription>
      </CardHeader>
      <CardBody>
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
      </CardBody>
    </Card>
  );
}
