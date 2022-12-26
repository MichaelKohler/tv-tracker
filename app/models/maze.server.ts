import type { Show } from "@prisma/client";

import { TV_SEARCH_API_PREFIX, TV_GET_API_PREFIX } from "../constants";

export async function fetchShowWithEmbededEpisodes(showId: Show["mazeId"]) {
  const response = await fetch(`${TV_GET_API_PREFIX}${showId}?&embed=episodes`);
  const result = await response.json();
  return result;
}

export async function fetchSearchResults(query: String) {
  const response = await fetch(`${TV_SEARCH_API_PREFIX}${query}`);
  const result = await response.json();
  return result;
}
