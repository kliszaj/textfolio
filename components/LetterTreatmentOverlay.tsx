"use client";

import type { LetterTreatment } from "@/data/letterTreatments";

type LetterTreatmentOverlayProps = {
  treatments: LetterTreatment[];
  activeIndex: number | null;
};

export function LetterTreatmentOverlay({ treatments, activeIndex }: LetterTreatmentOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {treatments.map((treatment) => {
        const isActive = treatment.position === activeIndex;
        return (
          <div
            key={treatment.position}
            data-testid={`treatment-${treatment.position}`}
            className="absolute inset-0 transition-opacity duration-200"
            style={{ opacity: isActive ? 1 : 0 }}
          >
            {treatment.videoSrc ? (
              <video
                src={treatment.videoSrc}
                muted
                loop
                playsInline
                preload="auto"
                autoPlay={isActive}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-display text-2xl"
                style={{ backgroundColor: treatment.bgColor }}
              >
                {treatment.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
