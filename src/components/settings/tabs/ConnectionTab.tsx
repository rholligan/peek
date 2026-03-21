/**
 * Connection settings tab for Home Assistant server configuration.
 * @module settings/tabs/ConnectionTab
 */

import { isWebUri } from "valid-url";
import { ConnectionStatus } from "@/components/settings/ConnectionStatus";
import { TokenInput } from "@/components/settings/TokenInput";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useAutoSaveField } from "@/hooks/useAutoSaveField";

/**
 * Tab for configuring the Home Assistant connection including server URL,
 * access token, and connection status display.
 */
export function ConnectionTab() {
  const { value: haUrl, onChange: setHaUrl } = useAutoSaveField({
    field: "haUrl",
    debounce: 500,
  });
  const { value: haToken, onChange: setHaToken } = useAutoSaveField({
    field: "haToken",
    debounce: 500,
  });

  const urlValid = !haUrl || !!isWebUri(haUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Home Assistant</CardTitle>
        <CardDescription>
          Configure your Home Assistant server connection.
        </CardDescription>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          <ConnectionStatus />
          <Field
            label="Server URL"
            helperText="The URL to your Home Assistant instance, including port if needed."
            invalid={!urlValid}
            errorText="Enter a valid URL (e.g., http://homeassistant.local:8123)"
          >
            <Input
              type="url"
              value={haUrl}
              onChange={(e) => setHaUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
            />
          </Field>
          <TokenInput
            value={haToken}
            onChange={setHaToken}
            onClear={() => setHaToken("")}
          />
        </div>
      </CardBody>
    </Card>
  );
}
