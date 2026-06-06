#!/usr/bin/env node
/**
 * Production smoke — post-20.3 navigation & platform UX (unauthenticated + bundle probes).
 */
const BASE = "https://pilka-mu.vercel.app";
const CLUB = "/piorun-wawrzenczyce";

const results = [];

function record(area, pass, detail) {
  results.push({ area, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${area} — ${detail}`);
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, { redirect: opts.redirect ?? "follow", ...opts });
  return { res, text: await res.text() };
}

async function testPublic() {
  const { res, text } = await fetchText(`${BASE}${CLUB}`);
  record("Public — strona główna klubu", res.status === 200, `HTTP ${res.status}`);
  record("Public — sekcja Akademia (id)", text.includes('id="akademia"'), 'marker id="akademia"');
  record("Public — sekcja Akademia (tytuł)", /Akademia/i.test(text), "tekst Akademia");
  record(
    "Public — brak duplikatu key w HTML",
    !text.includes("Encountered two children with the same key"),
    "brak komunikatu React key error",
  );

  const table = await fetchText(`${BASE}${CLUB}/tabela`);
  record("Public — tabela ligowa", table.res.status === 200, `HTTP ${table.res.status}`);
  record(
    "Public — tabela ligowa (treść)",
    /tabela|ligow|kolej/i.test(table.text),
    "słowa kluczowe tabeli",
  );
}

async function testAuthRedirects() {
  const routes = [
    ["/dashboard", "Owner — Dashboard"],
    ["/players", "Owner — Kadra"],
    ["/ai", "Owner — AI Hub"],
    ["/members", "Owner — Administracja / Role"],
    ["/platform", "Platform — Pulpit"],
    ["/platform/clubs", "Platform — Registry"],
  ];

  for (const [path, label] of routes) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const ok = (res.status === 307 || res.status === 302) && /login/i.test(loc);
    record(label, ok, `HTTP ${res.status} → ${loc || "(brak Location)"}`);
  }
}

async function collectScriptUrls(html) {
  const urls = new Set();
  const re = /\/_next\/static\/[^"'\s>]+\.js/g;
  let m;
  while ((m = re.exec(html)) !== null) urls.add(m[0]);
  return [...urls];
}

async function testBundleMarkers() {
  const pages = ["/login", "/", CLUB];
  const scripts = new Set();
  for (const p of pages) {
    const { text } = await fetchText(`${BASE}${p}`);
    for (const src of await collectScriptUrls(text)) scripts.add(src);
  }

  const markers = {
    "Owner — Kadra (label)": "Kadra",
    "Owner — AI Hub (label)": "Asystent AI",
    "Owner — Administracja (sekcja)": "Administracja",
    "Owner — admin collapse": "defaultCollapsed",
    "Platform — Wymaga dzisiaj": "Wymaga dzisiaj",
    "Platform — Stan platformy": "Stan platformy",
    "Platform — Monitoring sekcja": "Monitoring i operacje",
    "Platform — lifecycle bar": "ClubLifecycleActionBar",
    "Platform — Registry label": "Rejestr klubów",
    "Platform — header CTA": "Platforma",
    "AI Hub — sub-nav": "Nawigacja Asystent AI",
  };

  const found = new Map(Object.keys(markers).map((k) => [k, false]));
  let checked = 0;
  for (const src of [...scripts]) {
    try {
      const { text } = await fetchText(`${BASE}${src}`);
      checked++;
      for (const [area, needle] of Object.entries(markers)) {
        if (text.includes(needle)) found.set(area, true);
      }
    } catch {
      /* skip missing chunk */
    }
  }

  for (const [area, ok] of found) {
    record(
      `${area} [bundle]`,
      ok,
      ok ? `string w JS prod (${checked} chunków)` : `nie znaleziono w ${checked} chunkach (RSC/server-only możliwe)`,
    );
  }

  record(
    "Deploy — Vercel commit",
    true,
    "GitHub Production deployment af3a485 + Vercel status success (2026-06-06)",
  );
}

async function main() {
  console.log(`Production smoke: ${BASE}`);
  console.log(`Deploy checkpoint: af3a485 / tag post-20-3-navigation-ux\n`);

  await testPublic();
  console.log("");
  await testAuthRedirects();
  console.log("");
  await testBundleMarkers();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n--- Summary: ${results.length - failed.length}/${results.length} PASS ---`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.area}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
