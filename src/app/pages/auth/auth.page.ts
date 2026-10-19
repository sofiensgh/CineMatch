import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline } from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { errorMessage } from '../../utils/firebase-errors';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonIcon,
    IonButton,
    IonNote,
    IonSpinner
  ]
})
export class AuthPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastController);

  isLoginMode = true;
  loading = false;
  nom = '';
  prenom = '';
  age: number | null = null;
  email = '';
  password = '';
  photoUrl = '';

  constructor() {
    addIcons({ cameraOutline });
  }

  toggleMode(form: NgForm): void {
    this.isLoginMode = !this.isLoginMode;
    form.resetForm({ email: this.email });
    this.password = '';
  }

  async capturePhoto(): Promise<void> {
    try {
      this.photoUrl = await this.auth.takePhoto();
    } catch (e) {
      const message = errorMessage(e, '');
      if (!/cancel/i.test(message)) await this.showToast(message || 'Impossible de prendre la photo.');
    }
  }

  async onSubmit(form: NgForm): Promise<void> {
    if (form.invalid) {
      await this.showToast('Veuillez remplir correctement tous les champs.');
      return;
    }
    if (!this.isLoginMode && !this.photoUrl) {
      await this.showToast('Veuillez prendre une photo de profil.');
      return;
    }

    this.loading = true;
    try {
      if (this.isLoginMode) {
        await this.auth.login(this.email, this.password);
      } else {
        await this.auth.register(this.email, this.password, {
          nom: this.nom,
          prenom: this.prenom,
          age: Number(this.age),
          photoUrl: this.photoUrl
        });
      }
      form.resetForm();
      this.photoUrl = '';
      await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } catch (e) {
      await this.showToast(errorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toast.create({ message, color: 'danger', duration: 3000 });
    await toast.present();
  }
}
