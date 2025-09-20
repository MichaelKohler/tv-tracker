import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "https://98ad87a579a9e49c9c38b1207b520ff2@o4507469276512256.ingest.de.sentry.io/4507469276905552",
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: 1,
  integrations: [Sentry.prismaIntegration()],
});
