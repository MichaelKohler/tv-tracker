import { vi } from "vitest";

vi.mock("./app/db.server", () => {
  return import("./app/__mocks__/db.server");
});

vi.stubGlobal("scrollTo", () => {});

// Mock ResizeObserver for Recharts
vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
