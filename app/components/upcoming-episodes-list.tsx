import type { Episode, Show } from "@prisma/client";
import EpisodeCard from "./episode-card";

interface Props {
  episodes: Record<
    string,
    (Episode & {
      date: Date;
      show: Show;
    })[]
  >;
}

export default function UpcomingEpisodesList({ episodes }: Props) {
  return (
    <div className="my-3 flex flex-col py-5">
      {Object.keys(episodes).map((month) => (
        <div key={month} className="mt-8">
          <h2 className="font-title text-3xl">{month}</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {episodes[month].map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
