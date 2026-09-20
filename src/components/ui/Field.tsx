import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Shared chrome for form controls: label above, hint or error below.
 * Used by Input and Textarea; not usually rendered directly.
 */

export const FIELD_BASE =
  "w-full rounded-control border bg-foxleaf-surface text-foxleaf-ink " +
  "placeholder:text-foxleaf-placeholder " +
  "transition-[border-color] duration-150 ease-out " +
  "disabled:cursor-not-allowed disabled:bg-foxleaf-cream-deep " +
  "disabled:text-foxleaf-muted";

/**
 * Controls keep the global `:focus-visible` outline from globals.css rather
 * than replacing it with a low-opacity ring — a 25%-alpha ring does not meet
 * the 3:1 non-text contrast requirement, and one consistent focus style
 * across buttons, links and inputs is easier to perceive anyway.
 *
 * The border darkens on focus as a second, redundant cue.
 *
 * Note `border-foxleaf-border-strong` in the resting state: a control's
 * boundary is the only thing identifying it, so it needs 3:1 (WCAG 1.4.11).
 * The softer `border` token is for decorative card edges only.
 */
export function fieldStateClasses(hasError: boolean) {
  return hasError
    ? "border-foxleaf-danger focus:border-foxleaf-danger"
    : "border-foxleaf-border-strong hover:border-foxleaf-ink " +
        "focus:border-foxleaf-primary";
}

export type FieldProps = {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Renders a subtle marker next to the label. */
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="text-small font-medium text-foxleaf-ink"
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-foxleaf-primary" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-caption text-foxleaf-danger"
        >
          {/* Shape as well as colour, so the error state survives any form of
              colour blindness and greyscale printing. */}
          <svg
            className="mt-px size-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 3a.9.9 0 0 1 .9.95l-.2 3.4a.7.7 0 0 1-1.4 0l-.2-3.4A.9.9 0 0 1 8 4.5Zm0 6a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z" />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-foxleaf-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
