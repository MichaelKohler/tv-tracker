import * as React from "react";
import { redirect } from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { verifyLogin } from "../models/user.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";
import Login, { action, loader, meta } from "./login";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useNavigation: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
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
  vi.mock("../session.server", async () => {
    return {
      getUserId: vi.fn(),
      createUserSession: vi.fn().mockImplementation((arg) => arg),
    };
  });
  vi.mock("../utils", async () => {
    const actual = await vi.importActual("../utils");
    return {
      ...(actual as Object),
      validateEmail: vi.fn(),
    };
  });
  vi.mock("../models/user.server", () => {
    return {
      verifyLogin: vi.fn(),
    };
  });
});

test("renders login form", () => {
  render(<Login />);

  expect(screen.getByText("Email address")).toBeDefined();
  expect(screen.getByText("Password")).toBeDefined();
  expect(screen.getByText("Log in")).toBeDefined();
  expect(screen.getByText("Remember me")).toBeDefined();
  expect(screen.getByText("Reset password")).toBeDefined();
});

test("renders logging in on button while submitting form", () => {
  // @ts-expect-error .. we do not need to define the full FormData impl
  vi.mocked(useNavigation).mockReturnValue({ formData: {} });

  render(<Login />);

  expect(screen.getByText("Logging in...")).toBeDefined();
});

test("renders error message for email", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      email: "EMAIL_ERROR",
      password: null,
    },
  });

  render(<Login />);

  expect(screen.getByText("EMAIL_ERROR")).toBeDefined();
});

test("renders error message for password", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      email: null,
      password: "PASSWORD_ERROR",
    },
  });

  render(<Login />);

  expect(screen.getByText("PASSWORD_ERROR")).toBeDefined();
});

test("meta returns correct title", () => {
  const metaReturn = meta();

  expect(metaReturn.title).toBe("Login");
});

test("loader redirects if there is a user", async () => {
  vi.mocked(getUserId).mockResolvedValue("123");

  const response = await loader({
    request: new Request("http://localhost:8080/login"),
    context: {},
    params: {},
  });

  expect(response).toStrictEqual(redirect("/"));
});

test("loader returns nothing if there is no user", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);

  const response = await loader({
    request: new Request("http://localhost:8080/login"),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result).toStrictEqual({});
});

test("action should return if everything ok", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(verifyLogin).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
  });

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foo");
  formData.append("remember", "off");

  const response = await action({
    request: new Request("http://localhost:8080/login", {
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

test("action should return if everything ok with remember on", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(verifyLogin).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
  });

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foo");
  formData.append("remember", "on");

  const response = await action({
    request: new Request("http://localhost:8080/login", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });

  // @ts-expect-error .. seems we do not actually have the right type due to mocking..
  expect(response.remember).toBe(true);
});

test("action should return if everything ok with custom redirect", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(verifyLogin).mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
  });

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foo");
  formData.append("remember", "off");
  formData.append("redirectTo", "/customRedirectLocation");

  const response = await action({
    request: new Request("http://localhost:8080/login", {
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
  formData.append("password", "foo");
  formData.append("remember", "off");

  const response = await action({
    request: new Request("http://localhost:8080/login", {
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
  formData.append("remember", "off");

  const response = await action({
    request: new Request("http://localhost:8080/login", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.password).toBe("Password is required");
});

test("action should return error if verifyLogin fails", async () => {
  vi.mocked(getUserId).mockResolvedValue(undefined);
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(verifyLogin).mockResolvedValue(null);

  const formData = new FormData();
  formData.append("email", "foo@example.com");
  formData.append("password", "foo");
  formData.append("remember", "off");

  const response = await action({
    request: new Request("http://localhost:8080/login", {
      method: "POST",
      body: formData,
    }),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result.errors.email).toBe("Invalid email or password");
});
