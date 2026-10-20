import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { filmOutline, heartOutline, trashOutline } from 'ionicons/icons';
import { combineLatest, map } from 'rxjs';

import { Movie } from '../../models/movie';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { errorMessage } from '../../utils/firebase-errors';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  imports: [
    AsyncPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonNote,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonIcon,
    IonButton,
    IonItemSliding,
    IonItemOptions,
    IonItemOption
  ]
})
export class FavoritesPage {
  private auth = inject(AuthService);
  private toast = inject(ToastController);

  readonly favorites$ = combineLatest([this.auth.currentUser$, inject(CatalogService).movies$]).pipe(
    map(([user, movies]) => {
      const ids = new Set(user?.favorites ?? []);
      return movies.filter(m => ids.has(m.id));
    })
  );

  constructor() {
    addIcons({ heartOutline, trashOutline, filmOutline });
  }

  async remove(movie: Movie, sliding?: IonItemSliding): Promise<void> {
    await sliding?.close();
    const uid = this.auth.currentUid;
    if (!uid) return;
    try {
      await this.auth.removeFavorite(uid, movie.id);
    } catch (e) {
      const toast = await this.toast.create({ message: errorMessage(e), color: 'danger', duration: 3000 });
      await toast.present();
    }
  }
}
