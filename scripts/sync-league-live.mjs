#!/usr/bin/env node
/**
 * Multi-club league sync — pobiera konfigurację z bazy per klub.
 *
 * npm run sync:league-live
 * npm run sync:league-live -- --dry-run
 * npm run sync:league-live -- --json
 * npm run sync:league-live -- --club-id=<uuid>
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllLeagueSources } from "./lib/league-live-sources.mjs";
import { createPipelineClient, runLivePipeline } from "./lib/league-live-pipeline.mjs";
import { fetchSquadAndStats } from "./lib/league-squad-sources.mjs";
import { listLeagueSyncClubs, loadLeagueClubConfig } from "./lib/league-club-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "fixtures/league/live");

function parseArgs(argv) {
  const clubIdArg = argv.find((a) => a.startsWith("--club-id="));
  return {
    dryRun: argv.includes("--dry-run"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
    clubId: clubIdArg ? clubIdArg.split("=")[1] : null,
  };
}

async function syncOneClub(supabase, clubSummary, args) {
  const clubConfig = await loadLeagueClubConfig(supabase, clubSummary.clubId);
  clubConfig.slug = clubSummary.slug;

  console.log(`\n=== ${clubSummary.publicName} (${clubSummary.slug}) ===`);

  const [fetched, squadData] = await Promise.all([
    fetchAllLeagueSources(clubConfig),
    fetchSquadAndStats(clubConfig),
  ]);
  const { merged } = fetched;

  console.log(`90minut.pl:        tabela ${fetched.ninetyMinut.tableRows}, mecze ${fetched.ninetyMinut.fixtureRows}`);
  console.log(`regionalnyfutbol:  tabela ${fetched.regionalnyFutbol.tableRows}, mecze ${fetched.regionalnyFutbol.fixtureRows}`);
  console.log(`regiowyniki:       kadra ${squadData.counts.merged} zawodników`);
  if (squadData.lnp?.enabled) {
    console.log(
      `mPZPN API:         ${squadData.lnp.ok ? squadData.lnp.count + " zaw." : squadData.lnp.reason ?? "błąd"}`,
    );
  }
  console.log(`Scalono:           tabela z ${merged.tableSource}, ${merged.fixtures.length} meczów`);

  const ownRow = merged.ownTeamRow ?? merged.glksMietkow;
  if (ownRow) {
    console.log(
      `${clubConfig.ownLeagueName} (→ ${clubConfig.ownDisplayName}): ${ownRow.position}. miejsce, ${ownRow.points} pkt, ${ownRow.goalsFor}:${ownRow.goalsAgainst}`,
    );
  }

  mkdirSync(outDir, { recursive: true });
  const clubOutDir = join(outDir, clubSummary.slug);
  mkdirSync(clubOutDir, { recursive: true });
  writeFileSync(join(clubOutDir, "source-meta.json"), JSON.stringify(fetched, null, 2) + "\n");
  writeFileSync(join(clubOutDir, "squad-stats.json"), JSON.stringify(squadData, null, 2) + "\n");
  writeFileSync(
    join(clubOutDir, "fixtures.json"),
    JSON.stringify({ matches: merged.fixtures }, null, 2) + "\n",
  );

  if (args.dryRun) {
    console.log("[dry-run] Pominięto zapis do bazy.");
    return { ok: true, dryRun: true, clubId: clubSummary.clubId, slug: clubSummary.slug, fetched };
  }

  const result = await runLivePipeline(
    merged,
    {
      fetchedAt: fetched.fetchedAt,
      tableSource: merged.tableSource,
      tableConflicts: merged.tableConflicts,
      ownTeamRow: ownRow,
      glksMietkow: ownRow,
    },
    squadData,
    clubConfig,
  );

  console.log(`Import: ${result.ingest.processed} rekordów (${result.ingest.failed} błędów)`);
  console.log(`Tabela publiczna: ${result.tableSynced} drużyn`);
  console.log(`Mecze: ${result.matchSync.processed} zsynchronizowanych`);
  console.log(`Kadra: ${result.squadSync.processed} wpisów w rejestrze`);

  return {
    ok: true,
    clubId: clubSummary.clubId,
    slug: clubSummary.slug,
    publicName: clubSummary.publicName,
    ...result,
    fetched,
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

  const supabase = createPipelineClient();
  let clubs = await listLeagueSyncClubs(supabase);
  if (args.clubId) {
    clubs = clubs.filter((c) => c.clubId === args.clubId);
    if (!clubs.length) {
      throw new Error(`Brak aktywnego klubu mirror live o id ${args.clubId}.`);
    }
  }

  if (!clubs.length) {
    console.log("Brak aktywnych klubów z źródłem Mirror live.");
    if (args.json) console.log(JSON.stringify({ ok: true, clubs: [], results: [] }));
    return;
  }

  console.log(`FC OS — synchronizacja ligowa (${clubs.length} klubów)\n`);

  const results = [];
  for (const club of clubs) {
    try {
      const result = await syncOneClub(supabase, club, args);
      results.push(result);
    } catch (err) {
      console.error(`\nBłąd sync [${club.slug}]:`, err.message);
      results.push({
        ok: false,
        clubId: club.clubId,
        slug: club.slug,
        publicName: club.publicName,
        error: err.message,
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    ok: failed.length === 0,
    clubsTotal: clubs.length,
    clubsSucceeded: results.filter((r) => r.ok).length,
    clubsFailed: failed.length,
    results,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (clubs.length > 1) {
    console.log(`\nPodsumowanie: ${summary.clubsSucceeded}/${summary.clubsTotal} klubów OK`);
    if (failed.length) {
      console.log("Błędy:", failed.map((f) => `${f.slug}: ${f.error}`).join("; "));
    }
  } else if (results[0]?.ok) {
    console.log("\nGotowe. Sprawdź /tabela, /mecze i /league w panelu.");
  }

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("\nBłąd sync:", err.message);
  process.exit(1);
});
