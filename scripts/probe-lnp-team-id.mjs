#!/usr/bin/env node
/** Discover LNP team/club IDs from laczynaspilka public pages. */
const UA = "Mozilla/5.0 (compatible; PiorunSync/1.0)";

const matchId = process.argv[2] ?? "7ee91030-2d47-4f14-8b04-36ab66102bd6";
const pageRes = await fetch(`https://www.laczynaspilka.pl/rozgrywki/mecz/${matchId}`, {
  headers: { "User-Agent": UA, Accept: "text/html" },
});
const page = { status: pageRes.status, text: await pageRes.text() };

console.log("match page", matchId, page.status, "len", page.text.length);

const uuids = [...new Set(page.text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];
console.log("uuids found", uuids.length);
for (const id of uuids.slice(0, 30)) console.log(" ", id);

for (const kw of ["Mietk", "mietk", "teamId", "clubId", "playId", "leagueId", "seasonId", "__NEXT_DATA__", "ng-state"]) {
  const i = page.text.indexOf(kw);
  if (i >= 0) console.log("\n", kw, "@", i, page.text.slice(Math.max(0, i - 40), i + 200).replace(/\s+/g, " "));
}

// Search page
const search = await fetch("https://www.laczynaspilka.pl/rozgrywki/szukaj?query=GLKS%20Mietk%C3%B3w", {
  headers: { "User-Agent": UA },
}).then((r) => r.text());
console.log("\nsearch len", search.length);
const searchUuids = [...new Set(search.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];
console.log("search uuids", searchUuids.length, searchUuids.slice(0, 10));

const mietkIdx = search.toLowerCase().indexOf("mietk");
if (mietkIdx >= 0) console.log("context:", search.slice(mietkIdx - 100, mietkIdx + 300).replace(/\s+/g, " "));
