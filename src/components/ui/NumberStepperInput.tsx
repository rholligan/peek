import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface NumberStepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  ariaLabel: string;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * Number input with custom up/down stepper buttons. Hides the native browser
 * spinners (which are inconsistent across platforms) and clamps to [min, max].
 */
export function NumberStepperInput({
  value,
  onChange,
  min,
  max,
  disabled,
  ariaLabel,
}: NumberStepperInputProps) {
  const set = (n: number) => onChange(clamp(n, min, max));

  return (
    <div className="relative inline-flex w-20">
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isFinite(parsed)) return;
          set(parsed);
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        className={
          "w-full pr-9 " +
          "[&::-webkit-inner-spin-button]:appearance-none " +
          "[&::-webkit-outer-spin-button]:appearance-none " +
          "[appearance:textfield]"
        }
      />
      <div className="pointer-events-none absolute inset-y-0 right-3 flex flex-col justify-center">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          disabled={disabled || value >= max}
          onClick={() => set(value + 1)}
          className="pointer-events-auto flex h-3 items-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          disabled={disabled || value <= min}
          onClick={() => set(value - 1)}
          className="pointer-events-auto flex h-3 items-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
