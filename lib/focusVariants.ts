export type FocusVariant = {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  className: string;
};

function variant(
  id: string,
  name: string,
  description: string,
  durationMs: number
): FocusVariant {
  return { id, name, description, durationMs, className: `focus-enter-${id}` };
}

// Five directions for taking a case study from a sliver in the stack to a full
// page. They differ in what the motion claims is happening: the sheet being
// lifted out, dealt forward, hinged down, flooding the screen, or drawn up.
export const FOCUS_VARIANTS: FocusVariant[] = [
  variant(
    "lift",
    "Sheet Lift",
    "The visible band grows upward and straightens, as if the sheet were being lifted out of the stack.",
    520
  ),
  variant(
    "deal",
    "Deal Forward",
    "The sheet pulls out of the deck, squares up and settles with a small overshoot.",
    460
  ),
  variant(
    "peel",
    "Page Peel",
    "The sheet is hinged at its bottom edge and swings up flat, like a page being laid down.",
    620
  ),
  variant(
    "flood",
    "Colour Flood",
    "The sheet's colour floods out from the point you clicked until it fills the screen.",
    560
  ),
  variant(
    "slide",
    "Draw From Pad",
    "The sheet is drawn up from below the bottom edge, like tearing a note off a pad.",
    480
  ),
];

// The direction chosen for the real navigation out of the stack.
export const DEFAULT_FOCUS_VARIANT_ID = "lift";

export function getFocusVariant(id: string): FocusVariant {
  return FOCUS_VARIANTS.find((v) => v.id === id) ?? FOCUS_VARIANTS[0];
}
