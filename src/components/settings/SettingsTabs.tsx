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
import { useState, useEffect, useCallback, useRef } from "react";
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
  const [showPreview, setShowPreview] = useState(() => {
    const saved = localStorage.getItem("peek_show_preview");
    return saved !== null ? saved === "true" : true;
  });

  const [previewHeight, setPreviewHeight] = useState(() => {
    const saved = localStorage.getItem("peek_preview_height");
    return saved !== null ? parseInt(saved, 10) : 176; // 11rem default
  });

  const isResizingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("peek_show_preview", String(showPreview));
  }, [showPreview]);

  useEffect(() => {
    localStorage.setItem("peek_preview_height", String(previewHeight));
  }, [previewHeight]);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    isResizingRef.current = true;
    
    const startY = mouseDownEvent.clientY;
    const startHeight = previewHeight;

    const doResize = (mouseMoveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      // Dragging the splitter UP (decreasing clientY) increases the preview height
      const deltaY = startY - mouseMoveEvent.clientY;
      const newHeight = Math.max(100, Math.min(450, startHeight + deltaY));
      setPreviewHeight(newHeight);
    };

    const stopResize = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", doResize);
      window.removeEventListener("mouseup", stopResize);
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
    document.body.style.cursor = "ns-resize";
  }, [previewHeight]);

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
        className="flex-1 flex flex-col min-h-0 px-4 py-4 overflow-hidden"
      >
        {TABS.map((tab) => (
          <TabPanel key={tab.id} className="flex-1 flex flex-col min-h-0 outline-none overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-1">
              <tab.Component />
            </div>
            {(tab.id === "sensors" || tab.id === "appearance") && (
              showPreview ? (
                <div className="shrink-0 border-t border-border/40 pt-4 mt-2 relative">
                  {/* Draggable splitter handle */}
                  <div 
                    onMouseDown={startResizing}
                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-50 flex items-center justify-center group"
                    title="Drag vertically to resize preview area"
                  >
                    <div className="w-12 h-1 bg-neutral-800 hover:bg-blue-500 rounded-full transition-all duration-150 absolute top-[-2px]" />
                  </div>
                  <LivePreviewMockup previewHeight={previewHeight} setShowPreview={setShowPreview} />
                </div>
              ) : (
                <div className="shrink-0 border-t border-border/40 pt-3 mt-2 flex justify-end">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md border border-neutral-700/50 hover:bg-neutral-800 text-blue-400 hover:text-blue-300 transition-colors duration-150 cursor-pointer"
                  >
                    Show Live Preview
                  </button>
                </div>
              )
            )}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
