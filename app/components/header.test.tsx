import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { useOptionalUser } from "../utils";
import Header from "./header";

const mockFeatures = {
  upcomingRoute: true,
  recentlyWatchedRoute: true,
  statsRoute: true,
  maintenanceMode: false,
};

beforeEach(() => {
  vi.mock("../utils", async () => {
    return {
      useOptionalUser: vi.fn(),
    };
  });

  vi.mock("react-router", async () => {
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
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  render(<Header features={mockFeatures} />);

  expect(screen.getByText("TV")).toBeInTheDocument();
  expect(screen.getByText("Account")).toBeInTheDocument();
  expect(screen.getByText("Upcoming")).toBeInTheDocument();
  expect(screen.getByText(/Logout/)).toBeInTheDocument();
});

test("renders header without buttons for logged in user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "some-id",
    email: "some-email",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  render(<Header renderLoginButtons={false} features={mockFeatures} />);

  expect(screen.getByText("TV")).toBeInTheDocument();
  expect(screen.getByText("Account")).toBeInTheDocument();
  expect(screen.getByText("Upcoming")).toBeInTheDocument();
  expect(screen.queryByText(/Logout/)).not.toBeInTheDocument();
});

test("renders header for logged out user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue(undefined);

  render(<Header features={mockFeatures} />);

  expect(screen.queryByText("TV")).not.toBeInTheDocument();
  expect(screen.queryByText("Upcoming")).not.toBeInTheDocument();
  expect(screen.queryByText("Account")).not.toBeInTheDocument();
  expect(screen.getByText("Log In")).toBeInTheDocument();
  expect(screen.getByText("Sign up")).toBeInTheDocument();
});

test("renders header without buttons for logged out user", async () => {
  vi.mocked(useOptionalUser).mockReturnValue(undefined);

  render(<Header renderLoginButtons={false} features={mockFeatures} />);

  expect(screen.queryByText(/TV/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Upcoming/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Account/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Log In/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Sign Up/)).not.toBeInTheDocument();
});

test("hides links when features are disabled", async () => {
  vi.mocked(useOptionalUser).mockReturnValue({
    id: "some-id",
    email: "some-email",
    plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  render(
    <Header
      features={{
        upcomingRoute: false,
        recentlyWatchedRoute: false,
        statsRoute: false,
        maintenanceMode: false,
      }}
    />
  );

  expect(screen.getByText("TV")).toBeInTheDocument();
  expect(screen.queryByText("Upcoming")).not.toBeInTheDocument();
  expect(screen.queryByText("Recently watched")).not.toBeInTheDocument();
  expect(screen.queryByText("Stats")).not.toBeInTheDocument();
  expect(screen.getByText("Account")).toBeInTheDocument();
});
