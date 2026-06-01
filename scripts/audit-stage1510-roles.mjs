#!/usr/bin/env node
/**
 * ETAP 15.10 — full live RLS / role audit (Injury & Medical)
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

async function updateCount(client, userId, sql, params = []) {
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
        skip("R1510-00", `Brak konta ${account.email} — uruchom npm run setup:stage1`);
        console.log("\nETAP 15.10 — role audit SKIP\n");
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

    const { rows: rlsRows } = await client.query(`
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'player_injuries','injury_categories','rehabilitation_plans','return_to_play'
        )
        AND c.relrowsecurity = TRUE
    `);
    if (rlsRows.length === 4) pass("R1510-01", "RLS na 4 tabelach Injury (injuries rozszerzone)");
    else fail("R1510-01", `RLS ${rlsRows.length}/4`);

    const presidentInjuries = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.player_injuries WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentInjuries >= 1) pass("R1510-02", `Prezes widzi ${presidentInjuries} urazów`);
    else fail("R1510-02", `Prezes widzi ${presidentInjuries} urazów`);

    const presidentCategories = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.injury_categories WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentCategories >= 6) pass("R1510-03", "Prezes widzi kategorie urazów");
    else fail("R1510-03", `Prezes widzi ${presidentCategories} kategorii`);

    const presidentCanCategory = await canRun(
      client,
      users.president,
      `INSERT INTO public.injury_categories (club_id, slug, name, sort_order)
       VALUES ($1, 'audit-test', 'Audyt', 50)`,
      [CLUB_ID],
    );
    if (presidentCanCategory) pass("R1510-04", "Prezes zarządza kategoriami");
    else fail("R1510-04", "Prezes nie zarządza kategoriami");

    const coachInjuries = await countRows(
      client,
      users.coach,
      "SELECT COUNT(*)::int AS c FROM public.player_injuries WHERE club_id = $1",
      [CLUB_ID],
    );
    if (coachInjuries >= 1) pass("R1510-05", `Trener czyta urazy drużyny (${coachInjuries})`);
    else fail("R1510-05", `Trener widzi ${coachInjuries} urazów`);

    const coachCanUpdateRehab = await canRun(
      client,
      users.coach,
      `UPDATE public.rehabilitation_plans SET progress_note = 'audyt'
       WHERE club_id = $1 AND id IN (
         SELECT id FROM public.rehabilitation_plans WHERE club_id = $1 LIMIT 1
       )`,
      [CLUB_ID],
    );
    if (coachCanUpdateRehab) pass("R1510-06", "Trener aktualizuje rehabilitację");
    else fail("R1510-06", "Trener nie aktualizuje rehabilitacji");

    const coachCannotCategory = !(await canRun(
      client,
      users.coach,
      `INSERT INTO public.injury_categories (club_id, slug, name) VALUES ($1, 'coach-leak', 'Leak')`,
      [CLUB_ID],
    ));
    if (coachCannotCategory) pass("R1510-07", "Trener nie tworzy kategorii");
    else fail("R1510-07", "Trener tworzy kategorie");

    const playerInjuries = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.player_injuries WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerInjuries >= 1 && playerInjuries <= presidentInjuries) {
      pass("R1510-08", `Zawodnik widzi własne urazy (${playerInjuries})`);
    } else if (playerInjuries === 0) {
      fail("R1510-08", "Zawodnik nie widzi własnych urazów");
    } else {
      fail("R1510-08", `Zawodnik widzi ${playerInjuries} — możliwy wyciek`);
    }

    const playerCategories = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.injury_categories WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerCategories >= 6) pass("R1510-09", "Zawodnik czyta kategorie (portal)");
    else fail("R1510-09", `Zawodnik widzi ${playerCategories} kategorii`);

    const playerCannotInsert = !(await canRun(
      client,
      users.player,
      `INSERT INTO public.player_injuries (club_id, player_id, injury_date, description)
       SELECT $1, id, CURRENT_DATE, 'leak' FROM public.players WHERE club_id = $1 LIMIT 1`,
      [CLUB_ID],
    ));
    if (playerCannotInsert) pass("R1510-10", "Zawodnik nie tworzy urazów");
    else fail("R1510-10", "Zawodnik tworzy urazy");

    const parentInjuries = await countRows(
      client,
      users.parent,
      "SELECT COUNT(*)::int AS c FROM public.player_injuries WHERE club_id = $1",
      [CLUB_ID],
    );
    if (hasParentGuardian && parentInjuries >= 1) {
      pass("R1510-11", `Rodzic widzi urazy dziecka (${parentInjuries})`);
    } else if (!hasParentGuardian) {
      skip("R1510-11", "Brak player_guardians — uruchom db:migrate:stage159-guardians");
    } else {
      fail("R1510-11", `Rodzic widzi ${parentInjuries} urazów`);
    }

    const sponsorInjuries = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.player_injuries WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorInjuries === 0) pass("R1510-12", "Sponsor nie widzi urazów");
    else fail("R1510-12", `Sponsor widzi ${sponsorInjuries} urazów`);

    const sponsorCategories = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.injury_categories WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorCategories === 0) pass("R1510-13", "Sponsor nie widzi kategorii urazów");
    else fail("R1510-13", `Sponsor widzi ${sponsorCategories} kategorii`);

    const ownerAll = await countRows(
      client,
      users.owner,
      "SELECT COUNT(*)::int AS c FROM public.return_to_play WHERE club_id = $1",
      [CLUB_ID],
    );
    if (ownerAll >= 1) pass("R1510-14", "Właściciel widzi return_to_play");
    else fail("R1510-14", "Właściciel nie widzi RTP");

    const ownerInjuries = await countRows(
      client,
      users.owner,
      "SELECT COUNT(*)::int AS c FROM public.player_injuries WHERE club_id = $1",
      [CLUB_ID],
    );
    if (ownerInjuries >= presidentInjuries) {
      pass("R1510-15", `Właściciel widzi ${ownerInjuries} urazów (pełny odczyt)`);
    } else {
      fail("R1510-15", `Właściciel widzi ${ownerInjuries}/${presidentInjuries} urazów`);
    }

    const ownerRehab = await countRows(
      client,
      users.owner,
      "SELECT COUNT(*)::int AS c FROM public.rehabilitation_plans WHERE club_id = $1",
      [CLUB_ID],
    );
    if (ownerRehab >= 1) pass("R1510-16", "Właściciel widzi plany rehabilitacji");
    else fail("R1510-16", "Właściciel nie widzi rehabilitacji");

    const presidentUpdateRtp = await updateCount(
      client,
      users.president,
      `UPDATE public.return_to_play SET match_status = 'conditional'
       WHERE club_id = $1 AND id IN (
         SELECT id FROM public.return_to_play WHERE club_id = $1 LIMIT 1
       )`,
      [CLUB_ID],
    );
    if (presidentUpdateRtp === 1) {
      pass("R1510-17", "Prezes aktualizuje powrót do meczu (return_to_play)");
    } else if (presidentUpdateRtp === 0) {
      fail("R1510-17", "Prezes — UPDATE return_to_play (0 wierszy)");
    } else {
      fail("R1510-17", "Prezes — błąd UPDATE return_to_play");
    }

    const coachUpdateTraining = await updateCount(
      client,
      users.coach,
      `UPDATE public.return_to_play SET training_status = 'partial'
       WHERE club_id = $1 AND id IN (
         SELECT id FROM public.return_to_play WHERE club_id = $1 LIMIT 1
       )`,
      [CLUB_ID],
    );
    if (coachUpdateTraining === 1) {
      pass("R1510-18", "Trener aktualizuje powrót do treningów");
    } else if (coachUpdateTraining === 0) {
      fail("R1510-18", "Trener — UPDATE return_to_play (0 wierszy)");
    } else {
      fail("R1510-18", "Trener — błąd UPDATE return_to_play");
    }

    const ownerCanReport = await canRun(
      client,
      users.owner,
      `INSERT INTO public.player_injuries (
         club_id, player_id, injury_date, description, injury_status, created_by
       )
       SELECT $1, id, CURRENT_DATE, '[audyt] test owner', 'active', $2
       FROM public.players WHERE club_id = $1 AND id = 'c1000001-0000-4000-8000-000000000001'`,
      [CLUB_ID, users.owner],
    );
    if (ownerCanReport) pass("R1510-19", "Właściciel zgłasza uraz (player_injuries insert)");
    else fail("R1510-19", "Właściciel nie może zgłosić urazu");

    const playerRehab = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.rehabilitation_plans WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerRehab >= 1 && playerRehab <= ownerRehab) {
      pass("R1510-20", `Zawodnik czyta rehabilitację (${playerRehab})`);
    } else if (playerRehab === 0) {
      fail("R1510-20", "Zawodnik nie widzi rehabilitacji");
    } else {
      fail("R1510-20", `Zawodnik widzi ${playerRehab} planów — wyciek`);
    }

    const playerRtp = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.return_to_play WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerRtp >= 1 && playerRtp <= ownerAll) {
      pass("R1510-21", `Zawodnik czyta return_to_play (${playerRtp})`);
    } else if (playerRtp === 0) {
      fail("R1510-21", "Zawodnik nie widzi return_to_play");
    } else {
      fail("R1510-21", `Zawodnik widzi ${playerRtp} RTP — wyciek`);
    }

    const playerRtpWrite = await updateCount(
      client,
      users.player,
      `UPDATE public.return_to_play SET match_status = 'available' WHERE club_id = $1`,
      [CLUB_ID],
    );
    if (playerRtpWrite === 0) pass("R1510-22", "Zawodnik nie aktualizuje return_to_play (0 rows)");
    else if (playerRtpWrite < 0) fail("R1510-22", "Zawodnik UPDATE RTP — błąd SQL");
    else fail("R1510-22", `Zawodnik zaktualizował ${playerRtpWrite} RTP`);

    const parentRehabWrite = await updateCount(
      client,
      users.parent,
      `UPDATE public.rehabilitation_plans SET progress_note = 'leak' WHERE club_id = $1`,
      [CLUB_ID],
    );
    if (parentRehabWrite === 0) pass("R1510-23", "Rodzic nie aktualizuje rehabilitacji (0 rows)");
    else if (parentRehabWrite < 0) fail("R1510-23", "Rodzic UPDATE rehab — błąd SQL");
    else fail("R1510-23", `Rodzic zaktualizował ${parentRehabWrite} planów`);

    const sponsorRehab = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.rehabilitation_plans WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorRehab === 0) pass("R1510-24", "Sponsor nie widzi rehabilitacji");
    else fail("R1510-24", `Sponsor widzi ${sponsorRehab} planów rehabilitacji`);

    const sponsorRtp = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.return_to_play WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorRtp === 0) pass("R1510-25", "Sponsor nie widzi return_to_play");
    else fail("R1510-25", `Sponsor widzi ${sponsorRtp} RTP`);

    const availSync = await countRows(
      client,
      users.president,
      `SELECT COUNT(*)::int AS c FROM public.player_availability pa
       WHERE pa.club_id = $1
         AND pa.event_type = 'club_event'
         AND pa.absence_reason = 'injury'
         AND EXISTS (
           SELECT 1 FROM public.player_injuries pi
           WHERE pi.id = pa.club_event_ref
             AND pi.club_id = $1
             AND pi.injury_status IN ('active', 'rehabilitation')
         )`,
      [CLUB_ID],
    );
    if (availSync >= 1) pass("R1510-26", `Sync availability — ${availSync} wpisów club_event/injury`);
    else fail("R1510-26", "Brak sync player_availability z aktywnym urazem");

    const { rows: notifyEnums } = await client.query(`
      SELECT e.enumlabel FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'notification_event_type'
        AND e.enumlabel IN ('injury_reported', 'injury_return_training', 'injury_return_match')
    `);
    if (notifyEnums.length === 3) {
      pass("R1510-27", "Enum powiadomień injury_* w notification_event_type");
    } else {
      fail("R1510-27", `Enum powiadomień ${notifyEnums.length}/3`);
    }

    console.log("\nETAP 15.10 — role audit\n");
    for (const check of checks) {
      console.log(`${check.status.padEnd(4)} ${check.id} — ${check.message}`);
    }
    const passed = checks.filter((c) => c.status === "PASS").length;
    const skipped = checks.filter((c) => c.status === "SKIP").length;
    console.log(`\n${passed}/${checks.length - skipped} PASS (${skipped} SKIP)\n`);
    process.exit(failed ? 1 : 0);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
