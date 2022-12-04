import type { Show } from "@prisma/client";

interface Props {
  show: Show;
}

export default function ShowResult({ show }: Props) {
  return (
    <>
      <div className="my-3 flex flex-row rounded-lg border-2 border-slate-300 bg-slate-50 py-5 px-5">
        <div className="flex flex-none flex-col">
          <img src={show.image_url} alt="" />
        </div>
        <div className="flex flex-col">
          <div
            className={`flex flex-col ${show.image_url ? "pl-10" : ""} pr-10`}
          >
            <h2 className="font-title text-lg">{show.name}</h2>
            <p>{show.summary}</p>
          </div>
          <div
            className={`flex flex-col ${
              show.image_url ? "pl-10" : ""
            } py-5 pr-10`}
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
          </div>
        </div>
      </div>
    </>
  );
}
