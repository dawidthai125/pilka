#!/usr/bin/env node
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSupabaseStubs } from "./staging-apply-migrations-175.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, `.staging-pg-debug-${Date.now()}`);

function normalizeSql(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u26a0\ufe0f/g, "")
    .replace(/[\u2013\u2014]/g, "-");
}

async function run() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  mkdirSync(dataDir, { recursive: true });
  const ep = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: 55435,
    persistent: false,
  });
  await ep.initialise();
  await ep.start();
  const client = ep.getPgClient();
  await client.connect();
  await ensureSupabaseStubs(client);
  await client.query(normalizeSql(readFileSync(join(root, "supabase/baseline.sql"), "utf8")));
  const { rows } = await client.query(
    "SELECT count(*)::int AS c FROM pg_tables WHERE schemaname='public'",
  );
  console.log("baseline OK, tables:", rows[0].c);

  const patch = normalizeSql(readFileSync(join(root, "supabase/prod-parity-patch.sql"), "utf8"));
  try {
    await client.query(patch);
    console.log("FULL PATCH PASS");
  } catch (e) {
    console.error("FULL PATCH FAIL:", e.message);
    const pos = e.position ? Number(e.position) : 0;
    if (pos) {
      console.error("--- context ---");
      console.error(patch.slice(Math.max(0, pos - 400), pos + 400));
    }
    process.exitCode = 1;
  }
  await client.end();
  await ep.stop();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
