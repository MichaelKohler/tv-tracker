import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router";

import * as flags from "../flags.server";
import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import TVRecent, { loader } from "./tv.recent";

vi.mock("../flags.server", async (importOriginal) => {
  const actual = await importOriginal<typeof flags>();
  return {
    ...actual,
    evaluateBoolean: vi.fn(),
  };
});
vi.mock("../models/episode.server");
vi.mock("../session.server", async () => {
  return {
    requireUserId: vi.fn().mockResolvedValue("123"),
  };
});
vi.mock("../components/upcoming-episodes-list", () => ({
  default: ({ episodes }: { episodes: any }) => (
    <div>
      {Object.values(episodes).map((month: any) => (
        <div key={month.episodes[0].id}>{month.episodes[0].name}</div>
      ))}
    </div>
  ),
}));

const MOCK_DATE = new Date("2024-01-01");

const mockEpisodes = [
  {
    id: "1",
    date: MOCK_DATE,
    name: "Test Episode 1",
    runtime: 90,
    show: { id: "1" },
  },
];

const renderComponent = (loaderFn: typeof loader) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <TVRecent />,
        loader: loaderFn,
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
    await waitFor(() => {
      expect(screen.getByText("Recently watched")).toBeInTheDocument();
      expect(screen.getByText("Test Episode 1")).toBeInTheDocument();
    });
  });

  it('renders "no recently watched episodes" message when there are no episodes', async () => {
    vi.mocked(getRecentlyWatchedEpisodes).mockResolvedValue([]);
    renderComponent(loader);
    await waitFor(() => {
      expect(
        screen.getByText("There are no recently watched episodes.")
      ).toBeInTheDocument();
    });
  });

  it("renders unavailable message when feature is disabled", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);
    renderComponent(loader);
    await waitFor(() => {
      expect(
        screen.getByText(
          "The overview of recently watched episodes is currently unavailable. Please try again later."
        )
      ).toBeInTheDocument();
    });
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
