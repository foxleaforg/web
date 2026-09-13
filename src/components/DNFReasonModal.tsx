"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type DNFReasonType =
  | "too_slow"
  | "characters"
  | "writing_style"
  | "unexpected_content"
  | "lost_interest"
  | "life"
  | "other";

const REASONS: { value: DNFReasonType; label: string }[] = [
  { value: "too_slow", label: "Too slow" },
  { value: "characters", label: "Couldn't connect with characters" },
  { value: "writing_style", label: "Writing style wasn't for me" },
  { value: "unexpected_content", label: "Content I wasn't expecting" },
  { value: "lost_interest", label: "Just lost interest" },
  { value: "life", label: "Life got in the way" },
  { value: "other", label: "Other" },
];

const NOTE_MAX = 500;

export function DNFReasonModal({
  bookId,
  bookTitle,
  isOpen,
  onClose,
  onSubmit,
}: {
  bookId: string;
  bookTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}) {
  const [reason, setReason] = useState<DNFReasonType | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!reason) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/ratings/dnf", {
        book_id: bookId,
        reason,
        note: note.trim() ? note.trim() : null,
      });
      onSubmit?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save your reason.",
      );
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dnf-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-900/25 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-amber-50 p-7 shadow-2xl">
        <h2
          id="dnf-modal-title"
          className="text-xl font-semibold text-stone-900"
        >
          Why did you stop reading?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Not every book is for every reader — setting one down is a normal part
          of reading. Telling us why helps Foxleaf recommend better
          {bookTitle ? (
            <>
              {" "}
              next time. You set down{" "}
              <span className="font-medium text-stone-800">{bookTitle}</span>.
            </>
          ) : (
            " next time."
          )}
        </p>

        <div
          role="radiogroup"
          aria-label="Reason for not finishing"
          className="mt-6 flex flex-col gap-2"
        >
          {REASONS.map((option) => {
            const active = reason === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setReason(option.value)}
                className={`rounded-2xl border px-4 py-2.5 text-left text-sm transition-all duration-150 ${
                  active
                    ? "border-amber-400 bg-amber-100/70 font-medium text-stone-900 ring-2 ring-amber-400/40"
                    : "border-stone-200 bg-white/70 text-stone-700 hover:border-stone-300 hover:bg-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <label
            htmlFor="dnf-note"
            className="block text-sm font-medium text-stone-800"
          >
            Anything else? <span className="text-stone-500">(optional)</span>
          </label>
          <textarea
            id="dnf-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="Maybe you'll come back to it later…"
            className="mt-2 w-full resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
          />
          <p className="mt-1 text-right text-xs text-stone-400">
            {note.length} / {NOTE_MAX}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !reason}
            className="rounded-full bg-stone-800 px-6 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
