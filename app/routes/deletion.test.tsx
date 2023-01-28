import * as React from "react";
import { useActionData } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as user from "../models/user.server";
import { requireUserId } from "../session.server";
import Deletion, { action, loader } from "./deletion";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useTransition: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
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
  vi.spyOn(user, "deleteUserByUserId").mockResolvedValue({
    id: "123",
    email: "user@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

test("renders deletion form", () => {
  render(<Deletion />);

  expect(
    screen.getByText(/Are you sure you want to delete your account/)
  ).toBeDefined();
  expect(screen.getByText(/Delete my account and all data/)).toBeDefined();
});

test("renders error message for deletion", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      deletion: "DELETION_ERROR",
    },
  });

  render(<Deletion />);

  expect(screen.getByText("DELETION_ERROR")).toBeDefined();
});

test("loader throws if there is no user", async () => {
  vi.mocked(requireUserId).mockRejectedValue(new Error("NO_USER"));

  await expect(() =>
    loader({
      request: new Request("http://localhost:8080/deletion"),
      context: {},
      params: {},
    })
  ).rejects.toThrow();
});

test("action should delete user and logout if everything ok", async () => {
  vi.mocked(requireUserId).mockResolvedValue("123");

  const response = await action({
    request: new Request("http://localhost:8080/deletion", {
      method: "POST",
    }),
    context: {},
    params: {},
  });

  expect(user.deleteUserByUserId).toBeCalledWith("123");
  expect(response.headers.get("location")).toBe("/");
});

test("action should return error if user can not be deleted", async () => {
  vi.mocked(requireUserId).mockResolvedValue("123");
  vi.mocked(user.deleteUserByUserId).mockRejectedValue(
    new Error("OH_NO_DELETION_ERROR")
  );

  const response = await action({
    request: new Request("http://localhost:8080/deletion", {
      method: "POST",
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.deletion).toBe(
    "Could not delete user. Please try again."
  );
});
