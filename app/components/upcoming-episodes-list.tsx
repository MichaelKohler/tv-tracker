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
        <div key={month}>
          <h2 className="font-title text-3xl">{month}</h2>
          <ul>
            {episodes[month].map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
