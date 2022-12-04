import type { Episode, Show } from "@prisma/client";

import { Form } from "@remix-run/react";

import { padNumber } from "~/utils";

interface Props {
  episodes: Episode[];
  seenEpisodes: Episode["id"][];
  showId: Show["id"];
}

export default function EpisodeList({ episodes, seenEpisodes, showId }: Props) {
  return (
    <div className="my-3 flex flex-col py-5">
      <ul>
        {episodes.map((episode) => (
          <li
            key={episode.id}
            className="mt-4 flex flex-col border-b-2 border-slate-200 pb-4 last:border-b-0 sm:flex-row"
          >
            <div className="flex-none pr-4">
              <img
                src={episode.imageUrl}
                alt=""
                className={`${
                  seenEpisodes.includes(episode.id) ? "grayscale" : ""
                } hover:grayscale-0`}
              />
            </div>
            <div className="pr-4 pt-4 sm:pt-0">
              <p>
                <strong>{episode.name}</strong> (S{padNumber(episode.season)}E
                {padNumber(episode.number)}) -{" "}
                {new Date(episode.airDate).toLocaleDateString()}
              </p>
              <p>{episode.summary}</p>
              {!seenEpisodes.includes(episode.id) && (
                <Form method="post">
                  <input type="hidden" name="showId" value={showId} />
                  <input type="hidden" name="episodeId" value={episode.id} />
                  <button
                    type="submit"
                    className="mt-4 rounded bg-slate-600 py-2 px-4 text-white hover:bg-slate-500 active:bg-slate-500"
                  >
                    Mark as seen
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
