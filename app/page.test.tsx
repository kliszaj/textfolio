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

beforeEach(() => {
  mockUseFanProgress.mockReturnValue(0);
  mockUsePointerType.mockReturnValue("fine");
});

test("renders the hero and all case study sheets", () => {
  render(<HomePage />);
  expect(screen.getByTestId("letter-0")).toBeInTheDocument();
  caseStudies.forEach((cs) => {
    expect(screen.getByText(cs.title)).toBeInTheDocument();
  });
});

test("renders the fan debug panel for tuning", () => {
  render(<HomePage />);
  expect(screen.getByTestId("fan-debug-panel")).toBeInTheDocument();
});

test("renders a scroll spacer on touch devices", () => {
  mockUsePointerType.mockReturnValue("coarse");
  const { container } = render(<HomePage />);
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

test("renders no scroll spacer on fine-pointer devices", () => {
  const { container } = render(<HomePage />);
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});
