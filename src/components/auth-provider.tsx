
'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { onAuthStateChanged, signOut as firebaseSignOut, getIdToken } from 'firebase/auth';
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
  serverUser: User | null;
  children: ReactNode;
}

export function AuthProvider({ serverUser: initialServerUser, children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(initialServerUser);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setLoading(true);
    // Sign out from Firebase on the client
    await firebaseSignOut(auth);
    // Explicitly destroy the server session by calling our new endpoint
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If the server-side session user exists, and it does not match the
      // client-side Firebase user, the server is the source of truth.
      // Sign out the mismatched client user to force alignment.
      if (initialServerUser && firebaseUser && initialServerUser.id !== firebaseUser.uid) {
        await firebaseSignOut(auth);
        return;
      }

      // Case 1: Firebase has a user.
      if (firebaseUser) {
        // If the client-side user is the same as the server user, we're in sync.
        if (initialServerUser && firebaseUser.uid === initialServerUser.id) {
            setCurrentUser(initialServerUser);
        } else {
            // Case 2: No server session, but Firebase user exists (e.g., first login).
            // Create the server session.
            const token = await getIdToken(firebaseUser);
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token }),
            });
            // Fetch the full user profile from our DB
            const appUser = await findUserById(firebaseUser.uid);
            setCurrentUser(appUser || null);
        }
      } else {
        // Case 3: No Firebase user.
        // If there was a server user, it's a mismatch (e.g., user logged out in another tab).
        // Clear the local state. The server session will be the single source of truth on next load.
        if (initialServerUser) {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, [initialServerUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
