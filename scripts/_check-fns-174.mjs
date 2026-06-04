import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";
import { join } from "node:path";
dotenv.config({ path: join(".env.local") });
const fns = [
  "user_has_club_permission",
  "enforce_content_post_reference_consistency",
  "get_finance_dashboard_totals",
  "actor_can_manage_finance",
];
const c = await connectDb();
for (const fn of fns) {
  const r = await c.query(
    `SELECT EXISTS(
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = $1
     ) AS ok`,
    [fn],
  );
  console.log(fn, r.rows[0].ok ? "YES" : "NO");
}
await c.end();
