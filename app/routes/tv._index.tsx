import { Suspense } from "react";

import type { Show } from "@prisma/client";
import type { LoaderFunctionArgs } from "react-router";
import { Await, useLoaderData, useNavigation, Form } from "react-router";

import ShowTiles from "../components/show-tiles";
import Spinner from "../components/spinner";
import { evaluateBoolean, FLAGS } from "../flags.server";
import { getSortedShowsByUserId } from "../models/show.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const shows = getSortedShowsByUserId(userId);
  const features = {
    search: await evaluateBoolean(request, FLAGS.SEARCH),
  };

  return { shows, features };
}

function Loader() {
  return (
    <div className="mt-4">
      <Spinner />
    </div>
  );
}

function Content({
  shows,
  features,
}: {
  shows: (Pick<Show, "id" | "name" | "imageUrl"> & {
    archived: boolean;
    unwatchedEpisodesCount: number;
  })[];
  features: { search: boolean };
}) {
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
      {features.search && (
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
      )}
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
          {(shows) => (
            <Content shows={shows} features={data.features}></Content>
          )}
        </Await>
      </Suspense>
    </>
  );
}
