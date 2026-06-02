import { Camera, Flag, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

type VisualSlot = {
  id: string;
  label: string;
  hint: string;
  imageUrl?: string | null;
  icon: typeof UsersRound;
  gradient: string;
};

export function DashboardClubVisuals({
  teamImageUrl,
  stadiumImageUrl,
  matchImageUrl,
}: {
  teamImageUrl?: string | null;
  stadiumImageUrl?: string | null;
  matchImageUrl?: string | null;
}) {
  const slots: VisualSlot[] = [
    {
      id: "team",
      label: "Drużyna",
      hint: "Miejsce na zdjęcie zespołu",
      imageUrl: teamImageUrl,
      icon: UsersRound,
      gradient: "from-[var(--club-primary,#0B3D2E)] to-[#0d5240]",
    },
    {
      id: "stadium",
      label: "Stadion / boisko",
      hint: "Miejsce na zdjęcie obiektu",
      imageUrl: stadiumImageUrl,
      icon: Flag,
      gradient: "from-[#1a4d3e] to-[#062820]",
    },
    {
      id: "match",
      label: "Mecz",
      hint: "Miejsce na zdjęcie z meczu",
      imageUrl: matchImageUrl,
      icon: Camera,
      gradient: "from-[#234d3a] to-[var(--club-primary,#0B3D2E)]",
    },
  ];

  return (
    <section aria-label="Galeria klubu" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {slots.map((slot) => {
        const Icon = slot.icon;
        return (
          <div
            key={slot.id}
            className={cn(
              "relative aspect-[16/10] overflow-hidden rounded-xl border border-border/60",
              "bg-muted/30",
            )}
          >
            {slot.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slot.imageUrl} alt={slot.label} className="size-full object-cover" />
            ) : (
              <div
                className={cn(
                  "flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br p-4 text-center text-white",
                  slot.gradient,
                )}
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-white/15">
                  <Icon className="size-6 text-[var(--club-secondary,#F4C430)]" />
                </div>
                <p className="text-sm font-semibold">{slot.label}</p>
                <p className="text-xs text-white/70">{slot.hint}</p>
              </div>
            )}
            {slot.imageUrl ? (
              <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                {slot.label}
              </span>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
