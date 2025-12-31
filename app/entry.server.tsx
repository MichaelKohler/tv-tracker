import "./instrumentation.server";

import { createReadableStreamFromReadable } from "@react-router/node";
import * as Sentry from "@sentry/react-router";

import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";

import { runWithRequestContext } from "./request-context.server";

export const streamTimeout = 5_000;

const baseSentryHandleRequest = Sentry.createSentryHandleRequest({
  ServerRouter,
  renderToPipeableStream,
  createReadableStreamFromReadable,
});

const handleRequest = (
  ...args: Parameters<typeof baseSentryHandleRequest>
): ReturnType<typeof baseSentryHandleRequest> => {
  return runWithRequestContext(args[0], () => baseSentryHandleRequest(...args));
};

export default handleRequest;

export const handleError = Sentry.createSentryHandleError({
  logErrors: false,
});
