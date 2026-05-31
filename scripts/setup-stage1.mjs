#!/usr/bin/env node
/**
 * ETAP 1 setup: migrations, seed users, auth redirect URLs.
 *
 * Requires in .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SUPABASE_DB_PASSWORD (Database password from Supabase Dashboard)
 *
 * Optional:
 * - SUPABASE_ACCESS_TOKEN (personal token from supabase.com/dashboard/account/tokens)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ??
  "pwkqnwqvrdiaycveacxa";
const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TEAM_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
const TEST_PASSWORD = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";

const TEST_USERS = [
  { email: "wlasciciel@piorun.test", role: "owner", fullName: "Jan Właściciel" },
  { email: "prezes@piorun.test", role: "president", fullName: "Adam Prezes" },
  { email: "dyrektor@piorun.test", role: "sports_director", fullName: "Marek Dyrektor" },
  { email: "trener@piorun.test", role: "coach", fullName: "Tomasz Trener", teamId: TEAM_ID },
  { email: "zawodnik@piorun.test", role: "player", fullName: "Kamil Zawodnik", teamId: TEAM_ID },
  { email: "rodzic@piorun.test", role: "parent", fullName: "Anna Rodzic" },
  { email: "sponsor@piorun.test", role: "sponsor", fullName: "Firma Sponsor" },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }
  return value;
}

async function runMigrations(client) {
  const migrationsDir = join(root, "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying migration: ${file}`);
    await client.query(sql);
  }
}

async function configureAuthRedirects(accessToken) {
  const body = {
    site_url: "http://localhost:3000",
    additional_redirect_urls: [
      "http://localhost:3000/**",
      "http://127.0.0.1:3000/**",
      "https://*.vercel.app/**",
    ],
  };

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    console.warn(`Auth config update failed (${res.status}):`, await res.text());
    console.warn("Configure redirect URLs manually in Supabase Dashboard → Authentication → URL Configuration");
    return;
  }

  console.log("Auth redirect URLs configured.");
}

async function seedUsers(admin) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingUsers = listed?.users ?? [];

  for (const user of TEST_USERS) {
    const found = existingUsers.find((entry) => entry.email === user.email);

    let userId = found?.id;

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });

      if (error) {
        throw new Error(`Failed to create ${user.email}: ${error.message}`);
      }

      userId = data.user.id;
      console.log(`Created user: ${user.email}`);
    } else {
      await admin.auth.admin.updateUserById(userId, {
        password: TEST_PASSWORD,
        user_metadata: { full_name: user.fullName },
      });
      console.log(`Updated user: ${user.email}`);
    }

    const { error: membershipError } = await admin.from("club_memberships").upsert(
      {
        club_id: CLUB_ID,
        user_id: userId,
        role: user.role,
        status: "active",
        team_id: user.teamId ?? null,
      },
      { onConflict: "club_id,user_id,role" },
    );

    if (membershipError) {
      throw new Error(`Membership for ${user.email}: ${membershipError.message}`);
    }
  }
}

async function main() {
  const dbPassword = requireEnv("SUPABASE_DB_PASSWORD");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const client = new pg.Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: dbPassword,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL.");

  try {
    await runMigrations(client);
    console.log("Migrations applied.");
  } finally {
    await client.end();
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await seedUsers(admin);
  console.log("Test users seeded.");

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken) {
    await configureAuthRedirects(accessToken);
  } else {
    console.warn("SUPABASE_ACCESS_TOKEN not set — skip auth URL config (set personal access token to auto-configure).");
  }

  console.log("\nSetup complete.");
  if (process.env.SETUP_TEST_PASSWORD) {
    console.log("Test users use SETUP_TEST_PASSWORD from environment.");
  } else {
    console.log("Test password for all users:", TEST_PASSWORD);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
