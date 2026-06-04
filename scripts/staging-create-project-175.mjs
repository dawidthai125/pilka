#!/usr/bin/env node
/** Sprint 17.5 — create staging Supabase project via Management API */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import crypto from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const API = "https://api.supabase.com/v1";
const PROJECT_NAME = "FCOS-STAGING-173";
const REGION = process.env.STAGING_SUPABASE_REGION ?? "eu-west-1";
const stagingEnvPath = join(root, ".env.staging.local");

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`API ${path} ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function waitForHealthy(ref, maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const health = await api(`/projects/${ref}/health`);
    const db = health?.find?.((h) => h.name === "database") ?? health;
    if (db?.healthy === true || health?.every?.((h) => h.healthy)) {
      return true;
    }
    console.log("Waiting for project health...", JSON.stringify(health));
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error("Project did not become healthy in time");
}

async function main() {
  // Reuse existing staging if configured
  if (existsSync(stagingEnvPath)) {
    const existing = dotenv.parse(readFileSync(stagingEnvPath, "utf8"));
    if (existing.STAGING_PROJECT_REF && existing.SUPABASE_DB_PASSWORD) {
      console.log("Reusing existing .env.staging.local project:", existing.STAGING_PROJECT_REF);
      const project = await api(`/projects/${existing.STAGING_PROJECT_REF}`);
      console.log(JSON.stringify({ reused: true, id: project.id, ref: project.ref, region: project.region, status: project.status }, null, 2));
      return;
    }
  }

  const orgs = await api("/organizations");
  if (!orgs?.length) throw new Error("No Supabase organizations found");
  const orgId = process.env.SUPABASE_ORG_ID ?? orgs[0].id;
  console.log("Organization:", orgId);

  // Check if project already exists by name
  const projects = await api("/projects");
  const found = projects.find((p) => p.name === PROJECT_NAME);
  let project = found;

  const dbPassword = process.env.STAGING_DB_PASSWORD ?? crypto.randomBytes(16).toString("base64url") + "Aa1!";

  if (!project) {
    console.log(`Creating project: ${PROJECT_NAME} in ${REGION}...`);
    project = await api("/projects", {
      method: "POST",
      body: JSON.stringify({
        organization_id: orgId,
        name: PROJECT_NAME,
        db_pass: dbPassword,
        region: REGION,
      }),
    });
    console.log("Created project ref:", project.ref ?? project.id);
  } else {
    console.log("Project already exists:", project.ref);
  }

  const ref = project.ref ?? project.id;
  await waitForHealthy(ref);

  const details = await api(`/projects/${ref}`);
  const apiKeys = await api(`/projects/${ref}/api-keys`);

  const anon = apiKeys.find((k) => k.name === "anon")?.api_key;
  const service = apiKeys.find((k) => k.name === "service_role")?.api_key;

  const envContent = `# FC OS Staging — Sprint 17.5 (DO NOT use in production)
# Generated: ${new Date().toISOString()}
STAGING_PROJECT_REF=${ref}
STAGING_PROJECT_NAME=${PROJECT_NAME}
NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${service}
SUPABASE_DB_PASSWORD=${found ? "(use dashboard or STAGING_DB_PASSWORD env — existing project)" : dbPassword}
SUPABASE_PROJECT_REF=${ref}
SUPABASE_DB_POOLER_HOST=aws-0-${REGION}.pooler.supabase.com
SUPABASE_DB_POOLER_PORT=5432
`;

  writeFileSync(stagingEnvPath, envContent, "utf8");
  console.log("Wrote", stagingEnvPath);

  const pgVersion = await fetchPgVersion(ref, found ? process.env.STAGING_DB_PASSWORD : dbPassword);

  const meta = {
    projectId: details.id,
    projectRef: ref,
    name: details.name,
    region: details.region ?? REGION,
    postgresVersion: pgVersion,
    status: details.status,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(join(root, "docs/architecture/sprint-175-staging-project.json"), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta, null, 2));
}

async function fetchPgVersion(ref, password) {
  if (!password || password.startsWith("(")) return "unknown — set STAGING_DB_PASSWORD for existing project";
  try {
    const pg = await import("pg");
    const host = `aws-0-${REGION}.pooler.supabase.com`;
    const client = new pg.default.Client({
      host,
      port: 5432,
      user: `postgres.${ref}`,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    const { rows } = await client.query("SELECT version()");
    await client.end();
    return rows[0]?.version ?? "unknown";
  } catch (e) {
    return `pending: ${e.message}`;
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
