import { json, redirect } from "@remix-run/node";
import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import React from "react";

import Footer from "./components/footer";
import Header from "./components/header";
import { getFlagsFromEnvironment } from "./models/config.server";
import tailwindStylesheetUrl from "./styles/tailwind.css?url";
import { getUser } from "./session.server";

export function headers(): ReturnType<HeadersFunction> {
  return {
    "Permissions-Policy":
      "accelerometer=(), ambient-light-sensor=(), battery=(), camera=(), microphone=(), geolocation=(), gyroscope=()",
    "Referrer-Policy": "no-referrer",
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
  const pathname = new URL(request.url).pathname;
  if (pathname !== "/maintenance") {
    const { MAINTENANCE_MODE_ENABLED } = getFlagsFromEnvironment();
    if (MAINTENANCE_MODE_ENABLED) {
      return redirect("/maintenance");
    }
  }

  return json({
    user: await getUser(request),
  });
}

function App({
  renderLoginButtons = true,
  children,
}: {
  children?: React.ReactNode;
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
        <Header renderLoginButtons={renderLoginButtons} />
        <Outlet />
        {children}
        <Footer />
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}

export default function DefaultApp() {
  return <App />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <App>
        <main className="flex h-full min-h-screen justify-center bg-white">
          <h1 className="mt-10 font-title text-3xl">Page not found</h1>
        </main>
      </App>
    );
  }

  return (
    <App renderLoginButtons={false}>
      <main className="flex h-full min-h-screen justify-center bg-white">
        <h1 className="mt-10 font-title text-3xl">
          Something went wrong. Please try again.
        </h1>
      </main>
    </App>
  );
}
