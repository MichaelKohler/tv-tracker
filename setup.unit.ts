import { afterEach, beforeEach, vi } from "vite-plus/test";
import { cleanup } from "@testing-library/react";
import { mockReset } from "vitest-mock-extended";

import {
  evaluateBoolean,
  evaluateBooleanFromScripts,
  evaluateVariant,
} from "./app/__mocks__/flags.server";
import { prisma } from "./app/__mocks__/db.server";

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
