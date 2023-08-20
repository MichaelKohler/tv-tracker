import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { useOptionalUser } from "../utils";
import Header from "./header";

beforeEach(() => {
  vi.mock("../utils", async () => {
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

  expect(screen.getByText("TV")).toBeInTheDocument();
  expect(screen.getByText("Account")).toBeInTheDocument();
  expect(screen.getByText("Upcoming")).toBeInTheDocument();
  expect(screen.getByText(/Logout/)).toBeInTheDocument();
});

test("renders header without buttons for logged in user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "some-id",
    email: "some-email",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  render(<Header renderLoginButtons={false} />);

  expect(screen.getByText("TV")).toBeInTheDocument();
  expect(screen.getByText("Account")).toBeInTheDocument();
  expect(screen.getByText("Upcoming")).toBeInTheDocument();
  expect(screen.queryByText(/Logout/)).not.toBeInTheDocument();
});

test("renders header for logged out user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue(undefined);

  render(<Header />);

  expect(screen.queryByText("TV")).not.toBeInTheDocument();
  expect(screen.queryByText("Upcoming")).not.toBeInTheDocument();
  expect(screen.queryByText("Account")).not.toBeInTheDocument();
  expect(screen.getByText("Log In")).toBeInTheDocument();
  expect(screen.getByText("Sign up")).toBeInTheDocument();
});

test("renders header without buttons for logged out user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue(undefined);

  render(<Header renderLoginButtons={false} />);

  expect(screen.queryByText(/TV/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Upcoming/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Account/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Log In/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Sign Up/)).not.toBeInTheDocument();
});
