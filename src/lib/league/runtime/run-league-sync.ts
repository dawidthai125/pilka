// @ts-expect-error ESM pipeline module (bundled via outputFileTracingIncludes + import graph)
import { runLeagueSync as runLeagueSyncCore } from "../../../../scripts/lib/league-sync-runtime.mjs";

import type { LeagueSyncResult, RunLeagueSyncOptions } from "./types";

export type { LeagueSyncResult, RunLeagueSyncOptions, LeagueSyncClubResult, LeagueSyncTriggerSource } from "./types";

/**
 * In-process league sync for cron, Platform Admin, and server routes.
 * Static import ensures Next.js file tracing bundles scripts/ dependencies.
 */
export async function runLeagueSync(options: RunLeagueSyncOptions = {}): Promise<LeagueSyncResult> {
  return runLeagueSyncCore(options);
}
