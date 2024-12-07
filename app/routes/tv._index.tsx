import { Suspense } from "react";

import type { LoaderFunctionArgs } from "@remix-run/node";
import { Await, useLoaderData, useNavigation, Form } from "@remix-run/react";
import * as Sentry from "@sentry/remix";

import ShowTiles from "../components/show-tiles";
import Spinner from "../components/spinner";
import { getSortedShowsByUserId } from "../models/show.server";
import { requireUserId } from "../session.server";
import type { FrontendShow } from "../utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const shows = getSortedShowsByUserId(userId);

  shows.then((shows) => {
    Sentry.metrics.distribution("overview_returned_shows", shows.length, {});
  });

  return { shows };
}

function Loader() {
  return (
    <div className="mt-4">
      <Spinner />
    </div>
  );
}

function Content({ shows }: { shows: FrontendShow[] }) {
  const navigation = useNavigation();
  const isLoading = !!navigation.formData;
  const stats = {
    shows: shows.length,
    unwatchedEpisodes: shows?.reduce((unwatchedEpisodes: number, show) => {
      unwatchedEpisodes =
        unwatchedEpisodes + (show.unwatchedEpisodesCount || 0);
      return unwatchedEpisodes;
    }, 0),
  };

  return (
    <>
      <p className=" text-2xl">
        You are currently tracking {stats.shows} shows with{" "}
        {stats.unwatchedEpisodes} unwatched episodes.
      </p>
      <Form action="/tv/search" className="mt-8">
        <label className="flex w-full flex-col gap-1">
          <input
            name="query"
            className="flex-1 rounded-md border-2 border-mk px-3 text-lg leading-loose"
            data-testid="search-input"
            placeholder="Search..."
            aria-label="Search"
          />
        </label>
      </Form>
      {isLoading && <Loader />}

      <h1 className="mt-9 font-title text-5xl">Your shows</h1>
      {shows.length === 0 && (
        <p className="mt-9">
          You have not added any shows yet. To get started, search for a show in
          the search field above.
        </p>
      )}
      {shows.length > 0 && <ShowTiles shows={shows} />}
    </>
  );
}

export default function TVIndex() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <Suspense fallback={<Loader />}>
        <Await resolve={data.shows}>
          {/* @ts-expect-error .. the type is not detected correctly here because we do not await the promise in the loader and use Suspense */}
          {(shows) => <Content shows={shows}></Content>}
        </Await>
      </Suspense>
    </>
  );
}
