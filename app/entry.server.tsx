import "./instrumentation.server";

import { createReadableStreamFromReadable } from "@react-router/node";
import * as Sentry from "@sentry/react-router";

import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";

export const streamTimeout = 5_000;

const handleRequest = Sentry.createSentryHandleRequest({
  ServerRouter,
  renderToPipeableStream,
  createReadableStreamFromReadable,
});

export default handleRequest;

export const handleError = Sentry.createSentryHandleError({
  logErrors: false,
});
