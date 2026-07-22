/**
 * Individual sensor list item with drag handle and action controls.
 * @module settings/components/SensorListItem
 */

import { Activity, Grip, Hash, Pencil, Trash2, Check, X, RotateCcw } from "lucide-react";
import { forwardRef, memo, useState } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { IconButton } from "@/components/ui/IconButton";
import { Tag, TagLabel, TagStartElement } from "@/components/ui/Tag";
import { cn, type SensorConfig } from "@/shared";

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
  /** Custom numeric config for this sensor */
  customConfig?: SensorConfig;
  /** Default unit of measurement from Home Assistant */
  defaultUnit?: string;
  /** Current sensor value with unit */
  sensorValue: string;
  /** Callback when sensor settings are saved */
  onSave: (name: string, format: string, config?: SensorConfig) => void;
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
      customConfig,
      defaultUnit = "",
      sensorValue,
      onSave,
      onRemove,
      dragHandleProps,
      isDragging,
    },
    ref
  ) {
    const [isEditing, setIsEditing] = useState(false);
    const [localName, setLocalName] = useState(customName);
    const [localFormat, setLocalFormat] = useState(customFormat);
    const [localScale, setLocalScale] = useState(customConfig?.scaleMultiplier?.toString() || "");
    const [localUnit, setLocalUnit] = useState(customConfig?.customUnit || "");
    const [localDecimals, setLocalDecimals] = useState(customConfig?.decimalPlaces?.toString() || "");

    const handleEdit = () => {
      setLocalName(customName);
      setLocalFormat(customFormat);
      setLocalScale(customConfig?.scaleMultiplier?.toString() || "");
      setLocalUnit(customConfig?.customUnit || "");
      setLocalDecimals(customConfig?.decimalPlaces?.toString() || "");
      setIsEditing(true);
    };

    const handleCancel = () => {
      setIsEditing(false);
    };

    const handleCommit = () => {
      setIsEditing(false);
      const rawName = localName;
      const trimmedName = rawName.trim();
      // If the input is completely empty or just spaces, save as " " (blank title)
      // Otherwise, save the trimmed name.
      const finalName = trimmedName === "" ? " " : trimmedName;

      // Parse advanced numeric configs
      const scaleVal = parseFloat(localScale);
      const decimalsVal = parseInt(localDecimals, 10);

      const numericConfig: SensorConfig = {
        scaleMultiplier: isNaN(scaleVal) ? undefined : scaleVal,
        customUnit: localUnit.trim() === "" ? undefined : localUnit.trim(),
        decimalPlaces: isNaN(decimalsVal) ? undefined : decimalsVal,
      };

      onSave(finalName, localFormat.trim(), numericConfig);
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

    const getLiveFormattedValue = () => {
      const rawNum = parseFloat(sensorValue);
      if (isNaN(rawNum)) return "";

      const scale = parseFloat(localScale);
      const scaledNum = isNaN(scale) ? rawNum : rawNum * scale;

      const decimals = parseInt(localDecimals, 10);
      const formattedNum = isNaN(decimals) ? scaledNum.toString() : scaledNum.toFixed(decimals);

      const unit = localUnit.trim() !== "" ? localUnit.trim() : defaultUnit;
      return `${formattedNum}${unit ? ` ${unit}` : ""}`;
    };

    const getSavedFormattedValue = () => {
      const rawNum = parseFloat(sensorValue);
      if (isNaN(rawNum)) return "";

      const scale = customConfig?.scaleMultiplier;
      const scaledNum = scale !== undefined ? rawNum * scale : rawNum;

      const decimals = customConfig?.decimalPlaces;
      const formattedNum = decimals !== undefined ? scaledNum.toFixed(decimals) : scaledNum.toString();

      const unit = customConfig?.customUnit !== undefined ? customConfig.customUnit : defaultUnit;
      return `${formattedNum}${unit ? ` ${unit}` : ""}`;
    };

    const isGroup = entityId.startsWith("group:");
    const isPageBreak = entityId.startsWith("page_break:");

    if (isPageBreak) {
      return (
        <li
          ref={ref}
          className={cn("list-none", isDragging && "opacity-50")}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-dashed border-border/80 bg-bg-panel/40 select-none">
            <span className="text-2xs font-semibold uppercase tracking-widest text-fg-muted font-mono pl-2">
              --- PAGE BREAK (Splits menu bar pages) ---
            </span>
            <div className="flex gap-0">
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
                aria-label="Remove page break"
                variant="ghost"
                size="xs"
                onClick={onRemove}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          </div>
        </li>
      );
    }

    // Determine how to display the sensor name
    const isBlank = customName === " ";
    const hasOverride = customName !== "";
    const displayNameNode = isBlank ? (
      <span className="text-fg-muted italic text-sm">(blank)</span>
    ) : hasOverride ? (
      customName
    ) : isGroup ? (
      <span className="text-fg-muted italic text-sm">New Group:</span>
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
                  <label className="text-2xs text-fg-muted font-semibold uppercase tracking-wider">
                    {isGroup ? "Group Title / Divider Text" : "Display Name"}
                  </label>
                  <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGroup ? "e.g., Home: or │" : originalName}
                    className="font-medium text-sm bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                  />
                  <span className="text-3xs text-fg-muted pl-0.5">
                    {isGroup
                      ? "Enter custom text. Clear to hide this group element completely."
                      : "Leave empty or press spacebar for a blank/hidden title."}
                  </span>
                </div>
                {!isGroup && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-2xs text-fg-muted font-semibold uppercase tracking-wider">Format Override</label>
                      <a
                        href="https://github.com/tiagonoronha/peek#features"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-3xs text-blue-500 hover:text-blue-600 transition-colors hover:underline"
                      >
                        View Docs
                      </a>
                    </div>
                    <input
                      type="text"
                      value={localFormat}
                      onChange={(e) => setLocalFormat(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Use global format"
                      className="font-medium text-sm bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                    />
                    <span className="text-3xs text-fg-muted pl-0.5">
                      Supports <code className="bg-bg-muted/50 px-1 rounded font-mono text-2xs">{"{name}"}</code> and <code className="bg-bg-muted/50 px-1 rounded font-mono text-2xs">{"{value}"}</code>.
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pl-0.5">
                      <span className="text-3xs text-fg-muted font-semibold uppercase tracking-wider">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setLocalFormat("{value}")}
                        className="text-3xs text-blue-500 hover:text-blue-600 bg-bg-panel border border-border hover:border-blue-300 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                        title="Show only the value (e.g., '22°C' instead of 'Temp: 22°C')"
                      >
                        Value Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalFormat("{value} F")}
                        className="text-3xs text-blue-500 hover:text-blue-600 bg-bg-panel border border-border hover:border-blue-300 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                        title="Suffix a custom unit override (e.g., '22°C F')"
                      >
                        Custom Suffix
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalFormat("{name} [{value}]")}
                        className="text-3xs text-blue-500 hover:text-blue-600 bg-bg-panel border border-border hover:border-blue-300 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                        title="Bracketed format (e.g., 'Temp [22°C]')"
                      >
                        Bracketed
                      </button>
                    </div>
                  </div>
                )}
                {!isGroup && !isNaN(parseFloat(sensorValue)) && (
                  <div className="border border-border/70 bg-bg-panel/40 rounded-xl p-3.5 space-y-3.5 mt-3 select-none">
                    <h5 className="text-2xs font-bold text-fg uppercase tracking-wider font-sans">Advanced Number Formatting</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-3xs text-fg-muted font-semibold uppercase">Multiplier</label>
                        <input
                          type="text"
                          value={localScale}
                          onChange={(e) => setLocalScale(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="1.0"
                          className="font-medium text-xs bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                          title="Scale factor multiplier (e.g. 0.001 to convert W to kW)"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-3xs text-fg-muted font-semibold uppercase">Unit Symbol</label>
                        <input
                          type="text"
                          value={localUnit}
                          onChange={(e) => setLocalUnit(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="e.g., kW"
                          className="font-medium text-xs bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                          title="Custom display unit symbol"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-3xs text-fg-muted font-semibold uppercase">Decimals</label>
                        <input
                          type="text"
                          value={localDecimals}
                          onChange={(e) => setLocalDecimals(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Auto"
                          className="font-medium text-xs bg-bg-panel rounded-lg px-2.5 py-1.5 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-colors"
                          title="Override number of decimal places (e.g. 2)"
                        />
                      </div>
                    </div>
                    <div className="bg-bg-panel/50 border border-border/80 rounded-lg p-2.5 flex items-center justify-between">
                      <span className="text-3xs text-fg-muted font-semibold uppercase tracking-wider">Live Format Preview:</span>
                      <span className="text-xs font-mono font-bold text-fg flex items-center gap-1.5">
                        <span className="text-fg-muted">{sensorValue}</span>
                        <span className="text-blue-500 font-sans">➔</span>
                        <span className="text-green-500">{getLiveFormattedValue() || "—"}</span>
                      </span>
                    </div>
                    <span className="text-3xs text-fg-muted pl-0.5 block">
                      Excel-style scaling: set multiplier to <code className="bg-bg-muted/50 px-1 rounded">0.001</code> and unit to <code className="bg-bg-muted/50 px-1 rounded">kW</code> to convert W to kW.
                    </span>
                  </div>
                )}
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
                  aria-label={isGroup ? `Group text: ${customName}` : `Sensor name: ${customName || originalName}`}
                  className="font-medium text-sm cursor-pointer hover:text-fg-muted transition-colors duration-200"
                >
                  {displayNameNode}
                </span>
                {!isGroup && customFormat && (
                  <span className="text-3xs text-fg-muted font-mono bg-bg-muted/50 px-1 py-0.5 rounded border border-border/40">
                    Format: {customFormat}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex gap-2 flex-wrap mt-1">
              {isGroup ? (
                <Tag size="sm" variant="subtle" colorPalette="default">
                  <TagLabel>Text / Group Header</TagLabel>
                </Tag>
              ) : (
                <>
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
                  {isEditing && (localScale !== "" || localUnit.trim() !== "" || localDecimals !== "") && (
                    <Tag size="sm" variant="subtle" colorPalette="yellow">
                      <TagLabel>{sensorValue} ➔ {getLiveFormattedValue() || "—"}</TagLabel>
                    </Tag>
                  )}
                  {!isEditing && (customConfig?.scaleMultiplier !== undefined || customConfig?.customUnit !== undefined || customConfig?.decimalPlaces !== undefined) && (
                    <Tag size="sm" variant="subtle" colorPalette="yellow">
                      <TagLabel>{sensorValue} ➔ {getSavedFormattedValue() || "—"}</TagLabel>
                    </Tag>
                  )}
                </>
              )}
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
                  aria-label="Reset to default"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    onSave("", "");
                    setIsEditing(false);
                  }}
                  className="text-orange-500 hover:text-orange-600"
                  title="Reset to default name and format"
                >
                  <RotateCcw size={15} />
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
                  aria-label={isGroup ? "Edit group text" : "Edit sensor"}
                  variant="ghost"
                  size="xs"
                  onClick={handleEdit}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton
                  aria-label={isGroup ? "Remove group element" : "Remove sensor"}
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
