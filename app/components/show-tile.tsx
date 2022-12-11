import { Link } from "@remix-run/react";

import type { FrontendShow } from "~/utils";
interface Props {
  show: FrontendShow;
}

export default function ShowTile({ show }: Props) {
  return (
    <Link to={`/tv/${show.id}`}>
      <div className="relative my-3 mr-3 flex flex-col rounded-lg border-2 border-slate-100 hover:bg-slate-100">
        {show.imageUrl && (
          <img
            src={show.imageUrl}
            alt=""
            className={`rounded-t-lg ${
              !show.unwatchedEpisodesCount ? "grayscale-80" : ""
            }`}
          />
        )}
        {(show.unwatchedEpisodesCount ?? 0) > 0 && (
          <div className="absolute top-0 left-0 rounded-tl-lg bg-blue-300 py-2 px-2 text-xl">
            {show.unwatchedEpisodesCount}
          </div>
        )}
        <h2 className="text-center font-title text-lg">{show.name}</h2>
      </div>
    </Link>
  );
}
