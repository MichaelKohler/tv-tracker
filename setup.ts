import { vi } from "vitest";

vi.stubGlobal("scrollTo", () => {
  // Mock implementation
});

// Mock ResizeObserver for Recharts
vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {
      // Mock implementation
    }
    unobserve() {
      // Mock implementation
    }
    disconnect() {
      // Mock implementation
    }
  }
);
