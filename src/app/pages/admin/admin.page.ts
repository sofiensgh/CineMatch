import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import {
  AlertController,
  IonAvatar,
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonThumbnail,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  cloudDownloadOutline,
  filmOutline,
  personCircleOutline,
  trashOutline
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { Movie } from '../../models/movie';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { MovieService } from '../../services/movie.service';
import { errorMessage } from '../../utils/firebase-errors';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonInput,
    IonTextarea,
    IonButton,
    IonAvatar,
    IonNote,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonThumbnail,
    IonBadge,
    IonToggle,
    IonLabel
  ]
})
export class AdminPage implements OnInit {
  private auth = inject(AuthService);
  private catalog = inject(CatalogService);
  private movieService = inject(MovieService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private destroyRef = inject(DestroyRef);

  tab: 'movies' | 'users' = 'movies';
  newMovie = { title: '', overview: '', posterUrl: '', releaseDate: '' };
  movies: Movie[] = [];
  users: User[] = [];
  loadingMovies = true;
  loadingUsers = true;
  saving = false;
  importing = false;
  pendingUsers = new Set<string>();

  constructor() {
    addIcons({ addOutline, cloudDownloadOutline, filmOutline, trashOutline, personCircleOutline });
  }

  get currentUid(): string | null {
    return this.auth.currentUid;
  }

  get tmdbEnabled(): boolean {
    return this.movieService.isConfigured;
  }

  ngOnInit(): void {
    this.catalog.movies$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: movies => {
        this.movies = movies;
        this.loadingMovies = false;
      },
      error: e => {
        this.loadingMovies = false;
        this.notify(errorMessage(e), 'danger');
      }
    });

    this.auth.users$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => {
        this.users = users.sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`));
        this.loadingUsers = false;
      },
      error: e => {
        this.loadingUsers = false;
        this.notify(errorMessage(e), 'danger');
      }
    });
  }

  onTabChange(event: CustomEvent): void {
    this.tab = event.detail.value === 'users' ? 'users' : 'movies';
  }

  async addMovie(form: NgForm): Promise<void> {
    if (form.invalid || !this.newMovie.title.trim()) {
      await this.notify('Le titre est obligatoire.', 'warning');
      return;
    }
    this.saving = true;
    try {
      await this.catalog.addMovie(this.newMovie);
      form.resetForm();
      this.newMovie = { title: '', overview: '', posterUrl: '', releaseDate: '' };
      await this.notify('Film ajouté au catalogue.', 'success');
    } catch (e) {
      await this.notify(errorMessage(e), 'danger');
    } finally {
      this.saving = false;
    }
  }

  async importPopular(): Promise<void> {
    this.importing = true;
    try {
      const pages = await Promise.all([1, 2].map(p => firstValueFrom(this.movieService.getPopularMovies(p))));
      const count = await this.catalog.importMovies(pages.flat());
      await this.notify(`${count} film(s) importé(s) depuis TMDB.`, 'success');
    } catch (e) {
      await this.notify(errorMessage(e, "Échec de l'import TMDB."), 'danger');
    } finally {
      this.importing = false;
    }
  }

  async removeMovie(movie: Movie): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Supprimer le film ?',
      message: `« ${movie.title} » sera retiré du catalogue.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.catalog.deleteMovie(movie.id).catch(e => this.notify(errorMessage(e), 'danger'));
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleDisabled(user: User, event: CustomEvent): Promise<void> {
    const isDisabled = !event.detail.checked;
    if (user.uid === this.currentUid || isDisabled === user.isDisabled) return;
    this.pendingUsers.add(user.uid);
    try {
      await this.auth.setUserDisabled(user.uid, isDisabled);
      await this.notify(
        `${user.prenom} ${user.nom} est maintenant ${isDisabled ? 'désactivé' : 'actif'}.`,
        'success'
      );
    } catch (e) {
      await this.notify(errorMessage(e), 'danger');
      const toggle = event.target as HTMLIonToggleElement | null;
      if (toggle) toggle.checked = !user.isDisabled;
    } finally {
      this.pendingUsers.delete(user.uid);
    }
  }

  private async notify(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration: 2500 });
    await toast.present();
  }
}
