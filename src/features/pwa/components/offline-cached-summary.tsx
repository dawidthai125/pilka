"use client";

import { useEffect, useState } from "react";

import { readOfflineCache, OFFLINE_CACHE_KEYS } from "@/lib/pwa/offline-store";

type ScheduleCache = {
  matches: Array<{ home_team_name: string; away_team_name: string; match_date: string }>;
  trainings: Array<{ title: string; training_date: string }>;
};

export function OfflineCachedSummary() {
  const [online, setOnline] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleCache | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => {
      setOnline(false);
      void readOfflineCache<ScheduleCache>(OFFLINE_CACHE_KEYS.schedule).then(setSchedule);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if (!navigator.onLine) {
      void readOfflineCache<ScheduleCache>(OFFLINE_CACHE_KEYS.schedule).then(setSchedule);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online || !schedule) return null;

  const matchCount = schedule.matches?.length ?? 0;
  const trainingCount = schedule.trainings?.length ?? 0;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium text-amber-900 dark:text-amber-100">Tryb offline</p>
      <p className="mt-1 text-amber-800 dark:text-amber-200">
        Wyświetlam zapisany terminarz: {matchCount} meczów, {trainingCount} treningów.
      </p>
    </section>
  );
}
