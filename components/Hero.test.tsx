import { render, screen, fireEvent } from "@testing-library/react";
import { Hero } from "./Hero";
import { usePointerType } from "@/hooks/usePointerType";
import { letterTreatments, NAME } from "@/data/letterTreatments";

jest.mock("@/hooks/usePointerType");
const mockUsePointerType = usePointerType as jest.Mock;

beforeEach(() => {
  mockUsePointerType.mockReturnValue("fine");
});

test("renders one hoverable span per letter of the name", () => {
  render(<Hero fanProgress={0} />);
  NAME.split("").forEach((_, index) => {
    expect(screen.getByTestId(`letter-${index}`)).toBeInTheDocument();
  });
});

test("hovering a letter activates that position's treatment layer", () => {
  render(<Hero fanProgress={0} />);
  fireEvent.mouseEnter(screen.getByTestId("letter-0"));
  const treatment = letterTreatments.find((t) => t.position === 0)!;
  expect(screen.getByTestId(`treatment-${treatment.position}`)).toHaveStyle({ opacity: 1 });
});

test("mouse leave deactivates the treatment layer", () => {
  render(<Hero fanProgress={0} />);
  fireEvent.mouseEnter(screen.getByTestId("letter-0"));
  fireEvent.mouseLeave(screen.getByTestId("letter-0"));
  expect(screen.getByTestId("treatment-0")).toHaveStyle({ opacity: 0 });
});

test("the down-arrow hint fades as fanProgress increases", () => {
  const { rerender } = render(<Hero fanProgress={0} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ opacity: 1 });
  rerender(<Hero fanProgress={1} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ opacity: 0 });
});
