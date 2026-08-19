// Sovereign Glidepath — shared form input primitives (Build 126 file-size
// cleanup, Stage 3e).
//
// MoneyInput and IntInput are used across Pane 1, Pane 2, and elsewhere.
// Extracted to their own file (rather than left in SovereignGlidepath.tsx
// and imported back) specifically to avoid a circular import once Pane 1/2
// are also split out — both of those files need these same two primitives.

import { useEffect, useState } from "react";
import { cleanNum, formatGBP } from "@/lib/sovereign/engine";

export type CurrencySymbol = "£" | "€" | "$";

export interface MoneyInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
  currency?: CurrencySymbol;
  /**
   * Build 113 — when true the field refuses negative values entirely. A real
   * portfolio bucket cannot hold a negative balance, and a negative pot could
   * drive Total Capital to <= 0 and produce self-contradictory guardrail
   * readouts. Closed off at the input layer.
   */
  nonNegative?: boolean;
}

export function MoneyInput({
  value,
  onChange,
  placeholder,
  id,
  currency = "£",
  nonNegative = false,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : value ? formatGBP(cleanNum(value)) : "";
  const emit = (v: string) => {
    onChange(nonNegative ? v.replace(/-/g, "") : v);
  };
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? `${currency}0.00`}
      value={display}
      onFocus={(e) => {
        const n = cleanNum(e.currentTarget.value);
        const clamped = nonNegative ? Math.max(0, n) : n;
        onChange(clamped !== 0 ? clamped.toFixed(2) : "");
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        if (nonNegative && cleanNum(value) < 0) onChange("");
      }}
      onChange={(e) => emit(e.target.value)}
    />
  );
}

// Integer input that allows the field to be emptied while typing.
// Falls back to `fallback` only on blur if left empty/invalid.
export interface IntInputProps {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  fallback: number;
}
export function IntInput({ id, value, onChange, min, max, fallback }: IntInputProps) {
  const [text, setText] = useState<string>(String(value));
  // Re-sync local text only when the upstream numeric value actually changes
  // to something different (e.g. edit-entry). Do NOT clobber an empty string
  // the user has typed while editing.
  useEffect(() => {
    setText((t) => {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n === value) return t;
      return String(value);
    });
  }, [value]);
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === "") return;
        const n = parseInt(v, 10);
        if (!isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        const n = parseInt(text, 10);
        if (text === "" || isNaN(n)) {
          setText(String(fallback));
          onChange(fallback);
          return;
        }
        let clamped = n;
        if (typeof min === "number" && clamped < min) clamped = min;
        if (typeof max === "number" && clamped > max) clamped = max;
        if (clamped !== n) {
          setText(String(clamped));
          onChange(clamped);
        }
      }}
    />
  );
}

