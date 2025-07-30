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
        acc[month] = {
          episodes: [],
          totalRuntime: 0,
          episodeCount: 0,
          showCount: 0,
        };
      }

      acc[month].episodes.push(episode);
      acc[month].totalRuntime += episode.runtime || 0;
      acc[month].episodeCount++;

      return acc;
    },
    {} as Record<
      string,
      {
        episodes: typeof episodes;
        totalRuntime: number;
        episodeCount: number;
        showCount: number;
      }
    >
  );

  Object.values(groupedEpisodes).forEach((group) => {
    group.showCount = new Set(group.episodes.map((e) => e.show.id)).size;
  });

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
        <UpcomingEpisodesList episodes={episodes} showStats />
      )}
    </>
  );
}
