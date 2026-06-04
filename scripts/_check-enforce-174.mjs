import dotenv from "dotenv";
import { connectDb } from "./lib/db-client.mjs";
import { join } from "node:path";
dotenv.config({ path: join(".env.local") });
const c = await connectDb();
const r = await c.query(
  `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND proname LIKE 'enforce_%'
   ORDER BY proname`,
);
console.log(r.rows.map((x) => x.proname).join("\n"));
await c.end();
