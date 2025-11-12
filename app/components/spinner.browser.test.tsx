import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import Spinner from "./spinner";

describe("Spinner", () => {
  it("renders spinner", async () => {
    render(<Spinner />);

    expect(page.getByTestId("spinner")).toBeInTheDocument();
  });
});
