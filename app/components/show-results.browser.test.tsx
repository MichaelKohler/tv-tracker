import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testSearchShow } from "../test-utils";
import ShowResults from "./show-results";
import { VisualTestContainer } from "./visual-test-helper";

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
    render(
      <VisualTestContainer testid="show-results">
        <ShowResults shows={shows} isLoading={false} error={undefined} />
      </VisualTestContainer>
    );

    expect(page.getByText("tvmaze")).toBeInTheDocument();
    expect(page.getByText("ShowResult").length).toBe(2);

    await document.fonts.ready;

    const element = page.getByTestId("show-results");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-results");
  });

  it("renders spinner while loading results", async () => {
    render(<ShowResults shows={[]} isLoading={true} error={undefined} />);

    expect(page.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders no shows found message", async () => {
    render(<ShowResults shows={[]} isLoading={false} error={undefined} />);

    expect(page.getByText(/No shows found/)).toBeInTheDocument();
  });

  it("renders error message", async () => {
    render(
      <ShowResults shows={[]} isLoading={false} error="ADDING_SHOW_FAILED" />
    );

    expect(page.getByText(/Adding show failed/)).toBeInTheDocument();
    expect(
      page.getByText(/There was an error while adding the show/)
    ).toBeInTheDocument();
  });
});
