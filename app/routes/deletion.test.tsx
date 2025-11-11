import * as React from "react";
import { useActionData, useLoaderData } from "react-router";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { evaluateBoolean, FLAGS } from "../flags.server";
import * as user from "../models/user.server";
import { requireUserId } from "../session.server";
import Deletion, { action, loader } from "./deletion";

vi.mock("../flags.server", async () => {
  const actual = await vi.importActual("../flags.server");

  return {
    ...actual,
    evaluateBoolean: vi.fn(),
    FLAGS: {
      DELETE_ACCOUNT: "delete-account",
    },
  };
});

beforeEach(() => {
  vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");

    return {
      ...actual,
      useNavigation: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      useLoaderData: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });

  vi.mocked(useLoaderData).mockReturnValue({
    deleteAccountEnabled: true,
  });

  vi.mock("../db.server");

  vi.mock("../session.server", async () => {
    const actual = await vi.importActual("../session.server");

    return {
      ...actual,
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });
  vi.spyOn(user, "deleteUserByUserId").mockResolvedValue({
    id: "123",
    email: "foo@example.com",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

test("renders deletion form if feature is enabled", () => {
  render(<Deletion />);

  expect(
    page.getByText(/Are you sure you want to delete your account/)
  ).toBeInTheDocument();
  expect(page.getByText(/Delete my account and all data/)).toBeInTheDocument();
});

test("renders message if feature is disabled", () => {
  vi.mocked(useLoaderData).mockReturnValue({
    deleteAccountEnabled: false,
  });

  render(<Deletion />);

  expect(
    page.getByText(/Are you sure you want to delete your account/)
  ).not.toBeInTheDocument();
  expect(
    page.getByText(
      /The account deletion functionality is currently disabled. Please try again later./
    )
  ).toBeInTheDocument();
});

test("renders error message for deletion", () => {
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      deletion: "DELETION_ERROR",
    },
  });

  render(<Deletion />);

  expect(page.getByText("DELETION_ERROR")).toBeInTheDocument();
});

test("loader should call evaluateBoolean", async () => {
  vi.mocked(evaluateBoolean).mockResolvedValue(true);

  await loader({
    request: new Request("http://localhost:8080/deletion"),
    context: {},
    params: {},
  });

  expect(evaluateBoolean).toHaveBeenCalledWith(
    expect.any(Request),
    FLAGS.DELETE_ACCOUNT
  );
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
