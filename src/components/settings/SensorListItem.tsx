/**
 * Individual sensor list item with drag handle and action controls.
 * @module settings/components/SensorListItem
 */

import { Activity, Grip, Hash, Pencil, Trash2, Check, X } from "lucide-react";
import { forwardRef, memo, useState } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { IconButton } from "@/components/ui/IconButton";
import { Tag, TagLabel, TagStartElement } from "@/components/ui/Tag";
import { cn } from "@/shared";

/** Props for drag handle from useSortable hook */
interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

interface SensorListItemProps {
  /** Entity ID (e.g., "sensor.temperature") */
  entityId: string;
  /** Original name from Home Assistant (used as placeholder) */
  originalName: string;
  /** Custom display name (empty string = use original) */
  customName: string;
  /** Custom format override for this sensor */
  customFormat: string;
  /** Current sensor value with unit */
  sensorValue: string;
  /** Callback when display name is changed */
  onNameChange: (name: string) => void;
  /** Callback when format is changed */
  onFormatChange: (format: string) => void;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Drag handle props from useSortable */
  dragHandleProps?: DragHandleProps;
  /** Whether this item is currently being dragged */
  isDragging?: boolean;
}

/**
 * Sensor list item with drag handle, inline editable name/format, and remove button.
 * Parent component is responsible for showing confirmation before removal.
 */
const SensorListItem = memo(
  forwardRef<HTMLLIElement, SensorListItemProps>(function SensorListItem(
    {
      entityId,
      originalName,
      customName,
      customFormat,
      sensorValue,
      onNameChange,
      onFormatChange,
      onRemove,
      dragHandleProps,
      isDragging,
    },
    ref
  ) {
    const [isEditing, setIsEditing] = useState(false);
    const [localName, setLocalName] = useState(customName);
    const [localFormat, setLocalFormat] = useState(customFormat);

    const handleEdit = () => {
      setLocalName(customName);
      setLocalFormat(customFormat);
      setIsEditing(true);
    };

    const handleCancel = () => {
      setIsEditing(false);
    };

    const handleCommit = () => {
      setIsEditing(false);
      const rawName = localName;
      const trimmedName = rawName.trim();
      // If they type a space, save as " " (blank title override)
      // If completely empty, save as "" (revert to original name)
      const finalName = rawName === "" ? "" : (trimmedName === "" ? " " : trimmedName);
      onNameChange(finalName);
      onFormatChange(localFormat.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    // Determine how to display the sensor name
    const isBlank = customName === " ";
    const hasOverride = customName !== "";
    const displayNameNode = isBlank ? (
      <span className="text-fg-muted italic text-sm">(blank title)</span>
    ) : hasOverride ? (
      customName
    ) : (
      <span className="text-fg-muted">{originalName}</span>
    );

    return (
      <li
        ref={ref}
        className={cn("list-none", isDragging && "opacity-50")}
      >
        <div className="flex items-center gap-2 px-4 py-4 rounded-xl border border-border bg-bg-panel">
          {/* Content */}
          <div className="flex flex-col items-start flex-1 gap-1.5 min-w-0">
            {/* Editable fields */}
            {isEditing ? (
              <div className="space-y-2.5 w-full pr-2">
                <div className="flex flex-col gap-1">
                  <label className="text-2xs text-fg-muted font-semibold uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={originalName}
                    className="font-medium text-sm bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                  />
                  <span className="text-3xs text-fg-muted pl-0.5">Press spacebar for blank title, empty to reset.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-2xs text-fg-muted font-semibold uppercase tracking-wider">Format Override</label>
                  <input
                    type="text"
                    value={localFormat}
                    onChange={(e) => setLocalFormat(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Use global format"
                    className="font-medium text-sm bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                  />
                  <span className="text-3xs text-fg-muted pl-0.5">Supports {"{name}"} and {"{value}"} (e.g. {"{value}"}).</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1">
                <span
                  onClick={handleEdit}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEdit();
                    }
                  }}
                  aria-label={`Sensor name: ${customName || originalName}`}
                  className="font-medium text-sm cursor-pointer hover:text-fg-muted transition-colors duration-200"
                >
                  {displayNameNode}
                </span>
                {customFormat && (
                  <span className="text-3xs text-fg-muted font-mono bg-bg-muted/50 px-1 py-0.5 rounded border border-border/40">
                    Format: {customFormat}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex gap-2 flex-wrap mt-1">
              <Tag size="sm" variant="subtle" colorPalette="blue">
                <TagStartElement>
                  <Hash size={12} />
                </TagStartElement>
                <TagLabel>{entityId}</TagLabel>
              </Tag>
              <Tag size="sm" variant="subtle" colorPalette="green">
                <TagStartElement>
                  <Activity size={12} />
                </TagStartElement>
                <TagLabel>{sensorValue}</TagLabel>
              </Tag>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex gap-0">
            {isEditing ? (
              <>
                <IconButton
                  aria-label="Save changes"
                  variant="ghost"
                  size="xs"
                  onClick={handleCommit}
                >
                  <Check size={16} className="text-green-500" />
                </IconButton>
                <IconButton
                  aria-label="Cancel editing"
                  variant="ghost"
                  size="xs"
                  onClick={handleCancel}
                >
                  <X size={16} className="text-red-500" />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton
                  aria-label="Drag to reorder"
                  variant="ghost"
                  size="xs"
                  className="cursor-grab active:cursor-grabbing"
                  {...dragHandleProps?.attributes}
                  {...dragHandleProps?.listeners}
                >
                  <Grip size={16} />
                </IconButton>
                <IconButton
                  aria-label="Edit sensor"
                  variant="ghost"
                  size="xs"
                  onClick={handleEdit}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton
                  aria-label="Remove sensor"
                  variant="ghost"
                  size="xs"
                  onClick={onRemove}
                >
                  <Trash2 size={14} />
                </IconButton>
              </>
            )}
          </div>
        </div>
      </li>
    );
  })
);

export { SensorListItem };
