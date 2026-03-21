/**
 * Connection settings tab for Home Assistant server configuration.
 * @module settings/tabs/ConnectionTab
 */

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
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
import { useHaConnectionStatus } from "@/hooks/useHaStates";
import { cn } from "@/shared";

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

  const { status } = useHaConnectionStatus();
  const isConnected = status === "connected";
  const urlValid = !haUrl || !!isWebUri(haUrl);

  const connectionFields = (
    <>
      <Field
        label="Server URL"
        helperText="The URL to your Home Assistant instance, including port if needed."
        invalid={!urlValid}
        errorText="Enter a valid URL (e.g., https://homeassistant.local:8123)"
      >
        <Input
          type="url"
          value={haUrl}
          onChange={(e) => setHaUrl(e.target.value)}
          placeholder="https://homeassistant.local:8123"
        />
      </Field>
      <TokenInput
        value={haToken}
        onChange={setHaToken}
        onClear={() => setHaToken("")}
      />
    </>
  );

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

          {isConnected ? (
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer hover:text-white transition-colors duration-200">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        open && "rotate-180"
                      )}
                    />
                    Connection settings
                  </DisclosureButton>
                  <DisclosurePanel className="space-y-6 mt-4">
                    {connectionFields}
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ) : (
            <>
              {connectionFields}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
