import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getDashboardContext,
  requireWebsiteCmsAccess,
} from "@/lib/auth/session";

export default async function WebsiteCmsPage() {
  const { access } = await getDashboardContext();
  requireWebsiteCmsAccess(access);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Strona klubu (CMS)</h1>
        <p className="text-sm text-muted-foreground">Zarządzanie treściami publicznej strony i panelu kibica.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/website/news" className={cn(buttonVariants({ variant: "outline" }))}>Aktualności</Link>
        <Link href="/website/gallery" className={cn(buttonVariants({ variant: "outline" }))}>Galeria</Link>
        <Link href="/website/branding" className={cn(buttonVariants({ variant: "outline" }))}>Branding</Link>
        <Link href="/website/social" className={cn(buttonVariants({ variant: "outline" }))}>Social media</Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))} target="_blank">Podgląd strony</Link>
      </div>
    </div>
  );
}
