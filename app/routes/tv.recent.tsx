import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import UpcomingEpisodesList from "../components/upcoming-episodes-list";
import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import { requireUserId } from "../session.server";
import Spinner from "../components/spinner";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "2");
  const episodes = await getRecentlyWatchedEpisodes(userId, months);

  const groupedEpisodes = episodes.reduce(
    (acc, episode) => {
      const month = new Date(episode.date).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      if (!acc[month]) {
        acc[month] = {
          episodes: [],
          totalRuntime: 0,
          episodeCount: 0,
          showCount: 0,
        };
      }

      acc[month].episodes.push(episode);
      acc[month].totalRuntime += episode.runtime || 0;
      acc[month].episodeCount++;

      return acc;
    },
    {} as Record<
      string,
      {
        episodes: typeof episodes;
        totalRuntime: number;
        episodeCount: number;
        showCount: number;
      }
    >
  );

  Object.values(groupedEpisodes).forEach((group) => {
    group.showCount = new Set(group.episodes.map((e) => e.show.id)).size;
  });

  return groupedEpisodes;
}

export default function TVUpcoming() {
  const initialData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof loader>();
  const [months, setMonths] = useState(2);
  const [data, setData] = useState(initialData);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fetcher.data) {
      setData(fetcher.data);
    }
  }, [fetcher.data]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && fetcher.state === "idle") {
          const newMonths = months + 1;
          setMonths(newMonths);
          fetcher.load(`/tv/recent?months=${newMonths}`);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [months, fetcher]);

  return (
    <>
      <h1 className="font-title text-5xl">Recently watched</h1>
      {Object.keys(data).length === 0 && (
        <p className="mt-9">There are no recently watched episodes.</p>
      )}
      {Object.keys(data).length > 0 && (
        <UpcomingEpisodesList episodes={data} showStats />
      )}
      <div ref={loaderRef} className="flex justify-center p-4">
        {fetcher.state !== "idle" && <Spinner />}
      </div>
    </>
  );
}
