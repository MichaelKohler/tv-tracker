import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router";

import * as flags from "../flags.server";
import * as episode from "../models/episode.server";
import * as show from "../models/show.server";
import TVStats, { loader } from "./tv.stats";

vi.mock("../flags.server", async (importOriginal) => {
  const actual = await importOriginal<typeof flags>();
  return {
    ...actual,
    evaluateBoolean: vi.fn(),
  };
});
vi.mock("../models/episode.server");
vi.mock("../models/show.server");
vi.mock("../session.server", async () => {
  return {
    requireUserId: vi.fn().mockResolvedValue("123"),
  };
});
vi.mock("../components/stat-card", () => ({
  default: ({ title, value }: { title: string; value: any }) => (
    <div>
      <div>{title}</div>
      <div>{value}</div>
    </div>
  ),
}));
vi.mock("../components/monthly-episodes-chart", () => ({
  default: () => <div>Chart</div>,
}));

const renderComponent = (loaderFn: typeof loader) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <TVStats />,
        loader: loaderFn,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
};

describe("TVStats", () => {
  beforeEach(() => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(true);
    vi.mocked(episode.getTotalWatchTimeForUser).mockResolvedValue(150);
    vi.mocked(episode.getWatchedEpisodesCountForUser).mockResolvedValue(25);
    vi.mocked(episode.getUnwatchedEpisodesCountForUser).mockResolvedValue(5);
    vi.mocked(episode.getLast12MonthsStats).mockResolvedValue([]);
    vi.mocked(show.getShowsTrackedByUser).mockResolvedValue(10);
    vi.mocked(show.getArchivedShowsCountForUser).mockResolvedValue(2);
  });

  it("renders statistics page with data", async () => {
    renderComponent(loader);
    await waitFor(() => {
      expect(screen.getByText("Statistics")).toBeInTheDocument();
      expect(screen.getByText("Total Watch Time")).toBeInTheDocument();
      expect(screen.getByText("2h 30m")).toBeInTheDocument();
    });
  });

  it("renders unavailable message when feature is disabled", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);
    renderComponent(loader);
    await waitFor(() => {
      expect(
        screen.getByText(
          "The statistics are currently unavailable. Please try again later."
        )
      ).toBeInTheDocument();
    });
  });

  describe("loader", () => {
    it("should return stats when feature is enabled", async () => {
      const result = await loader({
        request: new Request("http://localhost:8080/tv/stats"),
        context: {},
        params: {},
      });

      expect(result.features.statsRoute).toBe(true);
      expect(result.totalWatchTime).toBe(150);
    });

    it("should return nothing when feature is disabled", async () => {
      vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);

      const result = await loader({
        request: new Request("http://localhost:8080/tv/stats"),
        context: {},
        params: {},
      });

      expect(result.features.statsRoute).toBe(false);
      expect(result.totalWatchTime).toBeUndefined();
    });
  });
});
