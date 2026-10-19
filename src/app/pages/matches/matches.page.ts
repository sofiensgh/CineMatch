import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonAvatar,
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonNote,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { filmOutline, heartOutline, peopleOutline, personCircleOutline } from 'ionicons/icons';
import { combineLatest, map } from 'rxjs';

import { Movie } from '../../models/movie';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { MATCH_THRESHOLD, MatchingService } from '../../services/matching.service';

interface MatchView {
  user: User;
  rate: number;
  commonMovies: Movie[];
}

interface MatchesState {
  hasFavorites: boolean;
  matches: MatchView[];
}

@Component({
  selector: 'app-matches',
  templateUrl: './matches.page.html',
  styleUrls: ['./matches.page.scss'],
  imports: [
    AsyncPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonNote,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonAvatar,
    IonBadge,
    IonProgressBar,
    IonChip,
    IonLabel
  ]
})
export class MatchesPage {
  private auth = inject(AuthService);
  private matching = inject(MatchingService);

  readonly threshold = MATCH_THRESHOLD;

  readonly state$ = combineLatest([
    this.auth.currentUser$,
    this.auth.users$,
    inject(CatalogService).movies$
  ]).pipe(
    map(([current, users, movies]): MatchesState => {
      if (!current || current.favorites.length === 0) return { hasFavorites: false, matches: [] };
      const byId = new Map(movies.map(m => [m.id, m]));
      const matches = this.matching.getMatches(current, users).map(m => ({
        user: m.user,
        rate: m.rate,
        commonMovies: m.commonIds.map(id => byId.get(id)).filter((x): x is Movie => !!x)
      }));
      return { hasFavorites: true, matches };
    })
  );

  constructor() {
    addIcons({ heartOutline, peopleOutline, filmOutline, personCircleOutline });
  }
}
