import type { Episode, Show } from "@prisma/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import * as flags from "../flags.server";
import { getUpcomingEpisodes } from "../models/episode.server";
import TVUpcoming, { loader } from "./tv.upcoming";

vi.mock("../flags.server", async () => {
  const actual = await vi.importActual("../flags.server");

  return {
    ...actual,
    evaluateBoolean: vi.fn(),
  };
});
vi.mock("../db.server");
vi.mock("../models/episode.server");
vi.mock("../session.server", async () => {
  return {
    requireUserId: vi.fn().mockResolvedValue("123"),
  };
});

vi.mock("../components/upcoming-episodes-list", () => ({
  default: ({
    episodes,
  }: {
    episodes: Record<string, (Episode & { show: Show })[]>;
  }) => (
    <div>
      {Object.values(episodes).map((month) =>
        month.map((episode) => <div key={episode.id}>{episode.name}</div>)
      )}
    </div>
  ),
}));

const MOCK_DATE = new Date("2024-01-01");

const mockShow: Show = {
  id: "1",
  name: "Test Show",
  mazeId: "1",
  premiered: MOCK_DATE,
  ended: null,
  imageUrl: "",
  summary: "",
  rating: null,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
};

const mockEpisodes: (Episode & { show: Show })[] = [
  {
    id: "1",
    name: "Test Episode 1",
    season: 1,
    number: 1,
    airDate: MOCK_DATE,
    runtime: 60,
    imageUrl: "",
    summary: "",
    showId: "1",
    mazeId: "1",
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    show: mockShow,
  },
];

const renderComponent = (loaderFn: typeof loader) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <TVUpcoming />,
        loader: loaderFn,
        ErrorBoundary: () => <div>Error</div>,
        HydrateFallback: () => <div>Loading...</div>,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
};

describe("TVUpcoming", () => {
  beforeEach(() => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(true);
    vi.mocked(getUpcomingEpisodes).mockResolvedValue(mockEpisodes);
  });

  it("renders upcoming page", async () => {
    renderComponent(loader);

    expect(page.getByText("Upcoming")).toBeInTheDocument();
    expect(page.getByText("Test Episode 1")).toBeInTheDocument();
  });

  it('renders "no upcoming episodes" message when there are no episodes', async () => {
    vi.mocked(getUpcomingEpisodes).mockResolvedValue([]);

    renderComponent(loader);

    expect(
      page.getByText("There are no upcoming episodes.")
    ).toBeInTheDocument();
  });

  it("renders unavailable message when feature is disabled", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);

    renderComponent(loader);

    expect(
      page.getByText(
        "The overview of upcoming episodes is currently unavailable. Please try again later."
      )
    ).toBeInTheDocument();
  });

  describe("loader", () => {
    it("should return upcoming episodes when feature is enabled", async () => {
      const result = await loader({
        request: new Request("http://localhost:8080/tv/upcoming"),
        context: {},
        params: {},
      });

      const month = MOCK_DATE.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      expect(result.features.upcomingRoute).toBe(true);
      expect(Object.keys(result.episodes).length).toBe(1);
      expect(result.episodes[month][0].name).toBe("Test Episode 1");
    });

    it("should return empty episodes when feature is disabled", async () => {
      vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);

      const result = await loader({
        request: new Request("http://localhost:8080/tv/upcoming"),
        context: {},
        params: {},
      });

      expect(result.features.upcomingRoute).toBe(false);
      expect(Object.keys(result.episodes).length).toBe(0);
    });
  });
});
