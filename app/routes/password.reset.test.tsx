import * as React from "react";
import { redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getUserId } from "../session.server";
import Reset, { action, loader } from "./password.reset";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useNavigation: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      useLoaderData: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });

  vi.mock("../db.server");

  vi.mock("../session.server", async () => {
    return {
      getUserId: vi.fn(),
    };
  });

  vi.mocked(getUserId).mockResolvedValue(undefined);
});

test("renders reset form", () => {
  render(<Reset />);

  expect(screen.getByText("Email address")).toBeInTheDocument();
  expect(screen.getByText("Send password reset email")).toBeInTheDocument();
});

test("renders error message for email", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    errors: {
      email: "EMAIL_ERROR",
    },
    done: false,
  });

  render(<Reset />);

  expect(screen.getByText("EMAIL_ERROR")).toBeInTheDocument();
});

test("renders success message", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
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

test("loader redirects if there is a user", async () => {
  vi.mocked(getUserId).mockResolvedValue("123");

  const response = await loader({
    request: new Request("http://localhost:8080/password/reset"),
    context: {},
    params: {},
  });

  expect(response).toStrictEqual(redirect("/password/change"));
});

test("action should return error if email is invalid", async () => {
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
  const result = await response.json();

  expect(result.errors.email).toBe("Email is invalid");
  expect(result.done).toBe(false);
});
