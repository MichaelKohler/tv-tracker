import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowResults from "./show-results";
import { testShow } from "~/test-utils";

const shows = [
  testShow,
  { ...testShow, id: "2", mazeId: "2", name: "Test Show 2" },
];

beforeEach(() => {
  vi.mock("./show-result", async () => {
    return {
      default: () => <p>ShowResult</p>,
    };
  });
});

test("renders show results", async () => {
  render(<ShowResults shows={shows} isLoading={false} error={undefined} />);

  expect(screen.getByText("tvmaze")).toBeInTheDocument();
  expect(screen.getAllByText("ShowResult").length).toBe(2);
});

test("renders spinner while loading results", async () => {
  render(<ShowResults shows={[]} isLoading={true} error={undefined} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
});

test("renders no shows found message", async () => {
  render(<ShowResults shows={[]} isLoading={false} error={undefined} />);

  expect(screen.getByText(/No shows found/)).toBeInTheDocument();
});

test("renders error message", async () => {
  render(
    <ShowResults shows={[]} isLoading={false} error="ADDING_SHOW_FAILED" />
  );

  expect(screen.getByText(/Adding show failed/)).toBeInTheDocument();
  expect(
    screen.getByText(/There was an error while adding the show/)
  ).toBeInTheDocument();
});
