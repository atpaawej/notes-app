"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import { signInWithFirebase, signOutAction } from "@/app/actions/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken(true);

    const response = await signInWithFirebase(idToken);
    if (!response.ok) {
      await firebaseSignOut(auth);
      toast.error(response.error);
      throw new Error(response.error);
    }

    router.push("/dashboard");
    router.refresh();
  }, [router]);

  const signOut = React.useCallback(async () => {
    await signOutAction();
    await firebaseSignOut(auth).catch(() => {
      // ignore — server already cleared the cookie
    });
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const value = React.useMemo(
    () => ({ user, loading, signInWithGoogle, signOut }),
    [user, loading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}