import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import ErrorAlert from "./error-alert";
import { VisualTestContainer } from "./visual-test-helper";

describe("ErrorAlert", () => {
  it("renders error alert", async () => {
    const title = "Example Title";
    const message = "Example Message";

    render(
      <VisualTestContainer testid="error-alert">
        <ErrorAlert title={title} message={message} />
      </VisualTestContainer>
    );

    expect(page.getByText(title)).toBeInTheDocument();
    expect(page.getByText(message)).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("error-alert");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("error-alert");
  });
});
