import { render, screen } from "@testing-library/react";
import { PaperStack } from "./PaperStack";
import { caseStudies } from "@/data/caseStudies";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

test("renders one card per case study", () => {
  render(<PaperStack fanProgress={0} />);
  caseStudies.forEach((cs) => {
    expect(screen.getByText(cs.title)).toBeInTheDocument();
  });
});
