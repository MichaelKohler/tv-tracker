import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getShowsByUserId } from "../../models/show.server";
import Index, { loader } from "./index";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useNavigation: vi.fn().mockReturnValue({}),
      useLoaderData: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
  vi.mock("../../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mock("../../components/show-tiles", async () => {
    return {
      default: () => <p>ShowTiles</p>,
    };
  });

  vi.mock("../../models/show.server", async () => {
    return {
      getShowsByUserId: vi.fn().mockResolvedValue([]),
    };
  });

  vi.mocked(useLoaderData<typeof loader>).mockReturnValue([]);
});

test("renders page without shows", () => {
  render(<Index />);

  expect(screen.getByTestId("search-input")).toBeDefined();
  expect(
    screen.getByText(
      /You are currently tracking 0 shows with 0 unwatched episodes/
    )
  ).toBeDefined();
  expect(screen.getByText(/You have not added any shows yet./)).toBeDefined();
});

test("renders page with shows", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue([
    // @ts-expect-error .. we do not need to define the full show info for this..
    {
      unwatchedEpisodesCount: 3,
    },
    // @ts-expect-error .. we do not need to define the full show info for this..
    {
      unwatchedEpisodesCount: 4,
    },
  ]);

  render(<Index />);

  expect(screen.getByTestId("search-input")).toBeDefined();
  expect(
    screen.getByText(
      /You are currently tracking 2 shows with 7 unwatched episodes/
    )
  ).toBeDefined();
  expect(screen.queryByText(/You have not added any shows yet./)).toBeNull();
});

test("loader should sort shows", async () => {
  vi.mocked(getShowsByUserId).mockResolvedValue([
    // @ts-expect-error .. missing props but okay
    {
      name: "Blubb",
      unwatchedEpisodesCount: 0,
    },
    // @ts-expect-error .. missing props but okay
    {
      name: "Foo",
      unwatchedEpisodesCount: 8,
    },
    // @ts-expect-error .. missing props but okay
    {
      name: "Meh",
      unwatchedEpisodesCount: 7,
    },
    // @ts-expect-error .. missing props but okay
    {
      name: "AAA",
      unwatchedEpisodesCount: 0,
    },
    // @ts-expect-error .. missing props but okay
    {
      name: "Bla",
      unwatchedEpisodesCount: 0,
    },
  ]);

  const response = await loader({
    request: new Request("http://localhost:8080/tv"),
    context: {},
    params: {},
  });
  const result = await response.json();

  expect(result).toStrictEqual([
    {
      name: "Foo",
      unwatchedEpisodesCount: 8,
    },
    {
      name: "Meh",
      unwatchedEpisodesCount: 7,
    },
    {
      name: "AAA",
      unwatchedEpisodesCount: 0,
    },
    {
      name: "Bla",
      unwatchedEpisodesCount: 0,
    },
    {
      name: "Blubb",
      unwatchedEpisodesCount: 0,
    },
  ]);
});
