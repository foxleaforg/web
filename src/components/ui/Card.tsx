import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** Render as something other than a div — `article`, `li`, `section`… */
  as?: ElementType;
  padding?: CardPadding;
  /**
   * Adds the hover lift and makes the card a positioning context for
   * `stretch-link`. It does NOT make the card itself clickable — see below.
   */
  interactive?: boolean;
  children?: ReactNode;
};

/**
 * A surface container.
 *
 * ## Making a card clickable
 *
 * Do not put `onClick` on the card. A div with a click handler is invisible
 * to keyboard and screen reader users, and bolting on `role="button"` plus
 * `tabIndex` plus an Enter/Space handler reimplements — usually incorrectly —
 * what the browser already gives you for free.
 *
 * Use a real link or button and stretch its hit area over the card:
 *
 * ```tsx
 * <Card interactive>
 *   <h3>
 *     <Link href={`/books/${slug}`} className="stretch-link">
 *       {title}
 *     </Link>
 *   </h3>
 *   <p>{author}</p>
 * </Card>
 * ```
 *
 * One focusable control, a correct accessible name taken from the link text,
 * a real href for middle-click and "open in new tab", and the whole card
 * still clickable. Any second link inside the card needs `relative z-1` to
 * stay above the stretched overlay.
 *
 * If the entire card is one destination and contains no other controls,
 * `<Card as={Link} href={…} interactive>` also works.
 */
export function Card({
  as: Component = "div",
  padding = "md",
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-card border border-foxleaf-border bg-foxleaf-surface shadow-soft",
        PADDING[padding],
        interactive &&
          // `relative` anchors a stretch-link child. The lift is driven by
          // focus-within as well as hover so keyboard focus moves the card
          // too; the focus ring itself comes from the link inside.
          "relative transition-[box-shadow,transform,border-color] " +
            "duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift " +
            "hover:border-foxleaf-border-strong active:translate-y-0 " +
            "focus-within:-translate-y-0.5 focus-within:shadow-lift " +
            "motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
