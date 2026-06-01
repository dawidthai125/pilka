#!/usr/bin/env node
/**
 * ETAP 15.8 — full live RLS / role audit (Club CRM)
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
  { key: "sponsor", email: "sponsor@piorun.test" },
  { key: "player", email: "zawodnik@piorun.test" },
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
        skip("R158-00", `Brak konta ${account.email} — uruchom npm run setup:stage1`);
        console.log("\nETAP 15.8 — role audit SKIP (brak kont testowych)\n");
        process.exit(0);
      }
    }

    // --- RLS tables ---
    const { rows: rlsRows } = await client.query(`
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('crm_contacts','crm_interactions','crm_tasks','crm_events','crm_event_attendees','crm_donations')
        AND c.relrowsecurity = TRUE
    `);
    if (rlsRows.length === 6) pass("R158-01", "RLS na 6 tabelach CRM");
    else fail("R158-01", `RLS ${rlsRows.length}/6`);

    // --- Staff read/write ---
    const presidentContacts = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.crm_contacts WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentContacts >= 6) pass("R158-02", `Prezes widzi ${presidentContacts} kontaktów`);
    else fail("R158-02", `Prezes widzi tylko ${presidentContacts} kontaktów`);

    const presidentDonations = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.crm_donations WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentDonations >= 1) pass("R158-03", "Prezes widzi darowizny CRM");
    else fail("R158-03", "Prezes nie widzi darowizn");

    const presidentTasks = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.crm_tasks WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentTasks >= 1) pass("R158-04", "Prezes widzi zadania CRM");
    else fail("R158-04", "Prezes nie widzi zadań");

    const presidentEvents = await countRows(
      client,
      users.president,
      "SELECT COUNT(*)::int AS c FROM public.crm_events WHERE club_id = $1",
      [CLUB_ID],
    );
    if (presidentEvents >= 1) pass("R158-05", "Prezes widzi wydarzenia CRM");
    else fail("R158-05", "Prezes nie widzi wydarzeń");

    // --- Sponsor pipeline isolation (coach) ---
    const coachPipeline = await countRows(
      client,
      users.coach,
      `SELECT COUNT(*)::int AS c FROM public.crm_contacts
       WHERE club_id = $1 AND contact_type IN ('sponsor','donor','company')`,
      [CLUB_ID],
    );
    if (coachPipeline === 0) pass("R158-06", "Trener nie widzi pipeline sponsorów");
    else fail("R158-06", `Trener widzi ${coachPipeline} kontaktów pipeline`);

    const coachVolunteers = await countRows(
      client,
      users.coach,
      `SELECT COUNT(*)::int AS c FROM public.crm_contacts
       WHERE club_id = $1 AND contact_type = 'volunteer'`,
      [CLUB_ID],
    );
    if (coachVolunteers >= 1) pass("R158-07", "Trener widzi wolontariuszy");
    else fail("R158-07", "Trener nie widzi wolontariuszy");

    const coachSponsorEvents = await countRows(
      client,
      users.coach,
      `SELECT COUNT(*)::int AS c FROM public.crm_events
       WHERE club_id = $1 AND event_type = 'sponsor_meeting'`,
      [CLUB_ID],
    );
    if (coachSponsorEvents === 0) pass("R158-08", "Trener nie widzi spotkań sponsorów");
    else fail("R158-08", `Trener widzi ${coachSponsorEvents} sponsor_meeting`);

    const coachCannotManage = !(await canRun(
      client,
      users.coach,
      `INSERT INTO public.crm_contacts (club_id, contact_type, name, created_by)
       VALUES ($1, 'company', 'Coach leak', $2)`,
      [CLUB_ID, users.coach],
    ));
    if (coachCannotManage) pass("R158-09", "Trener nie tworzy kontaktów");
    else fail("R158-09", "Trener ma write do crm_contacts");

    const coachNoDonations = await countRows(
      client,
      users.coach,
      "SELECT COUNT(*)::int AS c FROM public.crm_donations WHERE club_id = $1",
      [CLUB_ID],
    );
    if (coachNoDonations === 0) pass("R158-10", "Trener nie widzi darowizn");
    else fail("R158-10", `Trener widzi ${coachNoDonations} darowizn`);

    // --- Pipeline update ---
    const { rows: sponsorRows } = await client.query(
      `SELECT id FROM public.crm_contacts WHERE club_id = $1 AND contact_type = 'sponsor' LIMIT 1`,
      [CLUB_ID],
    );
    const sponsorContactId = sponsorRows[0]?.id;
    if (sponsorContactId) {
      const canUpdatePipeline = await canRun(
        client,
        users.president,
        `UPDATE public.crm_contacts SET pipeline_status = 'negotiation' WHERE id = $1`,
        [sponsorContactId],
      );
      if (canUpdatePipeline) pass("R158-11", "Pipeline — prezes aktualizuje status");
      else fail("R158-11", "Prezes nie może aktualizować pipeline");

      const coachNoInteraction = !(await canRun(
        client,
        users.coach,
        `INSERT INTO public.crm_interactions (club_id, contact_id, interaction_type, title, created_by)
         VALUES ($1, $2, 'phone', 'Leak', $3)`,
        [CLUB_ID, sponsorContactId, users.coach],
      ));
      if (coachNoInteraction) pass("R158-12", "Trener nie dodaje interakcji do sponsora");
      else fail("R158-12", "Trener dodał interakcję sponsora");

      const coachNoSponsorRead = await countRows(
        client,
        users.coach,
        `SELECT COUNT(*)::int AS c FROM public.crm_interactions WHERE contact_id = $1`,
        [sponsorContactId],
      );
      if (coachNoSponsorRead === 0) pass("R158-13", "Trener nie czyta historii sponsora");
      else fail("R158-13", `Trener widzi ${coachNoSponsorRead} interakcji sponsora`);
    } else {
      skip("R158-11", "Brak seed sponsora");
      skip("R158-12", "Brak seed sponsora");
      skip("R158-13", "Brak seed sponsora");
    }

    // --- Sponsor / player isolation ---
    const sponsorContacts = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.crm_contacts WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorContacts === 0) pass("R158-14", "Sponsor nie widzi CRM");
    else fail("R158-14", `Sponsor widzi ${sponsorContacts} kontaktów`);

    const playerLeak = await countRows(
      client,
      users.player,
      "SELECT COUNT(*)::int AS c FROM public.crm_contacts WHERE club_id = $1",
      [CLUB_ID],
    );
    if (playerLeak === 0) pass("R158-15", "Zawodnik nie widzi CRM");
    else fail("R158-15", `Zawodnik widzi ${playerLeak} kontaktów`);

    // --- Parent portal ---
    const parentContacts = await countRows(
      client,
      users.parent,
      "SELECT COUNT(*)::int AS c FROM public.crm_contacts WHERE club_id = $1",
      [CLUB_ID],
    );
    if (parentContacts === 1) pass("R158-16", "Rodzic widzi wyłącznie własny kontakt");
    else if (parentContacts === 0)
      skip("R158-16", "Brak seed kontaktu rodzica — uruchom db:migrate:stage158-parent");
    else fail("R158-16", `Rodzic widzi ${parentContacts} kontaktów — wyciek`);

    const parentPortal = await asUser(client, users.parent, async () => {
      const { rows } = await client.query(
        "SELECT COUNT(*)::int AS c FROM public.actor_crm_portal_contact_ids($1)",
        [CLUB_ID],
      );
      return Number(rows[0]?.c ?? 0);
    });
    if (parentPortal === 1) pass("R158-17", "actor_crm_portal_contact_ids dla rodzica");
    else if (parentPortal === 0) skip("R158-17", "Brak powiązania profile_id rodzica");
    else fail("R158-17", `Rodzic portal ${parentPortal} kontaktów`);

    const parentNoDonations = await countRows(
      client,
      users.parent,
      "SELECT COUNT(*)::int AS c FROM public.crm_donations WHERE club_id = $1",
      [CLUB_ID],
    );
    if (parentNoDonations === 0) pass("R158-18", "Rodzic nie widzi darowizn klubu");
    else fail("R158-18", `Rodzic widzi ${parentNoDonations} darowizn`);

    // --- Owner full access ---
    const ownerContacts = await countRows(
      client,
      users.owner,
      "SELECT COUNT(*)::int AS c FROM public.crm_contacts WHERE club_id = $1",
      [CLUB_ID],
    );
    if (ownerContacts >= presidentContacts) pass("R158-19", "Właściciel — pełny dostęp CRM");
    else fail("R158-19", "Właściciel — ograniczony dostęp");

    // --- CRM tasks write ---
    const presidentCanTask = await canRun(
      client,
      users.president,
      `INSERT INTO public.crm_tasks (club_id, task_type, title, status, created_by)
       VALUES ($1, 'reminder', 'Audyt task', 'open', $2)`,
      [CLUB_ID, users.president],
    );
    if (presidentCanTask) pass("R158-20", "Zadania CRM — prezes tworzy");
    else fail("R158-20", "Prezes nie tworzy zadań");

    const coachNoTaskWrite = !(await canRun(
      client,
      users.coach,
      `INSERT INTO public.crm_tasks (club_id, task_type, title, status, created_by)
       VALUES ($1, 'call_back', 'Leak', 'open', $2)`,
      [CLUB_ID, users.coach],
    ));
    if (coachNoTaskWrite) pass("R158-21", "Trener nie tworzy zadań CRM");
    else fail("R158-21", "Trener tworzy zadania CRM");

    // --- Functions ---
    const { rows: fnRows } = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN ('actor_can_manage_crm','actor_can_read_crm','actor_crm_portal_contact_ids')
    `);
    if (fnRows.length === 3) pass("R158-22", "Funkcje RLS CRM w DB");
    else fail("R158-22", `Brak funkcji (${fnRows.length}/3)`);
  } finally {
    await client.end();
  }

  console.log("\nETAP 15.8 Club CRM — full role / RLS audit\n");
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
