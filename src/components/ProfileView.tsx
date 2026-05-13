import Link from "next/link";

export type ReadingStats = {
  total_books: number;
  books_read: number;
  books_reading: number;
  books_want_to_read: number;
  books_dnf: number;
  total_ratings: number;
  average_rating: number | null;
  total_reviews: number;
};

export type RecentActivity = {
  activity_type: string;
  book_title: string;
  book_slug: string;
  book_cover_url: string | null;
  detail: string | null;
  timestamp: string;
};

export type GenreCount = {
  genre_name: string;
  genre_slug: string;
  count: number;
};

export type ProfileDetail = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
  stats: ReadingStats;
  recent_activity: RecentActivity[];
  favorite_genres: GenreCount[];
};

export type PrivateProfile = {
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  message: string;
};

export function isPrivateProfile(
  data: ProfileDetail | PrivateProfile,
): data is PrivateProfile {
  return !("stats" in data);
}

export function ProfileView({
  profile,
  isOwnProfile,
}: {
  profile: ProfileDetail;
  isOwnProfile: boolean;
}) {
  const { stats } = profile;
  const totalForBreakdown =
    stats.books_read +
    stats.books_reading +
    stats.books_want_to_read +
    stats.books_dnf;
  const isEmpty = totalForBreakdown === 0 && stats.total_books === 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <ProfileHero profile={profile} isOwnProfile={isOwnProfile} />

      {isEmpty ? (
        <EmptyState isOwnProfile={isOwnProfile} />
      ) : (
        <>
          <StatsCards stats={stats} />
          {totalForBreakdown > 0 ? (
            <ReadingBreakdown stats={stats} total={totalForBreakdown} />
          ) : null}
          {profile.favorite_genres.length > 0 ? (
            <FavoriteGenres genres={profile.favorite_genres} />
          ) : null}
          <RecentActivityTimeline activity={profile.recent_activity} />
        </>
      )}
    </main>
  );
}

export function PrivateProfileView({ profile }: { profile: PrivateProfile }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <Avatar
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            {profile.display_name}
          </h1>
          <p className="text-sm text-stone-500">@{profile.username}</p>
        </div>
        {profile.bio ? (
          <p className="max-w-md text-sm text-stone-700">{profile.bio}</p>
        ) : null}
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white/70 px-6 py-4 text-sm text-stone-700">
          🔒 {profile.message}
        </div>
      </div>
    </main>
  );
}

function ProfileHero({
  profile,
  isOwnProfile,
}: {
  profile: ProfileDetail;
  isOwnProfile: boolean;
}) {
  return (
    <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <Avatar
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold leading-tight text-stone-900">
            {profile.display_name}
          </h1>
          <p className="text-sm text-stone-500">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-2 max-w-xl text-sm text-stone-700">{profile.bio}</p>
          ) : null}
          <p className="mt-2 text-xs text-stone-500">
            Member since {formatMemberSince(profile.created_at)}
          </p>
        </div>
      </div>
      {isOwnProfile ? (
        <Link
          href="/profile/edit"
          className="self-start rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 sm:self-auto"
        >
          Edit Profile
        </Link>
      ) : null}
    </section>
  );
}

function Avatar({
  displayName,
  avatarUrl,
  size,
}: {
  displayName: string;
  avatarUrl: string | null;
  size: "md" | "lg";
}) {
  const dimensions =
    size === "lg" ? "h-20 w-20 text-2xl" : "h-12 w-12 text-base";
  const initial = displayName.charAt(0).toUpperCase() || "?";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`Avatar of ${displayName}`}
        className={`${dimensions} rounded-full object-cover ring-2 ring-amber-100 shadow-sm`}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={`${dimensions} flex items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 font-semibold text-stone-800 ring-2 ring-amber-100 shadow-sm`}
    >
      {initial}
    </div>
  );
}

function StatsCards({ stats }: { stats: ReadingStats }) {
  const cards: Array<{
    icon: string;
    label: string;
    value: string;
    bg: string;
  }> = [
    {
      icon: "📚",
      label: "Total books",
      value: stats.total_books.toLocaleString(),
      bg: "bg-amber-100/80 ring-amber-200/60",
    },
    {
      icon: "✅",
      label: "Books read",
      value: stats.books_read.toLocaleString(),
      bg: "bg-orange-100/80 ring-orange-200/60",
    },
    {
      icon: "📖",
      label: "Currently reading",
      value: stats.books_reading.toLocaleString(),
      bg: "bg-yellow-100/80 ring-yellow-200/60",
    },
    {
      icon: "📋",
      label: "Want to read",
      value: stats.books_want_to_read.toLocaleString(),
      bg: "bg-rose-100/70 ring-rose-200/60",
    },
    {
      icon: "⭐",
      label: "Average rating",
      value:
        stats.average_rating !== null
          ? `${formatScore(stats.average_rating)}/10`
          : "—",
      bg: "bg-amber-200/70 ring-amber-300/60",
    },
  ];

  return (
    <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`flex flex-col gap-1 rounded-2xl p-4 shadow-sm ring-1 ring-inset ${c.bg}`}
        >
          <span aria-hidden className="text-xl">
            {c.icon}
          </span>
          <span className="text-2xl font-semibold tabular-nums text-stone-900">
            {c.value}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-stone-600">
            {c.label}
          </span>
        </div>
      ))}
    </section>
  );
}

function ReadingBreakdown({
  stats,
  total,
}: {
  stats: ReadingStats;
  total: number;
}) {
  const segments = [
    {
      key: "read",
      label: "Read",
      count: stats.books_read,
      bar: "bg-green-500",
      dot: "bg-green-500",
    },
    {
      key: "reading",
      label: "Reading",
      count: stats.books_reading,
      bar: "bg-blue-500",
      dot: "bg-blue-500",
    },
    {
      key: "want",
      label: "Want to Read",
      count: stats.books_want_to_read,
      bar: "bg-amber-500",
      dot: "bg-amber-500",
    },
    {
      key: "dnf",
      label: "DNF",
      count: stats.books_dnf,
      bar: "bg-stone-400",
      dot: "bg-stone-400",
    },
  ].filter((s) => s.count > 0);

  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Reading breakdown
      </h2>
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-stone-100 ring-1 ring-inset ring-stone-200">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.bar} h-full transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((s) => {
          const pct = Math.round((s.count / total) * 100);
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${s.dot}`}
              />
              <span className="font-medium text-stone-800">{s.label}</span>
              <span className="text-stone-500">
                {s.count} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FavoriteGenres({ genres }: { genres: GenreCount[] }) {
  const max = Math.max(...genres.map((g) => g.count), 1);
  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Favorite genres
      </h2>
      <ul className="mt-4 flex flex-col gap-2">
        {genres.map((g) => {
          const widthPct = Math.max(6, (g.count / max) * 100);
          return (
            <li
              key={g.genre_slug}
              className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3"
            >
              <span className="truncate text-sm font-medium text-stone-800">
                {g.genre_name}
              </span>
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 shadow-inner transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm tabular-nums text-stone-600">
                {g.count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentActivityTimeline({
  activity,
}: {
  activity: RecentActivity[];
}) {
  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Recent activity
      </h2>
      {activity.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">No activity yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {activity.slice(0, 10).map((entry, i) => (
            <li
              key={`${entry.activity_type}-${entry.book_slug}-${entry.timestamp}-${i}`}
              className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 shadow-sm"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base"
              >
                {activityIcon(entry.activity_type)}
              </span>
              <div className="flex-1">
                <p className="text-sm text-stone-800">
                  {activityVerb(entry.activity_type)}{" "}
                  <Link
                    href={`/books/${entry.book_slug}`}
                    className="font-medium text-stone-900 underline-offset-2 hover:underline"
                  >
                    {entry.book_title}
                  </Link>
                  {entry.activity_type === "rated" && entry.detail
                    ? ` ${entry.detail}/10`
                    : ""}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {formatRelativeTime(entry.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <section className="mt-12 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-white/40 py-16 text-center">
      <div aria-hidden className="text-5xl">
        🌱
      </div>
      {isOwnProfile ? (
        <>
          <p className="text-lg font-medium text-stone-800">
            Start your reading journey!
          </p>
          <p className="max-w-sm text-sm text-stone-600">
            Search for books to add to your library.
          </p>
          <Link
            href="/search"
            className="mt-2 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
          >
            Find a book
          </Link>
        </>
      ) : (
        <p className="max-w-sm text-sm text-stone-600">
          This reader hasn&apos;t added any books yet.
        </p>
      )}
    </section>
  );
}

function activityIcon(type: string): string {
  switch (type) {
    case "rated":
      return "⭐";
    case "reviewed":
      return "📝";
    case "started_reading":
      return "📖";
    case "finished_reading":
      return "✅";
    default:
      return "📚";
  }
}

function activityVerb(type: string): string {
  switch (type) {
    case "rated":
      return "Rated";
    case "reviewed":
      return "Reviewed";
    case "started_reading":
      return "Started reading";
    case "finished_reading":
      return "Finished reading";
    default:
      return "Updated";
  }
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatMemberSince(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? "hour" : "hours"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
  if (diffDay < 30) {
    const w = Math.round(diffDay / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (diffDay < 365) {
    const m = Math.round(diffDay / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  const y = Math.round(diffDay / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}
