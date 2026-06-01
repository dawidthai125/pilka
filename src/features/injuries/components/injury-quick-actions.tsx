import Link from "next/link";
import { HeartPulse, RefreshCw, Stethoscope } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InjuryQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/injuries/report"
        className={cn(buttonVariants({ variant: "default", size: "sm" }))}
      >
        <HeartPulse className="mr-1 size-4" />
        Zgłoś uraz
      </Link>
      <Link
        href="/injuries/registry"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Stethoscope className="mr-1 size-4" />
        Aktualizuj rehabilitację
      </Link>
      <Link
        href="/injuries/registry"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <RefreshCw className="mr-1 size-4" />
        Oznacz powrót
      </Link>
    </div>
  );
}
