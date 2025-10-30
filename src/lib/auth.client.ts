
import { auth } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useEffect, useState } from 'react';

/**
 * Signs in the user anonymously if they are not already signed in.
 * Returns the current user.
 */
export async function signInAnonymouslyIfNeeded(): Promise<FirebaseUser | null> {
  if (!auth.currentUser) {
    try {
      const userCredential = await signInAnonymously(auth);
      console.log('Signed in anonymously:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      return null;
    }
  }
  return auth.currentUser;
}

/**
 * A React hook to manage the Firebase auth state.
 * It ensures anonymous sign-in is attempted and provides the user object.
 * @returns The Firebase user object, or null if not signed in.
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const ensureUser = async () => {
      const currentUser = await signInAnonymouslyIfNeeded();
      setUser(currentUser);
    };

    ensureUser();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  return user;
}
