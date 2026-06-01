import { CONTENT_ASSET_TYPE_LABELS, type ContentAsset } from "@/types/content";

export function ContentMediaLibrary({ assets }: { assets: ContentAsset[] }) {
  if (assets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Biblioteka mediów jest pusta. Dodaj zdjęcia, grafiki lub powiąż klipy z Video Center.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <article key={asset.id} className="rounded-xl border bg-card p-4">
          <p className="font-medium">{asset.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {CONTENT_ASSET_TYPE_LABELS[asset.assetType]}
            {asset.videoId ? " · Video Center" : ""}
          </p>
          {asset.tags.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Tagi: {asset.tags.join(", ")}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
