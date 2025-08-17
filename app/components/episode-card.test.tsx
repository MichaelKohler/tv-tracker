import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EpisodeCard from "./episode-card";
import { testEpisode, testShow } from "~/test-utils";

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
    ...testEpisode,
    summary: "a &lt; b",
    show: testShow,
  };

  render(<EpisodeCard episode={episode} />);

  expect(screen.getByText("a &lt; b")).toBeInTheDocument();
});
