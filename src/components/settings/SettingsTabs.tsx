/**
 * Tabbed navigation for settings UI.
 * @module SettingsTabs
 */

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  Plug,
  Activity,
  Palette,
  Settings,
  Info,
} from "lucide-react";
import { LivePreviewMockup } from "@/components/settings/LivePreviewMockup";
import { AboutTab } from "@/components/settings/tabs/AboutTab";
import { AppearanceTab } from "@/components/settings/tabs/AppearanceTab";
import { ConnectionTab } from "@/components/settings/tabs/ConnectionTab";
import { SensorsTab } from "@/components/settings/tabs/SensorsTab";
import { SystemTab } from "@/components/settings/tabs/SystemTab";
import { cn } from "@/shared";

/** Available settings tabs */
const TABS = [
  { id: "connection", label: "Connection", Icon: Plug, Component: ConnectionTab },
  { id: "sensors", label: "Sensors", Icon: Activity, Component: SensorsTab },
  { id: "appearance", label: "Appearance", Icon: Palette, Component: AppearanceTab },
  { id: "system", label: "System", Icon: Settings, Component: SystemTab },
  { id: "about", label: "About", Icon: Info, Component: AboutTab },
] as const;

type SettingsTabsProps = {
  activeTabIndex: number;
  onTabChange: (index: number) => void;
};

export function SettingsTabs({ activeTabIndex, onTabChange }: SettingsTabsProps) {
  return (
    <TabGroup
      vertical
      selectedIndex={activeTabIndex}
      onChange={onTabChange}
      className="flex flex-1 flex-row min-h-0"
    >
      <TabList className="shrink-0 flex flex-col gap-1 p-4 w-44">
        {TABS.map((tab) => (
          <Tab
            key={tab.id}
            className={({ selected }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer text-left",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
                selected
                  ? "bg-bg-panel text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-bg-panel/50"
              )
            }
          >
            <tab.Icon size={16} />
            {tab.label}
          </Tab>
        ))}
      </TabList>

      <TabPanels
        as="main"
        aria-label="Settings"
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {TABS.map((tab) => (
          <TabPanel key={tab.id} className="space-y-6 outline-none">
            <tab.Component />
            {(tab.id === "sensors" || tab.id === "appearance") && <LivePreviewMockup />}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
