import Link from "next/link";
import {
  ChevronRight,
  Images,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Pin,
  UserPlus,
} from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { isDisplayablePublicMatch } from "@/lib/website/match-display";
import { formatPublicMatchKickoffLong, formatRelativeTimePl } from "@/lib/website/time";
import { cn } from "@/lib/utils";
import type {
  PublicAcademyMediaImage,
  PublicGalleryMediaItem,
  PublicHeroMediaImage,
  PublicMatchSummary,
  PublicNewsPreviewItem,
  WebsiteSocialIntegration,
} from "@/types/website";

function FbCard({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn("overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

function FbCardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-[var(--club-primary)]">{children}</h3>;
}

function AuthorRow({
  clubName,
  logoUrl,
  timeLabel,
}: {
  clubName: string;
  logoUrl?: string | null;
  timeLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ClubLogo logoUrl={logoUrl} clubName={clubName} size="sm" className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--club-primary)]">{clubName}</p>
        <p className="text-xs text-muted-foreground">{timeLabel}</p>
      </div>
    </div>
  );
}

function PhotoGrid({ urls }: { urls: string[] }) {
  const photos = urls.filter(Boolean).slice(0, 3);
  if (photos.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-0.5",
        photos.length === 1 && "grid-cols-1",
        photos.length === 2 && "grid-cols-2",
        photos.length >= 3 && "grid-cols-3",
      )}
    >
      {photos.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}-${index}`}
          src={url}
          alt=""
          className={cn("w-full object-cover", photos.length === 1 ? "max-h-80" : "aspect-square")}
        />
      ))}
    </div>
  );
}

function opponentInitial(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PublicFacebookHome({
  clubName,
  logoUrl,
  heroTitle,
  heroSubtitle,
  contactPhone,
  contactEmail,
  contactAddress,
  facebookUrl,
  pinnedNews,
  feedNews,
  nextMatch,
  ownTeamName,
  heroImages,
  academyImages,
  galleryItems,
}: {
  clubName: string;
  logoUrl?: string | null;
  heroTitle: string;
  heroSubtitle: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  facebookUrl?: string | null;
  pinnedNews: PublicNewsPreviewItem | null;
  feedNews: PublicNewsPreviewItem[];
  nextMatch: PublicMatchSummary | null;
  ownTeamName: string;
  heroImages: PublicHeroMediaImage[];
  academyImages: PublicAcademyMediaImage[];
  galleryItems: PublicGalleryMediaItem[];
}) {
  const heroBySlot = new Map(heroImages.filter((i) => i.url).map((i) => [i.slotKey, i.url!]));
  const academyPhoto =
    academyImages.find((i) => i.slotKey === "kids")?.url ??
    academyImages[0]?.url ??
    heroBySlot.get("team") ??
    null;

  const teamPhotos = [
    heroBySlot.get("team"),
    galleryItems[0]?.url,
    galleryItems[1]?.url,
  ].filter(Boolean) as string[];

  const matchPhotos = [
    heroBySlot.get("match"),
    galleryItems.find((i) => i.caption?.toLowerCase().includes("mecz"))?.url ?? galleryItems[2]?.url,
    galleryItems[3]?.url,
  ].filter(Boolean) as string[];

  const pinnedText =
    pinnedNews?.excerpt ??
    pinnedNews?.title ??
    heroSubtitle ??
    heroTitle;
  const pinnedHashtag = `#${clubName.replace(/\s+/g, "")}`;
  const pinnedTime = formatRelativeTimePl(pinnedNews?.publishedAt ?? pinnedNews?.createdAt) || "3 dni temu";
  const pinnedImage = pinnedNews?.featuredImageUrl ?? academyPhoto;

  const displayMatch = isDisplayablePublicMatch(nextMatch) ? nextMatch : null;
  const opponentName =
    displayMatch &&
    (displayMatch.homeTeamName.toLowerCase().includes(ownTeamName.toLowerCase().slice(0, 5))
      ? displayMatch.awayTeamName
      : displayMatch.homeTeamName);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {/* Przypięty post */}
          <FbCard aria-label="Przypięty post">
            <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <Pin className="size-3.5 text-[var(--club-secondary)]" />
              Przypięty post
            </div>
            <AuthorRow clubName={clubName} logoUrl={logoUrl} timeLabel={pinnedTime} />
            <div className={cn("gap-4 px-4 pb-4", pinnedImage ? "grid md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_280px]" : "")}>
              <p className="text-sm leading-relaxed text-foreground">
                {pinnedText} {pinnedHashtag}
              </p>
              {pinnedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pinnedImage}
                  alt="Akademia klubu"
                  className="h-40 w-full rounded-lg object-cover md:h-full md:min-h-[140px]"
                />
              ) : null}
            </div>
          </FbCard>

          {/* Posty z klubu */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={cn(CLUB_DISPLAY_CLASS, "text-lg font-bold text-[var(--club-primary)]")}>Posty z klubu</h2>
              <Link href="/aktualnosci" className="text-xs font-semibold text-[var(--club-primary)] hover:underline">
                Zobacz wszystkie
              </Link>
            </div>

            <div className="space-y-4">
              {feedNews.length > 0 ? (
                feedNews.slice(0, 4).map((item, index) => {
                  const gridPhotos =
                    item.category === "matches"
                      ? matchPhotos.length > 0
                        ? matchPhotos
                        : item.featuredImageUrl
                          ? [item.featuredImageUrl]
                          : []
                      : item.category === "academy"
                        ? academyPhoto
                          ? [academyPhoto]
                          : item.featuredImageUrl
                            ? [item.featuredImageUrl]
                            : []
                        : item.featuredImageUrl
                          ? [item.featuredImageUrl, ...teamPhotos].slice(0, 3)
                          : teamPhotos;

                  return (
                    <FbCard key={item.id}>
                      <AuthorRow
                        clubName={clubName}
                        logoUrl={logoUrl}
                        timeLabel={formatRelativeTimePl(item.publishedAt ?? item.createdAt) || `${index + 1} dni temu`}
                      />
                      <div className="px-4 pb-3">
                        <p className="text-sm leading-relaxed text-foreground">
                          {item.excerpt ?? item.title}
                        </p>
                      </div>
                      <PhotoGrid urls={gridPhotos} />
                      <Link
                        href={`/aktualnosci/${item.slug}`}
                        className="flex items-center gap-1 px-4 py-2.5 text-xs font-semibold text-[var(--club-primary)] hover:underline"
                      >
                        Czytaj więcej <ChevronRight className="size-3.5" />
                      </Link>
                    </FbCard>
                  );
                })
              ) : (
                <FbCard>
                  <AuthorRow clubName={clubName} logoUrl={logoUrl} timeLabel="1 dzień temu" />
                  <div className="px-4 pb-3">
                    <p className="text-sm leading-relaxed text-foreground">
                      Sobotni mecz za nami! Dziękujemy kibicom za wsparcie!
                    </p>
                  </div>
                  <PhotoGrid urls={matchPhotos.length > 0 ? matchPhotos : teamPhotos} />
                </FbCard>
              )}
            </div>
          </div>
        </div>

        {/* Prawa kolumna */}
        <aside className="space-y-4 lg:sticky lg:top-[72px]">
          <FbCard className="p-4">
            <FbCardTitle>Kontakt</FbCardTitle>
            <ul className="mt-3 space-y-3 text-sm">
              {contactPhone ? (
                <li>
                  <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="flex items-start gap-3 hover:underline">
                    <Phone className="mt-0.5 size-4 shrink-0 text-[var(--club-primary)]" />
                    <span>{contactPhone}</span>
                  </a>
                </li>
              ) : null}
              {contactEmail ? (
                <li>
                  <a href={`mailto:${contactEmail}`} className="flex items-start gap-3 hover:underline">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[var(--club-primary)]" />
                    <span className="break-all">{contactEmail}</span>
                  </a>
                </li>
              ) : null}
              {contactAddress ? (
                <li className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--club-primary)]" />
                  <span>{contactAddress}</span>
                </li>
              ) : null}
              {facebookUrl ? (
                <li>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 text-[var(--club-primary)] hover:underline"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-[#1877F2] text-[10px] font-bold text-white">
                      f
                    </span>
                    <span className="break-all text-sm">facebook.com/…</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </FbCard>

          <FbCard className="p-4">
            <FbCardTitle>Najbliższy mecz</FbCardTitle>
            {displayMatch ? (
              <Link href="/mecze" className="mt-4 block text-center transition hover:opacity-90">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" className="size-14 rounded-full" />
                    <span className="max-w-[100px] text-center text-[11px] font-semibold leading-tight text-[var(--club-primary)]">
                      {ownTeamName}
                    </span>
                  </div>
                  <span className={cn(CLUB_DISPLAY_CLASS, "text-xl font-black text-[var(--club-secondary)]")}>VS</span>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted text-sm font-bold text-[var(--club-primary)]">
                      {opponentName ? opponentInitial(opponentName) : "?"}
                    </div>
                    <span className="max-w-[100px] text-center text-[11px] font-semibold leading-tight text-[var(--club-primary)]">
                      {opponentName ?? "Rywal"}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {formatPublicMatchKickoffLong(displayMatch) ?? "Termin wkrótce"}
                </p>
                {displayMatch.stadium ? (
                  <p className="mt-1 text-xs text-muted-foreground">{displayMatch.stadium}</p>
                ) : null}
              </Link>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Brak zaplanowanego meczu.</p>
            )}
          </FbCard>

          <FbCard className="p-4" id="akademia">
            <FbCardTitle>Szybkie linki</FbCardTitle>
            <ul className="mt-3 space-y-1">
              {[
                { href: "/#akademia", label: "Zapisz dziecko do akademii", icon: UserPlus },
                { href: "/aktualnosci", label: "Aktualności", icon: Newspaper },
                { href: "/galeria", label: "Galeria zdjęć", icon: Images },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-foreground transition hover:bg-[var(--club-primary)]/5"
                  >
                    <item.icon className="size-4 shrink-0 text-[var(--club-primary)]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FbCard>
        </aside>
      </div>
    </div>
  );
}

export function resolveFacebookProfileUrl(socialLinks: WebsiteSocialIntegration[]): string | null {
  const fb = socialLinks.find((item) => item.platform === "facebook" && item.isEnabled && item.profileUrl);
  return fb?.profileUrl ?? null;
}
