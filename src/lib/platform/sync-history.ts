import { createAdminClient } from "@/lib/supabase/admin";
import {
  classifySyncJob,
  formatDurationMs,
  syncDurationMs,
  type SyncCategory,
} from "@/lib/platform/sync-category";

export const SYNC_HISTORY_LIMIT = 100;

export type SyncHistoryRow = {
  jobId: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  leagueName: string;
  startedAt: string;
  provider: string;
  providerLabel: string;
  triggerSource: string;
  triggerLabel: string;
  status: string;
  category: SyncCategory;
  durationMs: number | null;
  durationLabel: string;
  lastErrorShort: string | null;
  lastErrorFull: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  mirror_live: "Mirror live",
  manual_import: "Import ręczny",
  unknown: "Nieznany",
};

const TRIGGER_LABELS: Record<string, string> = {
  cron: "Cron",
  platform_admin: "Platform Admin",
  club_user: "Użytkownik klubu",
  import: "Import",
  cli: "CLI",
  unknown: "Nieznany",
};

const SYNC_HISTORY_SELECT = `
  id,
  club_id,
  competition_id,
  source_id,
  status,
  provider,
  trigger_source,
  duration_ms,
  started_at,
  completed_at,
  created_at,
  error_message,
  records_failed,
  clubs ( slug, public_name ),
  league_competitions ( name ),
  league_sources ( name )
`;

type EmbedRow = { slug?: string; public_name?: string; name?: string };

function pickEmbed<T extends EmbedRow>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function labelProvider(provider: string | null | undefined): string {
  const key = provider?.trim() || "unknown";
  return PROVIDER_LABELS[key] ?? key;
}

export function labelTrigger(trigger: string | null | undefined): string {
  const key = trigger?.trim() || "unknown";
  return TRIGGER_LABELS[key] ?? key;
}

export function truncateErrorMessage(message: string | null | undefined, max = 72): string | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function resolveLeagueName(
  competition: EmbedRow | null,
  source: EmbedRow | null,
): string {
  const competitionName = competition?.name?.trim();
  if (competitionName) return competitionName;
  const sourceName = source?.name?.trim();
  if (sourceName) return sourceName;
  return "—";
}

function mapJobRow(row: Record<string, unknown>): SyncHistoryRow {
  const club = pickEmbed(row.clubs as EmbedRow | EmbedRow[] | null);
  const competition = pickEmbed(row.league_competitions as EmbedRow | EmbedRow[] | null);
  const source = pickEmbed(row.league_sources as EmbedRow | EmbedRow[] | null);

  const startedAtRaw = row.started_at ?? row.created_at;
  const startedAt = String(startedAtRaw);
  const provider = String(row.provider ?? "unknown");
  const triggerSource = String(row.trigger_source ?? "unknown");
  const status = String(row.status);
  const errorFull = row.error_message != null ? String(row.error_message) : null;

  const durationMs =
    row.duration_ms != null
      ? Number(row.duration_ms)
      : syncDurationMs({
          status,
          recordsFailed: Number(row.records_failed ?? 0),
          errorMessage: errorFull,
          startedAt: row.started_at != null ? String(row.started_at) : null,
          completedAt: row.completed_at != null ? String(row.completed_at) : null,
          createdAt: String(row.created_at),
        });

  const category = classifySyncJob({
    status,
    recordsFailed: Number(row.records_failed ?? 0),
    errorMessage: errorFull,
    startedAt: row.started_at != null ? String(row.started_at) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
  });

  return {
    jobId: String(row.id),
    clubId: String(row.club_id),
    clubSlug: club?.slug ? String(club.slug) : "—",
    clubName: club?.public_name ? String(club.public_name) : "—",
    leagueName: resolveLeagueName(competition, source),
    startedAt,
    provider,
    providerLabel: labelProvider(provider),
    triggerSource,
    triggerLabel: labelTrigger(triggerSource),
    status,
    category,
    durationMs,
    durationLabel: formatDurationMs(durationMs),
    lastErrorShort: truncateErrorMessage(errorFull),
    lastErrorFull: errorFull,
  };
}

/** Single PostgREST query with embedded club / competition / source. */
export async function loadSyncHistory(limit = SYNC_HISTORY_LIMIT): Promise<SyncHistoryRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("league_sync_jobs")
    .select(SYNC_HISTORY_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`loadSyncHistory: ${error.message}`);
  }

  return (data ?? []).map((row) => mapJobRow(row as Record<string, unknown>));
}
