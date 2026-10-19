export interface User {
  uid: string;
  email: string;
  nom: string;
  prenom: string;
  age: number;
  photoUrl: string;
  role: 'user' | 'admin';
  isDisabled: boolean;
  favorites: string[];
}

export type NewUserProfile = Pick<User, 'nom' | 'prenom' | 'age' | 'photoUrl'>;
