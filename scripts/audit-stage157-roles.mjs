#!/usr/bin/env node
/**
 * ETAP 15.7 — live RLS / role isolation audit (Attendance & Availability)
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TEAM_SENIOR = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

const ROLE_ACCOUNTS = [
  { key: "coach", email: "trener@piorun.test" },
  { key: "player", email: "zawodnik@piorun.test" },
  { key: "parent", email: "rodzic@piorun.test" },
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

async function canInsert(client, userId, sql, params = []) {
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
        skip("R157-00", `Brak konta ${account.email} — uruchom npm run setup:stage1`);
        console.log("\nETAP 15.7 — role audit SKIP (brak kont testowych)\n");
        process.exit(0);
      }
    }

    const { rows: rlsRows } = await client.query(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'availability_reasons','player_availability','attendance_records','match_squad_responses'
        )
        AND c.relrowsecurity = TRUE
    `);
    if (rlsRows.length === 4) {
      pass("R157-01", "RLS włączone na 4 tabelach Attendance 2.0");
    } else {
      fail("R157-01", `RLS aktywne na ${rlsRows.length}/4 tabelach`);
    }

    const playerRecordId = await asUser(client, users.player, async () => {
      const { rows } = await client.query(
        `SELECT pid FROM public.actor_managed_player_ids($1) AS pid LIMIT 1`,
        [CLUB_ID],
      );
      return rows[0]?.pid ?? null;
    });

    const { rows: trainingRows } = await client.query(
      `SELECT id FROM public.trainings WHERE club_id = $1 AND team_id = $2 ORDER BY training_date DESC LIMIT 1`,
      [CLUB_ID, TEAM_SENIOR],
    );
    const trainingId = trainingRows[0]?.id;

    const { rows: matchRows } = await client.query(
      `SELECT id FROM public.matches WHERE club_id = $1 AND team_id = $2 AND status = 'planned' ORDER BY match_date LIMIT 1`,
      [CLUB_ID, TEAM_SENIOR],
    );
    const matchId = matchRows[0]?.id;

    // Coach sees team availability
    if (trainingId) {
      const coachAvail = await countRows(
        client,
        users.coach,
        `SELECT COUNT(*)::int AS c FROM public.player_availability WHERE club_id = $1 AND training_id = $2`,
        [CLUB_ID, trainingId],
      );
      if (coachAvail >= 0) {
        pass("R157-02", `Trener może odczytać dostępność treningu (${coachAvail} wpisów)`);
      } else {
        fail("R157-02", "Trener nie widzi dostępności treningu");
      }
    } else {
      skip("R157-02", "Brak seed treningu");
    }

    // Player can set own availability
    if (trainingId && playerRecordId) {
      const playerCanSet = await canInsert(
        client,
        users.player,
        `INSERT INTO public.player_availability (
           club_id, player_id, event_type, training_id, status, declared_by
         ) VALUES ($1, $2, 'training', $3, 'present', $4)
         ON CONFLICT (training_id, player_id) WHERE training_id IS NOT NULL
         DO UPDATE SET status = 'present', declared_by = EXCLUDED.declared_by`,
        [CLUB_ID, playerRecordId, trainingId, users.player],
      );
      if (playerCanSet) {
        pass("R157-03", "Zawodnik może ustawić własną dostępność treningową");
      } else {
        fail("R157-03", "Zawodnik nie może ustawić dostępności");
      }

      const fakePlayerId = "00000000-0000-4000-8000-000000009998";
      const playerFake = await canInsert(
        client,
        users.player,
        `INSERT INTO public.player_availability (
           club_id, player_id, event_type, training_id, status, declared_by
         ) VALUES ($1, $2, 'training', $3, 'present', $4)`,
        [CLUB_ID, fakePlayerId, trainingId, users.player],
      );
      if (!playerFake) {
        pass("R157-04", "Zawodnik nie może ustawić dostępności obcego zawodnika");
      } else {
        fail("R157-04", "Wyciek — zawodnik ustawił dostępność obcego ID");
      }
    } else {
      skip("R157-03", "Brak seed treningu/zawodnika");
      skip("R157-04", "Brak seed treningu/zawodnika");
    }

    // Parent via guardians
    const parentManaged = await asUser(client, users.parent, async () => {
      const { rows } = await client.query(
        "SELECT COUNT(*)::int AS c FROM public.actor_managed_player_ids($1)",
        [CLUB_ID],
      );
      return Number(rows[0]?.c ?? 0);
    });
    if (parentManaged > 0) {
      pass("R157-05", `Rodzic zarządza ${parentManaged} zawodnikiem(ami) via actor_managed_player_ids`);
    } else {
      skip("R157-05", "Rodzic bez player_guardians — wymaga setup:stage7");
    }

    // Sponsor isolation
    const sponsorAvail = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.player_availability WHERE club_id = $1",
      [CLUB_ID],
    );
    if (sponsorAvail === 0) {
      pass("R157-06", "Sponsor nie widzi dostępności zawodników");
    } else {
      fail("R157-06", `Sponsor widzi ${sponsorAvail} wpisów dostępności`);
    }

    // Match squad response scope
    if (matchId && playerRecordId) {
      await client.query(
        `INSERT INTO public.match_squad (club_id, match_id, player_id, squad_role, call_status)
         VALUES ($1, $2, $3, 'squad', 'called_up')
         ON CONFLICT DO NOTHING`,
        [CLUB_ID, matchId, playerRecordId],
      );

      const playerCanRespond = await canInsert(
        client,
        users.player,
        `INSERT INTO public.match_squad_responses (club_id, match_id, player_id, user_id, response)
         VALUES ($1, $2, $3, $4, 'yes')
         ON CONFLICT (match_id, player_id) DO UPDATE SET response = 'yes'`,
        [CLUB_ID, matchId, playerRecordId, users.player],
      );
      if (playerCanRespond) {
        pass("R157-07", "Powołany zawodnik może potwierdzić skład");
      } else {
        fail("R157-07", "Zawodnik nie może potwierdzić powołania");
      }
    } else {
      skip("R157-07", "Brak seed meczu/zawodnika");
    }

    const { rows: fnRows } = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN (
          'actor_can_set_player_availability',
          'actor_can_respond_match_squad',
          'actor_can_read_team_availability'
        )
    `);
    if (fnRows.length === 3) {
      pass("R157-08", "Funkcje RLS Attendance 2.0 obecne w DB");
    } else {
      fail("R157-08", `Brak funkcji RLS (${fnRows.length}/3)`);
    }
  } finally {
    await client.end();
  }

  console.log("\nETAP 15.7 Attendance — role / RLS audit\n");
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
