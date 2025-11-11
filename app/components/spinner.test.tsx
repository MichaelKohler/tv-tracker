import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import Spinner from "./spinner";

test("renders spinner", async () => {
  render(<Spinner />);

  expect(page.getByTestId("spinner")).toBeInTheDocument();
});
