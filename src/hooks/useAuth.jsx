import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import pb from "../lib/pocketbaseClient";

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "mousemove", "scroll", "touchstart", "click"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const lastActivity = useRef(Date.now());
  const inactivityCheckRef = useRef(null);
  const userRef = useRef(null);

  const forceLogout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
    setProfile(null);
  }, []);

  const handleActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));

    setIsOffline(!navigator.onLine);

    if (pb.authStore.isValid) {
      const model = pb.authStore.model;
      userRef.current = model;
      setUser(model);
      setProfile(model);
    }
    setLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      userRef.current = model;
      setUser(model);
      setProfile(model);
      setLoading(false);
      if (model) lastActivity.current = Date.now();
    });

    inactivityCheckRef.current = setInterval(() => {
      if (userRef.current && Date.now() - lastActivity.current > INACTIVITY_TIMEOUT) {
        forceLogout();
      }
    }, 60000);

    return () => {
      clearTimeout(safetyTimer);
      if (typeof unsubscribe === "function") unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      if (inactivityCheckRef.current) clearInterval(inactivityCheckRef.current);
    };
  }, [forceLogout, handleActivity]);

  async function fetchProfile(userId, retry = true) {
    try {
      const record = await pb.collection("users").getOne(userId);
      setProfile(record);
      setUser(record);
    } catch (err) {
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
