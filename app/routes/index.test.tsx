import * as React from "react";
import { useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getFlagsFromEnvironment } from "../models/config.server";
import { useOptionalUser } from "../utils";

import Index, { loader } from "./_index";

beforeEach(() => {
  vi.mock("@react-router/node", () => {
    return {
      json: vi.fn().mockImplementation((arg) => arg),
    };
  });
  vi.mock("react-router", () => {
    return {
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
  expect(screen.getByText("Log In")).toBeInTheDocument();
  expect(screen.getByText("Coming Soon!")).toBeInTheDocument();
});

test("renders index with logged in user", () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
    plexToken: null,
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

  const { environment } = await loader();

  expect(environment.SIGNUP_DISABLED).toBe(true);
});
