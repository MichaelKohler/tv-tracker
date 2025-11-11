import { createMemoryRouter, RouterProvider } from "react-router";
import type { Episode, Show } from "@prisma/client";

import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import * as flags from "../flags.server";
import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import TVRecent, { loader } from "./tv.recent";

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
    episodes: Record<string, { episodes: (Episode & { show: Show })[] }>;
  }) => (
    <div>
      {Object.values(episodes).map((month) => (
        <div key={month.episodes[0].id}>{month.episodes[0].name}</div>
      ))}
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

const mockEpisodes: (Episode & { show: Show; date: Date })[] = [
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
    date: MOCK_DATE,
  },
];

const renderComponent = (loaderFn: typeof loader) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <TVRecent />,
        loader: loaderFn,
        ErrorBoundary: () => <div>Error</div>,
        HydrateFallback: () => <div>Loading...</div>,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
};

describe("TVRecent", () => {
  beforeEach(() => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(true);
    vi.mocked(getRecentlyWatchedEpisodes).mockResolvedValue(mockEpisodes);
  });

  it("renders recently watched page with episodes", async () => {
    renderComponent(loader);

    expect(page.getByText("Recently watched")).toBeInTheDocument();
    expect(page.getByText("Test Episode 1")).toBeInTheDocument();
  });

  it('renders "no recently watched episodes" message when there are no episodes', async () => {
    vi.mocked(getRecentlyWatchedEpisodes).mockResolvedValue([]);

    renderComponent(loader);

    expect(
      page.getByText("There are no recently watched episodes.")
    ).toBeInTheDocument();
  });

  it("renders unavailable message when feature is disabled", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);

    renderComponent(loader);

    expect(
      page.getByText(
        "The overview of recently watched episodes is currently unavailable. Please try again later."
      )
    ).toBeInTheDocument();
  });

  describe("loader", () => {
    it("should return recently watched episodes when feature is enabled", async () => {
      const result = await loader({
        request: new Request("http://localhost:8080/tv/recent"),
        context: {},
        params: {},
      });

      const month = MOCK_DATE.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      expect(result.features.recentlyWatchedRoute).toBe(true);
      expect(Object.keys(result.episodes).length).toBe(1);
      expect(result.episodes[month].episodes[0].name).toBe("Test Episode 1");
    });

    it("should return empty episodes when feature is disabled", async () => {
      vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);

      const result = await loader({
        request: new Request("http://localhost:8080/tv/recent"),
        context: {},
        params: {},
      });

      expect(result.features.recentlyWatchedRoute).toBe(false);
      expect(Object.keys(result.episodes).length).toBe(0);
    });
  });
});
