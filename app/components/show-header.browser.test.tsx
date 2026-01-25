import type { Episode, Show } from "@prisma/client";
import * as React from "react";
import { useNavigation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testEpisode, testEpisode2, testShow } from "../test-utils";
import ShowHeader from "./show-header";
import { VisualTestContainer } from "./visual-test-helper";

const DEFAULT_EPISODES = [
  { ...testEpisode, airDate: new Date("2000-01-01") },
  { ...testEpisode2, airDate: new Date("2000-01-01") },
];

const show: Show & { archived: boolean; episodes: Episode[] } = {
  ...testShow,
  archived: false,
  episodes: DEFAULT_EPISODES,
};

const showWithoutEpisodes: Show & { archived: boolean; episodes: Episode[] } = {
  ...testShow,
  archived: false,
  episodes: [],
};

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

describe("ShowHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // @ts-expect-error .. we don't need to specify all of it..
    vi.mocked(useNavigation).mockReturnValue({
      formData: new FormData(),
    });
  });

  it("renders show header", async () => {
    render(
      <VisualTestContainer testid="show-header">
        <ShowHeader
          show={show}
          watchedEpisodes={[]}
          features={{ markAllAsWatched: true, archive: true }}
        />
      </VisualTestContainer>
    );

    expect(page.getByText(/Watched 0 of 2 aired episodes/)).toBeInTheDocument();
    expect(page.getByRole("heading", { name: show.name })).toBeInTheDocument();
    expect(page.getByText(show.summary)).toBeInTheDocument();
    expect(
      page.getByText(new Date(show.premiered).toLocaleDateString())
    ).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("show-header");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-header");
    expect(page.getByText("8.5")).toBeInTheDocument();
    expect(
      page.getByText("Mark all aired episodes as watched")
    ).toBeInTheDocument();
    expect(page.getByText("Remove show")).toBeInTheDocument();
  });

  it("renders watch count correctly", async () => {
    render(
      <ShowHeader
        show={show}
        watchedEpisodes={["1"]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByText(/Watched 1 of 2 aired episodes/)).toBeInTheDocument();
  });

  it("does not render mark all button if no episodes", async () => {
    render(
      <ShowHeader
        show={showWithoutEpisodes}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(
      page.getByText("Mark all aired episodes as watched")
    ).not.toBeInTheDocument();
  });

  it("does not render mark all button if all watched", async () => {
    render(
      <ShowHeader
        show={show}
        watchedEpisodes={["1", "2"]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(
      page.getByText("Mark all aired episodes as watched")
    ).not.toBeInTheDocument();
  });

  it("renders archive button if not archived", async () => {
    const notArchivedShow = {
      ...show,
      archived: false,
    };

    render(
      <ShowHeader
        show={notArchivedShow}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByText("Archive")).toBeInTheDocument();
  });

  it("renders unarchive button if not archived", async () => {
    const archivedShow = {
      ...show,
      archived: true,
    };

    render(
      <ShowHeader
        show={archivedShow}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByText("UnArchive")).toBeInTheDocument();
  });

  it("renders spinner on mark all watched", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "MARK_ALL_WATCHED";
          }

          return "";
        },
      },
    });

    render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByTestId("spinner")).toBeInTheDocument();
    expect(
      page.getByText(/Mark all aired episodes as watched/)
    ).not.toBeInTheDocument();
    expect(page.getByText(/Remove show/)).toBeInTheDocument();
  });

  it("renders spinner on remove show", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "DELETE_SHOW";
          }

          return "";
        },
      },
    });

    render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByTestId("spinner")).toBeInTheDocument();
    expect(
      page.getByText(/Mark all aired episodes as watched/)
    ).toBeInTheDocument();
    expect(page.getByText(/Remove show/)).not.toBeInTheDocument();
  });

  it("renders spinner on archiving", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "ARCHIVE";
          }

          return "";
        },
      },
    });

    render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByTestId("spinner")).toBeInTheDocument();
    expect(page.getByText(/Archive/)).not.toBeInTheDocument();
  });

  it("renders spinner on unarchiving", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "UNARCHIVE";
          }

          return "";
        },
      },
    });

    render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    expect(page.getByTestId("spinner")).toBeInTheDocument();
    expect(page.getByText(/UnArchive/)).not.toBeInTheDocument();
  });
});
