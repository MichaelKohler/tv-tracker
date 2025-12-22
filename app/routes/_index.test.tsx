import * as React from "react";
import { redirect, useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { evaluateBoolean } from "../flags.server";
import { getUserId } from "../session.server";
import { useOptionalUser } from "../utils";

import Index, { loader } from "./_index";

vi.mock("@react-router/node", async () => ({
  ...(await vi.importActual("@react-router/node")),
  json: vi.fn().mockImplementation((arg) => arg),
}));

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  redirect: vi.fn(),
  useLoaderData: vi.fn().mockReturnValue({ features: { signup: true } }),
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
}));

vi.mock("../utils", async () => ({
  ...(await vi.importActual("../utils")),
  useOptionalUser: vi.fn().mockReturnValue(null),
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
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "1",
      emailVerified: false,
      name: null,
      image: null,
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

  it("loaders returns signup flag", async () => {
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

  it("loader redirects to /tv if logged in", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-id");
    const request = new Request("http://localhost");
    await loader({ request, context: {}, params: {} });

    expect(redirect).toHaveBeenCalledWith("/tv");
  });
});
