import {
  ArrowRightIcon,
  ChartBarIcon,
  EyeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Link, useLoaderData } from "react-router";

import { getFlagsFromEnvironment } from "../models/config.server";
import { useOptionalUser } from "../utils";

export async function loader() {
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  return { environment: { SIGNUP_DISABLED } };
}

export default function Index() {
  const user = useOptionalUser();
  const data = useLoaderData<typeof loader>();

  const features = [
    {
      name: "Track your progress",
      description: "Keep a record of every episode you've watched.",
      icon: EyeIcon,
    },
    {
      name: "Discover new shows",
      description: "Search for new shows to follow.",
      icon: SparklesIcon,
    },
    {
      name: "Stay up-to-date",
      description: "See a list of upcoming episodes for your shows.",
      icon: ChartBarIcon,
    },
  ];

  return (
    <main className="flex w-full flex-col bg-white">
      <div className="flex min-h-screen w-full flex-col justify-center bg-mk px-8 text-center text-white">
        <h1 className="bg-gradient-to-r from-mklight-100 to-mklight-300 bg-clip-text font-title text-6xl text-transparent">
          What have you watched?
        </h1>

        <p className="mx-auto mt-9 max-w-2xl text-2xl">
          Never lose track of your favorite TV shows again. Search, track, and
          get notified about new episodes.
        </p>
        {data.environment.SIGNUP_DISABLED && (
          <h2 className="mt-8 font-title text-3xl uppercase">Coming Soon!</h2>
        )}
        {!user && (
          <div className="mt-9 flex flex-row justify-center space-x-4">
            {!data.environment.SIGNUP_DISABLED && (
              <Link
                to="/join"
                className="text-white-100 flex items-center justify-center rounded bg-mk-tertiary py-2 px-4 font-medium hover:bg-mk active:bg-mk"
              >
                Sign up
              </Link>
            )}
            <Link
              to="/login"
              className="flex items-center justify-center rounded bg-mk-tertiary px-4 py-2 font-medium text-white hover:bg-mk active:bg-mk"
            >
              Log In
            </Link>
          </div>
        )}
      </div>

      <div className="bg-mk-secondary py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-mklight-300">
              Everything you need
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              All-in-one TV show tracking
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-mk-tertiary">
                      <feature.icon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-slate-300">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      {!user && !data.environment.SIGNUP_DISABLED && (
        <div className="relative isolate overflow-hidden bg-mk px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Create an account or log in to start tracking your favorite shows.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/join"
                className="rounded-md bg-mk-tertiary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-mk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-tertiary"
              >
                Get started <ArrowRightIcon className="inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
