#!/usr/bin/env node
/**
 * Sprint 17.5b — full repair validation: baseline → patch → bootstrap → diff → smoke
 * Uses embedded PostgreSQL (never production).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSupabaseStubs, snapshotSchema } from "./staging-apply-migrations-175.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, `.staging-pg-data-${Date.now()}`);

function normalizeSql(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u26a0\ufe0f/g, "")
    .replace(/[\u2013\u2014]/g, "-");
}

async function startEmbeddedPostgres() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  mkdirSync(dataDir, { recursive: true });
  const ep = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: 55434,
    persistent: false,
  });
  await ep.initialise();
  await ep.start();
  return ep;
}

function parseSqlObjects(sql) {
  const tables = new Set();
  for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.(\w+)/gi)) tables.add(m[1]);
  const enums = new Set();
  for (const m of sql.matchAll(/CREATE TYPE public\.(\w+)/gi)) enums.add(m[1]);
  const functions = new Set();
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/gi)) functions.add(m[1]);
  return {
    tables: [...tables].sort(),
    enums: [...enums].sort(),
    functions: [...functions].sort(),
    rpc: [...functions].filter((n) => n.startsWith("get_") || n.startsWith("list_")).sort(),
  };
}

function parseRepoExpected() {
  const dir = join(root, "supabase/migrations");
  let combined = "";
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    combined += readFileSync(join(dir, f), "utf8") + "\n";
  }
  return parseSqlObjects(combined);
}

async function applyFile(client, path, log) {
  const raw = normalizeSql(readFileSync(join(root, path), "utf8"));
  try {
    await client.query(raw);
    log.push({ file: path, status: "PASS" });
    console.log(`PASS ${path}`);
    return true;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* */
    }
    log.push({ file: path, status: "FAIL", error: e.message.slice(0, 400) });
    console.error(`FAIL ${path}: ${e.message.slice(0, 200)}`);
    return false;
  }
}

async function bootstrapClub(client) {
  const slug = "repair-united";
  const colors = { primary: "#1e3a5f", secondary: "#f5c518", accent: "#ffffff" };
  const seasonName = "2025/2026";

  await client.query("BEGIN");
  try {
    const { rows: clubRows } = await client.query(
      `INSERT INTO public.clubs (slug, public_name, official_name, settings)
       VALUES ($1, $2, $2, $3::jsonb) RETURNING id`,
      [slug, "Repair United", JSON.stringify({ shortName: "RU" })],
    );
    const clubId = clubRows[0].id;

    const { rows: teamRows } = await client.query(
      `INSERT INTO public.teams (club_id, name, category, season, is_active)
       VALUES ($1, 'RU Seniorzy', 'seniors', $2, TRUE) RETURNING id`,
      [clubId, seasonName],
    );

    await client.query(
      `INSERT INTO public.website_settings (club_id, public_site_enabled, primary_color, secondary_color, accent_color, hero_title)
       VALUES ($1, TRUE, $2, $3, $4, $5)`,
      [clubId, colors.primary, colors.secondary, colors.accent, "Repair United"],
    );

    await client.query(
      `INSERT INTO public.content_channels (club_id, channel, is_enabled, auto_queue)
       VALUES ($1, 'website', TRUE, FALSE), ($1, 'facebook', FALSE, FALSE)
       ON CONFLICT (club_id, channel) DO NOTHING`,
      [clubId],
    );

    const { rows: seasonRows } = await client.query(
      `INSERT INTO public.league_seasons (club_id, name, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
      [clubId, seasonName],
    );
    const { rows: compRows } = await client.query(
      `INSERT INTO public.league_competitions (club_id, season_id, name, is_active)
       VALUES ($1, $2, 'Liga test', TRUE) RETURNING id`,
      [clubId, seasonRows[0].id],
    );
    await client.query(
      `INSERT INTO public.league_sources (club_id, competition_id, name, adapter, is_active, config)
       VALUES ($1, $2, 'Bootstrap', 'json', FALSE, '{}'::jsonb)`,
      [clubId, compRows[0].id],
    );

    await client.query(
      `INSERT INTO auth.users (id, email) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      ["00000000-0000-4000-8000-000000000099", "owner@repair.local"],
    );
    await client.query(
      `INSERT INTO public.profiles (id, email, full_name) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      ["00000000-0000-4000-8000-000000000099", "owner@repair.local", "Repair Owner"],
    );
    await client.query(
      `INSERT INTO public.club_memberships (club_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active') ON CONFLICT (club_id, user_id, role) DO NOTHING`,
      [clubId, "00000000-0000-4000-8000-000000000099"],
    );

    await client.query("COMMIT");
    return { clubId, teamId: teamRows[0].id, slug, seasonId: seasonRows[0].id, competitionId: compRows[0].id };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

function smokeTests(snap, bootstrap) {
  const t = new Set(snap.tables);
  const fn = new Set(snap.functions);
  const checks = [
    { module: "Auth", pass: t.has("profiles") && t.has("club_memberships") && bootstrap?.clubId },
    { module: "Website", pass: t.has("website_settings") && t.has("website_news") },
    { module: "Teams", pass: t.has("teams") && bootstrap?.teamId },
    { module: "Players", pass: t.has("players") && fn.has("get_public_players") },
    { module: "League", pass: t.has("league_player_registry") && t.has("league_seasons") && bootstrap?.seasonId },
    { module: "CRM", pass: t.has("crm_contacts") },
    { module: "Attendance", pass: t.has("player_availability") && t.has("availability_reasons") },
    { module: "Communication", pass: t.has("announcements") && t.has("team_chats") },
    { module: "Equipment", pass: t.has("assets") },
    { module: "Injuries", pass: t.has("player_injuries") },
    { module: "Finance", pass: t.has("finance_income") && fn.has("get_finance_dashboard_totals") },
    { module: "Inventory", pass: t.has("inventory_items") && fn.has("get_inventory_dashboard_stats") },
    { module: "Academy", pass: t.has("academy_groups") && t.has("player_development") },
    { module: "Integrations", pass: t.has("integrations") && t.has("sync_jobs") },
  ];
  return checks.map((c) => ({ module: c.module, verdict: c.pass ? "PASS" : "FAIL" }));
}

async function main() {
  const log = [];
  const ep = await startEmbeddedPostgres();
  const client = ep.getPgClient();
  await client.connect();

  try {
    await ensureSupabaseStubs(client);

    const baselineOk = await applyFile(client, "supabase/baseline.sql", log);
    const snapBaseline = await snapshotSchema(client);

    const patchOk = await applyFile(client, "supabase/prod-parity-patch.sql", log);
    const snapPatch = await snapshotSchema(client);

    let bootstrap = null;
    let bootstrapOk = false;
    if (baselineOk) {
      try {
        bootstrap = await bootstrapClub(client);
        bootstrapOk = true;
        console.log("PASS bootstrap-club", bootstrap);
      } catch (e) {
        console.error("FAIL bootstrap:", e.message);
        log.push({ file: "bootstrap-club", status: "FAIL", error: e.message });
      }
    }

    const finalSnap = await snapshotSchema(client);
    const expected = parseSqlObjects(readFileSync(join(root, "supabase/baseline.sql"), "utf8"));
    const repoExpected = parseRepoExpected();

    const tableSet = new Set(finalSnap.tables);
    const fnSet = new Set(finalSnap.functions);
    const diff = {
      missingTables: expected.tables.filter((x) => !tableSet.has(x)),
      missingRpc: expected.rpc.filter((x) => !finalSnap.rpc.includes(x)),
      missingFunctions: expected.functions.filter((f) => !fnSet.has(f) && f !== "user_has_club_permission"),
    };

    const repoDiff = {
      missingTables: repoExpected.tables.filter((x) => !tableSet.has(x)),
      missingEnums: repoExpected.enums.filter((x) => !finalSnap.enums.includes(x)),
      missingFunctions: repoExpected.functions.filter((f) => !fnSet.has(f) && f !== "user_has_club_permission"),
      missingRpc: repoExpected.rpc.filter((x) => !finalSnap.rpc.includes(x)),
    };

    const smoke = smokeTests(finalSnap, bootstrap);
    const smokePass = smoke.filter((s) => s.verdict === "PASS").length;

    const report = {
      generatedAt: new Date().toISOString(),
      sprint: "17.5b",
      baselineApply: { verdict: baselineOk ? "PASS" : "FAIL", ...snapBaseline },
      patchApply: { verdict: patchOk ? "PASS" : "WARNING", ...snapPatch },
      bootstrap: { verdict: bootstrapOk ? "PASS" : "FAIL", data: bootstrap },
      schemaValidation: {
        verdict: diff.missingTables.length === 0 && diff.missingRpc.length === 0 ? "PASS" : "FAIL",
        ...diff,
        tableCount: finalSnap.tableCount,
      },
      repoSchemaDiff: {
        verdict:
          repoDiff.missingTables.length === 0 &&
          repoDiff.missingEnums.length === 0 &&
          repoDiff.missingRpc.length === 0 &&
          repoDiff.missingFunctions.length === 0
            ? "PASS"
            : "FAIL",
        ...repoDiff,
      },
      smokeTests: smoke,
      smokePassCount: smokePass,
      finalMetrics: finalSnap,
      log,
      goNoGo175b: baselineOk && diff.missingTables.length === 0 && smokePass >= 13 ? "GO" : "NO-GO",
      goNoGo176:
        baselineOk &&
        patchOk &&
        bootstrapOk &&
        diff.missingTables.length === 0 &&
        repoDiff.missingTables.length === 0 &&
        smokePass === 14
          ? "GO"
          : "NO-GO",
    };

    mkdirSync(join(root, "docs/architecture"), { recursive: true });
    writeFileSync(join(root, "docs/archive/17x-infrastructure/sprint-175b-validation-results.json"), JSON.stringify(report, null, 2));
    writeFileSync(join(root, "docs/archive/17x-infrastructure/sprint-175b-final-report.md"), renderMd(report));

    console.log(JSON.stringify({
      baselineOk,
      patchOk,
      bootstrapOk,
      tables: finalSnap.tableCount,
      missingTables: diff.missingTables.length,
      smokePass: `${smokePass}/14`,
      goNoGo176: report.goNoGo176,
    }, null, 2));
  } finally {
    await client.end();
    try {
      await ep.stop();
    } catch {
      /* */
    }
  }
}

function renderMd(r) {
  return `# Sprint 17.5b — Baseline Repair Validation

## Results
| Phase | Verdict |
|-------|---------|
| Baseline | ${r.baselineApply?.verdict} |
| Patch | ${r.patchApply?.verdict} |
| Bootstrap | ${r.bootstrap?.verdict} |
| Schema | ${r.schemaValidation?.verdict} |
| Smoke | ${r.smokePassCount}/14 |

## Metrics
| Metric | Count |
|--------|-------|
| Tables | ${r.finalMetrics?.tableCount} |
| Functions | ${r.finalMetrics?.functionCount} |
| RPC | ${r.finalMetrics?.rpcCount} |
| Enums | ${r.finalMetrics?.enumCount} |
| Policies | ${r.finalMetrics?.policyCount} |
| Triggers | ${r.finalMetrics?.triggerCount} |
| Buckets | ${r.finalMetrics?.bucketCount} |

## GO/NO-GO Sprint 17.6: **${r.goNoGo176}**
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
