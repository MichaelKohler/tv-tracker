import { Form, useTransition } from "@remix-run/react";

import Spinner from "~/components/spinner";
import type { FrontendEpisode, FrontendShow } from "~/utils";

interface Props {
  show: FrontendShow;
  watchedEpisodes: FrontendEpisode["id"][];
}

export default function ShowHeader({ show, watchedEpisodes }: Props) {
  const transition = useTransition();
  const submissionIntent = transition?.submission?.formData.get("intent");
  const pastEpisodes = show.episodes?.filter(
    (episode) => new Date(episode.airDate) < new Date()
  );

  return (
    <div className="my-3 flex flex-col py-5 md:flex-row">
      <div className="flex flex-col">
        {show.imageUrl && (
          <img
            className="mb-8 min-w-[250px] max-w-[250px] md:mb-0 md:flex-none"
            src={show.imageUrl}
            alt=""
          />
        )}
        <p className="mt-2 text-center">
          Watched {watchedEpisodes.length} of {pastEpisodes?.length} episodes
        </p>
      </div>
      <div className="flex flex-col">
        <div className={`flex flex-col pl-0 pr-10 md:pl-4`}>
          <h2 className="font-title text-3xl">{show.name}</h2>
          <p>{show.summary}</p>
        </div>
        <div className={`flex flex-col py-5 pl-0 pr-10 md:pl-4`}>
          <p>
            <strong>Started:</strong>{" "}
            {new Date(show.premiered).toLocaleDateString()}
          </p>
          {show.ended && (
            <p>
              <strong>Ended:</strong>{" "}
              {new Date(show.ended).toLocaleDateString()}
            </p>
          )}
          {show.rating && (
            <p>
              <strong>Rating:</strong> {show.rating}
            </p>
          )}
          {submissionIntent &&
            (submissionIntent === "MARK_ALL_WATCHED" ||
              submissionIntent === "DELETE_SHOW") && (
              <div className="mt-4">
                <Spinner />
              </div>
            )}
          {show.episodes &&
            show.episodes.length > 0 &&
            show.episodes.length !== watchedEpisodes.length &&
            submissionIntent !== "MARK_ALL_WATCHED" && (
              <Form method="post">
                <input type="hidden" name="intent" value="MARK_ALL_WATCHED" />
                <input type="hidden" name="showId" value={show.id} />
                <button
                  type="submit"
                  disabled={!!transition.submission}
                  className="mt-4 rounded bg-slate-600 py-2 px-4 text-white hover:bg-slate-500 active:bg-slate-500"
                >
                  Mark all episodes as watched
                </button>
              </Form>
            )}
          {submissionIntent !== "DELETE_SHOW" && (
            <Form method="post">
              <input type="hidden" name="intent" value="DELETE_SHOW" />
              <input type="hidden" name="showId" value={show.id} />
              <button
                type="submit"
                disabled={!!transition.submission}
                className="mt-4 rounded bg-red-300 py-2 px-4 text-black hover:bg-red-200 active:bg-red-200"
              >
                Remove show
              </button>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
