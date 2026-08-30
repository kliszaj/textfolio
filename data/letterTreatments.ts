export type LetterTreatment = {
  position: number;
  letter: string;
  bgColor: string;
  label: string;
};

export const NAME = "ADRIAN";

export const letterTreatments: LetterTreatment[] = [
  { position: 0, letter: "A", bgColor: "#E4C1C1", label: "Dither" },
  { position: 1, letter: "D", bgColor: "#C1D4E4", label: "Glitch" },
  { position: 2, letter: "R", bgColor: "#D4E4C1", label: "Wave" },
  { position: 3, letter: "I", bgColor: "#E4D4C1", label: "Scramble" },
  { position: 4, letter: "A", bgColor: "#D1C1E4", label: "Smear" },
  { position: 5, letter: "N", bgColor: "#F6D56A", label: "Explosion" },
];
