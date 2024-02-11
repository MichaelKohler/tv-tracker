import { Form, useNavigation } from "@remix-run/react";

import type { FrontendShow } from "../utils";
import Spinner from "./spinner";

interface Props {
  show: FrontendShow;
}

export default function ShowResult({ show }: Props) {
  const navigation = useNavigation();
  const isAddingShow = navigation?.formData?.get("intent") === "add-show";
  const addingShowId = navigation?.formData?.get("showId");

  return (
    <div className="my-3 flex flex-row rounded-lg border-2 border-mklight-300 bg-mklight-100 px-5 py-5">
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
                className="mt-4 rounded bg-mk px-4 py-2 text-white hover:bg-mk-tertiary active:bg-mk-tertiary"
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
