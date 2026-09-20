import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type BadgeVariant = "primary" | "green" | "amber" | "gray" | "red";
export type BadgeSize = "sm" | "md";

const VARIANTS: Record<BadgeVariant, { pill: string; dot: string }> = {
  primary: {
    pill: "bg-foxleaf-primary-tint text-foxleaf-primary-tint-fg",
    dot: "bg-foxleaf-primary",
  },
  green: {
    pill: "bg-foxleaf-accent-tint text-foxleaf-accent-tint-fg",
    dot: "bg-foxleaf-accent",
  },
  amber: {
    pill: "bg-foxleaf-warning-tint text-foxleaf-warning-tint-fg",
    dot: "bg-foxleaf-warning",
  },
  gray: {
    pill: "bg-foxleaf-neutral-tint text-foxleaf-neutral-tint-fg",
    dot: "bg-foxleaf-muted",
  },
  red: {
    pill: "bg-foxleaf-danger-tint text-foxleaf-danger-tint-fg",
    dot: "bg-foxleaf-danger",
  },
};

const SIZES: Record<BadgeSize, string> = {
  sm: "h-5 px-2 text-caption gap-1",
  md: "h-6 px-2.5 text-small gap-1.5",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Small leading status dot. Decorative — carries no meaning on its own. */
  dot?: boolean;
  /**
   * Leading icon. Prefer this over `dot` when the badge communicates a
   * distinct state: a shape difference is readable without colour vision,
   * a colour difference is not (WCAG 1.4.1 Use of Color). Rendered
   * `aria-hidden` — the badge's text is the accessible label.
   */
  icon?: ReactNode;
  children?: ReactNode;
};

export function Badge({
  variant = "gray",
  size = "sm",
  dot = false,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  const styles = VARIANTS[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        styles.pill,
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="grid shrink-0 place-items-center [&>svg]:size-3.5" aria-hidden>
          {icon}
        </span>
      ) : dot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
