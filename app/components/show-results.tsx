import type { Show } from "@prisma/client";

import ErrorAlert from "./error-alert";
import ShowResult from "./show-result";
import Spinner from "./spinner";

interface Props {
  shows: Omit<Show, "id" | "createdAt" | "updatedAt">[];
  isLoading?: boolean;
  error?: string;
  features?: {
    addShow: boolean;
  };
}

export default function ShowResults({
  shows,
  isLoading = false,
  error,
  features,
}: Props) {
  return (
    <>
      <h2 className="mt-9 font-title text-3xl">Results</h2>
      <p className="text-sm text-mk-text">
        All TV series data is provided by{" "}
        <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">
          tvmaze
        </a>
      </p>

      {error && error === "ADDING_SHOW_FAILED" && (
        <div className="mt-8">
          <ErrorAlert
            title="Adding show failed"
            message="There was an error while adding the show. It may have been added, but episodes might be missing. Please check the TV overview and try again as required. Sorry for the inconvenience!"
          />
        </div>
      )}

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
            <div key={show.mazeId}>
              <ShowResult show={show} features={features} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
