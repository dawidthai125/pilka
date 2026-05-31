"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  importIntegrationFileAction,
  resolveSyncConflictAction,
  runIntegrationSyncAction,
  updateIntegrationConfigAction,
  upsertClubMappingAction,
  upsertExternalTeamMappingAction,
  type IntegrationActionState,
} from "@/features/integrations/actions";
import {
  DATA_FORMAT_LABELS,
  DZPN_API_NOTE,
  IMPORT_TYPE_LABELS,
  INTEGRATION_PROVIDER_DESCRIPTIONS,
  INTEGRATION_PROVIDER_LABELS,
  INTEGRATION_STATUS_LABELS,
  PZPN_API_NOTE,
  SYNC_JOB_TYPE_LABELS,
  SYNC_LOG_STATUS_LABELS,
  SYNC_TRIGGER_LABELS,
} from "@/lib/integrations/constants";
import { importsAdapter } from "@/integrations/imports";
import type {
  ExternalTeam,
  Integration,
  IntegrationClubMapping,
  IntegrationDashboardStats,
  IntegrationImport,
  IntegrationProvider,
  SyncConflict,
  SyncLog,
} from "@/types/integrations";
import type { Team } from "@/types/rbac";

const initial: IntegrationActionState = {};

export function IntegrationStatsCards({ stats }: { stats: IntegrationDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Aktywne integracje", value: stats.activeIntegrations },
        { label: "Oczekujące konflikty", value: stats.pendingConflicts },
        { label: "Błędy (ostatnie logi)", value: stats.recentErrors },
        { label: "Ostatnia synchronizacja", value: stats.lastSyncAt?.slice(0, 16) ?? "—" },
      ].map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl">{item.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function IntegrationProviderCards({
  integrations,
  canManage,
}: {
  integrations: Integration[];
  canManage: boolean;
}) {
  const [syncState, syncAction, syncPending] = useActionState(runIntegrationSyncAction, initial);

  return (
    <div className="space-y-4">
      {syncState.error ? <p className="text-sm text-destructive">{syncState.error}</p> : null}
      {syncState.success ? <p className="text-sm text-green-700">{syncState.success}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations
          .filter((i) => i.provider !== "other")
          .map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <CardTitle>{INTEGRATION_PROVIDER_LABELS[integration.provider]}</CardTitle>
                <CardDescription>{INTEGRATION_PROVIDER_DESCRIPTIONS[integration.provider]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Badge variant={integration.status === "ready" ? "default" : "secondary"}>
                  {INTEGRATION_STATUS_LABELS[integration.status]}
                </Badge>
                <p className="text-muted-foreground">Endpoint: {integration.baseUrl ?? "—"}</p>
                <p className="text-muted-foreground">
                  Ostatnia sync: {integration.lastSyncAt?.slice(0, 16) ?? "—"}
                </p>
                {integration.lastError ? (
                  <p className="text-destructive">{integration.lastError}</p>
                ) : null}
                {canManage ? (
                  <form action={syncAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="provider" value={integration.provider} />
                    <input type="hidden" name="integrationId" value={integration.id} />
                    <select name="jobType" className="min-h-[44px] rounded-md border px-2 text-sm" defaultValue="full">
                      {Object.entries(SYNC_JOB_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" disabled={syncPending} className="min-h-[44px]">
                      Synchronizuj
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

export function ProviderDetailPanel({
  provider,
  integration,
  canManage,
  apiNote,
}: {
  provider: IntegrationProvider;
  integration: Integration | null;
  canManage: boolean;
  apiNote: string;
}) {
  const [configState, configAction, configPending] = useActionState(updateIntegrationConfigAction, initial);
  const [syncState, syncAction, syncPending] = useActionState(runIntegrationSyncAction, initial);

  if (!integration) {
    return <p className="text-sm text-muted-foreground">Brak konfiguracji integracji w bazie.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{INTEGRATION_PROVIDER_LABELS[provider]}</CardTitle>
          <CardDescription>{apiNote}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Status: {INTEGRATION_STATUS_LABELS[integration.status]}</p>
          <p>Auto-sync: {integration.autoSyncEnabled ? "włączony" : "wyłączony"}</p>
        </CardContent>
      </Card>

      {(configState.error || configState.success || syncState.error || syncState.success) ? (
        <p className={`text-sm ${configState.error || syncState.error ? "text-destructive" : "text-green-700"}`}>
          {configState.error || configState.success || syncState.error || syncState.success}
        </p>
      ) : null}

      {canManage ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={configAction} className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Konfiguracja</h3>
            <input type="hidden" name="integrationId" value={integration.id} />
            <select name="status" className="min-h-[44px] w-full rounded-md border px-3" defaultValue={integration.status}>
              {Object.entries(INTEGRATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              name="baseUrl"
              placeholder="URL API (opcjonalnie)"
              defaultValue={integration.baseUrl ?? ""}
              className="min-h-[44px] w-full rounded-md border px-3"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="autoSyncEnabled" defaultChecked={integration.autoSyncEnabled} />
              Automatyczna synchronizacja
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="apiKeyConfigured" defaultChecked={integration.apiKeyConfigured} />
              Klucz API skonfigurowany (flaga — bez przechowywania sekretu w UI)
            </label>
            <Button type="submit" disabled={configPending} className="min-h-[44px]">Zapisz</Button>
          </form>

          <form action={syncAction} className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Ręczna synchronizacja</h3>
            <input type="hidden" name="provider" value={provider} />
            <input type="hidden" name="integrationId" value={integration.id} />
            <select name="jobType" className="min-h-[44px] w-full rounded-md border px-3" defaultValue="full">
              {Object.entries(SYNC_JOB_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Button type="submit" disabled={syncPending} className="min-h-[44px]">Uruchom synchronizację</Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function SyncHistoryPanel({ logs }: { logs: SyncLog[] }) {
  if (!logs.length) {
    return <p className="text-sm text-muted-foreground">Brak logów synchronizacji.</p>;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">{log.startedAt.slice(0, 16)}</p>
            <p className="text-muted-foreground">{INTEGRATION_PROVIDER_LABELS[log.provider]} · {SYNC_JOB_TYPE_LABELS[log.jobType]}</p>
            <Badge className="mt-2" variant={log.status === "success" ? "default" : log.status === "partial" ? "secondary" : "destructive"}>
              {SYNC_LOG_STATUS_LABELS[log.status]}
            </Badge>
            <p className="mt-2">{log.message}</p>
            {log.recordsProcessed > 0 || log.recordsFailed > 0 ? (
              <p className="mt-1 text-muted-foreground">
                Przetworzono: {log.recordsProcessed}, błędy: {log.recordsFailed}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Źródło</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Wyzwalacz</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rezultat</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-4 py-3 whitespace-nowrap">{log.startedAt.slice(0, 16)}</td>
                <td className="px-4 py-3">{INTEGRATION_PROVIDER_LABELS[log.provider]}</td>
                <td className="px-4 py-3">{SYNC_JOB_TYPE_LABELS[log.jobType]}</td>
                <td className="px-4 py-3">{SYNC_TRIGGER_LABELS[log.triggerType]}</td>
                <td className="px-4 py-3">
                  <Badge variant={log.status === "success" ? "default" : log.status === "partial" ? "secondary" : "destructive"}>
                    {SYNC_LOG_STATUS_LABELS[log.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {log.message}
                  {log.creatorName ? ` · ${log.creatorName}` : ""}
                  {log.recordsProcessed > 0 || log.recordsFailed > 0
                    ? ` (przetworzono: ${log.recordsProcessed}, błędy: ${log.recordsFailed})`
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function SyncErrorsPanel({ logs }: { logs: SyncLog[] }) {
  if (!logs.length) return <p className="text-sm text-muted-foreground">Brak błędów synchronizacji.</p>;
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">{INTEGRATION_PROVIDER_LABELS[log.provider]} · {SYNC_LOG_STATUS_LABELS[log.status]}</p>
          <p className="mt-1 text-muted-foreground">{log.message}</p>
          {log.qualityIssues.length ? (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {log.qualityIssues.map((issue, idx) => (
                <li key={`${log.id}-${idx}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ImportPanel({ canManage }: { canManage: boolean }) {
  const [state, action, pending] = useActionState(importIntegrationFileAction, initial);

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">Import dostępny dla administratora integracji.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{importsAdapter.excelNote}</p>
      <p className="text-sm text-muted-foreground">
        Obsługiwane formaty: {importsAdapter.supportedFormats.map((f) => DATA_FORMAT_LABELS[f]).join(", ")}
      </p>
      {(state.error || state.success) ? (
        <p className={`text-sm ${state.error ? "text-destructive" : "text-green-700"}`}>{state.error || state.success}</p>
      ) : null}
      <form action={action} className="grid max-w-xl gap-3 rounded-xl border p-4">
        <select name="importType" className="min-h-[44px] rounded-md border px-3" required defaultValue="fixtures">
          {Object.entries(IMPORT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="file"
          name="file"
          accept=".csv,.json,.txt"
          required
          className="min-h-[44px] w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2"
        />
        <Button type="submit" disabled={pending} className="min-h-[44px] w-fit">Importuj plik</Button>
      </form>
    </div>
  );
}

export function ImportsHistoryPanel({ imports }: { imports: IntegrationImport[] }) {
  if (!imports.length) return <p className="text-sm text-muted-foreground">Brak importów.</p>;
  return (
    <>
      <div className="space-y-3 md:hidden">
        {imports.map((item) => (
          <div key={item.id} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">{item.fileName}</p>
            <p className="text-muted-foreground">{IMPORT_TYPE_LABELS[item.importType]} · {DATA_FORMAT_LABELS[item.format]}</p>
            <p className="mt-1">Status: {item.status}</p>
            <p className="text-muted-foreground">
              {item.rowsImported}/{item.rowsTotal} wierszy (błędy: {item.rowsFailed})
            </p>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Plik</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Wiersze</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">{item.fileName}</td>
                <td className="px-4 py-3">{IMPORT_TYPE_LABELS[item.importType]}</td>
                <td className="px-4 py-3">{DATA_FORMAT_LABELS[item.format]}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{item.rowsImported}/{item.rowsTotal} (błędy: {item.rowsFailed})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ClubMappingsPanel({
  mappings,
  canManage,
}: {
  mappings: IntegrationClubMapping[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(upsertClubMappingAction, initial);

  return (
    <div className="space-y-6">
      {(state.error || state.success) ? (
        <p className={`text-sm ${state.error ? "text-destructive" : "text-green-700"}`}>{state.error || state.success}</p>
      ) : null}
      <div className="space-y-3">
        {mappings.map((m) => (
          <div key={m.id} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">{m.publicName} ↔ {m.leagueName}</p>
            {m.externalClubId ? <p className="text-muted-foreground">ID zewn.: {m.externalClubId}</p> : null}
            {m.notes ? <p className="mt-1 text-muted-foreground">{m.notes}</p> : null}
          </div>
        ))}
      </div>
      {canManage ? (
        <form action={action} className="grid max-w-xl gap-3 rounded-xl border p-4 md:grid-cols-2">
          <input name="publicName" placeholder="Nazwa publiczna (Piorun Wawrzeńczyce)" required className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
          <input name="leagueName" placeholder="Nazwa ligowa (GLKS Mietków)" required className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
          <input name="externalClubId" placeholder="ID zewnętrzne (opcjonalnie)" className="min-h-[44px] rounded-md border px-3" />
          <select name="provider" className="min-h-[44px] rounded-md border px-3" defaultValue="dzpn">
            <option value="dzpn">DZPN</option>
            <option value="pzpn">PZPN</option>
            <option value="manual">Ręczne</option>
          </select>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="isPrimary" /> Mapowanie główne
          </label>
          <textarea name="notes" placeholder="Notatki" className="min-h-[60px] rounded-md border px-3 md:col-span-2" />
          <Button type="submit" disabled={pending} className="min-h-[44px] md:col-span-2">Dodaj mapowanie</Button>
        </form>
      ) : null}
    </div>
  );
}

export function TeamMappingsPanel({
  externalTeams,
  teams,
  canManage,
}: {
  externalTeams: ExternalTeam[];
  teams: Team[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(upsertExternalTeamMappingAction, initial);

  return (
    <div className="space-y-6">
      {(state.error || state.success) ? (
        <p className={`text-sm ${state.error ? "text-destructive" : "text-green-700"}`}>{state.error || state.success}</p>
      ) : null}
      <div className="space-y-3 md:hidden">
        {externalTeams.map((t) => (
          <div key={t.id} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">{t.externalName}</p>
            <p className="text-muted-foreground">{t.categoryLabel} · ID: {t.externalId}</p>
            <p className="mt-1">Drużyna: {teams.find((x) => x.id === t.teamId)?.name ?? "—"}</p>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Kategoria</th>
              <th className="px-4 py-3">Nazwa zewn.</th>
              <th className="px-4 py-3">ID zewn.</th>
              <th className="px-4 py-3">Drużyna w systemie</th>
            </tr>
          </thead>
          <tbody>
            {externalTeams.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="px-4 py-3">{t.categoryLabel}</td>
                <td className="px-4 py-3">{t.externalName}</td>
                <td className="px-4 py-3">{t.externalId}</td>
                <td className="px-4 py-3">{teams.find((x) => x.id === t.teamId)?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManage ? (
        <form action={action} className="grid max-w-xl gap-3 rounded-xl border p-4 md:grid-cols-2">
          <input name="categoryLabel" placeholder="Kategoria (np. Seniorzy)" required className="min-h-[44px] rounded-md border px-3" />
          <input name="externalName" placeholder="Nazwa w systemie zewn." required className="min-h-[44px] rounded-md border px-3" />
          <input name="externalId" placeholder="ID zewnętrzne" required className="min-h-[44px] rounded-md border px-3" />
          <select name="teamId" className="min-h-[44px] rounded-md border px-3">
            <option value="">— bez powiązania —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>
          <Button type="submit" disabled={pending} className="min-h-[44px] md:col-span-2">Zapisz mapowanie drużyny</Button>
        </form>
      ) : null}
    </div>
  );
}

export function ConflictsPanel({
  conflicts,
  canManage,
}: {
  conflicts: SyncConflict[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(resolveSyncConflictAction, initial);

  if (!conflicts.length) {
    return <p className="text-sm text-muted-foreground">Brak oczekujących konfliktów.</p>;
  }

  return (
    <div className="space-y-4">
      {state.error || state.success ? (
        <p className={`text-sm ${state.error ? "text-destructive" : "text-green-700"}`}>{state.error || state.success}</p>
      ) : null}
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="rounded-xl border p-4 text-sm">
          <p className="font-medium">{conflict.entityType} · {conflict.entityKey}</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(conflict.localData, null, 2)}</pre>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(conflict.externalData, null, 2)}</pre>
          </div>
          {canManage ? (
            <form action={action} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="conflictId" value={conflict.id} />
              <select name="resolution" className="min-h-[44px] rounded-md border px-2">
                <option value="keep_local">Zachowaj lokalne</option>
                <option value="keep_external">Zachowaj zewnętrzne</option>
                <option value="dismissed">Odrzuć</option>
              </select>
              <Button type="submit" size="sm" disabled={pending} className="min-h-[44px]">Rozstrzygnij</Button>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export { PZPN_API_NOTE, DZPN_API_NOTE };
