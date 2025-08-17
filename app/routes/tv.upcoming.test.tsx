import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router";

import * as flags from "../flags.server";
import { getUpcomingEpisodes } from "../models/episode.server";
import TVUpcoming, { loader } from "./tv.upcoming";

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
      {Object.values(episodes).map((month: any) =>
        month.map((episode: any) => (
          <div key={episode.id}>{episode.name}</div>
        ))
      )}
    </div>
  ),
}));

const mockEpisodes = [
  {
    id: "1",
    airDate: new Date(),
    name: "Test Episode 1",
  },
];

const renderComponent = (loaderFn: typeof loader) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <TVUpcoming />,
        loader: loaderFn,
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
    await waitFor(() => {
      expect(screen.getByText("Upcoming")).toBeInTheDocument();
      expect(screen.getByText("Test Episode 1")).toBeInTheDocument();
    });
  });

  it('renders "no upcoming episodes" message when there are no episodes', async () => {
    vi.mocked(getUpcomingEpisodes).mockResolvedValue([]);
    renderComponent(loader);
    await waitFor(() => {
      expect(
        screen.getByText("There are no upcoming episodes.")
      ).toBeInTheDocument();
    });
  });

  it("renders unavailable message when feature is disabled", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);
    renderComponent(loader);
    await waitFor(() => {
      expect(
        screen.getByText(
          "The overview of upcoming episodes is currently unavailable. Please try again later."
        )
      ).toBeInTheDocument();
    });
  });

  describe("loader", () => {
    it("should return upcoming episodes when feature is enabled", async () => {
      const result = await loader({
        request: new Request("http://localhost:8080/tv/upcoming"),
        context: {},
        params: {},
      });

      const month = new Date().toLocaleString("default", {
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
