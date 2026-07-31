import { useEffect, useState } from "react";
import CustomAlertModal from "./components/CustomAlertModal";
import Navigation from "./components/Navigation";
import { auth, db } from "./services/firebase";
import Admin from "./views/Admin";
import Auth from "./views/Auth";
import Dashboard from "./views/Dashboard";
import Home from "./views/Home";
import MassDetailModal from "./views/MassDetailModal";
import Profile from "./views/Profile";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LiturgicalProvider, useLiturgical } from "./context/LiturgicalContext";

function MainApp() {
  const { user, loading, handleAuthSuccess, logout, updateUser } = useAuth();
  const { selectedMass, selectedMassDateStr, openMassDetail, closeMassDetail } = useLiturgical();
  const [currentView, setCurrentView] = useState("home"); // 'home', 'dashboard', 'profile', 'admin'

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        setCurrentView("admin");
      } else {
        setCurrentView("home");
      }
    }
  }, [user]);

  useEffect(() => {
    const handleOpenDetail = async (e) => {
      const { massId, date } = e.detail;
      try {
        const allMasses = await db.getAllMasses();
        const mass = allMasses.find(m => m.id === massId);
        if (mass) {
          openMassDetail(mass, date);
        }
      } catch (err) {
        console.error("Error opening mass detail from event:", err);
      }
    };
    window.addEventListener("open-mass-detail", handleOpenDetail);
    return () => window.removeEventListener("open-mass-detail", handleOpenDetail);
  }, [openMassDetail]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-background text-primary font-sans font-bold">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="material-symbols-outlined text-4xl text-primary block">church</span>
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
    <div className="min-h-screen flex flex-col bg-background font-sans relative overflow-hidden text-white selection:bg-primary selection:text-white">
      {/* Ambient Glow Orbs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-glow-primary animate-float-slow pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-glow-secondary animate-float-slower pointer-events-none z-0"></div>

      {/* Shared Responsive Header & Mobile Bottom Bar */}
      <Navigation
        user={user}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col pb-16 md:pb-0 relative z-10">
        {currentView === "home" && (
          <Home user={user} onSelectMass={openMassDetail} />
        )}

        {currentView === "dashboard" && (
          <Dashboard user={user} onSelectMass={openMassDetail} />
        )}

        {currentView === "profile" && (
          <Profile user={user} onUpdateUser={updateUser} />
        )}

        {currentView === "admin" && user.role === "admin" && (
          <Admin user={user} />
        )}
      </main>

      {/* Footer (Desktop Only) */}
      <footer className="hidden md:block w-full py-8 px-container-padding-desktop bg-surface-container-low border-t border-outline-variant/30 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
            <span className="text-primary font-bold">Joselito</span>
          </div>
          <div className="text-on-surface-variant text-center md:text-left">
            © 2026 Joselito Altar Server Management. Parroquia El Padre Eterno.
          </div>
          <div className="flex gap-4 text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors">Soporte Parroquial</a>
            <a href="#" className="hover:text-primary transition-colors">Términos del Servicio</a>
          </div>
        </div>
      </footer>

      {/* Mass Detail Modal Overlay */}
      {selectedMass && (
        <MassDetailModal
          mass={selectedMass}
          dateStr={selectedMassDateStr}
          user={user}
          onClose={closeMassDetail}
        />
      )}

      <CustomAlertModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LiturgicalProvider>
        <MainApp />
      </LiturgicalProvider>
    </AuthProvider>
  );
}
