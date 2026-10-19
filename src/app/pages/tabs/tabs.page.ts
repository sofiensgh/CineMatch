import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { filmOutline, heartOutline, peopleOutline, personOutline, shieldOutline } from 'ionicons/icons';
import { map } from 'rxjs';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [AsyncPipe, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel]
})
export class TabsPage {
  readonly isAdmin$ = inject(AuthService).currentUser$.pipe(map(u => u?.role === 'admin'));

  constructor() {
    addIcons({ filmOutline, heartOutline, peopleOutline, shieldOutline, personOutline });
  }
}
