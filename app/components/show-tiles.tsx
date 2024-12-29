import type { FrontendShow } from "../utils";
import ShowTile from "./show-tile";

interface Props {
  shows: FrontendShow[];
}

export default function ShowTiles({ shows }: Props) {
  return (
    <>
      <div className="mt-3 flex flex-row flex-wrap items-stretch justify-between gap-3 grow">
        {shows.map((show) => (
          <ShowTile key={show.id} show={show} />
        ))}
      </div>
    </>
  );
}
