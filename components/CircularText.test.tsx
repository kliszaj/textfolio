import { render, screen } from "@testing-library/react";
import { CircularText } from "./CircularText";

test("renders the circular loading copy accessibly", () => {
  render(<CircularText text="LOADING*LOADING*" spinDuration={8} />);
  const loader = screen.getByRole("status", { name: "Loading portfolio" });
  expect(loader).toBeInTheDocument();
  expect(loader.querySelectorAll("span")).toHaveLength("LOADING*LOADING*".length);
});
