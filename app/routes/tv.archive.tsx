import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigation } from "react-router";

import ShowTiles from "../components/show-tiles";
import Spinner from "../components/spinner";
import { evaluateBoolean, FLAGS } from "../flags.server";
import { getArchivedShowsByUserId } from "../models/show.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const shows = await getArchivedShowsByUserId(userId);
  const features = {
    archive: await evaluateBoolean(request, FLAGS.ARCHIVE),
  };

  return { shows, features };
}

function Loader() {
  return (
    <div className="mt-4">
      <Spinner />
    </div>
  );
}

export default function TVArchive() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoading = !!navigation.formData;

  if (!data.features.archive) {
    return <p className="mt-9">Archive is currently unavailable.</p>;
  }

  return (
    <>
      {isLoading && <Loader />}

      <h1 className="mt-9 font-title text-5xl">Your archive</h1>
      {data.shows.length === 0 && (
        <p className="mt-9">You have no archived shows yet.</p>
      )}
      {data.shows.length > 0 && (
        <div className="mt-6">
          <ShowTiles shows={data.shows} />
        </div>
      )}
    </>
  );
}
