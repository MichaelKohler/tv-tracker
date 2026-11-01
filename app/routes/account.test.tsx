import "@testing-library/jest-dom";
import * as React from "react";
import type {
  Navigation,
  SetURLSearchParams,
  SubmitFunction,
} from "react-router";
import {
  RouterContextProvider,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { render, screen } from "@testing-library/react";
import type { Passkey } from "@prisma/client";
import userEvent from "@testing-library/user-event";

import Account, { action, loader } from "./account";
import {
  changePassword,
  userHasPassword,
  verifyLogin,
} from "../models/user.server";
import { deletePasskey, getPasskeysByUserId } from "../models/passkey.server";
import { getSession, logoutAllDevices, requireUser } from "../session.server";
import type { User } from "../models/user.server";
import { clearRateLimitStore } from "../rate-limiter.server";
import { evaluateBoolean } from "../flags.server";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => Navigation>().mockReturnValue({} as Navigation),
  useActionData: vi.fn<() => unknown>(),
  useLoaderData: vi
    .fn<() => unknown>()
    .mockReturnValue({ webhookUrl: "http://webhook.example" }),
  useSearchParams: vi.fn<() => unknown>(),
  useRevalidator: vi
    .fn<() => { revalidate: () => void; state: string }>()
    .mockReturnValue({ revalidate: vi.fn<() => void>(), state: "idle" }),
  useSubmit: vi
    .fn<() => SubmitFunction>()
    .mockReturnValue(vi.fn<() => void>() as unknown as SubmitFunction),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("../db.server");

vi.mock("../flags.server");

vi.mock("../models/user.server", () => ({
  changePassword: vi.fn<() => Promise<void>>(),
  userHasPassword: vi.fn<() => Promise<boolean>>(),
  verifyLogin: vi.fn<() => Promise<User | null>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getSession: vi.fn<() => Promise<unknown>>(),
  logoutAllDevices: vi.fn<() => Promise<Response>>(),
  requireUser: vi.fn<() => Promise<User>>(),
  sessionStorage: {
    commitSession: vi.fn<() => Promise<string>>(),
  },
}));

vi.mock("../models/passkey.server", async () => ({
  ...(await vi.importActual("../models/passkey.server")),
  deletePasskey: vi.fn<() => Promise<Passkey>>(),
  getPasskeysByUserId: vi.fn<() => Promise<Passkey[]>>(),
  updatePasskeyName: vi.fn<() => Promise<Passkey>>(),
}));

describe("Account Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();

    vi.mocked(evaluateBoolean).mockResolvedValue(true);

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
      { get: () => null } as unknown as URLSearchParams,
      vi.fn<() => void>() as unknown as SetURLSearchParams,
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
      get: vi.fn<() => string | undefined>().mockReturnValue(undefined),
      unset: vi.fn<() => void>(),
      has: vi.fn<() => boolean>(),
      set: vi.fn<() => void>(),
      flash: vi.fn<() => void>(),
      id: "test-session-id",
      data: {},
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
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
      { get: () => "someToken" } as unknown as URLSearchParams,
      vi.fn<() => void>() as unknown as SetURLSearchParams,
    ]);

    render(<Account />);

    expect(screen.queryByText(/Current Password/)).not.toBeInTheDocument();
  });

  describe("action", () => {
    const logoutAllDevicesRequest = () => {
      const body = new FormData();
      body.append("intent", "logout-all-devices");
      return new Request("http://localhost:3000/account", {
        method: "POST",
        body,
      });
    };

    const routeArgs = (request: Request) => ({
      request,
      context: new RouterContextProvider(),
      url: new URL(request.url),
      pattern: "",
      params: {},
    });

    const deletePasskeyRequest = (fields: Record<string, string>) => {
      const body = new FormData();
      body.append("intent", "delete-passkey");
      body.append("passkeyId", "passkey-1");
      Object.entries(fields).forEach(([key, value]) => body.append(key, value));
      return new Request("http://localhost:3000/account", {
        method: "POST",
        body,
      });
    };

    const passkeyErrorOf = async (fields: Record<string, string>) => {
      const response = await action(routeArgs(deletePasskeyRequest(fields)));
      return (response as { data: { errors: { passkey: string | null } } }).data
        .errors.passkey;
    };

    it("does not delete a passkey without the password", async () => {
      await expect(passkeyErrorOf({})).resolves.toBe(
        "Password is required to delete a passkey"
      );
      expect(deletePasskey).not.toHaveBeenCalled();
    });

    it("does not delete a passkey with a wrong password", async () => {
      vi.mocked(verifyLogin).mockResolvedValue(null);

      await expect(passkeyErrorOf({ password: "wrong" })).resolves.toBe(
        "Incorrect password"
      );
      expect(deletePasskey).not.toHaveBeenCalled();
    });

    it("stops checking the current password after too many attempts", async () => {
      vi.mocked(verifyLogin).mockResolvedValue(null);

      const changePasswordRequest = () => {
        const body = new FormData();
        body.append("password", "wrongPassword");
        body.append("newPassword", "newnewPassword");
        body.append("confirmPassword", "newnewPassword");
        return new Request("http://localhost:3000/account", {
          method: "POST",
          body,
        });
      };

      for (let attempt = 0; attempt < 20; attempt++) {
        await action(routeArgs(changePasswordRequest()));
      }
      const response = await action(routeArgs(changePasswordRequest()));

      expect(verifyLogin).toHaveBeenCalledTimes(20);
      expect(changePassword).not.toHaveBeenCalled();
      expect(response.init?.status).toBe(429);
      expect(new Headers(response.init?.headers).get("Retry-After")).toEqual(
        expect.any(String)
      );
      expect(response.data.errors.password).toBe(
        "Too many attempts. Please try again later."
      );
    });

    it("stops checking the password to delete a passkey after too many attempts", async () => {
      vi.mocked(verifyLogin).mockResolvedValue(null);

      for (let attempt = 0; attempt < 20; attempt++) {
        await expect(passkeyErrorOf({ password: "wrong" })).resolves.toBe(
          "Incorrect password"
        );
      }
      const response = await action(
        routeArgs(deletePasskeyRequest({ password: "correct" }))
      );

      expect(verifyLogin).toHaveBeenCalledTimes(20);
      expect(deletePasskey).not.toHaveBeenCalled();
      expect(response.init?.status).toBe(429);
      expect(new Headers(response.init?.headers).get("Retry-After")).toEqual(
        expect.any(String)
      );
      expect(response.data.errors.passkey).toBe(
        "Too many attempts. Please try again later."
      );
    });

    it("deletes a passkey and rotates the session with the correct password", async () => {
      vi.mocked(verifyLogin).mockResolvedValue({ id: "123" } as never);

      const response = await action(
        routeArgs(deletePasskeyRequest({ password: "correct" }))
      );

      expect(verifyLogin).toHaveBeenCalledWith("foo@example.com", "correct");
      expect(deletePasskey).toHaveBeenCalledWith(
        "passkey-1",
        "123",
        expect.objectContaining({ tokenHash: expect.any(String) })
      );
      expect(new Headers(response.init?.headers).get("Set-Cookie")).toContain(
        "__session="
      );
    });

    it("does not accept a password in place of a passkey without a password", async () => {
      vi.mocked(userHasPassword).mockResolvedValue(false);
      vi.mocked(getPasskeysByUserId).mockResolvedValue([
        { id: "passkey-1" },
        { id: "passkey-2" },
      ] as never);

      await expect(passkeyErrorOf({ password: "anything" })).resolves.toBe(
        "Passkey verification required to delete a passkey"
      );
      expect(verifyLogin).not.toHaveBeenCalled();
      expect(deletePasskey).not.toHaveBeenCalled();
    });

    it("does not delete a passkey with a passkey assertion but no challenge", async () => {
      vi.mocked(userHasPassword).mockResolvedValue(false);
      vi.mocked(getPasskeysByUserId).mockResolvedValue([
        { id: "passkey-1" },
        { id: "passkey-2" },
      ] as never);

      await expect(
        passkeyErrorOf({ passkeyCredential: JSON.stringify({ id: "cred" }) })
      ).resolves.toBe("No challenge found");
      expect(deletePasskey).not.toHaveBeenCalled();
    });

    it("logs out all devices of the current user", async () => {
      const logoutResponse = new Response(null, { status: 302 });
      vi.mocked(logoutAllDevices).mockResolvedValue(logoutResponse);
      const request = logoutAllDevicesRequest();

      await expect(action(routeArgs(request))).rejects.toBe(logoutResponse);

      expect(logoutAllDevices).toHaveBeenCalledWith(request, "123");
    });

    it("shows an error when logging out all devices fails", async () => {
      vi.mocked(logoutAllDevices).mockRejectedValue(new Error("db down"));

      const response = await action(routeArgs(logoutAllDevicesRequest()));

      expect(response).toMatchObject({
        data: {
          done: false,
          errors: {
            logoutAllDevices:
              "Could not log out all devices. Please try again.",
          },
        },
        init: { status: 500 },
      });
    });

    it("should return error if new password is invalid", async () => {
      const formData = new FormData();
      formData.append("password", "currentPassword");
      formData.append("newPassword", "");
      formData.append("confirmPassword", "newnewPassword");

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
        params: {},
      });

      expect(response.data.errors.newPassword).toBe("New password is required");
    });

    it("should return error if confirm password is invalid", async () => {
      const formData = new FormData();
      formData.append("password", "currentPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "");

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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
        action({
          request: new Request("http://localhost:8080/password/change", {
            method: "POST",
            body: formData,
          }),
          context: new RouterContextProvider(),
          url: new URL("http://localhost"),
          pattern: "",
          params: {},
        })
      ).rejects.toHaveProperty("message", expect.stringContaining("OH NO"));
    });

    it("should change password if everything ok", async () => {
      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
        params: {},
      });

      expect(changePassword).toHaveBeenCalledWith(
        "foo@example.com",
        "newnewPassword",
        "",
        expect.objectContaining({ tokenHash: expect.any(String) })
      );
    });

    it("does not send a new session cookie when the password change fails", async () => {
      vi.mocked(changePassword).mockRejectedValue(new Error("db down"));
      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      const response = await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
        params: {},
      });

      expect(response.init?.status).toBe(500);
      expect(response.init?.headers).toBeUndefined();
    });

    it("logs out instead of changing the password of a revoked session", async () => {
      vi.mocked(changePassword).mockRejectedValue(new Error("SESSION_REVOKED"));
      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");

      const logoutResponse = (await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
        params: {},
      }).catch((thrown: unknown) => thrown)) as Response;

      expect(logoutResponse.status).toBe(302);
      expect(logoutResponse.headers.get("Location")).toBe("/");
    });

    it("should change password with token", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("OH NO"));
      vi.mocked(verifyLogin).mockRejectedValue(new Error("OH NO"));

      const formData = new FormData();
      formData.append("password", "goodPassword");
      formData.append("newPassword", "newnewPassword");
      formData.append("confirmPassword", "newnewPassword");
      formData.append("token", "someToken");

      await action({
        request: new Request("http://localhost:8080/password/change", {
          method: "POST",
          body: formData,
        }),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
        params: {},
      });

      expect(changePassword).toHaveBeenCalledWith(
        "",
        "newnewPassword",
        "someToken",
        undefined
      );
    });

    it.each([
      { description: "the current password", field: "password", value: "foo" },
      { description: "a reset token", field: "token", value: "someToken" },
    ])(
      "should not change the password with $description if the feature is disabled",
      async ({ field, value }) => {
        vi.mocked(evaluateBoolean).mockResolvedValue(false);

        const formData = new FormData();
        formData.append(field, value);
        formData.append("newPassword", "newnewPassword");
        formData.append("confirmPassword", "newnewPassword");

        const response = await action({
          request: new Request("http://localhost:8080/password/change", {
            method: "POST",
            body: formData,
          }),
          context: new RouterContextProvider(),
          url: new URL("http://localhost"),
          pattern: "",
          params: {},
        });

        expect(evaluateBoolean).toHaveBeenCalledWith(
          expect.any(Request),
          "password-change"
        );
        expect(response.init?.status).toBe(403);
        expect(response.data.errors.generic).toBe(
          "The password change functionality is currently disabled. Please try again later."
        );
        expect(verifyLogin).not.toHaveBeenCalled();
        expect(changePassword).not.toHaveBeenCalled();
      }
    );
  });

  describe("loader", () => {
    it("should fetch the feature flags", async () => {
      await loader({
        request: new Request("http://localhost:8080/account"),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
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
        loader({
          request: new Request("http://localhost:8080/account"),
          context: new RouterContextProvider(),
          url: new URL("http://localhost"),
          pattern: "",
          params: {},
        })
      ).rejects.toHaveProperty("message", expect.stringContaining("NO_USER"));
    });

    it("should enable the password change form if there is a token even without a user", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("NO_USER"));
      vi.mocked(evaluateBoolean).mockResolvedValue(true);

      const response = await loader({
        request: new Request("http://localhost:8080/account?token=foo"),
        context: new RouterContextProvider(),
        url: new URL("http://localhost"),
        pattern: "",
        params: {},
      });

      expect(response.webhookUrl).toBeNull();
      expect(response.features.passwordChange).toBe(true);
      expect(response.features.deleteAccount).toBe(false);
      expect(response.features.plex).toBe(false);
      expect(response.features.passkeyRegistration).toBe(false);
    });
  });

  describe("Log out all devices", () => {
    it("renders the button", () => {
      render(<Account />);

      expect(
        screen.getByRole("button", { name: "Log out all devices" })
      ).toBeInTheDocument();
    });

    it("hides the button on the password reset page", () => {
      vi.mocked(useSearchParams).mockReturnValue([
        { get: () => "reset-token" } as unknown as URLSearchParams,
        vi.fn<() => void>() as unknown as SetURLSearchParams,
      ]);

      render(<Account />);

      expect(
        screen.queryByRole("button", { name: "Log out all devices" })
      ).not.toBeInTheDocument();
    });

    it("shows the error from the action", () => {
      vi.mocked(useActionData).mockReturnValue({
        errors: { logoutAllDevices: "Could not log out all devices." },
        done: false,
      });

      render(<Account />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not log out all devices."
      );
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

    it("asks for the password before deleting when the user has one", async () => {
      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: [
          {
            id: "passkey-1",
            name: "My Passkey",
            createdAt: new Date(),
            lastUsedAt: new Date(),
          },
        ],
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
        hasPassword: true,
      });
      render(<Account />);

      expect(
        screen.queryByRole("button", { name: "Delete passkey" })
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(
        screen.getByRole("button", { name: "Delete passkey" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Confirm with your password")
      ).toHaveAttribute("type", "password");
    });

    it("shows passkey deletion errors", () => {
      vi.mocked(useLoaderData).mockReturnValue({
        webhookUrl: "http://webhook.example",
        passkeys: [
          {
            id: "passkey-1",
            name: "My Passkey",
            createdAt: new Date(),
            lastUsedAt: new Date(),
          },
        ],
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
        hasPassword: true,
      });
      vi.mocked(useActionData).mockReturnValue({
        errors: { passkey: "Incorrect password" },
        done: false,
      });

      render(<Account />);

      expect(screen.getByRole("alert")).toHaveTextContent("Incorrect password");
    });

    describe("passkey error display", () => {
      const loaderDataWithPasskeys = (
        names: string[],
        hasPassword: boolean
      ) => ({
        webhookUrl: "http://webhook.example",
        passkeys: names.map((name) => ({
          id: name,
          name,
          createdAt: new Date(),
          lastUsedAt: new Date(),
        })),
        features: {
          passwordChange: true,
          passkeyRegistration: true,
          deleteAccount: true,
          plex: true,
        },
        hasPassword,
      });

      const serverError = (passkey: string) => ({
        errors: { passkey },
        done: false,
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        vi.mocked(useActionData).mockReturnValue(undefined);
      });

      it("replaces an old server error with a newer verification error", async () => {
        vi.stubGlobal("confirm", vi.fn<() => boolean>().mockReturnValue(true));
        vi.stubGlobal(
          "fetch",
          vi.fn<() => Promise<Response>>().mockRejectedValue(new Error("down"))
        );
        vi.mocked(useLoaderData).mockReturnValue(
          loaderDataWithPasskeys(["My Passkey"], false)
        );
        vi.mocked(useActionData).mockReturnValue(
          serverError("Verification failed")
        );
        render(<Account />);

        await userEvent.click(screen.getByRole("button", { name: "Delete" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Passkey verification failed. Please try again."
        );
      });

      it("shows a new server error after a previous one", () => {
        vi.mocked(useLoaderData).mockReturnValue(
          loaderDataWithPasskeys(["My Passkey"], true)
        );
        vi.mocked(useActionData).mockReturnValue(
          serverError("Incorrect password")
        );
        const { rerender } = render(<Account />);

        vi.mocked(useActionData).mockReturnValue(
          serverError("Failed to delete passkey")
        );
        rerender(<Account />);

        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to delete passkey"
        );
      });

      it("clears the error when cancelling the delete form", async () => {
        vi.mocked(useLoaderData).mockReturnValue(
          loaderDataWithPasskeys(["My Passkey"], true)
        );
        vi.mocked(useActionData).mockReturnValue(
          serverError("Incorrect password")
        );
        render(<Account />);

        await userEvent.click(screen.getByRole("button", { name: "Delete" }));
        vi.mocked(useActionData).mockClear();
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      it("clears the error when opening the delete form of another passkey", async () => {
        vi.mocked(useLoaderData).mockReturnValue(
          loaderDataWithPasskeys(["First", "Second"], true)
        );
        vi.mocked(useActionData).mockReturnValue(
          serverError("Incorrect password")
        );
        render(<Account />);

        await userEvent.click(
          screen.getAllByRole("button", { name: "Delete" })[1]
        );

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      it("shows the error when no passkeys are left", () => {
        vi.mocked(useLoaderData).mockReturnValue(
          loaderDataWithPasskeys([], true)
        );
        vi.mocked(useActionData).mockReturnValue(
          serverError("Failed to delete passkey")
        );

        render(<Account />);

        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to delete passkey"
        );
        expect(screen.queryByText("Your Passkeys")).not.toBeInTheDocument();
      });
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
