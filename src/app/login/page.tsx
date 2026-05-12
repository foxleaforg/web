"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { saveTokens } from "@/lib/auth";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      saveTokens(data.access_token, data.refresh_token);
      router.push("/shelves");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white/70 p-8 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-stone-900">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-600">
          Log in to your Foxleaf account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            required
          />

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-stone-900 underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  required,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-stone-800"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
      />
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
