import * as React from "react";
import { useLoaderData } from "react-router";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import Index, { type loader } from "./tv._index";

beforeEach(() => {
  vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...(actual as object),
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
    shows: Promise.resolve([]),
    features: {
      search: true,
    },
  });
});

test("renders page without shows", async () => {
  render(<Index />);

  await vi.waitFor(() =>
    expect(page.getByTestId("search-input")).toBeInTheDocument()
  );
  expect(
    page.getByText(
      /You are currently tracking 0 shows with 0 unwatched episodes/
    )
  ).toBeInTheDocument();
  expect(
    page.getByText(/You have not added any shows yet./)
  ).toBeInTheDocument();
});

test("does not render search when feature is disabled", async () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    shows: Promise.resolve([]),
    features: {
      search: false,
    },
  });

  render(<Index />);

  await vi.waitFor(() =>
    expect(page.getByTestId("search-input")).not.toBeInTheDocument()
  );
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
    features: {
      search: true,
    },
  });

  render(<Index />);

  await vi.waitFor(() =>
    expect(page.getByTestId("search-input")).toBeInTheDocument()
  );
  expect(
    page.getByText(
      /You are currently tracking 2 shows with 7 unwatched episodes/
    )
  ).toBeInTheDocument();
  expect(
    page.getByText(/You have not added any shows yet./)
  ).not.toBeInTheDocument();
});
