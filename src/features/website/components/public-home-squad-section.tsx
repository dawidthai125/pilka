import Link from "next/link";
import { Shirt, Target } from "lucide-react";

import {
  HomeDarkPanel,
  HomeDarkPanelHeader,
  HomeDarkSection,
} from "@/features/website/components/public-home-dark-ui";
import { PLAYER_POSITION_LABELS } from "@/lib/players/constants";
import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { buildPublicClubPaths } from "@/lib/website/public-paths";
import { cn } from "@/lib/utils";
import type { PlayerPosition } from "@/types/players";
import type { PublicPlayer } from "@/types/website";

function formatPosition(position: string | null | undefined) {
  if (!position) return "—";
  return PLAYER_POSITION_LABELS[position as PlayerPosition] ?? position;
}

function SquadPlayerRow({ player, rank }: { player: PublicPlayer; rank: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-black tabular-nums text-white/50">
        {player.jerseyNumber ?? rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">
          {player.lastName} {player.firstName}
        </p>
        <p className="text-[11px] text-white/45">{formatPosition(player.position)}</p>
      </div>
      <div className="flex shrink-0 gap-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/45">
        <div className="min-w-[2rem]">
          <p className="text-[10px]">M</p>
          <p className={cn(CLUB_DISPLAY_CLASS, "text-base tabular-nums text-white")}>{player.matchesPlayed}</p>
        </div>
        <div className="min-w-[2rem]">
          <p className="text-[10px]">G</p>
          <p
            className={cn(
              CLUB_DISPLAY_CLASS,
              "text-base tabular-nums",
              player.goals > 0 ? "text-[var(--club-secondary)]" : "text-white/60",
            )}
          >
            {player.goals}
          </p>
        </div>
        <div className="min-w-[2rem]">
          <p className="text-[10px]">A</p>
          <p className={cn(CLUB_DISPLAY_CLASS, "text-base tabular-nums text-white/75")}>{player.assists}</p>
        </div>
      </div>
    </div>
  );
}

export function PublicHomeSquadSection({
  clubSlug,
  players,
  topScorers,
}: {
  clubSlug: string;
  players: PublicPlayer[];
  topScorers: PublicPlayer[];
}) {
  if (players.length === 0) return null;

  const paths = buildPublicClubPaths(clubSlug);
  const preview = [...players].sort((a, b) => {
    const numA = a.jerseyNumber ?? 999;
    const numB = b.jerseyNumber ?? 999;
    if (numA !== numB) return numA - numB;
    return a.lastName.localeCompare(b.lastName, "pl");
  });

  return (
    <HomeDarkSection
      eyebrow="Skład"
      title="Kadra drużyny"
      subtitle="Zawodnicy seniorscy — numery, pozycje i statystyki sezonu."
      href={paths.druzyna}
      linkLabel="Pełna kadra"
      className="border-t border-white/5 py-10 sm:py-12"
    >
      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <HomeDarkPanel>
            <HomeDarkPanelHeader title="Lista zawodników" icon={Shirt} href={paths.druzyna} linkLabel="Wszyscy →" />
            <div className="max-h-[420px] divide-y divide-white/8 overflow-y-auto">
              {preview.map((player, index) => (
                <SquadPlayerRow key={player.id} player={player} rank={index + 1} />
              ))}
            </div>
          </HomeDarkPanel>
        </div>

        {topScorers.length > 0 ? (
          <div className="lg:col-span-2">
            <HomeDarkPanel>
              <HomeDarkPanelHeader title="Strzelcy" icon={Target} href={paths.druzyna} linkLabel="Statystyki →" />
              <div className="divide-y divide-white/8">
                {topScorers.map((player, index) => (
                  <Link
                    key={player.id}
                    href={paths.druzyna}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5 sm:px-5"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black",
                        index === 0
                          ? "bg-[var(--club-secondary)] text-[var(--club-primary)]"
                          : "bg-white/10 text-white/70",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {player.lastName} {player.firstName}
                    </span>
                    <span className={cn(CLUB_DISPLAY_CLASS, "text-xl font-black tabular-nums text-[var(--club-secondary)]")}>
                      {player.goals}
                    </span>
                  </Link>
                ))}
              </div>
            </HomeDarkPanel>
          </div>
        ) : null}
      </div>
    </HomeDarkSection>
  );
}
