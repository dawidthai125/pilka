import Link from "next/link";
import { ArrowRight, ChevronRight, MapPin, Phone, Trophy } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import {
  CLUB_SCENE_DARK,
  CLUB_SCENE_LIGHT,
  WEBSITE_NEWS_CATEGORY_LABELS,
} from "@/lib/website/constants";
import {
  formatPublicMatchKickoff,
  formatPublicMatchScore,
  formatPublicMatchTime,
} from "@/lib/website/match-display";
import { cn } from "@/lib/utils";
import type { LeagueTableEntry } from "@/types/matches";
import type {
  PublicClubStats,
  PublicGalleryMediaItem,
  PublicHeroMediaImage,
  PublicAcademyMediaImage,
  PublicMatchSummary,
  PublicNewsPreviewItem,
  PublicSponsor,
  PublicTeamCard,
  PublicTeamCardWithMedia,
} from "@/types/website";

function PublicSectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "Zobacz więcej",
  theme = "light",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  theme?: "light" | "dark";
}) {
  const isDark = theme === "dark";

  return (
    <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className={cn("text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl", isDark ? "text-white" : "text-[var(--club-primary)]")}>
          {title}
        </h2>
        {subtitle ? (
          <p className={cn("mt-2 text-sm sm:text-base", isDark ? "text-white/75" : "text-[var(--club-primary)]/70")}>{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className={cn(
            "inline-flex min-h-11 items-center gap-1 text-sm font-semibold",
            isDark ? "text-[var(--club-secondary)]" : "text-[var(--club-primary)]",
          )}
        >
          {linkLabel}
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

const HERO_SLOT_ORDER = ["team", "match", "stadium"] as const;

function orderHeroImages(images: PublicHeroMediaImage[]): PublicHeroMediaImage[] {
  const bySlot = new Map(images.map((item) => [item.slotKey, item]));
  return HERO_SLOT_ORDER.map((slot) => bySlot.get(slot)).filter(Boolean) as PublicHeroMediaImage[];
}

function MatchEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
      <Trophy className="mb-2 size-8 text-white/40" />
      <p className="text-sm font-medium text-white/80">{label}</p>
    </div>
  );
}

function MatchCard({
  label,
  match,
  href,
  variant,
}: {
  label: string;
  match: PublicMatchSummary | null;
  href: string;
  variant: "next" | "last";
}) {
  if (!match) {
    return <MatchEmptyState label={variant === "next" ? "Brak zaplanowanego meczu" : "Brak ostatniego wyniku"} />;
  }

  const score = formatPublicMatchScore(match);
  const kickoff = formatPublicMatchKickoff(match);

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-xl border bg-card p-4 transition hover:border-[var(--club-primary)]/30 hover:shadow-md sm:p-5",
        variant === "next" && "border-[color-mix(in_srgb,var(--club-primary)_20%,transparent)]",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--club-primary)]">{label}</p>
      <p className="mt-2 text-xs text-muted-foreground">{kickoff}</p>
      {match.competition ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {match.competition}
          {match.roundNumber ? ` · kolejka ${match.roundNumber}` : ""}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="truncate text-sm font-semibold sm:text-base">{match.homeTeamName}</span>
        <span className="rounded-lg bg-[var(--club-primary)] px-3 py-1.5 text-lg font-bold tabular-nums text-[var(--club-accent)]">
          {score ?? formatPublicMatchTime(match.matchTime) ?? "—"}
        </span>
        <span className="truncate text-right text-sm font-semibold sm:text-base">{match.awayTeamName}</span>
      </div>
      {match.stadium ? <p className="mt-3 text-xs text-muted-foreground">{match.stadium}</p> : null}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--club-primary)] group-hover:underline">
        Szczegóły <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

export function PublicHeroSection({
  clubName,
  logoUrl,
  title,
  subtitle,
  heroImages,
  clubStats,
  competitionLevel,
}: {
  clubName: string;
  logoUrl?: string | null;
  title: string;
  subtitle: string | null;
  heroImages: PublicHeroMediaImage[];
  clubStats?: PublicClubStats | null;
  competitionLevel?: string | null;
}) {
  const collage = orderHeroImages(heroImages.filter((item) => item.url));
  const displayImages =
    collage.length > 0
      ? collage
      : HERO_SLOT_ORDER.map((slotKey) => ({ slotKey, url: null, caption: null }));

  const statsLine = [
    clubStats && clubStats.teamsCount > 0 ? `${clubStats.teamsCount} drużyn` : null,
    clubStats && clubStats.playersCount > 0 ? `${clubStats.playersCount} zawodników` : null,
    competitionLevel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#062820] text-white" aria-label="Strona główna klubu">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 lg:grid-cols-3 lg:grid-rows-1">
        {displayImages.map((item, index) => (
          <div
            key={item.slotKey}
            className={cn(
              "relative overflow-hidden",
              index === 0 ? "col-span-2 row-span-1 lg:col-span-1 lg:row-span-1" : "",
              index === 1 ? "lg:col-span-1" : "",
              index === 2 ? "lg:col-span-1" : "",
            )}
          >
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.caption ?? clubName} className="size-full object-cover" />
            ) : (
              <div className="size-full bg-gradient-to-br from-[var(--club-primary)] to-[#0a4a38]" />
            )}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#062820] via-[#062820]/85 to-[#062820]/35" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:pb-16">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-4">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="xl" onDark className="ring-2 ring-white/25" />
            <div>
              <p className="text-sm font-medium text-[var(--club-secondary)] sm:text-base">{clubName}</p>
              {statsLine ? <p className="mt-1 text-xs text-white/70 sm:text-sm">{statsLine}</p> : null}
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>

          {subtitle ? (
            <p className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg lg:text-xl">{subtitle}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/#akademia"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--club-secondary)] px-6 text-sm font-bold text-[var(--club-primary)] sm:text-base"
            >
              Zapisz dziecko do akademii
            </Link>
            <Link
              href="/mecze"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-white/40 px-6 text-sm font-semibold text-white backdrop-blur-sm sm:text-base"
            >
              Najbliższy mecz
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function MatchdayPoster({
  match,
  ownTeamName,
  href,
}: {
  match: PublicMatchSummary;
  ownTeamName: string;
  href: string;
}) {
  const kickoff = formatPublicMatchKickoff(match);
  const isHome = match.homeTeamName.toLowerCase().includes(ownTeamName.toLowerCase().slice(0, 6));

  return (
    <Link href={href} className="group relative block overflow-hidden rounded-2xl bg-[#0B3D2E] p-6 sm:p-8 lg:p-10">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--club-primary)] via-[#0a4a38] to-[#062820] opacity-90" aria-hidden />
      <div className="relative space-y-4">
        <p className="text-sm font-semibold text-[var(--club-secondary)]">Następny mecz</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <p className="text-right text-base font-bold leading-tight sm:text-xl lg:text-2xl">{match.homeTeamName}</p>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-[var(--club-secondary)] sm:text-4xl lg:text-5xl">VS</span>
            <span className="mt-1 text-lg font-bold tabular-nums text-white/90 sm:text-xl">
              {formatPublicMatchTime(match.matchTime) ?? "—"}
            </span>
          </div>
          <p className="text-left text-base font-bold leading-tight sm:text-xl lg:text-2xl">{match.awayTeamName}</p>
        </div>
        <p className="text-sm text-white/85">{kickoff}</p>
        {match.competition ? (
          <p className="text-xs text-white/65">
            {match.competition}
            {match.roundNumber ? ` · kolejka ${match.roundNumber}` : ""}
          </p>
        ) : null}
        {match.stadium ? <p className="text-xs text-white/65">{isHome ? "U nas" : "Wyjazd"} · {match.stadium}</p> : null}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--club-secondary)] group-hover:underline">
          Szczegóły meczu <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function LastResultBlock({ match, href }: { match: PublicMatchSummary; href: string }) {
  const score = formatPublicMatchScore(match);

  return (
    <Link href={href} className="group block rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
      <p className="text-sm font-semibold text-[var(--club-secondary)]">Ostatni wynik</p>
      <p className="mt-4 text-5xl font-black tabular-nums tracking-tight sm:text-6xl">{score ?? "—"}</p>
      <p className="mt-3 text-sm font-semibold text-white/90">
        {match.homeTeamName} — {match.awayTeamName}
      </p>
      <p className="mt-1 text-xs text-white/60">{formatPublicMatchKickoff(match)}</p>
    </Link>
  );
}

export function PublicMatchCenterSection({
  nextMatch,
  lastResult,
  leagueEntries,
  ownTeamName,
}: {
  nextMatch: PublicMatchSummary | null;
  lastResult: PublicMatchSummary | null;
  leagueEntries: LeagueTableEntry[];
  ownTeamName: string;
}) {
  const tablePreview = leagueEntries.slice(0, 5);

  return (
    <section className={cn(CLUB_SCENE_DARK, "py-12 sm:py-16 lg:py-20")} aria-label="Matchday">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader
          theme="dark"
          title="Dziś w klubie"
          subtitle="Następny mecz, ostatni wynik i pozycja w tabeli."
          href="/mecze"
          linkLabel="Terminarz"
        />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
          {nextMatch ? (
            <MatchdayPoster match={nextMatch} ownTeamName={ownTeamName} href="/mecze" />
          ) : (
            <MatchEmptyState label="Brak zaplanowanego meczu" />
          )}
          {lastResult ? (
            <LastResultBlock match={lastResult} href="/mecze" />
          ) : (
            <MatchEmptyState label="Brak ostatniego wyniku" />
          )}
        </div>

        {tablePreview.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
              <p className="text-sm font-semibold text-[var(--club-secondary)]">Tabela — top 5</p>
              <Link href="/tabela" className="text-xs font-medium text-white/80 underline">
                Pełna tabela
              </Link>
            </div>
            <div className="divide-y divide-white/10">
              {tablePreview.map((row, index) => (
                <div
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_3rem] items-center gap-3 px-4 py-3 text-sm sm:px-6",
                    row.isOwnClub && "bg-[var(--club-secondary)]/15 font-bold",
                  )}
                >
                  <span className="tabular-nums text-white/70">{index + 1}</span>
                  <span className="truncate">{row.teamName}</span>
                  <span className="text-right tabular-nums text-[var(--club-secondary)]">{row.points}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function teamDetailHref(team: PublicTeamCard): string {
  if (team.category === "seniors") return "/druzyna";
  return "/kontakt";
}

export function PublicTeamsSection({ teams }: { teams: PublicTeamCardWithMedia[] }) {
  const visibleTeams = teams.filter((team) => team.imageUrl);
  if (visibleTeams.length === 0) return null;

  return (
    <section className={cn(CLUB_SCENE_LIGHT, "py-12 sm:py-16 lg:py-20")} aria-label="Nasze drużyny">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader
          title="Nasze drużyny"
          subtitle="Cały klub — od najmłodszych po seniorów."
          href="/druzyna"
        />
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
          {visibleTeams.map((team) => (
            <Link
              key={team.id}
              href={teamDetailHref(team)}
              className="group relative w-[78vw] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-auto"
            >
              <div className="relative aspect-[3/4] overflow-hidden sm:aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={team.imageUrl!}
                  alt={team.name}
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#062820] via-[#062820]/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-2xl font-bold text-white">{team.name}</p>
                  {team.season ? <p className="mt-1 text-xs text-white/75">Sezon {team.season}</p> : null}
                  <p className="mt-3 text-sm text-white/90">
                    {team.playersCount > 0 ? `${team.playersCount} zawodników` : "Kadra w przygotowaniu"}
                    {team.coachName ? ` · Trener ${team.coachName}` : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const TEAM_CATEGORY_ORDER: Record<string, number> = {
  u10: 1,
  u12: 2,
  u18: 3,
  seniors: 4,
};

function sortTeamsForAcademyPath(teams: PublicTeamCard[]): PublicTeamCard[] {
  return [...teams].sort((a, b) => {
    const orderA = TEAM_CATEGORY_ORDER[a.category] ?? 99;
    const orderB = TEAM_CATEGORY_ORDER[b.category] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "pl");
  });
}

export function PublicAcademySection({
  teams,
  academyImages,
  contactPhone,
  contactAddress,
  clubName,
}: {
  teams: PublicTeamCard[];
  academyImages: PublicAcademyMediaImage[];
  contactPhone?: string | null;
  contactAddress?: string | null;
  clubName?: string;
}) {
  const displayPath = sortTeamsForAcademyPath(teams);
  const primaryImage = academyImages.find((item) => item.slotKey === "kids") ?? academyImages[0];
  const secondaryImage = academyImages.find((item) => item.slotKey === "training") ?? academyImages[1];

  return (
    <section id="akademia" className={cn(CLUB_SCENE_LIGHT, "scroll-mt-24 py-12 sm:py-16 lg:py-20")} aria-label="Akademia">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader
          title={clubName ? `Akademia ${clubName}` : "Akademia klubu"}
          subtitle="Od najmłodszych grup po pierwszą drużynę seniorską."
          href="/kontakt"
          linkLabel="Zapisz dziecko"
        />
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div className="grid grid-cols-2 gap-3">
            {[primaryImage, secondaryImage].filter(Boolean).map((item) => (
              <div
                key={item?.slotKey ?? "placeholder"}
                className={cn(
                  "overflow-hidden rounded-2xl",
                  item?.slotKey === "kids" ? "col-span-2 aspect-[16/10]" : "aspect-square",
                )}
              >
                {item?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.caption ?? "Akademia"} className="size-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <p className="text-base leading-relaxed text-[#0B3D2E]/80 sm:text-lg">
              Twoje dziecko może tu grać — regularne treningi, nabory i profesjonalne szkolenie pod okiem
              licencjonowanych trenerów.
            </p>
            <div className="relative pl-4">
              <div className="absolute bottom-2 left-1 top-2 w-0.5 bg-[var(--club-secondary)]" aria-hidden />
              <div className="space-y-4">
                {displayPath.map((team) => (
                  <div key={team.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 size-3 rounded-full bg-[var(--club-primary)] ring-4 ring-[#f7f5f0]" />
                    <p className="font-bold text-[var(--club-primary)]">{team.name}</p>
                    {team.playersCount > 0 ? (
                      <p className="text-sm text-[#0B3D2E]/70">{team.playersCount} zawodników</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--club-primary)] p-6 text-white sm:p-8">
              <p className="text-sm font-semibold text-[var(--club-secondary)]">Dla rodziców</p>
              <p className="mt-2 text-xl font-bold">Chcesz zapisać dziecko do akademii?</p>
              <div className="mt-4 space-y-2 text-sm">
                {contactPhone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0 text-[var(--club-secondary)]" />
                    <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="font-semibold hover:underline">
                      {contactPhone}
                    </a>
                  </p>
                ) : null}
                {contactAddress ? (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--club-secondary)]" />
                    <span>{contactAddress}</span>
                  </p>
                ) : null}
              </div>
              <Link
                href="/kontakt"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--club-secondary)] text-sm font-bold text-[var(--club-primary)] sm:w-auto sm:px-8"
              >
                Umów zapis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicGallerySection({ items }: { items: PublicGalleryMediaItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className={cn(CLUB_SCENE_DARK, "py-12 sm:py-16 lg:py-20")} aria-label="Galeria">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader
          theme="dark"
          title="Galeria"
          subtitle="Mecze, treningi, wydarzenia i życie klubu."
          href="/galeria"
        />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {items.slice(0, 12).map((item, index) => (
            <Link
              key={item.id}
              href="/galeria"
              className={cn(
                "group relative overflow-hidden rounded-lg bg-black/30",
                index === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto md:min-h-[320px]" : "aspect-square",
              )}
            >
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.caption ?? "Galeria"} className="size-full object-cover transition group-hover:scale-105" />
              ) : null}
              {item.caption ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <p className="font-semibold leading-snug">{item.caption}</p>
                  </div>
                </>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const NEWS_CATEGORY_BADGE: Record<PublicNewsPreviewItem["category"], string> = {
  matches: "bg-[var(--club-primary)] text-white",
  academy: "bg-[var(--club-secondary)] text-[var(--club-primary)]",
  club: "bg-white/15 text-white",
  transfers: "bg-white/15 text-white",
  sponsors: "bg-white/15 text-white",
  other: "bg-white/15 text-white",
};

export function PublicNewsSection({ news }: { news: PublicNewsPreviewItem[] }) {
  if (news.length === 0) return null;

  const [featured, ...rest] = news;
  if (!featured) return null;

  return (
    <section className={cn(CLUB_SCENE_LIGHT, "py-12 sm:py-16 lg:py-20")} aria-label="Aktualności">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader title="Aktualności" subtitle="Wiadomości z boiska i życia klubu." href="/aktualnosci" />
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <Link
            href={`/aktualnosci/${featured.slug}`}
            className="group relative min-h-[280px] overflow-hidden rounded-2xl lg:min-h-[360px]"
          >
            {featured.featuredImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.featuredImageUrl} alt="" className="absolute inset-0 size-full object-cover transition group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--club-primary)] to-[#062820]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#062820] via-[#062820]/45 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", NEWS_CATEGORY_BADGE[featured.category])}>
                {WEBSITE_NEWS_CATEGORY_LABELS[featured.category]}
              </span>
              <h3 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">{featured.title}</h3>
              {featured.excerpt ? <p className="mt-3 line-clamp-2 text-sm text-white/85 sm:text-base">{featured.excerpt}</p> : null}
              <p className="mt-4 text-xs text-white/65">
                {featured.publishedAt?.slice(0, 10) ?? featured.createdAt.slice(0, 10)}
              </p>
            </div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={`/aktualnosci/${item.slug}`}
                className="group flex gap-4 rounded-xl bg-white/60 p-3 transition hover:bg-white sm:p-4"
              >
                <div className="relative size-24 shrink-0 overflow-hidden rounded-lg sm:size-28">
                  {item.featuredImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.featuredImageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[var(--club-primary)] text-xs font-bold text-white">
                      {WEBSITE_NEWS_CATEGORY_LABELS[item.category].slice(0, 3)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase", NEWS_CATEGORY_BADGE[item.category])}>
                    {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
                  </span>
                  <h3 className="mt-2 line-clamp-2 font-bold text-[var(--club-primary)] group-hover:underline">{item.title}</h3>
                  <p className="mt-2 text-xs text-[#0B3D2E]/60">
                    {item.publishedAt?.slice(0, 10) ?? item.createdAt.slice(0, 10)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicSponsorsSection({ sponsors }: { sponsors: PublicSponsor[] }) {
  if (sponsors.length === 0) return null;

  const mainSponsors = sponsors.filter((s) => s.publicTier === "main");
  const otherSponsors = sponsors.filter((s) => s.publicTier !== "main");

  return (
    <section className={cn(CLUB_SCENE_DARK, "py-12 sm:py-16 lg:py-20")} aria-label="Sponsorzy">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader
          theme="dark"
          title="Sponsorzy i partnerzy"
          href="/sponsorzy"
          linkLabel="Wszyscy partnerzy"
        />

        {mainSponsors.length > 0 ? (
          <div className="space-y-6">
            {mainSponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="mx-auto flex w-full max-w-3xl flex-col items-center rounded-2xl border border-[var(--club-secondary)]/25 bg-white/5 px-8 py-10 text-center sm:py-12 lg:max-w-none lg:w-1/2"
              >
                {sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sponsor.logoUrl} alt={sponsor.companyName} className="max-h-20 max-w-[280px] object-contain sm:max-h-24" />
                ) : (
                  <span className="text-2xl font-bold text-white">{sponsor.companyName}</span>
                )}
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[var(--club-secondary)]">
                  Sponsor główny
                </p>
                {sponsor.publicDescription ? (
                  <p className="mt-4 max-w-md text-sm text-white/75">{sponsor.publicDescription}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {otherSponsors.length > 0 ? (
          <div className={cn(mainSponsors.length > 0 && "mt-10 border-t border-white/10 pt-10")}>
            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-white/50">Partnerzy</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {otherSponsors.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="flex min-h-[72px] items-center justify-center rounded-xl bg-white/5 px-4 py-5"
                >
                  {sponsor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sponsor.logoUrl} alt={sponsor.companyName} className="max-h-10 max-w-full object-contain opacity-90" />
                  ) : (
                    <span className="text-center text-xs font-semibold text-white/80">{sponsor.companyName}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PublicClubStatsSection({ stats }: { stats: PublicClubStats | null }) {
  if (!stats) return null;

  const items = [
    { label: "Zawodników", value: stats.playersCount },
    { label: "Drużyn", value: stats.teamsCount },
    { label: "Rozegranych meczów", value: stats.matchesPlayed },
    { label: "Lat działalności", value: stats.yearsActive },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <section className="bg-[var(--club-primary)] py-10 text-[var(--club-accent)] sm:py-14" aria-label="Klub w liczbach">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Klub w liczbach</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm opacity-85">
          Aktywna organizacja piłkarska — rozwój na wielu poziomach wiekowych.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/15 bg-white/10 p-5 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold tabular-nums text-[var(--club-secondary)] sm:text-4xl">{item.value}</p>
              <p className="mt-2 text-sm opacity-90">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use PublicMatchCenterSection — kept for subpages if needed */
export function MatchHighlightCard({
  label,
  match,
  href,
}: {
  label: string;
  match: PublicMatchSummary | null;
  href: string;
}) {
  return <MatchCard label={label} match={match} href={href} variant={label.toLowerCase().includes("ostatni") ? "last" : "next"} />;
}

export function PublicLeagueTableSection({
  entries,
  ownTeamName: _ownTeamName,
  limit,
  showFullLink = true,
}: {
  entries: LeagueTableEntry[];
  ownTeamName: string;
  limit?: number;
  showFullLink?: boolean;
}) {
  const visible = limit ? entries.slice(0, limit) : entries;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Tabela ligi</h2>
        {showFullLink ? (
          <Link href="/tabela" className="text-sm font-medium text-primary underline">Pełna tabela</Link>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Drużyna</th>
              <th className="px-4 py-3">M</th>
              <th className="px-4 py-3">Pkt</th>
              <th className="px-4 py-3">Bramki</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b last:border-0 ${row.isOwnClub ? "bg-[var(--club-secondary)]/20 font-medium" : ""}`}
              >
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3">{row.teamName}</td>
                <td className="px-4 py-3">{row.played}</td>
                <td className="px-4 py-3 font-semibold">{row.points}</td>
                <td className="px-4 py-3">{row.goalsFor}:{row.goalsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
