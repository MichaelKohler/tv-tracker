import * as React from "react";
import { redirect, useActionData, useNavigation } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { verifyLogin } from "../models/user.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";
import Login, { action, loader } from "./login";

beforeEach(() => {
  vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...(actual as object),
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
      ...(actual as object),
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

  expect(screen.getByText("Email address")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();
  expect(screen.getByText("Log in")).toBeInTheDocument();
  expect(screen.getByText("Remember me")).toBeInTheDocument();
  expect(screen.getByText("Reset password")).toBeInTheDocument();
});

test("renders logging in on button while submitting form", () => {
  // @ts-expect-error .. we do not need to define the full FormData impl
  vi.mocked(useNavigation).mockReturnValue({ formData: {} });

  render(<Login />);

  expect(screen.getByText("Logging in...")).toBeInTheDocument();
});

test("renders error message for email", () => {
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      email: "EMAIL_ERROR",
      password: null,
    },
  });

  render(<Login />);

  expect(screen.getByText("EMAIL_ERROR")).toBeInTheDocument();
});

test("renders error message for password", () => {
  vi.mocked(useActionData).mockReturnValue({
    errors: {
      email: null,
      password: "PASSWORD_ERROR",
    },
  });

  render(<Login />);

  expect(screen.getByText("PASSWORD_ERROR")).toBeInTheDocument();
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

  const result = await loader({
    request: new Request("http://localhost:8080/login"),
    context: {},
    params: {},
  });

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
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
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
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
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
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.email).toBe("Email is invalid");
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.password).toBe("Password is required");
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

  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.errors.email).toBe("Invalid email or password");
});
