import { Link } from "react-router";

import type { Show } from "@prisma/client";

export interface Props {
  show: Show & { archived: boolean; unwatchedEpisodesCount?: number };
}

export default function ShowTile({ show }: Props) {
  return (
    <Link to={`/tv/${show.id}`} className="grow">
      <div className="relative flex mb-3 flex-col rounded-lg border-2 border-mklight-100 hover:bg-mklight-100">
        {show.imageUrl && (
          <img
            src={show.imageUrl}
            alt=""
            className={`min-h-[250px] rounded-t-lg ${
              !show.unwatchedEpisodesCount ? "grayscale-80" : ""
            }`}
          />
        )}
        {!show.archived && (show.unwatchedEpisodesCount ?? 0) > 0 && (
          <div className="absolute left-0 top-0 rounded-tl-lg bg-orange-400 px-2 py-2 text-xl">
            {show.unwatchedEpisodesCount}
          </div>
        )}
        {show.archived && (
          <div className="absolute left-0 top-0 rounded-tl-lg bg-red-400 px-4 py-4 text-xl"></div>
        )}
        <h2 className="text-center font-title text-xl">{show.name}</h2>
      </div>
    </Link>
  );
}
