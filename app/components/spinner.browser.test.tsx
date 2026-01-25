import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import Spinner from "./spinner";
import { VisualTestContainer } from "./visual-test-helper";

describe("Spinner", () => {
  it("renders spinner", async () => {
    render(
      <VisualTestContainer testid="spinner-container">
        <Spinner />
      </VisualTestContainer>
    );

    expect(page.getByTestId("spinner")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("spinner-container");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("spinner");
  });
});
