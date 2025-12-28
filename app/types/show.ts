export interface SearchResultShow {
  mazeId: number;
  name: string;
  premiered: Date | string;
  ended: Date | null;
  rating: number | null;
  imageUrl: string | null;
  summary: string;
}
