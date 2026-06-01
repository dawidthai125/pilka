#!/usr/bin/env node
import dotenv from "dotenv";
import { z } from "zod";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

const result = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!result.success) {
  console.error("Invalid environment for build:");
  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !process.env.OPENAI_API_KEY?.trim()) {
  console.warn(
    "Warning: OPENAI_API_KEY is not set — moduł AI będzie niedostępny w produkcji.",
  );
}

for (const key of Object.keys(process.env)) {
  if (
    key.startsWith("NEXT_PUBLIC_") &&
    process.env[key]?.includes("service_role")
  ) {
    console.error(`Invalid environment: ${key} must not contain service_role key material.`);
    process.exit(1);
  }
}

if (process.env.ALLOW_PUBLIC_REGISTRATION !== "false") {
  console.warn(
    "Warning: ALLOW_PUBLIC_REGISTRATION is not false — otwarta rejestracja włączona.",
  );
}

console.log("Environment validation passed.");
