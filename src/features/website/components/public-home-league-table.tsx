import Link from "next/link";
import { Trophy } from "lucide-react";

import { HomeDarkPanel, HomeDarkPanelHeader } from "@/features/website/components/public-home-dark-ui";
import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { buildPublicClubPaths } from "@/lib/website/public-paths";
import { cn } from "@/lib/utils";
import type { LeagueTableEntry } from "@/types/matches";

export function PublicHomeLeagueTable({
  clubSlug,
  entries,
  ownPosition,
  pageMode = false,
}: {
  clubSlug: string;
  entries: LeagueTableEntry[];
  ownPosition: number | null;
  /** Pełna strona /tabela — bez linku „Pełna tabela”. */
  pageMode?: boolean;
}) {
  if (entries.length === 0) return null;

  const paths = buildPublicClubPaths(clubSlug);

  return (
    <HomeDarkPanel>
      {!pageMode ? (
        <HomeDarkPanelHeader title="Tabela ligi" icon={Trophy} href={paths.tabela} linkLabel="Pełna tabela →" />
      ) : null}
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[2rem_1fr_repeat(6,minmax(2rem,auto))] gap-x-1 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/45 sm:px-4">
            <span>#</span>
            <span>Drużyna</span>
            <span className="text-center">M</span>
            <span className="text-center">W</span>
            <span className="text-center">R</span>
            <span className="text-center">P</span>
            <span className="text-center">Pkt</span>
            <span className="text-center">Bramki</span>
          </div>
          <div className="divide-y divide-white/8">
            {entries.map((row, index) => {
              const position = index + 1;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_repeat(6,minmax(2rem,auto))] items-center gap-x-1 px-3 py-2.5 text-sm sm:px-4",
                    row.isOwnClub && "bg-[var(--club-secondary)]/12 font-bold",
                  )}
                >
                  <span
                    className={cn(
                      "tabular-nums",
                      row.isOwnClub ? "text-[var(--club-secondary)]" : "text-white/60",
                    )}
                  >
                    {position}
                  </span>
                  <span className="truncate text-white">{row.teamName}</span>
                  <span className="text-center tabular-nums text-white/75">{row.played}</span>
                  <span className="text-center tabular-nums text-white/60">{row.won}</span>
                  <span className="text-center tabular-nums text-white/60">{row.drawn}</span>
                  <span className="text-center tabular-nums text-white/60">{row.lost}</span>
                  <span className={cn(CLUB_DISPLAY_CLASS, "text-center tabular-nums text-[var(--club-secondary)]")}>
                    {row.points}
                  </span>
                  <span className="text-center tabular-nums text-white/50">
                    {row.goalsFor}:{row.goalsAgainst}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {ownPosition && !pageMode ? (
        <p className="border-t border-white/10 px-4 py-2.5 text-center text-[11px] text-white/45">
          Nasza drużyna: <span className="font-semibold text-[var(--club-secondary)]">{ownPosition}. miejsce</span>
          {" · "}
          <Link href={paths.tabela} className="hover:text-white">
            szczegóły ligowe
          </Link>
        </p>
      ) : null}
    </HomeDarkPanel>
  );
}
