"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ProfileView,
  type ProfileDetail,
} from "@/components/ProfileView";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<ProfileDetail>("/users/me/profile", token);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load profile.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) return <ProfileLoading />;
  if (error) return <ProfileError message={error} />;
  if (!profile) return null;

  return <ProfileView profile={profile} isOwnProfile={true} />;
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

function ProfileError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center">
      <p className="text-sm text-red-700">{message}</p>
    </main>
  );
}
