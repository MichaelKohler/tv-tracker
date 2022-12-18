import type { Show } from "@prisma/client";

import { Form, useTransition } from "@remix-run/react";

import Spinner from "./spinner";

interface Props {
  show: Show;
}

export default function ShowResult({ show }: Props) {
  const transition = useTransition();
  const isAddingShow =
    transition?.submission?.formData.get("intent") === "add-show";
  const addingShowId = transition?.submission?.formData.get("showId");

  return (
    <div className="my-3 flex flex-row rounded-lg border-2 border-slate-300 bg-slate-50 py-5 px-5">
      <div className="flex flex-none flex-col">
        {show.imageUrl && <img src={show.imageUrl} alt="" />}
      </div>
      <div className="flex flex-col">
        <div className={`flex flex-col ${show.imageUrl ? "pl-10" : ""} pr-10`}>
          <h2 className="font-title text-lg">{show.name}</h2>
          <p>{show.summary}</p>
        </div>
        <div
          className={`flex flex-col ${show.imageUrl ? "pl-10" : ""} py-5 pr-10`}
        >
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

          {isAddingShow && addingShowId === show.mazeId.toString() && (
            <div className="mt-4">
              <Spinner />
            </div>
          )}
          {!isAddingShow && (
            <Form method="post">
              <input type="hidden" name="showId" value={show.mazeId} />
              <input type="hidden" name="intent" value="add-show" />
              <button
                type="submit"
                className="mt-4 rounded bg-slate-600 py-2 px-4 text-white hover:bg-slate-500 active:bg-slate-500"
              >
                Add Show
              </button>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
