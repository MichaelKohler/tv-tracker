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

// Store original console methods
const originalError = console.error;

// Suppress specific known warnings/errors in tests
vi.stubGlobal("console", {
  ...console,
  error: (...args: unknown[]) => {
    const message = args[0]?.toString() || "";

    // Suppress React act() warnings that are expected in Suspense tests
    if (
      message.includes("A suspended resource finished loading inside a test")
    ) {
      return;
    }

    // Log intentional test errors for debugging but don't clutter output
    if (
      message.includes("CHANGE_PASSWORD_ERROR") ||
      message.includes("DELETE_USER_ERROR") ||
      message.includes("INVITE_DELETION_ERROR") ||
      message.includes("Error: OH_NO")
    ) {
      return;
    }

    // Let other errors through
    originalError(...args);
  },
});
