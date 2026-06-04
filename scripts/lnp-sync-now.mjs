#!/usr/bin/env node
/**
 * Wklej token mPZPN od razu po skopiowaniu z Chrome (ważny ~2 s).
 * node scripts/lnp-sync-now.mjs
 */
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const teamId = process.env.LNP_TEAM_ID || "312e40bc-a65a-4558-ad00-d1edccc66e60";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

console.log(`
=== Sync mPZPN (GLKS Mietków) ===
1) Odśwież laczynaspilka.pl (F5) — kadra / statystyki drużyny
2) F12 → Sieć → GET .../teams/${teamId}/players
3) Skopiuj Bearer (bez słowa "Bearer")
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
function normalizePastedToken(raw) {
  let t = raw.trim().replace(/\s+/g, "");
  // PowerShell czasem ucina "B" → "earer eyJ..."
  t = t.replace(/^bearer/i, "").replace(/^earer/i, "");
  if (t.startsWith("eyJ")) return t;
  const m = raw.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : t;
}

const token = await new Promise((resolvePrompt) => {
  rl.question("Wklej token (sam eyJ... lub z Bearer) i Enter: ", (answer) => {
    rl.close();
    resolvePrompt(normalizePastedToken(answer));
  });
});

if (!token.startsWith("eyJ") || token.length < 80) {
  console.error("Nie rozpoznano tokenu. Wklej cały ciąg zaczynający się od eyJ...");
  console.error("(Nie wpisuj w PowerShell poza tym skryptem — tylko po komunikacie powyżej.)");
  process.exit(1);
}

function runNode(script, args = []) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, LNP_ACCESS_TOKEN: token, LNP_TEAM_ID: teamId },
    });
    child.on("close", (code) => (code === 0 ? resolveRun() : reject(new Error(`exit ${code}`))));
  });
}

try {
  console.log("\n--- Test API ---");
  await runNode("scripts/lnp-paste-and-sync.mjs", [token]);
  console.log("\n--- Pełny sync ligowy ---");
  await runNode("scripts/sync-league-live.mjs");
  console.log("\nGotowe. Odśwież stronę /druzyna (Ctrl+F5).");
} catch {
  console.error("\nNie udało się. Skopiuj token ponownie i uruchom od razu:");
  console.error("  node scripts/lnp-sync-now.mjs");
  process.exit(1);
}
