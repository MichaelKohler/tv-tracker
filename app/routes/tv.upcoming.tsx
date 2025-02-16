import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import UpcomingEpisodesList from "../components/upcoming-episodes-list";
import { getUpcomingEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const episodes = await getUpcomingEpisodes(userId);

  return episodes;
}

export default function TVUpcoming() {
  const episodes = useLoaderData<typeof loader>();

  return (
    <>
      <h1 className="font-title text-5xl">Upcoming</h1>
      {episodes.length === 0 && (
        <p className="mt-9">There are no upcoming episodes.</p>
      )}
      {episodes.length > 0 && <UpcomingEpisodesList episodes={episodes} />}
    </>
  );
}
