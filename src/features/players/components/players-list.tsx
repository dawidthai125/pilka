"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlayerStatusBadge } from "@/features/players/components/player-status-badge";
import {
  DOMINANT_FOOT_LABELS,
  PLAYER_POSITION_LABELS,
} from "@/lib/players/constants";
import { playerFullName } from "@/lib/players/mappers";
import type { Player, PlayerStatus } from "@/types/players";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function PlayersList({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlayerStatus | "all">("all");

  const filtered = useMemo(() => {
    return players.filter((player) => {
      const matchesQuery =
        query.trim() === "" ||
        playerFullName(player).toLowerCase().includes(query.toLowerCase()) ||
        String(player.jerseyNumber ?? "").includes(query);

      const matchesStatus = statusFilter === "all" || player.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [players, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Szukaj po imieniu, nazwisku lub numerze..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="sm:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as PlayerStatus | "all")
          }
          className="border-input bg-background h-11 rounded-md border px-3 text-sm shadow-xs sm:h-9"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="active">Aktywny</option>
          <option value="injured">Kontuzjowany</option>
          <option value="suspended">Zawieszony</option>
          <option value="inactive">Nieaktywny</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="hidden border-b bg-muted/40 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_6rem] md:gap-4">
          <span>#</span>
          <span>Zawodnik</span>
          <span>Pozycja</span>
          <span>Drużyna</span>
          <span>Status</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Brak zawodników spełniających kryteria.
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((player) => (
              <li key={player.id}>
                <Link
                  href={`/players/${player.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-muted/30 md:grid md:grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_6rem] md:items-center md:gap-4"
                >
                  <div className="flex items-start gap-3 md:contents">
                    <Avatar className="size-10 shrink-0 md:row-span-1">
                      <AvatarFallback>{initials(player.firstName, player.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 md:col-start-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{playerFullName(player)}</p>
                        <Badge variant="outline" className="md:hidden">
                          #{player.jerseyNumber ?? "—"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground md:hidden">
                        {player.teamName ?? "—"} ·{" "}
                        {player.primaryPosition
                          ? PLAYER_POSITION_LABELS[player.primaryPosition]
                          : "—"}
                      </p>
                      <div className="mt-2 md:hidden">
                        <PlayerStatusBadge status={player.status} />
                      </div>
                    </div>
                  </div>

                  <span className="hidden font-mono text-sm md:block">
                    {player.jerseyNumber ?? "—"}
                  </span>
                  <span className="hidden truncate font-medium md:block">
                    {playerFullName(player)}
                  </span>
                  <span className="hidden text-sm text-muted-foreground md:block">
                    {player.primaryPosition
                      ? PLAYER_POSITION_LABELS[player.primaryPosition]
                      : "—"}
                    {player.dominantFoot
                      ? ` · ${DOMINANT_FOOT_LABELS[player.dominantFoot]}`
                      : ""}
                  </span>
                  <span className="hidden text-sm md:block">{player.teamName ?? "—"}</span>
                  <span className="hidden md:block">
                    <PlayerStatusBadge status={player.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
