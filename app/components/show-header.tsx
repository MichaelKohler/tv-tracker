import type { FrontendShow } from "~/utils";

interface Props {
  show: FrontendShow;
}

export default function ShowHeader({ show }: Props) {
  return (
    <div className="my-3 flex flex-row py-5">
      <div className="flex min-h-[140px] min-w-[250px] flex-none flex-col">
        {show.imageUrl && <img src={show.imageUrl} alt="" />}
      </div>
      <div className="flex flex-col">
        <div className={`flex flex-col pl-4 pr-10`}>
          <h2 className="font-title text-3xl">{show.name}</h2>
          <p>{show.summary}</p>
        </div>
        <div className={`flex flex-col py-5 pl-4 pr-10`}>
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
  );
}
