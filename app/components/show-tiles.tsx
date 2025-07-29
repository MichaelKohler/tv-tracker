import type { Show } from "@prisma/client";

import ShowTile from "./show-tile";

interface Props {
  shows: (Show & { archived: boolean })[];
}

export default function ShowTiles({ shows }: Props) {
  return (
    <div className="mt-3 grid grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {shows.map((show) => (
        <ShowTile key={show.id} show={show} />
      ))}
    </div>
  );
}
