import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ErrorAlert from "./error-alert";

test("renders error alert", async () => {
  const title = "Example Title";
  const message = "Example Message";

  render(<ErrorAlert title={title} message={message} />);

  expect(screen.getByText(title)).toBeInTheDocument();
  expect(screen.getByText(message)).toBeInTheDocument();
});
