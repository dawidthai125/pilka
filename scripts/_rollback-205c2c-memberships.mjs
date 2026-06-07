#!/usr/bin/env node
/**
 * Rollback Sprint 20.5C.2C smoke — re-insert deleted club_memberships for Piorun.
 * Uses canonical seed roles from _rollback-205c2b-roles.mjs + extended roster.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/** Canonical memberships to restore after bulk-remove smoke. */
const RESTORE_TARGETS = [
  { email: "sponsor@piorun.test", role: "sponsor", status: "active" },
  { email: "rodzic@piorun.test", role: "parent", status: "active" },
  { email: "trener@piorun.test", role: "coach", status: "active" },
  { email: "zawodnik@piorun.test", role: "player", status: "active" },
  { email: "prezes@piorun.test", role: "president", status: "active" },
  { email: "skarbnik@piorun.test", role: "treasurer", status: "active" },
  { email: "dyrektor@piorun.test", role: "sports_director", status: "active" },
];

const client = await connectDb();
try {
  const before = await client.query(
    `SELECT p.email, p.full_name, cm.role, cm.status
     FROM club_memberships cm
     JOIN profiles p ON p.id = cm.user_id
     WHERE cm.club_id = $1
     ORDER BY p.email`,
    [CLUB_ID],
  );
  console.log("=== BEFORE ROLLBACK ===");
  console.log("count:", before.rows.length);
  for (const row of before.rows) {
    console.log(`${row.email} | ${row.full_name ?? "—"} | ${row.role} | ${row.status}`);
  }

  let restored = 0;
  let alreadyPresent = 0;
  let missingProfile = 0;

  for (const t of RESTORE_TARGETS) {
    const profile = await client.query(
      `SELECT id, full_name FROM profiles WHERE email = $1 LIMIT 1`,
      [t.email],
    );
    if (!profile.rows[0]) {
      console.log(`SKIP ${t.email}: brak profilu`);
      missingProfile++;
      continue;
    }

    const existing = await client.query(
      `SELECT id FROM club_memberships
       WHERE club_id = $1 AND user_id = $2 AND role = $3`,
      [CLUB_ID, profile.rows[0].id, t.role],
    );

    if (existing.rows[0]) {
      await client.query(
        `UPDATE club_memberships
         SET status = $2, updated_at = now()
         WHERE id = $1`,
        [existing.rows[0].id, t.status],
      );
      console.log(`OK present ${t.email} (${t.role})`);
      alreadyPresent++;
      continue;
    }

    const ins = await client.query(
      `INSERT INTO club_memberships (club_id, user_id, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       RETURNING id`,
      [CLUB_ID, profile.rows[0].id, t.role, t.status],
    );
    console.log(`RESTORED ${t.email} (${t.role}) membership_id=${ins.rows[0].id}`);
    restored++;
  }

  const after = await client.query(
    `SELECT p.email, p.full_name, cm.role, cm.status
     FROM club_memberships cm
     JOIN profiles p ON p.id = cm.user_id
     WHERE cm.club_id = $1
     ORDER BY p.email`,
    [CLUB_ID],
  );
  console.log("\n=== AFTER ROLLBACK ===");
  console.log("count:", after.rows.length);
  for (const row of after.rows) {
    console.log(`${row.email} | ${row.full_name ?? "—"} | ${row.role} | ${row.status}`);
  }
  console.log(
    `\nSUMMARY restored=${restored} alreadyPresent=${alreadyPresent} missingProfile=${missingProfile}`,
  );
} finally {
  await client.end();
}
