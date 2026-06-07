#!/usr/bin/env node
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const client = await connectDb();
try {
  const { rows } = await client.query(
    `SELECT cm.id, cm.user_id, cm.role, cm.status, p.email, p.full_name
     FROM club_memberships cm
     JOIN profiles p ON p.id = cm.user_id
     WHERE cm.club_id = $1
     ORDER BY cm.role = 'owner' DESC, p.full_name`,
    [CLUB_ID],
  );
  console.log("COUNT", rows.length);
  for (const row of rows) console.log(JSON.stringify(row));
} finally {
  await client.end();
}
