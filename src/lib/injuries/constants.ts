export const INJURY_MODULE_DISCLAIMER =
  "Moduł służy wyłącznie do zarządzania dostępnością sportową. Nie przechowuje diagnoz medycznych ani dokumentacji lekarskiej.";

export const DEFAULT_INJURY_CATEGORIES = [
  { slug: "muscle", name: "Mięśniowy", sortOrder: 1 },
  { slug: "joint", name: "Stawowy", sortOrder: 2 },
  { slug: "overload", name: "Przeciążeniowy", sortOrder: 3 },
  { slug: "match", name: "Uraz meczowy", sortOrder: 4 },
  { slug: "training", name: "Uraz treningowy", sortOrder: 5 },
  { slug: "other", name: "Inny", sortOrder: 99 },
] as const;
