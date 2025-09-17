import { Form, useNavigation } from "react-router";

import type { Episode, Show } from "@prisma/client";

import { EPISODE_FALLBACK_IMG_PATH } from "../constants";
import { padNumber } from "../utils";
import Spinner from "./spinner";

interface Props {
  episodes: Partial<Episode>[];
  watchedEpisodes: Episode["id"][];
  showId: Show["id"];
}

export default function EpisodeList({
  episodes,
  watchedEpisodes,
  showId,
}: Props) {
  const navigation = useNavigation();
  const submissionEpisodeId = navigation?.formData?.get("episodeId");

  return (
    <div className="my-3 flex flex-col py-5">
      <ul>
        {episodes.map((episode) => (
          <li
            key={episode.id}
            className="mt-4 flex flex-col border-b-2 border-mklight-100 pb-4 last:border-b-0 sm:flex-row"
          >
            <div className="min-h-[140px] min-w-[250px] flex-none">
              <img
                src={episode.imageUrl || EPISODE_FALLBACK_IMG_PATH}
                alt=""
                className={`${
                  episode.id && watchedEpisodes.includes(episode.id)
                    ? "grayscale"
                    : ""
                } hover:grayscale-0`}
                loading="lazy"
              />
            </div>
            <div className="pl-0 pr-4 pt-4 sm:pl-4 sm:pt-0">
              <p>
                <strong>{episode.name}</strong> (S
                {padNumber(episode.season || 0)}E
                {padNumber(episode.number || 0)}) -{" "}
                {episode.airDate &&
                  new Date(episode.airDate).toLocaleDateString()}
              </p>
              <p>{episode.summary}</p>

              {submissionEpisodeId && submissionEpisodeId === episode.id && (
                <div className="mt-4">
                  <Spinner />
                </div>
              )}
              {episode.id &&
                !watchedEpisodes.includes(episode.id) &&
                (!submissionEpisodeId ||
                  submissionEpisodeId !== episode.id) && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="MARK_WATCHED" />
                    <input type="hidden" name="showId" value={showId} />
                    <input type="hidden" name="episodeId" value={episode.id} />
                    <button
                      type="submit"
                      className="mt-4 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
                    >
                      Mark as watched
                    </button>
                  </Form>
                )}
              {episode.id &&
                watchedEpisodes.includes(episode.id) &&
                (!submissionEpisodeId ||
                  submissionEpisodeId !== episode.id) && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="MARK_UNWATCHED" />
                    <input type="hidden" name="showId" value={showId} />
                    <input type="hidden" name="episodeId" value={episode.id} />
                    <button
                      type="submit"
                      className="mt-4 rounded bg-mkerror px-4 py-2 text-black hover:bg-mkerror-muted active:bg-mkerror-muted"
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
