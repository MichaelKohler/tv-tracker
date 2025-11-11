import * as React from "react";
import { redirect, useLoaderData } from "react-router";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { evaluateBoolean } from "../flags.server";
import { getUserId } from "../session.server";
import { useOptionalUser } from "../utils";

import Index, { loader } from "./_index";

beforeEach(() => {
  vi.mock("@react-router/node", () => {
    return {
      json: vi.fn().mockImplementation((arg) => arg),
    };
  });
  vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");

    return {
      ...actual,
      redirect: vi.fn(),
      useLoaderData: vi.fn().mockReturnValue({ features: { signup: true } }),
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });

  vi.mock("../flags.server", async () => {
    return {
      FLAGS: {
        SIGNUP_DISABLED: "signup-disabled",
      },
      evaluateBoolean: vi.fn().mockResolvedValue(false),
    };
  });

  vi.mock("../session.server", () => {
    return {
      getUserId: vi.fn(),
    };
  });
  vi.mock("../utils", () => {
    return {
      useOptionalUser: vi.fn().mockReturnValue(null),
    };
  });
});

test("renders index", () => {
  render(<Index />);

  expect(page.getByText("What have you watched?")).toBeInTheDocument();
  expect(page.getByText("Sign up")).toBeInTheDocument();
  expect(page.getByText("Log In")).toBeInTheDocument();
  expect(page.getByText("Coming Soon!")).not.toBeInTheDocument();
});

test("renders index with disabled signup", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    features: { signup: false },
  });

  render(<Index />);

  expect(page.getByText("What have you watched?")).toBeInTheDocument();
  expect(page.getByText("Sign up")).not.toBeInTheDocument();
  expect(page.getByText("Get started")).not.toBeInTheDocument();
  expect(page.getByText("Log In")).toBeInTheDocument();
});

test("renders index with logged in user", () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
  });

  render(<Index />);

  expect(page.getByText("What have you watched?")).toBeInTheDocument();
  expect(page.getByText("Sign up")).not.toBeInTheDocument();
  expect(page.getByText("Log In")).not.toBeInTheDocument();
});

test("loaders returns signup flag", async () => {
  vi.mocked(evaluateBoolean).mockResolvedValue(true); // signup disabled
  const request = new Request("http://localhost");
  const response = await loader({
    request,
    context: {},
    params: {},
  });

  const { features } = response as {
    features: { signup: boolean };
  };

  expect(features.signup).toBe(false);
});

test("loader redirects to /tv if logged in", async () => {
  vi.mocked(getUserId).mockResolvedValue("user-id");
  const request = new Request("http://localhost");
  await loader({ request, context: {}, params: {} });

  expect(redirect).toHaveBeenCalledWith("/tv");
});
