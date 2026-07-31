import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  const logout = async () => {
    try {
      await auth.logout();
      setUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        handleAuthSuccess,
        logout,
        updateUser,
        isAuthenticated: !!user && !!user.role && !user.isPendingSignUp,
        isAdmin: user?.role === "admin",
        isMonaguillo: user?.role === "monaguillo",
        isPadre: user?.role === "padre",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}
