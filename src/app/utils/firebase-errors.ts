const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/missing-password': 'Mot de passe requis.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/email-already-in-use': 'Cet email est déjà utilisé.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard.',
  'auth/network-request-failed': 'Problème de connexion réseau.',
  'permission-denied': 'Action non autorisée par les règles Firestore.'
};

export function errorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  const code = (error as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  const message = (error as { message?: string })?.message;
  return message || fallback;
}
