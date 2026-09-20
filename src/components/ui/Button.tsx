import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-control " +
  "font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,box-shadow,transform,color] " +
  "duration-150 ease-out active:translate-y-px " +
  "disabled:pointer-events-none disabled:active:translate-y-0";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-foxleaf-primary text-foxleaf-primary-fg shadow-primary " +
    "hover:bg-foxleaf-primary-hover active:bg-foxleaf-primary-active",
  secondary:
    "bg-foxleaf-accent text-foxleaf-accent-fg shadow-soft " +
    "hover:bg-foxleaf-accent-hover active:bg-foxleaf-accent-active",
  outline:
    "border border-foxleaf-border-strong bg-transparent text-foxleaf-ink " +
    "hover:border-foxleaf-primary hover:bg-foxleaf-cream-deep " +
    "hover:text-foxleaf-primary",
  ghost:
    "bg-transparent text-foxleaf-ink hover:bg-foxleaf-cream-deep " +
    "active:bg-foxleaf-neutral-tint",
};

// `tap-target` grows the hit area to 44×44 without changing the visual size,
// so sm/md stay compact but remain comfortable to hit. lg is already 48px.
const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small tap-target",
  md: "h-10 px-5 text-small tap-target",
  lg: "h-12 px-6 text-body",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. Width stays stable. */
  loading?: boolean;
  /** Announced to screen readers while `loading`. */
  loadingLabel?: string;
  fullWidth?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Loading",
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        // A loading button is busy, not unavailable — it keeps full strength
        // so the spinner stays legible. Only a genuinely disabled one fades.
        !loading && "disabled:opacity-55",
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {/* The label keeps its box while loading so the button doesn't resize. */}
      <span
        className={cn(
          "inline-flex items-center gap-2",
          loading && "invisible",
        )}
      >
        {children}
      </span>
      {loading ? (
        <>
          <Spinner className="absolute" />
          {/* `aria-busy` alone is inconsistently announced, so state it. */}
          <span className="sr-only" role="status">
            {loadingLabel}
          </span>
        </>
      ) : null}
    </button>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
