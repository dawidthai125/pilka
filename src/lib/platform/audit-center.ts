import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformAuditEntry } from "@/lib/platform/audit";
import {
  isPlatformAuditAction,
  PLATFORM_AUDIT_ACTIONS,
  type PlatformAuditAction,
} from "@/lib/platform/platform-audit-actions";

export type AuditCenterFilters = {
  clubId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AuditCenterEntry = {
  clubId: string;
  clubSlug: string;
  clubName: string;
  action: PlatformAuditAction | string;
  at: string;
  actorEmail: string;
  metadata?: Record<string, unknown>;
};

export type AuditCenterClubOption = {
  id: string;
  slug: string;
  publicName: string;
};

export type AuditCenterData = {
  entries: AuditCenterEntry[];
  clubs: AuditCenterClubOption[];
  filters: AuditCenterFilters;
};

function parseClubAuditEntries(
  clubId: string,
  clubSlug: string,
  clubName: string,
  settings: Record<string, unknown> | null,
): AuditCenterEntry[] {
  const raw = settings?.platformAudit;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is PlatformAuditEntry => {
      return (
        entry &&
        typeof entry === "object" &&
        typeof (entry as PlatformAuditEntry).action === "string" &&
        typeof (entry as PlatformAuditEntry).at === "string"
      );
    })
    .map((entry) => ({
      clubId,
      clubSlug,
      clubName,
      action: entry.action,
      at: entry.at,
      actorEmail: entry.actorEmail,
      metadata: entry.metadata,
    }));
}

function inDateRange(at: string, dateFrom?: string, dateTo?: string): boolean {
  const ts = new Date(at).getTime();
  if (Number.isNaN(ts)) return false;

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
    if (ts < from) return false;
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999Z`).getTime();
    if (ts > to) return false;
  }

  return true;
}

export async function loadAuditCenter(filters: AuditCenterFilters = {}): Promise<AuditCenterData> {
  const admin = createAdminClient();
  const { data: clubs, error } = await admin
    .from("clubs")
    .select("id, slug, public_name, settings")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const clubOptions: AuditCenterClubOption[] = (clubs ?? []).map((c) => ({
    id: String(c.id),
    slug: String(c.slug),
    publicName: String(c.public_name),
  }));

  let entries = (clubs ?? []).flatMap((club) =>
    parseClubAuditEntries(
      String(club.id),
      String(club.slug),
      String(club.public_name),
      club.settings as Record<string, unknown> | null,
    ),
  );

  if (filters.clubId) {
    entries = entries.filter((e) => e.clubId === filters.clubId);
  }

  if (filters.action && isPlatformAuditAction(filters.action)) {
    entries = entries.filter((e) => e.action === filters.action);
  } else if (filters.action) {
    entries = entries.filter((e) => e.action === filters.action);
  } else {
    entries = entries.filter((e) =>
      (PLATFORM_AUDIT_ACTIONS as readonly string[]).includes(e.action),
    );
  }

  if (filters.dateFrom || filters.dateTo) {
    entries = entries.filter((e) => inDateRange(e.at, filters.dateFrom, filters.dateTo));
  }

  entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    entries: entries.slice(0, 200),
    clubs: clubOptions,
    filters,
  };
}
