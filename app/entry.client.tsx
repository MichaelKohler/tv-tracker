import * as Sentry from "@sentry/react";
import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

Sentry.init({
  dsn: "https://98ad87a579a9e49c9c38b1207b520ff2@o4507469276512256.ingest.de.sentry.io/4507469276905552",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.httpClientIntegration(),
    Sentry.replayIntegration(),
  ],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});
