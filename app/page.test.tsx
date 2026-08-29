import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import { useFanProgress } from "@/hooks/useFanProgress";
import { usePointerType } from "@/hooks/usePointerType";
import { caseStudies } from "@/data/caseStudies";

jest.mock("@/hooks/useFanProgress");
jest.mock("@/hooks/usePointerType");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockUseFanProgress = useFanProgress as jest.Mock;
const mockUsePointerType = usePointerType as jest.Mock;

test("renders the hero name and all case study cards", () => {
  mockUseFanProgress.mockReturnValue(0);
  mockUsePointerType.mockReturnValue("fine");
  render(<HomePage />);
  expect(screen.getByTestId("letter-0")).toBeInTheDocument();
  caseStudies.forEach((cs) => {
    expect(screen.getByText(cs.title)).toBeInTheDocument();
  });
});

test("renders a scroll spacer on touch devices", () => {
  mockUseFanProgress.mockReturnValue(0);
  mockUsePointerType.mockReturnValue("coarse");
  const { container } = render(<HomePage />);
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

test("renders no scroll spacer on fine-pointer devices", () => {
  mockUseFanProgress.mockReturnValue(0);
  mockUsePointerType.mockReturnValue("fine");
  const { container } = render(<HomePage />);
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});
