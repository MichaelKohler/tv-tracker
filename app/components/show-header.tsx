import { Form, useNavigation } from "react-router";

import type { Episode, Show } from "@prisma/client";

import Spinner from "./spinner";

interface Props {
  show: Partial<Show> & {
    id: string;
    name: string;
    archived: boolean;
    episodes: Partial<Episode>[];
  };
  watchedEpisodes: Episode["id"][];
  features: {
    markAllAsWatched: boolean;
    ignoreUnwatchedOnOverview: boolean;
  };
}

export default function ShowHeader({ show, watchedEpisodes, features }: Props) {
  const navigation = useNavigation();
  const submissionIntent = navigation?.formData?.get("intent");
  const pastEpisodes = show.episodes?.filter(
    (episode) => episode.airDate && new Date(episode.airDate) < new Date()
  );

  return (
    <div className="mt-8 flex flex-col md:flex-row">
      <div className="flex flex-col">
        {show.imageUrl && (
          <img
            className="mb-4 min-w-[250px] max-w-[250px] md:mb-0 md:flex-none"
            src={show.imageUrl}
            alt=""
          />
        )}
        <p className="mb-4 md:mt-4 md:text-center">
          Watched {watchedEpisodes.length} of {pastEpisodes?.length} aired
          episodes
        </p>
      </div>
      <div className="flex flex-col">
        <div className={`flex flex-col pl-0 pr-10 md:pl-4`}>
          <h2 className="font-title text-3xl">{show.name}</h2>
          <p>{show.summary}</p>
        </div>
        <div className={`flex flex-col py-5 pl-0 pr-10 md:pl-4`}>
          {show.premiered && (
            <p>
              <strong>Started:</strong>{" "}
              {new Date(show.premiered).toLocaleDateString()}
            </p>
          )}
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
          {features.markAllAsWatched &&
            show.episodes &&
            show.episodes.length > 0 &&
            show.episodes.length !== watchedEpisodes.length &&
            submissionIntent !== "MARK_ALL_WATCHED" && (
              <Form method="post">
                <input type="hidden" name="intent" value="MARK_ALL_WATCHED" />
                <input type="hidden" name="showId" value={show.id} />
                <button
                  type="submit"
                  disabled={!!navigation.formData}
                  className="mt-4 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
                >
                  Mark all aired episodes as watched
                </button>
              </Form>
            )}
          {submissionIntent &&
            (submissionIntent === "ARCHIVE" ||
              submissionIntent === "UNARCHIVE") && (
              <div className="mt-4">
                <Spinner />
              </div>
            )}
          {features.ignoreUnwatchedOnOverview &&
            !show.archived &&
            submissionIntent !== "ARCHIVE" && (
              <Form method="post">
                <input type="hidden" name="intent" value="ARCHIVE" />
                <input type="hidden" name="showId" value={show.id} />
                <button
                  type="submit"
                  disabled={!!navigation.formData}
                  className="mt-4 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
                >
                  Ignore unwatched on overview
                </button>
              </Form>
            )}
          {show.archived && submissionIntent !== "UNARCHIVE" && (
            <Form method="post">
              <input type="hidden" name="intent" value="UNARCHIVE" />
              <input type="hidden" name="showId" value={show.id} />
              <button
                type="submit"
                disabled={!!navigation.formData}
                className="mt-4 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
              >
                Unignore unwatched on overview
              </button>
            </Form>
          )}
          {submissionIntent !== "DELETE_SHOW" && (
            <Form method="post">
              <input type="hidden" name="intent" value="DELETE_SHOW" />
              <input type="hidden" name="showId" value={show.id} />
              <button
                type="submit"
                disabled={!!navigation.formData}
                className="mt-4 rounded bg-mkerror px-4 py-2 text-black hover:bg-mkerror-muted active:bg-mkerror-muted"
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
