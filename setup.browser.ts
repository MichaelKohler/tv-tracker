import React from "react";
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

// Mock ResponsiveContainer to avoid dimension warnings
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        "div",
        { style: { width: 400, height: 300 } },
        children
      ),
  };
});
