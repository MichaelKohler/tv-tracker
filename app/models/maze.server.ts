import type { Show } from "@prisma/client";

import { TV_SEARCH_API_PREFIX, TV_GET_API_PREFIX } from "../constants";
import type {
  TVMazeShowResponse,
  TVMazeSearchResult,
} from "../types/tvmaze";

const FETCH_TIMEOUT_MS = 10000;

export class TVMazeAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = "TVMazeAPIError";
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new TVMazeAPIError(
        `Request timeout after ${timeoutMs}ms for URL: ${url}`,
        undefined,
        error
      );
    }
    throw new TVMazeAPIError(
      `Network error while fetching URL: ${url}`,
      undefined,
      error
    );
  }
}

async function parseJSONResponse<T>(
  response: Response,
  url: string
): Promise<T> {
  try {
    return await response.json();
  } catch (error) {
    throw new TVMazeAPIError(
      `Failed to parse JSON response from URL: ${url}`,
      response.status,
      error
    );
  }
}

export async function fetchShowWithEmbededEpisodes(
  showId: Show["mazeId"]
): Promise<TVMazeShowResponse> {
  const url = `${TV_GET_API_PREFIX}${showId}?&embed=episodes`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new TVMazeAPIError(
      `Failed to fetch show with ID ${showId}: ${response.statusText}`,
      response.status
    );
  }

  const result = await parseJSONResponse<TVMazeShowResponse>(response, url);

  if (!result || typeof result !== "object") {
    throw new TVMazeAPIError(
      `Invalid response format for show with ID ${showId}`,
      response.status
    );
  }

  return result;
}

export async function fetchSearchResults(
  query: string
): Promise<TVMazeSearchResult[]> {
  const url = `${TV_SEARCH_API_PREFIX}${query}`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new TVMazeAPIError(
      `Failed to search for shows with query "${query}": ${response.statusText}`,
      response.status
    );
  }

  const result = await parseJSONResponse<TVMazeSearchResult[]>(response, url);

  if (!Array.isArray(result)) {
    throw new TVMazeAPIError(
      `Invalid response format for search query "${query}": expected array`,
      response.status
    );
  }

  return result;
}
