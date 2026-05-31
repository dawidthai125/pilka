"use server";

import { revalidatePath } from "next/cache";

import {
  canCreateWebsiteNews,
  canManageWebsite,
  canPublishWebsiteNews,
} from "@/config/permissions";
import { getClub, requireAccessContext } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import { buildWebsiteAiNewsDraft } from "@/lib/website/insights";
import { slugifyNewsTitle } from "@/lib/website/mappers";
import { WEBSITE_GALLERY_CATEGORIES, WEBSITE_NEWS_CATEGORIES } from "@/lib/website/constants";
import {
  buildWebsiteGalleryPhotoPath,
  buildWebsiteHeroPath,
  buildWebsiteLogoPath,
  buildWebsiteNewsImagePath,
  validateWebsiteImage,
} from "@/lib/website/uploads";
import { createClient } from "@/lib/supabase/server";
import type { WebsiteGalleryCategory, WebsiteNewsCategory, WebsiteSocialPlatform } from "@/types/website";

export type WebsiteActionState = { error?: string; success?: string; id?: string };

function revalidateWebsitePaths() {
  const paths = [
    "/website",
    "/website/news",
    "/website/gallery",
    "/website/branding",
    "/website/social",
    "/",
    "/aktualnosci",
    "/mecze",
    "/druzyna",
    "/tabela",
    "/sponsorzy",
    "/galeria",
    "/kontakt",
    "/kibic",
  ];
  for (const path of paths) revalidatePath(path);
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateWebsiteBranding(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canManageWebsite(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const payload = {
    primary_color: readString(formData, "primaryColor") || "#0B3D2E",
    secondary_color: readString(formData, "secondaryColor") || "#F4C430",
    accent_color: readString(formData, "accentColor") || "#FFFFFF",
    hero_title: readString(formData, "heroTitle") || null,
    hero_subtitle: readString(formData, "heroSubtitle") || null,
    contact_address: readString(formData, "contactAddress") || null,
    contact_email: readString(formData, "contactEmail") || null,
    contact_phone: readString(formData, "contactPhone") || null,
    google_maps_embed_url: readString(formData, "googleMapsEmbedUrl") || null,
    seo_title: readString(formData, "seoTitle") || null,
    seo_description: readString(formData, "seoDescription") || null,
    public_site_enabled: formData.get("publicSiteEnabled") === "on",
  };

  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const validation = validateWebsiteImage(logoFile);
    if (validation) return { error: validation };
    const path = buildWebsiteLogoPath(access.clubId, logoFile.name, "light");
    const { error: uploadError } = await supabase.storage.from("club-assets").upload(path, logoFile, {
      contentType: logoFile.type,
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };
    Object.assign(payload, { logo_path: path });
  }

  const heroFile = formData.get("heroImage");
  if (heroFile instanceof File && heroFile.size > 0) {
    const validation = validateWebsiteImage(heroFile);
    if (validation) return { error: validation };
    const path = buildWebsiteHeroPath(access.clubId, heroFile.name);
    const { error: uploadError } = await supabase.storage.from("club-assets").upload(path, heroFile, {
      contentType: heroFile.type,
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };
    Object.assign(payload, { hero_image_path: path });
  }

  const { error } = await supabase.from("website_settings").upsert({
    club_id: access.clubId,
    ...payload,
  });

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Ustawienia strony zapisane." };
}

export async function upsertWebsiteNews(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canCreateWebsiteNews(access.roles)) return { error: "Brak uprawnień." };

  const id = readString(formData, "id") || crypto.randomUUID();
  const title = readString(formData, "title");
  const content = readString(formData, "content");
  const category = readString(formData, "category") as WebsiteNewsCategory;
  const status = readString(formData, "status") || "draft";
  const slug = readString(formData, "slug") || slugifyNewsTitle(title);

  if (!title || !content) return { error: "Tytuł i treść są wymagane." };
  if (!WEBSITE_NEWS_CATEGORIES.includes(category)) return { error: "Nieprawidłowa kategoria." };

  if (status === "published" && !canPublishWebsiteNews(access.roles)) {
    return { error: "Brak uprawnień do publikacji." };
  }

  if (
    !canPublishWebsiteNews(access.roles) &&
    !["draft", "pending_review"].includes(status)
  ) {
    return { error: "Trener może zapisać tylko szkic lub wysłać do zatwierdzenia." };
  }

  const supabase = await createClient();
  let featuredImagePath: string | null = readString(formData, "featuredImagePath") || null;
  const imageFile = formData.get("featuredImage");
  if (imageFile instanceof File && imageFile.size > 0) {
    const validation = validateWebsiteImage(imageFile);
    if (validation) return { error: validation };
    featuredImagePath = buildWebsiteNewsImagePath(access.clubId, id, imageFile.name);
    const { error: uploadError } = await supabase.storage.from("club-assets").upload(featuredImagePath, imageFile, {
      contentType: imageFile.type,
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await supabase.from("website_news").upsert({
    id,
    club_id: access.clubId,
    slug,
    title,
    excerpt: readString(formData, "excerpt") || null,
    content,
    category,
    status,
    featured_image_path: featuredImagePath,
    author_id: access.userId,
    published_at: status === "published" ? new Date().toISOString() : null,
    seo_title: readString(formData, "seoTitle") || null,
    seo_description: readString(formData, "seoDescription") || null,
    ai_generated: formData.get("aiGenerated") === "true",
  });

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: status === "published" ? "Wpis opublikowany." : "Wpis zapisany.", id };
}

export async function publishWebsiteNews(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canPublishWebsiteNews(access.roles)) return { error: "Brak uprawnień." };

  const newsId = readString(formData, "newsId");
  if (!newsId) return { error: "Brak identyfikatora wpisu." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("website_news")
    .select("status")
    .eq("id", newsId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!existing) return { error: "Nie znaleziono wpisu." };
  if (!["draft", "pending_review"].includes(String(existing.status))) {
    return { error: "Tylko szkic lub wpis do zatwierdzenia można opublikować." };
  }

  const { error } = await supabase
    .from("website_news")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", newsId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Wpis opublikowany." };
}

export async function generateWebsiteNewsWithAi(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canCreateWebsiteNews(access.roles)) return { error: "Brak uprawnień." };

  const topic = readString(formData, "topic") as "match_report" | "round_summary" | "club_announcement";
  if (!topic) return { error: "Wybierz typ aktualności." };

  const club = await getClub(access.clubId);
  if (!club) return { error: "Nie znaleziono klubu." };

  const draft = await buildWebsiteAiNewsDraft(access.clubId, topic, getClubBrandingName(club));
  if (!draft) return { error: "AI niedostępne lub błąd generowania." };

  const id = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("website_news").insert({
    id,
    club_id: access.clubId,
    slug: slugifyNewsTitle(draft.title),
    title: draft.title,
    excerpt: draft.excerpt,
    content: draft.content,
    category: draft.category,
    status: "pending_review",
    author_id: access.userId,
    ai_generated: true,
  });

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Szkic AI utworzony — wymaga zatwierdzenia.", id };
}

export async function upsertWebsiteGalleryAlbum(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canManageWebsite(access.roles)) return { error: "Brak uprawnień." };

  const id = readString(formData, "id") || crypto.randomUUID();
  const title = readString(formData, "title");
  const slug = readString(formData, "slug") || slugifyNewsTitle(title);
  const category = readString(formData, "category") as WebsiteGalleryCategory;
  if (!title) return { error: "Podaj tytuł albumu." };
  if (!WEBSITE_GALLERY_CATEGORIES.includes(category)) return { error: "Nieprawidłowa kategoria albumu." };

  const supabase = await createClient();
  const { error } = await supabase.from("website_gallery_albums").upsert({
    id,
    club_id: access.clubId,
    slug,
    title,
    description: readString(formData, "description") || null,
    category,
    sort_order: Number(readString(formData, "sortOrder") || "0"),
    is_published: formData.get("isPublished") === "on",
  });

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Album zapisany.", id };
}

export async function uploadWebsiteGalleryPhoto(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canManageWebsite(access.roles)) return { error: "Brak uprawnień." };

  const albumId = readString(formData, "albumId");
  const file = formData.get("photo");
  if (!albumId || !(file instanceof File) || file.size === 0) {
    return { error: "Wybierz album i zdjęcie." };
  }

  const validation = validateWebsiteImage(file);
  if (validation) return { error: validation };

  const photoId = crypto.randomUUID();
  const path = buildWebsiteGalleryPhotoPath(access.clubId, albumId, photoId, file.name);
  const supabase = await createClient();

  const { data: album } = await supabase
    .from("website_gallery_albums")
    .select("id")
    .eq("id", albumId)
    .eq("club_id", access.clubId)
    .maybeSingle();
  if (!album) return { error: "Nieprawidłowy album." };

  const { error: uploadError } = await supabase.storage.from("club-assets").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("website_gallery_photos").insert({
    id: photoId,
    club_id: access.clubId,
    album_id: albumId,
    image_path: path,
    caption: readString(formData, "caption") || null,
    sort_order: Number(readString(formData, "sortOrder") || "0"),
  });

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Zdjęcie dodane." };
}

export async function updateWebsiteSocialIntegration(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canManageWebsite(access.roles)) return { error: "Brak uprawnień." };

  const platform = readString(formData, "platform") as WebsiteSocialPlatform;
  const profileUrl = readString(formData, "profileUrl") || null;
  if (!platform) return { error: "Wybierz platformę." };
  if (profileUrl && !isValidHttpUrl(profileUrl)) return { error: "Nieprawidłowy adres URL profilu." };

  const supabase = await createClient();
  const { error } = await supabase.from("website_social_integrations").upsert({
    club_id: access.clubId,
    platform,
    profile_url: profileUrl,
    is_enabled: formData.get("isEnabled") === "on",
    api_connected: false,
  }, { onConflict: "club_id,platform" });

  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Integracja zapisana (API — w przygotowaniu)." };
}

export async function deleteWebsiteNews(
  _prev: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const access = await requireAccessContext();
  if (!canManageWebsite(access.roles)) return { error: "Brak uprawnień." };

  const newsId = readString(formData, "newsId");
  if (!newsId) return { error: "Brak identyfikatora." };

  const supabase = await createClient();
  const { error } = await supabase.from("website_news").delete().eq("id", newsId).eq("club_id", access.clubId);
  if (error) return { error: error.message };
  revalidateWebsitePaths();
  return { success: "Wpis usunięty." };
}
