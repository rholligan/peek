import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/shared";

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

/** Glyphs for macOS-style display, keyed by the tokens we emit and accept. */
const MODIFIER_GLYPHS: Record<string, string> = {
  CmdOrCtrl: "⌘",
  Cmd: "⌘",
  Meta: "⌘",
  Ctrl: "⌃",
  Alt: "⌥",
  Option: "⌥",
  Shift: "⇧",
};

type BuildResult =
  | { accelerator: string }
  | { error: string }
  | null;

/**
 * Convert a browser KeyboardEvent into a Tauri accelerator string
 * (e.g. "CmdOrCtrl+Shift+P"). Returns:
 *  - { accelerator } on a valid combo
 *  - { error } when the combo is rejected (e.g. too weak — letter/digit with <2 modifiers)
 *  - null to keep recording (waiting on a non-modifier key or a modifier)
 *
 * Letters and digits are read from `event.code` because holding Option on
 * macOS composes the character (Option+A → "å"). Everything else uses
 * `event.key` as-is since Alt doesn't compose those.
 */
function buildAcceleratorFromEvent(event: KeyboardEvent<HTMLElement>): BuildResult {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const mods: string[] = [];
  if (event.metaKey || event.ctrlKey) mods.push("CmdOrCtrl");
  if (event.altKey) mods.push("Alt");
  if (event.shiftKey) mods.push("Shift");
  if (mods.length === 0) return null;

  let key: string;
  let isLetterOrDigit = false;
  if (/^Key[A-Z]$/.test(event.code)) {
    key = event.code.slice(3);
    isLetterOrDigit = true;
  } else if (/^Digit\d$/.test(event.code)) {
    key = event.code.slice(5);
    isLetterOrDigit = true;
  } else if (event.key === " ") key = "Space";
  else if (event.key.startsWith("Arrow")) key = event.key.slice(5);
  else if (event.key.length === 1) key = event.key.toUpperCase();
  else key = event.key;

  // Letters/digits with only one modifier conflict with common app shortcuts
  // (Cmd+S, Cmd+C, etc.) — would hijack them system-wide. Require 2+.
  if (isLetterOrDigit && mods.length < 2) {
    return {
      error:
        "Use at least two modifiers (e.g. Cmd+Option) with letters or numbers to avoid hijacking common shortcuts.",
    };
  }

  return { accelerator: [...mods, key].join("+") };
}

function formatForDisplay(accelerator: string): string {
  if (!accelerator) return "";
  return accelerator
    .split("+")
    .map((token) => MODIFIER_GLYPHS[token] ?? token)
    .join(" ");
}

export interface ShortcutInputProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  /**
   * Called when recording starts (true) and ends (false). Consumers should
   * unregister any live OS-level binding for this shortcut while recording
   * so the captured keypress isn't swallowed before the DOM sees it.
   */
  onRecordingChange?: (recording: boolean) => void;
  /**
   * Optional async validator invoked on a captured combo before commit.
   * Return false to reject (the validator is responsible for surfacing
   * its own feedback, e.g. a toast). The combo is only persisted via
   * `onChange` when the validator returns true (or is omitted).
   */
  validate?: (accelerator: string) => Promise<boolean> | boolean;
}

/**
 * Keyboard-shortcut recorder. Click to focus, then press a combo —
 * writes a Tauri accelerator string via onChange.
 */
export function ShortcutInput({
  value,
  onChange,
  disabled,
  placeholder = "Click to record a shortcut",
  className,
  onRecordingChange,
  validate,
  ...rest
}: ShortcutInputProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const validatingRef = useRef(false);
  const [recording, setRecording] = useState(false);

  const beginRecording = () => {
    if (recording) return;
    setRecording(true);
    onRecordingChange?.(true);
  };

  const endRecording = () => {
    if (!recording) return;
    setRecording(false);
    onRecordingChange?.(false);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return;
    const bareKey =
      !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    if (event.key === "Escape" && bareKey) {
      event.preventDefault();
      endRecording();
      buttonRef.current?.blur();
      return;
    }
    // Backspace / Delete with no modifiers clears the saved shortcut —
    // discoverable via the in-field hint while recording.
    if ((event.key === "Backspace" || event.key === "Delete") && bareKey) {
      event.preventDefault();
      if (value) onChange("");
      endRecording();
      buttonRef.current?.blur();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const result = buildAcceleratorFromEvent(event);
    if (!result) return;
    if ("error" in result) {
      toast.error(result.error);
      endRecording();
      buttonRef.current?.blur();
      return;
    }
    if (validate) {
      // Drop overlapping keydowns while a probe is in flight — without this
      // a user mashing keys can queue several validations against the OS.
      if (validatingRef.current) return;
      validatingRef.current = true;
      let ok = false;
      try {
        ok = await validate(result.accelerator);
      } finally {
        validatingRef.current = false;
      }
      if (!ok) {
        endRecording();
        buttonRef.current?.blur();
        return;
      }
    }
    onChange(result.accelerator);
    endRecording();
    buttonRef.current?.blur();
  };

  const display = recording
    ? value
      ? "Press a shortcut, ⌫ to clear"
      : "Press a shortcut…"
    : value
      ? formatForDisplay(value)
      : placeholder;

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      data-slot="control"
      onMouseDown={(e) => {
        // macOS WebKit does not focus buttons on click by default — force it
        // so the keydown handler can capture the next keypress.
        e.preventDefault();
        buttonRef.current?.focus();
      }}
      onFocus={beginRecording}
      onBlur={endRecording}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex h-9 cursor-pointer items-center rounded-lg border border-border-subtle bg-bg px-3 py-1 text-sm transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        recording && "min-w-56",
        recording && "ring-2 ring-blue-500",
        (!value || recording) && "text-fg-muted",
        value && !recording && "font-mono tracking-wide",
        className
      )}
      aria-label={rest["aria-label"] ?? "Keyboard shortcut"}
    >
      {display}
    </button>
  );
}
