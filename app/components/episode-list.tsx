import type { FrontendEpisode, FrontendShow } from "~/utils";

import { Form, useTransition } from "@remix-run/react";

import { EPISODE_FALLBACK_IMG_PATH } from "~/constants";
import Spinner from "~/components/spinner";
import { padNumber } from "~/utils";

interface Props {
  episodes: FrontendEpisode[];
  watchedEpisodes: FrontendEpisode["id"][];
  showId: FrontendShow["id"];
}

export default function EpisodeList({
  episodes,
  watchedEpisodes,
  showId,
}: Props) {
  const transition = useTransition();
  const submissionEpisodeId = transition?.submission?.formData.get("episodeId");

  return (
    <div className="my-3 flex flex-col py-5">
      <ul>
        {episodes.map((episode) => (
          <li
            key={episode.id}
            className="mt-4 flex flex-col border-b-2 border-slate-200 pb-4 last:border-b-0 sm:flex-row"
          >
            <div className="min-h-[140px] min-w-[250px] flex-none">
              <img
                src={episode.imageUrl || EPISODE_FALLBACK_IMG_PATH}
                alt=""
                className={`${
                  watchedEpisodes.includes(episode.id) ? "grayscale" : ""
                } hover:grayscale-0`}
                loading="lazy"
              />
            </div>
            <div className="pl-0 pr-4 pt-4 sm:pl-4 sm:pt-0">
              <p>
                <strong>{episode.name}</strong> (S{padNumber(episode.season)}E
                {padNumber(episode.number)}) -{" "}
                {new Date(episode.airDate).toLocaleDateString()}
              </p>
              <p>{episode.summary}</p>

              {submissionEpisodeId && submissionEpisodeId === episode.id && (
                <div className="mt-4">
                  <Spinner />
                </div>
              )}
              {!watchedEpisodes.includes(episode.id) &&
                (!submissionEpisodeId ||
                  submissionEpisodeId !== episode.id) && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="MARK_WATCHED" />
                    <input type="hidden" name="showId" value={showId} />
                    <input type="hidden" name="episodeId" value={episode.id} />
                    <button
                      type="submit"
                      className="mt-4 rounded bg-slate-600 py-2 px-4 text-white hover:bg-slate-500 active:bg-slate-500"
                    >
                      Mark as watched
                    </button>
                  </Form>
                )}
              {watchedEpisodes.includes(episode.id) &&
                (!submissionEpisodeId ||
                  submissionEpisodeId !== episode.id) && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="MARK_UNWATCHED" />
                    <input type="hidden" name="showId" value={showId} />
                    <input type="hidden" name="episodeId" value={episode.id} />
                    <button
                      type="submit"
                      className="mt-4 rounded bg-red-300 py-2 px-4 text-black hover:bg-red-200 active:bg-red-200"
                    >
                      Mark as not watched
                    </button>
                  </Form>
                )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
