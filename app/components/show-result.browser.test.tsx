import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { useNavigation } from "react-router";

import {
  createFormData,
  createSubmittingNavigation,
  testSearchShow,
} from "../test-utils";
import ShowResult from "./show-result";
import { VisualTestContainer } from "./visual-test-helper";

const show = testSearchShow;

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => unknown>(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

describe("ShowResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigation).mockReturnValue(
      createSubmittingNavigation(new FormData())
    );
  });

  it("renders show result", async () => {
    await render(
      <VisualTestContainer testid="show-result">
        <ShowResult show={show} features={{ addShow: true }} />
      </VisualTestContainer>
    );

    await expect
      .element(page.getByText(show.name, { exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText(show.summary)).toBeInTheDocument();

    const premieredDate = new Date("2022-01-01").toLocaleDateString();
    await expect
      .element(page.getByText(new RegExp(`Started:.*${premieredDate}`)))
      .toBeInTheDocument();
    await expect.element(page.getByText(/Rating:.*8\.5/)).toBeInTheDocument();
    await expect.element(page.getByText("Add Show")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("show-result");
    await expect.element(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-result");
  });

  it("does not render a start date for a show without a premiere", async () => {
    await render(
      <ShowResult
        show={{ ...show, premiered: null }}
        features={{ addShow: true }}
      />
    );

    await expect
      .element(page.getByText(show.name, { exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText("Started:")).not.toBeInTheDocument();
    await expect
      .element(page.getByText("Invalid Date"))
      .not.toBeInTheDocument();
  });

  it("does not render add show button with feature disabled", async () => {
    await render(<ShowResult show={show} features={{ addShow: false }} />);

    await expect
      .element(page.getByText(show.name, { exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText("Add Show")).not.toBeInTheDocument();
  });

  it("renders spinner on adding show", async () => {
    vi.mocked(useNavigation).mockReturnValue(
      createSubmittingNavigation(
        createFormData({ intent: "add-show", showId: show.mazeId.toString() })
      )
    );

    await render(<ShowResult show={show} features={{ addShow: true }} />);

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
    await expect.element(page.getByText(/Add Show/)).not.toBeInTheDocument();
  });

  it("does not render spinner or button on adding another show", async () => {
    vi.mocked(useNavigation).mockReturnValue(
      createSubmittingNavigation(
        createFormData({ intent: "add-show", showId: "not-this-show" })
      )
    );

    await render(<ShowResult show={show} features={{ addShow: true }} />);

    await expect.element(page.getByTestId("spinner")).not.toBeInTheDocument();
    await expect.element(page.getByText(/Add Show/)).not.toBeInTheDocument();
  });

  it("does not render spinner on other action", async () => {
    vi.mocked(useNavigation).mockReturnValue(
      createSubmittingNavigation(
        createFormData({
          intent: "some-other-intent",
          showId: show.mazeId.toString(),
        })
      )
    );

    await render(<ShowResult show={show} features={{ addShow: true }} />);

    await expect.element(page.getByTestId("spinner")).not.toBeInTheDocument();
    await expect.element(page.getByText(/Add Show/)).toBeInTheDocument();
  });
});
