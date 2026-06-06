#!/usr/bin/env node
/**
 * Sprint 17.4 — runtime impact scan for missing tables.
 */
import { readFileSync, writeFileSync, readdirSync, readFileSync as read } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inventory = JSON.parse(
  readFileSync(join(root, "docs/archive/17x-infrastructure/sprint-174-parity-inventory.json"), "utf8"),
);

const SRC_DIRS = ["src", "scripts"];

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walkFiles(p, acc);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

const files = SRC_DIRS.flatMap((d) => walkFiles(join(root, d)));

function scanTable(table) {
  const hits = { select: [], insert: [], update: [], from: [], rpc: [] };
  const patterns = {
    from: new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`, "g"),
    insert: new RegExp(`insert\\(['"\`]${table}['"\`]\\)`, "gi"),
    update: new RegExp(`update\\(['"\`]${table}['"\`]\\)`, "gi"),
    select: new RegExp(`['"\`]${table}['"\`]`, "g"),
  };

  for (const file of files) {
    const content = read(file, "utf8");
    const rel = file.replace(root + "\\", "").replace(root + "/", "");
    if (patterns.from.test(content)) hits.from.push(rel);
    if (patterns.insert.test(content)) hits.insert.push(rel);
    if (patterns.update.test(content)) hits.update.push(rel);
    if (content.includes(table)) hits.select.push(rel);
  }

  const active =
    hits.from.length > 0 || hits.insert.length > 0 || hits.update.length > 0
      ? "ACTIVE"
      : hits.select.length > 0
        ? "INACTIVE"
        : "UNKNOWN";

  return { table, status: active, hits: { from: [...new Set(hits.from)], insert: [...new Set(hits.insert)], update: [...new Set(hits.update)], refs: [...new Set(hits.select)].slice(0, 8) } };
}

const moduleMap = inventory.byModule;
const rows = inventory.missing.tables.map((table) => {
  const scan = scanTable(table);
  const mod = Object.entries(moduleMap).find(([, tables]) => tables.includes(table))?.[0] ?? "Other";
  let runtime = "A";
  if (scan.status === "ACTIVE") runtime = "A";
  else if (scan.status === "INACTIVE") runtime = "B";
  else runtime = "C";

  return {
    table,
    module: mod,
    runtimeStatus: scan.status,
    classification: runtime === "A" ? "REQUIRED" : runtime === "B" ? "OPTIONAL" : "UNKNOWN",
    codeRefs: scan.hits.from.length + scan.hits.insert.length + scan.hits.update.length,
    queryFiles: scan.hits.from.slice(0, 5),
    typeRefs: scan.hits.refs.slice(0, 3),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    active: rows.filter((r) => r.runtimeStatus === "ACTIVE").length,
    inactive: rows.filter((r) => r.runtimeStatus === "INACTIVE").length,
    unknown: rows.filter((r) => r.runtimeStatus === "UNKNOWN").length,
    required: rows.filter((r) => r.classification === "REQUIRED").length,
    optional: rows.filter((r) => r.classification === "OPTIONAL").length,
  },
  rows,
  potentialErrors: rows
    .filter((r) => r.runtimeStatus === "ACTIVE")
    .map((r) => ({
      table: r.table,
      error: `Dashboard query to ${r.table} fails with "relation does not exist" on prod`,
      files: r.queryFiles,
    })),
};

writeFileSync(join(root, "docs/archive/17x-infrastructure/sprint-174-runtime-impact.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log("potentialErrors:", report.potentialErrors.length);
