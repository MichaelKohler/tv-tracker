import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { testEpisode, testShow } from "../test-utils";
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

test("renders episode card", () => {
  const episode = {
    id: testEpisode.id,
    name: testEpisode.name,
    season: testEpisode.season,
    number: testEpisode.number,
    airDate: testEpisode.airDate,
    runtime: testEpisode.runtime,
    imageUrl: testEpisode.imageUrl,
    show: {
      id: testShow.id,
      name: testShow.name,
      imageUrl: testShow.imageUrl,
    },
  };

  render(<EpisodeCard episode={episode} />);

  expect(screen.getByText(testShow.name, { exact: false })).toBeInTheDocument();
  expect(screen.getByText("S01E01", { exact: false })).toBeInTheDocument();
});
