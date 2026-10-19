import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular';
import { filter } from 'rxjs';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.html',
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastController);

  constructor() {
    this.auth.currentUser$
      .pipe(
        filter(user => !!user?.isDisabled),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(async () => {
        await this.auth.logout();
        await this.router.navigateByUrl('/auth', { replaceUrl: true });
        const toast = await this.toast.create({
          message: "Votre compte a été désactivé par l'administrateur.",
          color: 'danger',
          duration: 3000
        });
        await toast.present();
      });
  }
}
