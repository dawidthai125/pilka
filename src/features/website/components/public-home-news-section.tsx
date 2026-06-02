import Link from "next/link";
import { Newspaper, Zap } from "lucide-react";

import { HomeDarkPanel, HomeDarkSection } from "@/features/website/components/public-home-dark-ui";
import { CLUB_DISPLAY_CLASS, WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import { cn } from "@/lib/utils";
import type { PublicNewsPreviewItem } from "@/types/website";

function formatNewsDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

export function PublicHomeNewsSection({ news }: { news: PublicNewsPreviewItem[] }) {
  const cards = news.slice(0, 4);
  if (cards.length === 0) return null;

  const [featured, ...rest] = cards;

  return (
    <HomeDarkSection
      eyebrow="Klub na żywo"
      title="Aktualności"
      subtitle="Mecze, akademia, wydarzenia — to, co dzieje się w Piorunie."
      href="/aktualnosci"
      linkLabel="Wszystkie wpisy"
      className="border-t border-white/5 py-10 sm:py-12"
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {featured ? (
          <Link
            href={`/aktualnosci/${featured.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--club-primary)] via-[#0a4a38] to-[#062820] lg:row-span-2"
          >
            <div className="absolute -left-10 top-10 size-40 rounded-full bg-[var(--club-secondary)]/10 blur-3xl" aria-hidden />
            <div className="relative flex h-full flex-col">
              {featured.featuredImageUrl ? (
                <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[220px] lg:flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.featuredImageUrl}
                    alt=""
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#062820] via-[#062820]/40 to-transparent" />
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-white/5 lg:aspect-auto lg:min-h-[180px] lg:flex-1">
                  <Newspaper className="size-12 text-white/20" />
                </div>
              )}
              <div className="relative space-y-3 p-5 sm:p-6">
                <span className="inline-flex rounded-full bg-[var(--club-secondary)] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[var(--club-primary)]">
                  {WEBSITE_NEWS_CATEGORY_LABELS[featured.category]}
                </span>
                <p className="text-xs text-white/50">{formatNewsDate(featured.publishedAt ?? featured.createdAt)}</p>
                <h3 className={cn(CLUB_DISPLAY_CLASS, "text-xl font-bold leading-snug text-white sm:text-2xl")}>
                  {featured.title}
                </h3>
                {featured.excerpt ? (
                  <p className="line-clamp-3 text-sm leading-relaxed text-white/70">{featured.excerpt}</p>
                ) : null}
                <span className="inline-block text-sm font-semibold text-[var(--club-secondary)] group-hover:underline">
                  Czytaj więcej →
                </span>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="space-y-3">
          {rest.map((item) => (
            <Link
              key={item.id}
              href={`/aktualnosci/${item.slug}`}
              className="group flex gap-4 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-black/30 sm:p-4"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-white/5 sm:size-24">
                {item.featuredImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.featuredImageUrl} alt="" className="size-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Zap className="size-6 text-white/25" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--club-secondary)]">
                  {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
                </span>
                <p className="mt-1 text-[11px] text-white/45">{formatNewsDate(item.publishedAt ?? item.createdAt)}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-[var(--club-secondary)]">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {cards.length >= 4 ? (
        <HomeDarkPanel className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-sm text-white/65">Chcesz więcej relacji z boiska i akademii?</p>
            <Link
              href="/aktualnosci"
              className="text-sm font-semibold text-[var(--club-secondary)] hover:underline"
            >
              Przejdź do aktualności →
            </Link>
          </div>
        </HomeDarkPanel>
      ) : null}
    </HomeDarkSection>
  );
}
