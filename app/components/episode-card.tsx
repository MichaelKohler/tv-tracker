import type { Episode, Show } from "@prisma/client";
import { Link } from "react-router";
import { padNumber } from "../utils";

interface Props {
  episode: Episode & {
    show: Show;
  };
}

export default function EpisodeCard({ episode }: Props) {
  return (
    <li className="mb-3 flex w-full flex-col items-center rounded-lg border-2 border-mklight-100 p-4 text-center hover:bg-mklight-100 sm:w-180 sm:flex-row sm:text-left">
      <Link
        to={`/tv/${episode.show.id}`}
        className="flex w-full flex-col items-center text-center sm:flex-row sm:text-left"
      >
        <div className="min-h-[140px] min-w-[125px] flex-none">
          <img
            src={episode.show.imageUrl || "/episode-fallback.png"}
            alt=""
            loading="lazy"
            className="rounded-lg"
          />
        </div>
        <div className="flex flex-col items-center pl-0 pr-4 pt-4 sm:items-start sm:pl-4 sm:pt-0">
          <h3 className="font-title text-2xl">
            {episode.show.name} (S{padNumber(episode.season)}E
            {padNumber(episode.number)})
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {new Date(episode.airDate).toLocaleDateString()}
          </p>
          {episode.summary && <p className="mt-4 text-sm">{episode.summary}</p>}
        </div>
      </Link>
    </li>
  );
}
