export interface Movie {
  id: string;
  title: string;
  overview: string;
  posterUrl: string;
  releaseDate: string;
  source: 'tmdb' | 'admin';
  tmdbId?: number;
}
