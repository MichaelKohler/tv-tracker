// Shared type definitions for TVMaze API responses

export interface TVMazeShowResponse {
  id: number;
  name: string;
  status: string;
  ended: string | null;
  premiered: string | null;
  rating: {
    average: number | null;
  };
  summary: string | null;
  image: {
    medium: string;
  } | null;
  _embedded?: {
    episodes: TVMazeEpisodeResponse[];
  };
  [key: string]: unknown;
}

export interface TVMazeSearchResult {
  show: TVMazeShowResponse;
  score: number;
}

export interface TVMazeEpisodeResponse {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  airstamp: string;
  runtime: number | null;
  summary: string | null;
  image: {
    medium: string;
  } | null;
  [key: string]: unknown;
}

export interface TVMazeSearchResult {
  score: number;
  show: TVMazeShowResponse;
}
