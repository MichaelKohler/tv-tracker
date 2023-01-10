import * as React from "react";
import { redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useTransition } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as config from "~/models/config.server";
import * as invite from "~/models/invite.server";
import { createUser, getUserByEmail } from "~/models/user.server";
import Join, { action, loader, meta } from "./join";
import { getUserId } from "~/session.server";
import { validateEmail } from "~/utils";

const MOCK_ENV = {
  SIGNUP_DISABLED: false,
  MAINTENANCE_MODE_ENABLED: false,
};

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useTransition: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      useLoaderData: vi.fn(),
      useSearchParams: vi.fn().mockReturnValue([
        {
          get: () => "dummySearchParamValue..",
        },
      ]),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });
  vi.mock("~/session.server", async () => {
    return {
      getUserId: vi.fn(),
      createUserSession: vi.fn().mockImplementation((arg) => arg),
    };
  });
  vi.mock("~/utils", async () => {
    const actual = await vi.importActual("~/utils");
    return {
      ...(actual as Object),
      validateEmail: vi.fn(),
    };
  });
  vi.mock("~/models/user.server", () => {
    return {
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
    };
  });

  vi.spyOn(config, "getFlagsFromEnvironment").mockReturnValue(MOCK_ENV);
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    environment: MOCK_ENV,
  });
});

test("renders join form", () => {
  render(<Join />);

  expect(screen.getByText("Email address")).toBeDefined();
  expect(screen.getByText("Password")).toBeDefined();
  expect(screen.getByText("Create Account")).toBeDefined();
});

test("renders disabled join form with invite code input", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    environment: {
      ...MOCK_ENV,
      SIGNUP_DISABLED: true,
    },
  });

  render(<Join />);

  expect(screen.getByText(/Signup is currently disabled/)).toBeDefined();
  expect(screen.getByText("Invite code")).toBeDefined();
});

test("renders creating account on button while submitting form", () => {
  // @ts-expect-error .. we do not need to define the full FormData impl
  vi.mocked(useTransition).mockReturnValue({ submission: { formData: {} } });

  render(<Join />);

  expect(screen.getByText("Creating Account...")).toBeDefined();
});

test("renders error message for email", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      email: "EMAIL_ERROR",
      password: null,
      invite: null,
    },
  });

  render(<Join />);

  expect(screen.getByText("EMAIL_ERROR")).toBeDefined();
});

test("renders error message for password", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      email: null,
      password: "PASSWORD_ERROR",
      invite: null,
    },
  });

  render(<Join />);

  expect(screen.getByText("PASSWORD_ERROR")).toBeDefined();
});

test("renders error message for invite code", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    environment: {
      ...MOCK_ENV,
      SIGNUP_DISABLED: true,
    },
  });
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      email: null,
      password: null,
      invite: "INVALID_INVITE_ERROR",
    },
  });

  render(<Join />);

  expect(screen.getByText("INVALID_INVITE_ERROR")).toBeDefined();
});

test("meta returns correct title", () => {
  const metaReturn = meta();

  expect(metaReturn.title).toBe("Sign Up");
});

test("loader redirects if there is a user", async () => {
  vi.mocked(getUserId).mockResolvedValue("123");

  const response = await loader({
    request: new Request("http://localhost:8080/join"),
    context: {},
    params: {},
  });

  expect(response).toStrictEqual(redirect("/"));
});

test("loader returns environment if there is no user", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);

  const response = await loader({
    request: new Request("http://localhost:8080/join"),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result).toStrictEqual({ environment: MOCK_ENV });
});

test("action should return if everything ok", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue(null);
  vi.mocked(createUser).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
  });

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foofoofoo");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error .. seems we do not actually have the right type due to mocking..
  expect(response.redirectTo).toBe("/tv");
  // @ts-expect-error .. seems we do not actually have the right type due to mocking..
  expect(response.remember).toBe(false);
});

test("action should return if everything ok with custom redirect", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue(null);
  vi.mocked(createUser).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
  });

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foofoofoo");
  formData.append("redirectTo", "/customRedirectLocation");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error .. seems we do not actually have the right type due to mocking..
  expect(response.redirectTo).toBe("/customRedirectLocation");
});

test("action should return error if email is invalid", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(false);

  const formData = new FormData();
  formData.append("email", "invalid");
  formData.append("password", "foofoofoo");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.email).toBe("Email is invalid");
});

test("action should return error if no password", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.password).toBe("Password is required");
});

test("action should return error if password is too short", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "short");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.password).toBe("Password is too short");
});

test("action should return error if user exists", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue({
    id: "123",
    email: "already-existing@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const formData = new FormData();
  formData.append("email", "already-existing@example.com");
  formData.append("password", "foofoofoo");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.email).toBe("A user already exists with this email");
});

test("action should return error if invite code is missing for disabled signup", async () => {
  vi.mocked(config.getFlagsFromEnvironment).mockReturnValue({
    ...MOCK_ENV,
    SIGNUP_DISABLED: true,
  });
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue(null);

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foofoofoo");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.invite).toBe("Invite code is required");
});

test("action should return error if invite code is invalid for disabled signup", async () => {
  vi.mocked(config.getFlagsFromEnvironment).mockReturnValue({
    ...MOCK_ENV,
    SIGNUP_DISABLED: true,
  });
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue(null);

  vi.spyOn(invite, "redeemInviteCode").mockResolvedValue(false);

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foofoofoo");
  formData.append("invite", "someInviteCode");

  const response = await action({
    request: new Request("http://localhost:8080/join", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.invite).toBe("Invite code is invalid");
});
