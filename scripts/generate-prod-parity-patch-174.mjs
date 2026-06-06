#!/usr/bin/env node
/**
 * Sprint 17.4 — generate supabase/prod-parity-patch.sql (design artifact, do NOT apply to prod).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIORUN = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/** Source migrations covering all 44 missing tables + dependent objects. */
const PATCH_SOURCES = [
  "20260601100000_finance_module.sql",
  "20260601102000_finance_audit_hardening.sql",
  "20260602100000_inventory_module.sql",
  "20260602102000_inventory_audit_hardening.sql",
  "20260602103000_inventory_audit_hardening.sql",
  "20260604100000_integrations_module.sql",
  "20260604102000_integrations_audit_hardening.sql",
  "20260605100000_academy_module.sql",
  "20260605102000_academy_audit_hardening.sql",
  "20260605103000_academy_audit_fixes.sql",
];

/** Audit hardening on prod modules that were partially applied. */
const SUPPLEMENT_SOURCES = [
  "20260531183000_matches_audit_hardening.sql",
  "20260617123000_stage15a_audit_hardening.sql",
];

function stripClubData(sql) {
  let out = sql.replace(
    /DO \$\$[\s\S]*?v_club_id UUID := 'a1b2c3d4[\s\S]*?END \$\$;\s*/gi,
    "-- [stripped: club-specific DO block]\n",
  );
  const lines = out.split("\n");
  const kept = [];
  let skip = false;
  let skipReason = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!skip && /^SELECT\b/i.test(trimmed)) {
      let j = i;
      let buf = "";
      while (j < lines.length) {
        buf += lines[j] + "\n";
        if (lines[j].trim().endsWith(";")) break;
        j++;
      }
      if (
        buf.includes(PIORUN) ||
        /SELECT public\.refresh_/i.test(buf) ||
        /FROM public\.inventory_items\s*\n\s*(-- \[stripped|$)/i.test(buf)
      ) {
        kept.push("-- [stripped: club-specific or maintenance SELECT]");
        i = j;
        continue;
      }
    }

    if (!skip && /^INSERT INTO public\./i.test(trimmed) && !/^INSERT INTO storage\./i.test(trimmed)) {
      skip = true;
      skipReason = "INSERT";
    }
    if (!skip && /^UPDATE public\./i.test(trimmed)) {
      skip = true;
      skipReason = "UPDATE";
    }
    if (!skip && /^DELETE FROM public\./i.test(trimmed)) {
      skip = true;
      skipReason = "DELETE";
    }
    if (!skip && trimmed.includes(PIORUN)) {
      skip = true;
      skipReason = "club reference";
    }
    if (skip) {
      if (trimmed.endsWith(";")) {
        kept.push(`-- [stripped: ${skipReason}]`);
        skip = false;
      }
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function makeIdempotent(sql) {
  let out = sql;

  out = out.replace(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/g, "CREATE TABLE IF NOT EXISTS public.$1");
  out = out.replace(/CREATE UNIQUE INDEX (?:IF NOT EXISTS )?(\w+)/g, "CREATE UNIQUE INDEX IF NOT EXISTS $1");
  out = out.replace(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/g, "CREATE INDEX IF NOT EXISTS $1");

  out = out.replace(
    /CREATE TYPE public\.(\w+) AS ENUM \(([\s\S]*?)\);/g,
    (_m, name, body) => `DO $$ BEGIN
  CREATE TYPE public.${name} AS ENUM (${body});
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`,
  );

  out = out.replace(
    /ALTER TABLE public\.(\w+)\s+ADD CONSTRAINT (\w+)\s+([\s\S]*?);/g,
    (_m, table, name, rest) => `DO $$ BEGIN
  ALTER TABLE public.${table} ADD CONSTRAINT ${name} ${rest};
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`,
  );

  out = out.replace(
    /CREATE POLICY (?:"([^"]+)"|(\w+))\s+ON (public\.\w+|storage\.objects)/g,
    (_m, quoted, unquoted, table) => {
      const name = quoted || unquoted;
      return `DROP POLICY IF EXISTS ${name} ON ${table};\nCREATE POLICY ${name} ON ${table}`;
    },
  );

  out = out.replace(
    /CREATE TRIGGER (\w+)\s+([\s\S]*?)ON (public\.\w+|storage\.\w+)/g,
    (_m, name, middle, table) => {
      if (middle.includes(`DROP TRIGGER IF EXISTS ${name}`)) {
        return `CREATE TRIGGER ${name} ${middle}ON ${table}`;
      }
      return `DROP TRIGGER IF EXISTS ${name} ON ${table};\nCREATE TRIGGER ${name} ${middle}ON ${table}`;
    },
  );

  out = out.replace(/(DROP TRIGGER IF EXISTS \w+ ON [\w.]+\n)\1+/g, "$1");

  return out;
}

function loadMigration(file) {
  const raw = readFileSync(join(root, "supabase/migrations", file), "utf8");
  return makeIdempotent(stripClubData(raw));
}

function main() {
  const header = `-- FC OS Production Parity Patch
-- Sprint 17.4 — forward-only schema alignment (DESIGN ARTIFACT)
-- Generated: ${new Date().toISOString().slice(0, 10)}
--
-- Brings production from 104 → 148 tables (adds Finance, Inventory, Academy, Integrations)
-- Also adds missing audit functions on Content Hub and Matches modules.
--
-- Contains ONLY: tables, enums, indexes, constraints, RLS, functions, triggers
-- Excludes: INSERT, UPDATE, DELETE, club seeds, Piorun data
--
-- ⚠️  DO NOT apply to production without:
--     1. Supabase PITR backup verified
--     2. Staging validation (see docs/archive/17x-infrastructure/sprint-174-staging-plan.md)
--     3. Maintenance window approval
--
-- Apply order (staging first):
--   baseline.sql (new projects only)
--   prod-parity-patch.sql (existing prod / staging clone)

BEGIN;

`;

  const sections = [];

  sections.push("-- =============================================================================\n-- MODULE PATCHES (44 missing tables)\n-- =============================================================================\n");

  for (const file of PATCH_SOURCES) {
    sections.push(`\n-- --- Source: ${file} ---\n`);
    sections.push(loadMigration(file));
  }

  sections.push("\n-- =============================================================================\n-- SUPPLEMENT: audit hardening missing on prod\n-- =============================================================================\n");

  for (const file of SUPPLEMENT_SOURCES) {
    sections.push(`\n-- --- Source: ${file} ---\n`);
    sections.push(loadMigration(file));
  }

  const footer = `
COMMIT;

-- End prod-parity-patch (${PATCH_SOURCES.length} module files + ${SUPPLEMENT_SOURCES.length} supplements)
`;

  const out = header + sections.join("\n") + footer;
  writeFileSync(join(root, "supabase/prod-parity-patch.sql"), out, "utf8");

  const stats = {
    bytes: out.length,
    tables: (out.match(/CREATE TABLE IF NOT EXISTS public\.\w+/g) ?? []).length,
    enums: (out.match(/CREATE TYPE public\.\w+/g) ?? []).length,
    functions: (out.match(/CREATE OR REPLACE FUNCTION public\.\w+/g) ?? []).length,
    policies: (out.match(/CREATE POLICY/g) ?? []).length,
    stripped: (out.match(/\[stripped:/g) ?? []).length,
    piorunRefs: (out.match(new RegExp(PIORUN, "g")) ?? []).length,
  };

  writeFileSync(join(root, "docs/archive/17x-infrastructure/sprint-174-patch-stats.json"), JSON.stringify(stats, null, 2));
  console.log(JSON.stringify(stats, null, 2));
}

main();
