
'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { onAuthStateChanged, signOut as firebaseSignOut, getIdToken, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { findUserById } from '@/lib/data.client';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  serverUser: User | null; // Prop for initial server-rendered user
  children: ReactNode;
}

export function AuthProvider({ serverUser, children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(serverUser);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
        await firebaseSignOut(auth);
        await fetch('/api/auth/logout', { method: 'POST' });
        setCurrentUser(null);
        setLoading(false);
        // onAuthStateChanged will handle signing in a new anonymous user
    } catch (error) {
        console.error('Sign-out failed:', error);
        setLoading(false);
        }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // A user is signed in (either regular or anonymous).
        // Sync this state with the backend to create a session.
        const token = await getIdToken(firebaseUser);
        
        const sessionResponse = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token }),
        });

        if (sessionResponse.ok) {
            // Session created, now fetch the app-specific user profile.
            const appUser = await findUserById(firebaseUser.uid);
            setCurrentUser(appUser || null);
        } else {
            console.error('Failed to create session, signing out:', await sessionResponse.text());
            // If the session creation fails (e.g., token is invalid), sign out fully.
            await signOut();
        }

      } else {
        // No user is signed in to Firebase on the client.
        // Attempt to sign them in anonymously.
        try {
          await signInAnonymously(auth);
          // The listener will re-run with the new anonymous user.
        } catch (error) {
          console.error('Automatic anonymous sign-in failed:', error);
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

