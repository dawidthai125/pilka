import Link from "next/link";
import { ArrowRight, Flame, Heart, Sparkles, Users, Zap } from "lucide-react";

import { CLUB_DISPLAY_CLASS, CLUB_SCENE_DARK, CLUB_SCENE_LIGHT, WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import { cn } from "@/lib/utils";
import type { PublicNewsPreviewItem, PublicTeamCardWithMedia } from "@/types/website";

const VALUES = [
  { icon: Heart, title: "Pasja", text: "Gra z sercem na każdym treningu i meczu." },
  { icon: Sparkles, title: "Rozwój", text: "Indywidualna ścieżka dla każdego zawodnika." },
  { icon: Users, title: "Zaangażowanie", text: "Rodzice, kibice i społeczność przy klubie." },
  { icon: Flame, title: "Tradycja", text: "Lokalny klub z ambicją i tożsamością." },
] as const;

function formatNewsDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export function PublicLandingHome({
  clubName,
  heroTitle,
  heroSubtitle,
  coverImageUrl,
  news,
  teams,
}: {
  clubName: string;
  heroTitle: string;
  heroSubtitle: string | null;
  coverImageUrl?: string | null;
  news: PublicNewsPreviewItem[];
  teams: PublicTeamCardWithMedia[];
}) {
  const newsCards = news.slice(0, 4);
  const teamCards = teams.filter((t) => t.imageUrl).slice(0, 5);

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[420px] overflow-hidden sm:min-h-[480px] lg:min-h-[520px]" aria-label="Hero">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--club-primary)] to-[#041810]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041810]/90 via-[#041810]/55 to-[#041810]/30" />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <p className={cn(CLUB_DISPLAY_CLASS, "text-sm font-semibold uppercase tracking-[0.2em] text-[var(--club-secondary)]")}>
            {clubName}
          </p>
          <h1 className={cn(CLUB_DISPLAY_CLASS, "mt-3 max-w-2xl text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl")}>
            {heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
            {heroSubtitle ?? "Razem tworzymy historię ⚡"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/#akademia"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[var(--club-secondary)] px-6 text-sm font-bold uppercase tracking-wide text-[var(--club-primary)] shadow-lg hover:brightness-105"
            >
              Dowiedz się więcej
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/aktualnosci"
              className="inline-flex min-h-12 items-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10"
            >
              Aktualności
            </Link>
          </div>
        </div>
      </section>

      {/* Wartości */}
      <section className={cn(CLUB_SCENE_DARK, "py-10 sm:py-12")} aria-label="Wartości klubu">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {VALUES.map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--club-secondary)]/15 text-[var(--club-secondary)]">
                <item.icon className="size-6" />
              </div>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[var(--club-secondary)]">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Aktualności */}
      {newsCards.length > 0 ? (
        <section className={cn(CLUB_SCENE_LIGHT, "py-12 sm:py-16")} aria-label="Aktualności">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold text-[var(--club-primary)] sm:text-4xl")}>
                  Aktualności
                </h2>
                <p className="mt-2 text-sm text-[var(--club-primary)]/70">Mecze, akademia i życie klubu</p>
              </div>
              <Link href="/aktualnosci" className="text-sm font-semibold text-[var(--club-primary)] hover:underline">
                Zobacz wszystkie →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {newsCards.map((item) => (
                <Link
                  key={item.id}
                  href={`/aktualnosci/${item.slug}`}
                  className="group overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {item.featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.featuredImageUrl}
                        alt=""
                        className="size-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-[var(--club-primary)]/10">
                        <Zap className="size-10 text-[var(--club-primary)]/40" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--club-secondary)] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[var(--club-primary)]">
                      {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground">{formatNewsDate(item.publishedAt ?? item.createdAt)}</p>
                    <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-[var(--club-primary)] group-hover:underline">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Drużyny */}
      {teamCards.length > 0 ? (
        <section className="bg-white py-12 sm:py-16" aria-label="Nasze drużyny">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold text-[var(--club-primary)] sm:text-4xl")}>
                Nasze drużyny
              </h2>
              <Link href="/druzyna" className="text-sm font-semibold text-[var(--club-primary)] hover:underline">
                Kadra klubu →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {teamCards.map((team) => (
                <Link
                  key={team.id}
                  href="/druzyna"
                  className="group relative overflow-hidden rounded-xl"
                >
                  <div className="aspect-[3/4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={team.imageUrl!}
                      alt={team.name}
                      className="size-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#041810] via-transparent to-transparent" />
                    <p className="absolute bottom-0 left-0 right-0 p-3 text-center text-sm font-bold text-white">{team.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Join CTA */}
      <section className={cn(CLUB_SCENE_DARK, "relative overflow-hidden py-14 sm:py-16")} aria-label="Dołącz do klubu">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140' fill='white'%3E%3Cpath d='M52 8 L68 48 L92 48 L72 68 L80 108 L52 86 L24 108 L32 68 L12 48 L36 48 Z'/%3E%3C/svg%3E")`,
            backgroundSize: "120px 168px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold text-[var(--club-secondary)] sm:text-4xl")}>
            Dołącz do Pioruna!
          </p>
          <p className="mt-3 text-base text-white/80">
            Zapisz dziecko do akademii i bądź częścią naszej piłkarskiej rodziny.
          </p>
          <Link
            href="/kontakt"
            className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-[var(--club-secondary)] px-8 text-sm font-bold uppercase tracking-wide text-[var(--club-primary)] hover:brightness-105"
          >
            Zapisz dziecko
          </Link>
        </div>
      </section>
    </>
  );
}
