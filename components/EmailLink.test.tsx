import { act, fireEvent, render, screen } from "@testing-library/react";
import { EmailLink } from "./EmailLink";

afterEach(() => jest.useRealTimers());

test("clicking copies the address and says so in place, then goes back", async () => {
  jest.useFakeTimers();
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(<EmailLink email="hello@adrianklisz.com">Email</EmailLink>);
  const link = screen.getByRole("link", { name: /Email/ });
  expect(link).toHaveAttribute("href", "mailto:hello@adrianklisz.com");

  await act(async () => {
    fireEvent.click(link);
  });
  expect(writeText).toHaveBeenCalledWith("hello@adrianklisz.com");
  expect(link).toHaveAttribute("data-copied", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Email copied to clipboard");

  act(() => jest.advanceTimersByTime(3000));
  expect(link).toHaveAttribute("data-copied", "false");
});

test("a modified click is left to the browser", () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(<EmailLink email="hello@adrianklisz.com" />);
  fireEvent.click(screen.getByRole("link"), { metaKey: true });
  expect(writeText).not.toHaveBeenCalled();
});
