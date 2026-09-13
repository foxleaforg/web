"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";
import { getAccessToken, isLoggedIn } from "@/lib/auth";

type ImportJob = {
  id: string;
  source: string;
  status: string;
  file_name: string | null;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: string | null;
  created_at: string;
  completed_at: string | null;
};

type View = "idle" | "uploading" | "success" | "error";

export default function ImportPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const [view, setView] = useState<View>("idle");
  const [jobResult, setJobResult] = useState<ImportJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const jobs = await api.get<ImportJob[]>("/import/jobs");
        if (!cancelled) setHistory(jobs);
      } catch {
        /* ignore — history is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  async function uploadFile(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      setErrorMessage("Please upload a .csv file.");
      setView("error");
      return;
    }

    setView("uploading");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Multipart upload, so this bypasses apiFetch (which always sends JSON)
      // and reads the token directly.
      const response = await fetch(`${API_URL}/import/goodreads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: formData,
      });

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const data = await response.json();
          detail =
            typeof data?.detail === "string"
              ? data.detail
              : JSON.stringify(data?.detail ?? data);
        } catch {
          detail = response.statusText;
        }
        throw new Error(detail || "Import failed.");
      }

      const job = (await response.json()) as ImportJob;
      setJobResult(job);
      setView("success");
      setHistory((prev) => [job, ...prev]);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setView("error");
    }
  }

  function handleReset() {
    setView("idle");
    setJobResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  if (!authChecked) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200/70" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-stone-900">
          Import from GoodReads
        </h1>
        <p className="text-sm text-stone-600">
          Bring your reading history to Foxleaf in seconds.
        </p>
      </header>

      {view === "idle" || view === "error" ? (
        <Instructions />
      ) : null}

      <section className="mt-8">
        {view === "idle" ? (
          <DropZone
            dragOver={dragOver}
            onDragEnter={() => setDragOver(true)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onBrowse={() => fileInputRef.current?.click()}
          />
        ) : view === "uploading" ? (
          <UploadingState />
        ) : view === "success" && jobResult ? (
          <SuccessState job={jobResult} onReset={handleReset} />
        ) : view === "error" ? (
          <ErrorState
            message={errorMessage ?? "Something went wrong. Please try again."}
            onRetry={handleReset}
          />
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </section>

      {history.length > 0 ? (
        <ImportHistory jobs={history} />
      ) : null}
    </main>
  );
}

function Instructions() {
  const steps = [
    {
      text: (
        <>
          Go to{" "}
          <a
            href="https://www.goodreads.com/review/import"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-stone-900 underline-offset-2 hover:underline"
          >
            goodreads.com/review/import
          </a>
        </>
      ),
    },
    { text: "Click “Export Library” and wait for the file to generate" },
    { text: "Download the CSV file" },
    { text: "Upload it here" },
  ];

  return (
    <section className="mt-8 rounded-3xl border border-amber-200/70 bg-amber-50/60 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
        How it works
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-stone-800"
            >
              {i + 1}
            </span>
            <p className="pt-0.5 text-sm leading-relaxed text-stone-800">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DropZone({
  dragOver,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
}: {
  dragOver: boolean;
  onDragEnter: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onBrowse: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onBrowse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onBrowse();
        }
      }}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-8 py-16 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
        dragOver
          ? "border-amber-500 bg-amber-100/80"
          : "border-amber-300 bg-amber-50/60 hover:bg-amber-100/60"
      }`}
    >
      <div aria-hidden className="text-5xl">
        📚
      </div>
      <p className="text-base font-medium text-stone-800">
        Drop your GoodReads CSV file here, or click to browse
      </p>
      <p className="text-xs text-stone-500">.csv files only</p>
    </div>
  );
}

function UploadingState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-amber-200/70 bg-amber-50/60 px-8 py-16 text-center">
      <div aria-hidden className="text-5xl animate-bounce">
        🦊
      </div>
      <p className="text-base font-medium text-stone-800">
        Importing your library…
      </p>
      <p className="text-sm text-stone-600">
        This usually takes just a few seconds.
      </p>
      <div
        aria-hidden
        className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-amber-200/70"
      >
        <div className="h-full w-1/3 animate-pulse rounded-full bg-amber-500" />
      </div>
    </div>
  );
}

function SuccessState({
  job,
  onReset,
}: {
  job: ImportJob;
  onReset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-green-200 bg-green-50/70 p-8 text-center">
      <div aria-hidden className="text-5xl">
        🎉
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-stone-900">
        Import complete!
      </h2>
      <ul className="mx-auto mt-4 flex max-w-sm flex-col gap-1 text-sm text-stone-700">
        <li>
          <span className="font-semibold text-stone-900">
            {job.successful_rows.toLocaleString()}
          </span>{" "}
          {job.successful_rows === 1 ? "book" : "books"} imported successfully
        </li>
        {job.failed_rows > 0 ? (
          <li>
            <span className="font-semibold text-stone-900">
              {job.failed_rows.toLocaleString()}
            </span>{" "}
            {job.failed_rows === 1 ? "book" : "books"} already in your library
          </li>
        ) : null}
        <li className="text-stone-500">
          {job.processed_rows.toLocaleString()} of{" "}
          {job.total_rows.toLocaleString()} rows processed
        </li>
      </ul>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/shelves"
          className="rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
        >
          Go to My Library
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100"
        >
          Search for more books
        </Link>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-xs font-medium text-stone-500 underline-offset-2 hover:underline"
      >
        Import another file
      </button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/70 p-8 text-center">
      <div aria-hidden className="text-5xl">
        😬
      </div>
      <h2 className="mt-3 text-xl font-semibold text-stone-900">
        Something went wrong.
      </h2>
      <p className="mt-2 text-sm text-stone-700">{message}</p>
      <p className="mt-1 text-sm text-stone-600">Please try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
      >
        Try Again
      </button>
    </div>
  );
}

function ImportHistory({ jobs }: { jobs: ImportJob[] }) {
  return (
    <section className="mt-14">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Previous imports
      </h2>
      <ul className="mt-4 flex flex-col gap-2">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-stone-900">
                {job.file_name ?? "goodreads.csv"}
              </span>
              <span className="text-xs text-stone-500">
                {formatDate(job.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <StatusPill status={job.status} />
              <span className="text-stone-600">
                {job.successful_rows.toLocaleString()}{" "}
                {job.successful_rows === 1 ? "book" : "books"} imported
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-800 ring-green-200/60",
    processing: "bg-blue-100 text-blue-800 ring-blue-200/60",
    pending: "bg-amber-100 text-amber-800 ring-amber-200/60",
    failed: "bg-red-100 text-red-800 ring-red-200/60",
  };
  const cls = map[status] ?? "bg-stone-100 text-stone-700 ring-stone-200/60";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
