import * as React from "react";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as invite from "../models/invite.server";
import { evaluateBoolean } from "../flags.server";
import { createUser, getUserByEmail } from "../models/user.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";
import Join, { action, loader } from "./join";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
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
}));

vi.mock("../db.server");

vi.mock("../flags.server", async () => ({
  ...(await vi.importActual("../flags.server")),
  FLAGS: {
    SIGNUP_DISABLED: "signup-disabled",
  },
  evaluateBoolean: vi.fn().mockResolvedValue(false),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getUserId: vi.fn(),
  createUserSession: vi.fn().mockImplementation((arg) => arg),
}));

vi.mock("../utils", async () => ({
  ...(await vi.importActual("../utils")),
  validateEmail: vi.fn(),
}));

vi.mock("../models/user.server", async () => ({
  ...(await vi.importActual("../models/user.server")),
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
}));

describe("Join Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders join form", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      features: {
        signup: true,
      },
    });

    render(<Join />);

    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("renders disabled join form with invite code input", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      features: {
        signup: false,
      },
    });

    render(<Join />);

    expect(
      screen.getByText(/Signup is currently disabled/)
    ).toBeInTheDocument();
    expect(screen.getByText("Invite code")).toBeInTheDocument();
  });

  it("renders creating account on button while submitting form", () => {
    // @ts-expect-error .. we do not need to define the full FormData impl
    vi.mocked(useNavigation).mockReturnValue({ formData: {} });

    render(<Join />);

    expect(screen.getByText("Creating Account...")).toBeInTheDocument();
  });

  it("renders error message for email", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: "EMAIL_ERROR",
        password: null,
        invite: null,
      },
    });

    render(<Join />);

    expect(screen.getByText("EMAIL_ERROR")).toBeInTheDocument();
  });

  it("renders error message for password", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: null,
        password: "PASSWORD_ERROR",
        invite: null,
      },
    });

    render(<Join />);

    expect(screen.getByText("PASSWORD_ERROR")).toBeInTheDocument();
  });

  it("renders error message for invite code", () => {
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

    expect(screen.getByText("INVALID_INVITE_ERROR")).toBeInTheDocument();
  });

  describe("loader", () => {
    it("redirects if there is a user", async () => {
      vi.mocked(getUserId).mockResolvedValue("123");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await loader({
        request: new Request("http://localhost:8080/join"),
        context: {},
        params: {},
      });

      expect(response).toStrictEqual(redirect("/"));
    });

    it("returns features if there is no user", async () => {
      vi.mocked(getUserId).mockResolvedValue(undefined);

      // @ts-expect-error .. ignore unstable_pattern for example
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
  });

  describe("action", () => {
    it("should return if everything ok", async () => {
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

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return if everything ok with custom redirect", async () => {
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

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return error if email is invalid", async () => {
      vi.mocked(getUserId).mockResolvedValue(undefined);
      vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
      vi.mocked(validateEmail).mockReturnValue(false);

      const formData = new FormData();
      formData.append("email", "invalid");
      formData.append("password", "foofoofoo");

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return error if no password", async () => {
      vi.mocked(getUserId).mockResolvedValue(undefined);
      vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
      vi.mocked(validateEmail).mockReturnValue(true);

      const formData = new FormData();
      formData.append("email", "foo@example.com");
      formData.append("password", "");

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return error if password is too short", async () => {
      vi.mocked(getUserId).mockResolvedValue(undefined);
      vi.mocked(evaluateBoolean).mockResolvedValue(false); // signup is enabled
      vi.mocked(validateEmail).mockReturnValue(true);

      const formData = new FormData();
      formData.append("email", "foo@example.com");
      formData.append("password", "short");

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return error if user exists", async () => {
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

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return error if invite code is missing for disabled signup", async () => {
      vi.mocked(getUserId).mockResolvedValue(undefined);
      vi.mocked(evaluateBoolean).mockResolvedValue(true); // signup is disabled
      vi.mocked(validateEmail).mockReturnValue(true);
      vi.mocked(getUserByEmail).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("email", "foo@example.com");
      formData.append("password", "foofoofoo");

      // @ts-expect-error .. ignore unstable_pattern for example
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

    it("should return error if invite code is invalid for disabled signup", async () => {
      vi.mocked(getUserId).mockResolvedValue(undefined);
      vi.mocked(evaluateBoolean).mockResolvedValue(true); // signup is disabled
      vi.mocked(validateEmail).mockReturnValue(true);
      vi.mocked(getUserByEmail).mockResolvedValue(null);

      vi.spyOn(invite, "redeemInviteCode").mockResolvedValue(false);

      const formData = new FormData();
      formData.append("email", "foo@example.com");
      formData.append("password", "foofoofoo");
      formData.append("invite", "someInviteCode");

      // @ts-expect-error .. ignore unstable_pattern for example
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
  });
});
