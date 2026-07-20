import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { useMatches } from "react-router";

import Header from "./header";
import { VisualTestContainer } from "./visual-test-helper";
import { useOptionalUser } from "../utils";

const mockFeatures = {
  upcomingRoute: true,
  recentlyWatchedRoute: true,
  statsRoute: true,
  maintenanceMode: false,
  archive: true,
};

vi.mock("../utils", async () => ({
  ...(await vi.importActual("../utils")),
  useOptionalUser: vi.fn<() => unknown>(),
}));

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useMatches: vi.fn<() => unknown>(),
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

    await render(
      <VisualTestContainer testid="header">
        <Header features={mockFeatures} />
      </VisualTestContainer>
    );

    await expect.element(page.getByText("TV", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Account")).toBeInTheDocument();
    await expect.element(page.getByText("Upcoming")).toBeInTheDocument();
    await expect.element(page.getByText("Logout")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("header");
    await expect.element(element).toBeInTheDocument();
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

    await render(<Header renderLoginButtons={false} features={mockFeatures} />);

    await expect.element(page.getByText("TV", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Account")).toBeInTheDocument();
    await expect.element(page.getByText("Upcoming")).toBeInTheDocument();
    await expect.element(page.getByText("Archive")).toBeInTheDocument();
    await expect.element(page.getByText("Logout")).not.toBeInTheDocument();
  });

  it("renders header for logged out user", async () => {
    vi.mocked(useOptionalUser).mockReturnValue(undefined);

    await render(<Header features={mockFeatures} />);

    await expect.element(page.getByText("TV", { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText("Upcoming")).not.toBeInTheDocument();
    await expect.element(page.getByText("Account")).not.toBeInTheDocument();
    await expect.element(page.getByText("Archive")).not.toBeInTheDocument();
    await expect.element(page.getByText("Log In")).toBeInTheDocument();
    await expect.element(page.getByText("Sign up")).toBeInTheDocument();
  });

  it("renders header without buttons for logged out user", async () => {
    vi.mocked(useOptionalUser).mockReturnValue(undefined);

    await render(<Header renderLoginButtons={false} features={mockFeatures} />);

    await expect.element(page.getByText("TV", { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText("Upcoming")).not.toBeInTheDocument();
    await expect.element(page.getByText("Account")).not.toBeInTheDocument();
    await expect.element(page.getByText("Archive")).not.toBeInTheDocument();
    await expect.element(page.getByText("Log In")).not.toBeInTheDocument();
    await expect.element(page.getByText("Sign Up")).not.toBeInTheDocument();
  });

  it("hides links when features are disabled", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "some-id",
      email: "some-email",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await render(
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

    await expect.element(page.getByText("TV", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Upcoming")).not.toBeInTheDocument();
    await expect.element(page.getByText("Recently watched")).not.toBeInTheDocument();
    await expect.element(page.getByText("Archive")).not.toBeInTheDocument();
    await expect.element(page.getByText("Stats")).not.toBeInTheDocument();
  });
});
