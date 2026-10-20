import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  heartOutline,
  logOutOutline,
  mailOutline,
  personCircleOutline,
  personOutline
} from 'ionicons/icons';

import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { errorMessage } from '../../utils/firebase-errors';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    AsyncPipe,
    IonContent,
    IonAvatar,
    IonBadge,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonNote,
    IonButton
  ]
})
export class ProfilePage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastController);

  readonly currentUser$ = this.auth.currentUser$;
  updatingPhoto = false;

  constructor() {
    addIcons({ personOutline, heartOutline, logOutOutline, cameraOutline, mailOutline, personCircleOutline });
  }

  async changePhoto(user: User): Promise<void> {
    this.updatingPhoto = true;
    try {
      const photoUrl = await this.auth.takePhoto();
      await this.auth.updatePhoto(user.uid, photoUrl);
    } catch (e) {
      const message = errorMessage(e, '');
      if (!/cancel/i.test(message)) {
        const toast = await this.toast.create({
          message: message || 'Impossible de mettre à jour la photo.',
          color: 'danger',
          duration: 3000
        });
        await toast.present();
      }
    } finally {
      this.updatingPhoto = false;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
