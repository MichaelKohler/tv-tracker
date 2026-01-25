import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import Footer from "./footer";
import { VisualTestContainer } from "./visual-test-helper";

describe("Footer", () => {
  it("renders footer", async () => {
    render(
      <VisualTestContainer testid="footer">
        <Footer />
      </VisualTestContainer>
    );

    expect(page.getByText("Open Source")).toBeInTheDocument();
    expect(page.getByText(/Michael Kohler/)).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("footer");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("footer");
  });
});
