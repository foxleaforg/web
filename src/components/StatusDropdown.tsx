"use client";

import { useEffect, useRef, useState } from "react";
import {
  STATUS_META,
  type ReadingStatus,
} from "@/components/StatusBadge";

const STATUS_OPTIONS: ReadingStatus[] = [
  "reading",
  "want_to_read",
  "read",
  "dnf",
];

export function StatusDropdown({
  status,
  onChange,
  disabled = false,
}: {
  status: ReadingStatus;
  onChange: (next: ReadingStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = STATUS_META[status];

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex w-full items-center justify-between gap-1.5 rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${dotClass(status)}`}
          />
          {current.label}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg ring-1 ring-stone-900/5"
        >
          {STATUS_OPTIONS.map((opt) => {
            const meta = STATUS_META[opt];
            const isCurrent = opt === status;
            return (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                    if (!isCurrent) onChange(opt);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-stone-100 ${isCurrent ? "font-semibold text-stone-900" : "text-stone-700"}`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${dotClass(opt)}`}
                  />
                  {meta.label}
                  {isCurrent ? (
                    <span aria-hidden className="ml-auto text-stone-400">
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function dotClass(status: ReadingStatus): string {
  switch (status) {
    case "reading":
      return "bg-blue-500";
    case "want_to_read":
      return "bg-amber-500";
    case "read":
      return "bg-green-500";
    case "dnf":
      return "bg-stone-400";
  }
}
