"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "./cn";
import { Field, FIELD_BASE, fieldStateClasses } from "./Field";

export type InputSize = "sm" | "md" | "lg";

/**
 * `<input>` is a replaced element, so the `tap-target` pseudo-element trick
 * used on buttons does not work here — the height IS the hit area.
 *
 * `md` (the default) and `lg` meet the 44px enhanced target size. `sm` is
 * 40px: reserve it for dense desktop tables and toolbars, where it still
 * clears the 24px WCAG 2.2 AA minimum comfortably.
 */
const SIZES: Record<InputSize, string> = {
  sm: "h-10 px-3 text-small",
  md: "h-11 px-3.5 text-small",
  lg: "h-12 px-4 text-body",
};

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  inputSize?: InputSize;
  /** Classes for the wrapper, not the input itself. */
  containerClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  label,
  hint,
  error,
  inputSize = "md",
  id,
  className,
  containerClassName,
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={containerClassName}
    >
      <input
        id={inputId}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={
          hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={cn(
          FIELD_BASE,
          fieldStateClasses(hasError),
          SIZES[inputSize],
          className,
        )}
        {...props}
      />
    </Field>
  );
}
