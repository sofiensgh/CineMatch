import { Injectable, inject } from '@angular/core';
import {
  Auth,
  User as FirebaseUser,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from '@angular/fire/auth';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';

import { NewUserProfile, User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  readonly authUser$: Observable<FirebaseUser | null> = authState(this.auth);

  readonly currentUser$: Observable<User | null> = this.authUser$.pipe(
    switchMap(fbUser =>
      fbUser
        ? docData(doc(this.firestore, `users/${fbUser.uid}`)).pipe(
            map(data => (data ? this.normalize({ ...data, uid: fbUser.uid }) : null)),
            catchError(() => of(null))
          )
        : of(null)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly users$: Observable<User[]> = this.authUser$.pipe(
    switchMap(fbUser =>
      fbUser
        ? collectionData(collection(this.firestore, 'users'), { idField: 'uid' }).pipe(
            map(docs => docs.map(d => this.normalize(d))),
            catchError(() => of([] as User[]))
          )
        : of([] as User[])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  get currentUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  async takePhoto(): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      const file = await this.pickWebPhoto();
      return this.fileToDataUrl(file, 320);
    }

    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.DataUrl,
      quality: 70,
      width: 600,
      correctOrientation: true
    });
    if (!photo.dataUrl) throw new Error('Aucune photo récupérée.');
    return this.resize(photo.dataUrl, 320);
  }

  private pickWebPhoto(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'user');
      input.style.display = 'none';
      const done = () => input.remove();
      input.addEventListener(
        'change',
        () => {
          const file = input.files?.[0];
          done();
          if (file) resolve(file);
          else reject(new Error('cancelled'));
        },
        { once: true }
      );
      input.addEventListener(
        'cancel',
        () => {
          done();
          reject(new Error('cancelled'));
        },
        { once: true }
      );
      document.body.appendChild(input);
      input.click();
    });
  }

  private async fileToDataUrl(file: File, maxSize: number): Promise<string> {
    try {
      const probe = await createImageBitmap(file);
      const scale = Math.min(1, maxSize / Math.max(probe.width, probe.height));
      const width = Math.max(1, Math.round(probe.width * scale));
      const height = Math.max(1, Math.round(probe.height * scale));
      probe.close();
      const bitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'medium'
      });
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', 0.75);
    } catch {
      const url = URL.createObjectURL(file);
      try {
        return await this.resize(url, maxSize);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }

  async register(email: string, password: string, profile: NewUserProfile): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const uid = credential.user.uid;
    const role: User['role'] =
      email.trim().toLowerCase() === environment.adminEmail.toLowerCase() ? 'admin' : 'user';

    const user: User = {
      uid,
      email: email.trim(),
      nom: profile.nom.trim(),
      prenom: profile.prenom.trim(),
      age: Number(profile.age),
      photoUrl: profile.photoUrl,
      role,
      isDisabled: false,
      favorites: []
    };
    await setDoc(doc(this.firestore, `users/${uid}`), user);
  }

  async login(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    const profile = await this.getUserData(credential.user.uid);

    if (!profile) {
      await this.logout();
      throw new Error('Profil introuvable.');
    }
    if (profile.isDisabled) {
      await this.logout();
      throw new Error("Votre compte a été désactivé par l'administrateur.");
    }
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  async getUserData(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(this.firestore, `users/${uid}`));
    return snap.exists() ? this.normalize({ ...snap.data(), uid }) : null;
  }

  setUserDisabled(uid: string, isDisabled: boolean): Promise<void> {
    return updateDoc(doc(this.firestore, `users/${uid}`), { isDisabled });
  }

  updatePhoto(uid: string, photoUrl: string): Promise<void> {
    return updateDoc(doc(this.firestore, `users/${uid}`), { photoUrl });
  }

  addFavorite(uid: string, movieId: string): Promise<void> {
    return updateDoc(doc(this.firestore, `users/${uid}`), { favorites: arrayUnion(movieId) });
  }

  removeFavorite(uid: string, movieId: string): Promise<void> {
    return updateDoc(doc(this.firestore, `users/${uid}`), { favorites: arrayRemove(movieId) });
  }

  private normalize(data: Record<string, unknown>): User {
    const user = data as unknown as User;
    return {
      ...user,
      age: Number(user.age) || 0,
      role: user.role === 'admin' ? 'admin' : 'user',
      isDisabled: !!user.isDisabled,
      favorites: Array.isArray(user.favorites) ? user.favorites.map(String) : []
    };
  }

  private resize(dataUrl: string, maxSize: number): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }
}
