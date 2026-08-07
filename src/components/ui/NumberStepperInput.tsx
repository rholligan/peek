import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
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
 * Maintains local text state to allow natural typing without eager clamping.
 */
export function NumberStepperInput({
  value,
  onChange,
  min,
  max,
  disabled,
  ariaLabel,
}: NumberStepperInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  // Keep local input value in sync with external value prop
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    const parsed = Number(inputValue);
    const clamped = clamp(
      Number.isNaN(parsed) || inputValue.trim() === "" ? min : parsed,
      min,
      max
    );
    setInputValue(clamped.toString());
    onChange(clamped);
  };

  const handleStep = (dir: 1 | -1) => {
    const clamped = clamp(value + dir, min, max);
    setInputValue(clamped.toString());
    onChange(clamped);
  };

  return (
    <div className="relative inline-flex w-25">
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
          // Allow digits and empty string
          const val = e.target.value;
          if (val === "" || /^\d+$/.test(val)) {
            setInputValue(val);
          }
        }}
        onBlur={handleBlur}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full pr-9"
      />
      <div className="pointer-events-none absolute inset-y-0 right-3 flex flex-col justify-center">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          disabled={disabled || value >= max}
          onClick={() => handleStep(1)}
          className="pointer-events-auto flex h-3 items-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          disabled={disabled || value <= min}
          onClick={() => handleStep(-1)}
          className="pointer-events-auto flex h-3 items-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
