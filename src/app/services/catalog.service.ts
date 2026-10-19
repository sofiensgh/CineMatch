import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';

import { Movie } from '../models/movie';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private moviesRef = collection(this.firestore, 'movies');

  readonly movies$: Observable<Movie[]> = authState(this.auth).pipe(
    switchMap(user =>
      user
        ? collectionData(this.moviesRef, { idField: 'id' }).pipe(
            map(docs =>
              (docs as Movie[]).sort((a, b) =>
                a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
              )
            ),
            catchError(() => of([] as Movie[]))
          )
        : of([] as Movie[])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  async addMovie(data: Pick<Movie, 'title' | 'overview' | 'posterUrl' | 'releaseDate'>): Promise<void> {
    const ref = doc(this.moviesRef);
    const movie: Movie = {
      id: ref.id,
      title: data.title.trim(),
      overview: data.overview.trim(),
      posterUrl: data.posterUrl.trim(),
      releaseDate: data.releaseDate.trim(),
      source: 'admin'
    };
    await setDoc(ref, movie);
  }

  async ensureMovie(movie: Movie): Promise<void> {
    const ref = doc(this.firestore, `movies/${movie.id}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, this.clean(movie));
  }

  async importMovies(movies: Movie[]): Promise<number> {
    if (movies.length === 0) return 0;
    const batch = writeBatch(this.firestore);
    movies.forEach(m => batch.set(doc(this.firestore, `movies/${m.id}`), this.clean(m), { merge: true }));
    await batch.commit();
    return movies.length;
  }

  async deleteMovie(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `movies/${id}`));
  }

  private clean(movie: Movie): Movie {
    const result: Movie = {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterUrl: movie.posterUrl,
      releaseDate: movie.releaseDate,
      source: movie.source
    };
    if (movie.tmdbId !== undefined) result.tmdbId = movie.tmdbId;
    return result;
  }
}
