export type LetterTreatment = {
  position: number;
  letter: string;
  videoSrc: string | null;
  bgColor: string;
  label: string;
};

export const NAME = "ADRIAN";

export const letterTreatments: LetterTreatment[] = [
  { position: 0, letter: "A", videoSrc: null, bgColor: "#E4C1C1", label: "treatment-1" },
  { position: 1, letter: "D", videoSrc: null, bgColor: "#C1D4E4", label: "treatment-2" },
  { position: 2, letter: "R", videoSrc: null, bgColor: "#D4E4C1", label: "treatment-3" },
  { position: 3, letter: "I", videoSrc: null, bgColor: "#E4D4C1", label: "treatment-4" },
  { position: 4, letter: "A", videoSrc: null, bgColor: "#D1C1E4", label: "treatment-5" },
  { position: 5, letter: "N", videoSrc: null, bgColor: "#C1E4DC", label: "treatment-6" },
];
