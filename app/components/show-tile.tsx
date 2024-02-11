import { Link, useNavigation } from "@remix-run/react";

import type { FrontendShow } from "../utils";
import Spinner from "./spinner";
interface Props {
  show: FrontendShow;
}

export default function ShowTile({ show }: Props) {
  const navigation = useNavigation();
  const navigatingToDetail =
    navigation.state === "loading" &&
    navigation.location.pathname === `/tv/${show.id}`;

  return (
    <Link to={`/tv/${show.id}`}>
      <div className="relative my-3 mr-3 flex min-w-[250px] max-w-[250px] flex-col rounded-lg border-2 border-mklight-100 hover:bg-mklight-100">
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
          <div className="absolute left-[103px] top-32 mt-4">
            <Spinner />
          </div>
        )}
        {(show.unwatchedEpisodesCount ?? 0) > 0 && (
          <div className="absolute left-0 top-0 rounded-tl-lg bg-orange-400 px-2 py-2 text-xl">
            {show.unwatchedEpisodesCount}
          </div>
        )}
        <h2 className="text-center font-title text-lg">{show.name}</h2>
      </div>
    </Link>
  );
}
