import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';

import { Movie } from '../models/movie';
import { environment } from '../../environments/environment';

interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
}

interface TmdbPage {
  results: TmdbMovie[];
}

@Injectable({ providedIn: 'root' })
export class MovieService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.themoviedb.org/3';
  private imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  get isConfigured(): boolean {
    return !!environment.tmdbApiKey;
  }

  getPopularMovies(page = 1): Observable<Movie[]> {
    return this.request('/movie/popular', { page: String(page) });
  }

  searchMovies(query: string): Observable<Movie[]> {
    return this.request('/search/movie', { query });
  }

  private request(path: string, params: Record<string, string>): Observable<Movie[]> {
    if (!this.isConfigured) return of([]);
    return this.http
      .get<TmdbPage>(`${this.baseUrl}${path}`, {
        params: { api_key: environment.tmdbApiKey, language: 'fr-FR', ...params }
      })
      .pipe(map(res => (res?.results ?? []).map(m => this.toMovie(m))));
  }

  private toMovie(m: TmdbMovie): Movie {
    return {
      id: `tmdb-${m.id}`,
      tmdbId: m.id,
      title: m.title ?? m.name ?? 'Sans titre',
      overview: m.overview ?? '',
      posterUrl: m.poster_path ? `${this.imageBaseUrl}${m.poster_path}` : '',
      releaseDate: m.release_date ?? '',
      source: 'tmdb'
    };
  }
}
