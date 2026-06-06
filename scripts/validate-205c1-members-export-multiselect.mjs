#!/usr/bin/env node
/**
 * Sprint 20.5C.1 — Members CSV Export + Multi Select validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function testExportHelper() {
  const helper = read("src/lib/members/export-members-csv.ts");

  assert(helper.includes("export function buildMembersCsvContent"), "buildMembersCsvContent");
  assert(helper.includes("export function downloadMembersCsv"), "downloadMembersCsv");
  assert(helper.includes("Imię i nazwisko"), "CSV column: name");
  assert(helper.includes("Email"), "CSV column: email");
  assert(helper.includes("Rola"), "CSV column: role");
  assert(helper.includes("Status"), "CSV column: status");
  assert(helper.includes("Drużyna"), "CSV column: team");
  assert(helper.includes("Data dołączenia"), "CSV column: join date");
  assert(helper.includes("\\uFEFF"), "UTF-8 BOM for Excel");
  assert(helper.includes("sanitizeCsvCell"), "CSV injection sanitization");
  assert(helper.includes("member.team?.name"), "team name in export");
  console.log("OK export-members-csv helper");
}

function testMembersPanelMultiSelect() {
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(panel.includes("export-members-csv"), "panel imports export helper");
  assert(panel.includes("downloadMembersCsv"), "panel uses downloadMembersCsv");
  assert(panel.includes('type="checkbox"'), "checkbox inputs");
  assert(panel.includes("indeterminate"), "indeterminate select-all state");
  assert(panel.includes("Zaznaczono"), "selection counter");
  assert(panel.includes("Eksportuj zaznaczone"), "export selected label");
  assert(panel.includes("Eksportuj wszystkich"), "export all label");
  assert(panel.includes("selectedIds"), "selection state");
  console.log("OK members panel multi-select and export UX");
}

function testNoNewServerSurface() {
  const actions = read("src/features/members/actions.ts");
  const panel = read("src/features/members/components/members-panel.tsx");

  assert(!actions.includes("exportMembers"), "no exportMembers server action");
  assert(!actions.includes("export async function export"), "no new export actions");
  assert(!panel.includes("@/lib/members/invitations"), "client/server split preserved");
  console.log("OK no new server actions or API surface");
}

function testRegression205a205b205b3() {
  const panel = read("src/features/members/components/members-panel.tsx");
  const actions = read("src/features/members/actions.ts");
  const dashboard = read("src/features/members/components/members-dashboard.tsx");

  assert(panel.includes("Imię i nazwisko"), "205a table column: name");
  assert(panel.includes("Email"), "205a table column: email");
  assert(panel.includes("Data dołączenia"), "205a table column: join date");
  assert(panel.includes("Zmień rolę"), "205a action: change role");
  assert(panel.includes("Zawieś"), "205a action: suspend");
  assert(panel.includes("Przywróć"), "205a action: reactivate");
  assert(panel.includes("Usuń"), "205a action: remove");
  assert(panel.includes("Brak członków klubu"), "205a empty state");
  assert(panel.includes("changeMemberRole"), "205a role change wired");
  assert(panel.includes("suspendMember"), "205a suspend wired");
  assert(dashboard.includes("MembersPanel"), "205b3 members panel");
  assert(dashboard.includes("InvitationsPanel"), "205b invitations panel");
  assert(actions.includes("export async function inviteMember"), "205b invite");
  assert(actions.includes("export async function resendInvite"), "205b resend");
  assert(actions.includes("export async function revokeInvite"), "205b revoke");
  console.log("OK regression 20.5A/20.5B/20.5B.3");
}

function main() {
  testExportHelper();
  testMembersPanelMultiSelect();
  testNoNewServerSurface();
  testRegression205a205b205b3();
  console.log("\nvalidate-205c1-members-export-multiselect: PASS");
}

main();
