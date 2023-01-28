import { redirect } from "@remix-run/node";
import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
} from "@remix-run/react";
import React from "react";

import Footer from "./components/footer";
import Header from "./components/header";
import { getFlagsFromEnvironment } from "./models/config.server";
import tailwindStylesheetUrl from "./styles/tailwind.css";
import { getUser } from "./session.server";

export function links(): ReturnType<LinksFunction> {
  return [{ rel: "stylesheet", href: tailwindStylesheetUrl }];
}

export function meta(): ReturnType<MetaFunction> {
  return {
    charset: "utf-8",
    title: "tv-tracker",
    viewport: "width=device-width,initial-scale=1",
  };
}

export async function loader({ request }: LoaderArgs) {
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
        <LiveReload />
      </body>
    </html>
  );
}

export default function DefaultApp() {
  return <App />;
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <App>
        <main className="flex h-full min-h-screen justify-center bg-white">
          <h1 className="mt-10 font-title text-3xl">Page not found</h1>
        </main>
      </App>
    );
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary() {
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
