import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useTransition, Form } from "@remix-run/react";

import ShowTiles from "~/components/show-tiles";
import Spinner from "~/components/spinner";
import { getShowsByUserId } from "~/models/show.server";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const shows = await getShowsByUserId(userId);

  shows.sort((showA, showB) => {
    if (showB.unwatchedEpisodesCount > showA.unwatchedEpisodesCount) {
      return 1;
    }

    if (showB.unwatchedEpisodesCount < showA.unwatchedEpisodesCount) {
      return -1;
    }

    if (showB.name > showA.name) {
      return -1;
    }

    if (showB.name < showA.name) {
      return 1;
    }

    return 0;
  });

  return json(shows);
}

export default function TVIndex() {
  const shows = useLoaderData<typeof loader>();
  const transition = useTransition();
  const isLoading = !!transition.submission;
  const stats = {
    shows: shows.length,
    unwatchedEpisodes: shows.reduce((unwatchedEpisodes, show) => {
      unwatchedEpisodes = (unwatchedEpisodes +
        show.unwatchedEpisodesCount) as number;
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
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            data-testid="search-input"
            placeholder="Search..."
          />
        </label>
      </Form>
      {isLoading && (
        <div className="mt-4">
          <Spinner />
        </div>
      )}

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
