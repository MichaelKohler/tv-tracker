import * as React from "react";
import { redirect, useActionData, useNavigation } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { auth } from "../auth.server";
import Login, { action, loader } from "./login";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
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
}));

vi.mock("../auth.server", () => ({
  auth: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    createSessionCookie: vi.fn(),
  },
}));

describe("Login Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form", () => {
    render(<Login />);

    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByText("Remember me")).toBeInTheDocument();
    expect(screen.getByText("Reset password")).toBeInTheDocument();
  });

  it("renders logging in on button while submitting form", () => {
    // @ts-expect-error .. we do not need to define the full FormData impl
    vi.mocked(useNavigation).mockReturnValue({ formData: {} });

    render(<Login />);

    expect(screen.getByText("Logging in...")).toBeInTheDocument();
  });

  it("renders error message for email", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: "EMAIL_ERROR",
        password: null,
      },
    });

    render(<Login />);

    expect(screen.getByText("EMAIL_ERROR")).toBeInTheDocument();
  });

  it("renders error message for password", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: null,
        password: "PASSWORD_ERROR",
      },
    });

    render(<Login />);

    expect(screen.getByText("PASSWORD_ERROR")).toBeInTheDocument();
  });

  it("loader redirects if there is a user", async () => {
    vi.mocked(auth.getSession).mockResolvedValue({ user: { id: "123" } });

    const response = await loader({
      request: new Request("http://localhost:8080/login"),
      context: {},
      params: {},
    });

    expect(response).toStrictEqual(redirect("/"));
  });

  it("loader returns nothing if there is no user", async () => {
    vi.mocked(auth.getSession).mockResolvedValue(null);

    const result = await loader({
      request: new Request("http://localhost:8080/login"),
      context: {},
      params: {},
    });

    expect(result).toStrictEqual({});
  });

  it("action should return if everything ok", async () => {
    const session = { user: { id: "123" } };
    vi.mocked(auth.signIn).mockResolvedValue({ session });
    vi.mocked(auth.createSessionCookie).mockResolvedValue("cookie");

    const formData = new FormData();
    formData.append("email", "foo@example.com");
    formData.append("password", "foo");

    const response = await action({
      request: new Request("http://localhost:8080/login", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });

    expect(response.headers.get("Set-Cookie")).toBe("cookie");
  });

  it("action should set maxAge if remember is on", async () => {
    const session = { user: { id: "123" } };
    vi.mocked(auth.signIn).mockResolvedValue({ session });
    vi.mocked(auth.createSessionCookie).mockResolvedValue("cookie");

    const formData = new FormData();
    formData.append("email", "foo@example.com");
    formData.append("password", "foo");
    formData.append("remember", "on");

    await action({
      request: new Request("http://localhost:8080/login", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });

    expect(auth.createSessionCookie).toHaveBeenCalledWith(session, {
      maxAge: 604800,
    });
  });

  it("action should return error if signIn fails", async () => {
    vi.mocked(auth.signIn).mockRejectedValue({ type: "CredentialsSignin" });

    const formData = new FormData();
    formData.append("email", "foo@example.com");
    formData.append("password", "foo");

    const response = await action({
      request: new Request("http://localhost:8080/login", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });

    expect(response.errors.email).toBe("Invalid email or password");
  });

  it("action should return error if signIn fails with unknown error", async () => {
    vi.mocked(auth.signIn).mockRejectedValue(new Error("Unknown error"));

    const formData = new FormData();
    formData.append("email", "foo@example.com");
    formData.append("password", "foo");

    const response = await action({
      request: new Request("http://localhost:8080/login", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });

    expect(response.errors.email).toBe("An unknown error occurred");
  });
});
