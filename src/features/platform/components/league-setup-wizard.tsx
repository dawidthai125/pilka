"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  activateLeagueSyncAction,
  saveLeagueConfigurationAction,
  type PlatformLeagueActionState,
} from "@/features/platform/league-actions";
import { ValidationResultsPanel } from "@/features/platform/components/league-validation-panel";
import { LEAGUE_PROVIDERS, type LeagueProviderId } from "@/lib/platform/league-providers";
import type { LeagueSetupSnapshot } from "@/lib/platform/league-setup-snapshot";
import { configInputFromSnapshot } from "@/lib/platform/league-setup-snapshot";
import { defaultSeasonLabel } from "@/lib/platform/slug";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = ["Źródło", "Liga", "Sezon", "Walidacja", "Sync"] as const;
const initialState: PlatformLeagueActionState = {};

export function LeagueSetupWizard({
  clubId,
  clubName,
  initialSnapshot,
}: {
  clubId: string;
  clubName: string;
  initialSnapshot: LeagueSetupSnapshot;
}) {
  const router = useRouter();
  const partial = configInputFromSnapshot(initialSnapshot);
  const [step, setStep] = useState(0);
  const [providerId, setProviderId] = useState<LeagueProviderId>(partial.providerId ?? "mirror_live");
  const [seasonName, setSeasonName] = useState(partial.seasonName || initialSnapshot.seasonName || defaultSeasonLabel());
  const [competitionName, setCompetitionName] = useState(
    partial.competitionName || initialSnapshot.competitionName || "",
  );
  const [categoryLabel, setCategoryLabel] = useState("");
  const [ownLeagueName, setOwnLeagueName] = useState(partial.ownLeagueName || clubName);
  const [ownDisplayName, setOwnDisplayName] = useState(partial.ownDisplayName || clubName);
  const [ninetyMinutUrl, setNinetyMinutUrl] = useState(partial.ninetyMinutUrl || "");
  const [regionalnyFutbolUrl, setRegionalnyFutbolUrl] = useState(partial.regionalnyFutbolUrl || "");
  const [regiowynikiKadraUrl, setRegiowynikiKadraUrl] = useState(partial.regiowynikiKadraUrl || "");
  const [lnpAccessToken, setLnpAccessToken] = useState("");
  const [lnpTeamId, setLnpTeamId] = useState(partial.lnpTeamId || "");
  const [lnpSeasonId, setLnpSeasonId] = useState(partial.lnpSeasonId || "");
  const [lnpLeagueId, setLnpLeagueId] = useState(partial.lnpLeagueId || "");
  const [manualAdapter, setManualAdapter] = useState<"csv" | "json">(partial.manualAdapter ?? "csv");

  const [saveState, saveAction, savePending] = useActionState(saveLeagueConfigurationAction, initialState);
  const [activateState, activateAction, activatePending] = useActionState(activateLeagueSyncAction, initialState);

  useEffect(() => {
    if (activateState.success) {
      router.refresh();
    }
  }, [activateState.success, router]);

  const provider = LEAGUE_PROVIDERS.find((p) => p.id === providerId)!;

  function buildHiddenFields() {
    return (
      <>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="providerId" value={providerId} />
        <input type="hidden" name="seasonName" value={seasonName} />
        <input type="hidden" name="competitionName" value={competitionName} />
        <input type="hidden" name="categoryLabel" value={categoryLabel} />
        <input type="hidden" name="ownLeagueName" value={ownLeagueName} />
        <input type="hidden" name="ownDisplayName" value={ownDisplayName} />
        <input type="hidden" name="ninetyMinutUrl" value={ninetyMinutUrl} />
        <input type="hidden" name="regionalnyFutbolUrl" value={regionalnyFutbolUrl} />
        <input type="hidden" name="regiowynikiKadraUrl" value={regiowynikiKadraUrl} />
        <input type="hidden" name="lnpAccessToken" value={lnpAccessToken} />
        <input type="hidden" name="lnpTeamId" value={lnpTeamId} />
        <input type="hidden" name="lnpSeasonId" value={lnpSeasonId} />
        <input type="hidden" name="lnpLeagueId" value={lnpLeagueId} />
        <input type="hidden" name="manualAdapter" value={manualAdapter} />
      </>
    );
  }

  const canContinue =
    (step === 0 && Boolean(providerId)) ||
    (step === 1 && competitionName.trim().length >= 2) ||
    (step === 2 && seasonName.trim().length >= 4) ||
    step === 3 ||
    step === 4;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              index === step ? "bg-[var(--club-secondary,#F4C430)] text-[#041810]" : "bg-white/10 text-white/60",
              index < step && "bg-emerald-500/20 text-emerald-200",
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription className="text-white/55">
            {step === 0 && "Wybierz związek / źródło danych ligowych."}
            {step === 1 && "Nazwa rozgrywek i kategoria."}
            {step === 2 && "Sezon ligowy klubu."}
            {step === 3 && "Sprawdź konfigurację przed aktywacją."}
            {step === 4 && "Aktywuj synchronizację ligi."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 ? (
            <div className="grid gap-3">
              {LEAGUE_PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "cursor-pointer rounded-lg border p-4 transition",
                    providerId === p.id ? "border-[var(--club-secondary,#F4C430)] bg-white/10" : "border-white/10 hover:bg-white/5",
                  )}
                >
                  <input
                    type="radio"
                    name="providerPick"
                    className="sr-only"
                    checked={providerId === p.id}
                    onChange={() => setProviderId(p.id)}
                  />
                  <p className="font-medium">{p.label}</p>
                  <p className="mt-1 text-sm text-white/55">{p.description}</p>
                </label>
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="competitionName">Nazwa rozgrywek / ligi</Label>
                <Input
                  id="competitionName"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  placeholder="Klasa B — Dolnośląska Gr. Wrocław VII"
                  className="border-white/20 bg-white text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryLabel">Kategoria (opcjonalnie)</Label>
                <Input
                  id="categoryLabel"
                  value={categoryLabel}
                  onChange={(e) => setCategoryLabel(e.target.value)}
                  placeholder="Seniorzy"
                  className="border-white/20 bg-white text-foreground"
                />
              </div>
              {providerId === "manual_import" ? (
                <div className="space-y-2">
                  <Label htmlFor="manualAdapter">Format importu</Label>
                  <select
                    id="manualAdapter"
                    value={manualAdapter}
                    onChange={(e) => setManualAdapter(e.target.value === "json" ? "json" : "csv")}
                    className="w-full min-h-[44px] rounded-md border border-white/20 bg-white px-2 text-foreground"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="seasonName">Sezon</Label>
                <Input
                  id="seasonName"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="2025/2026"
                  className="border-white/20 bg-white text-foreground"
                />
              </div>
              {providerId === "mirror_live" ? (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ownLeagueName">Nazwa drużyny w lidze</Label>
                    <Input
                      id="ownLeagueName"
                      value={ownLeagueName}
                      onChange={(e) => setOwnLeagueName(e.target.value)}
                      className="border-white/20 bg-white text-foreground"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ownDisplayName">Nazwa w FC OS</Label>
                    <Input
                      id="ownDisplayName"
                      value={ownDisplayName}
                      onChange={(e) => setOwnDisplayName(e.target.value)}
                      className="border-white/20 bg-white text-foreground"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ninetyMinutUrl">URL 90minut.pl</Label>
                    <Input
                      id="ninetyMinutUrl"
                      value={ninetyMinutUrl}
                      onChange={(e) => setNinetyMinutUrl(e.target.value)}
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="regionalnyFutbolUrl">URL regionalnyfutbol.pl</Label>
                    <Input
                      id="regionalnyFutbolUrl"
                      value={regionalnyFutbolUrl}
                      onChange={(e) => setRegionalnyFutbolUrl(e.target.value)}
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="regiowynikiKadraUrl">URL kadry regiowyniki.pl (opcjonalnie)</Label>
                    <Input
                      id="regiowynikiKadraUrl"
                      value={regiowynikiKadraUrl}
                      onChange={(e) => setRegiowynikiKadraUrl(e.target.value)}
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="lnpAccessToken">Token mPZPN (opcjonalnie)</Label>
                    <Input
                      id="lnpAccessToken"
                      type="password"
                      value={lnpAccessToken}
                      onChange={(e) => setLnpAccessToken(e.target.value)}
                      placeholder="Bearer JWT z laczynaspilka.pl"
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lnpTeamId">UUID drużyny mPZPN</Label>
                    <Input
                      id="lnpTeamId"
                      value={lnpTeamId}
                      onChange={(e) => setLnpTeamId(e.target.value)}
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lnpSeasonId">UUID sezonu mPZPN (opcj.)</Label>
                    <Input
                      id="lnpSeasonId"
                      value={lnpSeasonId}
                      onChange={(e) => setLnpSeasonId(e.target.value)}
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
                <p>
                  <span className="text-white/45">Źródło:</span> {provider.label}
                </p>
                <p>
                  <span className="text-white/45">Sezon:</span> {seasonName}
                </p>
                <p>
                  <span className="text-white/45">Rozgrywki:</span> {competitionName}
                </p>
              </div>
              {saveState.error ? (
                <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-200">{saveState.error}</p>
              ) : null}
              {saveState.success ? (
                <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{saveState.success}</p>
              ) : null}
              {saveState.validation ? <ValidationResultsPanel validation={saveState.validation} /> : null}
              <form action={saveAction}>
                {buildHiddenFields()}
                <Button type="submit" disabled={savePending} className="w-full sm:w-auto">
                  {savePending ? "Zapisywanie…" : "Zapisz i zweryfikuj"}
                </Button>
              </form>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              {activateState.error ? (
                <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-200">{activateState.error}</p>
              ) : null}
              {activateState.success ? (
                <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{activateState.success}</p>
              ) : null}
              {activateState.validation ? <ValidationResultsPanel validation={activateState.validation} /> : null}
              <form action={activateAction}>
                <input type="hidden" name="clubId" value={clubId} />
                <Button type="submit" disabled={activatePending || !saveState.success} className="w-full sm:w-auto">
                  {activatePending ? "Aktywowanie…" : "Aktywuj synchronizację"}
                </Button>
              </form>
              {!saveState.success ? (
                <p className="text-sm text-amber-200">Najpierw zapisz konfigurację w kroku Walidacja.</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            {step > 0 && step !== 3 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="border-white/20 bg-transparent text-white">
                Wstecz
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Dalej
              </Button>
            ) : null}
            {step === 3 && saveState.success ? (
              <Button type="button" onClick={() => setStep(4)}>
                Przejdź do aktywacji
              </Button>
            ) : null}
            <Link
              href={`/platform/clubs/${clubId}/league`}
              className={buttonVariants({ variant: "ghost", className: "text-white/60 hover:text-white" })}
            >
              Status ligi →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
