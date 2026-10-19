import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const fbUser = await firstValueFrom(auth.authUser$);
  if (!fbUser) return router.createUrlTree(['/auth']);

  const profile = await auth.getUserData(fbUser.uid);
  if (!profile || profile.isDisabled) {
    await auth.logout();
    return router.createUrlTree(['/auth']);
  }
  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const fbUser = await firstValueFrom(auth.authUser$);
  if (!fbUser) return router.createUrlTree(['/auth']);

  const profile = await auth.getUserData(fbUser.uid);
  return profile?.role === 'admin' && !profile.isDisabled
    ? true
    : router.createUrlTree(['/tabs/home']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const fbUser = await firstValueFrom(auth.authUser$);
  if (!fbUser) return true;

  const profile = await auth.getUserData(fbUser.uid);
  if (!profile || profile.isDisabled) {
    await auth.logout();
    return true;
  }
  return router.createUrlTree(['/tabs/home']);
};
