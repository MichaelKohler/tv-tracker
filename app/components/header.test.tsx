import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { useOptionalUser } from "~/utils";

import Header from "./header";

beforeEach(() => {
  vi.mock("~/utils", async () => {
    return {
      useOptionalUser: vi.fn(),
    };
  });

  vi.mock("@remix-run/react", async () => {
    return {
      useMatches: vi.fn().mockReturnValue([{ id: "foo" }]),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });
});

test("renders header for logged in user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "some-id",
    email: "some-email",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  render(<Header />);

  expect(screen.getByText("TV")).toBeDefined();
  expect(screen.getByText("Account")).toBeDefined();
  expect(screen.getByText(/Logout/)).toBeDefined();
});

test("renders header without buttons for logged in user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "some-id",
    email: "some-email",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  render(<Header renderLoginButtons={false} />);

  expect(screen.getByText("TV")).toBeDefined();
  expect(screen.getByText("Account")).toBeDefined();
  expect(screen.queryByText(/Logout/)).toBeNull();
});

test("renders header for logged out user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue(undefined);

  render(<Header />);

  expect(screen.queryByText("TV")).toBeNull();
  expect(screen.queryByText("Account")).toBeNull();
  expect(screen.getByText("Log In")).toBeDefined();
  expect(screen.getByText("Sign up")).toBeDefined();
});

test("renders header without buttons for logged out user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue(undefined);

  render(<Header renderLoginButtons={false} />);

  expect(screen.queryByText(/TV/)).toBeNull();
  expect(screen.queryByText(/Account/)).toBeNull();
  expect(screen.queryByText(/Log In/)).toBeNull();
  expect(screen.queryByText(/Sign Up/)).toBeNull();
});
