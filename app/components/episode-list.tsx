import { Form, useNavigation } from "react-router";

import type { Episode, Show } from "@prisma/client";

import { EPISODE_FALLBACK_IMG_PATH } from "../constants";
import { padNumber } from "../utils";

interface Props {
  episodes: Pick<
    Episode,
    "id" | "name" | "season" | "number" | "airDate" | "runtime" | "imageUrl"
  >[];
  watchedEpisodes: Episode["id"][];
  ignoredEpisodes: Episode["id"][];
  showId: Show["id"];
}

function InlineSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-current border-gray-300/50"
      role="status"
      aria-label="Loading"
      data-testid="spinner"
    />
  );
}

export default function EpisodeList({
  episodes,
  watchedEpisodes,
  ignoredEpisodes,
  showId,
}: Props) {
  const navigation = useNavigation();
  const submissionEpisodeId = navigation?.formData?.get("episodeId");
  const submissionIntent = navigation?.formData?.get("intent");

  return (
    <div className="my-3 flex flex-col py-5">
      <ul>
        {episodes.map((episode) => {
          const isSubmitting = submissionEpisodeId === episode.id;

          return (
            <li
              key={episode.id}
              className="mt-4 flex flex-col border-b-2 border-mklight-100 pb-4 last:border-b-0 sm:flex-row"
            >
              <div className="min-h-[140px] min-w-[250px] flex-none">
                <img
                  src={episode.imageUrl || EPISODE_FALLBACK_IMG_PATH}
                  alt=""
                  className={`${
                    watchedEpisodes.includes(episode.id) ||
                    ignoredEpisodes.includes(episode.id)
                      ? "grayscale"
                      : ""
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

                {/* Unwatched episodes - Show both watch and ignore buttons */}
                {!watchedEpisodes.includes(episode.id) &&
                  !ignoredEpisodes.includes(episode.id) && (
                    <div className="mt-4 flex gap-2">
                      {new Date(episode.airDate) < new Date() && (
                        <Form method="post" className="inline-block">
                          <input
                            type="hidden"
                            name="intent"
                            value="MARK_WATCHED"
                          />
                          <input type="hidden" name="showId" value={showId} />
                          <input
                            type="hidden"
                            name="episodeId"
                            value={episode.id}
                          />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded bg-mk border-2 border-transparent px-4 py-2 text-white hover:bg-mk-tertiary active:bg-mk-tertiary disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isSubmitting &&
                            submissionIntent === "MARK_WATCHED" ? (
                              <InlineSpinner />
                            ) : null}
                            Mark as watched
                          </button>
                        </Form>
                      )}
                      <Form method="post" className="inline-block">
                        <input
                          type="hidden"
                          name="intent"
                          value="MARK_IGNORED"
                        />
                        <input type="hidden" name="showId" value={showId} />
                        <input
                          type="hidden"
                          name="episodeId"
                          value={episode.id}
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex items-center gap-2 rounded bg-white border-2 border-black text-black hover:bg-gray-100 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting &&
                          submissionIntent === "MARK_IGNORED" ? (
                            <InlineSpinner />
                          ) : null}
                          Ignore
                        </button>
                      </Form>
                    </div>
                  )}
                {/* Watched episodes - Show only unwatch button */}
                {watchedEpisodes.includes(episode.id) && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="MARK_UNWATCHED" />
                    <input type="hidden" name="showId" value={showId} />
                    <input type="hidden" name="episodeId" value={episode.id} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-4 flex items-center gap-2 rounded bg-mkerror border-2 border-transparent px-4 py-2 text-black hover:bg-mkerror-muted active:bg-mkerror-muted disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? <InlineSpinner /> : null}
                      Mark as not watched
                    </button>
                  </Form>
                )}
                {/* Ignored episodes - Show only unignore button */}
                {ignoredEpisodes.includes(episode.id) && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="MARK_UNIGNORED" />
                    <input type="hidden" name="showId" value={showId} />
                    <input type="hidden" name="episodeId" value={episode.id} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-4 flex items-center gap-2 rounded bg-white border-2 border-black text-black hover:bg-gray-100 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? <InlineSpinner /> : null}
                      Unignore
                    </button>
                  </Form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
