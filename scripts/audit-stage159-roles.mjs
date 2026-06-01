#!/usr/bin/env node
/**
 * ETAP 15.9 — full live RLS / role audit (Equipment & Assets)
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const ROLE_ACCOUNTS = [
  { key: "owner", email: "wlasciciel@piorun.test" },
  { key: "president", email: "prezes@piorun.test" },
  { key: "coach", email: "trener@piorun.test" },
  { key: "parent", email: "rodzic@piorun.test" },
  { key: "player", email: "zawodnik@piorun.test" },
  { key: "sponsor", email: "sponsor@piorun.test" },
];

const checks = [];
let failed = 0;

function pass(id, message) {
  checks.push({ id, status: "PASS", message });
}

function fail(id, message) {
  checks.push({ id, status: "FAIL", message });
  failed += 1;
}

function skip(id, message) {
  checks.push({ id, status: "SKIP", message });
}

async function asUser(client, userId, fn) {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL role authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const result = await fn();
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function countRows(client, userId, sql, params = []) {
  return asUser(client, userId, async () => {
    const { rows } = await client.query(sql, params);
    return Number(rows[0]?.c ?? 0);
  });
}

async function canRun(client, userId, sql, params = []) {
  return asUser(client, userId, async () => {
    try {
      await client.query(sql, params);
      return true;
    } catch {
      return false;
    }
  });
}

async function deleteCount(client, userId, sql, params = []) {
  return asUser(client, userId, async () => {
    try {
      const result = await client.query(sql, params);
      return result.rowCount ?? 0;
    } catch {
      return -1;
    }
  });
}

async function main() {
  const client = await connectDb();

  try {
    const users = {};
    for (const account of ROLE_ACCOUNTS) {
      const { rows } = await client.query(
        "SELECT id FROM public.profiles WHERE email = $1 LIMIT 1",
        [account.email],
      );
      if (rows[0]?.id) users[account.key] = rows[0].id;
    }

    for (const account of ROLE_ACCOUNTS) {
      if (!users[account.key]) {
        skip("R159-00", `Brak konta ${account.email} — uruchom npm run setup:stage1`);
        console.log("\nETAP 15.9 — role audit SKIP\n");
        process.exit(0);
      }
    }

    const { rows: guardianCheck } = await client.query(
      `SELECT 1 FROM public.player_guardians pg
       JOIN public.profiles pr ON pr.id = pg.profile_id
       WHERE pg.club_id = $1 AND pr.email = 'rodzic@piorun.test' LIMIT 1`,
      [CLUB_ID],
    ).catch(() => ({ rows: [] }));
    const hasParentGuardian = guardianCheck.length > 0;

    // --- RLS ---
    const { rows: rlsRows } = await client.query(`
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'asset_categories','assets','asset_assignments',
          'asset_maintenance','equipment_kits','equipment_kit_history'
        )
        AND c.relrowsecurity = TRUE
    `);
    if (rlsRows.length === 6) pass("R159-01", "RLS na 6 tabelach Equipment");
    else fail("R159-01", `RLS ${rlsRows.length}/6`);

    // --- Staff read ---
    const presidentAssets = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.assets WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentAssets >= 4) pass("R159-02", `Prezes widzi ${presidentAssets} zasobów`);
    else fail("R159-02", `Prezes widzi ${presidentAssets} zasobów`);

    const presidentAssignments = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.asset_assignments WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentAssignments >= 1) pass("R159-03", "Prezes widzi wydania sprzętu");
    else fail("R159-03", "Prezes nie widzi wydań");

    const presidentKits = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.equipment_kits WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentKits >= 1) pass("R159-04", "Prezes widzi stroje");
    else fail("R159-04", "Prezes nie widzi strojów");

    const presidentMaintenance = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.asset_maintenance WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentMaintenance >= 1) pass("R159-05", "Prezes widzi konserwację");
    else fail("R159-05", "Prezes nie widzi konserwacji");

    // --- Coach scoped ---
    const coachAssets = await countRows(
      client,
      users.coach,
      "SELECT COUNT(*)::int AS c FROM public.assets WHERE club_id = $1",
      [CLUB_ID],
    );
    if (coachAssets >= 4) pass("R159-06", "Trener czyta rejestr sprzętu");
    else fail("R159-06", `Trener widzi ${coachAssets} zasobów`);

    const coachCannotInsertAsset = !(await canRun(
      client,
      users.coach,
      `INSERT INTO public.assets (club_id, category_id, name, created_by)
       SELECT $1, id, 'Leak', $2 FROM public.asset_categories WHERE club_id = $1 LIMIT 1`,
      [CLUB_ID, users.coach],
    ));
    if (coachCannotInsertAsset) pass("R159-07", "Trener nie tworzy zasobów");
    else fail("R159-07", "Trener ma write do assets");

    const coachCanIssue = await canRun(
      client,
      users.coach,
      `INSERT INTO public.asset_assignments (
         club_id, asset_id, assignee_kind, assignee_label, quantity, issued_by
       )
       SELECT $1, id, 'staff', 'Audyt issue', 1, $2
       FROM public.assets WHERE club_id = $1 AND quantity_available > 0 LIMIT 1`,
      [CLUB_ID, users.coach],
    );
    if (coachCanIssue) pass("R159-08", "Trener wydaje sprzęt (assignments insert)");
    else fail("R159-08", "Trener nie wydaje sprzętu");

    const coachCannotKit = !(await canRun(
      client,
      users.coach,
      `INSERT INTO public.equipment_kits (club_id, player_id, kit_type, size, created_by)
       VALUES ($1, 'c1000001-0000-4000-8000-000000000006', 'training_kit', 'S', $2)`,
      [CLUB_ID, users.coach],
    ));
    if (coachCannotKit) pass("R159-09", "Trener nie zarządza strojami");
    else fail("R159-09", "Trener tworzy stroje");

    const coachCanMaintain = await canRun(
      client,
      users.coach,
      `INSERT INTO public.asset_maintenance (club_id, asset_id, maintenance_type, title, reported_by)
       SELECT $1, id, 'inspection', 'Audyt przegląd', $2
       FROM public.assets WHERE club_id = $1 LIMIT 1`,
      [CLUB_ID, users.coach],
    );
    if (coachCanMaintain) pass("R159-10", "Trener zgłasza konserwację");
    else fail("R159-10", "Trener nie zgłasza konserwacji");

    const coachDeleteCount = await deleteCount(
      client,
      users.coach,
      `DELETE FROM public.asset_assignments WHERE club_id = $1`,
      [CLUB_ID],
    );
    if (coachDeleteCount === 0) pass("R159-11", "Trener nie usuwa wydań (0 rows)");
    else if (coachDeleteCount < 0) fail("R159-11", "Trener DELETE — błąd SQL");
    else fail("R159-11", `Trener usunął ${coachDeleteCount} wydań`);

    // --- Player portal ---
    const playerKits = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.equipment_kits WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerKits >= 1) pass("R159-12", `Zawodnik widzi ${playerKits} strojów`);
    else fail("R159-12", `Zawodnik widzi ${playerKits} strojów`);

    const playerAssets = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.assets WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerAssets <= 2) pass("R159-13", "Zawodnik — scoped assets (max wydania własne)");
    else fail("R159-13", `Zawodnik widzi ${playerAssets} zasobów — wyciek`);

    const playerMaintenance = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.asset_maintenance WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerMaintenance === 0) pass("R159-14", "Zawodnik nie widzi konserwacji");
    else fail("R159-14", `Zawodnik widzi ${playerMaintenance} konserwacji`);

    const playerAssignments = await countRows(
      client,
      users.player,
      `SELECT COUNT(*)::int AS c FROM public.asset_assignments
       WHERE club_id = $1 AND returned_at IS NULL`,
      [CLUB_ID],
    );
    const staffAssignments = await countRows(
      client,
      users.president,
      `SELECT COUNT(*)::int AS c FROM public.asset_assignments
       WHERE club_id = $1 AND returned_at IS NULL`,
      [CLUB_ID],
    );
    if (playerAssignments < staffAssignments || playerAssignments <= 2) {
      pass("R159-15", "Zawodnik — scoped assignments (nie wszystkie wydania klubu)");
    } else {
      fail("R159-15", `Zawodnik widzi ${playerAssignments}/${staffAssignments} wydań — wyciek`);
    }

    // --- Parent portal ---
    const parentKits = await countRows(
      client,
      users.parent,
      "SELECT COUNT(*)::int AS c FROM public.equipment_kits WHERE club_id = $1",
      [CLUB_ID],
    );
    if (hasParentGuardian && parentKits >= 1) {
      pass("R159-16", `Rodzic widzi ${parentKits} strojów dziecka`);
    } else if (!hasParentGuardian) {
      skip("R159-16", "Brak player_guardians — uruchom db:migrate:stage159-parent-guardian");
    } else {
      fail("R159-16", `Rodzic widzi ${parentKits} strojów`);
    }

    const parentMaintenance = await countRows(
      client,
      users.parent,
      "SELECT COUNT(*)::int AS c FROM public.asset_maintenance WHERE club_id = $1",
      [CLUB_ID],
    );
    if (parentMaintenance === 0) pass("R159-17", "Rodzic nie widzi konserwacji");
    else fail("R159-17", `Rodzic widzi ${parentMaintenance} konserwacji`);

    // --- Sponsor isolation ---
    const sponsorAssets = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.assets WHERE club_id = $1",
      [CLUB_ID],
    );
    const sponsorAssignments = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.asset_assignments WHERE club_id = $1",
      [CLUB_ID],
    );
    const sponsorKits = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.equipment_kits WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorAssets === 0 && sponsorAssignments === 0 && sponsorKits === 0) {
      pass("R159-18", "Sponsor — brak dostępu do Equipment");
    } else {
      fail(
        "R159-18",
        `Sponsor leak: assets=${sponsorAssets} assignments=${sponsorAssignments} kits=${sponsorKits}`,
      );
    }

    // --- Owner ---
    const ownerAssets = await countRows(
      client,
      users.owner,
      "SELECT COUNT(*)::int AS c FROM public.assets WHERE club_id = $1",
      [CLUB_ID],
    );
    if (ownerAssets >= presidentAssets) pass("R159-19", "Właściciel — pełny dostęp do assets");
    else fail("R159-19", "Właściciel ograniczony");

    const ownerCanManageKit = await canRun(
      client,
      users.owner,
      `UPDATE public.equipment_kits SET size = size
       WHERE id = (SELECT id FROM public.equipment_kits WHERE club_id = $1 LIMIT 1)`,
      [CLUB_ID],
    );
    if (ownerCanManageKit) pass("R159-20", "Właściciel zarządza strojami");
    else fail("R159-20", "Właściciel nie aktualizuje strojów");

    const presidentCanManageAsset = await canRun(
      client,
      users.president,
      `UPDATE public.assets SET description = description
       WHERE id = (SELECT id FROM public.assets WHERE club_id = $1 LIMIT 1)`,
      [CLUB_ID],
    );
    if (presidentCanManageAsset) pass("R159-21", "Prezes aktualizuje zasoby");
    else fail("R159-21", "Prezes nie aktualizuje zasobów");

    // --- Functions ---
    const { rows: fnRows } = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN (
          'actor_can_manage_equipment',
          'actor_can_issue_equipment',
          'actor_can_read_equipment_staff',
          'actor_can_read_equipment_assignment',
          'actor_can_access_equipment_portal'
        )
    `);
    if (fnRows.length === 5) pass("R159-22", "Funkcje RLS Equipment w DB (5/5)");
    else fail("R159-22", `Brak funkcji (${fnRows.length}/5)`);
  } finally {
    await client.end();
  }

  console.log("\nETAP 15.9 Equipment & Assets — full role / RLS audit\n");
  for (const c of checks) {
    console.log(`[${c.status}] ${c.id}: ${c.message}`);
  }
  const passed = checks.filter((c) => c.status === "PASS").length;
  const total = checks.filter((c) => c.status !== "SKIP").length;
  console.log(`\n${passed}/${total} PASS (${checks.filter((c) => c.status === "SKIP").length} SKIP)`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
