/**
 * Sensors settings tab for managing menu bar and dropdown sensor lists.
 * Supports drag-and-drop reordering within lists and moving between lists.
 * @module settings/tabs/SensorsTab
 */

import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { Wifi, Battery } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { DragOverlaySensorItem } from "@/components/settings/DragOverlaySensorItem";
import { SensorSection, listNames, sensorNamesKeyMap, type SensorListKey } from "@/components/settings/SensorSection";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NumberStepperInput } from "@/components/ui/NumberStepperInput";
import { Separator } from "@/components/ui/Separator";
import { ShortcutInput } from "@/components/ui/ShortcutInput";
import { Switch } from "@/components/ui/Switch";
import { useAutoSaveSettings } from "@/hooks/useAutoSaveField";
import { useHaStates } from "@/hooks/useHaStates";
import {
  probeMenuBarCycleShortcut,
  syncMenuBarCycleShortcut,
  unregisterMenuBarCycleShortcut,
} from "@/services/globalShortcut";
import { getMenuBarPages, buildAllMenuBarTitles } from "@/services/tray";
import { moveSensorBetweenLists, type Settings } from "@/shared";

const CONTAINER_IDS: readonly SensorListKey[] = [
  "menuBarSensors",
  "dropdownSensors",
];

function isContainerId(id: string): id is SensorListKey {
  return CONTAINER_IDS.includes(id as SensorListKey);
}

function getContainerForItem(
  settings: { menuBarSensors: string[]; dropdownSensors: string[] },
  itemId: string
): SensorListKey | null {
  if (settings.menuBarSensors.includes(itemId)) return "menuBarSensors";
  if (settings.dropdownSensors.includes(itemId)) return "dropdownSensors";
  return null;
}

function getOverContainer(
  settings: { menuBarSensors: string[]; dropdownSensors: string[] },
  overId: string
): SensorListKey | null {
  if (isContainerId(overId)) return overId;
  return getContainerForItem(settings, overId);
}

const SECTIONS: ReadonlyArray<{
  listKey: SensorListKey;
  title: string;
  description: string;
}> = [
  {
    listKey: "menuBarSensors",
    title: "Menu bar sensors",
    description:
      "Sensors displayed directly in your system menu bar.",
  },
  {
    listKey: "dropdownSensors",
    title: "Dropdown menu sensors",
    description:
      "Sensors shown when you click on the menu bar item.",
  },
];

/**
 * Tab for managing sensors displayed in menu bar and dropdown.
 * Contains two SensorSection components for each display location.
 * Manages shared DndContext for cross-list drag-and-drop.
 */
export function SensorsTab() {
  const { settings, savePartial } = useAutoSaveSettings();
  const [states] = useHaStates();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overContainerId, setOverContainerId] = useState<SensorListKey | null>(
    null
  );

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!event.over) {
        setOverContainerId(null);
        return;
      }
      setOverContainerId(getOverContainer(settings, event.over.id as string));
    },
    [settings]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverContainerId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeContainer =
        (active.data.current?.sortable?.containerId as SensorListKey) ||
        getContainerForItem(settings, activeId);

      const overContainer =
        (over.data.current?.sortable?.containerId as SensorListKey) ||
        getOverContainer(settings, overId);

      if (!activeContainer || !overContainer) return;

      if (activeContainer === overContainer) {
        const list = settings[activeContainer];
        const oldIndex = list.indexOf(activeId);
        const newIndex = list.indexOf(overId);
        if (oldIndex !== newIndex && newIndex !== -1) {
          const reordered = arrayMove(list, oldIndex, newIndex);
          savePartial({ [activeContainer]: reordered });
        }
      } else {
        const sourceList = settings[activeContainer];
        const targetList = settings[overContainer];

        const { newSourceList, newTargetList } = moveSensorBetweenLists(
          sourceList,
          targetList,
          activeId
        );

        savePartial({
          [activeContainer]: newSourceList,
          [overContainer]: newTargetList,
        });
      }
    },
    [settings, savePartial]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverContainerId(null);
  }, []);

  const getPosition = useCallback(
    (listKey: SensorListKey, id: string) =>
      settings[listKey].indexOf(id) + 1,
    [settings]
  );

  const announcements = useMemo(
    () => ({
      onDragStart: ({ active }: DragStartEvent) => {
        const container = getContainerForItem(settings, active.id as string);
        if (!container) return "";
        const position = getPosition(container, active.id as string);
        const total = settings[container].length;
        return `Picked up sensor from ${listNames[container]}. Position ${position} of ${total}.`;
      },
      onDragOver: ({ over }: DragOverEvent) => {
        if (!over) return "Not over a droppable area.";
        const overId = over.id as string;
        const overContainer = getOverContainer(settings, overId);
        if (!overContainer) return "";
        if (isContainerId(overId)) {
          return `Over ${listNames[overContainer]}. Will be added at end.`;
        }
        const position = getPosition(overContainer, overId);
        const total = settings[overContainer].length;
        return `Over position ${position} of ${total} in ${listNames[overContainer]}.`;
      },
      onDragEnd: ({ active, over }: DragEndEvent) => {
        if (!over) return "Sensor returned to original position.";
        const activeContainer = getContainerForItem(settings, active.id as string);
        const overId = over.id as string;
        const overContainer = getOverContainer(settings, overId);
        if (!activeContainer || !overContainer) return "";
        if (activeContainer === overContainer) {
          const position = getPosition(overContainer, overId);
          const total = settings[overContainer].length;
          return `Sensor dropped at position ${position} of ${total}.`;
        }
        return `Sensor moved to ${listNames[overContainer]}.`;
      },
      onDragCancel: () =>
        "Drag cancelled. Sensor returned to original position.",
    }),
    [settings, getPosition]
  );

  const activeContainer = activeId
    ? getContainerForItem(settings, activeId)
    : null;

  return (
    <>
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements }}
      >
        {SECTIONS.map(({ listKey, title, description }) => (
          <SensorSection
            key={listKey}
            title={title}
            description={description}
            listKey={listKey}
            isOverContainer={
              overContainerId === listKey && activeContainer !== listKey
            }
          />
        ))}
        <DragOverlay>
          {activeId && activeContainer ? (
            <DragOverlaySensorItem
              entityId={activeId}
              sensorNames={settings[sensorNamesKeyMap[activeContainer]]}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Grouping and Pagination Settings Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Grouping & Pagination</CardTitle>
          <CardDescription>
            Group your menu bar sensors into pages, auto-cycle them, and set page/group titles.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            
            {/* Layout & Partitioning Group */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 select-none flex items-center gap-1.5">
                Layout & Partitioning
              </h4>
              
              <Field
                label="Enable page cycling"
                helperText="Split your sensors into multiple pages when they don't fit in the menu bar."
                orientation="horizontal"
              >
                <Switch
                  checked={settings.menuBarPaginationEnabled}
                  onCheckedChange={(checked) => savePartial({ menuBarPaginationEnabled: checked })}
                  aria-label="Enable page cycling"
                />
              </Field>

              {settings.menuBarPaginationEnabled && (
                <>
                  <Separator className="opacity-50" />
                  <Field
                    label="Sensors per page"
                    helperText="Maximum number of sensors to show on each page."
                    orientation="horizontal"
                  >
                    <NumberStepperInput
                      value={settings.menuBarSensorsPerPage}
                      onChange={(val) => savePartial({ menuBarSensorsPerPage: val })}
                      min={1}
                      max={10}
                      disabled={!settings.menuBarPaginationEnabled}
                      ariaLabel="Sensors per page"
                    />
                  </Field>

                  <Separator className="opacity-50" />
                  <Field
                    label="Ignore group titles"
                    helperText="Exclude non-sensor group titles and separators from counting toward the page limit."
                    orientation="horizontal"
                  >
                    <Switch
                      checked={settings.menuBarPaginationExcludeGroups}
                      onCheckedChange={(checked) => savePartial({ menuBarPaginationExcludeGroups: checked })}
                      disabled={!settings.menuBarPaginationEnabled}
                      aria-label="Ignore group titles"
                    />
                  </Field>
                </>
              )}
            </div>

            {settings.menuBarPaginationEnabled && (
              <>
                <Separator />
                
                {/* Automation & Shortcuts Group */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 select-none flex items-center gap-1.5">
                    Automation & Shortcuts
                  </h4>
                  
                  <Field
                    label="Cycle shortcut"
                    helperText="Global keyboard shortcut to manually cycle to the next page."
                    orientation="horizontal"
                  >
                    <ShortcutInput
                      value={settings.menuBarCycleShortcut}
                      onChange={(val) => savePartial({ menuBarCycleShortcut: val })}
                      disabled={!settings.menuBarPaginationEnabled}
                      onRecordingChange={(rec) => {
                        if (rec) void unregisterMenuBarCycleShortcut();
                        else void syncMenuBarCycleShortcut();
                      }}
                      validate={probeMenuBarCycleShortcut}
                    />
                  </Field>

                  <Separator className="opacity-50" />
                  <Field
                    label="Enable auto-cycle"
                    helperText="Automatically rotate menu bar sensor pages on a timer."
                    orientation="horizontal"
                  >
                    <Switch
                      checked={settings.menuBarCycleIntervalEnabled}
                      onCheckedChange={(checked) => savePartial({ menuBarCycleIntervalEnabled: checked })}
                      disabled={!settings.menuBarPaginationEnabled}
                      aria-label="Enable auto-cycle"
                    />
                  </Field>

                  {settings.menuBarCycleIntervalEnabled && (
                    <>
                      <Separator className="opacity-50" />
                      <Field
                        label="Cycle interval"
                        helperText="Seconds to wait before rotating to the next page."
                        orientation="horizontal"
                      >
                        <NumberStepperInput
                          value={settings.menuBarCycleIntervalSeconds}
                          onChange={(val) => {
                            const updates: Partial<Settings> = { menuBarCycleIntervalSeconds: val };
                            const currentTransDuration = settings.menuBarPageTransitionDuration || 300;
                            if (val * 1000 < currentTransDuration) {
                              updates.menuBarPageTransitionDuration = val * 1000;
                            }
                            savePartial(updates);
                          }}
                          min={1}
                          max={60}
                          disabled={!settings.menuBarPaginationEnabled || !settings.menuBarCycleIntervalEnabled}
                          ariaLabel="Cycle interval seconds"
                        />
                      </Field>
                    </>
                  )}

                  <Separator className="opacity-50" />
                  <Field
                    label="Enable auto-return"
                    helperText="Automatically return to the first page after a period of user inactivity."
                    orientation="horizontal"
                  >
                    <Switch
                      checked={settings.menuBarAutoReturnEnabled}
                      onCheckedChange={(checked) => savePartial({ menuBarAutoReturnEnabled: checked })}
                      disabled={!settings.menuBarPaginationEnabled}
                      aria-label="Enable auto-return"
                    />
                  </Field>

                  {settings.menuBarAutoReturnEnabled && (
                    <>
                      <Separator className="opacity-50" />
                      <Field
                        label="Auto-return delay"
                        helperText="Minutes of inactivity before returning to the first page."
                        orientation="horizontal"
                      >
                        <NumberStepperInput
                          value={settings.menuBarAutoReturnMinutes}
                          onChange={(val) => savePartial({ menuBarAutoReturnMinutes: val })}
                          min={1}
                          max={120}
                          disabled={!settings.menuBarPaginationEnabled || !settings.menuBarAutoReturnEnabled}
                          ariaLabel="Auto-return minutes"
                        />
                      </Field>
                    </>
                  )}
                </div>
              </>
            )}

            {settings.menuBarPaginationEnabled && settings.menuBarSensors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-fg mb-1">Live Page Split Preview</h4>
                    <p className="text-xs text-fg-muted">See a live, real-time preview of how each page will appear on your macOS menu bar.</p>
                  </div>
                  <div className="space-y-4 pl-1 max-h-[32rem] overflow-y-auto">
                    {getMenuBarPages(settings).map((pageItems, pageIdx) => {
                      const pageTitles = buildAllMenuBarTitles(states, settings);
                      const renderedTitle = pageTitles[pageIdx] || "—";
                      
                      return (
                        <div key={pageIdx} className="space-y-2">
                          <div className="flex justify-between items-center select-none pl-1">
                            <span className="font-semibold text-xs text-blue-500">Page {pageIdx + 1}</span>
                            <span className="text-3xs text-fg-muted font-semibold">{pageItems.length} elements</span>
                          </div>
                          
                          {/* Live macOS Menu Bar Mockup */}
                          <div className="relative w-full h-11 bg-[#1e1e1f] border border-neutral-800/80 rounded-xl overflow-hidden flex items-center justify-between px-4 select-none shadow-md">
                            {/* Left Side: Apple Logo & App Menus */}
                            <div className="flex items-center gap-3 text-neutral-400 font-sans text-xs">
                              <span className="text-neutral-200 text-sm font-sans"></span>
                              <span className="font-bold text-neutral-200 cursor-default">Peek</span>
                              <span className="hover:text-neutral-200 transition-colors hidden sm:inline cursor-default">File</span>
                              <span className="hover:text-neutral-200 transition-colors hidden sm:inline cursor-default">Edit</span>
                            </div>
                            
                            {/* Right Side: Peek Sensor Item & System Control Icons */}
                            <div className="flex items-center gap-3.5">
                              {/* Our Live Active Sensor Title */}
                              <div className="bg-white/5 border border-white/5 hover:bg-white/10 active:bg-white/20 px-2.5 py-1 rounded-md text-xs font-semibold text-neutral-100 font-mono tracking-wide shadow-sm cursor-default transition-all duration-150">
                                {renderedTitle}
                              </div>
                              
                              {/* System Control Center / Date-Time Mockups */}
                              <div className="flex items-center gap-2.5 text-neutral-400">
                                <Wifi className="h-3.5 w-3.5 text-neutral-400 stroke-[2.2]" />
                                <Battery className="h-3.5 w-3.5 text-neutral-400 stroke-[2.2]" />
                                <span className="text-[11px] font-semibold font-sans text-neutral-300 pl-0.5 tracking-wide cursor-default">
                                  {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
