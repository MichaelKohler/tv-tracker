import type { Show } from "@prisma/client";

import ShowTile from "~/components/show-tile";

interface Props {
  shows: Show[];
}

export default function ShowTiles({ shows }: Props) {
  return (
    <>
      <div className="mt-3 flex flex-row flex-wrap justify-center sm:justify-start">
        {shows.map((show) => (
          <ShowTile key={show.id} show={show} />
        ))}
      </div>
    </>
  );
}
