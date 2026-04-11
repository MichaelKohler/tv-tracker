import "@testing-library/jest-dom";
import * as React from "react";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { render, screen } from "@testing-library/react";
import type { Navigation } from "react-router";

import * as invite from "../models/invite.server";
import Join, { action, loader } from "./join";
import { checkRateLimit, getClientIp } from "../rate-limiter.server";
import { createUser, getUserByEmail } from "../models/user.server";
import type { RateLimitResult } from "../rate-limiter.server";
import type { User } from "../models/user.server";
import { evaluateBoolean } from "../flags.server";
import { getUserId } from "../session.server";
import { validateEmail } from "../utils";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => Navigation>().mockReturnValue({} as Navigation),
  useActionData: vi.fn<() => unknown>(),
  useLoaderData: vi.fn<() => unknown>(),
  useSearchParams: vi.fn<() => unknown>().mockReturnValue([
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

vi.mock("../rate-limiter.server", () => ({
  checkRateLimit: vi
    .fn<() => RateLimitResult>()
    .mockReturnValue({ limited: false, retryAfterSeconds: 0 }),
  getClientIp: vi.fn<() => string>().mockReturnValue("127.0.0.1"),
}));

vi.mock("../flags.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getUserId: vi.fn<() => Promise<string | undefined>>(),
  createUserSession: vi
    .fn<() => Promise<Response>>()
    .mockImplementation(
      ((arg: unknown) => arg) as unknown as () => Promise<Response>
    ),
}));

vi.mock("../utils", async () => ({
  ...(await vi.importActual("../utils")),
  validateEmail: vi.fn<() => boolean>(),
}));

vi.mock("../models/user.server", () => ({
  createUser: vi.fn<() => Promise<User>>(),
  getUserByEmail: vi.fn<() => Promise<User | null>>(),
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
    vi.mocked(useNavigation).mockReturnValue({
      formData: {} as FormData,
    } as Navigation);

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

    it("should return 429 when rate limited", async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({
        limited: true,
        retryAfterSeconds: 3600,
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

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.init?.status).toBe(429);
      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.errors.email).toBe(
        "Too many signup attempts. Please try again later."
      );
    });

    it("should use IP-based key for rate limiting", async () => {
      vi.mocked(getClientIp).mockReturnValue("10.0.0.2");
      vi.mocked(evaluateBoolean).mockResolvedValue(false);
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
      await action({
        request: new Request("http://localhost:8080/join", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(checkRateLimit).toHaveBeenCalledWith(
        "signup:10.0.0.2",
        10,
        3_600_000
      );
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
