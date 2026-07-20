import { describe, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import Footer from "./footer";
import { VisualTestContainer } from "./visual-test-helper";

describe("Footer", () => {
  it("renders footer", async () => {
    await render(
      <VisualTestContainer testid="footer">
        <Footer />
      </VisualTestContainer>
    );

    await expect.element(page.getByText("Open Source")).toBeInTheDocument();
    await expect.element(page.getByText(/Michael Kohler/)).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("footer");
    await expect.element(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("footer");
  });
});
