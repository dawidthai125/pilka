"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Slide = { url: string; alt: string };

export function HeroPhotoRotator({
  slides,
  intervalMs = 6000,
  className,
}: {
  slides: Slide[];
  intervalMs?: number;
  className?: string;
}) {
  const validSlides = slides.filter((slide) => slide.url);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (validSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % validSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [validSlides.length, intervalMs]);

  if (validSlides.length === 0) {
    return <div className={cn("size-full bg-gradient-to-br from-[var(--club-primary)] to-[#0a4a38]", className)} />;
  }

  const active = validSlides[index] ?? validSlides[0];

  return (
    <div className={cn("relative size-full overflow-hidden", className)}>
      {validSlides.map((slide, slideIndex) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.url}
          src={slide.url}
          alt={slide.alt}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-1000",
            slideIndex === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {validSlides.length > 1 ? (
        <div className="absolute bottom-4 right-4 flex gap-1.5 sm:bottom-6 sm:right-6">
          {validSlides.map((slide, slideIndex) => (
            <span
              key={slide.url}
              className={cn(
                "size-2 rounded-full transition",
                slideIndex === index ? "bg-[var(--club-secondary)]" : "bg-white/40",
              )}
              aria-hidden
            />
          ))}
        </div>
      ) : null}
      {active ? <span className="sr-only">{active.alt}</span> : null}
    </div>
  );
}
