import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getClub,
  getDashboardContext,
  requireWebsiteCmsAccess,
} from "@/lib/auth/session";
import { clubPublicPath } from "@/lib/tenant/public-club";

export default async function WebsiteCmsPage() {
  const { access } = await getDashboardContext();
  requireWebsiteCmsAccess(access);
  const club = await getClub(access.clubId);
  const previewHref = club?.slug ? clubPublicPath(club.slug) : "/";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Strona klubu (CMS)</h1>
        <p className="text-sm text-muted-foreground">Zarządzanie treściami publicznej strony i panelu kibica.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/website/news" className={cn(buttonVariants({ variant: "outline" }))}>Aktualności</Link>
        <Link href="/website/media" className={cn(buttonVariants({ variant: "outline" }))}>Media</Link>
        <Link href="/website/gallery" className={cn(buttonVariants({ variant: "outline" }))}>Galeria</Link>
        <Link href="/website/branding" className={cn(buttonVariants({ variant: "outline" }))}>Branding</Link>
        <Link href="/website/social" className={cn(buttonVariants({ variant: "outline" }))}>Social media</Link>
        <Link href={previewHref} className={cn(buttonVariants({ variant: "outline" }))} target="_blank">Podgląd strony</Link>
      </div>
    </div>
  );
}
