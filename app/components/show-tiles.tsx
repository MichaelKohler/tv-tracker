import type { Show } from "@prisma/client";

import ShowTile from "./show-tile";

interface Props {
  shows: (Pick<Show, "id" | "name" | "imageUrl"> & {
    archived: boolean;
    unwatchedEpisodesCount: number;
  })[];
}

export default function ShowTiles({ shows }: Props) {
  return (
    <div className="mt-3 grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {shows.map((show) => (
        <ShowTile key={show.id} show={show} />
      ))}
    </div>
  );
}
