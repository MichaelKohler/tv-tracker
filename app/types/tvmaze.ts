// Shared type definitions for TVMaze API responses

export interface TVMazeShowResponse {
  id: number;
  name: string;
  status: string;
  ended: string | null;
  premiered: string;
  rating: {
    average: number;
  } | null;
  summary: string;
  image: {
    medium: string;
  } | null;
  _embedded?: {
    episodes: TVMazeEpisodeResponse[];
  };
  [key: string]: unknown;
}

export interface TVMazeEpisodeResponse {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  airstamp: string;
  summary: string | null;
  image?: {
    medium: string;
  } | null;
  [key: string]: unknown;
}

// Type alias for the embedded episodes in show responses
export type EmbeddedEpisode = TVMazeEpisodeResponse;
