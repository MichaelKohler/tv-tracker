import { Form } from "@remix-run/react";

import type { FrontendShow } from "~/utils";
interface Props {
  show: FrontendShow;
}

export default function ShowHeader({ show }: Props) {
  return (
    <div className="my-3 flex flex-col py-5 md:flex-row">
      <div>
        {show.imageUrl && (
          <img
            className="mb-8 min-w-[250px] max-w-[250px] md:mb-0 md:flex-none"
            src={show.imageUrl}
            alt=""
          />
        )}
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
          <Form method="post">
            <input type="hidden" name="intent" value="MARK_ALL_WATCHED" />
            <input type="hidden" name="showId" value={show.id} />
            <button
              type="submit"
              className="mt-4 rounded bg-slate-600 py-2 px-4 text-white hover:bg-slate-500 active:bg-slate-500"
            >
              Mark all episodes as watched
            </button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="DELETE_SHOW" />
            <input type="hidden" name="showId" value={show.id} />
            <button
              type="submit"
              className="mt-4 rounded bg-red-300 py-2 px-4 text-black hover:bg-red-200 active:bg-red-200"
            >
              Remove show
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
