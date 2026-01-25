import * as React from "react";
import { useNavigation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testEpisode, testEpisode2, upcomingEpisode } from "../test-utils";
import EpisodeList from "./episode-list";
import { VisualTestContainer } from "./visual-test-helper";

const DEFAULT_EPISODES = [testEpisode, testEpisode2];

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

describe("EpisodeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders episodes", async () => {
    render(
      <VisualTestContainer testid="episode-list">
        <EpisodeList
          episodes={[...DEFAULT_EPISODES, upcomingEpisode]}
          watchedEpisodes={[]}
          ignoredEpisodes={[]}
          showId="1"
        />
      </VisualTestContainer>
    );

    expect(page.getByText(DEFAULT_EPISODES[0].name)).toBeInTheDocument();
    expect(page.getByText(/S01E01/)).toBeInTheDocument();

    expect(page.getByText(DEFAULT_EPISODES[1].name)).toBeInTheDocument();
    expect(page.getByText(/S01E02/)).toBeInTheDocument();

    expect(page.getByText("Mark as watched").length).toBe(2); // 3rd episode is upcoming
    expect(page.getByText("Ignore", { exact: true }).length).toBe(3);

    await document.fonts.ready;

    const element = page.getByTestId("episode-list");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("episode-list");
  });

  it("renders unwatched button if watched", async () => {
    render(
      <EpisodeList
        episodes={[DEFAULT_EPISODES[0]]}
        watchedEpisodes={["1"]}
        ignoredEpisodes={[]}
        showId="1"
      />
    );

    expect(page.getByText("Mark as not watched")).toBeInTheDocument();
    expect(page.getByText("Ignore", { exact: true })).not.toBeInTheDocument();
  });

  it("renders spinner while submitting mark as read", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "episodeId") {
            return "1";
          }

          return "";
        },
      },
    });
    render(
      <EpisodeList
        episodes={[DEFAULT_EPISODES[0]]}
        watchedEpisodes={[]}
        ignoredEpisodes={[]}
        showId="1"
      />
    );

    expect(page.getByText(DEFAULT_EPISODES[0].name)).toBeInTheDocument();
    expect(page.getByTestId("spinner")).toBeInTheDocument();
    expect(page.getByText("Mark as watched")).not.toBeInTheDocument();
  });

  it("does not render spinner while submitting mark as read for another episode", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "episodeId") {
            return "2";
          }

          return "";
        },
      },
    });
    render(
      <EpisodeList
        episodes={[DEFAULT_EPISODES[0]]}
        watchedEpisodes={[]}
        ignoredEpisodes={[]}
        showId="1"
      />
    );

    expect(page.getByTestId("spinner")).not.toBeInTheDocument();
    expect(page.getByText("Mark as watched")).toBeInTheDocument();
  });

  it("renders ignored episode with unignore button", async () => {
    render(
      <EpisodeList
        episodes={[DEFAULT_EPISODES[0]]}
        watchedEpisodes={[]}
        ignoredEpisodes={["1"]}
        showId="1"
      />
    );

    expect(page.getByText("Unignore")).toBeInTheDocument();
    expect(page.getByText("Mark as watched")).not.toBeInTheDocument();
    expect(page.getByText("Ignore", { exact: true })).not.toBeInTheDocument();
  });

  it("renders ignored episode with grayscale styling", async () => {
    render(
      <EpisodeList
        episodes={[DEFAULT_EPISODES[0]]}
        watchedEpisodes={[]}
        ignoredEpisodes={["1"]}
        showId="1"
      />
    );

    const img = page.getByAltText("");
    expect(img).toHaveClass("grayscale");
  });

  it("renders unignore button if ignored", async () => {
    render(
      <EpisodeList
        episodes={[DEFAULT_EPISODES[0]]}
        watchedEpisodes={[]}
        ignoredEpisodes={["1"]}
        showId="1"
      />
    );

    expect(page.getByText("Unignore")).toBeInTheDocument();
    expect(page.getByText("Mark as watched")).not.toBeInTheDocument();
    expect(page.getByText("Ignore", { exact: true })).not.toBeInTheDocument();
  });
});
