import * as React from "react";
import { useActionData, useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { evaluateBoolean, FLAGS } from "../flags.server";
import * as user from "../models/user.server";
import { requireUserId } from "../session.server";
import Deletion, { action, loader } from "./deletion";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn().mockReturnValue({}),
  useActionData: vi.fn(),
  useLoaderData: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../db.server");

vi.mock("../flags.server", async () => ({
  ...(await vi.importActual("../flags.server")),
  evaluateBoolean: vi.fn(),
  FLAGS: {
    DELETE_ACCOUNT: "delete-account",
  },
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUserId: vi.fn().mockResolvedValue("123"),
}));

describe("Account Deletion Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLoaderData).mockReturnValue({
      deleteAccountEnabled: true,
    });

    vi.spyOn(user, "deleteUserByUserId").mockResolvedValue({
      id: "123",
      emailVerified: false,
      name: null,
      image: null,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("renders deletion form if feature is enabled", () => {
    render(<Deletion />);

    expect(
      screen.getByText(/Are you sure you want to delete your account/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Delete my account and all data/)
    ).toBeInTheDocument();
  });

  it("renders message if feature is disabled", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      deleteAccountEnabled: false,
    });

    render(<Deletion />);

    expect(
      screen.queryByText(/Are you sure you want to delete your account/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /The account deletion functionality is currently disabled. Please try again later./
      )
    ).toBeInTheDocument();
  });

  it("renders error message for deletion", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        deletion: "DELETION_ERROR",
      },
    });

    render(<Deletion />);

    expect(screen.getByText("DELETION_ERROR")).toBeInTheDocument();
  });

  describe("loader", () => {
    it("should call evaluateBoolean", async () => {
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
  });

  describe("action", () => {
    it("should delete user and logout if everything ok", async () => {
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

    it("should return error if user can not be deleted", async () => {
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
  });
});
