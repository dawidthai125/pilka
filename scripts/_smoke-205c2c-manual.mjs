#!/usr/bin/env node
/**
 * Sprint 20.5C.2C — Manual smoke: Bulk Remove.
 *
 * UWAGA: TEST-A i TEST-D usuwają członków z bazy (mutacja). Uruchamiaj na klubie testowym.
 * Wymaga: npm run build && npm run start (nie next dev).
 * Lokalnie: SMOKE_BASE_URL=http://localhost:3000 (domyślnie .env.local może wskazywać prod).
 */
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
const bulkSamples = [];

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

async function gotoMembers(page) {
  await page.goto(`${BASE_URL}/members`, { waitUntil: "networkidle", timeout: 60000 });
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("columnheader", { name: "Imię i nazwisko" }).waitFor({
    state: "visible",
    timeout: 15000,
  });
  await membersTable(page).locator('tbody input[type="checkbox"]').first().waitFor({
    state: "visible",
    timeout: 15000,
  });
}

function membersTable(page) {
  return page
    .locator("table")
    .filter({ has: page.getByRole("columnheader", { name: "Imię i nazwisko" }) })
    .first();
}

async function scrapeMembers(page) {
  const rows = membersTable(page).locator("tbody tr");
  const count = await rows.count();
  const out = [];
  for (let index = 0; index < count; index++) {
    const row = rows.nth(index);
    const cells = row.locator("td");
    out.push({
      index,
      name: (await cells.nth(1).textContent())?.trim() ?? "",
      role: (await cells.nth(3).textContent())?.trim() ?? "",
      status: (await cells.nth(4).textContent())?.trim() ?? "",
    });
  }
  return out;
}

async function clearSelection(page) {
  const header = membersTable(page).locator('thead input[type="checkbox"]');
  if (await header.isChecked()) {
    await header.click();
    await page.waitForTimeout(150);
    await header.click();
  }
}

async function selectRowsByIndex(page, indices) {
  const checks = membersTable(page).locator('tbody input[type="checkbox"]');
  for (const i of indices) {
    const box = checks.nth(i);
    if (!(await box.isChecked())) await box.click();
  }
  await page.waitForTimeout(400);
}

async function dismissBulkResultPanel(page) {
  const panel = page
    .getByRole("status")
    .filter({ hasText: /Usunięto|Zmieniono rolę|Zawieszono|Przywrócono/ });
  if ((await panel.count()) === 0) return;
  const closeBtn = panel.first().getByRole("button", { name: "Zamknij" });
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click();
    await panel.first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
}

function isOwnerMember(member) {
  return member.role === "Właściciel";
}

function parseRemoveBulkSummary(text) {
  const noneRemoved = /Usunięto 0 z (\d+)/.exec(text);
  if (noneRemoved) {
    const total = +noneRemoved[1];
    const skippedMatch = text.match(/(\d+) pominięto/);
    const failedMatch = text.match(/(\d+) nie udało się/);
    return {
      succeeded: 0,
      total,
      skipped: skippedMatch ? +skippedMatch[1] : total,
      failed: failedMatch ? +failedMatch[1] : 0,
      raw: text,
    };
  }
  const fullPlural = text.match(/Usunięto (\d+) członków/);
  if (fullPlural) {
    return { succeeded: +fullPlural[1], total: +fullPlural[1], skipped: 0, failed: 0, raw: text };
  }
  const fullSingular = text.match(/Usunięto (\d+) członka/);
  if (fullSingular) {
    return { succeeded: +fullSingular[1], total: +fullSingular[1], skipped: 0, failed: 0, raw: text };
  }
  const partial = text.match(/Usunięto (\d+) z (\d+)/);
  if (partial) {
    const succeeded = +partial[1];
    const total = +partial[2];
    const skippedMatch = text.match(/(\d+) pominięto/);
    const failedMatch = text.match(/(\d+) nie udało się/);
    return {
      succeeded,
      total,
      skipped: skippedMatch ? +skippedMatch[1] : 0,
      failed: failedMatch ? +failedMatch[1] : 0,
      raw: text,
    };
  }
  return { succeeded: -1, total: -1, skipped: -1, failed: -1, raw: text };
}

function bulkRemoveToolbarButton(page) {
  return page.getByRole("button", { name: /Usuń \(\d+\)/ });
}

async function openBulkRemoveDialog(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some((b) =>
        /Usuń \(\d+\)/.test(b.textContent ?? ""),
      ),
    undefined,
    { timeout: 20000 },
  );
  const removeBtn = bulkRemoveToolbarButton(page);
  await removeBtn.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  return dialog;
}

async function runBulkRemove(page, { acknowledge = true } = {}) {
  const dialog = await openBulkRemoveDialog(page);
  const submit = dialog.locator('button[type="submit"]');
  if (acknowledge) {
    await dialog.locator('input[type="checkbox"]').check();
  }
  const postPromise = page.waitForResponse(
    (resp) => resp.url().includes("/members") && resp.request().method() === "POST",
    { timeout: 20000 },
  );
  await submit.click();
  if (!acknowledge) {
    await page.waitForTimeout(300);
    return { submitted: false, dialogStillOpen: await dialog.isVisible() };
  }
  await postPromise;
  await dialog.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  const statusPanel = page.getByRole("status").filter({ hasText: "Usunięto" });
  await statusPanel.waitFor({ state: "visible", timeout: 15000 });
  const summary = (await statusPanel.textContent())?.trim() ?? "";
  const parsed = parseRemoveBulkSummary(summary);
  bulkSamples.push({ ...parsed, summary });
  return { submitted: true, parsed, summary };
}

async function readDownload(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    serviceWorkers: "block",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const hydrationErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => hydrationErrors.push(err.message));
  try {
    await login(page);
    await gotoMembers(page);
    let members = await scrapeMembers(page);
    const initialCount = members.length;

    // TEST C — confirmation checkbox (before destructive A)
    const removableForCheckbox = members
      .filter((m) => !isOwnerMember(m))
      .slice(0, 1);
    if (removableForCheckbox.length >= 1) {
      await clearSelection(page);
      await selectRowsByIndex(page, [removableForCheckbox[0].index]);
      const dialog = await openBulkRemoveDialog(page);
      const submit = dialog.locator('button[type="submit"]');
      const disabledWithoutAck = await submit.isDisabled();
      await submit.click({ force: true }).catch(() => {});
      const stillOpen = await dialog.isVisible();
      await dialog.locator('input[type="checkbox"]').check();
      const enabledAfterAck = !(await submit.isDisabled());
      await dialog.getByRole("button", { name: "Anuluj" }).click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 });
      const ok = disabledWithoutAck && stillOpen && enabledAfterAck;
      record(
        "TEST-C",
        ok ? "PASS" : "FAIL",
        `disabledWithoutAck=${disabledWithoutAck} stillOpen=${stillOpen} enabledAfterAck=${enabledAfterAck}`,
      );
      await clearSelection(page);
    } else {
      record("TEST-C", "SKIP", "brak non-owner do zaznaczenia");
    }

    // TEST A — bulk remove 2 members
    await gotoMembers(page);
    members = await scrapeMembers(page);
    const removable = members.filter((m) => !isOwnerMember(m)).slice(0, 2);
    if (removable.length >= 2) {
      const namesBefore = removable.map((m) => m.name);
      await clearSelection(page);
      await selectRowsByIndex(page, removable.map((m) => m.index));
      const result = await runBulkRemove(page);
      const ok =
        result.submitted &&
        result.parsed.succeeded === 2 &&
        result.parsed.skipped === 0 &&
        result.parsed.failed === 0;
      record(
        "TEST-A",
        ok ? "PASS" : "FAIL",
        `result=${JSON.stringify(result.parsed)} members=${namesBefore.join(", ")}`,
      );
      await page.waitForTimeout(1500);
      await gotoMembers(page);
      members = await scrapeMembers(page);
      const namesStillPresent = namesBefore.filter((n) => members.some((m) => m.name === n));
      record(
        "TEST-A-table",
        namesStillPresent.length === 0 ? "PASS" : "FAIL",
        `removed=${namesBefore.join(",")} stillPresent=${namesStillPresent.join(",")} count=${members.length}/${initialCount}`,
      );
      await dismissBulkResultPanel(page);
    } else {
      record("TEST-A", "FAIL", `tylko ${removable.length} non-owner — wymagane 2`);
      record("TEST-A-table", "SKIP", "");
    }

    // TEST B — owner exclusion
    await gotoMembers(page);
    members = await scrapeMembers(page);
    const ownerRow = members.find((m) => isOwnerMember(m));
    const nonOwner = members.find((m) => !isOwnerMember(m));
    if (ownerRow && nonOwner) {
      await clearSelection(page);
      await selectRowsByIndex(page, [ownerRow.index, nonOwner.index]);
      const toolbarLabel = await bulkRemoveToolbarButton(page).textContent();
      const hint = (await page.getByText("Właściciel wykluczony z operacji zbiorczych").count()) > 0;
      const ownerNameBefore = ownerRow.name;
      const nonOwnerNameBefore = nonOwner.name;
      const countBefore = members.length;
      const result = await runBulkRemove(page);
      await page.waitForTimeout(1500);
      await gotoMembers(page);
      members = await scrapeMembers(page);
      const ownerStill = members.some((m) => m.name === ownerNameBefore);
      const nonOwnerGone = !members.some((m) => m.name === nonOwnerNameBefore);
      const ok =
        toolbarLabel?.includes("Usuń (1)") &&
        hint &&
        result.parsed.succeeded === 1 &&
        result.parsed.total === 1 &&
        ownerStill &&
        nonOwnerGone &&
        members.length === countBefore - 1;
      record(
        "TEST-B",
        ok ? "PASS" : "FAIL",
        `toolbar=${toolbarLabel} hint=${hint} result=${JSON.stringify(result.parsed)} ownerKept=${ownerStill} nonOwnerRemoved=${nonOwnerGone}`,
      );
      await dismissBulkResultPanel(page);
      await clearSelection(page);
    } else {
      record("TEST-B", "SKIP", "brak owner lub non-owner");
    }

    // TEST D — single-row remove regression
    await gotoMembers(page);
    members = await scrapeMembers(page);
    const single = members.find((m) => !isOwnerMember(m));
    if (single) {
      const nameBefore = single.name;
      const countBefore = members.length;
      const row = membersTable(page).locator("tbody tr").nth(single.index);
      await row.locator('[aria-label="Akcje członka"]').click();
      await page.getByRole("menuitem", { name: "Usuń" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      await dialog.getByRole("button", { name: "Usuń", exact: true }).click();
      await page.waitForTimeout(2000);
      await gotoMembers(page);
      members = await scrapeMembers(page);
      const gone = !members.some((m) => m.name === nameBefore);
      const countOk = members.length === countBefore - 1;
      record(
        "TEST-D",
        gone && countOk ? "PASS" : "FAIL",
        `${nameBefore}: gone=${gone} count ${countBefore}->${members.length}`,
      );
    } else {
      record("TEST-D", "SKIP", "brak non-owner do usunięcia");
    }

    // TEST E — CSV export regression
    await gotoMembers(page);
    await clearSelection(page);
    const memberCount = (await scrapeMembers(page)).length;
    if (memberCount >= 1) {
      const [dlAll] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }),
        page.getByRole("button", { name: /Eksportuj wszystkich/ }).click(),
      ]);
      const csvAll = await readDownload(dlAll);
      const allRows = csvAll.replace(/^\uFEFF/, "").split(/\r?\n/).length - 1;
      const pick = [0, 1].filter((i) => i < memberCount);
      if (pick.length >= 1) {
        await selectRowsByIndex(page, pick);
        const [dlSel] = await Promise.all([
          page.waitForEvent("download", { timeout: 10000 }),
          page.getByRole("button", { name: /Eksportuj zaznaczone/ }).click(),
        ]);
        const csvSel = await readDownload(dlSel);
        const selRows = csvSel.replace(/^\uFEFF/, "").split(/\r?\n/).length - 1;
        record(
          "TEST-E",
          allRows >= 1 && selRows === pick.length && csvAll.includes("Imię i nazwisko")
            ? "PASS"
            : "FAIL",
          `allRows=${allRows} selRows=${selRows} pick=${pick.length}`,
        );
      } else {
        record("TEST-E", "SKIP", "za mało wierszy do eksportu zaznaczonych");
      }
    } else {
      record("TEST-E", "SKIP", "brak członków");
    }

    // TEST F — invitations regression
    await page.getByRole("button", { name: /Zaproszenia/ }).click();
    const hasFilters = (await page.getByText("Wymaga działania").count()) > 0;
    const hasTable = (await page.locator("table").count()) >= 1;
    record(
      "TEST-F",
      hasFilters && hasTable ? "PASS" : "FAIL",
      `filters=${hasFilters} table=${hasTable}`,
    );

    // TEST G — runtime regression
    await page.goto(`${BASE_URL}/members`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    const hydra = hydrationErrors.filter((e) => /hydration|did not match/i.test(e));
    const noisyConsole = consoleErrors.filter(
      (e) => !/favicon|404|Failed to load resource/i.test(e),
    );
    record(
      "TEST-G",
      hydra.length === 0 && noisyConsole.length === 0 ? "PASS" : "FAIL",
      `hydration=${hydra.join("|") || "none"} console=${noisyConsole.slice(0, 3).join("|") || "none"}`,
    );
  } catch (err) {
    record("FATAL", "FAIL", err.message);
  } finally {
    await browser.close();
  }

  console.log("\n=== BULK REMOVE SAMPLES ===");
  for (const sample of bulkSamples) {
    console.log(
      JSON.stringify({
        operation: "remove",
        total: sample.total,
        succeeded: sample.succeeded,
        skipped: sample.skipped,
        failed: sample.failed,
        summary: sample.summary,
      }),
    );
  }

  console.log("\n=== SMOKE 20.5C.2C SUMMARY ===");
  for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.id}: ${r.detail}`);

  const fail = results.some((r) => r.verdict === "FAIL");
  console.log(fail ? "\nSMOKE 20.5C.2C: NO-GO" : "\nSMOKE 20.5C.2C: GO");
  process.exit(fail ? 1 : 0);
}

main();
