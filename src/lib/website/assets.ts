import { createClient } from "@/lib/supabase/server";

export async function getWebsiteAssetUrl(path: string | null | undefined): Promise<string | null> {
  if (!path || path.includes("..") || path.startsWith("/")) return null;
  if (path.startsWith("club-media/")) return `/${path}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("club-assets").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getWebsiteAssetUrls(
  paths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean) as string[])];
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (path) => {
      const url = await getWebsiteAssetUrl(path);
      if (url) map.set(path, url);
    }),
  );
  return map;
}
