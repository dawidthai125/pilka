import Link from "next/link";
import { ArrowRight, Calendar, ChevronRight, Shield, Trophy, Users } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { WEBSITE_GALLERY_CATEGORY_LABELS, WEBSITE_NEWS_CATEGORY_LABELS, WEBSITE_SPONSOR_TIER_LABELS } from "@/lib/website/constants";
import {
  formatPublicMatchKickoff,
  formatPublicMatchScore,
  formatPublicMatchTime,
} from "@/lib/website/match-display";
import { cn } from "@/lib/utils";
import type { LeagueTableEntry } from "@/types/matches";
import type {
  PublicClubStats,
  PublicGalleryPreviewItem,
  PublicMatchSummary,
  PublicNewsPreviewItem,
  PublicSponsor,
  PublicTeamCard,
  WebsiteSponsorTier,
} from "@/types/website";

function PublicSectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "Zobacz więcej",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--club-primary)]">
          {linkLabel}
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function MatchEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
      <Trophy className="mb-2 size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">Wkrótce pojawią się dane meczowe.</p>
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
  heroImageUrl,
  teams,
  nextMatch,
}: {
  clubName: string;
  logoUrl?: string | null;
  title: string;
  subtitle: string | null;
  heroImageUrl?: string | null;
  teams: PublicTeamCard[];
  nextMatch: PublicMatchSummary | null;
}) {
  const teamLabels = teams.map((t) => t.name);

  return (
    <section
      className="relative overflow-hidden bg-[var(--club-primary)] text-[var(--club-accent)]"
      aria-label="Strona główna klubu"
    >
      {heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImageUrl} alt="" className="absolute inset-0 size-full object-cover" aria-hidden />
      ) : null}
      <div
        className={cn(
          "absolute inset-0",
          heroImageUrl
            ? "bg-gradient-to-r from-[var(--club-primary)]/95 via-[var(--club-primary)]/85 to-[var(--club-primary)]/70"
            : "bg-gradient-to-br from-[var(--club-primary)] via-[#0a4a38] to-[#062820]",
        )}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <ClubLogo logoUrl={logoUrl} clubName={clubName} size="xl" onDark className="ring-2 ring-white/20" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--club-secondary)]">
                  Klub piłkarski
                </p>
                <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {title}
                </h1>
                {subtitle ? <p className="mt-2 max-w-2xl text-sm opacity-90 sm:text-base">{subtitle}</p> : null}
              </div>
            </div>

            {teamLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teamLabels.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link
                href="/mecze"
                className="inline-flex min-h-11 items-center rounded-lg bg-[var(--club-secondary)] px-5 text-sm font-semibold text-[var(--club-primary)]"
              >
                Terminarz
              </Link>
              <Link
                href="/aktualnosci"
                className="inline-flex min-h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold"
              >
                Aktualności
              </Link>
              <Link
                href="/kontakt"
                className="inline-flex min-h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold"
              >
                Dołącz do klubu
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm sm:p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--club-secondary)]">
              <Calendar className="size-4" />
              Najbliższy mecz
            </p>
            {nextMatch ? (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-bold leading-snug">
                  {nextMatch.homeTeamName} — {nextMatch.awayTeamName}
                </p>
                <p className="text-sm opacity-90">{formatPublicMatchKickoff(nextMatch)}</p>
                {nextMatch.stadium ? <p className="text-xs opacity-75">{nextMatch.stadium}</p> : null}
                <Link href="/mecze" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--club-secondary)] underline-offset-4 hover:underline">
                  Pełny terminarz →
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm opacity-80">Brak zaplanowanego meczu — sprawdź terminarz wkrótce.</p>
            )}
          </div>
        </div>
      </div>
    </section>
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
  const tablePreview = leagueEntries.slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Centrum meczowe">
      <PublicSectionHeader title="Centrum meczowe" subtitle="Wyniki, terminarz i pozycja w tabeli." href="/mecze" linkLabel="Terminarz" />
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <MatchCard label="Ostatni mecz" match={lastResult} href="/mecze" variant="last" />
        <MatchCard label="Następny mecz" match={nextMatch} href="/mecze" variant="next" />
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--club-primary)]">Tabela</p>
            <Link href="/tabela" className="text-xs font-medium text-[var(--club-primary)] underline">
              Pełna tabela
            </Link>
          </div>
          {tablePreview.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[260px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-2">#</th>
                    <th className="pb-2">Drużyna</th>
                    <th className="pb-2 text-right">Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {tablePreview.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn("border-b border-border/50 last:border-0", row.isOwnClub && "bg-[var(--club-secondary)]/15 font-semibold")}
                    >
                      <td className="py-2 pr-2 tabular-nums">{index + 1}</td>
                      <td className="max-w-[140px] truncate py-2">{row.teamName}</td>
                      <td className="py-2 text-right tabular-nums">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <MatchEmptyState label="Brak danych tabeli" />
          )}
          {ownTeamName ? (
            <p className="mt-3 text-xs text-muted-foreground">Wyróżniono: {ownTeamName}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function teamDetailHref(team: PublicTeamCard): string {
  if (team.category === "seniors") return "/druzyna";
  return "/kontakt";
}

export function PublicTeamsSection({ teams }: { teams: PublicTeamCard[] }) {
  if (teams.length === 0) return null;

  return (
    <section className="border-y bg-muted/20 py-10 sm:py-14" aria-label="Nasze drużyny">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader
          title="Nasze drużyny"
          subtitle="Cały klub — od najmłodszych po seniorów."
          href="/druzyna"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={teamDetailHref(team)}
              className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-[var(--club-primary)]/30 hover:shadow-md"
            >
              <div className="relative aspect-[16/9] bg-gradient-to-br from-[var(--club-primary)] to-[#0d5240] p-4 text-white">
                <Users className="size-8 text-[var(--club-secondary)]" />
                <p className="mt-auto text-xl font-bold">{team.name}</p>
                {team.season ? <p className="text-xs opacity-80">Sezon {team.season}</p> : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                {team.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{team.description}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Users className="size-4 text-[var(--club-primary)]" />
                    {team.playersCount > 0 ? `${team.playersCount} zawodników` : "Kadra w przygotowaniu"}
                  </span>
                  {team.coachName ? (
                    <span className="text-muted-foreground">Trener: {team.coachName}</span>
                  ) : null}
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--club-primary)] group-hover:underline">
                  Szczegóły <ArrowRight className="size-4" />
                </span>
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

export function PublicAcademySection({ teams }: { teams: PublicTeamCard[] }) {
  const displayPath = sortTeamsForAcademyPath(teams);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Akademia">
      <PublicSectionHeader
        title="Akademia klubu"
        subtitle="Ścieżka rozwoju od najmłodszych grup po pierwszą drużynę."
        href="/kontakt"
        linkLabel="Zapisz dziecko"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Rozwijamy młodzież poprzez regularne treningi, nabory i profesjonalne szkolenie. Każda grupa wiekowa
            przygotowuje zawodników do kolejnego etapu — aż do gry w drużynie seniorskiej.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {displayPath.map((team, index) => (
              <span key={team.id} className="flex items-center gap-2">
                <span className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold">{team.name}</span>
                {index < displayPath.length - 1 ? (
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                ) : null}
              </span>
            ))}
          </div>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <Shield className="mt-0.5 size-4 shrink-0 text-[var(--club-primary)]" />
              Nabory i zapisy przez biuro klubu
            </li>
            <li className="flex items-start gap-2">
              <Shield className="mt-0.5 size-4 shrink-0 text-[var(--club-primary)]" />
              Treningi pod okiem licencjonowanych trenerów
            </li>
          </ul>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-[var(--club-primary)] to-[#062820] p-6 text-[var(--club-accent)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--club-secondary)]">Dla rodziców</p>
          <p className="mt-2 text-lg font-bold">Chcesz zapisać dziecko do akademii?</p>
          <p className="mt-2 text-sm opacity-90">Skontaktuj się z klubem — pomożemy dobrać grupę wiekową.</p>
          <Link
            href="/kontakt"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--club-secondary)] text-sm font-semibold text-[var(--club-primary)]"
          >
            Kontakt i zapisy
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PublicGallerySection({ items }: { items: PublicGalleryPreviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="border-y bg-muted/20 py-10 sm:py-14" aria-label="Galeria">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PublicSectionHeader title="Galeria" subtitle="Mecze, treningi, wydarzenia i życie klubu." href="/galeria" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {items.slice(0, 8).map((item, index) => (
            <Link
              key={item.slug}
              href={`/galeria/${item.slug}`}
              className={cn(
                "group relative overflow-hidden rounded-xl bg-[var(--club-primary)]",
                index === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto md:min-h-[280px]" : "aspect-square",
              )}
            >
              {item.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverImageUrl} alt={item.title} className="size-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex size-full flex-col justify-end bg-gradient-to-br from-[var(--club-primary)] to-[#0d5240] p-4 text-white">
                  <span className="text-xs uppercase opacity-80">{WEBSITE_GALLERY_CATEGORY_LABELS[item.category]}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="text-xs font-medium uppercase opacity-90">{WEBSITE_GALLERY_CATEGORY_LABELS[item.category]}</p>
                <p className="font-semibold leading-snug">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicNewsSection({ news }: { news: PublicNewsPreviewItem[] }) {
  if (news.length === 0) return null;

  const [featured, ...rest] = news;
  if (!featured) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Aktualności">
      <PublicSectionHeader title="Aktualności" subtitle="Wiadomości z boiska i życia klubu." href="/aktualnosci" />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Link
          href={`/aktualnosci/${featured.slug}`}
          className="group relative min-h-[240px] overflow-hidden rounded-2xl border bg-card lg:min-h-[320px]"
        >
          {featured.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.featuredImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--club-primary)] to-[#062820]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
            <span className="rounded-full bg-[var(--club-secondary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--club-primary)]">
              Wyróżnione · {WEBSITE_NEWS_CATEGORY_LABELS[featured.category]}
            </span>
            <h3 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">{featured.title}</h3>
            {featured.excerpt ? <p className="mt-2 line-clamp-2 text-sm opacity-90">{featured.excerpt}</p> : null}
            <p className="mt-3 text-xs opacity-75">
              {featured.publishedAt?.slice(0, 10) ?? featured.createdAt.slice(0, 10)}
            </p>
          </div>
        </Link>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {rest.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/aktualnosci/${item.slug}`}
              className="group flex gap-3 rounded-xl border bg-card p-3 transition hover:shadow-md sm:p-4"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
                {item.featuredImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.featuredImageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[var(--club-primary)]/10 text-xs font-semibold text-[var(--club-primary)]">
                    {WEBSITE_NEWS_CATEGORY_LABELS[item.category].slice(0, 3)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--club-primary)]">
                  {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
                </p>
                <h3 className="mt-1 line-clamp-2 font-semibold group-hover:text-[var(--club-primary)]">{item.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.publishedAt?.slice(0, 10) ?? item.createdAt.slice(0, 10)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicSponsorsSection({ sponsors }: { sponsors: PublicSponsor[] }) {
  if (sponsors.length === 0) return null;

  const tiers: WebsiteSponsorTier[] = ["main", "supporting", "partner"];
  const grouped = tiers
    .map((tier) => ({
      tier,
      items: sponsors.filter((s) => s.publicTier === tier),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Sponsorzy">
      <PublicSectionHeader title="Sponsorzy i partnerzy" href="/sponsorzy" linkLabel="Wszyscy partnerzy" />
      <div className="space-y-8">
        {grouped.map(({ tier, items }) => (
          <div key={tier}>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {WEBSITE_SPONSOR_TIER_LABELS[tier]}
            </p>
            <div
              className={cn(
                "grid gap-4",
                tier === "main" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
              )}
            >
              {items.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className={cn(
                    "flex min-h-[88px] flex-col items-center justify-center rounded-xl border bg-card p-4 text-center",
                    tier === "main" && "min-h-[100px] border-[color-mix(in_srgb,var(--club-secondary)_35%,transparent)]",
                  )}
                >
                  {sponsor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sponsor.logoUrl} alt={sponsor.companyName} className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <span className="text-sm font-semibold">{sponsor.companyName}</span>
                  )}
                  {sponsor.publicDescription && tier === "main" ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{sponsor.publicDescription}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
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
