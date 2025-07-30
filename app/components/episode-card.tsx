import type { Episode, Show } from "@prisma/client";
import { padNumber } from "../utils";

interface Props {
  episode: Episode & {
    date: Date;
    show: Show;
  };
}

export default function EpisodeCard({ episode }: Props) {
  return (
    <li className="mb-3 flex w-96 flex-col items-center rounded-lg border-2 border-mklight-100 p-4 text-center hover:bg-mklight-100 sm:w-auto sm:flex-row sm:text-left">
      <div className="min-h-[140px] min-w-[125px] flex-none">
        <img
          src={episode.show.imageUrl || ""}
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
          {new Date(episode.date).toLocaleDateString()}
        </p>
        {episode.summary && <p className="mt-4 text-sm">{episode.summary}</p>}
      </div>
    </li>
  );
}
