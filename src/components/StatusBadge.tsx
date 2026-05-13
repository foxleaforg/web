export type ReadingStatus = "reading" | "want_to_read" | "read" | "dnf";

type StatusMeta = {
  label: string;
  className: string;
};

export const STATUS_META: Record<ReadingStatus, StatusMeta> = {
  reading: {
    label: "Reading",
    className: "bg-blue-100 text-blue-800 ring-blue-200/60",
  },
  want_to_read: {
    label: "Want to Read",
    className: "bg-amber-100 text-amber-800 ring-amber-200/60",
  },
  read: {
    label: "Read",
    className: "bg-green-100 text-green-800 ring-green-200/60",
  },
  dnf: {
    label: "DNF",
    className: "bg-stone-200 text-stone-700 ring-stone-300/60",
  },
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
