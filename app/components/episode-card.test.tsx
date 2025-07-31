import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EpisodeCard from "./episode-card";

beforeEach(() => {
  vi.mock("react-router", async () => {
    return {
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });
});

test("renders episode card and does not decode summary", () => {
  const episode = {
    id: "1",
    name: "Episode 1",
    season: 1,
    number: 1,
    airDate: new Date(),
    summary: "a &lt; b",
    imageUrl: "",
    show: {
      id: "1",
      name: "Show 1",
      imageUrl: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      premiered: new Date(),
      ended: null,
      rating: 1,
      mazeId: "1",
      summary: "summary",
    },
    date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    showId: "1",
    mazeId: "1",
    runtime: 30,
  };

  render(<EpisodeCard episode={episode} />);

  expect(screen.getByText("a &lt; b")).toBeInTheDocument();
});
