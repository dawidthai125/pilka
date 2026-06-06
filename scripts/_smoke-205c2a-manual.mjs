#!/usr/bin/env node
/**
 * Sprint 20.5C.2A — Manual smoke: Bulk Suspend + Bulk Reactivate.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3003";
const EMAIL = process.env.SMOKE_OWNER_EMAIL ?? "wlasciciel@piorun.test";
const PASS = process.env.SETUP_TEST_PASSWORD ?? "Piorun2026!";

const results = [];
const bulkResults = [];

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
  } else {
    const counter = await page.locator('[aria-live="polite"]').textContent();
    if (counter?.includes("Zaznaczono")) {
      await header.click();
      await page.waitForTimeout(150);
      await header.click();
    }
  }
}

async function dismissBulkResultPanel(page) {
  const panel = page
    .getByRole("status")
    .filter({ hasText: /Zawieszono|Przywrócono/ });
  if ((await panel.count()) === 0) return;
  const closeBtn = panel.first().getByRole("button", { name: "Zamknij" });
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click();
    await panel.first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
}

async function selectRowsByIndex(page, indices) {
  const checks = membersTable(page).locator('tbody input[type="checkbox"]');
  for (const i of indices) {
    const box = checks.nth(i);
    if (!(await box.isChecked())) {
      await box.click();
    }
  }
}

async function getCounterText(page) {
  return (await page.locator('[aria-live="polite"]').textContent())?.trim() ?? "";
}

async function getToolbarButtonLabel(page, prefix) {
  const btn = page.locator("div.bg-muted\\/20").getByRole("button", { name: new RegExp(`^${prefix}`) });
  if ((await btn.count()) === 0) return null;
  return (await btn.first().textContent())?.trim() ?? "";
}

function isOwnerMember(member) {
  return member.role === "Właściciel";
}

function parseBulkSummary(text, operation) {
  const verb = operation === "suspend" ? "Zawieszono" : "Przywrócono";
  const fullPlural = text.match(new RegExp(`${verb} (\\d+) członków`));
  if (fullPlural) {
    return { succeeded: +fullPlural[1], total: +fullPlural[1], skipped: 0, failed: 0, raw: text };
  }
  const fullSingular = text.match(new RegExp(`${verb} (\\d+) członka`));
  if (fullSingular) {
    return { succeeded: +fullSingular[1], total: +fullSingular[1], skipped: 0, failed: 0, raw: text };
  }
  const partial = text.match(new RegExp(`${verb} (\\d+) z (\\d+)`));
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

async function runBulkAction(page, operation) {
  const prefix = operation === "suspend" ? "Zawieś" : "Przywróć";
  const verb = operation === "suspend" ? "Zawieszono" : "Przywrócono";
  const toolbarBtn = page.locator("div.bg-muted\\/20").getByRole("button", { name: new RegExp(`^${prefix}`) });
  await toolbarBtn.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  const dialogTitle = await dialog.locator("h3").textContent();
  const postPromise = page.waitForResponse(
    (resp) => resp.url().includes("/members") && resp.request().method() === "POST",
    { timeout: 20000 },
  );
  await dialog.locator('button[type="submit"]').click();
  await postPromise;
  await dialog.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  const statusPanel = page.getByRole("status").filter({ hasText: verb });
  await statusPanel.waitFor({ state: "visible", timeout: 15000 });
  const summary = (await statusPanel.textContent())?.trim() ?? "";
  const parsed = parseBulkSummary(summary, operation);
  bulkResults.push({ operation, ...parsed, dialogTitle });
  return parsed;
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
    await gotoMembers(page);

    let members = await scrapeMembers(page);
    const activeIdx = members.filter((m) => m.status === "Aktywny").map((m) => m.index);
    const suspendedIdx = members.filter((m) => m.status === "Zawieszony").map((m) => m.index);

    record(
      "SETUP",
      activeIdx.length >= 2 && suspendedIdx.length >= 0 ? "PASS" : "INFO",
      `active=${activeIdx.length} suspended=${suspendedIdx.length} total=${members.length}`,
    );

    // TEST 4 — Toolbar counts
    await clearSelection(page);
    const t4a = await getCounterText(page);
    record("T4-A-zero-selected", t4a.includes("Brak zaznaczenia") ? "PASS" : "FAIL", t4a);

    if (activeIdx.length >= 1) {
      await selectRowsByIndex(page, [activeIdx[0]]);
      const t4bCounter = await getCounterText(page);
      const t4bSuspend = await getToolbarButtonLabel(page, "Zawieś");
      const t4bReactivate = await getToolbarButtonLabel(page, "Przywróć");
      const ok =
        t4bCounter.includes("Zaznaczono: 1") &&
        t4bSuspend?.includes("Zawieś (1)") &&
        (t4bReactivate?.includes("Przywróć") && !t4bReactivate.includes("(1)"));
      record(
        "T4-B-one-active",
        ok ? "PASS" : "FAIL",
        `counter=${t4bCounter} suspend=${t4bSuspend} reactivate=${t4bReactivate}`,
      );
      await clearSelection(page);
    } else {
      record("T4-B-one-active", "SKIP", "brak active");
    }

    members = await scrapeMembers(page);
    const suspendedIdx2 = members.filter((m) => m.status === "Zawieszony").map((m) => m.index);
    if (suspendedIdx2.length >= 1) {
      await selectRowsByIndex(page, [suspendedIdx2[0]]);
      const t4cCounter = await getCounterText(page);
      const t4cSuspend = await getToolbarButtonLabel(page, "Zawieś");
      const t4cReactivate = await getToolbarButtonLabel(page, "Przywróć");
      const ok =
        t4cCounter.includes("Zaznaczono: 1") &&
        t4cReactivate?.includes("Przywróć (1)") &&
        t4cSuspend === "Zawieś";
      record(
        "T4-C-one-suspended",
        ok ? "PASS" : "FAIL",
        `counter=${t4cCounter} suspend=${t4cSuspend} reactivate=${t4cReactivate}`,
      );
      await clearSelection(page);
    } else {
      record("T4-C-one-suspended", "SKIP", "brak suspended przed testami");
    }

    members = await scrapeMembers(page);
    const activeForMixed = members.filter((m) => m.status === "Aktywny").map((m) => m.index);
    const suspForMixed = members.filter((m) => m.status === "Zawieszony").map((m) => m.index);
    if (activeForMixed.length >= 1 && suspForMixed.length >= 1) {
      await selectRowsByIndex(page, [activeForMixed[0], suspForMixed[0]]);
      const t4dCounter = await getCounterText(page);
      const t4dSuspend = await getToolbarButtonLabel(page, "Zawieś");
      const t4dReactivate = await getToolbarButtonLabel(page, "Przywróć");
      const ok =
        t4dCounter.includes("Zaznaczono: 2") &&
        t4dSuspend?.includes("Zawieś (1)") &&
        t4dReactivate?.includes("Przywróć (1)");
      record(
        "T4-D-mixed",
        ok ? "PASS" : "FAIL",
        `counter=${t4dCounter} suspend=${t4dSuspend} reactivate=${t4dReactivate}`,
      );
      await clearSelection(page);
    } else {
      record("T4-D-mixed", "SKIP", "brak pary active+suspended");
    }

    // P0 — Owner protection
    members = await scrapeMembers(page);
    const ownerRow = members.find((m) => isOwnerMember(m));
    const nonOwnerActive = members.find((m) => m.status === "Aktywny" && !isOwnerMember(m));
    if (ownerRow && nonOwnerActive) {
      await clearSelection(page);
      await selectRowsByIndex(page, [ownerRow.index, nonOwnerActive.index]);
      const counter = await getCounterText(page);
      const hint = await page.getByText("Właściciel wykluczony z operacji zbiorczych").count();
      const suspendLabel = await getToolbarButtonLabel(page, "Zawieś");
      const ok =
        counter.includes("Zaznaczono: 2") &&
        hint > 0 &&
        suspendLabel === "Zawieś (1)";
      record(
        "P0-owner-protection",
        ok ? "PASS" : "FAIL",
        `counter=${counter} suspend=${suspendLabel} hint=${hint > 0}`,
      );
      await clearSelection(page);
    } else {
      record("P0-owner-protection", "SKIP", "brak owner lub active non-owner");
    }

    // TEST 5 — Dialog cancel
    members = await scrapeMembers(page);
    const activeForDialog = members
      .filter((m) => m.status === "Aktywny" && !isOwnerMember(m))
      .map((m) => m.index);
    if (activeForDialog.length >= 1) {
      await selectRowsByIndex(page, [activeForDialog[0]]);
      await page.locator("div.bg-muted\\/20").getByRole("button", { name: /^Zawieś/ }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      const title = await dialog.locator("h3").textContent();
      const confirmLabel = await dialog.getByRole("button", { name: /^Zawieś/ }).textContent();
      await dialog.getByRole("button", { name: "Anuluj" }).click();
      await page.waitForTimeout(300);
      const dialogGone = !(await dialog.isVisible().catch(() => false));
      const stillSelected = (await getCounterText(page)).includes("Zaznaczono: 1");
      record(
        "T5-dialog-cancel",
        dialogGone && stillSelected && title?.includes("Zawieś") ? "PASS" : "FAIL",
        `title=${title} confirm=${confirmLabel} dialogGone=${dialogGone}`,
      );
      await clearSelection(page);
    } else {
      record("T5-dialog-cancel", "SKIP", "brak active");
    }

    // TEST 1 — Bulk Suspend (2 active)
    members = await scrapeMembers(page);
    const activeTwo = members
      .filter((m) => m.status === "Aktywny" && !isOwnerMember(m))
      .map((m) => m.index)
      .slice(0, 2);
    if (activeTwo.length >= 2) {
      await selectRowsByIndex(page, activeTwo);
      const parsed = await runBulkAction(page, "suspend");
      const names = activeTwo.map((i) => members[i].name).join(", ");
      const ok =
        parsed.succeeded === 2 && parsed.skipped === 0 && parsed.failed === 0;
      record(
        "T1-bulk-suspend",
        ok ? "PASS" : "FAIL",
        `result=${JSON.stringify(parsed)} members=[${names}]`,
      );
      await page.waitForTimeout(1500);
      members = await scrapeMembers(page);
      const nowSuspended = activeTwo.every((i) => members[i]?.status === "Zawieszony");
      record("T1-status-refresh", nowSuspended ? "PASS" : "FAIL", `statuses after suspend`);

      // TEST 10 — selection cleared
      const counter = await getCounterText(page);
      const t10ok = counter.includes("Brak zaznaczenia");
      record("T10-selection-cleared", t10ok ? "PASS" : "FAIL", counter);
      await dismissBulkResultPanel(page);
    } else {
      record("T1-bulk-suspend", "FAIL", `tylko ${activeTwo.length} active — wymagane 2`);
      record("T1-status-refresh", "SKIP", "");
      record("T10-selection-cleared", "SKIP", "");
    }

    // TEST 3 — Eligible-only semantics (variant A: 2 selected, 1 eligible → total=1)
    await gotoMembers(page);
    members = await scrapeMembers(page);
    const a3 = members.find((m) => m.status === "Aktywny" && !isOwnerMember(m))?.index;
    const s3 = members.find((m) => m.status === "Zawieszony")?.index;
    if (a3 !== undefined && s3 !== undefined) {
      await dismissBulkResultPanel(page);
      await clearSelection(page);
      await selectRowsByIndex(page, [a3, s3]);
      await page.waitForTimeout(300);
      const t3Suspend = await getToolbarButtonLabel(page, "Zawieś");
      const parsed = await runBulkAction(page, "suspend");
      const hasDetails = (await page.getByRole("button", { name: "Pokaż szczegóły" }).count()) > 0;
      const ok =
        t3Suspend === "Zawieś (1)" &&
        parsed.succeeded === 1 &&
        parsed.total === 1 &&
        parsed.skipped === 0 &&
        parsed.failed === 0 &&
        !hasDetails;
      record(
        "T3-eligible-only",
        ok ? "PASS" : "FAIL",
        `toolbar=${t3Suspend} result=${JSON.stringify(parsed)} partialPanel=${hasDetails}`,
      );
      await dismissBulkResultPanel(page);
      await clearSelection(page);
    } else {
      record("T3-eligible-only", "SKIP", `active=${a3} suspended=${s3}`);
    }

    // TEST 2 — Bulk Reactivate (2 suspended)
    await gotoMembers(page);
    members = await scrapeMembers(page);
    const suspTwo = members
      .filter((m) => m.status === "Zawieszony" && !isOwnerMember(m))
      .map((m) => m.index)
      .slice(0, 2);
    if (suspTwo.length >= 2) {
      await selectRowsByIndex(page, suspTwo);
      const parsed = await runBulkAction(page, "reactivate");
      const ok =
        parsed.succeeded === 2 && parsed.skipped === 0 && parsed.failed === 0;
      record(
        "T2-bulk-reactivate",
        ok ? "PASS" : "FAIL",
        `result=${JSON.stringify(parsed)}`,
      );
      await page.waitForTimeout(1500);
      members = await scrapeMembers(page);
      const nowActive = suspTwo.every((i) => members[i]?.status === "Aktywny");
      record("T2-status-refresh", nowActive ? "PASS" : "FAIL", "statuses after reactivate");
    } else {
      record("T2-bulk-reactivate", "FAIL", `tylko ${suspTwo.length} suspended — wymagane 2`);
      record("T2-status-refresh", "SKIP", "");
    }

    // TEST 6 — Single row actions
    await gotoMembers(page);
    members = await scrapeMembers(page);
    const singleActive = members.find((m) => m.status === "Aktywny" && !isOwnerMember(m));
    if (singleActive) {
      const row = membersTable(page).locator("tbody tr").nth(singleActive.index);
      await row.locator('[aria-label="Akcje członka"]').click();
      await page.getByRole("menuitem", { name: "Zawieś" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Zawieś" }).click();
      await page.waitForTimeout(2000);
      await gotoMembers(page);
      members = await scrapeMembers(page);
      const suspended = members[singleActive.index]?.status === "Zawieszony";
      record("T6-single-suspend", suspended ? "PASS" : "FAIL", `status=${members[singleActive.index]?.status}`);

      const row2 = membersTable(page).locator("tbody tr").nth(singleActive.index);
      await row2.locator('[aria-label="Akcje członka"]').click();
      await page.getByRole("menuitem", { name: "Przywróć" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Przywróć" }).click();
      await page.waitForTimeout(2000);
      await gotoMembers(page);
      members = await scrapeMembers(page);
      const reactivated = members[singleActive.index]?.status === "Aktywny";
      record("T6-single-reactivate", reactivated ? "PASS" : "FAIL", `status=${members[singleActive.index]?.status}`);
    } else {
      record("T6-single-suspend", "SKIP", "brak active");
      record("T6-single-reactivate", "SKIP", "");
    }

    // TEST 7 — CSV export regression
    await gotoMembers(page);
    await clearSelection(page);
    const [dlAll] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.getByRole("button", { name: /Eksportuj wszystkich/ }).click(),
    ]);
    const csvAll = await readDownload(dlAll);
    const allRows = csvAll.replace(/^\uFEFF/, "").split(/\r?\n/).length - 1;
    const memberCount = (await scrapeMembers(page)).length;
    await selectRowsByIndex(page, [0, 1].filter((i) => i < memberCount));
    const [dlSel] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.getByRole("button", { name: /Eksportuj zaznaczone/ }).click(),
    ]);
    const csvSel = await readDownload(dlSel);
    const selRows = csvSel.replace(/^\uFEFF/, "").split(/\r?\n/).length - 1;
    const t7ok = allRows >= 1 && selRows === 2 && csvAll.includes("Imię i nazwisko");
    record("T7-csv-export", t7ok ? "PASS" : "FAIL", `allRows=${allRows} selRows=${selRows}`);

    // TEST 8 — Invitations tab
    await page.getByRole("button", { name: /Zaproszenia/ }).click();
    const invOk =
      (await page.getByText("Wymaga działania").count()) > 0 &&
      (await page.locator("table").count()) >= 1;
    record("T8-invitations", invOk ? "PASS" : "FAIL", `filters+table`);

    // TEST 9 — Runtime
    await page.reload({ waitUntil: "networkidle" });
    const hydra = hydrationErrors.filter((e) => /hydration|did not match/i.test(e));
    record(
      "T9-runtime",
      hydra.length === 0 && consoleErrors.length === 0 ? "PASS" : "FAIL",
      `hydration=${hydra.join("|") || "none"} console=${consoleErrors.slice(0, 2).join("|") || "none"}`,
    );
  } catch (err) {
    record("FATAL", "FAIL", err.message);
  } finally {
    await browser.close();
  }

  console.log("\n=== BULK RESULTS SAMPLES ===");
  for (const r of bulkResults) console.log(JSON.stringify(r));

  console.log("\n=== SMOKE 20.5C.2A SUMMARY ===");
  for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.id}: ${r.detail}`);

  const fail = results.some((r) => r.verdict === "FAIL");
  console.log(fail ? "\nSMOKE 20.5C.2A: NO-GO" : "\nSMOKE 20.5C.2A: GO");
  process.exit(fail ? 1 : 0);
}

main();
