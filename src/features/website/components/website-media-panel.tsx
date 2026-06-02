"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  addWebsiteGalleryMedia,
  deleteWebsiteMedia,
  reorderWebsiteMedia,
  uploadWebsiteMedia,
  type WebsiteActionState,
} from "@/features/website/actions";
import {
  ACADEMY_MEDIA_SLOTS,
  HERO_MEDIA_SLOTS,
  WEBSITE_MEDIA_SECTION_LABELS,
} from "@/lib/website/demo-media";
import { cn } from "@/lib/utils";
import type { WebsiteMediaItem, WebsiteMediaSection } from "@/types/website";

const initial: WebsiteActionState = {};

function MediaPreview({ url, alt }: { url: string | null | undefined; alt: string }) {
  if (!url) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
        Brak zdjęcia
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="aspect-[4/3] w-full rounded-lg border object-cover" />
  );
}

function MediaItemCard({
  item,
  canManage,
  onMoveUp,
  onMoveDown,
}: {
  item: WebsiteMediaItem;
  canManage: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadWebsiteMedia, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteWebsiteMedia, initial);

  const title =
    item.teamName ??
    item.newsTitle ??
    item.caption ??
    item.slotKey;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          {item.demoAssetKey && !item.storagePath ? (
            <p className="text-xs text-muted-foreground">Media demo · {item.demoAssetKey}</p>
          ) : item.storagePath ? (
            <p className="text-xs text-muted-foreground">Własne zdjęcie</p>
          ) : null}
        </div>
        {item.section === "gallery" && canManage ? (
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={onMoveUp} disabled={!onMoveUp}>
              ↑
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onMoveDown} disabled={!onMoveDown}>
              ↓
            </Button>
          </div>
        ) : null}
      </div>

      <MediaPreview url={item.imageUrl} alt={title} />

      {uploadState.error || uploadState.success || deleteState.error || deleteState.success ? (
        <p
          className={cn(
            "mt-3 text-sm",
            uploadState.error || deleteState.error ? "text-destructive" : "text-green-700",
          )}
        >
          {uploadState.error || uploadState.success || deleteState.error || deleteState.success}
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-3 space-y-2">
          <form action={uploadAction} className="space-y-2">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="section" value={item.section} />
            <input type="hidden" name="slotKey" value={item.slotKey} />
            {item.teamId ? <input type="hidden" name="teamId" value={item.teamId} /> : null}
            {item.newsId ? <input type="hidden" name="newsId" value={item.newsId} /> : null}
            <input type="hidden" name="sortOrder" value={item.sortOrder} />
            <input
              name="caption"
              defaultValue={item.caption ?? ""}
              placeholder="Podpis (opcjonalnie)"
              className="min-h-[44px] w-full rounded-md border px-3 text-sm"
            />
            <input name="photo" type="file" accept="image/*" className="w-full text-sm" />
            <Button type="submit" disabled={uploadPending} className="min-h-[44px]">
              {item.storagePath ? "Podmień zdjęcie" : "Dodaj zdjęcie"}
            </Button>
          </form>

          {item.storagePath || item.section === "gallery" ? (
            <form action={deleteAction}>
              <input type="hidden" name="mediaId" value={item.id} />
              <Button type="submit" variant="outline" disabled={deletePending} className="min-h-[44px]">
                {item.section === "gallery" ? "Usuń z galerii" : "Usuń własne zdjęcie"}
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Tylko podgląd — brak uprawnień do edycji.</p>
      )}
    </div>
  );
}

function SectionBlock({
  title,
  description,
  items,
  canManage,
  onReorder,
}: {
  title: string;
  description: string;
  items: WebsiteMediaItem[];
  canManage: boolean;
  onReorder?: (orderedIds: string[]) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <MediaItemCard
            key={item.id}
            item={item}
            canManage={canManage}
            onMoveUp={
              onReorder && index > 0
                ? () => {
                    const ids = items.map((entry) => entry.id);
                    const prev = ids[index - 1];
                    const current = ids[index];
                    if (!prev || !current) return;
                    [ids[index - 1], ids[index]] = [current, prev];
                    onReorder(ids);
                  }
                : undefined
            }
            onMoveDown={
              onReorder && index < items.length - 1
                ? () => {
                    const ids = items.map((entry) => entry.id);
                    const current = ids[index];
                    const next = ids[index + 1];
                    if (!current || !next) return;
                    [ids[index], ids[index + 1]] = [next, current];
                    onReorder(ids);
                  }
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}

export function WebsiteMediaPanel({
  media,
  coachTeamIds,
  isFullAdmin,
}: {
  media: WebsiteMediaItem[];
  coachTeamIds: string[];
  isFullAdmin: boolean;
}) {
  const [activeSection, setActiveSection] = useState<WebsiteMediaSection | "all">("all");
  const [reorderState, reorderAction, reorderPending] = useActionState(reorderWebsiteMedia, initial);
  const [addState, addAction, addPending] = useActionState(addWebsiteGalleryMedia, initial);

  const visibleMedia = useMemo(() => {
    if (isFullAdmin) return media;
    return media.filter((item) => item.section === "team" && item.teamId && coachTeamIds.includes(item.teamId));
  }, [coachTeamIds, isFullAdmin, media]);

  const grouped = useMemo(() => {
    const sections: Record<WebsiteMediaSection, WebsiteMediaItem[]> = {
      hero: [],
      team: [],
      academy: [],
      gallery: [],
      news: [],
    };
    for (const item of visibleMedia) sections[item.section].push(item);
    return sections;
  }, [visibleMedia]);

  const canManageSection = (section: WebsiteMediaSection) => {
    if (isFullAdmin) return true;
    return section === "team";
  };

  const sectionsToRender =
    activeSection === "all"
      ? (Object.keys(grouped) as WebsiteMediaSection[]).filter((section) => grouped[section].length > 0)
      : [activeSection];

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Zarządzaj zdjęciami strony publicznej. Media demo można w każdej chwili podmienić własnymi plikami — każdy klub ma
        własny zestaw powiązany z kontem klubu.
      </p>

      {reorderState.error || reorderState.success || addState.error || addState.success ? (
        <p
          className={cn(
            "text-sm",
            reorderState.error || addState.error ? "text-destructive" : "text-green-700",
          )}
        >
          {reorderState.error || reorderState.success || addState.error || addState.success}
        </p>
      ) : null}

      {isFullAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeSection === "all" ? "default" : "outline"}
            onClick={() => setActiveSection("all")}
          >
            Wszystkie
          </Button>
          {(Object.keys(WEBSITE_MEDIA_SECTION_LABELS) as WebsiteMediaSection[]).map((section) => (
            <Button
              key={section}
              type="button"
              variant={activeSection === section ? "default" : "outline"}
              onClick={() => setActiveSection(section)}
            >
              {WEBSITE_MEDIA_SECTION_LABELS[section]}
            </Button>
          ))}
        </div>
      ) : null}

      {sectionsToRender.map((section) => {
        const labels: Record<WebsiteMediaSection, { title: string; description: string }> = {
          hero: {
            title: "Hero — kolaż 3 zdjęć",
            description: `Sloty: ${HERO_MEDIA_SLOTS.map((slot) => slot.label).join(", ")}.`,
          },
          team: {
            title: "Nasze drużyny",
            description: isFullAdmin
              ? "Zdjęcie reprezentujące każdą grupę wiekową."
              : "Możesz edytować wyłącznie zdjęcia przypisanych drużyn.",
          },
          academy: {
            title: "Akademia",
            description: `Sloty: ${ACADEMY_MEDIA_SLOTS.map((slot) => slot.label).join(", ")}.`,
          },
          gallery: {
            title: "Galeria na stronie głównej",
            description: "Bento 6–12 zdjęć — kolejność można zmieniać strzałkami.",
          },
          news: {
            title: "Aktualności — zdjęcia wyróżniające",
            description: "Powiązane z opublikowanymi wpisami na stronie głównej.",
          },
        };

        return (
          <SectionBlock
            key={section}
            title={labels[section].title}
            description={labels[section].description}
            items={grouped[section]}
            canManage={canManageSection(section)}
            onReorder={
              section === "gallery" && canManageSection(section)
                ? (orderedIds) => {
                    const formData = new FormData();
                    formData.set("orderedIds", orderedIds.join(","));
                    reorderAction(formData);
                  }
                : undefined
            }
          />
        );
      })}

      {isFullAdmin && (activeSection === "all" || activeSection === "gallery") ? (
        <form action={addAction} className="rounded-xl border border-dashed p-4">
          <p className="mb-3 font-medium">Dodaj zdjęcie do galerii</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input name="photo" type="file" accept="image/*" className="text-sm" required />
            <input
              name="caption"
              placeholder="Podpis"
              className="min-h-[44px] flex-1 rounded-md border px-3 text-sm"
            />
            <Button type="submit" disabled={addPending || reorderPending} className="min-h-[44px]">
              Dodaj do galerii
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
