#!/usr/bin/env node
/**
 * ETAP 13.6 — real performance measurements (no optimizations).
 * Requires: .env.local, running Next.js on BASE_URL (default http://localhost:3000)
 */

import http from "node:http";
import https from "node:https";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { connectDb } from "./lib/db-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE_URL = process.env.MEASURE_BASE_URL ?? "http://localhost:3000";
const RUNS = Number(process.env.MEASURE_RUNS ?? 3);
const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TEST_EMAIL = process.env.MEASURE_USER_EMAIL ?? "wlasciciel@piorun.test";
const TEST_PASSWORD = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

function avg(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmtMs(n) {
  return Math.round(n * 10) / 10;
}

function fmtKb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function estimateBytes(rows) {
  if (!rows?.length) return 0;
  return Buffer.byteLength(JSON.stringify(rows), "utf8");
}

async function timeQuery(client, sql, params = []) {
  const start = performance.now();
  const result = await client.query(sql, params);
  const ms = performance.now() - start;
  return { ms, rows: result.rowCount ?? result.rows.length, bytes: estimateBytes(result.rows) };
}

async function measureHttp(path, cookieHeader, runs = RUNS) {
  const url = new URL(path, BASE_URL);
  const client = url.protocol === "https:" ? https : http;
  const samples = [];

  for (let i = 0; i < runs; i++) {
    const sample = await new Promise((resolve, reject) => {
      const start = performance.now();
      let ttfb = null;
      const req = client.get(
        url,
        {
          headers: {
            Cookie: cookieHeader ?? "",
            Accept: "text/html",
          },
        },
        (res) => {
          ttfb = performance.now() - start;
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const body = Buffer.concat(chunks);
            resolve({
              status: res.statusCode,
              ttfb,
              total: performance.now() - start,
              bytes: body.length,
              redirected: res.statusCode >= 300 && res.statusCode < 400,
            });
          });
        },
      );
      req.on("error", reject);
      req.setTimeout(120_000, () => {
        req.destroy(new Error(`Timeout: ${path}`));
      });
    });
    samples.push(sample);
  }

  const ok = samples.filter((s) => s.status === 200);
  const use = ok.length ? ok : samples;
  return {
    path,
    status: samples[0].status,
    ttfbMs: fmtMs(avg(use.map((s) => s.ttfb))),
    totalMs: fmtMs(avg(use.map((s) => s.total))),
    transferKb: fmtKb(avg(use.map((s) => s.bytes))),
    runs: samples.length,
  };
}

async function measureApi(path, cookieHeader) {
  const url = new URL(path, BASE_URL);
  const start = performance.now();
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader ?? "" },
    cache: "no-store",
  });
  const ttfb = performance.now() - start;
  const body = Buffer.from(await res.arrayBuffer());
  return {
    path,
    status: res.status,
    ttfbMs: fmtMs(ttfb),
    totalMs: fmtMs(performance.now() - start),
    transferKb: fmtKb(body.length),
  };
}

async function signInAndBuildCookie() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Sign-in failed: ${error?.message ?? "no session"}`);
  }

  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });

  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const cookieHeader = `${cookieName}=${encodeURIComponent(payload)}`;
  return { cookieHeader, userId: data.session.user.id };
}

async function profileDbLoaders(client, userId) {
  const layout = [];
  const q = async (name, sql, params) => {
    const r = await timeQuery(client, sql, params);
    layout.push({ name, ...r, ms: fmtMs(r.ms) });
    return r;
  };

  // Layout — getDashboardContext
  await q("profiles", "SELECT id, email, full_name FROM profiles WHERE id = $1", [userId]);
  await q(
    "club_memberships",
    "SELECT club_id, role, status, team_id FROM club_memberships WHERE user_id = $1 AND club_id = $2 AND status = 'active'",
    [userId, CLUB_ID],
  );
  await q("clubs", "SELECT id, slug, public_name, official_name FROM clubs WHERE id = $1", [CLUB_ID]);
  await q("teams", "SELECT id, club_id, name, category, season, is_active FROM teams WHERE club_id = $1 ORDER BY name", [
    CLUB_ID,
  ]);
  await q(
    "club_notifications_count",
    "SELECT COUNT(*)::int AS c FROM club_notifications WHERE club_id = $1 AND user_id = $2 AND read_at IS NULL AND scheduled_at <= NOW()",
    [CLUB_ID, userId],
  );
  await q(
    "website_settings",
    "SELECT primary_color, secondary_color FROM website_settings WHERE club_id = $1",
    [CLUB_ID],
  );

  const layoutMs = layout.reduce((s, x) => s + x.ms, 0);
  const layoutBytes = layout.reduce((s, x) => s + x.bytes, 0);

  async function pageQueries(name, queries) {
    const items = [];
    for (const [label, sql, params] of queries) {
      try {
        const r = await timeQuery(client, sql, params);
        items.push({ name: label, ...r, ms: fmtMs(r.ms) });
      } catch (err) {
        items.push({
          name: label,
          ms: 0,
          rows: 0,
          bytes: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    const dbMs = items.reduce((s, x) => s + x.ms, 0);
    const dbBytes = items.reduce((s, x) => s + x.bytes, 0);
    return {
      page: name,
      queries: items.length,
      pageDbMs: fmtMs(dbMs),
      pageDbBytes: dbBytes,
      totalQueries: layout.length + items.length,
      totalDbMs: fmtMs(layoutMs + dbMs),
      totalDbBytes: layoutBytes + dbBytes,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  return {
    layout: { queries: layout.length, dbMs: fmtMs(layoutMs), dbBytes: layoutBytes, items: layout },
    pages: {
      dashboard: await pageQueries("dashboard", [
        [
          "players_count_total",
          "SELECT COUNT(*) FROM players WHERE club_id = $1",
          [CLUB_ID],
        ],
        [
          "players_count_active",
          "SELECT COUNT(*) FROM players WHERE club_id = $1 AND status = 'active'",
          [CLUB_ID],
        ],
        [
          "player_documents_alerts",
          "SELECT id, player_id, document_type, title, expires_at FROM player_documents WHERE club_id = $1 AND expires_at IS NOT NULL AND expires_at <= (CURRENT_DATE + 30)",
          [CLUB_ID],
        ],
      ]),
      matches: await pageQueries("matches", [
        [
          "matches_calendar",
          "SELECT id, club_id, team_id, competition, season, match_date, match_time, home_team_name, away_team_name, status, home_score, away_score FROM matches WHERE club_id = $1 AND match_date >= (CURRENT_DATE - 30) AND match_date <= (CURRENT_DATE + 30) ORDER BY match_date, match_time",
          [CLUB_ID],
        ],
        ["match_filter_options", "SELECT season, competition FROM matches WHERE club_id = $1", [CLUB_ID]],
      ]),
      training: await pageQueries("training", [
        [
          "trainings_calendar",
          "SELECT id, club_id, team_id, name, training_date, start_time, end_time, location, description, coach_user_id, status FROM trainings WHERE club_id = $1 AND training_date >= (CURRENT_DATE - 30) AND training_date <= (CURRENT_DATE + 30) ORDER BY training_date",
          [CLUB_ID],
        ],
        [
          "coaches_memberships",
          "SELECT id, role, status, team_id, user_id FROM club_memberships WHERE club_id = $1 AND status = 'active' AND role IN ('coach','owner','president','sports_director')",
          [CLUB_ID],
        ],
        [
          "coaches_profiles",
          "SELECT id, email, full_name FROM profiles WHERE id IN (SELECT user_id FROM club_memberships WHERE club_id = $1 AND status = 'active' AND role IN ('coach','owner','president','sports_director'))",
          [CLUB_ID],
        ],
      ]),
      players: await pageQueries("players", [
        [
          "players_list",
          "SELECT id, club_id, team_id, first_name, last_name, jersey_number, primary_position, dominant_foot, status FROM players WHERE club_id = $1 ORDER BY last_name, first_name",
          [CLUB_ID],
        ],
      ]),
      sponsors: await pageQueries("sponsors", [
        [
          "sponsors_list",
          "SELECT id, club_id, company_name, city, contact_email, email, cooperation_status, created_at, updated_at FROM sponsors WHERE club_id = $1 ORDER BY company_name LIMIT 500",
          [CLUB_ID],
        ],
        ["sponsors_count", "SELECT COUNT(*) FROM sponsors WHERE club_id = $1", [CLUB_ID]],
        [
          "sponsor_contracts",
          "SELECT value, status FROM sponsor_contracts WHERE club_id = $1 AND status IN ('active','expiring') LIMIT 200",
          [CLUB_ID],
        ],
        [
          "sponsor_leads_count",
          "SELECT COUNT(*) FROM sponsor_leads WHERE club_id = $1 AND status NOT IN ('won','rejected')",
          [CLUB_ID],
        ],
        [
          "sponsor_publications_count",
          "SELECT COUNT(*) FROM sponsor_publications WHERE club_id = $1 AND published_at >= $2",
          [CLUB_ID, monthStartStr],
        ],
      ]),
      finance: await pageQueries("finance", [
        [
          "finance_income_sum",
          "SELECT COALESCE(SUM(amount),0) AS total FROM finance_income WHERE club_id = $1",
          [CLUB_ID],
        ],
        [
          "finance_expenses_sum",
          "SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE club_id = $1",
          [CLUB_ID],
        ],
        [
          "finance_overdue_fees",
          "SELECT id, player_id, amount, due_date, status FROM finance_player_fees WHERE club_id = $1 AND status IN ('partial','overdue') AND due_date < CURRENT_DATE ORDER BY due_date LIMIT 20",
          [CLUB_ID],
        ],
        [
          "finance_recent_income",
          "SELECT id, amount, transaction_date, description FROM finance_income WHERE club_id = $1 ORDER BY transaction_date DESC LIMIT 5",
          [CLUB_ID],
        ],
        [
          "finance_recent_expenses",
          "SELECT id, amount, transaction_date, description FROM finance_expenses WHERE club_id = $1 ORDER BY transaction_date DESC LIMIT 5",
          [CLUB_ID],
        ],
      ]),
      aiManager: await pageQueries("aiManager", [
        [
          "ai_memory",
          "SELECT id, summary, updated_at FROM ai_memory WHERE club_id = $1 AND user_id = $2 ORDER BY updated_at DESC LIMIT 1",
          [CLUB_ID, userId],
        ],
        [
          "ai_approvals",
          "SELECT id, task_id, tool_call_id, risk_level, status, preview, created_at FROM ai_action_approvals WHERE club_id = $1 AND user_id = $2 AND status = 'pending' ORDER BY created_at DESC",
          [CLUB_ID, userId],
        ],
      ]),
    },
    pwaOffline: await pageQueries("pwaOffline", [
      [
        "pwa_matches",
        "SELECT id, home_team_name, away_team_name, match_date, status, home_score, away_score FROM matches WHERE club_id = $1 ORDER BY match_date DESC LIMIT 10",
        [CLUB_ID],
      ],
      [
        "pwa_trainings",
        "SELECT id, name, training_date, status, team_id FROM trainings WHERE club_id = $1 ORDER BY training_date DESC LIMIT 10",
        [CLUB_ID],
      ],
      ["pwa_settings", "SELECT primary_color, secondary_color FROM website_settings WHERE club_id = $1", [CLUB_ID]],
      [
        "pwa_news",
        "SELECT id, title, slug, published_at FROM website_news WHERE club_id = $1 AND status = 'published' ORDER BY published_at DESC LIMIT 5",
        [CLUB_ID],
      ],
    ]),
    authLogin: { queries: 0, dbMs: 0, dbBytes: 0, note: "static RSC shell, middleware auth check only" },
  };
}

async function measureSupabaseAuthLogin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const start = performance.now();
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const ttfb = performance.now() - start;
  const body = await res.arrayBuffer();
  return {
    ttfbMs: fmtMs(ttfb),
    totalMs: fmtMs(performance.now() - start),
    transferKb: fmtKb(body.byteLength),
    status: res.status,
  };
}

function decomposeLatency(httpRow, dbTotalMs) {
  const ttfb = httpRow.ttfbMs;
  const db = dbTotalMs;
  const middlewareAuth = 15; // estimated JWT verify in middleware
  const nextReact = Math.max(0, ttfb - db - middlewareAuth);
  return {
    supabaseMs: fmtMs(db),
    nextJsReactMs: fmtMs(nextReact),
    middlewareMs: middlewareAuth,
    networkMs: fmtMs(Math.max(0, ttfb * 0.02)),
    openaiMs: 0,
    pwaMs: 0,
    totalTtfbMs: ttfb,
  };
}

async function main() {
  console.log(`\nETAP 13.6 — pomiar wydajności`);
  console.log(`Środowisko: ${BASE_URL} (${RUNS} prób/trasa)\n`);

  const { cookieHeader, userId } = await signInAndBuildCookie();
  const client = await connectDb();

  let dbProfile;
  try {
    dbProfile = await profileDbLoaders(client, userId);
  } finally {
    await client.end();
  }

  const authApi = await measureSupabaseAuthLogin();

  const routes = [
    { key: "login", path: "/login", auth: false, dbKey: null },
    { key: "dashboard", path: "/dashboard", auth: true, dbKey: "dashboard" },
    { key: "matches", path: "/matches", auth: true, dbKey: "matches" },
    { key: "training", path: "/training", auth: true, dbKey: "training" },
    { key: "players", path: "/players", auth: true, dbKey: "players" },
    { key: "sponsors", path: "/sponsors", auth: true, dbKey: "sponsors" },
    { key: "finance", path: "/finance", auth: true, dbKey: "finance" },
    { key: "aiManager", path: "/ai/manager", auth: true, dbKey: "aiManager" },
  ];

  const httpResults = {};
  for (const route of routes) {
    process.stdout.write(`HTTP ${route.path}... `);
    const m = await measureHttp(route.path, route.auth ? cookieHeader : "");
    httpResults[route.key] = m;
    console.log(`${m.ttfbMs} ms TTFB, ${m.transferKb} KB`);
  }

  process.stdout.write("HTTP /api/pwa/offline-data... ");
  const pwaApi = await measureApi("/api/pwa/offline-data", cookieHeader);
  console.log(`${pwaApi.ttfbMs} ms, ${pwaApi.transferKb} KB`);

  // Extra screens for TOP 20 ranking
  const extraRoutes = [
    "/notifications",
    "/ai/chat",
    "/ai/reports",
    "/matches/league-table",
    "/training/ranking",
    "/",
    "/aktualnosci",
    "/players/new",
    "/settings",
  ];
  const extraHttp = {};
  for (const path of extraRoutes) {
    const auth = path === "/" || path.startsWith("/aktualnosci") ? false : true;
    extraHttp[path] = await measureHttp(path, auth ? cookieHeader : "");
  }

  const report = {
    measuredAt: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      runs: RUNS,
      user: TEST_EMAIL,
      mode: BASE_URL.includes(":3001") || process.env.MEASURE_MODE === "production" ? "next start (production build)" : "next dev (Turbopack)",
    },
    authLogin: {
      page: httpResults.login,
      supabaseAuthApi: authApi,
    },
    routes: {},
    pwa: { api: pwaApi, db: dbProfile.pwaOffline },
    extraScreens: extraHttp,
    dbProfile,
  };

  for (const route of routes) {
    const http = httpResults[route.key];
    const dbPage = route.dbKey ? dbProfile.pages[route.dbKey] : null;
    const dbMs = dbPage ? dbPage.totalDbMs : dbProfile.layout.dbMs * (route.key === "login" ? 0 : 0);
    const totalDbMs =
      route.key === "login"
        ? 0
        : dbPage
          ? dbPage.totalDbMs
          : dbProfile.layout.dbMs;
    const queries =
      route.key === "login" ? 0 : dbPage ? dbPage.totalQueries : dbProfile.layout.queries;
    const dbBytes =
      route.key === "login" ? 0 : dbPage ? dbPage.totalDbBytes + dbProfile.layout.dbBytes : dbProfile.layout.dbBytes;

    report.routes[route.key] = {
      path: route.path,
      ttfbMs: http.ttfbMs,
      ssrEstimateMs: http.ttfbMs,
      dbMs: totalDbMs,
      queryCount: queries,
      transferKb: http.transferKb,
      dbTransferKb: fmtKb(dbBytes),
      latency: decomposeLatency(http, totalDbMs),
    };
  }

  // TOP 20 ranking by TTFB
  const allScreens = [
    ...Object.entries(httpResults).map(([k, v]) => ({
      screen: report.routes[k]?.path ?? k,
      ttfbMs: v.ttfbMs,
      transferKb: v.transferKb,
      category: "core",
    })),
    ...Object.entries(extraHttp).map(([path, v]) => ({
      screen: path,
      ttfbMs: v.ttfbMs,
      transferKb: v.transferKb,
      category: "extra",
    })),
    {
      screen: "/api/pwa/offline-data",
      ttfbMs: pwaApi.ttfbMs,
      transferKb: pwaApi.transferKb,
      category: "pwa",
    },
    {
      screen: "Supabase auth (login API)",
      ttfbMs: authApi.ttfbMs,
      transferKb: authApi.transferKb,
      category: "auth",
    },
  ];

  report.top20Slowest = allScreens
    .sort((a, b) => b.ttfbMs - a.ttfbMs)
    .slice(0, 20)
    .map((row, i) => ({ rank: i + 1, ...row }));

  const outJson = join(root, "docs", "audit", "stage-13.6-measurements.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(`\nZapisano: ${outJson}`);

  // Console summary table
  console.log("\n--- Trasy główne ---");
  console.log("Trasa\tTTFB\tSSR~\tDB\tZapyt.\tTransfer");
  for (const route of routes) {
    const r = report.routes[route.key];
    console.log(
      `${route.path}\t${r.ttfbMs}ms\t${r.ssrEstimateMs}ms\t${r.dbMs}ms\t${r.queryCount}\t${r.transferKb}KB`,
    );
  }

  console.log("\n--- TOP 5 najwolniejszych ---");
  for (const row of report.top20Slowest.slice(0, 5)) {
    console.log(`${row.rank}. ${row.screen} — ${row.ttfbMs} ms TTFB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
