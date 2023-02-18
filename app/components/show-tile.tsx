import { Link, useTransition } from "@remix-run/react";

import type { FrontendShow } from "../utils";
import Spinner from "./spinner";
interface Props {
  show: FrontendShow;
}

export default function ShowTile({ show }: Props) {
  const transition = useTransition();
  const navigatingToDetail =
    transition.state === "loading" &&
    transition.location.pathname === `/tv/${show.id}`;

  return (
    <Link to={`/tv/${show.id}`}>
      <div className="relative my-3 mr-3 flex min-w-[250px] max-w-[250px] flex-col rounded-lg border-2 border-slate-100 hover:bg-slate-100">
        {show.imageUrl && (
          <img
            src={show.imageUrl}
            alt=""
            className={`min-h-[350px] rounded-t-lg ${
              !show.unwatchedEpisodesCount ? "grayscale-80" : ""
            }`}
          />
        )}
        {navigatingToDetail && (
          <div className="absolute top-32 left-[103px] mt-4">
            <Spinner />
          </div>
        )}
        {(show.unwatchedEpisodesCount ?? 0) > 0 && (
          <div className="absolute top-0 left-0 rounded-tl-lg bg-orange-400 py-2 px-2 text-xl">
            {show.unwatchedEpisodesCount}
          </div>
        )}
        <h2 className="text-center font-title text-lg">{show.name}</h2>
      </div>
    </Link>
  );
}
