#!/usr/bin/env node
/**
 * ETAP 15.6 — live RLS / role isolation audit (Communication Hub)
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
  { key: "owner", email: "wlasciciel@piorun.test" },
  { key: "president", email: "prezes@piorun.test" },
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
        skip("R156-00", `Brak konta ${account.email} — uruchom npm run setup:stage1`);
        console.log("\nETAP 15.6 — role audit SKIP (brak kont testowych)\n");
        process.exit(0);
      }
    }

    const { rows: boardChats } = await client.query(
      `SELECT id FROM public.team_chats WHERE club_id = $1 AND chat_type = 'board' AND is_active = TRUE LIMIT 1`,
      [CLUB_ID],
    );
    const boardChatId = boardChats[0]?.id;

    const { rows: teamChats } = await client.query(
      `SELECT id FROM public.team_chats WHERE club_id = $1 AND chat_type = 'team' AND team_id = $2 LIMIT 1`,
      [CLUB_ID, TEAM_SENIOR],
    );
    const teamChatId = teamChats[0]?.id;

    const { rows: boardAnn } = await client.query(
      `SELECT id FROM public.announcements WHERE club_id = $1 AND category = 'board' AND status = 'published' LIMIT 1`,
      [CLUB_ID],
    );
    const boardAnnouncementId = boardAnn[0]?.id;

    const { rows: coachMsgs } = await client.query(
      `SELECT id FROM public.coach_messages WHERE club_id = $1 AND team_id = $2 AND status = 'published' LIMIT 1`,
      [CLUB_ID, TEAM_SENIOR],
    );
    const coachMessageId = coachMsgs[0]?.id;

    // --- RLS table coverage ---
    const { rows: rlsRows } = await client.query(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'announcements','announcement_reads','coach_messages','coach_message_responses',
          'team_chats','chat_messages','chat_attachments','notification_events'
        )
        AND c.relrowsecurity = TRUE
    `);
    if (rlsRows.length === 8) {
      pass("R156-01", "RLS włączone na 8 tabelach Communication Hub");
    } else {
      fail("R156-01", `RLS aktywne na ${rlsRows.length}/8 tabelach`);
    }

    // --- Board chat privacy ---
    if (boardChatId) {
      const playerBoardMsgs = await countRows(
        client,
        users.player,
        "SELECT COUNT(*)::int AS c FROM public.chat_messages WHERE chat_id = $1",
        [boardChatId],
      );
      if (playerBoardMsgs === 0) {
        pass("R156-02", "Zawodnik nie widzi wiadomości czatu zarządu");
      } else {
        fail("R156-02", `Zawodnik widzi ${playerBoardMsgs} wiadomości board chat`);
      }

      const presidentBoardMsgs = await countRows(
        client,
        users.president,
        "SELECT COUNT(*)::int AS c FROM public.chat_messages WHERE chat_id = $1",
        [boardChatId],
      );
      if (presidentBoardMsgs > 0) {
        pass("R156-03", "Prezes ma dostęp do czatu zarządu");
      } else {
        fail("R156-03", "Prezes nie widzi czatu zarządu");
      }

      const sponsorBoardChats = await countRows(
        client,
        users.sponsor,
        "SELECT COUNT(*)::int AS c FROM public.team_chats WHERE club_id = $1 AND chat_type = 'board'",
        [CLUB_ID],
      );
      if (sponsorBoardChats === 0) {
        pass("R156-04", "Sponsor nie widzi czatu zarządu");
      } else {
        fail("R156-04", "Sponsor ma dostęp do czatu zarządu");
      }
    } else {
      skip("R156-02", "Brak seed board chat");
      skip("R156-03", "Brak seed board chat");
      skip("R156-04", "Brak seed board chat");
    }

    // --- Team chat isolation ---
    if (teamChatId) {
      const playerTeamMsgs = await countRows(
        client,
        users.player,
        "SELECT COUNT(*)::int AS c FROM public.chat_messages WHERE chat_id = $1",
        [teamChatId],
      );
      if (playerTeamMsgs > 0) {
        pass("R156-05", "Zawodnik widzi czat własnej drużyny");
      } else {
        fail("R156-05", "Zawodnik nie widzi czatu drużyny seniorów");
      }

      const sponsorTeamChats = await countRows(
        client,
        users.sponsor,
        "SELECT COUNT(*)::int AS c FROM public.team_chats WHERE club_id = $1 AND chat_type = 'team'",
        [CLUB_ID],
      );
      if (sponsorTeamChats === 0) {
        pass("R156-06", "Sponsor nie widzi czatów drużynowych");
      } else {
        fail("R156-06", "Sponsor widzi czaty drużynowe");
      }
    } else {
      skip("R156-05", "Brak seed team chat");
      skip("R156-06", "Brak seed team chat");
    }

    // --- Announcements board category ---
    if (boardAnnouncementId) {
      const playerBoardAnn = await countRows(
        client,
        users.player,
        "SELECT COUNT(*)::int AS c FROM public.announcements WHERE id = $1",
        [boardAnnouncementId],
      );
      if (playerBoardAnn === 0) {
        pass("R156-07", "Zawodnik nie widzi ogłoszenia kategorii board");
      } else {
        fail("R156-07", "Zawodnik widzi ogłoszenie board");
      }

      const presidentBoardAnn = await countRows(
        client,
        users.president,
        "SELECT COUNT(*)::int AS c FROM public.announcements WHERE id = $1",
        [boardAnnouncementId],
      );
      if (presidentBoardAnn === 1) {
        pass("R156-08", "Prezes widzi ogłoszenie board");
      } else {
        fail("R156-08", "Prezes nie widzi ogłoszenia board");
      }
    } else {
      skip("R156-07", "Brak seed board announcement");
      skip("R156-08", "Brak seed board announcement");
    }

    // --- Read receipts ---
    if (boardAnnouncementId) {
      const playerReadOthers = await countRows(
        client,
        users.player,
        `SELECT COUNT(*)::int AS c FROM public.announcement_reads WHERE announcement_id = $1 AND user_id <> $2`,
        [boardAnnouncementId, users.player],
      );
      if (playerReadOthers === 0) {
        pass("R156-09", "Zawodnik nie widzi cudzych read receipts");
      } else {
        fail("R156-09", "Wyciek listy odczytów ogłoszenia do zawodnika");
      }

      const ownerReadAll = await countRows(
        client,
        users.owner,
        "SELECT COUNT(*)::int AS c FROM public.announcement_reads WHERE announcement_id = $1",
        [boardAnnouncementId],
      );
      if (ownerReadAll >= 1) {
        pass("R156-10", "Właściciel widzi pełną listę read receipts");
      } else {
        fail("R156-10", "Właściciel nie widzi read receipts");
      }
    } else {
      skip("R156-09", "Brak seed board announcement");
      skip("R156-10", "Brak seed board announcement");
    }

    // --- Coach messages + RSVP scope ---
    if (coachMessageId) {
      const coachCanSee = await countRows(
        client,
        users.coach,
        "SELECT COUNT(*)::int AS c FROM public.coach_messages WHERE id = $1",
        [coachMessageId],
      );
      if (coachCanSee === 1) {
        pass("R156-11", "Trener widzi komunikat własnej drużyny");
      } else {
        fail("R156-11", "Trener nie widzi komunikatu drużyny");
      }

      const playerCanRespond = await canInsert(
        client,
        users.player,
        `INSERT INTO public.coach_message_responses (club_id, coach_message_id, user_id, response)
         VALUES ($1, $2, $3, 'yes') ON CONFLICT DO NOTHING`,
        [CLUB_ID, coachMessageId, users.player],
      );
      if (playerCanRespond) {
        pass("R156-12", "Zawodnik może RSVP na komunikat własnej drużyny");
      } else {
        fail("R156-12", "Zawodnik nie może RSVP (team scope)");
      }

      const fakeMessageId = "00000000-0000-4000-8000-000000009999";
      const playerFakeRsvp = await canInsert(
        client,
        users.player,
        `INSERT INTO public.coach_message_responses (club_id, coach_message_id, user_id, response)
         VALUES ($1, $2, $3, 'yes')`,
        [CLUB_ID, fakeMessageId, users.player],
      );
      if (!playerFakeRsvp) {
        pass("R156-13", "Zawodnik nie może RSVP na nieistniejący komunikat");
      } else {
        fail("R156-13", "RSVP bez walidacji coach_message_id");
      }
    } else {
      skip("R156-11", "Brak seed coach message");
      skip("R156-12", "Brak seed coach message");
      skip("R156-13", "Brak seed coach message");
    }

    // --- Parent via guardians (optional) ---
    const parentTeamAccess = await asUser(client, users.parent, async () => {
      const { rows } = await client.query(
        "SELECT COUNT(*)::int AS c FROM public.actor_communication_team_ids($1)",
        [CLUB_ID],
      );
      return Number(rows[0]?.c ?? 0);
    });
    if (parentTeamAccess > 0) {
      pass("R156-14", `Rodzic ma dostęp do ${parentTeamAccess} drużyn(y) dziecka`);
    } else {
      skip("R156-14", "Rodzic bez player_guardians — wymaga setup:stage7");
    }

    // --- Sponsor portal isolation ---
    const sponsorChats = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.team_chats WHERE club_id = $1 AND chat_type = 'sponsor'",
      [CLUB_ID],
    );
    if (sponsorChats <= 1) {
      pass("R156-15", `Sponsor widzi max 1 czat sponsorski (${sponsorChats})`);
    } else {
      fail("R156-15", `Sponsor widzi ${sponsorChats} czatów sponsorów — wyciek`);
    }

    const sponsorCoachMsgs = await countRows(
      client,
      users.sponsor,
      "SELECT COUNT(*)::int AS c FROM public.coach_messages WHERE club_id = $1 AND status = 'published'",
      [CLUB_ID],
    );
    if (sponsorCoachMsgs === 0) {
      pass("R156-16", "Sponsor nie widzi komunikatów trenera");
    } else {
      fail("R156-16", "Sponsor widzi komunikaty trenera");
    }

    // --- Push notification helpers (static SQL) ---
    const { rows: fnRows } = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN (
          'actor_can_access_board_communication',
          'actor_can_respond_coach_message',
          'actor_can_modify_coach_message'
        )
    `);
    if (fnRows.length === 3) {
      pass("R156-17", "Funkcje hardening security obecne w DB");
    } else {
      fail("R156-17", `Brak funkcji hardening (${fnRows.length}/3)`);
    }

    // --- Owner full access smoke ---
    const ownerAnn = await countRows(
      client,
      users.owner,
      "SELECT COUNT(*)::int AS c FROM public.announcements WHERE club_id = $1",
      [CLUB_ID],
    );
    if (ownerAnn >= 2) {
      pass("R156-18", "Właściciel widzi ogłoszenia (w tym draft/manage path)");
    } else {
      fail("R156-18", "Właściciel — niepełny dostęp do ogłoszeń");
    }
  } finally {
    await client.end();
  }

  console.log("\nETAP 15.6 Communication Hub — role / RLS audit\n");
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
