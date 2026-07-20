import { describe, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import Spinner from "./spinner";
import { VisualTestContainer } from "./visual-test-helper";

describe("Spinner", () => {
  it("renders spinner", async () => {
    await render(
      <VisualTestContainer testid="spinner-container">
        <Spinner />
      </VisualTestContainer>
    );

    await expect.element(page.getByTestId("spinner")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("spinner-container");
    await expect.element(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("spinner");
  });
});
