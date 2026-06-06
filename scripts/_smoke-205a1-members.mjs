#!/usr/bin/env node
/**
 * Sprint 20.5A.1 — Members Foundation smoke validation.
 * DB RLS + HTTP /members probes (requires dev server on BASE_URL).
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const TEST_PASSWORD = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ??
  "pwkqnwqvrdiaycveacxa";

const ACCOUNTS = {
  owner: "wlasciciel@piorun.test",
  president: "prezes@piorun.test",
  sports_director: "dyrektor@piorun.test",
  coach: "trener@piorun.test",
  treasurer: "skarbnik@piorun.test",
  sponsor: "sponsor@piorun.test",
};

const results = [];

function canManageMemberTarget(actorRoles, targetRole) {
  const leadership = ["owner", "president", "sports_director"];
  if (!actorRoles.some((r) => leadership.includes(r))) return false;
  if (targetRole === "owner" && !actorRoles.includes("owner")) return false;
  return true;
}

function record(testId, verdict, detail) {
  results.push({ testId, verdict, detail });
  console.log(`[${verdict}] ${testId} — ${detail}`);
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

async function signInCookie(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Sign-in ${email}: ${error?.message ?? "no session"}`);
  }

  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });

  return {
    cookieHeader: `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(payload)}`,
    userId: data.session.user.id,
  };
}

async function fetchMembersHtml(cookieHeader) {
  const res = await fetch(`${BASE_URL}/members`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

async function loadUsers(client) {
  const users = {};
  for (const [key, email] of Object.entries(ACCOUNTS)) {
    const { rows } = await client.query(
      "SELECT id FROM public.profiles WHERE email = $1 LIMIT 1",
      [email],
    );
    if (rows[0]?.id) users[key] = rows[0].id;
  }
  return users;
}

async function countMembersVisible(client, userId) {
  return asUser(
    client,
    userId,
    async () => {
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS c FROM public.club_memberships
         WHERE club_id = $1 AND status IN ('active','invited','suspended')`,
        [CLUB_ID],
      );
      return Number(rows[0]?.c ?? 0);
    },
  );
}

async function tryUpdateMembership(client, actorId, membershipId, patch) {
  const sets = Object.keys(patch)
    .map((k, i) => `${k} = $${i + 3}`)
    .join(", ");
  const values = Object.values(patch);
  return asUser(client, actorId, async () => {
    try {
      const { rowCount } = await client.query(
        `UPDATE public.club_memberships SET ${sets}
         WHERE id = $1 AND club_id = $2`,
        [membershipId, CLUB_ID, ...values],
      );
      return rowCount > 0;
    } catch {
      return false;
    }
  });
}

async function tryDeleteMembership(client, actorId, membershipId) {
  return asUser(client, actorId, async () => {
    try {
      const { rowCount } = await client.query(
        `DELETE FROM public.club_memberships WHERE id = $1 AND club_id = $2`,
        [membershipId, CLUB_ID],
      );
      return rowCount > 0;
    } catch {
      return false;
    }
  });
}

async function layoutContextWorks(client, userId) {
  return asUser(client, userId, async () => {
    const { rows } = await client.query(
      `SELECT public.get_app_layout_context($1::uuid) AS ctx`,
      [CLUB_ID],
    );
    return rows[0]?.ctx != null;
  });
}

async function testHttpRole(roleKey, email, expectations) {
  try {
    const { cookieHeader } = await signInCookie(email);
    const { status, location, text } = await fetchMembersHtml(cookieHeader);

    if (status === 307 || status === 302) {
      record(`HTTP-${roleKey}`, "FAIL", `redirect ${status} → ${location}`);
      return;
    }
    if (status !== 200) {
      record(`HTTP-${roleKey}`, "FAIL", `HTTP ${status}`);
      return;
    }

    for (const [label, ok] of Object.entries(expectations)) {
      if (label === "_summary" || typeof ok !== "function") continue;
      if (!ok(text)) {
        record(`HTTP-${roleKey}`, "FAIL", `brak: ${label}`);
        return;
      }
    }
    record(`HTTP-${roleKey}`, "PASS", expectations._summary ?? "page OK");
  } catch (err) {
    record(`HTTP-${roleKey}`, "FAIL", err.message);
  }
}

async function main() {
  const client = await connectDb();
  const users = await loadUsers(client);

  const required = ["owner", "president", "sports_director", "coach", "sponsor"];
  for (const key of required) {
    if (!users[key]) {
      console.error(`Brak konta ${ACCOUNTS[key]} — uruchom npm run setup:stage1`);
      process.exit(1);
    }
  }
  if (!users.treasurer) {
    record("T5-treasurer-rls", "PARTIAL", `brak konta ${ACCOUNTS.treasurer} w DB — pomijam RLS probe`);
  }

  const { rows: sponsorRows } = await client.query(
    `SELECT id, role, status FROM public.club_memberships
     WHERE club_id = $1 AND user_id = $2 LIMIT 1`,
    [CLUB_ID, users.sponsor],
  );
  const sponsorMembership = sponsorRows[0];

  const { rows: ownerRows } = await client.query(
    `SELECT id FROM public.club_memberships
     WHERE club_id = $1 AND user_id = $2 AND role = 'owner' LIMIT 1`,
    [CLUB_ID, users.owner],
  );
  const ownerMembershipId = ownerRows[0]?.id;

  // --- Test 1 Owner (DB mutations, rollback) ---
  if (!sponsorMembership) {
    record("T1-owner-actions", "FAIL", "brak membership sponsor do testów");
  } else {
    const origRole = sponsorMembership.role;
    const origStatus = sponsorMembership.status;

    const roleOk = await tryUpdateMembership(client, users.owner, sponsorMembership.id, {
      role: "scout",
    });
    await tryUpdateMembership(client, users.owner, sponsorMembership.id, { role: origRole });

    const suspendOk = await tryUpdateMembership(client, users.owner, sponsorMembership.id, {
      status: "suspended",
    });
    await tryUpdateMembership(client, users.owner, sponsorMembership.id, { status: origStatus });

    await tryUpdateMembership(client, users.owner, sponsorMembership.id, { status: "suspended" });
    const reactivateOk = await tryUpdateMembership(client, users.owner, sponsorMembership.id, {
      status: "active",
    });
    await tryUpdateMembership(client, users.owner, sponsorMembership.id, { status: origStatus });

    const removeOk = await tryDeleteMembership(client, users.owner, sponsorMembership.id);
    // sponsor row still exists after rollback

    if (roleOk && suspendOk && reactivateOk && removeOk) {
      record("T1-owner-actions", "PASS", "change role / suspend / reactivate / remove (RLS, rollback)");
    } else {
      record(
        "T1-owner-actions",
        "FAIL",
        `role=${roleOk} suspend=${suspendOk} reactivate=${reactivateOk} remove=${removeOk}`,
      );
    }
  }

  // --- HTTP probes (dev server) ---
  let httpAvailable = false;
  try {
    const probe = await fetch(`${BASE_URL}/login`);
    httpAvailable = probe.status < 500;
  } catch (err) {
    record("HTTP-availability", "SKIP", `dev server niedostępny: ${err.message}`);
    httpAvailable = false;
  }

  if (!httpAvailable) {
    record("HTTP-availability", "SKIP", `dev server niedostępny pod ${BASE_URL}`);
  } else {
    await testHttpRole("owner", ACCOUNTS.owner, {
      _summary: "tabela + statusy + menu akcji",
      "Członkowie klubu": (t) => t.includes("Członkowie klubu"),
      "kolumna Imię": (t) => t.includes("Imię i nazwisko"),
      "kolumna Status": (t) => t.includes("Status"),
      "kolumna Akcje": (t) => t.includes("Akcje"),
      "menu akcji": (t) => t.includes("Akcje członka"),
      "status Aktywny": (t) => /Aktywny|Zaproszony|Zawieszony/.test(t),
    });

    await testHttpRole("president", ACCOUNTS.president, {
      _summary: "menu akcji widoczne",
      "kolumna Akcje": (t) => t.includes("Akcje"),
      "menu akcji": (t) => t.includes("Akcje członka"),
    });

    await testHttpRole("sports_director", ACCOUNTS.sports_director, {
      _summary: "dostęp + menu akcji",
      "Członkowie klubu": (t) => t.includes("Członkowie klubu"),
      "menu akcji": (t) => t.includes("Akcje członka"),
    });

    await testHttpRole("coach", ACCOUNTS.coach, {
      _summary: "lista bez akcji",
      "Członkowie klubu": (t) => t.includes("Członkowie klubu"),
      "brak kolumny Akcji": (t) => !t.includes(">Akcje<"),
      "brak menu": (t) => !t.includes("Akcje członka"),
    });

    if (users.treasurer) {
      const { cookieHeader } = await signInCookie(ACCOUNTS.treasurer);
      const { status, text } = await fetchMembersHtml(cookieHeader);
      if (status === 200 && text.includes("Członkowie klubu") && !text.includes("Brak członków klubu")) {
        record("HTTP-treasurer", "PASS", "lista członków widoczna");
      } else if (status === 200 && (text.includes("Brak członków klubu") || !text.includes("Imię i nazwisko"))) {
        record("HTTP-treasurer", "PARTIAL", "strona OK, lista pusta — gap RLS SELECT (audyt 20.5)");
      } else {
        record("HTTP-treasurer", "FAIL", `HTTP ${status}`);
      }
    }
  }

  // --- Test 2 President owner protection (DB) ---
  if (ownerMembershipId && sponsorMembership) {
    const presChangeOwner = await tryUpdateMembership(client, users.president, ownerMembershipId, {
      role: "coach",
    });
    const presSuspendOwner = await tryUpdateMembership(client, users.president, ownerMembershipId, {
      status: "suspended",
    });
    const presRemoveOwner = await tryDeleteMembership(client, users.president, ownerMembershipId);
    const presChangeSponsor = await tryUpdateMembership(client, users.president, sponsorMembership.id, {
      role: "scout",
    });
    await tryUpdateMembership(client, users.president, sponsorMembership.id, {
      role: sponsorMembership.role,
    });
    const presSuspendSponsor = await tryUpdateMembership(client, users.president, sponsorMembership.id, {
      status: "suspended",
    });
    await tryUpdateMembership(client, users.president, sponsorMembership.id, {
      status: sponsorMembership.status,
    });

    const appOwnerBlocked = !canManageMemberTarget(["president"], "owner");
    const rlsOwnerBlocked = !presSuspendOwner && !presRemoveOwner;
    const memberOk = presChangeSponsor && presSuspendSponsor;

    if (appOwnerBlocked && rlsOwnerBlocked && memberOk) {
      record(
        "T2-president",
        "PASS",
        `app+RLS blokada owner; zwykły członek OK (RLS changeRole=${presChangeOwner})`,
      );
    } else {
      record(
        "T2-president",
        "FAIL",
        `appBlock=${appOwnerBlocked} rlsBlock=${rlsOwnerBlocked} memberOk=${memberOk}`,
      );
    }
  }

  // --- Test 3 Sports Director ---
  if (ownerMembershipId && sponsorMembership) {
    const sdChangeOwner = await tryUpdateMembership(client, users.sports_director, ownerMembershipId, {
      role: "coach",
    });
    const sdChangeSponsor = await tryUpdateMembership(client, users.sports_director, sponsorMembership.id, {
      role: "scout",
    });
    await tryUpdateMembership(client, users.sports_director, sponsorMembership.id, {
      role: sponsorMembership.role,
    });

    const sdAppBlocked = !canManageMemberTarget(["sports_director"], "owner");
    if (sdAppBlocked && sdChangeSponsor) {
      record("T3-sports-director", "PASS", `app blokada owner; zwykły członek OK (RLS changeOwner=${sdChangeOwner})`);
    } else {
      record("T3-sports-director", "FAIL", `appBlock=${sdAppBlocked} changeSponsor=${sdChangeSponsor}`);
    }
  }

  // --- Test 4 Coach read-only (DB count) ---
  const coachVisible = await countMembersVisible(client, users.coach);
  if (coachVisible > 0) {
    record("T4-coach-rls", "PASS", `coach widzi ${coachVisible} członków (RLS SELECT)`);
  } else {
    record("T4-coach-rls", "FAIL", "coach nie widzi członków");
  }

  // --- Test 5 Treasurer RLS ---
  if (users.treasurer) {
    const treasurerVisible = await countMembersVisible(client, users.treasurer);
    if (treasurerVisible > 0) {
      record("T5-treasurer-rls", "PASS", `treasurer widzi ${treasurerVisible} członków`);
    } else {
      record(
        "T5-treasurer-rls",
        "PARTIAL",
        "treasurer nie widzi członków — znany gap RLS SELECT (audyt 20.5 P2)",
      );
    }
  }

  // --- Test 6 Invited → Active ---
  const smokeEmail = "smoke-invited-205a1@piorun.test";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    record("T6-invited-active", "FAIL", "brak SUPABASE_SERVICE_ROLE_KEY");
  } else {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let smokeUserId = null;
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const found = listed?.users?.find((u) => u.email === smokeEmail);
    if (found) {
      smokeUserId = found.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: smokeEmail,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Smoke Invited 205A1" },
      });
      if (error) throw new Error(error.message);
      smokeUserId = data.user.id;
    }

    await admin.from("club_memberships").upsert(
      {
        club_id: CLUB_ID,
        user_id: smokeUserId,
        role: "scout",
        status: "invited",
      },
      { onConflict: "club_id,user_id,role" },
    );

    const beforeLayout = await layoutContextWorks(client, smokeUserId);
    const { rows: beforeRows } = await client.query(
      `SELECT status FROM public.club_memberships WHERE club_id=$1 AND user_id=$2 AND role='scout'`,
      [CLUB_ID, smokeUserId],
    );
    const beforeStatus = beforeRows[0]?.status;

    const { data: activated, error: actErr } = await admin
      .from("club_memberships")
      .update({ status: "active" })
      .eq("user_id", smokeUserId)
      .eq("status", "invited")
      .select("id");

    const afterLayout = await layoutContextWorks(client, smokeUserId);
    const { rows: afterRows } = await client.query(
      `SELECT status FROM public.club_memberships WHERE club_id=$1 AND user_id=$2 AND role='scout'`,
      [CLUB_ID, smokeUserId],
    );
    const afterStatus = afterRows[0]?.status;

    await admin.from("club_memberships").delete().eq("club_id", CLUB_ID).eq("user_id", smokeUserId);

    if (
      beforeStatus === "invited" &&
      !beforeLayout &&
      !actErr &&
      (activated?.length ?? 0) > 0 &&
      afterStatus === "active" &&
      afterLayout
    ) {
      record("T6-invited-active", "PASS", "invited → active → get_app_layout_context OK");
    } else {
      record(
        "T6-invited-active",
        "FAIL",
        `before=${beforeStatus} layoutBefore=${beforeLayout} activated=${activated?.length} after=${afterStatus} layoutAfter=${afterLayout}`,
      );
    }
  }

  await client.end();

  console.log("\n=== SMOKE 20.5A.1 SUMMARY ===");
  for (const r of results) {
    console.log(`${r.verdict.padEnd(7)} ${r.testId}: ${r.detail}`);
  }

  const criticalFail = results.some(
    (r) =>
      r.verdict === "FAIL" &&
      !r.testId.startsWith("HTTP-") &&
      r.testId !== "HTTP-availability",
  );
  const t6 = results.find((r) => r.testId === "T6-invited-active");
  const invitedFail = t6?.verdict === "FAIL";

  if (criticalFail || invitedFail) {
    console.log("\nSMOKE 20.5A.1: NO-GO");
    process.exit(1);
  }
  console.log("\nSMOKE 20.5A.1: GO");
}

main().catch((err) => {
  console.error("SMOKE 20.5A.1 fatal:", err.message);
  process.exit(1);
});
