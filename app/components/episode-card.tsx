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
    <li className="mb-3 flex flex-col rounded-lg border-2 border-mklight-100 p-4 hover:bg-mklight-100 sm:flex-row">
      <div className="min-h-[140px] min-w-[250px] flex-none">
        <img src={episode.show.imageUrl || ""} alt="" loading="lazy" />
      </div>
      <div className="pl-0 pr-4 pt-4 sm:pl-4 sm:pt-0">
        <p>
          <strong>{episode.show.name}</strong> - {episode.name} (S
          {padNumber(episode.season)}E{padNumber(episode.number)}) -{" "}
          {new Date(episode.date).toLocaleDateString()}
        </p>
        <p>{episode.summary}</p>
      </div>
    </li>
  );
}
