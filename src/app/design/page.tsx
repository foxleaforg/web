import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { Fox, type FoxMood } from "@/components/Fox";
import { SpoilerBlock } from "@/components/SpoilerBlock";
import { StatusBadge, type ReadingStatus } from "@/components/StatusBadge";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";

const STATUSES: ReadingStatus[] = ["reading", "want_to_read", "read", "dnf"];

/**
 * Living reference for the Foxleaf design system. Not linked from the app —
 * visit /design directly. Safe to delete if you'd rather not ship it.
 */

const MOODS: FoxMood[] = [
  "reading",
  "celebrating",
  "empty",
  "sleeping",
  "searching",
];

const SWATCHES: Array<{ name: string; className: string; hex: string }> = [
  { name: "cream", className: "bg-foxleaf-cream", hex: "#FDFBF7" },
  { name: "cream-deep", className: "bg-foxleaf-cream-deep", hex: "#F5F0E8" },
  { name: "surface", className: "bg-foxleaf-surface", hex: "#FFFFFF" },
  { name: "border", className: "bg-foxleaf-border", hex: "#E8E0D5" },
  { name: "ink", className: "bg-foxleaf-ink", hex: "#2A2420" },
  { name: "muted", className: "bg-foxleaf-muted", hex: "#7A6E63" },
  { name: "primary", className: "bg-foxleaf-primary", hex: "#BC5730" },
  { name: "primary-hover", className: "bg-foxleaf-primary-hover", hex: "#A44A28" },
  { name: "primary-bright", className: "bg-foxleaf-primary-bright", hex: "#D97848" },
  { name: "primary-tint", className: "bg-foxleaf-primary-tint", hex: "#F7E4D8" },
  { name: "accent", className: "bg-foxleaf-accent", hex: "#3D6B4F" },
  { name: "accent-tint", className: "bg-foxleaf-accent-tint", hex: "#E2EDE5" },
  { name: "success", className: "bg-foxleaf-success", hex: "#3F7D4F" },
  { name: "warning", className: "bg-foxleaf-warning", hex: "#A9661A" },
  { name: "danger", className: "bg-foxleaf-danger", hex: "#B4453A" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-14">
      <header className="flex flex-col gap-3">
        <p className="text-caption font-medium tracking-wide text-foxleaf-primary uppercase">
          Foxleaf
        </p>
        <h1 className="text-display font-wonk">Design system</h1>
        <p className="max-w-xl text-body-lg text-foxleaf-muted">
          Cosy, warm, uncrowded. Fraunces for headings, Inter for everything
          else.
        </p>
      </header>

      <Section title="Colour">
        <p className="-mt-2 text-small text-foxleaf-muted">
          Hex values are the light-mode tokens. The swatches themselves follow
          the active theme.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {SWATCHES.map((s) => (
            <div key={s.name} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-control border border-foxleaf-border ${s.className}`}
              />
              <div className="flex flex-col">
                <span className="text-caption font-medium">{s.name}</span>
                <span className="text-caption text-foxleaf-muted">{s.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <Card padding="lg" className="flex flex-col gap-4">
          <p className="text-display">Display — 48px Fraunces</p>
          <h1>Heading 1 — the quick brown fox</h1>
          <h2>Heading 2 — the quick brown fox</h2>
          <h3>Heading 3 — the quick brown fox</h3>
          <h4>Heading 4 — the quick brown fox</h4>
          <p className="text-body-lg">
            Body large, 17px Inter. Used for review prose where the reading
            experience matters more than density.
          </p>
          <p className="text-body">
            Body, 16px Inter. The default for interface copy.
          </p>
          <p className="text-small text-foxleaf-muted">
            Small, 14px. Secondary information and metadata.
          </p>
          <p className="text-caption text-foxleaf-muted">
            Caption, 12px. Timestamps, labels, counts.
          </p>
        </Card>
      </Section>

      <Section title="Buttons">
        <Card padding="lg" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>Saving…</Button>
            <Button variant="secondary" loading>
              Saving…
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <Button fullWidth>Full width</Button>
        </Card>
      </Section>

      <Section title="Badges">
        <Card padding="lg" className="flex flex-wrap items-center gap-3">
          <Badge variant="primary">Currently reading</Badge>
          <Badge variant="green" dot>
            Finished
          </Badge>
          <Badge variant="amber">DNF</Badge>
          <Badge variant="gray">Want to read</Badge>
          <Badge variant="red">Ending spoiler</Badge>
          <Badge variant="primary" size="md">
            Medium
          </Badge>
        </Card>
      </Section>

      <Section title="Book covers">
        <Card padding="lg" className="flex flex-col gap-5">
          <p className="text-small text-foxleaf-muted">
            Books with no cover art — or whose cover URL 404s — get the title
            typeset on a warm gradient, picked deterministically from the
            title. All eight gradient stops clear 4.5:1 for white text.
          </p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-5">
            <BookCover
              title="Piranesi"
              authors={["Susanna Clarke"]}
              coverUrl={null}
            />
            <BookCover
              title="The Left Hand of Darkness"
              authors={["Ursula K. Le Guin"]}
              coverUrl={null}
            />
            <BookCover
              title="Tomorrow, and Tomorrow, and Tomorrow"
              authors={["Gabrielle Zevin"]}
              coverUrl={null}
            />
            <BookCover title="Beloved" authors={["Toni Morrison"]} coverUrl={null} />
            {/* Deliberately broken URL: proves the onError fallback. */}
            <BookCover
              title="A Broken Cover URL"
              authors={["Falls back gracefully"]}
              coverUrl="https://covers.openlibrary.org/b/id/000000000-M.jpg"
            />
          </div>
        </Card>
      </Section>

      <Section title="Status — readable without colour">
        <Card padding="lg" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <p className="text-small text-foxleaf-muted">
            Each status carries a distinct icon silhouette and a text label, so
            it survives greyscale and every form of colour blindness. Check any
            change to these in greyscale before shipping it.
          </p>
          <div className="flex flex-wrap items-center gap-3 grayscale">
            {STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Spoilers — severity without colour">
        <Card padding="lg" className="flex flex-col gap-2">
          <SpoilerBlock spoilerBlockId="demo-minor" severity="minor" />
          <SpoilerBlock spoilerBlockId="demo-major" severity="major" />
          <SpoilerBlock spoilerBlockId="demo-ending" severity="ending" />
          <p className="mt-2 text-small text-foxleaf-muted">
            Label, icon shape and filled pip count all encode severity. The
            tint is the fourth signal, not the only one.
          </p>
          <div className="grayscale">
            <SpoilerBlock spoilerBlockId="demo-grey" severity="ending" />
          </div>
        </Card>
      </Section>

      <Section title="Cards">
        <div className="grid gap-5 sm:grid-cols-3">
          <Card>
            <h4 className="mb-1">Static</h4>
            <p className="text-small text-foxleaf-muted">
              Default surface with a soft shadow.
            </p>
          </Card>
          {/* The accessible clickable-card pattern: a real link whose hit
              area is stretched over the whole card. Tab to it to see the
              focus ring wrap the card. */}
          <Card interactive>
            <h4 className="mb-1">
              <Link href="/design" className="stretch-link">
                Interactive
              </Link>
            </h4>
            <p className="text-small text-foxleaf-muted">
              A real link, stretched over the card. Keyboard reachable.
            </p>
          </Card>
          <Card padding="lg">
            <h4 className="mb-1">Large padding</h4>
            <p className="text-small text-foxleaf-muted">
              none · sm · md · lg
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Forms">
        <Card padding="lg" className="grid gap-5 sm:grid-cols-2">
          <Input label="Book title" placeholder="Piranesi" />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            hint="We'll never share it."
          />
          <Input
            label="Username"
            defaultValue="fox"
            error="That username is already taken."
          />
          <Input label="Disabled" placeholder="Unavailable" disabled />
          <div className="sm:col-span-2">
            <Textarea
              label="Your review"
              placeholder="What did you think?"
              hint="Markdown supported. Wrap spoilers in a spoiler block."
              rows={4}
            />
          </div>
        </Card>
      </Section>

      <Section title="Fox">
        <Card padding="lg">
          <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {MOODS.map((mood) => (
              <div key={mood} className="flex flex-col items-center gap-3">
                <Fox mood={mood} size="md" />
                <span className="text-caption text-foxleaf-muted">{mood}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-foxleaf-border pt-10">
            <Fox
              mood="empty"
              size="lg"
              message="Your shelf is looking bare. Add your first book and this fox will cheer up."
            />
          </div>
        </Card>
      </Section>

      <Section title="Elevation">
        {/* Written out rather than interpolated — Tailwind scans source text,
            so `shadow-${s}` would never be generated. */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-card bg-foxleaf-surface p-6 shadow-soft">
            <span className="text-small font-medium">shadow-soft</span>
          </div>
          <div className="rounded-card bg-foxleaf-surface p-6 shadow-lift">
            <span className="text-small font-medium">shadow-lift</span>
          </div>
          <div className="rounded-card bg-foxleaf-surface p-6 shadow-float">
            <span className="text-small font-medium">shadow-float</span>
          </div>
        </div>
      </Section>
    </main>
  );
}
