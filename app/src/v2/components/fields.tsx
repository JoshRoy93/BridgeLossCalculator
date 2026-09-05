"use client";
import { useId, useState } from "react";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint = "",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          maxLength={20000}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  hint = "",
  resetKey = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  hint?: string;
  resetKey?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState<{
    text: string;
    value: number;
    resetKey: number;
  } | null>(null);
  const activeDraft =
    draft?.value === value && draft.resetKey === resetKey ? draft.text : null;
  const error =
    activeDraft === ""
      ? "Enter a number. Your previous value is kept until you do."
      : min !== undefined && value < min
        ? `Enter ${min} or more.`
        : max !== undefined && value > max
          ? `Enter ${max} or less.`
          : "";
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        required
        min={min}
        max={max}
        step={step}
        value={activeDraft ?? value}
        data-unsaved={activeDraft === ""}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        onChange={(e) => {
          const valid =
            e.target.value !== "" && Number.isFinite(e.target.valueAsNumber);
          setDraft({
            text: e.target.value,
            value: valid ? e.target.valueAsNumber : value,
            resetKey,
          });
          if (valid) onChange(e.target.valueAsNumber);
        }}
        onBlur={(e) => {
          if (e.target.checkValidity()) setDraft(null);
        }}
      />
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
