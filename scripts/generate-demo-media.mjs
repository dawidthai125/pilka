import fs from "fs";
import path from "path";

const dir = path.join("public", "demo-media");
fs.mkdirSync(dir, { recursive: true });

const assets = [
  ["hero-team", "DRUŻYNA", "#0B3D2E", "#145a45"],
  ["hero-match", "MECZ", "#1a4d3a", "#0B3D2E"],
  ["hero-stadium", "STADION", "#062820", "#0B3D2E"],
  ["team-seniors", "SENIORZY", "#0B3D2E", "#1e6b52"],
  ["team-u18", "U18", "#0d5240", "#145a45"],
  ["team-u12", "U12", "#145a45", "#0B3D2E"],
  ["team-youth", "MŁODZI", "#0B3D2E", "#145a45"],
  ["academy-training", "TRENING", "#0B3D2E", "#1a4d3a"],
  ["academy-kids", "AKADEMIA", "#145a45", "#0d5240"],
  ["academy-path", "ROZWÓJ", "#062820", "#145a45"],
  ["news-matches", "MECZ", "#0B3D2E", "#145a45"],
  ["news-club", "KLUB", "#0d5240", "#0B3D2E"],
  ["news-academy", "AKADEMIA", "#145a45", "#0B3D2E"],
  ["news-transfers", "TRANSFER", "#0B3D2E", "#1e6b52"],
  ["news-sponsors", "SPONSOR", "#062820", "#145a45"],
  ["placeholder", "ZDJĘCIE", "#1a1a1a", "#333333"],
];

for (let i = 1; i <= 8; i++) {
  assets.push([`gallery-${String(i).padStart(2, "0")}`, `GALERIA ${i}`, "#0B3D2E", "#145a45"]);
}

function svg(label, c1, c2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${label}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <ellipse cx="400" cy="520" rx="280" ry="40" fill="#000" opacity="0.15"/>
  <circle cx="400" cy="260" r="72" fill="none" stroke="#F4C430" stroke-width="5" opacity="0.75"/>
  <path d="M400 188 L400 332 M328 260 L472 260" stroke="#F4C430" stroke-width="4" opacity="0.5"/>
  <text x="400" y="420" text-anchor="middle" fill="#FFFFFF" font-family="system-ui,sans-serif" font-size="36" font-weight="700">${label}</text>
  <text x="400" y="460" text-anchor="middle" fill="#F4C430" font-family="system-ui,sans-serif" font-size="14" opacity="0.85">Media demo · podmień w panelu CMS</text>
</svg>`;
}

for (const [key, label, c1, c2] of assets) {
  fs.writeFileSync(path.join(dir, `${key}.svg`), svg(label, c1, c2));
}

console.log(`Created ${assets.length} demo SVG files`);
