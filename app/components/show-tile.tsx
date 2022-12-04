import { Link } from "@remix-run/react";

import type { FrontendShow } from "~/utils";
interface Props {
  show: FrontendShow;
}

export default function ShowTile({ show }: Props) {
  return (
    <Link to={`/tv/${show.id}`}>
      <div className="my-3 mr-3 flex flex-col rounded-lg border-2 border-slate-100 hover:bg-slate-100">
        {show.imageUrl && (
          <img src={show.imageUrl} alt="" className="rounded-t-lg" />
        )}
        <h2 className="text-center font-title text-lg">{show.name}</h2>
      </div>
    </Link>
  );
}
