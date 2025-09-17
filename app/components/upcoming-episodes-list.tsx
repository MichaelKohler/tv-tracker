import type { Episode, Show } from "@prisma/client";
import EpisodeCard from "./episode-card";

type EpisodeWithShow = Episode & {
  show: Show;
};

interface WatchedEpisodes {
  episodes: EpisodeWithShow[];
  totalRuntime: number;
  episodeCount: number;
  showCount: number;
}

interface Props {
  episodes: Record<string, WatchedEpisodes | EpisodeWithShow[]>;
  showStats?: boolean;
}

function formatRuntime(minutes: number) {
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

export default function UpcomingEpisodesList({ episodes, showStats }: Props) {
  return (
    <div className="my-3 flex flex-col py-5">
      {Object.keys(episodes).map((month) => (
        <div key={month} className="mt-8">
          <h2 className="font-title text-3xl">{month}</h2>
          {showStats && (
            <>
              <div className="text-sm text-gray-500">
                {formatRuntime(
                  (episodes[month] as WatchedEpisodes).totalRuntime
                )}
              </div>
              <div className="text-sm text-gray-500">
                {(episodes[month] as WatchedEpisodes).episodeCount}{" "}
                {(episodes[month] as WatchedEpisodes).episodeCount === 1
                  ? "episode"
                  : "episodes"}{" "}
                from {(episodes[month] as WatchedEpisodes).showCount}{" "}
                {(episodes[month] as WatchedEpisodes).showCount === 1
                  ? "show"
                  : "shows"}
              </div>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            {(showStats
              ? (episodes[month] as WatchedEpisodes).episodes
              : (episodes[month] as EpisodeWithShow[])
            ).map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
