import type { LeagueConfigInput, LeagueDbSnapshot } from "@/lib/platform/league-config-validation";
import type { LeagueProviderId } from "@/lib/platform/league-providers";

export type LeagueSetupSnapshot = LeagueDbSnapshot & {
  clubId: string;
  clubSlug: string;
  clubName: string;
  providerId: LeagueProviderId | null;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
  latestJob: {
    id: string;
    status: string;
    recordsProcessed: number;
    recordsFailed: number;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
  } | null;
  syncConfigured: boolean;
};

export function configInputFromSnapshot(snapshot: LeagueSetupSnapshot): Partial<LeagueConfigInput> {
  const raw = snapshot.config;
  const lnp = raw.lnp && typeof raw.lnp === "object" ? (raw.lnp as Record<string, unknown>) : {};

  return {
    providerId: snapshot.providerId ?? "mirror_live",
    seasonName: snapshot.seasonName ?? "",
    competitionName: snapshot.competitionName ?? "",
    ownLeagueName: String(raw.ownLeagueName ?? ""),
    ownDisplayName: String(raw.ownDisplayName ?? ""),
    ninetyMinutUrl: String(raw.ninetyMinutUrl ?? raw.ninety_minut_url ?? ""),
    regionalnyFutbolUrl: String(raw.regionalnyFutbolUrl ?? raw.regionalny_futbol_url ?? ""),
    regiowynikiKadraUrl: String(raw.regiowynikiKadraUrl ?? raw.regiowyniki_kadra_url ?? ""),
    lnpTeamId: String(lnp.teamId ?? ""),
    lnpSeasonId: String(lnp.seasonId ?? ""),
    lnpLeagueId: String(lnp.leagueId ?? ""),
    manualAdapter: raw.manualAdapter === "json" ? "json" : "csv",
  };
}
