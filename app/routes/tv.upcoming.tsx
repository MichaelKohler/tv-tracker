import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { withRequestContext } from "../request-handler.server";

import UpcomingEpisodesList from "../components/upcoming-episodes-list";
import { evaluateBoolean, FLAGS } from "../flags.server";
import { getUpcomingEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";
import { logInfo } from "../logger.server";

export const loader = withRequestContext(
  async ({ request }: LoaderFunctionArgs) => {
    const upcomingRoute = await evaluateBoolean(request, FLAGS.UPCOMING_ROUTE);

    if (!upcomingRoute) {
      return {
        episodes: {},
        features: {
          upcomingRoute: false,
        },
      };
    }
    const userId = await requireUserId(request);
    logInfo("TV upcoming episodes page accessed", {});

    const episodes = await getUpcomingEpisodes(userId);

    const groupedEpisodes = episodes.reduce(
      (
        acc: Record<string, typeof episodes>,
        episode: (typeof episodes)[number]
      ) => {
        const month = new Date(episode.airDate).toLocaleString("default", {
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

    return {
      episodes: groupedEpisodes,
      features: {
        upcomingRoute: true,
      },
    };
  }
);

export default function TVUpcoming() {
  const { episodes, features } = useLoaderData<typeof loader>();

  if (!features.upcomingRoute) {
    return (
      <>
        <h1 className="font-title text-5xl">Upcoming</h1>
        <p className="mt-9">
          The overview of upcoming episodes is currently unavailable. Please try
          again later.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-title text-5xl">Upcoming</h1>
      {Object.keys(episodes).length === 0 && (
        <p className="mt-9">There are no upcoming episodes.</p>
      )}
      {Object.keys(episodes).length > 0 && (
        <UpcomingEpisodesList episodes={episodes} />
      )}
    </>
  );
}
