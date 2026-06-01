import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CLUB_ID } from "@/lib/auth/session";

export async function buildIntegrationsAiContext(clubId: string = DEFAULT_CLUB_ID) {
  const supabase = await createClient();

  const [logsRes, importsRes, conflictsRes, integrationsRes] = await Promise.all([
    supabase
      .from("sync_logs")
      .select("id, provider, job_type, status, message, records_processed, records_failed, started_at")
      .eq("club_id", clubId)
      .order("started_at", { ascending: false })
      .limit(15),
    supabase
      .from("integration_imports")
      .select("id, file_name, format, import_type, status, rows_imported, rows_failed, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sync_conflicts")
      .select("id, entity_type, entity_key, status, created_at")
      .eq("club_id", clubId)
      .eq("status", "pending")
      .limit(20),
    supabase
      .from("integrations")
      .select("provider, status, last_sync_at, last_error, auto_sync_enabled")
      .eq("club_id", clubId),
  ]);

  const errorLogs = (logsRes.data ?? []).filter((l) => l.status === "error");
  const partialLogs = (logsRes.data ?? []).filter((l) => l.status === "partial");

  return {
    integrations: integrationsRes.data ?? [],
    recentSyncLogs: logsRes.data ?? [],
    recentImports: importsRes.data ?? [],
    pendingConflicts: conflictsRes.data ?? [],
    summary: {
      activeIntegrations: (integrationsRes.data ?? []).filter((i) => i.status === "ready").length,
      recentErrors: errorLogs.length,
      partialSyncs: partialLogs.length,
      pendingConflicts: (conflictsRes.data ?? []).length,
    },
  };
}
