import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EpisodeCard from "./episode-card";

test("renders episode card and decodes summary", () => {
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
    },
    date: new Date(),
  };

  render(<EpisodeCard episode={episode} />);

  expect(screen.getByText("a < b")).toBeInTheDocument();
});
