import * as React from "react";
import { useActionData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getUserId } from "../session.server";
import Reset, { action, loader } from "./password.reset";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn().mockReturnValue({}),
  useActionData: vi.fn(),
  useLoaderData: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../db.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getUserId: vi.fn().mockResolvedValue(undefined),
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

  describe("Loader", () => {
    it("redirects if there is a user", async () => {
      vi.mocked(getUserId).mockResolvedValue("123");

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
  });
});
