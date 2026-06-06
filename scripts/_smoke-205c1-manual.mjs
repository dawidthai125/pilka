#!/usr/bin/env node
/**
 * Sprint 20.5C.1 — Manual smoke (local dev + Playwright).
 * Usage: SMOKE_BASE_URL=http://localhost:3000 node scripts/_smoke-205c1-manual.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_OWNER_EMAIL ?? "wlasciciel@piorun.test";
const PASS = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";

const results = [];

function record(id, verdict, detail) {
  results.push({ id, verdict, detail });
  console.log(`[${verdict}] ${id} — ${detail}`);
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill('input[name="email"], input[type="email"]', EMAIL);
  await page.fill('input[name="password"], input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
}

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = lines[0]?.split(";") ?? [];
  const rows = lines.slice(1).map((line) => line.split(";"));
  return { header, rows, lineCount: lines.length };
}

async function readDownload(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const consoleErrors = [];
  const hydrationErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => hydrationErrors.push(err.message));

  try {
    await login(page);
    await page.goto(`${BASE_URL}/members`, { waitUntil: "networkidle", timeout: 60000 });

    const title = await page.locator("h1").first().textContent();
    record(
      "T1-members-page",
      title?.includes("Członkowie") ? "PASS" : "FAIL",
      `title=${title?.trim() ?? "(empty)"}`,
    );

    const table = page.locator("table").first();
    const tableVisible = await table.isVisible().catch(() => false);
    const nameCol = await page.getByRole("columnheader", { name: "Imię i nazwisko" }).count();
    const emailCol = await page.getByRole("columnheader", { name: "Email" }).count();
    record(
      "T2-members-table",
      tableVisible && nameCol > 0 && emailCol > 0 ? "PASS" : "FAIL",
      `table=${tableVisible} cols name=${nameCol} email=${emailCol}`,
    );

    const rowChecks = page.locator('tbody input[type="checkbox"]');
    const rowCount = await rowChecks.count();
    if (rowCount === 0) {
      record("T3-T8-selection", "SKIP", "brak wierszy członków w tabeli — testy checkboxów pominięte");
      record("T9-csv", "SKIP", "brak danych do eksportu");
    } else {
      const counter = page.locator('[aria-live="polite"]');
      const exportBtn = page.getByRole("button", { name: /Eksportuj/ });
      const selectAll = page.locator('thead input[type="checkbox"]');

      await rowChecks.nth(0).check();
      const afterOne = await counter.textContent();
      record(
        "T3-single-checkbox",
        afterOne?.includes("Zaznaczono: 1") ? "PASS" : "FAIL",
        `counter=${afterOne?.trim()}`,
      );

      await selectAll.check();
      const allLabel = await exportBtn.textContent();
      const allChecked = await rowChecks.evaluateAll((els) => els.every((el) => el.checked));
      record(
        "T4-select-all",
        allChecked && allLabel?.includes(`Eksportuj zaznaczone (${rowCount})`) ? "PASS" : "FAIL",
        `allChecked=${allChecked} label=${allLabel?.trim()}`,
      );

      await rowChecks.nth(0).uncheck();
      const indeterminate = await selectAll.evaluate((el) => el.indeterminate);
      const partialLabel = await exportBtn.textContent();
      record(
        "T5-indeterminate",
        indeterminate && partialLabel?.includes("Eksportuj zaznaczone") ? "PASS" : "FAIL",
        `indeterminate=${indeterminate} label=${partialLabel?.trim()}`,
      );

      const midCounter = await counter.textContent();
      record(
        "T6-selection-counter",
        midCounter?.includes(`Zaznaczono: ${rowCount - 1}`) ? "PASS" : "FAIL",
        `counter=${midCounter?.trim()}`,
      );

      // Z indeterminate: 1. klik = zaznacz wszystkich, 2. klik = wyczyść (controlled checkbox)
      await selectAll.click();
      await page.waitForTimeout(100);
      await selectAll.click();
      await page.waitForTimeout(100);
      const zeroCounter = await counter.textContent();
      const zeroLabel = await exportBtn.textContent();
      const noneSelected = await rowChecks.evaluateAll((els) => els.every((el) => !el.checked));
      record(
        "T7-export-all-label",
        noneSelected && zeroLabel?.includes("Eksportuj wszystkich") ? "PASS" : "FAIL",
        `noneSelected=${noneSelected} counter=${zeroCounter?.trim()} label=${zeroLabel?.trim()}`,
      );

      const [downloadAll] = await Promise.all([
        page.waitForEvent("download", { timeout: 15000 }),
        exportBtn.click(),
      ]);
      const csvAll = await readDownload(downloadAll);
      const parsedAll = parseCsv(csvAll);
      const expectedHeaders = [
        "Imię i nazwisko",
        "Email",
        "Rola",
        "Status",
        "Drużyna",
        "Data dołączenia",
      ];
      const headerOk = expectedHeaders.every((h, i) => parsedAll.header[i] === h);
      const bomOk = csvAll.charCodeAt(0) === 0xfeff;
      const rowOk = parsedAll.rows.length === rowCount;
      record(
        "T7-export-all-file",
        headerOk && bomOk && rowOk ? "PASS" : "FAIL",
        `bom=${bomOk} header=${headerOk} rows=${parsedAll.rows.length}/${rowCount}`,
      );

      await rowChecks.nth(0).check();
      if (rowCount > 1) await rowChecks.nth(1).check();
      await page.waitForTimeout(100);
      const selectedForExport = rowCount > 1 ? 2 : 1;
      const [downloadSel] = await Promise.all([
        page.waitForEvent("download", { timeout: 15000 }),
        exportBtn.click(),
      ]);
      const csvSel = await readDownload(downloadSel);
      const parsedSel = parseCsv(csvSel);
      const selLabel = await exportBtn.textContent();
      record(
        "T8-export-selected-label",
        selLabel?.includes(`Eksportuj zaznaczone (${selectedForExport})`) ? "PASS" : "FAIL",
        `label=${selLabel?.trim()}`,
      );
      record(
        "T8-export-selected-file",
        parsedSel.rows.length === selectedForExport ? "PASS" : "FAIL",
        `rows=${parsedSel.rows.length} expected=${selectedForExport}`,
      );

      const polishSample = csvAll.includes("ą") || csvAll.includes("ę") || csvAll.includes("ó");
      const separatorOk = parsedAll.header.length === 6;
      record(
        "T9-csv-format",
        headerOk && separatorOk && bomOk ? "PASS" : "FAIL",
        `separatorCols=${parsedAll.header.length} polishInFile=${polishSample} (Excel open: manual)`,
      );
    }

    const actionsTrigger = page.locator('[aria-label="Akcje członka"]').first();
    if ((await actionsTrigger.count()) > 0) {
      await actionsTrigger.click();
      const menu = page.locator('[role="menu"]');
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const menuText = await menu.textContent();
      const hasRole = menuText?.includes("Zmień rolę");
      const hasSuspendOrRestore =
        menuText?.includes("Zawieś") || menuText?.includes("Przywróć");
      const hasRemove = menuText?.includes("Usuń");
      await page.keyboard.press("Escape");
      record(
        "T10-row-actions-menu",
        hasRole && hasSuspendOrRestore && hasRemove ? "PASS" : "FAIL",
        `menu=${menuText?.replace(/\s+/g, " ").trim()}`,
      );

      await actionsTrigger.click();
      await page.getByText("Zmień rolę", { exact: true }).click();
      const dialogVisible = await page.getByRole("dialog").isVisible();
      await page.getByRole("button", { name: "Anuluj" }).click();
      record(
        "T10-change-role-dialog",
        dialogVisible ? "PASS" : "FAIL",
        `dialog=${dialogVisible}`,
      );
    } else {
      record("T10-row-actions", "SKIP", "brak przycisku akcji (widok read-only lub pusta kadra)");
    }

    await page.getByRole("button", { name: /Zaproszenia/ }).click();
    const invitesFilter = await page.getByText("Wymaga działania").count();
    const invitesTable = await page.locator("table").count();
    record(
      "T11-invitations-tab",
      invitesFilter > 0 && invitesTable >= 1 ? "PASS" : "FAIL",
      `filters=${invitesFilter} tables=${invitesTable}`,
    );

    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    const afterReloadTitle = await page.locator("h1").first().textContent();
    const reactHydration = hydrationErrors.filter((e) =>
      /hydration|did not match/i.test(e),
    );
    record(
      "T12-reload-page",
      afterReloadTitle?.includes("Członkowie") ? "PASS" : "FAIL",
      `title=${afterReloadTitle?.trim()}`,
    );
    record(
      "T12-no-hydration-errors",
      reactHydration.length === 0 ? "PASS" : "FAIL",
      reactHydration.join(" | ") || "brak błędów hydration",
    );
    record(
      "T12-no-console-errors",
      consoleErrors.length === 0 ? "PASS" : "FAIL",
      consoleErrors.slice(0, 3).join(" | ") || "brak error w konsoli",
    );
  } catch (err) {
    record("FATAL", "FAIL", err.message);
  } finally {
    await browser.close();
  }

  console.log("\n=== MANUAL SMOKE 20.5C.1 SUMMARY ===");
  for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.id}: ${r.detail}`);

  const fail = results.some((r) => r.verdict === "FAIL");
  console.log(fail ? "\nMANUAL SMOKE 20.5C.1: FAIL" : "\nMANUAL SMOKE 20.5C.1: PASS");
  process.exit(fail ? 1 : 0);
}

main();
