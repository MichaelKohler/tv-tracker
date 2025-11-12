import * as React from "react";
import { useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import Index, { type loader } from "./tv._index";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn().mockReturnValue({}),
  useLoaderData: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUserId: vi.fn().mockResolvedValue("123"),
}));

vi.mock("../components/show-tiles", async () => ({
  ...(await vi.importActual("../components/show-tiles")),
  default: () => <p>ShowTiles</p>,
}));

vi.mock("../models/show.server", async () => ({
  ...(await vi.importActual("../models/show.server")),
  getSortedShowsByUserId: vi.fn().mockResolvedValue([]),
}));

describe("TV Index Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      shows: Promise.resolve([]),
      features: {
        search: true,
      },
    });
  });

  it("renders page without shows", async () => {
    render(<Index />);

    await vi.waitFor(() =>
      expect(screen.getByTestId("search-input")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        /You are currently tracking 0 shows with 0 unwatched episodes/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You have not added any shows yet./)
    ).toBeInTheDocument();
  });

  it("does not render search when feature is disabled", async () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      shows: Promise.resolve([]),
      features: {
        search: false,
      },
    });

    render(<Index />);

    await vi.waitFor(() =>
      expect(screen.queryByTestId("search-input")).not.toBeInTheDocument()
    );
  });

  it("renders page with shows", async () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      // @ts-expect-error .. we do not need to define the full show info for this..
      shows: Promise.resolve([
        {
          unwatchedEpisodesCount: 3,
        },
        {
          unwatchedEpisodesCount: 4,
        },
      ]),
      features: {
        search: true,
      },
    });

    render(<Index />);

    await vi.waitFor(() =>
      expect(screen.getByTestId("search-input")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        /You are currently tracking 2 shows with 7 unwatched episodes/
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/You have not added any shows yet./)
    ).not.toBeInTheDocument();
  });
});
