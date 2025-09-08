'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { findUserById } from '@/lib/data-cache';

// 1. Top-level context for auth state
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

// 2. Custom hook for easy access to auth state
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  serverUser: User | null;
  children: React.ReactNode;
}

// 3. AuthProvider component to wrap the app
export function AuthProvider({ serverUser, children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(serverUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have a user from the server, we can assume they are logged in.
    if (serverUser) {
        setCurrentUser(serverUser);
        setLoading(false);
        return;
    }

    // If there is no server user, we set up a listener to respond to client-side auth changes.
    // This is useful for cases like signup or logout which happen entirely on the client.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // If Firebase gives us a user, we fetch our detailed user profile from our database.
            // Note: In a real app, you might want to handle the case where findUserById returns undefined.
            const appUser = await findUserById(firebaseUser.uid);
            setCurrentUser(appUser || null);
        } else {
            // If the user logs out on the client, we clear the user state.
            setCurrentUser(null);
        }
        setLoading(false);
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, [serverUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
