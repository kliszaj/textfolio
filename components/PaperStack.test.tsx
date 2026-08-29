import { render, screen } from "@testing-library/react";
import { PaperStack } from "./PaperStack";
import { usePointerType } from "@/hooks/usePointerType";
import { caseStudies } from "@/data/caseStudies";
import type { FanSheetConfig } from "@/lib/fanSheet";

jest.mock("@/hooks/usePointerType");
const mockUsePointerType = usePointerType as jest.Mock;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const config: FanSheetConfig = {
  mechanic: "bottom",
  recedePercents: [12, 8, 4, 0],
  brightnessFalloff: 0.05,
};

beforeEach(() => {
  mockUsePointerType.mockReturnValue("fine");
});

test("renders the hero as depth 0 and one sheet per case study behind it", () => {
  render(<PaperStack fanProgress={0} config={config} transitionMs={280} />);
  expect(screen.getByTestId("paper-sheet-0")).toBeInTheDocument();
  expect(screen.getByTestId("letter-0")).toBeInTheDocument();
  caseStudies.forEach((cs, index) => {
    expect(screen.getByTestId(`paper-sheet-${index + 1}`)).toBeInTheDocument();
    expect(screen.getByText(cs.title)).toBeInTheDocument();
  });
});

test("gives the hero the highest z-index and each deeper sheet a lower one", () => {
  render(<PaperStack fanProgress={0} config={config} transitionMs={280} />);
  const zIndices = [0, 1, 2, 3].map(
    (depth) => Number(screen.getByTestId(`paper-sheet-${depth}`).style.zIndex)
  );
  expect(zIndices).toEqual([...zIndices].sort((a, b) => b - a));
});
