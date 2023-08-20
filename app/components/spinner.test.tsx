import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import Spinner from "./spinner";

test("renders spinner", async () => {
  render(<Spinner />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
});
