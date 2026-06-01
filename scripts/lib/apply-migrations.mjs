import { readFileSync } from "node:fs";
import { join } from "node:path";

import { connectDb } from "./db-client.mjs";

/**
 * Apply SQL files in separate transactions when they start with ALTER TYPE ... ADD VALUE.
 */
export async function applyMigrationFiles(root, relativePaths) {
  const client = await connectDb();

  try {
    for (const relativePath of relativePaths) {
      const sql = readFileSync(join(root, relativePath), "utf8");
      const enumStatements = [
        ...sql.matchAll(/ALTER TYPE public\.\w+ ADD VALUE IF NOT EXISTS '[^']+';/g),
      ].map((match) => match[0]);

      for (const statement of enumStatements) {
        await client.query(statement);
      }

      console.log(`Applying ${relativePath}...`);
      await client.query(sql);
      console.log(`OK: ${relativePath}`);
    }
  } finally {
    await client.end();
  }
}
