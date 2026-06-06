/**
 * Sprint 20.2A.1 — scan for stale audit/ and archived sprint paths in active docs.
 * Active scope: docs/ (excl. archive), scripts/, AGENTS.md
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, resolve, relative } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const STALE_PATTERNS = [
  /docs\/audit\//g,
  /\.\/audit\//g,
  /\.\.\/audit\//g,
  /docs\/architecture\/sprint-(?!200a|201a)/g,
];

const ACTIVE_ARCH_SPRINT_OK = /^docs\/architecture\/sprint-(200a|201a)/;

function walk(dir, skipArchive = false) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skipArchive && name === "archive") continue;
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, skipArchive));
    else if (/\.(md|mdc|mjs|ts|tsx|json)$/.test(name)) out.push(p);
  }
  return out;
}

function scanFile(absPath, scope) {
  const rel = relative(root, absPath).replace(/\\/g, "/");
  const text = readFileSync(absPath, "utf8");
  const hits = [];
  for (const re of STALE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const snippet = text.slice(Math.max(0, m.index - 20), m.index + 60).replace(/\n/g, " ");
      if (scope === "active" && rel.startsWith("docs/architecture/") && ACTIVE_ARCH_SPRINT_OK.test(snippet)) continue;
      hits.push({ match: m[0], index: m.index, snippet });
    }
  }
  return hits.length ? { file: rel, hits } : null;
}

function scanScope(label, files) {
  const results = files.map((f) => scanFile(f, label)).filter(Boolean);
  return { label, count: results.reduce((n, r) => n + r.hits.length, 0), files: results };
}

function countArchiveHistorical() {
  const archiveMd = walk(join(root, "docs/archive"), false).filter((f) => f.endsWith(".md"));
  let auditRefs = 0;
  let archSprintRefs = 0;
  const samples = [];
  for (const f of archiveMd) {
    const text = readFileSync(f, "utf8");
    const a = (text.match(/docs\/audit\//g) ?? []).length;
    const b = (text.match(/docs\/architecture\/sprint-/g) ?? []).length;
    auditRefs += a;
    archSprintRefs += b;
    if ((a || b) && samples.length < 15) {
      samples.push({ file: relative(root, f).replace(/\\/g, "/"), audit: a, sprint: b });
    }
  }
  return { auditRefs, archSprintRefs, fileCount: archiveMd.length, samples };
}

const activeDocFiles = walk(join(root, "docs"), true).filter((f) => f.endsWith(".md") || f.endsWith(".mdc"));
const scriptFiles = walk(join(root, "scripts"), false)
  .filter((f) => f.endsWith(".mjs"))
  .filter((f) => !f.endsWith("validate-doc-links-202a1.mjs"));
const agents = existsSync(join(root, "AGENTS.md")) ? [join(root, "AGENTS.md")] : [];

const activeDocs = scanScope("active-docs", activeDocFiles);
const activeScripts = scanScope("active-scripts", scriptFiles);
const agentsScan = scanScope("agents", agents);
const archive = countArchiveHistorical();

const pass =
  activeDocs.count === 0 && activeScripts.count === 0 && agentsScan.count === 0;

const report = {
  timestamp: new Date().toISOString(),
  pass,
  activeDocs,
  activeScripts,
  agentsScan,
  archiveHistorical: archive,
};

console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
