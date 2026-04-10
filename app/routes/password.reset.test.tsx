import * as React from "react";
import type { Navigation } from "react-router";
import { useActionData, useNavigation } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { RateLimitResult } from "../rate-limiter.server";
import type { User } from "../models/user.server";
import { checkRateLimit } from "../rate-limiter.server";
import { getUserId } from "../session.server";
import Reset, { action, loader } from "./password.reset";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => Navigation>().mockReturnValue({ state: "idle" }),
  useActionData: vi.fn<() => unknown>(),
  useLoaderData: vi.fn<() => unknown>(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../db.server");
vi.mock("../models/password.server", () => ({
  triggerPasswordReset: vi.fn<() => Promise<void>>(),
}));
vi.mock("../rate-limiter.server", () => ({
  checkRateLimit: vi
    .fn<() => RateLimitResult>()
    .mockReturnValue({ limited: false, retryAfterSeconds: 0 }),
}));
vi.mock("../models/user.server", () => ({
  getUserById: vi.fn<() => Promise<User | null>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getUserId: vi
    .fn<() => Promise<string | undefined>>()
    .mockResolvedValue(undefined),
}));

describe("Password Reset Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders reset form", () => {
    render(<Reset />);

    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Send password reset email")).toBeInTheDocument();
  });

  it("renders error message for email", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: "EMAIL_ERROR",
      },
      done: false,
    });

    render(<Reset />);

    expect(screen.getByText("EMAIL_ERROR")).toBeInTheDocument();
  });

  it("renders success message", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: null,
      },
      done: true,
    });

    render(<Reset />);

    expect(
      screen.getByText(/An email to reset your password has been sent/)
    ).toBeInTheDocument();
  });

  it("shows loading state when submitting", () => {
    vi.mocked(useNavigation).mockReturnValue({
      state: "submitting",
    } as ReturnType<typeof useNavigation>);

    render(<Reset />);

    expect(screen.getByText("Sending email...")).toBeInTheDocument();
  });

  it("disables button when submitting", () => {
    vi.mocked(useNavigation).mockReturnValue({
      state: "submitting",
    } as ReturnType<typeof useNavigation>);

    render(<Reset />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("disables button after successful submission", () => {
    vi.mocked(useActionData).mockReturnValue({
      errors: {
        email: null,
      },
      done: true,
    });

    render(<Reset />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  describe("Loader", () => {
    it("redirects if there is a user", async () => {
      vi.mocked(getUserId).mockResolvedValue("123");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await loader({
        request: new Request("http://localhost:8080/password/reset"),
        context: {},
        params: {},
      });

      expect((response as Response).headers.get("Location")).toStrictEqual(
        "/account"
      );
    });
  });

  describe("Action", () => {
    it("should return error if email is invalid", async () => {
      const formData = new FormData();
      formData.append("email", "");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/reset", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.errors.email).toBe("Email is invalid");
    });

    it("should return 429 silently when rate limited", async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({
        limited: true,
        retryAfterSeconds: 3600,
      });

      const formData = new FormData();
      formData.append("email", "foo@example.com");

      // @ts-expect-error .. ignore unstable_pattern for example
      const response = await action({
        request: new Request("http://localhost:8080/password/reset", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      // @ts-expect-error : we do not actually have a real response here..
      expect(response.init?.status).toBe(429);
      // done: true so UI behaves identically to a successful submission (no enumeration)
      // @ts-expect-error : we do not actually have a real response here..
      expect(response.data.done).toBe(true);
    });

    it("should use email-based key for rate limiting", async () => {
      const formData = new FormData();
      formData.append("email", "foo@example.com");

      // @ts-expect-error .. ignore unstable_pattern for example
      await action({
        request: new Request("http://localhost:8080/password/reset", {
          method: "POST",
          body: formData,
        }),
        context: {},
        params: {},
      });

      expect(checkRateLimit).toHaveBeenCalledWith(
        "password-reset:foo@example.com",
        3,
        3_600_000
      );
    });
  });
});
