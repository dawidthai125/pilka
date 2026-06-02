#!/usr/bin/env node
/**
 * Pobiera aktualne dane ligowe (90minut + regionalnyfutbol), scala i importuje do League Hub.
 * Mapowanie: GLKS Mietków (źródła) → Piorun Wawrzeńczyce (strona klubu).
 *
 * npm run sync:league-live
 * npm run sync:league-live -- --dry-run
 * npm run sync:league-live -- --json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllLeagueSources } from "./lib/league-live-sources.mjs";
import { runLivePipeline } from "./lib/league-live-pipeline.mjs";
import { fetchSquadAndStats } from "./lib/league-squad-sources.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "fixtures/league/live");

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Użycie: npm run sync:league-live [--dry-run] [--json]

Pobiera tabelę i terminarz B Klasy Wrocław VII 2025/26 z mirrorów publicznych,
scala dane i synchronizuje do League Hub + moduł Mecze + publiczna /tabela.

Źródła: 90minut.pl (tabela/wyniki), regionalnyfutbol.pl (terminarz), regiowyniki.pl (kadra).
Oficjalna nazwa ligowa: GLKS Mietków → wyświetlanie: Piorun Wawrzeńczyce.
`);
    return;
  }

  console.log("Piorun — synchronizacja danych ligowych\n");
  const [fetched, squadData] = await Promise.all([fetchAllLeagueSources(), fetchSquadAndStats()]);
  const { merged } = fetched;

  console.log(`90minut.pl:        tabela ${fetched.ninetyMinut.tableRows}, mecze ${fetched.ninetyMinut.fixtureRows}`);
  console.log(`regionalnyfutbol:  tabela ${fetched.regionalnyFutbol.tableRows}, mecze ${fetched.regionalnyFutbol.fixtureRows}`);
  console.log(`regiowyniki:       kadra ${squadData.counts.merged} zawodników`);
  console.log(`Scalono:           tabela z ${merged.tableSource}, ${merged.fixtures.length} meczów`);
  if (squadData.statsNote) console.log(`Uwaga:             ${squadData.statsNote}`);

  if (merged.tableConflicts?.length) {
    console.log(`Konflikty tabeli (${merged.tableConflicts.length}):`);
    for (const c of merged.tableConflicts.slice(0, 5)) {
      console.log(`  - ${c.team}: 90minut ${c.primary} vs RF ${c.secondary}`);
    }
  }

  if (merged.glksMietkow) {
    const g = merged.glksMietkow;
    console.log(
      `\nGLKS Mietków (→ Piorun Wawrzeńczyce): ${g.position}. miejsce, ${g.points} pkt, ${g.goalsFor}:${g.goalsAgainst}`,
    );
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "source-meta.json"), JSON.stringify(fetched, null, 2) + "\n");
  writeFileSync(join(outDir, "squad-stats.json"), JSON.stringify(squadData, null, 2) + "\n");
  writeFileSync(
    join(outDir, "b-wroclaw-vii-fixtures.json"),
    JSON.stringify({ matches: merged.fixtures }, null, 2) + "\n",
  );

  if (args.dryRun) {
    console.log("\n[dry-run] Pominięto zapis do bazy.");
    if (args.json) console.log(JSON.stringify({ ok: true, dryRun: true, fetched }, null, 2));
    return;
  }

  const result = await runLivePipeline(
    merged,
    {
      fetchedAt: fetched.fetchedAt,
      tableSource: merged.tableSource,
      tableConflicts: merged.tableConflicts,
      glksMietkow: merged.glksMietkow,
    },
    squadData,
  );

  console.log(`\nImport: ${result.ingest.processed} rekordów (${result.ingest.failed} błędów)`);
  console.log(`Tabela publiczna: ${result.tableSynced} drużyn`);
  console.log(`Mecze: ${result.matchSync.processed} zsynchronizowanych`);
  console.log(
    `Kadra: ${result.squadSync.processed} wpisów w rejestrze (${result.squadSync.matched} istniejących dopasowań)`,
  );
  if (result.squadSync.playersSync) {
    const ps = result.squadSync.playersSync;
    console.log(
      `Zawodnicy FC OS: ${ps.created} utworzonych, ${ps.linked} powiązanych, ${ps.deactivated} demo nieaktywnych`,
    );
  }
  console.log(`Job ID: ${result.jobId}`);

  if (args.json) {
    console.log(JSON.stringify({ ok: true, ...result, fetched }, null, 2));
  } else {
    console.log("\nGotowe. Sprawdź /tabela, /mecze i /league w panelu.");
  }
}

main().catch((err) => {
  console.error("\nBłąd sync:", err.message);
  process.exit(1);
});
