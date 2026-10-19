import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { filmOutline, heart, heartOutline } from 'ionicons/icons';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { Movie } from '../../models/movie';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { MovieService } from '../../services/movie.service';
import { errorMessage } from '../../utils/firebase-errors';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonSearchbar,
    IonNote,
    IonSpinner,
    IonIcon
  ]
})
export class HomePage implements OnInit {
  private auth = inject(AuthService);
  private catalogService = inject(CatalogService);
  private movieService = inject(MovieService);
  private toast = inject(ToastController);
  private destroyRef = inject(DestroyRef);
  private search$ = new Subject<string>();

  user: User | null = null;
  catalog: Movie[] = [];
  popular: Movie[] = [];
  tmdbResults: Movie[] = [];
  query = '';
  loading = true;
  searching = false;
  pending = new Set<string>();

  constructor() {
    addIcons({ heart, heartOutline, filmOutline });
  }

  get tmdbEnabled(): boolean {
    return this.movieService.isConfigured;
  }

  get displayed(): Movie[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.merge(this.catalog, this.popular);
    const local = this.catalog.filter(m => m.title.toLowerCase().includes(q));
    return this.merge(local, this.tmdbResults);
  }

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => (this.user = user));

    this.catalogService.movies$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: movies => {
        this.catalog = movies;
        this.loading = false;
      },
      error: e => {
        this.loading = false;
        this.showToast(errorMessage(e));
      }
    });

    this.movieService
      .getPopularMovies()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(movies => (this.popular = movies));

    this.search$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(q => {
          this.searching = !!q && this.tmdbEnabled;
          return q ? this.movieService.searchMovies(q).pipe(catchError(() => of([]))) : of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(results => {
        this.tmdbResults = results;
        this.searching = false;
      });
  }

  onSearch(event: CustomEvent): void {
    this.query = String(event.detail.value ?? '');
    this.search$.next(this.query.trim());
  }

  isFavorite(movie: Movie): boolean {
    return this.user?.favorites.includes(movie.id) ?? false;
  }

  async toggleFavorite(movie: Movie): Promise<void> {
    if (!this.user || this.pending.has(movie.id)) return;
    this.pending.add(movie.id);
    try {
      if (this.isFavorite(movie)) {
        await this.auth.removeFavorite(this.user.uid, movie.id);
      } else {
        if (!this.catalog.some(m => m.id === movie.id)) await this.catalogService.ensureMovie(movie);
        await this.auth.addFavorite(this.user.uid, movie.id);
      }
    } catch (e) {
      await this.showToast(errorMessage(e));
    } finally {
      this.pending.delete(movie.id);
    }
  }

  private merge(primary: Movie[], secondary: Movie[]): Movie[] {
    const ids = new Set(primary.map(m => m.id));
    return [...primary, ...secondary.filter(m => !ids.has(m.id))];
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toast.create({ message, color: 'danger', duration: 3000 });
    await toast.present();
  }
}
