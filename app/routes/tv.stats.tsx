import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import StatCard from "../components/stat-card";
import MonthlyEpisodesChart from "../components/monthly-episodes-chart";
import { evaluateBoolean, FLAGS } from "../flags.server";
import {
  getTotalWatchTimeForUser,
  getWatchedEpisodesCountForUser,
  getUnwatchedEpisodesCountForUser,
  getLast12MonthsStats,
} from "../models/episode.server";
import {
  getShowsTrackedByUser,
  getArchivedShowsCountForUser,
} from "../models/show.server";
import { requireUserId } from "../session.server";
import { logError } from "../utils/logger.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const statsRoute = await evaluateBoolean(request, FLAGS.STATS_ROUTE);

  if (!statsRoute) {
    return {
      features: {
        statsRoute: false,
      },
    };
  }

  const userId = await requireUserId(request);

  try {
    const [
      totalWatchTime,
      watchedEpisodesCount,
      unwatchedEpisodesCount,
      showsTracked,
      archivedShowsCount,
      last12MonthsStats,
    ] = await Promise.all([
      getTotalWatchTimeForUser(userId),
      getWatchedEpisodesCountForUser(userId),
      getUnwatchedEpisodesCountForUser(userId),
      getShowsTrackedByUser(userId),
      getArchivedShowsCountForUser(userId),
      getLast12MonthsStats(userId),
    ]);

    return {
      totalWatchTime,
      watchedEpisodesCount,
      unwatchedEpisodesCount,
      showsTracked,
      archivedShowsCount,
      last12MonthsStats,
      features: {
        statsRoute: true,
      },
    };
  } catch (error) {
    logError(
      "Failed to load statistics data",
      {
        userId,
      },
      error
    );

    return {
      totalWatchTime: 0,
      watchedEpisodesCount: 0,
      unwatchedEpisodesCount: 0,
      showsTracked: 0,
      archivedShowsCount: 0,
      last12MonthsStats: [],
      features: {
        statsRoute: true,
      },
      error: true,
    };
  }
}

function formatWatchTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  if (days > 0) {
    return `${days}d ${remainingHours}h ${remainingMinutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hourText =
    hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "";
  const minuteText =
    remainingMinutes > 0
      ? `${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"}`
      : "";

  if (hourText && minuteText) {
    return `${hourText} and ${minuteText}`;
  }
  return hourText || minuteText;
}

export default function TVStats() {
  const data = useLoaderData<typeof loader>();

  if (!data.features.statsRoute) {
    return (
      <>
        <h1 className="font-title text-5xl">Statistics</h1>
        <p className="mt-9">
          The statistics are currently unavailable. Please try again later.
        </p>
      </>
    );
  }

  const {
    totalWatchTime = 0,
    watchedEpisodesCount = 0,
    unwatchedEpisodesCount = 0,
    showsTracked = 0,
    archivedShowsCount = 0,
    last12MonthsStats = [],
  } = data;

  const archivedPercentage =
    showsTracked > 0
      ? Math.round((archivedShowsCount / showsTracked) * 100)
      : 0;

  return (
    <>
      <h1 className="font-title text-5xl">Statistics</h1>

      {/* General Stats */}
      <div className="mt-8">
        <h2 className="mb-4 font-title text-3xl">General Statistics</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Watch Time"
            value={formatWatchTime(totalWatchTime)}
            description="Time spent watching tracked episodes"
          />
          <StatCard
            title="Shows Tracked"
            value={showsTracked}
            description="Total number of shows you're following"
          />
          <StatCard
            title="Episodes Watched"
            value={watchedEpisodesCount}
            description="Total episodes marked as watched"
          />
          <StatCard
            title="Episodes Not Watched"
            value={unwatchedEpisodesCount}
            description="Aired episodes from tracked shows (incl. archived)"
          />
          <StatCard
            title="Shows Archived"
            value={`${archivedShowsCount} (${archivedPercentage}%)`}
            description="Shows hidden from overview"
          />
        </div>
      </div>

      {/* Last 12 Months */}
      <div className="mt-12">
        <h2 className="mb-4 font-title text-3xl">
          Last 12 Months (or last 1000 episodes)
        </h2>

        {/* Chart */}
        {last12MonthsStats.length > 0 && (
          <div className="mb-8">
            <MonthlyEpisodesChart data={last12MonthsStats} />
          </div>
        )}

        {/* Monthly Stats */}
        {last12MonthsStats.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold">Monthly Breakdown</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {last12MonthsStats.toReversed().map((month) => (
                <div
                  key={month.month}
                  className="rounded-lg border border-mklight-100 bg-white p-4 shadow-sm"
                >
                  <h4 className="font-semibold text-mk">{month.month}</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="font-medium">{month.episodes}</span>{" "}
                      {month.episodes === 1 ? "episode" : "episodes"}
                    </p>
                    <p>
                      <span className="font-medium">{month.showCount}</span>{" "}
                      {month.showCount === 1 ? "show" : "shows"}
                    </p>
                    <p className="text-gray-600">
                      {formatRuntime(month.runtime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {last12MonthsStats.length === 0 && (
          <p className="text-gray-600">
            No viewing activity in the last 12 months.
          </p>
        )}
      </div>
    </>
  );
}
