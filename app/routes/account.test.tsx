import * as React from "react";
import { useActionData, useLoaderData, useSearchParams } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { evaluateBoolean } from "../flags.server";
import { getPasskeysByUserId } from "../models/passkey.server";
import {
  changePassword,
  userHasPassword,
  verifyLogin,
} from "../models/user.server";
import { getSession, requireUser } from "../session.server";
import Account, { action, loader } from "./account";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn().mockReturnValue({}),
  useActionData: vi.fn(),
  useLoaderData: vi
    .fn()
    .mockReturnValue({ webhookUrl: "http://webhook.example" }),
  useSearchParams: vi.fn(),
  useRevalidator: vi.fn().mockReturnValue({ revalidate: vi.fn() }),
  useSubmit: vi.fn().mockReturnValue(vi.fn()),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("../db.server");

vi.mock("../flags.server", async () => ({
  ...(await vi.importActual("../flags.server")),
  evaluateBoolean: vi.fn(),
  FLAGS: {
    PASSWORD_CHANGE: "password-change",
    DELETE_ACCOUNT: "delete-account",
    PLEX: "plex",
    PASSKEY_REGISTRATION: "passkey-registration",
  },
}));

vi.mock("../models/user.server", async () => ({
  ...(await vi.importActual("../models/user.server")),
  changePassword: vi.fn(),
  userHasPassword: vi.fn(),
  verifyLogin: vi.fn(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getSession: vi.fn(),
  requireUser: vi.fn(),
  sessionStorage: {
    commitSession: vi.fn(),
  },
}));

vi.mock("../models/passkey.server", async () => ({
  ...(await vi.importActual("../models/passkey.server")),
  deletePasskey: vi.fn(),
  getPasskeysByUserId: vi.fn(),
  updatePasskeyName: vi.fn(),
}));

describe("Account Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLoaderData).mockReturnValue({
      webhookUrl: "http://webhook.example",
      passkeys: [],
      features: {
        passwordChange: true,
        passkeyRegistration: true,
        deleteAccount: true,
        plex: true,
      },
      hasPassword: true,
    });

    vi.mocked(useSearchParams).mockReturnValue([
      // @ts-expect-error we do not want to specify all methods of URLSearchParams
      {
        get: () => null,
      },
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      id: "123",
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(getPasskeysByUserId).mockResolvedValue([]);

    vi.mocked(userHasPassword).mockResolvedValue(true);

    vi.mocked(getSession).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
      unset: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
      flash: vi.fn(),
      id: "test-session-id",
      data: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(changePassword).mockResolvedValue(undefined);

    vi.mocked(verifyLogin).mockResolvedValue({
      id: "123",
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("renders page with password change form if feature is enabled", () => {
    render(<Account />);

    expect(screen.getByText("Current Password")).toBeInTheDocument();
    expect(screen.getByText("New Password")).toBeInTheDocument();
    expect(screen.getByText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Change password/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Deleting your account will also delete/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Delete my account and all data/)
    ).toBeInTheDocument();
  });

  it("renders page without password change form if feature is disabled", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      webhookUrl: "http://webhook.example",
      passkeys: [],
      features: {
        passwordChange: false,
        passkeyRegistration: true,
        deleteAccount: true,
        plex: true,
      },
    });

    render(<Account />);

    expect(screen.queryByText("Current Password")).not.toBeInTheDocument();
    expect(screen.queryByText("New Password")).not.toBeInTheDocument();
    expect(screen.queryByText("Confirm Password")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Change password/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /The password change functionality is currently disabled. Please try again later./
      )
    ).toBeInTheDocument();
  });

  it("renders page without delete account form if feature is disabled", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      webhookUrl: "http://webhook.example",
      passkeys: [],
      features: {
        passwordChange: true,
        passkeyRegistration: true,
        deleteAccount: false,
        plex: true,
      },
    });

    render(<Account />);

    expect(
      screen.queryByText(/Deleting your account will also delete/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Delete my account and all data/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /The account deletion functionality is currently disabled. Please try again later./
      )
    ).toBeInTheDocument();
  });

  it("renders page without plex section if feature is disabled", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      webhookUrl: "http://webhook.example",
      passkeys: [],
      features: {
        passwordChange: true,
        passkeyRegistration: true,
        deleteAccount: true,
        plex: false,
      },
    });

    render(<Account />);

    expect(screen.queryByText(/Plex Webhook/)).not.toBeInTheDocument();
  });

  it("renders error message for generic", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        generic: "GENERIC_ERROR",
        token: null,
        password: null,
        newPassword: null,
        confirmPassword: null,
      },
      done: false,
    });

    render(<Account />);

    expect(screen.getByText("GENERIC_ERROR")).toBeInTheDocument();
  });

  it("renders error message for token", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        generic: null,
        token: "TOKEN_ERROR",
        password: null,
        newPassword: null,
        confirmPassword: null,
      },
      done: false,
    });

    render(<Account />);

    expect(screen.getByText("TOKEN_ERROR")).toBeInTheDocument();
  });

  it("renders error message for current password", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        generic: null,
        token: null,
        password: "PASSWORD_ERROR",
        newPassword: null,
        confirmPassword: null,
      },
      done: false,
    });

    render(<Account />);

    expect(screen.getByText("PASSWORD_ERROR")).toBeInTheDocument();
  });

  it("renders error message for new password", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        generic: null,
        token: null,
        password: null,
        newPassword: "NEW_PASSWORD_ERROR",
        confirmPassword: null,
      },
      done: false,
    });

    render(<Account />);

    expect(screen.getByText("NEW_PASSWORD_ERROR")).toBeInTheDocument();
  });

  it("renders error message for confirm password", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        generic: null,
        token: null,
        password: null,
        newPassword: null,
        confirmPassword: "CONFIRM_PASSWORD_ERROR",
      },
      done: false,
    });

    render(<Account />);

    expect(screen.getByText("CONFIRM_PASSWORD_ERROR")).toBeInTheDocument();
  });

  it("renders success message", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        generic: null,
        token: null,
        password: null,
        newPassword: null,
        confirmPassword: null,
      },
      done: true,
    });

    render(<Account />);

    expect(
      screen.getByText(/Your password has been changed/)
    ).toBeInTheDocument();
  });

  it("renders without current password input if token is passed", () => {
    vi.mocked(useSearchParams).mockReturnValue([
      // @ts-expect-error we do not want to specify all methods of URLSearchParams
      {
        get: () => "someToken",
      },
    ]);

    render(<Account />);

    expect(screen.queryByText(/Current Password/)).not.toBeInTheDocument();
  });

  describe("action", () => {
    it("should return error if new password is invalid", async () => {
      const formData = new FormData();
      formData.append("password", "currentPassword");
      formData.append("newPassword", "");
      formData.append("confirmPassword", "newnewPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.newPassword).toBe("New password is required");
    });

    it("should return error if confirm password is invalid", async () => {
      const formData = new FormData();
      formData.append("password", "currentPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.confirmPassword).toBe(
        "Password confirmation is required"
      );
    });

    it("should return error if passwords do not match", async () => {
      const formData = new FormData();
      formData.append("password", "currentPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword2");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.confirmPassword).toBe(
        "Passwords do not match"
      );
    });

    it("should return error if current password is invalid", async () => {
      const formData = new FormData();
      formData.append("password", "");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.password).toBe(
        "Current password is required."
      );
    });

    it("should return error if current password is wrong", async () => {
      vi.mocked(verifyLogin).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("password", "wrongPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.password).toBe("Current password is wrong.");
    });

    it("should return error if change password fails", async () => {
      vi.mocked(changePassword).mockRejectedValue(new Error("OH NO"));

      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.generic).toBe(
        "Something went wrong. Please try again."
      );
    });

    it("should return error if change password fails with expired reset", async () => {
      vi.mocked(changePassword).mockRejectedValue(
        new Error("PASSWORD_RESET_EXPIRED")
      );

      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(response.data.errors.token).toBe(
        "Password reset link expired. Please try again."
      );
    });

    it("should throw redirect if no logged in user", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("OH NO"));

      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      await expect(() =>
        // @ts-expect-error .. ignore unstable_pattern for example
        action({
          request: new Request("http://localhost:8080/password/change", {
            method: "POST",
            body: formData,
          }),
          context: {},
          params: {},
        })
      ).rejects.toThrow();
    });

    it("should change password if everything ok", async () => {
      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      // @ts-expect-error .. ignore unstable_pattern for example
      await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(changePassword).toBeCalledWith(
        "foo@example.com",
        "newnewPassword",
        ""
      );
    });

    it("should change password with token", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("OH NO"));
      vi.mocked(verifyLogin).mockRejectedValue(new Error("OH NO"));

      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");
      formData.append("token", "someToken");

      // @ts-expect-error .. ignore unstable_pattern for example
      await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(changePassword).toBeCalledWith("", "newnewPassword", "someToken");
    });
  });

  describe("loader", () => {
    it("should fetch the feature flags", async () => {
      // @ts-expect-error .. ignore unstable_pattern for example
      await loader({
        request: new Request("http://localhost:8080/account"),
        context: {},
        params: {},
      });

      expect(evaluateBoolean).toHaveBeenCalledWith(
        expect.any(Request),
        "password-change"
      );
      expect(evaluateBoolean).toHaveBeenCalledWith(
        expect.any(Request),
        "delete-account"
      );
      expect(evaluateBoolean).toHaveBeenCalledWith(expect.any(Request), "plex");
    });

    it("should throw if there is no user and no token", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("NO_USER"));

      await expect(() =>
        // @ts-expect-error .. ignore unstable_pattern for example
        loader({
          request: new Request("http://localhost:8080/account"),
          context: {},
          params: {},
        })
      ).rejects.toThrow();
    });

    it("should enable the password change form if there is a token even without a user", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("NO_USER"));
      vi.mocked(evaluateBoolean).mockResolvedValue(true);

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await loader({
        request: new Request("http://localhost:8080/account?token=foo"),
        context: {},
        params: {},
      });

      expect(response.webhookUrl).toBeNull();
      expect(response.features.passwordChange).toBe(true);
      expect(response.features.deleteAccount).toBe(false);
      expect(response.features.plex).toBe(false);
      expect(response.features.passkeyRegistration).toBe(false);
    });
  });

  describe("Passkey UI", () => {
    it("renders passkey section when feature is enabled", () => {
      render(<Account />);

      expect(screen.getByText("Security Keys & Passkeys")).toBeInTheDocument();
      expect(
        screen.getByText(/Add a passkey or security key for faster/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Add Passkey/i })
      ).toBeInTheDocument();
    });

    it("does not render passkey section when feature is disabled", () => {
      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: [],
        hasPassword: true,
        features: {
          passwordChange: true,
          passkeyRegistration: false,
          deleteAccount: true,
          plex: true,
        },
      });

      render(<Account />);

      expect(
        screen.queryByText("Security Keys & Passkeys")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Add Passkey/i })
      ).not.toBeInTheDocument();
    });

    it("shows passkey form when Add Passkey button is clicked", async () => {
      const user = userEvent.setup();
      render(<Account />);

      const addButton = screen.getByRole("button", { name: /Add Passkey/i });
      await user.click(addButton);

      expect(screen.getByLabelText("Passkey Name")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Register Passkey/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i })
      ).toBeInTheDocument();
    });

    it("hides form when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<Account />);

      await user.click(screen.getByRole("button", { name: /Add Passkey/i }));
      expect(screen.getByLabelText("Passkey Name")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Cancel/i }));
      expect(screen.queryByLabelText("Passkey Name")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Add Passkey/i })
      ).toBeInTheDocument();
    });

    it("shows placeholder text in passkey name input", async () => {
      const user = userEvent.setup();
      render(<Account />);

      await user.click(screen.getByRole("button", { name: /Add Passkey/i }));

      const input = screen.getByLabelText("Passkey Name");
      expect(input).toHaveAttribute(
        "placeholder",
        "e.g., My iPhone, YubiKey 5"
      );
    });
  });

  describe("Passkey List", () => {
    it("does not show passkey list when no passkeys exist", () => {
      render(<Account />);

      expect(screen.queryByText("Your Passkeys")).not.toBeInTheDocument();
    });

    it("shows passkey list when passkeys exist", () => {
      const mockPasskeys = [
        {
          id: "passkey-1",
          userId: "user-123",
          credentialId: "cred-1",
          publicKey: Buffer.from("key-1"),
          counter: BigInt(0),
          transports: ["usb"],
          name: "YubiKey",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastUsedAt: new Date("2024-01-15"),
        },
        {
          id: "passkey-2",
          userId: "user-123",
          credentialId: "cred-2",
          publicKey: Buffer.from("key-2"),
          counter: BigInt(0),
          transports: ["internal"],
          name: "iPhone",
          createdAt: new Date("2024-02-01"),
          updatedAt: new Date("2024-02-01"),
          lastUsedAt: new Date("2024-02-20"),
        },
      ];

      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: mockPasskeys,
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
      });

      render(<Account />);

      expect(screen.getByText("Your Passkeys")).toBeInTheDocument();
      expect(screen.getByText("YubiKey")).toBeInTheDocument();
      expect(screen.getByText("iPhone")).toBeInTheDocument();
      expect(screen.getByText(/Created: 1\/1\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/Last used: 1\/15\/2024/)).toBeInTheDocument();
    });

    it("shows edit and delete buttons for each passkey", () => {
      const mockPasskeys = [
        {
          id: "passkey-1",
          userId: "user-123",
          credentialId: "cred-1",
          publicKey: Buffer.from("key-1"),
          counter: BigInt(0),
          transports: ["usb"],
          name: "YubiKey",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastUsedAt: new Date("2024-01-15"),
        },
      ];

      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: mockPasskeys,
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
      });

      render(<Account />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });

      expect(editButtons).toHaveLength(1);
      expect(deleteButtons).toHaveLength(1);
    });

    it("shows edit form when edit button is clicked", async () => {
      const user = userEvent.setup();
      const mockPasskeys = [
        {
          id: "passkey-1",
          userId: "user-123",
          credentialId: "cred-1",
          publicKey: Buffer.from("key-1"),
          counter: BigInt(0),
          transports: ["usb"],
          name: "YubiKey",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastUsedAt: new Date("2024-01-15"),
        },
      ];

      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: mockPasskeys,
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
      });

      render(<Account />);

      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      expect(screen.getByLabelText("Passkey Name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i })
      ).toBeInTheDocument();
    });

    it("hides edit form when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const mockPasskeys = [
        {
          id: "passkey-1",
          userId: "user-123",
          credentialId: "cred-1",
          publicKey: Buffer.from("key-1"),
          counter: BigInt(0),
          transports: ["usb"],
          name: "YubiKey",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastUsedAt: new Date("2024-01-15"),
        },
      ];

      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: mockPasskeys,
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
      });

      render(<Account />);

      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      expect(screen.getByLabelText("Passkey Name")).toBeInTheDocument();

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByLabelText("Passkey Name")).not.toBeInTheDocument();
      expect(screen.getByText("YubiKey")).toBeInTheDocument();
    });

    it("pre-fills edit form with current passkey name", async () => {
      const user = userEvent.setup();
      const mockPasskeys = [
        {
          id: "passkey-1",
          userId: "user-123",
          credentialId: "cred-1",
          publicKey: Buffer.from("key-1"),
          counter: BigInt(0),
          transports: ["usb"],
          name: "My YubiKey",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastUsedAt: new Date("2024-01-15"),
        },
      ];

      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: mockPasskeys,
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
      });

      render(<Account />);

      const editButton = screen.getByRole("button", { name: /Edit/i });
      await user.click(editButton);

      const input = screen.getByLabelText("Passkey Name");
      expect(input).toHaveValue("My YubiKey");
    });
  });
});
