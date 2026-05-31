"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  generateWebsiteNewsWithAi,
  publishWebsiteNews,
  upsertWebsiteNews,
  updateWebsiteBranding,
  uploadWebsiteGalleryPhoto,
  upsertWebsiteGalleryAlbum,
  updateWebsiteSocialIntegration,
  deleteWebsiteNews,
  type WebsiteActionState,
} from "@/features/website/actions";
import {
  WEBSITE_GALLERY_CATEGORIES,
  WEBSITE_GALLERY_CATEGORY_LABELS,
  WEBSITE_NEWS_CATEGORIES,
  WEBSITE_NEWS_CATEGORY_LABELS,
  WEBSITE_NEWS_STATUS_LABELS,
  WEBSITE_SOCIAL_PLATFORM_LABELS,
  WEBSITE_SOCIAL_PLATFORMS,
} from "@/lib/website/constants";
import type {
  WebsiteGalleryAlbum,
  WebsiteNews,
  WebsiteSettings,
  WebsiteSocialIntegration,
} from "@/types/website";

const initial: WebsiteActionState = {};

export function WebsiteNewsPanel({ news, canPublish }: { news: WebsiteNews[]; canPublish: boolean }) {
  const statusOptions = canPublish
    ? Object.entries(WEBSITE_NEWS_STATUS_LABELS)
    : Object.entries(WEBSITE_NEWS_STATUS_LABELS).filter(([value]) =>
        ["draft", "pending_review"].includes(value),
      );
  const [saveState, saveAction, savePending] = useActionState(upsertWebsiteNews, initial);
  const [aiState, aiAction, aiPending] = useActionState(generateWebsiteNewsWithAi, initial);
  const [pubState, pubAction, pubPending] = useActionState(publishWebsiteNews, initial);
  const [delState, delAction, delPending] = useActionState(deleteWebsiteNews, initial);

  return (
    <div className="space-y-8">
      {(saveState.error || saveState.success || aiState.error || aiState.success || pubState.error || pubState.success || delState.error || delState.success) ? (
        <p className={`text-sm ${saveState.error || aiState.error || pubState.error || delState.error ? "text-destructive" : "text-green-700"}`}>
          {saveState.error || saveState.success || aiState.error || aiState.success || pubState.error || pubState.success || delState.error || delState.success}
        </p>
      ) : null}

      <form action={aiAction} className="flex flex-wrap gap-2 rounded-xl border p-4">
        <select name="topic" className="min-h-[44px] rounded-md border px-3 text-sm" defaultValue="match_report">
          <option value="match_report">Aktualność meczowa (AI)</option>
          <option value="round_summary">Podsumowanie kolejki (AI)</option>
          <option value="club_announcement">Komunikat klubowy (AI)</option>
        </select>
        <Button type="submit" disabled={aiPending} className="min-h-[44px]">Generuj szkic AI</Button>
        <p className="w-full text-xs text-muted-foreground">Publikacja wymaga zatwierdzenia administratora.</p>
      </form>

      <form action={saveAction} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
        <input name="title" placeholder="Tytuł" required className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
        <select name="category" className="min-h-[44px] rounded-md border px-3">
          {WEBSITE_NEWS_CATEGORIES.map((c) => (
            <option key={c} value={c}>{WEBSITE_NEWS_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select name="status" className="min-h-[44px] rounded-md border px-3" defaultValue="draft">
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <textarea name="excerpt" placeholder="Lead" className="min-h-[80px] rounded-md border px-3 md:col-span-2" />
        <textarea name="content" placeholder="Treść" required className="min-h-[160px] rounded-md border px-3 md:col-span-2" />
        <input type="file" name="featuredImage" accept="image/*" className="md:col-span-2" />
        <Button type="submit" disabled={savePending} className="min-h-[44px] md:col-span-2">Zapisz wpis</Button>
      </form>

      <div className="space-y-3">
        {news.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {WEBSITE_NEWS_STATUS_LABELS[item.status]} · {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
                {item.aiGenerated ? " · AI" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canPublish && item.status !== "published" ? (
                <form action={pubAction}>
                  <input type="hidden" name="newsId" value={item.id} />
                  <Button type="submit" size="sm" disabled={pubPending} className="min-h-[44px]">Opublikuj</Button>
                </form>
              ) : null}
              <form action={delAction}>
                <input type="hidden" name="newsId" value={item.id} />
                <Button type="submit" size="sm" variant="outline" disabled={delPending} className="min-h-[44px]">Usuń</Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebsiteBrandingPanel({ settings }: { settings: WebsiteSettings | null }) {
  const [state, action, pending] = useActionState(updateWebsiteBranding, initial);

  return (
    <form action={action} className="grid max-w-2xl gap-3 rounded-xl border p-4 md:grid-cols-2">
      {state.error || state.success ? (
        <p className={`text-sm md:col-span-2 ${state.error ? "text-destructive" : "text-green-700"}`}>{state.error || state.success}</p>
      ) : null}
      <label className="text-sm md:col-span-2">
        <input type="checkbox" name="publicSiteEnabled" defaultChecked={settings?.publicSiteEnabled ?? true} className="mr-2" />
        Strona publiczna włączona
      </label>
      <input name="primaryColor" defaultValue={settings?.primaryColor} placeholder="Kolor główny" className="min-h-[44px] rounded-md border px-3" />
      <input name="secondaryColor" defaultValue={settings?.secondaryColor} placeholder="Kolor dodatkowy" className="min-h-[44px] rounded-md border px-3" />
      <input name="accentColor" defaultValue={settings?.accentColor} placeholder="Kolor akcentu" className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
      <input name="heroTitle" defaultValue={settings?.heroTitle ?? ""} placeholder="Tytuł hero" className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
      <input name="heroSubtitle" defaultValue={settings?.heroSubtitle ?? ""} placeholder="Podtytuł hero" className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
      <input name="contactAddress" defaultValue={settings?.contactAddress ?? ""} placeholder="Adres" className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
      <input name="contactEmail" defaultValue={settings?.contactEmail ?? ""} placeholder="E-mail" className="min-h-[44px] rounded-md border px-3" />
      <input name="contactPhone" defaultValue={settings?.contactPhone ?? ""} placeholder="Telefon" className="min-h-[44px] rounded-md border px-3" />
      <input name="seoTitle" defaultValue={settings?.seoTitle ?? ""} placeholder="SEO title" className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
      <textarea name="seoDescription" defaultValue={settings?.seoDescription ?? ""} placeholder="SEO description" className="min-h-[80px] rounded-md border px-3 md:col-span-2" />
      <label className="text-sm md:col-span-2">Logo<input type="file" name="logo" accept="image/*" className="mt-1 block w-full" /></label>
      <label className="text-sm md:col-span-2">Grafika hero<input type="file" name="heroImage" accept="image/*" className="mt-1 block w-full" /></label>
      <Button type="submit" disabled={pending} className="min-h-[44px] md:col-span-2">Zapisz branding</Button>
    </form>
  );
}

export function WebsiteGalleryPanel({ albums }: { albums: WebsiteGalleryAlbum[] }) {
  const [albumState, albumAction, albumPending] = useActionState(upsertWebsiteGalleryAlbum, initial);
  const [photoState, photoAction, photoPending] = useActionState(uploadWebsiteGalleryPhoto, initial);

  return (
    <div className="space-y-8">
      <form action={albumAction} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
        {albumState.error || albumState.success ? (
          <p className={`text-sm md:col-span-2 ${albumState.error ? "text-destructive" : "text-green-700"}`}>{albumState.error || albumState.success}</p>
        ) : null}
        <input name="title" placeholder="Tytuł albumu" required className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
        <select name="category" className="min-h-[44px] rounded-md border px-3">
          {WEBSITE_GALLERY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{WEBSITE_GALLERY_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" /> Opublikowany
        </label>
        <Button type="submit" disabled={albumPending} className="min-h-[44px] md:col-span-2">Utwórz album</Button>
      </form>

      <form action={photoAction} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
        {photoState.error || photoState.success ? (
          <p className={`text-sm md:col-span-2 ${photoState.error ? "text-destructive" : "text-green-700"}`}>{photoState.error || photoState.success}</p>
        ) : null}
        <select name="albumId" required className="min-h-[44px] rounded-md border px-3 md:col-span-2">
          <option value="">Wybierz album</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <input type="file" name="photo" accept="image/*" required className="md:col-span-2" />
        <input name="caption" placeholder="Podpis" className="min-h-[44px] rounded-md border px-3 md:col-span-2" />
        <Button type="submit" disabled={photoPending} className="min-h-[44px] md:col-span-2">Dodaj zdjęcie</Button>
      </form>

      <ul className="space-y-2">
        {albums.map((a) => (
          <li key={a.id} className="rounded-lg border px-4 py-3 text-sm">
            {a.title} · {WEBSITE_GALLERY_CATEGORY_LABELS[a.category]} · {a.isPublished ? "publiczny" : "szkic"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WebsiteSocialPanel({ integrations }: { integrations: WebsiteSocialIntegration[] }) {
  const [state, action, pending] = useActionState(updateWebsiteSocialIntegration, initial);
  const byPlatform = new Map(integrations.map((i) => [i.platform, i]));

  return (
    <div className="space-y-6">
      {state.error || state.success ? (
        <p className={`text-sm ${state.error ? "text-destructive" : "text-green-700"}`}>{state.error || state.success}</p>
      ) : null}
      {WEBSITE_SOCIAL_PLATFORMS.map((platform) => {
        const row = byPlatform.get(platform);
        return (
          <form key={platform} action={action} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[140px_1fr_auto]">
            <input type="hidden" name="platform" value={platform} />
            <p className="font-medium">{WEBSITE_SOCIAL_PLATFORM_LABELS[platform]}</p>
            <input
              name="profileUrl"
              defaultValue={row?.profileUrl ?? ""}
              placeholder="URL profilu"
              className="min-h-[44px] rounded-md border px-3"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isEnabled" defaultChecked={row?.isEnabled} /> Aktywny
            </label>
            <p className="text-xs text-muted-foreground md:col-span-3">
              API: {row?.apiConnected ? "połączone" : "nie połączone — integracja automatyczna w przygotowaniu"}
            </p>
            <Button type="submit" disabled={pending} className="min-h-[44px] md:col-span-3 md:max-w-[200px]">Zapisz</Button>
          </form>
        );
      })}
    </div>
  );
}
