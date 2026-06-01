"use client";

import { useEffect } from "react";

/** Rejestruje SW globalnie — wymagane dla instalacji PWA przed logowaniem. */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
  }, []);

  return null;
}
