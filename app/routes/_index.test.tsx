import "@testing-library/jest-dom";
import * as React from "react";
import { RouterContextProvider, useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";

import type { User } from "../models/user.server";
import { evaluateBoolean } from "../flags.server";
import { getUserId } from "../session.server";
import { useIsLoggedIn } from "../utils";

import Index, { loader } from "./_index";

vi.mock("@react-router/node", async () => ({
  ...(await vi.importActual("@react-router/node")),
  json: vi
    .fn<(data: unknown) => unknown>()
    .mockImplementation((arg: unknown) => arg),
}));

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useLoaderData: vi
    .fn<() => unknown>()
    .mockReturnValue({ features: { signup: true } }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("../db.server");
vi.mock("../models/user.server", () => ({
  getUserById: vi.fn<() => Promise<User | null>>(),
}));

vi.mock("../flags.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getUserId: vi.fn<() => Promise<string | undefined>>(),
}));

vi.mock("../utils", async () => ({
  ...(await vi.importActual("../utils")),
  useIsLoggedIn: vi.fn<() => boolean>().mockReturnValue(false),
}));

describe("Index Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders index", () => {
    render(<Index />);

    expect(screen.getByText("What have you watched?")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
    expect(screen.queryByText("Coming Soon!")).not.toBeInTheDocument();
  });

  it("renders index with disabled signup", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      features: { signup: false },
    });

    render(<Index />);

    expect(screen.getByText("What have you watched?")).toBeInTheDocument();
    expect(screen.queryByText("Sign up")).not.toBeInTheDocument();
    expect(screen.queryByText("Get started")).not.toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
  });

  it("renders index with logged in user", () => {
    vi.mocked(useIsLoggedIn).mockReturnValue(true);

    render(<Index />);

    expect(screen.getByText("What have you watched?")).toBeInTheDocument();
    expect(screen.queryByText("Sign up")).not.toBeInTheDocument();
    expect(screen.queryByText("Log In")).not.toBeInTheDocument();
  });

  it("loaders returns signup flag", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(true); // signup disabled
    const request = new Request("http://localhost");
    const response = await loader({
      request,
      context: new RouterContextProvider(),
      url: new URL("http://localhost"),
      pattern: "",
      params: {},
    });

    const { features } = response as {
      features: { signup: boolean };
    };

    expect(features.signup).toBe(false);
  });

  it("loader redirects to /tv if logged in", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-id");
    const request = new Request("http://localhost");
    const response = (await loader({
      request,
      context: new RouterContextProvider(),
      url: new URL(request.url),
      pattern: "",
      params: {},
    })) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/tv");
  });
});
