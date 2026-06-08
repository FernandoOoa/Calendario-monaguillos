import React, { useState, useEffect } from "react";
import { auth } from "./services/firebase";
import Navigation from "./components/Navigation";
import Auth from "./views/Auth";
import CustomAlertModal from "./components/CustomAlertModal";
import Home from "./views/Home";
import Dashboard from "./views/Dashboard";
import Profile from "./views/Profile";
import Admin from "./views/Admin";
import MassDetailModal from "./views/MassDetailModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // 'home', 'dashboard', 'profile', 'admin'
  const [selectedMass, setSelectedMass] = useState(null);
  const [selectedMassDateStr, setSelectedMassDateStr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase/Simulated authentication changes
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      // Default views based on roles
      if (firebaseUser) {
        if (firebaseUser.role === "admin") {
          setCurrentView("admin");
        } else {
          setCurrentView("home");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === "admin") {
      setCurrentView("admin");
    } else {
      setCurrentView("home");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      setUser(null);
      setCurrentView("home");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleSelectMass = (mass, dateStr) => {
    setSelectedMass(mass);
    setSelectedMassDateStr(dateStr);
  };

  const handleCloseMassModal = () => {
    setSelectedMass(null);
    setSelectedMassDateStr(null);
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-background text-primary font-sans font-bold">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">church</span>
          <p className="text-sm text-on-surface-variant font-medium">Cargando Joselito...</p>
        </div>
      </div>
    );
  }

  // Render Authentication screen if user is not logged in or onboarding is incomplete
  if (!user || !user.role || user.isPendingSignUp) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Auth onAuthSuccess={handleAuthSuccess} />
        <CustomAlertModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans relative">
      {/* Firebase Permission Error Notification Banner */}
      {user.error && (
        <div className="bg-error text-white p-3.5 text-center text-xs font-bold flex items-center justify-center gap-2 relative z-50 animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>
            {user.error} (Consola de Firebase ➔ Firestore Database ➔ Reglas ➔ allow read, write: if request.auth != null;)
          </span>
        </div>
      )}

      {/* Shared Responsive Header & Mobile Bottom Bar */}
      <Navigation
        user={user}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />

      {/* Main Content Area with Bottom Padding on Mobile for the navbar */}
      <main className="flex-grow flex flex-col pb-16 md:pb-0">
        {currentView === "home" && (
          <Home user={user} onSelectMass={handleSelectMass} />
        )}

        {currentView === "dashboard" && (
          <Dashboard user={user} onSelectMass={handleSelectMass} />
        )}
        
        {currentView === "profile" && (
          <Profile user={user} onUpdateUser={handleUpdateUser} />
        )}
        
        {currentView === "admin" && user.role === "admin" && (
          <Admin user={user} />
        )}
      </main>

      {/* Footer (Desktop Only) */}
      <footer className="hidden md:block w-full py-8 px-container-padding-desktop bg-surface-container-low border-t border-outline-variant/30 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
            <span className="text-primary font-bold">Joselito</span>
          </div>
          <div className="text-on-surface-variant text-center md:text-left">
            © 2026 Joselito Altar Server Management. Parroquia San José Sánchez del Río.
          </div>
          <div className="flex gap-4 text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors">Soporte</a>
            <a href="#" className="hover:text-primary transition-colors">Política de Privacidad</a>
          </div>
        </div>
      </footer>

      {/* Mass Detail Modal Overlay */}
      {selectedMass && (
        <MassDetailModal
          mass={selectedMass}
          dateStr={selectedMassDateStr}
          user={user}
          onClose={handleCloseMassModal}
        />
      )}

      <CustomAlertModal />
    </div>
  );
}
