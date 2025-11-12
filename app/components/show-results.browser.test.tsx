import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testShow } from "../test-utils";
import ShowResults from "./show-results";

const shows = [
  testShow,
  { ...testShow, id: "2", mazeId: "2", name: "Test Show 2" },
];

vi.mock("./show-result", async () => ({
  ...(await vi.importActual("./show-result")),
  default: () => <p>ShowResult</p>,
}));

describe("ShowResults", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders show results", async () => {
    render(<ShowResults shows={shows} isLoading={false} error={undefined} />);

    expect(page.getByText("tvmaze")).toBeInTheDocument();
    expect(page.getByText("ShowResult").length).toBe(2);
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
