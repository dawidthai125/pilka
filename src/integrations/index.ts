/**
 * Warstwa integracji zewnętrznych — ETAP 4: tylko architektura, bez pobierania danych.
 */

export type IntegrationProvider = "pzpn" | "dzpn" | "extranet";

export type IntegrationStatus = "not_configured" | "ready" | "disabled";

export type IntegrationConfig = {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  lastSyncAt: string | null;
};

export type SyncResult = {
  success: boolean;
  message: string;
  syncedAt: string;
};

export const INTEGRATION_REGISTRY: IntegrationConfig[] = [
  {
    provider: "pzpn",
    status: "not_configured",
    baseUrl: null,
    apiKeyConfigured: false,
    lastSyncAt: null,
  },
  {
    provider: "dzpn",
    status: "not_configured",
    baseUrl: null,
    apiKeyConfigured: false,
    lastSyncAt: null,
  },
  {
    provider: "extranet",
    status: "not_configured",
    baseUrl: null,
    apiKeyConfigured: false,
    lastSyncAt: null,
  },
];

export function getIntegrationConfigs(): IntegrationConfig[] {
  return INTEGRATION_REGISTRY;
}

export async function syncIntegration(_provider: IntegrationProvider): Promise<SyncResult> {
  return {
    success: false,
    message: "Synchronizacja nie jest jeszcze zaimplementowana — warstwa przygotowana pod przyszłe integracje.",
    syncedAt: new Date().toISOString(),
  };
}
