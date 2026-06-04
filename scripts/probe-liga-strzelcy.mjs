#!/usr/bin/env node
fetch("http://www.90minut.pl/liga/1/liga14526.html", { headers: { "User-Agent": "PilkaSync/1.0" } })
  .then((r) => r.text())
  .then((t) => {
    const idx = t.indexOf("Strzelcy");
    console.log("Strzelcy at", idx);
    console.log(t.slice(idx, idx + 8000));
  });
