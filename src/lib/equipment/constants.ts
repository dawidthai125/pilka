import type { AssetCondition } from "@/types/equipment";

export const DEFAULT_CATEGORY_SLUGS: { slug: string; name: string; sortOrder: number }[] = [
  { slug: "balls", name: "Piłki", sortOrder: 1 },
  { slug: "match_kits", name: "Stroje meczowe", sortOrder: 2 },
  { slug: "training_kits", name: "Stroje treningowe", sortOrder: 3 },
  { slug: "tracksuits", name: "Dresy", sortOrder: 4 },
  { slug: "markers", name: "Znaczniki", sortOrder: 5 },
  { slug: "cones", name: "Pachołki", sortOrder: 6 },
  { slug: "training_goals", name: "Bramki treningowe", sortOrder: 7 },
  { slug: "first_aid", name: "Apteczki", sortOrder: 8 },
  { slug: "medical", name: "Sprzęt medyczny", sortOrder: 9 },
  { slug: "electronics", name: "Elektronika", sortOrder: 10 },
  { slug: "other", name: "Inne", sortOrder: 99 },
];

export const CONDITION_BADGE_VARIANT: Record<
  AssetCondition,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "default",
  good: "secondary",
  needs_repair: "outline",
  damaged: "destructive",
  retired: "outline",
};
