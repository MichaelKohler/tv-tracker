import * as React from "react";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import * as invite from "../models/invite.server";
import { evaluateBoolean } from "../flags.server";
import { createUser, getUserByEmail } from "../models/user.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";
import Join, { action, loader } from "./join";

beforeEach(() => {
  vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");

    return {
      ...actual,
      useNavigation: vi.fn().mockReturnValue({}),
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

  vi.mock("../db.server");

  vi.mock("../flags.server", async () => {
    const actual = await vi.importActual("../flags.server");

    return {
      ...actual,
      FLAGS: {
        SIGNUP_DISABLED: "signup-disabled",
      },
      evaluateBoolean: vi.fn().mockResolvedValue(false),
    };
  });

  vi.mock("../session.server", async () => {
    const actual = await vi.importActual("../session.server");

    return {
      ...actual,
      getUserId: vi.fn(),
      createUserSession: vi.fn().mockImplementation((arg) => arg),
    };
  });

  vi.mock("../utils", async () => {
    const actual = await vi.importActual("../utils");

    return {
      ...actual,
      validateEmail: vi.fn(),
    };
  });

  vi.mock("../models/user.server", async () => {
    const actual = await vi.importActual("../models/user.server");

    return {
      ...actual,
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
    };
  });
});

test("renders join form", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    features: {
      signup: true,
    },
  });

  render(<Join />);

  expect(page.getByText("Email address")).toBeInTheDocument();
  expect(page.getByText("Password")).toBeInTheDocument();
  expect(page.getByText("Create Account")).toBeInTheDocument();
});

test("renders disabled join form with invite code input", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    features: {
      signup: false,
    },
  });

  render(<Join />);

  expect(page.getByText(/Signup is currently disabled/)).toBeInTheDocument();
  expect(page.getByText("Invite code")).toBeInTheDocument();
});

test("renders creating account on button while submitting form", () => {
  // @ts-expect-error .. we do not need to define the full FormData impl
  vi.mocked(useNavigation).mockReturnValue({ formData: {} });

  render(<Join />);

  expect(page.getByText("Creating Account...")).toBeInTheDocument();
});

test("renders error message for email", () => {
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      email: "EMAIL_ERROR",
      password: null,
      invite: null,
    },
  });

  render(<Join />);

  expect(page.getByText("EMAIL_ERROR")).toBeInTheDocument();
});

test("renders error message for password", () => {
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      email: null,
      password: "PASSWORD_ERROR",
      invite: null,
    },
  });

  render(<Join />);

  expect(page.getByText("PASSWORD_ERROR")).toBeInTheDocument();
});

test("renders error message for invite code", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    features: {
      signup: false,
    },
  });
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      email: null,
      password: null,
      invite: "INVALID_INVITE_ERROR",
    },
  });

  render(<Join />);

  expect(page.getByText("INVALID_INVITE_ERROR")).toBeInTheDocument();
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

test("loader returns features if there is no user", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);

  const result = await loader({
    request: new Request("http://localhost:8080/join"),
    context: {},
    params: {},
  });

  expect(result).toStrictEqual({
    features: {
      signup: true,
    },
  });
});

test("action should return if everything ok", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue(null);
  vi.mocked(createUser).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
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
  vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue(null);
  vi.mocked(createUser).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
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
  vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.email).toBe("Email is invalid");
});

test("action should return error if no password", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.password).toBe("Password is required");
});

test("action should return error if password is too short", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.password).toBe(
    "Password must be at least 8 characters long"
  );
});

test("action should return error if user exists", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(getUserByEmail).mockResolvedValue({
    id: "123",
    email: "foo@example.com",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.email).toBe(
    "A user already exists with this email"
  );
});

test("action should return error if invite code is missing for disabled signup", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(evaluateBoolean).mockResolvedValue(true); // signup is disabled
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.invite).toBe("Invite code is required");
});

test("action should return error if invite code is invalid for disabled signup", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(evaluateBoolean).mockResolvedValue(true); // signup is disabled
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.invite).toBe("Invite code is invalid");
});
