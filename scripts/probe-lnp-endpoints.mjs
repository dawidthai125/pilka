const base = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/";
const UA = "Mozilla/5.0 (compatible; PilkaProbe/1.0)";

const t = (await import("node:fs")).readFileSync("tmp-lnp-chunk230.js", "utf8");
const endpoints = [...t.matchAll(/`\$\{n\.c\.appConfig\.urls\.apiCompetition\}([^`]+)`/g)].map((m) => m[1]);
const uniq = [...new Set(endpoints)];
console.log("Found", uniq.length, "endpoint templates");
console.log(uniq.slice(0, 40).join("\n"));

const staticPaths = uniq.filter((p) => !p.includes("{") && !p.includes("${"));
console.log("\nStatic paths:", staticPaths.length);

for (const p of staticPaths.slice(0, 15)) {
  const url = base + p;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  const text = await res.text();
  console.log("\n", res.status, p);
  console.log(text.slice(0, 500));
}

// Try seasons/dictionaries specifically
const seasonsUrl = base + "seasons/dictionaries";
const seasonsRes = await fetch(seasonsUrl, { headers: { "User-Agent": UA, Accept: "application/json" } });
const seasonsJson = await seasonsRes.json().catch(() => null);
if (seasonsJson) {
  console.log("\n=== seasons/dictionaries ===");
  console.log(JSON.stringify(seasonsJson, null, 2).slice(0, 2000));
  const current = seasonsJson?.items?.find?.((s) => s.isCurrent) ?? seasonsJson?.items?.[0];
  if (current) {
    console.log("\nCurrent season:", current.id, current.name ?? current.label);
  }
}
