#!/usr/bin/env node
/**
 * ETAP 13.9 — PWA /api/pwa/offline-data diagnosis (measure only).
 */

import https from "node:https";
import http from "node:http";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { connectDb } from "./lib/db-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE_URL = process.env.MEASURE_BASE_URL ?? "https://pilka-mu.vercel.app";
const TEST_EMAIL = process.env.MEASURE_USER_EMAIL ?? "wlasciciel@piorun.test";
const TEST_PASSWORD = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const PATH = "/api/pwa/offline-data";

function fmtMs(n) {
  return Math.round(n * 10) / 10;
}

function fmtKb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

async function signInAndBuildCookie() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const projectRef =
    process.env.SUPABASE_PROJECT_REF ??
    url?.match(/https:\/\/([^.]+)/)?.[1];

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) throw new Error(`Sign-in failed: ${error?.message}`);

  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });

  return {
    cookieHeader: `${`sb-${projectRef}-auth-token`}=${encodeURIComponent(payload)}`,
    userId: data.session.user.id,
  };
}

function requestApi(cookieHeader, label) {
  const url = new URL(PATH, BASE_URL);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const start = performance.now();
    let ttfb = null;
    const req = client.get(
      url,
      {
        headers: {
          Cookie: cookieHeader,
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        ttfb = performance.now() - start;
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve({
            label,
            status: res.statusCode,
            ttfbMs: fmtMs(ttfb),
            totalMs: fmtMs(performance.now() - start),
            bytes: body.length,
            transferKb: fmtKb(body.length),
            cacheControl: res.headers["cache-control"] ?? null,
            xVercelCache: res.headers["x-vercel-cache"] ?? null,
            xVercelId: res.headers["x-vercel-id"] ?? null,
          });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(120_000, () => req.destroy(new Error("timeout")));
  });
}

async function measureAuthGetUser(cookieHeader) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const raw = decodeURIComponent(cookieHeader.split("=").slice(1).join("="));
  const accessToken = JSON.parse(raw).access_token;
  const start = performance.now();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await res.arrayBuffer();
  return {
    ttfbMs: fmtMs(performance.now() - start),
    status: res.status,
    note: "Supabase Auth getUser — middleware i route wykonują ten sam typ pracy",
  };
}

async function profileDb(userId) {
  const client = await connectDb();
  const timings = {};

  async function time(label, sql, params = []) {
    const s = performance.now();
    await client.query(sql, params);
    timings[label] = fmtMs(performance.now() - s);
  }

  try {
    await client.query("SET LOCAL role authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);

    await time("rpc_get_app_layout_context", "SELECT public.get_app_layout_context($1)", [CLUB_ID]);
    await time("q_matches", "SELECT id, home_team_name, away_team_name, match_date, status, home_score, away_score FROM matches WHERE club_id = $1 ORDER BY match_date DESC LIMIT 10", [CLUB_ID]);
    await time("q_trainings", "SELECT id, name, training_date, status, team_id FROM trainings WHERE club_id = $1 ORDER BY training_date DESC LIMIT 10", [CLUB_ID]);
    await time("q_settings", "SELECT primary_color, secondary_color FROM website_settings WHERE club_id = $1", [CLUB_ID]);
    await time("q_news", "SELECT id, title, slug, published_at FROM website_news WHERE club_id = $1 AND status = 'published' ORDER BY published_at DESC LIMIT 5", [CLUB_ID]);

    const sequentialSum = Object.values(timings).reduce((a, b) => a + b, 0);
    const pageParallel = Math.max(
      timings.q_matches,
      timings.q_trainings,
      timings.q_settings,
      timings.q_news,
    );
    const parallelEstimate = timings.rpc_get_app_layout_context + pageParallel;

    return {
      queries: Object.keys(timings).length,
      timings,
      sequentialMs: fmtMs(sequentialSum),
      parallelEstimateMs: fmtMs(parallelEstimate),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`\nETAP 13.9 — diagnoza ${PATH}`);
  console.log(`URL: ${BASE_URL}\n`);

  const { cookieHeader, userId } = await signInAndBuildCookie();
  const authProbe = await measureAuthGetUser(cookieHeader);
  console.log(`Auth getUser probe: ${authProbe.ttfbMs} ms\n`);

  const httpSamples = [];
  for (let i = 0; i < 8; i++) {
    const sample = await requestApi(cookieHeader, i === 0 ? "request_1" : `request_${i + 1}`);
    httpSamples.push(sample);
    console.log(
      `${sample.label}: ${sample.ttfbMs} ms TTFB, ${sample.totalMs} ms total, ${sample.transferKb} KB, x-vercel-cache=${sample.xVercelCache ?? "n/a"}`,
    );
    await new Promise((r) => setTimeout(r, i === 0 ? 800 : 250));
  }

  const dbProfile = await profileDb(userId);

  const first = httpSamples[0];
  const warm = httpSamples.slice(1);
  const warmAvgTtfb = fmtMs(warm.reduce((s, x) => s + x.ttfbMs, 0) / warm.length);
  const warmMinTtfb = Math.min(...warm.map((x) => x.ttfbMs));

  const middlewareAuthMs = authProbe.ttfbMs;
  const routeAuthMs = authProbe.ttfbMs;
  const dbMs = dbProfile.parallelEstimateMs;
  const serializationMs = 2;
  const coldStartMs = fmtMs(Math.max(0, first.ttfbMs - middlewareAuthMs - routeAuthMs - dbMs - serializationMs));
  const warmOverheadMs = fmtMs(Math.max(0, warmAvgTtfb - dbMs - serializationMs));

  const breakdown = {
    middlewareAuthMs,
    routeAuthMs,
    dbParallelMs: dbMs,
    dbSequentialProfileMs: dbProfile.sequentialMs,
    serializationMs,
    coldStartAndRuntimeFirstMs: coldStartMs,
    networkAndAuthWarmMs: warmOverheadMs,
    totalTtfbFirstMs: first.ttfbMs,
    totalTtfbWarmAvgMs: warmAvgTtfb,
    totalTtfbWarmMinMs: warmMinTtfb,
  };

  const report = {
    measuredAt: new Date().toISOString(),
    endpoint: PATH,
    environment: { baseUrl: BASE_URL },
    response: {
      transferKb: first.transferKb,
      cacheControl: first.cacheControl,
      serviceWorkerPolicy: "NetworkOnly — /api/* never cached in SW",
    },
    httpSamples,
    authProbe,
    dbProfile,
    breakdown,
    invocationAnalysis: {
      trigger: "PwaProvider useEffect — setTimeout 2500ms po mount layoutu dashboard",
      onEveryPageEntry: false,
      onClientNavigationBetweenScreens: false,
      onFullBrowserRefresh: true,
      onDashboardLayoutRemount: true,
      ttlSessionStorageMs: 300000,
      ttlKey: "fcos:pwa-offline-refreshed-at",
      onReconnect: "force=true po flush sync queue",
      deferMs: 2500,
    },
    codePath: {
      middleware: "matcher obejmuje /api/* — supabase.auth.getUser()",
      route: "getDashboardContext() + 4× Promise.all Supabase REST",
      duplicateWork: [
        "middleware getUser + route requireUser",
        "website_settings w RPC layout i w query page",
        "teams/club/profile z RPC layout — częściowo redundantne dla PWA payload",
      ],
      supabaseHttpCalls: "2× auth + 1 RPC + 4 REST ≈ 7 round-tripów",
    },
    top10Causes: [
      {
        rank: 1,
        cause: "Serverless cold start (pierwsze wywołanie funkcji)",
        evidence: `request_1 ${first.ttfbMs} ms vs warm avg ${warmAvgTtfb} ms`,
        category: "cold_start",
      },
      {
        rank: 2,
        cause: "Duplikacja Supabase Auth (middleware + route)",
        evidence: `~${middlewareAuthMs} ms × 2 ≈ ${fmtMs(middlewareAuthMs * 2)} ms`,
        category: "auth",
      },
      {
        rank: 3,
        cause: "Pełny get_app_layout_context RPC zamiast slim PWA query",
        evidence: `${dbProfile.timings.rpc_get_app_layout_context} ms RPC`,
        category: "rpc",
      },
      {
        rank: 4,
        cause: "4 równoległe zapytania page (matches, trainings, settings, news)",
        evidence: `parallel page max ${Math.max(dbProfile.timings.q_matches, dbProfile.timings.q_trainings, dbProfile.timings.q_settings, dbProfile.timings.q_news)} ms`,
        category: "sql",
      },
      {
        rank: 5,
        cause: "Brak cache — Cache-Control: no-store + SW NetworkOnly",
        evidence: "Każde wywołanie idzie na origin",
        category: "cache",
      },
      {
        rank: 6,
        cause: "Redundantne website_settings (RPC + query)",
        evidence: `q_settings ${dbProfile.timings.q_settings} ms + w RPC layout`,
        category: "sql",
      },
      {
        rank: 7,
        cause: "7+ HTTP round-tripów do Supabase na request",
        evidence: "2 auth + 5 data calls przez PostgREST",
        category: "network",
      },
      {
        rank: 8,
        cause: "RTT klient → Vercel fra1 + function overhead (warm)",
        evidence: `warm min ${warmMinTtfb} ms > DB parallel ${dbMs} ms`,
        category: "network",
      },
      {
        rank: 9,
        cause: "Duży serverless bundle (~1.18 MB) — wolniejszy bootstrap",
        evidence: "vercel inspect λ [fra1] ~1.18MB",
        category: "cold_start",
      },
      {
        rank: 10,
        cause: "Serializacja JSON (~5 KB) — marginalna",
        evidence: `~${serializationMs} ms, ${first.transferKb} KB`,
        category: "serialization",
      },
    ],
  };

  const outJson = join(root, "docs", "audit", "stage-13.9-pwa-api-measurements.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(`\nZapisano: ${outJson}`);
  console.log("\n--- Breakdown (szacunek, 1. request) ---");
  for (const [k, v] of Object.entries(breakdown)) {
    console.log(`${k}: ${v} ms`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
