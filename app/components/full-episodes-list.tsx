import type { Episode, Show } from "@prisma/client";

import { padNumber, decodeHtmlEntities } from "../utils";

interface Props {
  episodes: (Episode & {
    date: Date;
    show: Show;
  })[];
}

export default function FullEpisodesList({ episodes }: Props) {
  return (
    <div className="my-3 flex flex-col py-5">
      <ul>
        {episodes.map((episode) => (
          <li
            key={episode.id}
            className="mt-4 flex flex-col border-b-2 border-mklight-100 pb-4 last:border-b-0 sm:flex-row"
          >
            <div className="min-h-[140px] min-w-[250px] flex-none">
              <img src={episode.show.imageUrl || ""} alt="" loading="lazy" />
            </div>
            <div className="pl-0 pr-4 pt-4 sm:pl-4 sm:pt-0">
              <p>
                <strong>{episode.show.name}</strong> - {episode.name} (S
                {padNumber(episode.season)}E{padNumber(episode.number)}) -{" "}
                {new Date(episode.date).toLocaleDateString()}
              </p>
              <p>{decodeHtmlEntities(episode.summary)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
