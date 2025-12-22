'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
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
  const sessionErrorOccurred = useRef(false);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST' });
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  }, []);

  useEffect(() => {
    const handleAuthChange = async (firebaseUser: import('firebase/auth').User | null) => {
      setLoading(true);
      if (firebaseUser) {
        // If we have a firebase user, it means any previous session error is resolved, so we reset the flag.
        sessionErrorOccurred.current = false;
        const token = await getIdToken(firebaseUser);
        const sessionResponse = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        });

        if (sessionResponse.ok) {
          const appUser = await findUserById(firebaseUser.uid);
          setCurrentUser(appUser || null);
        } else {
          console.error('Failed to create session, signing out:', await sessionResponse.text());
          // Set the flag to prevent a retry loop
          sessionErrorOccurred.current = true;
          await firebaseSignOut(auth);
          await fetch('/api/auth/logout', { method: 'POST' });
        }
      } else {
        // No user is signed in to Firebase on the client.
        setCurrentUser(null);
        // Only attempt to sign in anonymously if we didn't just fail to create a session.
        if (!sessionErrorOccurred.current) {
            try {
              await signInAnonymously(auth);
              // The listener will re-run with the new anonymous user.
            } catch (error) {
              console.error('Automatic anonymous sign-in failed:', error);
            }
        }
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);

    return () => unsubscribe();
  }, []); // Empty dependency array is key.

  return (
    <AuthContext.Provider value={{ currentUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
