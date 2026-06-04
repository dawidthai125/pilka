#!/usr/bin/env node
const UA = { "User-Agent": "PilkaSync/1.0" };

async function get(url) {
  const r = await fetch(url, { headers: UA });
  return { status: r.status, text: await r.text() };
}

async function main() {
  const urls = [
    "https://regionalnyfutbol.pl/klub,glks-mietkow,sezon-2025-2026,mecze.html",
    "http://www.90minut.pl/bilans.php?id_klub=3824&id_sezon=91",
    "https://www.laczynaspilka.pl/rozgrywki/mecz/7ee91030-2d47-4f14-8b04-36ab66102bd6",
  ];
  for (const url of urls) {
    const { status, text } = await get(url);
    console.log("\n===", url, status, text.length);
    for (const kw of ["skład", "sklad", "zawodnik", "rezerwow", "Lineup", "player", "strzel", "kadra"]) {
      const c = (text.match(new RegExp(kw, "gi")) || []).length;
      if (c) console.log(" ", kw, c);
    }
    if (url.includes("mecze")) {
      const links = [...text.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => /mecz|sklad|zespol/i.test(h));
      console.log(" links", links.slice(0, 15));
    }
    if (url.includes("laczynaspilka")) {
      console.log(text.slice(0, 5000));
    }
  }

  for (const s of [91, 107, 105, 106, 104]) {
    const { text } = await get(`http://www.90minut.pl/bilans.php?id_klub=3824&id_sezon=${s}`);
    const playerRows = [...text.matchAll(/<td[^>]*>\s*([A-ZĄĆĘŁŃÓŚŹŻ][^\<]{2,35})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)/g)];
    console.log(`bilans sezon ${s}: ${playerRows.length} stat rows`);
    if (playerRows.length) console.log("  first:", playerRows[0][1]);
  }

  const { text: league } = await get("http://www.90minut.pl/liga/1/liga14526.html");
  for (const kw of ["strzelcy", "Strzelcy", "sklad", "Sklad", "mecz.php", "id_mecz", "laczynaspilka"]) {
    console.log("liga", kw, league.indexOf(kw));
  }
  const lnpIds = [...league.matchAll(/laczynaspilka\.pl\/rozgrywki\/mecz\/([a-f0-9-]+)/gi)].map((m) => m[1]);
  console.log("LNP match ids", lnpIds.length, lnpIds.slice(0, 5));

  const { text: rf } = await get(
    "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html",
  );
  const rfLinks = [...rf.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((h) => /mecz|sklad|zawod|glks-mietkow/i.test(h));
  console.log("RF links", [...new Set(rfLinks)].slice(0, 20));

  // 90minut strzelcy page for league
  const strzelcyUrls = [
    "http://www.90minut.pl/strzelcy.php?id_liga=14526",
    "http://www.90minut.pl/liga/1/liga14526,strzelcy.html",
    "http://www.90minut.pl/liga/1/liga14526.html#strzelcy",
  ];
  for (const url of strzelcyUrls) {
    const { status, text } = await get(url);
    console.log("strzelcy try", url, status, text.length);
    if (status === 200 && /Mietk|mietk/i.test(text)) {
      const idx = text.search(/Mietk/i);
      console.log(text.slice(idx - 100, idx + 400));
    }
  }

  // regiowyniki kadra - search player names in HTML
  const { text: kadra } = await get("https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/GLKS_Mietkow/kadra/");
  const playerLinks = [...kadra.matchAll(/href="([^"]*zawodnik[^"]*)"/gi)].map((m) => m[1]);
  console.log("regiowyniki player links", playerLinks.length, playerLinks.slice(0, 10));
  const tableRows = [...kadra.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].filter((m) => /[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ]/.test(m[0]));
  console.log("regiowyniki kadra table rows", tableRows.length);
  if (tableRows.length) console.log(tableRows[0][0].slice(0, 500));
}

main().catch(console.error);
