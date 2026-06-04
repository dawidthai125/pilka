import { connectServerDb } from "@/lib/db/server-client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPlatformAuditEntry,
  logPlatformAudit,
} from "@/lib/platform/audit";
import { platformSetClubStatus } from "@/lib/platform/club-db-writes";
import { loadLeagueSetupSnapshot, validateLeagueConfiguration } from "@/lib/platform/league-setup";
import { validateClubSlug } from "@/lib/platform/slug";

export type GateVerdict = "pass" | "warning" | "fail";

export type ActivationGate = {
  code: string;
  label: string;
  verdict: GateVerdict;
  message: string;
};

export type ClubActivationGateResult = {
  clubId: string;
  clubSlug: string;
  clubStatus: string;
  canActivate: boolean;
  alreadyActive: boolean;
  overall: GateVerdict;
  gates: ActivationGate[];
  warnings: ActivationGate[];
};

function gate(
  code: string,
  label: string,
  verdict: GateVerdict,
  message: string,
): ActivationGate {
  return { code, label, verdict, message };
}

function isLeagueSourceConfigured(
  config: Record<string, unknown>,
  sourceName: string | null,
): boolean {
  if (config.configuredVia === "platform_league_wizard") return true;
  if (config.bootstrapped === true) return false;
  if (sourceName && !sourceName.toLowerCase().includes("pending sync setup")) return true;
  return false;
}

function computeOverall(gates: ActivationGate[], warnings: ActivationGate[]): GateVerdict {
  if (gates.some((g) => g.verdict === "fail")) return "fail";
  if (warnings.length > 0) return "warning";
  if (gates.every((g) => g.verdict === "pass")) return "pass";
  return "warning";
}

export async function evaluateClubActivationGates(clubId: string): Promise<ClubActivationGateResult | null> {
  const admin = createAdminClient();

  const { data: club } = await admin
    .from("clubs")
    .select("id, slug, status")
    .eq("id", clubId)
    .maybeSingle();

  if (!club) return null;

  const slug = String(club.slug);
  const clubStatus = String(club.status);
  const alreadyActive = clubStatus === "active";

  const [ownerRes, settingsRes, sourceRes, slugDupRes, snapshot] = await Promise.all([
    admin
      .from("club_memberships")
      .select("status")
      .eq("club_id", clubId)
      .eq("role", "owner")
      .maybeSingle(),
    admin.from("website_settings").select("logo_path").eq("club_id", clubId).maybeSingle(),
    admin
      .from("league_sources")
      .select("id, name, is_active, config, last_sync_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("clubs").select("id").eq("slug", slug).neq("id", clubId).limit(1),
    loadLeagueSetupSnapshot(clubId),
  ]);

  const gates: ActivationGate[] = [];
  const warnings: ActivationGate[] = [];

  const ownerStatus = ownerRes.data?.status ?? null;
  if (ownerStatus === "active") {
    gates.push(gate("G1", "Właściciel", "pass", "Membership właściciela jest aktywny."));
  } else if (ownerStatus === "invited") {
    gates.push(
      gate("G1", "Właściciel", "fail", "Właściciel ma status „invited” — musi zaakceptować zaproszenie."),
    );
  } else {
    gates.push(gate("G1", "Właściciel", "fail", "Brak aktywnego właściciela klubu."));
  }

  if (settingsRes.data) {
    gates.push(gate("G2", "Strona WWW", "pass", "Ustawienia strony publicznej istnieją."));
  } else {
    gates.push(gate("G2", "Strona WWW", "fail", "Brak rekordu website_settings."));
  }

  const sourceConfig =
    sourceRes.data?.config && typeof sourceRes.data.config === "object"
      ? (sourceRes.data.config as Record<string, unknown>)
      : {};

  if (sourceRes.data && isLeagueSourceConfigured(sourceConfig, sourceRes.data.name != null ? String(sourceRes.data.name) : null)) {
    gates.push(gate("G3", "Konfiguracja ligi", "pass", "Źródło ligi skonfigurowane przez wizard."));
  } else {
    gates.push(
      gate(
        "G3",
        "Konfiguracja ligi",
        "fail",
        "Liga nie skonfigurowana — użyj League Setup w Platform Admin.",
      ),
    );
  }

  const leagueValidation = await validateLeagueConfiguration(clubId, undefined, {
    allowInactiveSource: true,
  });
  if (leagueValidation.verdict === "FAIL") {
    const reason =
      leagueValidation.checks.find((c) => c.severity === "fail")?.message ??
      "Walidacja ligi nie powiodła się.";
    gates.push(gate("G4", "Walidacja ligi", "fail", reason));
  } else if (leagueValidation.verdict === "WARNING") {
    gates.push(
      gate("G4", "Walidacja ligi", "pass", "Walidacja OK (z ostrzeżeniami — aktywacja dozwolona)."),
    );
  } else {
    gates.push(gate("G4", "Walidacja ligi", "pass", "Walidacja ligi przeszła pomyślnie."));
  }

  const slugError = validateClubSlug(slug);
  const slugConflict = (slugDupRes.data?.length ?? 0) > 0;
  if (slugError) {
    gates.push(gate("G5", "Slug", "fail", slugError));
  } else if (slugConflict) {
    gates.push(gate("G5", "Slug", "fail", "Slug jest zajęty przez inny klub."));
  } else {
    gates.push(gate("G5", "Slug", "pass", `Slug /${slug} jest unikalny i poprawny.`));
  }

  if (!settingsRes.data?.logo_path) {
    warnings.push(
      gate("W1", "Logo", "warning", "Brak logo klubu — strona może wyglądać niekompletnie."),
    );
  }

  const hasSuccessfulSync =
    Boolean(sourceRes.data?.last_sync_at) ||
    snapshot?.latestJob?.status === "completed" ||
    (snapshot?.latestJob?.recordsProcessed ?? 0) > 0;

  if (!hasSuccessfulSync) {
    warnings.push(
      gate(
        "W2",
        "Synchronizacja",
        "warning",
        "Brak udanego sync ligi — rozważ „Uruchom live sync” przed publikacją.",
      ),
    );
  }

  const hardGatesPass = gates.every((g) => g.verdict !== "fail");
  const canActivate = hardGatesPass && !alreadyActive && clubStatus === "onboarding";

  return {
    clubId,
    clubSlug: slug,
    clubStatus,
    canActivate,
    alreadyActive,
    overall: alreadyActive ? "pass" : computeOverall(gates, warnings),
    gates,
    warnings,
  };
}

export type ActivateClubInput = {
  clubId: string;
  actor: { id: string; email: string };
};

export type ActivateClubResult = {
  clubId: string;
  slug: string;
  publicName: string;
  noop: boolean;
};

export async function activateClub(input: ActivateClubInput): Promise<ActivateClubResult> {
  const gateResult = await evaluateClubActivationGates(input.clubId);
  if (!gateResult) throw new Error("Klub nie istnieje.");

  if (gateResult.alreadyActive) {
    const admin = createAdminClient();
    const { data: club } = await admin
      .from("clubs")
      .select("slug, public_name")
      .eq("id", input.clubId)
      .maybeSingle();
    return {
      clubId: input.clubId,
      slug: String(club?.slug ?? gateResult.clubSlug),
      publicName: String(club?.public_name ?? ""),
      noop: true,
    };
  }

  if (!gateResult.canActivate) {
    const failed = gateResult.gates.filter((g) => g.verdict === "fail");
    throw new Error(failed[0]?.message ?? "Klub nie spełnia warunków aktywacji.");
  }

  const auditEntry = buildPlatformAuditEntry("club_activated", input.actor, {
    clubId: input.clubId,
    slug: gateResult.clubSlug,
  });

  const client = await connectServerDb();

  try {
    await client.query("BEGIN");

    const { rows: clubRows } = await client.query(
      `SELECT id, slug, public_name, status, settings FROM public.clubs WHERE id = $1 FOR UPDATE`,
      [input.clubId],
    );
    if (!clubRows.length) throw new Error("Klub nie istnieje.");

    const club = clubRows[0] as {
      id: string;
      slug: string;
      public_name: string;
      status: string;
      settings: Record<string, unknown> | null;
    };

    if (club.status === "active") {
      await client.query("ROLLBACK");
      return {
        clubId: input.clubId,
        slug: club.slug,
        publicName: club.public_name,
        noop: true,
      };
    }

    if (club.status !== "onboarding") {
      throw new Error(`Nie można aktywować klubu ze statusem „${club.status}".`);
    }

    const activated = await platformSetClubStatus(client, input.clubId, "active", auditEntry);

    await client.query("COMMIT");
    logPlatformAudit(auditEntry);

    return {
      clubId: input.clubId,
      slug: activated.slug,
      publicName: activated.publicName,
      noop: activated.noop,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}
