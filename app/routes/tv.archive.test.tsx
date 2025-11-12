import * as React from "react";
import { useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import Archive, { type loader } from "./tv.archive";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn().mockReturnValue({}),
  useLoaderData: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../db.server");

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
  getArchivedShowsByUserId: vi.fn().mockResolvedValue([]),
}));

describe("TV Archive Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      shows: [],
      features: {
        archive: true,
      },
    });
  });

  it("renders page without shows", async () => {
    render(<Archive />);

    expect(
      screen.getByText(/You have no archived shows yet./)
    ).toBeInTheDocument();
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
        archive: true,
      },
    });

    render(<Archive />);

    expect(
      screen.queryByText(/You have no archived shows yet./)
    ).not.toBeInTheDocument();
  });
});
