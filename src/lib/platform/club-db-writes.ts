import type pg from "pg";

import type { PlatformAuditEntry } from "@/lib/platform/audit";

export async function platformAppendClubAudit(
  client: pg.Client,
  clubId: string,
  entry: PlatformAuditEntry,
): Promise<void> {
  await client.query(`SELECT public.platform_append_club_audit($1::uuid, $2::jsonb)`, [
    clubId,
    JSON.stringify(entry),
  ]);
}

export type PlatformSetClubStatusResult = {
  clubId: string;
  slug: string;
  publicName: string;
  previousStatus: string;
  noop: boolean;
};

export async function platformSetClubStatus(
  client: pg.Client,
  clubId: string,
  status: "active" | "archived",
  auditEntry?: PlatformAuditEntry,
): Promise<PlatformSetClubStatusResult> {
  const { rows } = await client.query(
    `SELECT out_club_id, out_slug, out_public_name, out_previous_status, out_noop
     FROM public.platform_set_club_status($1::uuid, $2::text, $3::jsonb)`,
    [clubId, status, auditEntry ? JSON.stringify(auditEntry) : null],
  );

  const row = rows[0] as {
    out_club_id: string;
    out_slug: string;
    out_public_name: string;
    out_previous_status: string;
    out_noop: boolean;
  } | undefined;
  if (!row) throw new Error("platform_set_club_status returned no row");

  return {
    clubId: String(row.out_club_id),
    slug: String(row.out_slug),
    publicName: String(row.out_public_name),
    previousStatus: String(row.out_previous_status),
    noop: Boolean(row.out_noop),
  };
}
