import { vi } from "vitest";

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
