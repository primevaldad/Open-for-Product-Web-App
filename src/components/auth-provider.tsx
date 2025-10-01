
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { findUserById } from '@/lib/data.client';

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
            console.log('[CLIENT_AUTH_TRACE] onAuthStateChanged fired. User is present.');
            // When a user logs in on the client, get their ID token
            const idToken = await firebaseUser.getIdToken(true);
            console.log('[CLIENT_AUTH_TRACE] ID Token retrieved. Sending to server...');
            // and send it to the server to create a session cookie.
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (response.ok) {
                console.log('[CLIENT_AUTH_TRACE] Server responded OK. Session should be created.');
            } else {
                console.error('[CLIENT_AUTH_TRACE] Server responded with an error:', await response.text());
                if (response.status === 401) {
                    // This specific error means the server requires a recent sign-in.
                    // The best way to handle this is to sign the user out on the client,
                    // which will then trigger the app to prompt for re-login.
                    await signOut(auth);
                    return;
                }
            }

            // If Firebase gives us a user, we fetch our detailed user profile from our database.
            // Note: In a real app, you might want to handle the case where findUserById returns undefined.
            const appUser = await findUserById(firebaseUser.uid);
            setCurrentUser(appUser || null);
        } else {
            console.log('[CLIENT_AUTH_TRACE] onAuthStateChanged fired. User is NOT present.');
            // If the user logs out on the client, we must clear the server session.
            await fetch('/api/auth/session', { method: 'DELETE' });
            console.log('[CLIENT_AUTH_TRACE] Sent request to delete server session.');
            
            // Clear the user state in the context.
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
