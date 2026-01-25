import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { useOptionalUser } from "../utils";
import Header from "./header";
import { useMatches } from "react-router";
import { VisualTestContainer } from "./visual-test-helper";

const mockFeatures = {
  upcomingRoute: true,
  recentlyWatchedRoute: true,
  statsRoute: true,
  maintenanceMode: false,
  archive: true,
};

vi.mock("../utils", async () => ({
  ...(await vi.importActual("../utils")),
  useOptionalUser: vi.fn(),
}));

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useMatches: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useMatches).mockReturnValue([
      {
        id: "foo",
        pathname: "/",
        params: {},
        data: {},
        handle: {},
        loaderData: {},
      },
    ]);
  });

  it("renders header for logged in user", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "some-id",
      email: "some-email",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(
      <VisualTestContainer testid="header">
        <Header features={mockFeatures} />
      </VisualTestContainer>
    );

    expect(page.getByText("TV", { exact: true })).toBeInTheDocument();
    expect(page.getByText("Account")).toBeInTheDocument();
    expect(page.getByText("Upcoming")).toBeInTheDocument();
    expect(page.getByText("Logout")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("header");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("header");
  });

  it("renders header without buttons for logged in user", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "some-id",
      email: "some-email",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    render(<Header renderLoginButtons={false} features={mockFeatures} />);

    expect(page.getByText("TV", { exact: true })).toBeInTheDocument();
    expect(page.getByText("Account")).toBeInTheDocument();
    expect(page.getByText("Upcoming")).toBeInTheDocument();
    expect(page.getByText("Archive")).toBeInTheDocument();
    expect(page.getByText("Logout")).not.toBeInTheDocument();
  });

  it("renders header for logged out user", async () => {
    vi.mocked(useOptionalUser).mockReturnValue(undefined);

    render(<Header features={mockFeatures} />);

    expect(page.getByText("TV", { exact: true })).not.toBeInTheDocument();
    expect(page.getByText("Upcoming")).not.toBeInTheDocument();
    expect(page.getByText("Account")).not.toBeInTheDocument();
    expect(page.getByText("Archive")).not.toBeInTheDocument();
    expect(page.getByText("Log In")).toBeInTheDocument();
    expect(page.getByText("Sign up")).toBeInTheDocument();
  });

  it("renders header without buttons for logged out user", async () => {
    vi.mocked(useOptionalUser).mockReturnValue(undefined);

    render(<Header renderLoginButtons={false} features={mockFeatures} />);

    expect(page.getByText("TV", { exact: true })).not.toBeInTheDocument();
    expect(page.getByText("Upcoming")).not.toBeInTheDocument();
    expect(page.getByText("Account")).not.toBeInTheDocument();
    expect(page.getByText("Archive")).not.toBeInTheDocument();
    expect(page.getByText("Log In")).not.toBeInTheDocument();
    expect(page.getByText("Sign Up")).not.toBeInTheDocument();
  });

  it("hides links when features are disabled", async () => {
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
          archive: false,
        }}
      />
    );

    expect(page.getByText("TV", { exact: true })).toBeInTheDocument();
    expect(page.getByText("Upcoming")).not.toBeInTheDocument();
    expect(page.getByText("Recently watched")).not.toBeInTheDocument();
    expect(page.getByText("Archive")).not.toBeInTheDocument();
    expect(page.getByText("Stats")).not.toBeInTheDocument();
  });
});
