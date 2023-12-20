import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { getFlagsFromEnvironment } from "../models/config.server";
import { useOptionalUser } from "../utils";

export async function loader() {
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  return json({ environment: { SIGNUP_DISABLED } });
}

export default function Index() {
  const user = useOptionalUser();
  const data = useLoaderData<typeof loader>();

  return (
    <main className="flex w-full flex-col bg-white">
      <div className="flex min-h-screen w-full flex-col justify-center px-8 text-center text-white">
        <h1 className="bg-gradient-to-r from-cyan-100 to-blue-500 bg-clip-text font-title text-6xl text-transparent">
          What have you watched?
        </h1>
        {data.environment.SIGNUP_DISABLED && (
          <h2 className="mt-8 font-title text-3xl uppercase">Coming Soon!</h2>
        )}
        <p className="mt-9 text-2xl">Track your watched TV shows</p>
        {!user && (
          <div className="mt-9 flex flex-row justify-center space-x-4 lg:hidden">
            {!data.environment.SIGNUP_DISABLED && (
              <Link
                to="/join"
                className="text-white-100 flex items-center justify-center rounded bg-slate-600 py-2 px-4 font-medium hover:bg-slate-500 active:bg-yellow-500"
              >
                Sign up
              </Link>
            )}
            <Link
              to="/login"
              className="flex items-center justify-center rounded bg-slate-600 px-4 py-2 font-medium text-white hover:bg-slate-500 active:bg-slate-500"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
