import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/components/ui";

export type ReadingStatus = "reading" | "want_to_read" | "read" | "dnf";

/**
 * Each status is distinguished three ways: a text label, a distinct icon
 * SHAPE, and a colour. Colour is the least reliable of the three — roughly 1
 * in 12 men has some form of colour vision deficiency, and deuteranopia in
 * particular collapses the green "Read" and amber "Want to Read" tints toward
 * each other. The shapes stay unambiguous in greyscale.
 *
 * If you add a status, give it a silhouette that is distinct at 14px, not
 * just a new colour.
 */
type StatusMeta = {
  label: string;
  /** Spoken form, when `label` is an abbreviation. */
  spokenLabel?: string;
  variant: BadgeVariant;
  icon: ReactNode;
};

/** Open book. */
const IconReading = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path
      d="M8 4.2C6.8 3.2 5.2 2.8 3 2.8v8.8c2.2 0 3.8.4 5 1.4 1.2-1 2.8-1.4 5-1.4V2.8c-2.2 0-3.8.4-5 1.4Z"
      strokeLinejoin="round"
    />
    <path d="M8 4.2V13" strokeLinecap="round" />
  </svg>
);

/** Bookmark — a shape nothing else here uses. */
const IconWantToRead = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path
      d="M4 2.8h8v10.4L8 10.2l-4 3V2.8Z"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

/** Check mark. */
const IconRead = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m3 8.4 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Circle with a slash — reads as "stopped", unlike any of the above. */
const IconDnf = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="8" cy="8" r="5.5" />
    <path d="m4.4 11.6 7.2-7.2" strokeLinecap="round" />
  </svg>
);

export const STATUS_META: Record<ReadingStatus, StatusMeta> = {
  reading: { label: "Reading", variant: "primary", icon: IconReading },
  want_to_read: {
    label: "Want to Read",
    variant: "gray",
    icon: IconWantToRead,
  },
  read: { label: "Read", variant: "green", icon: IconRead },
  dnf: {
    label: "DNF",
    spokenLabel: "Did not finish",
    variant: "amber",
    icon: IconDnf,
  },
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} size="md" icon={meta.icon}>
      {meta.spokenLabel ? (
        <>
          {/* Screen readers say "Did not finish" rather than spelling out
              or mangling the initialism; sighted users still see "DNF". */}
          <span aria-hidden>{meta.label}</span>
          <span className="sr-only">{meta.spokenLabel}</span>
        </>
      ) : (
        meta.label
      )}
    </Badge>
  );
}
