import "@testing-library/jest-dom";

class IntersectionObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(_callback, _options) {}
}

global.IntersectionObserver = IntersectionObserverMock;
