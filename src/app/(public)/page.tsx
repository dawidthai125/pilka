import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Football Club OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
        <p className="max-w-2xl text-muted-foreground">{siteConfig.description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/login" className={cn(buttonVariants())}>
          Zaloguj się
        </Link>
        <Link href="/register" className={cn(buttonVariants({ variant: "outline" }))}>
          Rejestracja
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-medium">ETAP 1 — gotowy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Logowanie, panel klubu, drużyny, role RBAC i dashboard. Uruchom{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run setup:stage1</code>{" "}
          po ustawieniu hasła bazy w <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      </div>
    </section>
  );
}
