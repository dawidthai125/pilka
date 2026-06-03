import {
  buildRegiowynikiKadraUrl,
  getLeagueProvider,
  type LeagueProviderId,
} from "@/lib/platform/league-providers";

export type ValidationSeverity = "pass" | "warning" | "fail";

export type ValidationCheck = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
};

export type LeagueValidationResult = {
  verdict: "PASS" | "WARNING" | "FAIL";
  checks: ValidationCheck[];
};

export type LeagueConfigInput = {
  providerId: LeagueProviderId;
  seasonName: string;
  competitionName: string;
  categoryLabel?: string;
  ownLeagueName?: string;
  ownDisplayName?: string;
  ninetyMinutUrl?: string;
  regionalnyFutbolUrl?: string;
  regiowynikiKadraUrl?: string;
  lnpAccessToken?: string;
  lnpTeamId?: string;
  lnpSeasonId?: string;
  lnpLeagueId?: string;
  manualAdapter?: "csv" | "json";
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function addCheck(
  checks: ValidationCheck[],
  code: string,
  severity: ValidationSeverity,
  message: string,
  field?: string,
) {
  checks.push({ code, severity, message, field });
}

function computeVerdict(checks: ValidationCheck[]): LeagueValidationResult["verdict"] {
  if (checks.some((c) => c.severity === "fail")) return "FAIL";
  if (checks.some((c) => c.severity === "warning")) return "WARNING";
  return "PASS";
}

export function validateLeagueConfigurationInput(input: LeagueConfigInput): LeagueValidationResult {
  const checks: ValidationCheck[] = [];

  if (!input.seasonName?.trim()) {
    addCheck(checks, "season_required", "fail", "Podaj nazwę sezonu ligowego.", "seasonName");
  } else {
    addCheck(checks, "season_present", "pass", `Sezon: ${input.seasonName.trim()}`);
  }

  if (!input.competitionName?.trim()) {
    addCheck(checks, "competition_required", "fail", "Podaj nazwę rozgrywek / ligi.", "competitionName");
  } else {
    addCheck(checks, "competition_present", "pass", `Rozgrywki: ${input.competitionName.trim()}`);
  }

  let provider;
  try {
    provider = getLeagueProvider(input.providerId);
    addCheck(checks, "provider_valid", "pass", `Źródło: ${provider.label}`);
  } catch {
    addCheck(checks, "provider_invalid", "fail", "Nieprawidłowy typ źródła danych.", "providerId");
    return { verdict: "FAIL", checks };
  }

  if (input.providerId === "mirror_live") {
    if (!input.ownLeagueName?.trim()) {
      addCheck(
        checks,
        "own_league_name_required",
        "fail",
        "Podaj nazwę drużyny w lidze (mapowanie wyników).",
        "ownLeagueName",
      );
    } else {
      addCheck(checks, "own_league_name", "pass", `Drużyna ligowa: ${input.ownLeagueName.trim()}`);
    }

    if (!input.ownDisplayName?.trim()) {
      addCheck(
        checks,
        "own_display_name_required",
        "fail",
        "Podaj nazwę wyświetlaną w FC OS.",
        "ownDisplayName",
      );
    }

    if (!input.ninetyMinutUrl?.trim()) {
      addCheck(
        checks,
        "ninety_minut_required",
        "fail",
        "Podaj URL strony ligi na 90minut.pl.",
        "ninetyMinutUrl",
      );
    } else if (!isValidUrl(input.ninetyMinutUrl.trim())) {
      addCheck(checks, "ninety_minut_invalid", "fail", "URL 90minut.pl jest nieprawidłowy.", "ninetyMinutUrl");
    } else {
      addCheck(checks, "ninety_minut_ok", "pass", "URL 90minut.pl wygląda poprawnie.");
    }

    if (!input.regionalnyFutbolUrl?.trim()) {
      addCheck(
        checks,
        "regionalny_required",
        "fail",
        "Podaj URL strony ligi na regionalnyfutbol.pl.",
        "regionalnyFutbolUrl",
      );
    } else if (!isValidUrl(input.regionalnyFutbolUrl.trim())) {
      addCheck(
        checks,
        "regionalny_invalid",
        "fail",
        "URL regionalnyfutbol.pl jest nieprawidłowy.",
        "regionalnyFutbolUrl",
      );
    } else {
      addCheck(checks, "regionalny_ok", "pass", "URL regionalnyfutbol.pl wygląda poprawnie.");
    }

    const kadra =
      input.regiowynikiKadraUrl?.trim() ||
      (input.ownLeagueName ? buildRegiowynikiKadraUrl(input.ownLeagueName) : null);
    if (!kadra) {
      addCheck(
        checks,
        "regiowyniki_warning",
        "warning",
        "Brak URL kadry regiowyniki.pl — zostanie wygenerowany po zapisie nazwy drużyny.",
        "regiowynikiKadraUrl",
      );
    } else if (input.regiowynikiKadraUrl && !isValidUrl(input.regiowynikiKadraUrl.trim())) {
      addCheck(
        checks,
        "regiowyniki_invalid",
        "fail",
        "URL regiowyniki.pl jest nieprawidłowy.",
        "regiowynikiKadraUrl",
      );
    } else {
      addCheck(checks, "regiowyniki_ok", "pass", "Kadra regiowyniki.pl skonfigurowana.");
    }

    const hasToken = Boolean(input.lnpAccessToken?.trim());
    const hasTeam = Boolean(input.lnpTeamId?.trim());
    if (hasToken && !hasTeam) {
      addCheck(
        checks,
        "lnp_team_missing",
        "fail",
        "Token mPZPN podany bez UUID drużyny — uzupełnij LNP Team ID.",
        "lnpTeamId",
      );
    } else if (hasTeam && !hasToken) {
      addCheck(
        checks,
        "lnp_token_missing",
        "fail",
        "UUID drużyny mPZPN podany bez tokenu — uzupełnij Bearer token.",
        "lnpAccessToken",
      );
    } else if (hasToken && hasTeam) {
      if (!UUID_RE.test(input.lnpTeamId!.trim())) {
        addCheck(checks, "lnp_team_invalid", "fail", "UUID drużyny mPZPN ma nieprawidłowy format.", "lnpTeamId");
      } else {
        addCheck(checks, "lnp_credentials", "pass", "Poświadczenia mPZPN skonfigurowane.");
      }
      if (input.lnpSeasonId && !UUID_RE.test(input.lnpSeasonId.trim())) {
        addCheck(checks, "lnp_season_invalid", "fail", "UUID sezonu mPZPN ma nieprawidłowy format.", "lnpSeasonId");
      }
      if (input.lnpLeagueId && !UUID_RE.test(input.lnpLeagueId.trim())) {
        addCheck(checks, "lnp_league_invalid", "fail", "UUID ligi mPZPN ma nieprawidłowy format.", "lnpLeagueId");
      }
    } else {
      addCheck(
        checks,
        "lnp_optional",
        "warning",
        "Brak poświadczeń mPZPN — statystyki zawodników (M/G/ŻK) mogą być niedostępne.",
      );
    }
  }

  if (input.providerId === "manual_import") {
    const adapter = input.manualAdapter ?? "csv";
    if (adapter !== "csv" && adapter !== "json") {
      addCheck(checks, "manual_adapter_invalid", "fail", "Format importu musi być CSV lub JSON.", "manualAdapter");
    } else {
      addCheck(checks, "manual_adapter", "pass", `Import ręczny (${adapter.toUpperCase()}) — pliki w panelu klubu.`);
      addCheck(
        checks,
        "manual_sync_note",
        "warning",
        "Pierwszy sync wymaga uploadu pliku w panelu klubu (Liga → Import).",
      );
    }
  }

  return { verdict: computeVerdict(checks), checks };
}

export type LeagueDbSnapshot = {
  clubExists: boolean;
  seasonId: string | null;
  seasonName: string | null;
  seasonActive: boolean;
  competitionId: string | null;
  competitionName: string | null;
  sourceId: string | null;
  sourceActive: boolean;
  sourceName: string | null;
  hasOwnTeam: boolean;
  teamId: string | null;
};

export function validateLeagueDbSnapshot(
  snapshot: LeagueDbSnapshot,
  options?: { allowInactiveSource?: boolean },
): LeagueValidationResult {
  const checks: ValidationCheck[] = [];

  if (!snapshot.clubExists) {
    addCheck(checks, "club_missing", "fail", "Klub nie istnieje.");
    return { verdict: "FAIL", checks };
  }
  addCheck(checks, "club_exists", "pass", "Klub istnieje w bazie.");

  if (!snapshot.seasonId) {
    addCheck(checks, "season_db_missing", "fail", "Brak sezonu ligowego — zapisz konfigurację.");
  } else {
    addCheck(checks, "season_db", "pass", `Sezon w bazie: ${snapshot.seasonName ?? snapshot.seasonId}`);
  }

  if (!snapshot.competitionId) {
    addCheck(checks, "competition_db_missing", "fail", "Brak rozgrywek — zapisz konfigurację.");
  } else {
    addCheck(
      checks,
      "competition_db",
      "pass",
      `Rozgrywki w bazie: ${snapshot.competitionName ?? snapshot.competitionId}`,
    );
  }

  if (!snapshot.sourceId) {
    addCheck(checks, "source_db_missing", "fail", "Brak źródła danych — zapisz konfigurację.");
  } else if (!snapshot.sourceActive) {
    if (options?.allowInactiveSource) {
      addCheck(checks, "source_inactive", "pass", "Źródło gotowe do aktywacji.");
    } else {
      addCheck(checks, "source_inactive", "warning", "Źródło zapisane, ale nieaktywne — aktywuj sync.");
    }
  } else {
    addCheck(checks, "source_active", "pass", `Źródło aktywne: ${snapshot.sourceName ?? "Mirror live"}`);
  }

  if (!snapshot.hasOwnTeam) {
    addCheck(
      checks,
      "own_team_missing",
      "fail",
      "Brak mapowania drużyny własnej (league_teams.is_own_club) — zapisz konfigurację.",
    );
  } else {
    addCheck(checks, "own_team", "pass", "Mapowanie drużyny własnej skonfigurowane.");
  }

  return { verdict: computeVerdict(checks), checks };
}

export function mergeValidationResults(...results: LeagueValidationResult[]): LeagueValidationResult {
  const checks = results.flatMap((r) => r.checks);
  return { verdict: computeVerdict(checks), checks };
}
