import { useState, useEffect, createContext, useContext } from "react";
import pb from "../lib/pocketbaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOffline(!navigator.onLine);

    if (pb.authStore.isValid) {
      const model = pb.authStore.model;
      setUser(model);
      setProfile(model);
    }
    setLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
      setProfile(model);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function fetchProfile(userId, retry = true) {
    try {
      const record = await pb.collection("users").getOne(userId);
      setProfile(record);
      setUser(record);
    } catch (err) {
      console.error("Error fetching profile:", err);
      if (retry && !isOffline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetchProfile(userId, false);
      }
      setProfile({ id: userId, role: "user", name: "Usuario" });
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const authData = await pb.collection("users").authWithPassword(email, password);
    return authData;
  }

  async function signOut() {
    pb.authStore.clear();
  }

  async function refreshProfile() {
    if (pb.authStore.model?.id) {
      await fetchProfile(pb.authStore.model.id, true);
    }
  }

  const value = {
    user,
    profile,
    loading,
    isOffline,
    signIn,
    signOut,
    refreshProfile,
    isAdmin: profile?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
