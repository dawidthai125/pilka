import { readFileSync } from "node:fs";

const t = readFileSync("tmp-lnp-chunk230.js", "utf8");
const patterns = [
  /competition-api-pro[^"'`\s]{0,120}/g,
  /api\/bus\/competition\/v1\/[a-zA-Z0-9_\-/${}?=&]+/g,
  /"\/api\/[^"]{5,80}"/g,
  /seasons|competitions|standings|fixtures|matches|tables/gi,
];

for (const p of patterns) {
  const m = [...t.matchAll(p)].map((x) => x[0]);
  const uniq = [...new Set(m)].slice(0, 40);
  if (uniq.length) {
    console.log("\n--", p, "--");
    console.log(uniq.join("\n"));
  }
}

const UA = "Mozilla/5.0 (compatible; PilkaProbe/1.0)";
const base = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1";
const tries = [
  `${base}/seasons`,
  `${base}/competitions`,
  `${base}/competitions?season=2025/2026`,
  `${base}/domain-settings`,
  "https://bus20-api-lnp2.laczynaspilka.pl/api/lnp/v1/competitions",
  "https://bus20-api-lnp2.laczynaspilka.pl/api/lnp/v1/seasons",
];

console.log("\n=== API tries ===");
for (const url of tries) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    const text = await res.text();
    console.log(res.status, url, text.slice(0, 200).replace(/\s+/g, " "));
  } catch (e) {
    console.log("ERR", url, String(e));
  }
}
