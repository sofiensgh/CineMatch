import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
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

  private static readonly DRAFT_KEY = 'cinematch-signup-draft';

  constructor() {
    addIcons({ cameraOutline });
    this.restoreDraft();
  }

  toggleMode(form: NgForm): void {
    this.isLoginMode = !this.isLoginMode;
    form.resetForm({ email: this.email });
    this.password = '';
    this.clearDraft();
  }

  async capturePhoto(): Promise<void> {
    this.saveDraft();
    try {
      this.photoUrl = await this.auth.takePhoto();
      this.saveDraft();
    } catch (e) {
      const message = errorMessage(e, '');
      if (!/cancel/i.test(message)) await this.showToast(message || 'Impossible de prendre la photo.');
    }
  }

  private saveDraft(): void {
    try {
      sessionStorage.setItem(
        AuthPage.DRAFT_KEY,
        JSON.stringify({
          nom: this.nom,
          prenom: this.prenom,
          age: this.age,
          email: this.email,
          photoUrl: this.photoUrl
        })
      );
    } catch {
      return;
    }
  }

  private restoreDraft(): void {
    try {
      const raw = sessionStorage.getItem(AuthPage.DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      this.isLoginMode = false;
      this.nom = draft.nom ?? '';
      this.prenom = draft.prenom ?? '';
      this.age = draft.age ?? null;
      this.email = draft.email ?? '';
      this.photoUrl = draft.photoUrl ?? '';
    } catch {
      this.clearDraft();
    }
  }

  private clearDraft(): void {
    try {
      sessionStorage.removeItem(AuthPage.DRAFT_KEY);
    } catch {
      return;
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
      this.clearDraft();
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
