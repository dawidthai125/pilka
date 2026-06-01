"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t, getStoredLocale } from "@/lib/pwa/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("fcos-install-dismissed") === "1") {
      setHidden(true);
    }
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || hidden || !deferred) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border bg-card p-4 shadow-lg md:bottom-6 md:left-auto md:right-6">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("install.prompt", getStoredLocale())}</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void deferred.prompt().then(() => setDeferred(null));
              }}
            >
              Zainstaluj
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                localStorage.setItem("fcos-install-dismissed", "1");
                setHidden(true);
              }}
            >
              Później
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Ukryj"
          className="rounded-md p-1 hover:bg-muted"
          onClick={() => {
            localStorage.setItem("fcos-install-dismissed", "1");
            setHidden(true);
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
