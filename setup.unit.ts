import { vi, beforeEach, afterEach } from "vite-plus/test";
import { cleanup } from "@testing-library/react";
import { mockReset } from "vitest-mock-extended";

import { prisma } from "./app/__mocks__/db.server";
import {
  evaluateBoolean,
  evaluateVariant,
  evaluateBooleanFromScripts,
} from "./app/__mocks__/flags.server";

if (!process.env.VERBOSE) {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
}

beforeEach(() => {
  mockReset(prisma);
  evaluateBoolean.mockReset();
  evaluateVariant.mockReset();
  evaluateBooleanFromScripts.mockReset();
});

afterEach(() => {
  cleanup();
});
