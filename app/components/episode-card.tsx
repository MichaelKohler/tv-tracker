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
    <li className="mb-3 flex max-w-2xl flex-col rounded-lg border-2 border-mklight-100 p-4 hover:bg-mklight-100 sm:flex-row">
      <div className="min-h-[140px] min-w-[250px] flex-none">
        <img
          src={episode.show.imageUrl || ""}
          alt=""
          loading="lazy"
          className="rounded-lg"
        />
      </div>
      <div className="flex flex-col pl-0 pr-4 pt-4 sm:pl-4 sm:pt-0">
        <h3 className="font-title text-2xl">
          {episode.show.name} (S{padNumber(episode.season)}E
          {padNumber(episode.number)})
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {new Date(episode.date).toLocaleDateString()}
        </p>
        {episode.summary && <p className="mt-4">{episode.summary}</p>}
      </div>
    </li>
  );
}
