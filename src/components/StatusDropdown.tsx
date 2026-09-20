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
        // A menu of buttons, not a listbox. The previous markup declared
        // role="listbox" with role="option" buttons nested inside <li>s,
        // which is invalid: options must be direct children of the listbox
        // and must not contain interactive descendants. Screen readers were
        // being told about a widget that did not behave like one.
        aria-haspopup="menu"
        aria-expanded={open}
        className="tap-target inline-flex w-full items-center justify-between gap-1.5 rounded-full border border-foxleaf-border-strong bg-foxleaf-surface px-3 py-1.5 text-caption font-medium text-foxleaf-ink shadow-soft transition-colors hover:border-foxleaf-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="[&>svg]:size-3.5">
            {current.icon}
          </span>
          {current.label}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`size-3 text-foxleaf-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Reading status"
          className="absolute right-0 left-0 z-20 mt-1 overflow-hidden rounded-card border border-foxleaf-border bg-foxleaf-surface py-1 shadow-float"
        >
          {STATUS_OPTIONS.map((opt) => {
            const meta = STATUS_META[opt];
            const isCurrent = opt === status;
            return (
              <button
                key={opt}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  if (!isCurrent) onChange(opt);
                }}
                className={`text-caption flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-foxleaf-cream-deep ${
                  isCurrent
                    ? "font-semibold text-foxleaf-ink"
                    : "text-foxleaf-muted"
                }`}
              >
                <span aria-hidden className="[&>svg]:size-3.5">
                  {meta.icon}
                </span>
                {meta.label}
                {isCurrent ? (
                  <span aria-hidden className="ml-auto text-foxleaf-primary">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
