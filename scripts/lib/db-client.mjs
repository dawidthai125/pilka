import pg from "pg";

export function getProjectRef(env = process.env) {
  return (
    env.SUPABASE_PROJECT_REF ??
    env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]
  );
}

export function createDbConfig(env = process.env) {
  const projectRef = getProjectRef(env);
  const password = env.SUPABASE_DB_PASSWORD;

  if (!projectRef || !password) {
    throw new Error("Missing SUPABASE_DB_PASSWORD or project ref in .env.local");
  }

  const poolerHost =
    env.SUPABASE_DB_POOLER_HOST ?? "aws-0-eu-west-1.pooler.supabase.com";

  return {
    host: poolerHost,
    port: Number(env.SUPABASE_DB_POOLER_PORT ?? 5432),
    user: `postgres.${projectRef}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

export async function connectDb(env = process.env) {
  const client = new pg.Client(createDbConfig(env));
  await client.connect();
  return client;
}
