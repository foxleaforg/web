"use client";

import {
  useId,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";
import { Field, FIELD_BASE, fieldStateClasses } from "./Field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Classes for the wrapper, not the textarea itself. */
  containerClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  containerClassName,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <Field
      id={textareaId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={containerClassName}
    >
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={
          hasError
            ? `${textareaId}-error`
            : hint
              ? `${textareaId}-hint`
              : undefined
        }
        className={cn(
          FIELD_BASE,
          fieldStateClasses(hasError),
          "resize-y px-3.5 py-2.5 text-small leading-relaxed",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
