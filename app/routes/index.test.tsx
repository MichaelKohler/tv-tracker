import * as React from "react";
import { redirect, useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getFlagsFromEnvironment } from "../models/config.server";
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
      useLoaderData: vi
        .fn()
        .mockReturnValue({ environment: { SIGNUP_DISABLED: false } }),
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });
  vi.mock("../models/config.server", () => {
    return {
      getFlagsFromEnvironment: vi.fn(),
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

  expect(screen.getByText("What have you watched?")).toBeInTheDocument();
  expect(screen.getByText("Sign up")).toBeInTheDocument();
  expect(screen.getByText("Log In")).toBeInTheDocument();
  expect(screen.queryByText("Coming Soon!")).not.toBeInTheDocument();
});

test("renders index with disabled signup", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    environment: { SIGNUP_DISABLED: true },
  });

  render(<Index />);

  expect(screen.getByText("What have you watched?")).toBeInTheDocument();
  expect(screen.queryByText("Sign up")).not.toBeInTheDocument();
  expect(screen.queryByText("Get started")).not.toBeInTheDocument();
  expect(screen.getByText("Log In")).toBeInTheDocument();
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

  expect(screen.getByText("What have you watched?")).toBeInTheDocument();
  expect(screen.queryByText("Sign up")).not.toBeInTheDocument();
  expect(screen.queryByText("Log In")).not.toBeInTheDocument();
});

test("loaders returns signup flag", async () => {
  vi.mocked(getFlagsFromEnvironment).mockReturnValue({
    SIGNUP_DISABLED: true,
    MAINTENANCE_MODE_ENABLED: true,
  });
  const request = new Request("http://localhost");
  const response = await loader({
    request,
    context: {},
    params: {},
  });

  const { environment } = response as {
    environment: { SIGNUP_DISABLED: boolean };
  };

  expect(environment.SIGNUP_DISABLED).toBe(true);
});

test("loader redirects to /tv if logged in", async () => {
  vi.mocked(getUserId).mockResolvedValue("user-id");
  const request = new Request("http://localhost");
  await loader({ request, context: {}, params: {} });

  expect(redirect).toHaveBeenCalledWith("/tv");
});
