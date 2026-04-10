import "@testing-library/jest-dom";
import * as React from "react";
import type { Navigation, SubmitFunction } from "react-router";
import { render, screen } from "@testing-library/react";
import { useActionData, useLoaderData } from "react-router";
import type { Passkey } from "@prisma/client";

import * as passkeyModel from "../models/passkey.server";
import * as user from "../models/user.server";
import Deletion, { action, loader } from "./deletion";
import { FLAGS, evaluateBoolean } from "../flags.server";
import type { User } from "../models/user.server";
import { requireUser } from "../session.server";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => Navigation>().mockReturnValue({}),
  useActionData: vi.fn<() => unknown>(),
  useLoaderData: vi.fn<() => unknown>(),
  useSubmit: vi.fn<() => SubmitFunction>().mockReturnValue(vi.fn<() => void>()),
  Form: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <form {...props}>{children}</form>,
}));

vi.mock("../db.server");

vi.mock("../flags.server");

vi.mock("../models/user.server", () => ({
  deleteUserByUserId: vi.fn<() => Promise<User>>(),
  userHasPassword: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  verifyLogin: vi.fn<() => Promise<User | null>>(),
}));

vi.mock("../models/passkey.server", () => ({
  getPasskeysByUserId: vi.fn<() => Promise<Passkey[]>>().mockResolvedValue([]),
  verifyPasskeyAuthentication:
    vi.fn<() => Promise<{ success: boolean; error?: string }>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUser: vi.fn<() => Promise<User>>().mockResolvedValue({
    id: "123",
    email: "foo@example.com",
    plexToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getPasskeyReauthChallenge: vi
    .fn<() => Promise<string | undefined>>()
    .mockResolvedValue("test-challenge"),
  clearPasskeyReauthChallenge: vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({}),
}));

describe("Account Deletion Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLoaderData).mockReturnValue({
      deleteAccountEnabled: true,
      hasPassword: true,
      hasPasskeys: false,
    });

    vi.spyOn(user, "deleteUserByUserId").mockResolvedValue({
      id: "123",
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(user, "userHasPassword").mockResolvedValue(true);
    vi.spyOn(user, "verifyLogin").mockResolvedValue({
      id: "123",
      email: "foo@example.com",
      plexToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(requireUser).mockResolvedValue({
      id: "123",
      email: "foo@example.com",
      plexToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("renders deletion form with password field if feature is enabled", () => {
    render(<Deletion />);

    expect(
      screen.getByText(/Are you sure you want to delete your account/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm with password")).toBeInTheDocument();
    expect(
      screen.getByText(/Delete my account and all data/)
    ).toBeInTheDocument();
  });

  it("renders passkey delete button when user has passkeys", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      deleteAccountEnabled: true,
      hasPassword: false,
      hasPasskeys: true,
    });

    render(<Deletion />);

    expect(
      screen.getByText(/Delete my account with passkey/)
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Confirm with password")
    ).not.toBeInTheDocument();
  });

  it("renders message if feature is disabled", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      deleteAccountEnabled: false,
      hasPassword: false,
      hasPasskeys: false,
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

  it("renders deletion error message", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        deletion: "DELETION_ERROR",
        password: null,
      },
    });

    render(<Deletion />);

    expect(screen.getByText("DELETION_ERROR")).toBeInTheDocument();
  });

  it("renders password error message", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        deletion: null,
        password: "PASSWORD_ERROR",
      },
    });

    render(<Deletion />);

    expect(screen.getByText("PASSWORD_ERROR")).toBeInTheDocument();
  });

  describe("loader", () => {
    it("should call evaluateBoolean", async () => {
      vi.mocked(evaluateBoolean).mockResolvedValue(true);
      vi.spyOn(passkeyModel, "getPasskeysByUserId").mockResolvedValue([]);

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return feature disabled state without requiring user", async () => {
      vi.mocked(evaluateBoolean).mockResolvedValue(false);

      // @ts-expect-error .. ignore unstable_pattern for example
      const result = await loader({
        request: new Request("http://localhost:8080/deletion"),
        context: {},
        params: {},
      });

      expect(result.deleteAccountEnabled).toBe(false);
      expect(result.hasPassword).toBe(false);
      expect(result.hasPasskeys).toBe(false);
    });

    it("should return hasPassword and hasPasskeys when feature is enabled", async () => {
      vi.mocked(evaluateBoolean).mockResolvedValue(true);
      vi.spyOn(user, "userHasPassword").mockResolvedValue(true);
      vi.spyOn(passkeyModel, "getPasskeysByUserId").mockResolvedValue([
        {
          id: "pk-1",
          userId: "123",
          credentialId: "cred-1",
          publicKey: Buffer.from("key"),
          counter: BigInt(0),
          transports: [],
          name: "YubiKey",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        },
      ]);

      // @ts-expect-error .. ignore unstable_pattern for example
      const result = await loader({
        request: new Request("http://localhost:8080/deletion"),
        context: {},
        params: {},
      });

      expect(result.hasPassword).toBe(true);
      expect(result.hasPasskeys).toBe(true);
    });
  });

  describe("action", () => {
    it("should delete user and logout if password is correct", async () => {
      vi.spyOn(user, "verifyLogin").mockResolvedValue({
        id: "123",
        email: "foo@example.com",
        plexToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const formData = new FormData();
      formData.append("password", "correctPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      await action({
        request: new Request("http://localhost:8080/deletion", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(user.deleteUserByUserId).toBeCalledWith("123");
    });

    it("should return error if password field is empty", async () => {
      const formData = new FormData();
      formData.append("password", "");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/deletion", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.errors.password).toBe(
        "Password is required to confirm account deletion."
      );
      expect(user.deleteUserByUserId).not.toBeCalled();
    });

    it("should return error if password is incorrect", async () => {
      vi.spyOn(user, "verifyLogin").mockResolvedValue(null);

      const formData = new FormData();
      formData.append("password", "wrongPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/deletion", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.errors.password).toBe("Incorrect password.");
      expect(user.deleteUserByUserId).not.toBeCalled();
    });

    it("should return error if user can not be deleted", async () => {
      vi.spyOn(user, "deleteUserByUserId").mockRejectedValue(
        new Error("OH_NO_DELETION_ERROR")
      );

      const formData = new FormData();
      formData.append("password", "correctPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/deletion", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.errors.deletion).toBe(
        "Could not delete user. Please try again."
      );
    });

    it("should delete user via passkey credential if provided", async () => {
      vi.spyOn(user, "userHasPassword").mockResolvedValue(false);
      vi.spyOn(passkeyModel, "verifyPasskeyAuthentication").mockResolvedValue({
        success: true,
      });

      const formData = new FormData();
      formData.append(
        "passkeyCredential",
        JSON.stringify({ id: "cred-1", type: "public-key" })
      );

      // @ts-expect-error .. ignore unstable_pattern for example
      await action({
        request: new Request("http://localhost:8080/deletion", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(user.deleteUserByUserId).toBeCalledWith("123");
    });

    it("should return error if passkey authentication fails", async () => {
      vi.spyOn(user, "userHasPassword").mockResolvedValue(false);
      vi.spyOn(passkeyModel, "verifyPasskeyAuthentication").mockResolvedValue({
        success: false,
        error: "Verification failed",
      });

      const formData = new FormData();
      formData.append(
        "passkeyCredential",
        JSON.stringify({ id: "cred-1", type: "public-key" })
      );

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/deletion", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.errors.deletion).toBe("Verification failed");
      expect(user.deleteUserByUserId).not.toBeCalled();
    });
  });
});
