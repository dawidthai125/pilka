"use server";

import { revalidatePath } from "next/cache";

import { runLeagueSync } from "@/lib/league/runtime";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import {
  activateLeagueSync,
  configInputFromSnapshot,
  loadLeagueSetupSnapshot,
  saveLeagueConfiguration,
  validateLeagueConfiguration,
} from "@/lib/platform/league-setup";
import type { LeagueProviderId } from "@/lib/platform/league-providers";
import type { LeagueValidationResult } from "@/lib/platform/league-config-validation";

export type PlatformLeagueActionState = {
  error?: string;
  success?: string;
  validation?: LeagueValidationResult;
  jobId?: string;
};

function parseProviderId(value: string): LeagueProviderId {
  if (value === "manual_import") return "manual_import";
  return "mirror_live";
}

function revalidateLeaguePlatformPaths(clubId: string) {
  revalidatePath(`/platform/clubs/${clubId}`);
  revalidatePath(`/platform/clubs/${clubId}/league`);
}

export async function saveLeagueConfigurationAction(
  _prev: PlatformLeagueActionState,
  formData: FormData,
): Promise<PlatformLeagueActionState> {
  const actor = await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  const input = {
    clubId,
    providerId: parseProviderId(String(formData.get("providerId") ?? "mirror_live")),
    seasonName: String(formData.get("seasonName") ?? "").trim(),
    competitionName: String(formData.get("competitionName") ?? "").trim(),
    categoryLabel: String(formData.get("categoryLabel") ?? "").trim() || undefined,
    ownLeagueName: String(formData.get("ownLeagueName") ?? "").trim() || undefined,
    ownDisplayName: String(formData.get("ownDisplayName") ?? "").trim() || undefined,
    ninetyMinutUrl: String(formData.get("ninetyMinutUrl") ?? "").trim() || undefined,
    regionalnyFutbolUrl: String(formData.get("regionalnyFutbolUrl") ?? "").trim() || undefined,
    regiowynikiKadraUrl: String(formData.get("regiowynikiKadraUrl") ?? "").trim() || undefined,
    lnpAccessToken: String(formData.get("lnpAccessToken") ?? "").trim() || undefined,
    lnpTeamId: String(formData.get("lnpTeamId") ?? "").trim() || undefined,
    lnpSeasonId: String(formData.get("lnpSeasonId") ?? "").trim() || undefined,
    lnpLeagueId: String(formData.get("lnpLeagueId") ?? "").trim() || undefined,
    manualAdapter: (String(formData.get("manualAdapter") ?? "csv") === "json" ? "json" : "csv") as "csv" | "json",
    actor: { id: actor.id, email: actor.email ?? "" },
  };

  const validation = await validateLeagueConfiguration(clubId, input);
  if (validation.verdict === "FAIL") {
    return {
      error: validation.checks.find((c) => c.severity === "fail")?.message ?? "Walidacja nie powiodła się.",
      validation,
    };
  }

  try {
    await saveLeagueConfiguration(input);
    revalidateLeaguePlatformPaths(clubId);
    return {
      success: "Konfiguracja ligi zapisana. Możesz przejść do walidacji i aktywacji sync.",
      validation,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Nie udało się zapisać konfiguracji.",
      validation,
    };
  }
}

export async function validateLeagueConfigurationAction(
  clubId: string,
): Promise<PlatformLeagueActionState> {
  await requirePlatformAdmin();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  const snapshot = await loadLeagueSetupSnapshot(clubId);
  if (!snapshot) return { error: "Klub nie istnieje." };

  const partial = configInputFromSnapshot(snapshot);
  const validation = await validateLeagueConfiguration(clubId, {
    providerId: partial.providerId ?? "mirror_live",
    seasonName: partial.seasonName ?? snapshot.seasonName ?? "",
    competitionName: partial.competitionName ?? snapshot.competitionName ?? "",
    ownLeagueName: partial.ownLeagueName,
    ownDisplayName: partial.ownDisplayName,
    ninetyMinutUrl: partial.ninetyMinutUrl,
    regionalnyFutbolUrl: partial.regionalnyFutbolUrl,
    regiowynikiKadraUrl: partial.regiowynikiKadraUrl,
    lnpTeamId: partial.lnpTeamId,
    lnpSeasonId: partial.lnpSeasonId,
    lnpLeagueId: partial.lnpLeagueId,
    manualAdapter: partial.manualAdapter,
  });

  return { validation };
}

export async function activateLeagueSyncAction(
  _prev: PlatformLeagueActionState,
  formData: FormData,
): Promise<PlatformLeagueActionState> {
  const actor = await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  try {
    const result = await activateLeagueSync({
      clubId,
      actor: { id: actor.id, email: actor.email ?? "" },
    });
    revalidateLeaguePlatformPaths(clubId);
    return {
      success: result.liveSyncMessage ?? "Synchronizacja ligi aktywowana.",
      validation: result.validation,
      jobId: result.jobId,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Aktywacja sync nie powiodła się." };
  }
}

export async function triggerLeagueLiveSyncAction(
  _prev: PlatformLeagueActionState,
  formData: FormData,
): Promise<PlatformLeagueActionState> {
  await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  const snapshot = await loadLeagueSetupSnapshot(clubId);
  if (!snapshot?.sourceActive) {
    return { error: "Źródło nie jest aktywne — najpierw aktywuj sync." };
  }
  if (snapshot.providerId !== "mirror_live") {
    return { error: "Live sync dostępny tylko dla źródła Mirror live." };
  }

  try {
    const result = await runLeagueSync({
      clubId,
      triggerSource: "platform_admin",
    });

    if (!result.ok) {
      const clubError = result.results.find((r) => !r.ok)?.error;
      return {
        error: clubError ?? "Live sync zakończył się błędem.",
      };
    }

    const clubResult = result.results.find((r) => r.clubId === clubId) ?? result.results[0];
    revalidateLeaguePlatformPaths(clubId);
    return {
      success: `Live sync zakończony (${clubResult?.recordsProcessed ?? 0} rekordów). Odśwież status poniżej.`,
      jobId: clubResult?.jobId ?? undefined,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Live sync zakończył się błędem.",
    };
  }
}

export async function getLeagueSetupSnapshotAction(clubId: string) {
  await requirePlatformAdmin();
  return loadLeagueSetupSnapshot(clubId);
}
