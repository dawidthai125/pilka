"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClubAction, type PlatformActionState } from "@/features/platform/actions";
import { slugifyClubInput } from "@/lib/platform/slug";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = ["Nazwa klubu", "Slug", "Kolory", "Właściciel", "Podsumowanie"] as const;
const initialState: PlatformActionState = {};

export function CreateClubWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [publicName, setPublicName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0B3D2E");
  const [secondaryColor, setSecondaryColor] = useState("#F4C430");
  const [accentColor, setAccentColor] = useState("#FFFFFF");
  const [isTest, setIsTest] = useState(false);
  const [state, action, pending] = useActionState(createClubAction, initialState);

  const suggestedSlug = useMemo(() => slugifyClubInput(publicName), [publicName]);

  useEffect(() => {
    if (!slugTouched && publicName) setSlug(suggestedSlug);
  }, [publicName, suggestedSlug, slugTouched]);

  useEffect(() => {
    if (state.success && state.clubId) {
      router.push(`/platform/clubs/${state.clubId}`);
    }
  }, [state.success, state.clubId, router]);

  function nextStep() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const canContinue =
    (step === 0 && publicName.trim().length >= 2) ||
    (step === 1 && slug.trim().length >= 3) ||
    (step === 2 && true) ||
    (step === 3 && ownerEmail.includes("@")) ||
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
            {step === 0 && "Publiczna nazwa klubu widoczna na stronie i w panelu."}
            {step === 1 && "Unikalny identyfikator URL — np. /pilot-club"}
            {step === 2 && "Kolory brandingu strony publicznej."}
            {step === 3 && "E-mail właściciela — zaproszenie jeśli konto nie istnieje."}
            {step === 4 && "Sprawdź dane przed utworzeniem klubu."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.error ? (
            <p className="mb-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-200">{state.error}</p>
          ) : null}

          {step === 0 ? (
            <div className="space-y-2">
              <Label htmlFor="publicName">Nazwa klubu</Label>
              <Input
                id="publicName"
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                placeholder="Pilot Club"
                className="border-white/20 bg-white text-foreground"
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugifyClubInput(e.target.value));
                  }}
                  className="border-white/20 bg-white text-foreground"
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["primaryColor", "Kolor główny", primaryColor, setPrimaryColor],
                ["secondaryColor", "Kolor akcentu", secondaryColor, setSecondaryColor],
                ["accentColor", "Kolor dodatkowy", accentColor, setAccentColor],
              ].map(([id, label, value, setter]) => (
                <div key={id as string} className="space-y-2">
                  <Label htmlFor={id as string}>{label as string}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id={id as string}
                      type="color"
                      value={value as string}
                      onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                      className="size-10 cursor-pointer rounded border border-white/20 bg-transparent"
                    />
                    <Input
                      value={value as string}
                      onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                      className="border-white/20 bg-white font-mono text-sm text-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">E-mail właściciela</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@pilot-club.pl"
                className="border-white/20 bg-white text-foreground"
              />
            </div>
          ) : null}

          {step === 4 ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-white/45">Nazwa</dt><dd className="font-medium">{publicName}</dd></div>
              <div><dt className="text-white/45">Slug</dt><dd className="font-mono">/{slug}</dd></div>
              <div><dt className="text-white/45">Właściciel</dt><dd>{ownerEmail}</dd></div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    name="isTestPreview"
                    checked={isTest}
                    onChange={(e) => setIsTest(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Klub testowy (settings.isTest — ukryty w alertach i attention)
                </label>
              </div>
              <div className="flex gap-2">
                {[primaryColor, secondaryColor, accentColor].map((c) => (
                  <span key={c} className="size-8 rounded border border-white/20" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            </dl>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={prevStep} className="border-white/20 bg-transparent text-white hover:bg-white/10">
              Wstecz
            </Button>
          ) : (
            <Link
              href="/platform/clubs"
              className={buttonVariants({ variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10" })}
            >
              Anuluj
            </Link>
          )}
        </div>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={nextStep} disabled={!canContinue}>
            Dalej
          </Button>
        ) : (
          <form action={action}>
            <input type="hidden" name="publicName" value={publicName} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="ownerEmail" value={ownerEmail} />
            <input type="hidden" name="primaryColor" value={primaryColor} />
            <input type="hidden" name="secondaryColor" value={secondaryColor} />
            <input type="hidden" name="accentColor" value={accentColor} />
            {isTest ? <input type="hidden" name="isTest" value="true" /> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Tworzenie…" : "Utwórz klub"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
