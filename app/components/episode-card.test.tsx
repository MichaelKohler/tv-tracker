import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testEpisode, testShow } from "../test-utils";
import EpisodeCard from "./episode-card";

beforeEach(() => {
  vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");

    return {
      ...actual,
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

  expect(page.getByText(testShow.name, { exact: false })).toBeInTheDocument();
  expect(page.getByText("S01E01", { exact: false })).toBeInTheDocument();
});
