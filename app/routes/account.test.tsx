import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { requireUserId } from "../session.server";
import Account, { loader } from "./account";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });

  vi.mock("../session.server", async () => {
    const actual = await vi.importActual("../session.server");
    return {
      ...(actual as Object),
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });
});

test("renders page", () => {
  render(<Account />);

  expect(screen.getByText(/Go to change password form/)).toBeDefined();
  expect(
    screen.getByText(/Deleting your account will also delete/)
  ).toBeDefined();
  expect(screen.getByText(/Delete my account and all data/)).toBeDefined();
});

test("loader throws if there is no user", async () => {
  vi.mocked(requireUserId).mockRejectedValue(new Error("NO_USER"));

  await expect(() =>
    loader({
      request: new Request("http://localhost:8080/account"),
      context: {},
      params: {},
    })
  ).rejects.toThrow();
});
