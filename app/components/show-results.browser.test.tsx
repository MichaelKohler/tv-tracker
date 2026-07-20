import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import ShowResults from "./show-results";
import { VisualTestContainer } from "./visual-test-helper";
import { testSearchShow } from "../test-utils";

const shows = [
  testSearchShow,
  { ...testSearchShow, mazeId: 2, name: "Test Show 2" },
];

vi.mock("./show-result", async () => ({
  ...(await vi.importActual("./show-result")),
  default: () => <p>ShowResult</p>,
}));

describe("ShowResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders show results", async () => {
    await render(
      <VisualTestContainer testid="show-results">
        <ShowResults shows={shows} isLoading={false} error={undefined} />
      </VisualTestContainer>
    );

    await expect.element(page.getByText("tvmaze")).toBeInTheDocument();
    expect(page.getByText("ShowResult").length).toBe(2);

    await document.fonts.ready;

    const element = page.getByTestId("show-results");
    await expect.element(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-results");
  });

  it("renders spinner while loading results", async () => {
    await render(<ShowResults shows={[]} isLoading={true} error={undefined} />);

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders no shows found message", async () => {
    await render(
      <ShowResults shows={[]} isLoading={false} error={undefined} />
    );

    await expect.element(page.getByText(/No shows found/)).toBeInTheDocument();
  });

  it("renders error message", async () => {
    await render(
      <ShowResults shows={[]} isLoading={false} error="ADDING_SHOW_FAILED" />
    );

    await expect.element(page.getByText(/Adding show failed/)).toBeInTheDocument();
    await expect.element(
      page.getByText(/There was an error while adding the show/)
    ).toBeInTheDocument();
  });
});
