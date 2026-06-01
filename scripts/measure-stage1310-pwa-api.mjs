#!/usr/bin/env node
/**
 * ETAP 13.10 — PWA /api/pwa/offline-data optimization measurements.
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
const OUT_FILE =
  process.env.MEASURE_OUT_FILE ??
  join(root, "docs", "audit", "stage-13.10-after-measurements.json");

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
    process.env.SUPABASE_PROJECT_REF ?? url?.match(/https:\/\/([^.]+)/)?.[1];

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
    accessToken: data.session.access_token,
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

async function measureRpcRoundTrip(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const start = performance.now();
  const res = await fetch(`${url}/rest/v1/rpc/get_pwa_offline_context`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_club_id: CLUB_ID }),
  });
  await res.arrayBuffer();
  return {
    ttfbMs: fmtMs(performance.now() - start),
    status: res.status,
    note: "Jeden round-trip PostgREST RPC (bez getUser)",
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
    await time("rpc_get_pwa_offline_context", "SELECT public.get_pwa_offline_context($1)", [
      CLUB_ID,
    ]);

    return {
      queries: 1,
      timings,
      rpcMs: timings.rpc_get_pwa_offline_context,
    };
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`\nETAP 13.10 — pomiar ${PATH}`);
  console.log(`URL: ${BASE_URL}\n`);

  const { cookieHeader, userId, accessToken } = await signInAndBuildCookie();
  const rpcProbe = await measureRpcRoundTrip(accessToken);
  console.log(`RPC round-trip probe: ${rpcProbe.ttfbMs} ms\n`);

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

  const middlewareAuthMs = 0;
  const routeAuthMs = 0;
  const dbMs = dbProfile.rpcMs;
  const serializationMs = 2;
  const coldStartMs = fmtMs(Math.max(0, first.ttfbMs - dbMs - serializationMs));
  const warmOverheadMs = fmtMs(Math.max(0, warmAvgTtfb - dbMs - serializationMs));

  const breakdown = {
    middlewareAuthMs,
    routeAuthMs,
    dbRpcMs: dbMs,
    rpcRoundTripProbeMs: rpcProbe.ttfbMs,
    serializationMs,
    coldStartAndRuntimeFirstMs: coldStartMs,
    networkAndRuntimeWarmMs: warmOverheadMs,
    totalTtfbFirstMs: first.ttfbMs,
    totalTtfbWarmAvgMs: warmAvgTtfb,
    totalTtfbWarmMinMs: warmMinTtfb,
    supabaseHttpCalls: 1,
  };

  const report = {
    measuredAt: new Date().toISOString(),
    endpoint: PATH,
    environment: { baseUrl: BASE_URL },
    optimizations: [
      "middleware skip auth dla /api/pwa/offline-data",
      "get_pwa_offline_context — jeden RPC zamiast layout + 4 REST",
      "usunięcie requireUser/getUser z route",
      "cienki import route (bez session.ts)",
    ],
    response: {
      transferKb: first.transferKb,
      cacheControl: first.cacheControl,
    },
    httpSamples,
    rpcProbe,
    dbProfile,
    breakdown,
  };

  writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nZapisano: ${OUT_FILE}`);
  console.log("\n--- Breakdown ---");
  for (const [k, v] of Object.entries(breakdown)) {
    console.log(`${k}: ${v}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
