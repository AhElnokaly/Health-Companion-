import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, disableNetwork, enableNetwork } from 'firebase/firestore';

interface AuthContextType {
  user: User | { uid: string, displayName?: string, email?: string } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInGuest: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isGuestMemory = localStorage.getItem('isGuestMode') === 'true';

    if (isGuestMemory) {
      disableNetwork(db).then(() => {
        setUser({ uid: 'local_guest_user', displayName: 'زائر محلي', email: '' });
        setLoading(false);
      }).catch(console.error);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentlyGuest = localStorage.getItem('isGuestMode') === 'true';
      if (currentUser) {
        try {
          if (currentlyGuest) {
            localStorage.setItem('isGuestMode', 'false');
            await enableNetwork(db);
          }
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newUserData: any = {
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            if (currentUser.email) newUserData.email = currentUser.email;
            if (currentUser.displayName) newUserData.name = currentUser.displayName;
            
            await setDoc(userDocRef, newUserData);
          }
          setUser(currentUser);
        } catch (error) {
          console.error("Error creating user document: ", error);
        }
        setLoading(false);
      } else {
        if (!localStorage.getItem('isGuestMode') || localStorage.getItem('isGuestMode') !== 'true') {
           setUser(null);
           setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await enableNetwork(db).catch(() => {});
      localStorage.setItem('isGuestMode', 'false');
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signInGuest = async () => {
    try {
      localStorage.setItem('isGuestMode', 'true');
      await disableNetwork(db);
      setUser({ uid: 'local_guest_user', displayName: 'زائر', email: '' });
    } catch (error) {
      console.error("Error signing in as guest", error);
    }
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('isGuestMode') === 'true') {
        localStorage.removeItem('isGuestMode');
        await enableNetwork(db).catch(() => {});
        setUser(null);
      } else {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
