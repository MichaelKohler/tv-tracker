import * as React from "react";
import { useNavigation } from "react-router";

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import ShowTile, { type Props } from "./show-tile";
import { VisualTestContainer } from "./visual-test-helper";
import { testShow } from "../test-utils";

const show: Props["show"] = {
  ...testShow,
  unwatchedEpisodesCount: 1,
};

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => unknown>(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("ShowTile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders show tile", async () => {
    await render(
      <VisualTestContainer testid="show-tile">
        <ShowTile show={show} />
      </VisualTestContainer>
    );

    expect(page.getByText("1")).toBeInTheDocument();
    expect(page.getByText(show.name)).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("show-tile");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-tile");
  });

  it("does not render navigation spinner on different tile", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      state: "loading",
      // @ts-expect-error (we don't need to specify all properties)
      location: { pathname: `/tv/not-this-show` },
    });

    await render(<ShowTile show={show} />);

    expect(page.getByTestId("spinner")).not.toBeInTheDocument();
  });
});
