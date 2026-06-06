import type { HealthLevel } from "@/lib/platform/health-types";

/** Client-safe registry types and constants — no server/health loader imports. */

export type ClubOperationsRegistryRow = {
  id: string;
  slug: string;
  publicName: string;
  status: string;
  createdAt: string;
  ownerEmail: string | null;
  ownerStatus: string | null;
  healthScore: number;
  healthLevel: HealthLevel;
  lastSyncAt: string | null;
  leagueLabel: string;
  isTest: boolean;
  requiresAttention: boolean;
};

export const REGISTRY_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const REGISTRY_DEFAULT_PAGE_SIZE = 25;

export type ClubRegistryStatusFilter = "" | "active" | "onboarding" | "archived" | "attention";

export type ClubOperationsRegistryQuery = {
  page?: number;
  pageSize?: number;
  status?: ClubRegistryStatusFilter;
  search?: string;
  /** Domyślnie true — ukryj kluby testowe. */
  hideTest?: boolean;
};

export type ClubOperationsRegistrySummary = {
  total: number;
  active: number;
  onboarding: number;
  archived: number;
  attention: number;
};

export type ClubOperationsRegistryPagination = {
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
};

export type ClubOperationsRegistryResult = {
  rows: ClubOperationsRegistryRow[];
  summary: ClubOperationsRegistrySummary;
  pagination: ClubOperationsRegistryPagination;
  query: Required<Pick<ClubOperationsRegistryQuery, "page" | "pageSize" | "hideTest">> & {
    status: ClubRegistryStatusFilter;
    search: string;
  };
};
