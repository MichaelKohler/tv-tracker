import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { withRequestContext } from "../request-handler.server";

import UpcomingEpisodesList from "../components/upcoming-episodes-list";
import { evaluateBoolean, FLAGS } from "../flags.server";
import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";
import { logInfo } from "../logger.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    const recentlyWatchedRoute = await evaluateBoolean(
      request,
      FLAGS.RECENTLY_WATCHED_ROUTE
    );

    if (!recentlyWatchedRoute) {
      return {
        episodes: {},
        features: {
          recentlyWatchedRoute: false,
        },
      };
    }

    const userId = await requireUserId(request);
    logInfo("TV recent episodes page accessed", {});
    const episodes = await getRecentlyWatchedEpisodes(userId, 200);

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

    return {
      episodes: groupedEpisodes,
      features: {
        recentlyWatchedRoute: true,
      },
    };
  }
);

export default function TVUpcoming() {
  const { episodes, features } = useLoaderData<typeof loader>();

  if (!features.recentlyWatchedRoute) {
    return (
      <>
        <h1 className="font-title text-5xl">Recently watched</h1>
        <p className="mt-9">
          The overview of recently watched episodes is currently unavailable.
          Please try again later.
        </p>
      </>
    );
  }

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
