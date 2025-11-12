import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import ErrorAlert from "./error-alert";

describe("ErrorAlert", () => {
  it("renders error alert", async () => {
    const title = "Example Title";
    const message = "Example Message";

    render(<ErrorAlert title={title} message={message} />);

    expect(page.getByText(title)).toBeInTheDocument();
    expect(page.getByText(message)).toBeInTheDocument();
  });
});
