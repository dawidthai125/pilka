#!/usr/bin/env node
/** Emit sprint-173-migration-classification.md from JSON */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(
  readFileSync(join(root, "docs/architecture/sprint-173-migration-classification.json"), "utf8"),
);

const lines = [
  "# Sprint 17.3 — Migration Classification",
  "",
  `Generated: ${data.generatedAt.slice(0, 10)}`,
  "",
  "| Migration | Categories | In Baseline |",
  "|-----------|------------|-------------|",
];

for (const row of data.rows) {
  lines.push(`| \`${row.migration}\` | ${row.categories.join(", ")} | ${row.inBaseline ? "✅" : "❌"} |`);
}

lines.push("");
lines.push(`**Total:** ${data.totalMigrations} · **Baseline sources:** ${data.baselineSourceCount} · **Archived:** ${data.excludedCount}`);

writeFileSync(join(root, "docs/architecture/sprint-173-migration-classification.md"), lines.join("\n"), "utf8");
console.log("Written sprint-173-migration-classification.md");
