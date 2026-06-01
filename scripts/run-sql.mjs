#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { connectDb } from "./lib/db-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sqlFiles = process.argv.slice(2);

if (sqlFiles.length === 0) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file> [more-files...]");
  process.exit(1);
}

dotenv.config({ path: join(root, ".env.local") });

const client = await connectDb();
try {
  for (const sqlFile of sqlFiles) {
    const sql = readFileSync(join(root, sqlFile), "utf8");
    const enumStatements = [
      ...sql.matchAll(/ALTER TYPE public\.\w+ ADD VALUE IF NOT EXISTS '[^']+';/g),
    ].map((match) => match[0]);

    for (const statement of enumStatements) {
      await client.query(statement);
    }
    await client.query(sql);
    console.log(`Applied: ${sqlFile}`);
  }
} finally {
  await client.end();
}
