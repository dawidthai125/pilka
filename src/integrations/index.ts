/**
 * Warstwa integracji zewnętrznych — ETAP 10
 * Adaptery niezależne; system działa bez live API (staging + import).
 */

export type {
  IntegrationProvider,
  IntegrationConnectionStatus,
  IntegrationDataFormat,
  SyncJobType,
  SyncTriggerType,
  SyncLogStatus,
} from "@/types/integrations";

export { pzpnClient, type PzpnFixture } from "@/integrations/pzpn";
export { dzpnClient, type DzpnTableRow } from "@/integrations/dzpn";
export { extranetClient, type ExtranetMatchReport } from "@/integrations/extranet";
export { manualAdapter } from "@/integrations/manual";
export { importsAdapter } from "@/integrations/imports";

export type SyncResult = {
  success: boolean;
  message: string;
  syncedAt: string;
  status?: "success" | "partial" | "error";
};

export { runIntegrationSync } from "@/lib/integrations/sync-engine";
