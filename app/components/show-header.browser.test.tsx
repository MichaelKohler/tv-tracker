import * as React from "react";
import type { Episode, Show } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { useNavigation } from "react-router";

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
  useNavigation: vi.fn<() => unknown>(),
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
    await render(
      <VisualTestContainer testid="show-header">
        <ShowHeader
          show={show}
          watchedEpisodes={[]}
          features={{ markAllAsWatched: true, archive: true }}
        />
      </VisualTestContainer>
    );

    await expect.element(page.getByText(/Watched 0 of 2 aired episodes/)).toBeInTheDocument();
    await expect.element(page.getByRole("heading", { name: show.name })).toBeInTheDocument();
    await expect.element(page.getByText(show.summary)).toBeInTheDocument();
    await expect.element(
      page.getByText(new Date(show.premiered).toLocaleDateString())
    ).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("show-header");
    await expect.element(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-header");
    await expect.element(page.getByText("8.5")).toBeInTheDocument();
    await expect.element(
      page.getByText("Mark all aired episodes as watched")
    ).toBeInTheDocument();
    await expect.element(page.getByText("Remove show")).toBeInTheDocument();
  });

  it("renders watch count correctly", async () => {
    await render(
      <ShowHeader
        show={show}
        watchedEpisodes={["1"]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByText(/Watched 1 of 2 aired episodes/)).toBeInTheDocument();
  });

  it("does not render mark all button if no episodes", async () => {
    await render(
      <ShowHeader
        show={showWithoutEpisodes}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(
      page.getByText("Mark all aired episodes as watched")
    ).not.toBeInTheDocument();
  });

  it("does not render mark all button if all watched", async () => {
    await render(
      <ShowHeader
        show={show}
        watchedEpisodes={["1", "2"]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(
      page.getByText("Mark all aired episodes as watched")
    ).not.toBeInTheDocument();
  });

  it("renders archive button if not archived", async () => {
    const notArchivedShow = {
      ...show,
      archived: false,
    };

    await render(
      <ShowHeader
        show={notArchivedShow}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByText("Archive")).toBeInTheDocument();
  });

  it("renders unarchive button if not archived", async () => {
    const archivedShow = {
      ...show,
      archived: true,
    };

    await render(
      <ShowHeader
        show={archivedShow}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByText("UnArchive")).toBeInTheDocument();
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

    await render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
    const markAllButton = page.getByRole("button", {
      name: /Mark all aired episodes as watched/,
    });
    await expect.element(markAllButton).toBeDisabled();
    await expect.element(page.getByText(/Remove show/)).toBeInTheDocument();
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

    await render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
    await expect.element(
      page.getByText(/Mark all aired episodes as watched/)
    ).toBeInTheDocument();
    const deleteButton = page.getByRole("button", { name: /Remove show/ });
    await expect.element(deleteButton).toBeDisabled();
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

    await render(
      <ShowHeader
        show={show}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
    const archiveButton = page.getByRole("button", { name: "Archive" });
    await expect.element(archiveButton).toBeDisabled();
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

    const archivedShow = { ...show, archived: true };

    await render(
      <ShowHeader
        show={archivedShow}
        watchedEpisodes={[]}
        features={{ markAllAsWatched: true, archive: true }}
      />
    );

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
    const unarchiveButton = page.getByRole("button", { name: "Unarchive" });
    await expect.element(unarchiveButton).toBeDisabled();
  });
});
