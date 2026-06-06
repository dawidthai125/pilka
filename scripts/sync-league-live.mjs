#!/usr/bin/env node
/**
 * Multi-club league sync — pobiera konfigurację z bazy per klub.
 *
 * npm run sync:league-live
 * npm run sync:league-live -- --dry-run
 * npm run sync:league-live -- --json
 * npm run sync:league-live -- --club-id=<uuid>
 */
import { runLeagueSync } from "./lib/league-sync-runtime.mjs";

function parseArgs(argv) {
  const clubIdArg = argv.find((a) => a.startsWith("--club-id="));
  return {
    dryRun: argv.includes("--dry-run"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
    clubId: clubIdArg ? clubIdArg.split("=")[1] : null,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Użycie: npm run sync:league-live [--dry-run] [--json] [--club-id=<uuid>]

Synchronizuje dane ligowe dla wszystkich klubów z aktywnym źródłem "Mirror live".
Konfiguracja (sezon, liga, URL-e) pochodzi z bazy — league_sources.config.
`);
    return;
  }

  const summary = await runLeagueSync({
    clubId: args.clubId,
    dryRun: args.dryRun,
    triggerSource: "cron",
    persistFixtures: true,
  });

  if (!summary.clubsTotal) {
    console.log("Brak aktywnych klubów z źródłem Mirror live.");
    if (args.json) console.log(JSON.stringify({ ok: true, clubs: [], results: [] }));
    return;
  }

  console.log(`FC OS — synchronizacja ligowa (${summary.clubsTotal} klubów)\n`);

  for (const result of summary.results) {
    if (!result.ok) {
      console.error(`\nBłąd sync [${result.slug}]:`, result.error);
      continue;
    }
    console.log(`\n=== ${result.publicName ?? result.slug} (${result.slug}) ===`);
    if (result.dryRun) {
      console.log("[dry-run] Pominięto zapis do bazy.");
      continue;
    }
    console.log(`Import: ${result.recordsProcessed} rekordów (${result.recordsFailed} błędów)`);
    if (result.jobId) console.log(`Job: ${result.jobId}`);
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (summary.clubsTotal > 1) {
    console.log(`\nPodsumowanie: ${summary.clubsSucceeded}/${summary.clubsTotal} klubów OK`);
    if (summary.clubsFailed) {
      console.log(
        "Błędy:",
        summary.results
          .filter((f) => !f.ok)
          .map((f) => `${f.slug}: ${f.error}`)
          .join("; "),
      );
    }
  } else if (summary.results[0]?.ok && !summary.results[0]?.dryRun) {
    console.log("\nGotowe. Sprawdź /tabela, /mecze i /league w panelu.");
  }

  if (summary.clubsFailed) process.exit(1);
}

main().catch((err) => {
  console.error("\nBłąd sync:", err.message);
  process.exit(1);
});
