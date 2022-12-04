import type { Show } from "@prisma/client";

import ShowResult from "~/components/show-result";
import Spinner from "~/components/spinner";

interface Props {
  shows: Show[];
  isLoading?: boolean;
}

export default function ShowResults({ shows, isLoading = false }: Props) {
  return (
    <>
      <h2 className="mt-9 font-title text-3xl">Results</h2>
      {isLoading && (
        <div className="mt-4">
          <Spinner />
        </div>
      )}

      {!isLoading && shows.length === 0 && (
        <p className="mt-3">No shows found. Please try another search query.</p>
      )}

      {!isLoading && shows.length > 0 && (
        <div className="mt-3">
          {shows.map((show) => (
            <ShowResult key={show.id} show={show} />
          ))}
        </div>
      )}
    </>
  );
}
