import * as React from "react";
import { useActionData, useSearchParams } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { useLoaderData } from "react-router";

import { evaluateBoolean } from "../flags.server";
import { changePassword, verifyLogin } from "../models/user.server";
import { requireUser } from "../session.server";
import Account, { action, loader } from "./account";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...(actual as object),
    useNavigation: vi.fn().mockReturnValue({}),
    useActionData: vi.fn(),
    useLoaderData: vi.fn(),
    useSearchParams: vi.fn(),
    Form: ({ children }: { children: React.ReactNode }) => (
      <form>{children}</form>
    ),
    Link: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  };
});
vi.mock("../session.server", async () => {
  return {
    requireUser: vi.fn(),
  };
});
vi.mock("../models/user.server", () => {
  return {
    changePassword: vi.fn(),
    verifyLogin: vi.fn(),
  };
});
vi.mock("../flags.server", () => {
  return {
    evaluateBoolean: vi.fn(),
    FLAGS: {
      PASSWORD_CHANGE: "password-change",
      DELETE_ACCOUNT: "delete-account",
      PLEX: "plex",
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useLoaderData).mockReturnValue({
    webhookUrl: "http://webhook.example",
    features: { passwordChange: true, deleteAccount: true, plex: true },
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

  vi.mocked(changePassword).mockResolvedValue(undefined);

  vi.mocked(verifyLogin).mockResolvedValue({
    id: "123",
    email: "foo@example.com",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

test("renders page with password change form if feature is enabled", () => {
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

test("renders page without password change form if feature is disabled", () => {
  vi.mocked(useLoaderData).mockReturnValue({
    webhookUrl: "http://webhook.example",
    features: { passwordChange: false, deleteAccount: true },
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

test("renders page without delete account form if feature is disabled", () => {
  vi.mocked(useLoaderData).mockReturnValue({
    webhookUrl: "http://webhook.example",
    features: {
      passwordChange: true,
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

test("renders page without plex section if feature is disabled", () => {
  vi.mocked(useLoaderData).mockReturnValue({
    webhookUrl: "http://webhook.example",
    features: {
      passwordChange: true,
      deleteAccount: true,
      plex: false,
    },
  });

  render(<Account />);

  expect(screen.queryByText(/Plex Webhook/)).not.toBeInTheDocument();
});

test("loader should fetch the feature flags", async () => {
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

test("renders error message for generic", () => {
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

test("renders error message for token", () => {
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

test("renders error message for current password", () => {
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

test("renders error message for new password", () => {
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

test("renders error message for confirm password", () => {
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

test("renders success message", () => {
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

test("renders without current password input if token is passed", () => {
  vi.mocked(useSearchParams).mockReturnValue([
    // @ts-expect-error we do not want to specify all methods of URLSearchParams
    {
      get: () => "someToken",
    },
  ]);

  render(<Account />);

  expect(screen.queryByText(/Current Password/)).not.toBeInTheDocument();
});

test("action should return error if new password is invalid", async () => {
  const formData = new FormData();
  formData.append("password", "currentPassword");
  formData.append("newPassword", "");
  formData.append("confirmPassword", "newnewPassword");

  const response = await action({
    request: new Request("http://localhost:8080/password/change", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.newPassword).toBe("New password is required");
});

test("action should return error if confirm password is invalid", async () => {
  const formData = new FormData();
  formData.append("password", "currentPassword");
  formData.append("newPassword", "newnewPassword");
  formData.append("confirmPassword", "");

  const response = await action({
    request: new Request("http://localhost:8080/password/change", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.confirmPassword).toBe(
    "Password confirmation is required"
  );
});

test("action should return error if passwords do not match", async () => {
  const formData = new FormData();
  formData.append("password", "currentPassword");
  formData.append("newPassword", "newnewPassword");
  formData.append("confirmPassword", "newnewPassword2");

  const response = await action({
    request: new Request("http://localhost:8080/password/change", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.confirmPassword).toBe("Passwords do not match");
});

test("action should return error if current password is invalid", async () => {
  const formData = new FormData();
  formData.append("password", "");
  formData.append("newPassword", "newnewPassword");
  formData.append("confirmPassword", "newnewPassword");

  const response = await action({
    request: new Request("http://localhost:8080/password/change", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.password).toBe("Current password is required.");
});

test("action should return error if current password is wrong", async () => {
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
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.password).toBe("Current password is wrong.");
});

test("action should return error if change password fails", async () => {
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
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.generic).toBe(
    "Something went wrong. Please try again."
  );
});

test("action should return error if change password fails with expired reset", async () => {
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
    context: {},
    params: {},
  });

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.token).toBe(
    "Password reset link expired. Please try again."
  );
});

test("action should throw redirect if no logged in user", async () => {
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
      context: {},
      params: {},
    })
  ).rejects.toThrow();
});

test("action should change password if everything ok", async () => {
  const formData = new FormData();
  formData.append("password", "goodPassword");
  formData.append("newPassword", "newnewPassword");
  formData.append("confirmPassword", "newnewPassword");

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

test("action should change password with token", async () => {
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
    context: {},
    params: {},
  });

  expect(changePassword).toBeCalledWith("", "newnewPassword", "someToken");
});

test("loader throws if there is no user", async () => {
  vi.mocked(requireUser).mockRejectedValue(new Error("NO_USER"));

  await expect(() =>
    loader({
      request: new Request("http://localhost:8080/account"),
      context: {},
      params: {},
    })
  ).rejects.toThrow();
});
