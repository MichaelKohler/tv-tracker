import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import * as Sentry from "@sentry/remix";

import UpcomingEpisodesList from "../components/upcoming-episodes-list";
import { getUpcomingEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const episodes = await getUpcomingEpisodes(userId);

  Sentry.metrics.distribution(
    "upcoming_episodes_returned",
    episodes.length,
    {}
  );

  return json(episodes);
}

export default function TVUpcoming() {
  const episodes = useLoaderData<typeof loader>();

  return (
    <>
      <h1 className="mt-9 font-title text-5xl">Upcoming</h1>
      {episodes.length === 0 && (
        <p className="mt-9">There are no upcoming episodes.</p>
      )}
      {episodes.length > 0 && <UpcomingEpisodesList episodes={episodes} />}
    </>
  );
}
