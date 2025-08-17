import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import React from "react";

import Footer from "./components/footer";
import Header from "./components/header";
import { evaluateBoolean, FLAGS } from "./flags.server";
import tailwindStylesheetUrl from "./styles/tailwind.css?url";
import { getUser } from "./session.server";

export function headers(): ReturnType<HeadersFunction> {
  return {
    "Permissions-Policy":
      "accelerometer=(), ambient-light-sensor=(), battery=(), camera=(), microphone=(), geolocation=(), gyroscope=()",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

export function links(): ReturnType<LinksFunction> {
  return [{ rel: "stylesheet", href: tailwindStylesheetUrl }];
}

export function meta(): ReturnType<MetaFunction> {
  return [
    {
      title: "tv-tracker",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const [
    maintenanceModeDisabled,
    upcomingRoute,
    recentlyWatchedRoute,
    statsRoute,
  ] = await Promise.all([
    evaluateBoolean(request, FLAGS.MAINTENANCE_MODE),
    evaluateBoolean(request, FLAGS.UPCOMING_ROUTE),
    evaluateBoolean(request, FLAGS.RECENTLY_WATCHED_ROUTE),
    evaluateBoolean(request, FLAGS.STATS_ROUTE),
  ]);

  return {
    user: await getUser(request),
    features: {
      maintenanceMode: !maintenanceModeDisabled,
      upcomingRoute,
      recentlyWatchedRoute,
      statsRoute,
    },
  };
}

function App({
  features,
  renderLoginButtons = true,
  children,
}: {
  children?: React.ReactNode;
  features: {
    maintenanceMode: boolean;
    upcomingRoute: boolean;
    recentlyWatchedRoute: boolean;
    statsRoute: boolean;
  };
  renderLoginButtons?: boolean;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Dosis:wght@700&family=Raleway&display=swap"
          rel="stylesheet"
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Header renderLoginButtons={renderLoginButtons} features={features} />
        {features.maintenanceMode ? (
          <main className="my-8 mx-auto flex min-h-full w-full max-w-md flex-col px-8">
            <h1 className="font-title text-3xl">Maintenance mode</h1>
            <p className="mt-4">
              We are currently working on some improvements. We will be back
              shortly!
            </p>
            <p className="mt-4">
              Any changes you may perform on data might not be persisted.
            </p>
          </main>
        ) : (
          <Outlet />
        )}
        {children}
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function DefaultApp() {
  const { features } = useLoaderData<typeof loader>();

  return <App features={features} />;
}

export default DefaultApp;

export function ErrorBoundary() {
  const { features } = useLoaderData<typeof loader>();
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <App features={features}>
        <main className="flex h-full min-h-screen justify-center bg-white">
          <h1 className="mt-10 font-title text-3xl">Page not found</h1>
        </main>
      </App>
    );
  }

  return (
    <App features={features} renderLoginButtons={false}>
      <main className="flex h-full min-h-screen justify-center bg-white">
        <h1 className="mt-10 font-title text-3xl">
          Something went wrong. Please try again.
        </h1>
      </main>
    </App>
  );
}
