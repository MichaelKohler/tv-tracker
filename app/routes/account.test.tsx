import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { requireUserId } from "../session.server";
import Account, { loader } from "./account";

beforeEach(() => {
  vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...(actual as object),
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
      useLoaderData: vi
        .fn()
        .mockReturnValue({ webhookUrl: "http://webhook.example" }),
    };
  });

  vi.mock("../db.server");

  vi.mock("../session.server", async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...(actual as object),
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });
});

test("renders page", () => {
  render(<Account />);

  expect(screen.getByText(/Go to change password form/)).toBeInTheDocument();
  expect(
    screen.getByText(/Deleting your account will also delete/)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Delete my account and all data/)
  ).toBeInTheDocument();
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
