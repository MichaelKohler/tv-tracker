import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowResults from "./show-results";

vi.mock("./show-result", () => ({
  __esModule: true,
  default: () => <div data-testid="show-result"></div>,
}));

const shows = [
  { id: "1", name: "Show 1", mazeId: 1 },
  { id: "2", name: "Show 2", mazeId: 2 },
];

test("renders the component with add show enabled", () => {
  render(<ShowResults shows={shows} features={{ addShow: true }} />);
  expect(screen.getAllByTestId("show-result")).toHaveLength(2);
});