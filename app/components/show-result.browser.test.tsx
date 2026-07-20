import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { useNavigation } from "react-router";

import ShowResult from "./show-result";
import { VisualTestContainer } from "./visual-test-helper";
import { testSearchShow } from "../test-utils";

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

    // @ts-expect-error .. we don't need to specify all of it
    vi.mocked(useNavigation).mockReturnValue({
      formData: new FormData(),
    });
  });

  it("renders show result", async () => {
    await render(
      <VisualTestContainer testid="show-result">
        <ShowResult show={show} features={{ addShow: true }} />
      </VisualTestContainer>
    );

    await expect.element(
      page.getByText(show.name, { exact: true })
    ).toBeInTheDocument();
    await expect.element(page.getByText(show.summary)).toBeInTheDocument();
    await expect.element(
      page.getByText(new Date(show.premiered).toLocaleDateString())
    ).toBeInTheDocument();
    await expect.element(page.getByText("8.5")).toBeInTheDocument();
    await expect.element(page.getByText("Add Show")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("show-result");
    await expect.element(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-result");
  });

  it("does not render add show button with feature disabled", async () => {
    await render(<ShowResult show={show} features={{ addShow: false }} />);

    await expect.element(
      page.getByText(show.name, { exact: true })
    ).toBeInTheDocument();
    await expect.element(page.getByText("Add Show")).not.toBeInTheDocument();
  });

  it("renders spinner on adding show", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "add-show";
          }

          if (key === "showId") {
            return show.mazeId.toString();
          }

          return "";
        },
      },
    });

    await render(<ShowResult show={show} features={{ addShow: true }} />);

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
    await expect.element(page.getByText(/Add Show/)).not.toBeInTheDocument();
  });

  it("does not render spinner or button on adding another show", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "add-show";
          }

          if (key === "showId") {
            return "not-this-show";
          }

          return "";
        },
      },
    });

    await render(<ShowResult show={show} features={{ addShow: true }} />);

    await expect.element(page.getByTestId("spinner")).not.toBeInTheDocument();
    await expect.element(page.getByText(/Add Show/)).not.toBeInTheDocument();
  });

  it("does not render spinner on other action", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "some-other-intent";
          }

          if (key === "showId") {
            return show.mazeId.toString();
          }

          return "";
        },
      },
    });

    await render(<ShowResult show={show} features={{ addShow: true }} />);

    await expect.element(page.getByTestId("spinner")).not.toBeInTheDocument();
    await expect.element(page.getByText(/Add Show/)).toBeInTheDocument();
  });
});
