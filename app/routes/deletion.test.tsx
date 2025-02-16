import * as React from "react";
import { useActionData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as user from "../models/user.server";
import { requireUserId } from "../session.server";
import Deletion, { action, loader } from "./deletion";

beforeEach(() => {
  vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...(actual as object),
      useNavigation: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });

  vi.mock("../db.server");

  vi.mock("../session.server", async () => {
    const actual = await vi.importActual("../session.server");
    return {
      ...(actual as object),
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
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Delete my account and all data/)
  ).toBeInTheDocument();
});

test("renders error message for deletion", () => {
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      deletion: "DELETION_ERROR",
    },
  });

  render(<Deletion />);

  expect(screen.getByText("DELETION_ERROR")).toBeInTheDocument();
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

  await action({
    request: new Request("http://localhost:8080/deletion", {
      method: "POST",
    }),
    context: {},
    params: {},
  });

  expect(user.deleteUserByUserId).toBeCalledWith("123");
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.deletion).toBe(
    "Could not delete user. Please try again."
  );
});
