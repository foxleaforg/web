"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isPrivateProfile,
  PrivateProfileView,
  ProfileView,
  type PrivateProfile,
  type ProfileDetail,
} from "@/components/ProfileView";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Profile = ProfileDetail | PrivateProfile;

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      // Send the token if we have one — harmless for public endpoints.
      const token = getAccessToken();
      try {
        const data = await api.get<Profile>(`/users/${username}`, token);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load profile.";
        if (/not found/i.test(message) || /404/.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) return <ProfileLoading />;
  if (notFound) return <ProfileNotFound />;
  if (error) return <ProfileError message={error} />;
  if (!profile) return null;

  if (isPrivateProfile(profile)) {
    return <PrivateProfileView profile={profile} />;
  }
  return <ProfileView profile={profile} isOwnProfile={false} />;
}

function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 animate-pulse rounded-full bg-stone-200/70" />
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 animate-pulse rounded bg-stone-200/70" />
          <div className="h-4 w-32 animate-pulse rounded bg-stone-200/70" />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-stone-200/70"
          />
        ))}
      </div>
    </main>
  );
}

function ProfileNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
      <div className="flex flex-col items-center gap-3 text-center">
        <div aria-hidden className="text-5xl">
          🦊
        </div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Reader not found
        </h1>
        <p className="text-sm text-stone-600">
          We couldn&apos;t find anyone with that username.
        </p>
        <Link
          href="/search"
          className="mt-3 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
        >
          Browse books instead
        </Link>
      </div>
    </main>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center">
      <p className="text-sm text-red-700">{message}</p>
    </main>
  );
}
