import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import UpcomingEpisodesList from "../components/upcoming-episodes-list";
import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const episodes = await getRecentlyWatchedEpisodes(userId);

  const groupedEpisodes = episodes.reduce(
    (acc, episode) => {
      const month = new Date(episode.date).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(episode);
      return acc;
    },
    {} as Record<string, typeof episodes>
  );

  return groupedEpisodes;
}

export default function TVUpcoming() {
  const episodes = useLoaderData<typeof loader>();

  return (
    <>
      <h1 className="font-title text-5xl">Recently watched</h1>
      {Object.keys(episodes).length === 0 && (
        <p className="mt-9">There are no recently watched episodes.</p>
      )}
      {Object.keys(episodes).length > 0 && (
        <UpcomingEpisodesList episodes={episodes} />
      )}
    </>
  );
}
