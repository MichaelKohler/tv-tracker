import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import Index, { type loader } from "./tv._index";

beforeEach(() => {
  vi.mock("@remix-run/react", async () => {
    return {
      ...(await vi.importActual("@remix-run/react")),
      useNavigation: vi.fn().mockReturnValue({}),
      useLoaderData: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mock("../components/show-tiles", async () => {
    return {
      default: () => <p>ShowTiles</p>,
    };
  });

  vi.mock("../models/show.server", async () => {
    return {
      getSortedShowsByUserId: vi.fn().mockResolvedValue([]),
    };
  });

  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    // @ts-expect-error .. this is due to the wrong typing with Suspend
    shows: Promise.resolve([]),
  });
});

test("renders page without shows", async () => {
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

test("renders page with shows", async () => {
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
