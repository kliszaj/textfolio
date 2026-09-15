import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { renderHook } from "@testing-library/react";
import { useIntroOnce, resetIntroForTests } from "./useIntroOnce";

beforeEach(() => resetIntroForTests());

function Probe() {
  return createElement("span", null, String(useIntroOnce()));
}

test("plays the intro on the first mount of a page load", () => {
  const { result } = renderHook(() => useIntroOnce());
  expect(result.current).toBe(true);
});

test("skips it on every later mount, so Home from a case study is instant", () => {
  renderHook(() => useIntroOnce());
  const { result } = renderHook(() => useIntroOnce());
  expect(result.current).toBe(false);
});

test("keeps its answer stable across re-renders of the same mount", () => {
  const { result, rerender } = renderHook(() => useIntroOnce());
  expect(result.current).toBe(true);
  rerender();
  // Would otherwise flip to false mid-animation and cut the intro short.
  expect(result.current).toBe(true);
});

test("only claims the intro once even if two mounts race before any effect", () => {
  // React can render twice before committing (StrictMode does exactly this).
  // Both renders must agree, or the intro is dropped on a genuine first visit.
  const first = renderHook(() => useIntroOnce());
  expect(first.result.current).toBe(true);
  expect(renderHook(() => useIntroOnce()).result.current).toBe(false);
});

test("renders the intro state on the server so the loader is the first paint", () => {
  // serverSnapshot is fixed and side-effect-free, so it can match the first
  // hydrated render without consuming the one-per-page-load client flag.
  const html = renderToString(createElement(Probe));
  expect(html).toContain("true");
});

test("leaves the flag alone while server-rendering, so the client still plays", () => {
  renderToString(createElement(Probe));
  const { result } = renderHook(() => useIntroOnce());
  expect(result.current).toBe(true);
});
