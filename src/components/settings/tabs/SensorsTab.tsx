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
import {
  probeMenuBarCycleShortcut,
  syncMenuBarCycleShortcut,
  unregisterMenuBarCycleShortcut,
} from "@/services/globalShortcut";
import { moveSensorBetweenLists } from "@/shared";

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
          <div className="space-y-4">
            <Field
              label="Enable pagination"
              helperText="Split sensors into pages and cycle between them with a keyboard shortcut."
              orientation="horizontal"
            >
              <Switch
                checked={settings.menuBarPaginationEnabled}
                onCheckedChange={(checked) => savePartial({ menuBarPaginationEnabled: checked })}
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
                value={settings.menuBarSensorsPerPage}
                onChange={(val) => savePartial({ menuBarSensorsPerPage: val })}
                min={1}
                max={10}
                disabled={!settings.menuBarPaginationEnabled}
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

            <Separator />

            <Field
              label="Auto-return to first page"
              helperText="Return to the first page when the shortcut hasn't been pressed for a while."
              orientation="horizontal"
            >
              <Switch
                checked={settings.menuBarAutoReturnEnabled}
                onCheckedChange={(checked) => savePartial({ menuBarAutoReturnEnabled: checked })}
                disabled={!settings.menuBarPaginationEnabled}
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
                value={settings.menuBarAutoReturnMinutes}
                onChange={(val) => savePartial({ menuBarAutoReturnMinutes: val })}
                min={1}
                max={120}
                disabled={!settings.menuBarPaginationEnabled || !settings.menuBarAutoReturnEnabled}
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
                checked={settings.menuBarCycleIntervalEnabled}
                onCheckedChange={(checked) => savePartial({ menuBarCycleIntervalEnabled: checked })}
                disabled={!settings.menuBarPaginationEnabled}
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
                value={settings.menuBarCycleIntervalSeconds}
                onChange={(val) => savePartial({ menuBarCycleIntervalSeconds: val })}
                min={5}
                max={60}
                disabled={!settings.menuBarPaginationEnabled || !settings.menuBarCycleIntervalEnabled}
                ariaLabel="Cycle interval seconds"
              />
            </Field>

            {settings.menuBarPaginationEnabled && settings.menuBarSensors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-fg mb-1">Page/Group Titles</h4>
                    <p className="text-xs text-fg-muted">Provide a custom title prefix for each page (e.g., &quot;Home&quot;, &quot;Office&quot;). Leave blank to hide.</p>
                  </div>
                  <div className="space-y-3 pl-2">
                    {Array.from({ length: Math.ceil(settings.menuBarSensors.length / settings.menuBarSensorsPerPage) }).map((_, idx) => (
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
    </>
  );
}
