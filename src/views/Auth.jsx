import React, { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";

export default function Auth({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Simulated Google Accounts Dialog state (only active in local simulation mode)
  const [showSimulatedAccounts, setShowSimulatedAccounts] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(true);

  // New Google Account Onboarding Setup state (for first-time log-ins)
  const [onboardingUser, setOnboardingUser] = useState(null); // holds temp google user info
  const [onboardingRole, setOnboardingRole] = useState("monaguillo");
  const [childEmails, setChildEmails] = useState([""]);

  useEffect(() => {
    // Check if we are running in real Firebase mode or simulation mode
    const checkMode = () => {
      const stored = localStorage.getItem("joselito_use_real_firebase");
      setIsSimulationMode(stored === null ? false : stored !== "true");
    };
    checkMode();
  }, []);

  // Handle Google Sign-In click
  const handleGoogleClick = async () => {
    setError("");
    if (isSimulationMode) {
      // Show simulated accounts chooser for development convenience
      setShowSimulatedAccounts(true);
    } else {
      // Real Firebase Google Login
      setLoading(true);
      try {
        const tempUser = await auth.signInWithGoogle();
        checkUserOnboarding(tempUser);
      } catch (err) {
        setError(err.message || "Error al iniciar sesión con Google.");
        setLoading(false);
      }
    }
  };

  // Inspect if the signed-in user has a role profile, otherwise trigger onboarding
  const checkUserOnboarding = async (userProfile) => {
    if (!userProfile.role || userProfile.role === "monaguillo" && userProfile.isPendingSignUp) {
      // New user or pending child profile setup needed
      setOnboardingUser(userProfile);
    } else {
      // Profile is complete, proceed directly
      onAuthSuccess(userProfile);
    }
  };

  // Simulate signing in with a selected mock Google account
  const handleSelectSimulatedAccount = async (accountType) => {
    setShowSimulatedAccounts(false);
    setLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem("joselito_users") || "{}");
      let mockUser = null;

      if (accountType === "monaguillo") {
        mockUser = users["monaguillo-uid"] || {
          uid: "monaguillo-uid",
          email: "monaguillo@joselito.com",
          name: "Josué",
          lastName: "Sánchez",
          role: "monaguillo",
          level: 4,
          servedCount: 42,
          punctuality: 98,
          activeRecurrence: true,
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"
        };
      } else if (accountType === "padre") {
        mockUser = users["parent-uid"] || {
          uid: "parent-uid",
          email: "padre@joselito.com",
          name: "Carlos",
          lastName: "Sánchez",
          role: "padre",
          childEmails: ["monaguillo@joselito.com"],
          photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"
        };
      } else if (accountType === "admin") {
        mockUser = users["admin-uid"] || {
          uid: "admin-uid",
          email: "admin@joselito.com",
          name: "Administrador",
          lastName: "Parroquial",
          role: "admin",
          level: 5,
          servedCount: 150,
          punctuality: 100,
          photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80"
        };
      } else {
        // "new-user": Create a fresh google sign-in profile
        mockUser = {
          uid: `google-uid-${Date.now()}`,
          email: `google.user-${Math.floor(Math.random() * 100)}@gmail.com`,
          name: "Google",
          lastName: "User",
          role: null // forces onboarding flow!
        };
      }

      // Save mock user as logged in
      localStorage.setItem("joselito_current_user", JSON.stringify(mockUser));
      checkUserOnboarding(mockUser);
    } catch (e) {
      setError("Error simulando inicio de sesión.");
    } finally {
      setLoading(false);
    }
  };

  // Onboarding registration form submission
  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const filteredChildEmails = childEmails.map(c => c.trim()).filter(c => c !== "");

    if (onboardingRole === "padre" && filteredChildEmails.length === 0) {
      setError("Debes agregar al menos un correo de hijo para vincular.");
      setLoading(false);
      return;
    }

    try {
      const finalProfile = await db.createUserProfile(
        onboardingUser.uid,
        onboardingUser.email,
        onboardingUser.name,
        onboardingUser.lastName,
        onboardingRole,
        onboardingRole === "padre" ? filteredChildEmails : []
      );
      onAuthSuccess(finalProfile);
    } catch (err) {
      setError("Error completando el registro. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChildEmail = () => {
    setChildEmails([...childEmails, ""]);
  };

  const handleChildEmailChange = (index, value) => {
    const updated = [...childEmails];
    updated[index] = value;
    setChildEmails(updated);
  };

  const handleRemoveChildEmail = (index) => {
    const updated = childEmails.filter((_, i) => i !== index);
    setChildEmails(updated.length > 0 ? updated : [""]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0c0c0c] text-white overflow-hidden relative font-sans">
      
      {/* LEFT COLUMN: HERO PANEL (DESKTOP) */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        {/* Background 3D Render Image */}
        <img
          src="/stained_glass_3d.png"
          alt="3D Stained Glass Cathedral Window"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-transform duration-10000 ease-out hover:scale-100"
          style={{ mixBlendMode: "lighten" }}
        />
        {/* Gradients to merge image and layout */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#3a0000]/80 via-[#0c0c0c]/95 to-[#1c1c1c]/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent"></div>
        
        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              church
            </span>
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white">Joselito</span>
          </div>
        </div>

        {/* Center Quote Panel */}
        <div className="relative z-10 max-w-lg mt-auto mb-6">
          <span className="text-[10px] font-bold tracking-widest text-[#d4af37] uppercase bg-[#d4af37]/10 px-3.5 py-1.5 rounded-full border border-[#d4af37]/20">
            Coordinación Litúrgica
          </span>
          <h1 className="text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white mt-4 leading-tight">
            "El que quiera ser el primero, que sea el servidor de todos."
          </h1>
          <p className="text-xs text-white/60 mt-3 leading-relaxed max-w-sm">
            Una plataforma diseñada para monaguillos y coordinadores litúrgicos. Agenda turnos, gestiona check-ins y mantén al día a tu tutor en cada celebración.
          </p>
        </div>
      </section>

      {/* RIGHT COLUMN: LOGIN PANEL (MOBILE & DESKTOP) */}
      <section className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 bg-gradient-to-br from-[#121212] to-[#0c0c0c] relative min-h-screen md:min-h-0">
        
        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-secondary/10 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        {/* Glassmorphic Auth Card */}
        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-6 md:p-10 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          
          {/* Logo (Mobile Only) */}
          <div className="flex md:hidden flex-col items-center gap-3 text-center mb-8">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                church
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Joselito</h1>
              <p className="text-[10px] text-white/50 mt-0.5 font-semibold">Calendario y Asistencia de Monaguillos</p>
            </div>
          </div>

          {/* Title Header (Desktop & Mobile inside card) */}
          <div className="hidden md:block mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {onboardingUser ? "Completar Registro" : "Bienvenido al Altar"}
            </h2>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              {onboardingUser 
                ? "Dinos cuál será tu función en el sistema de monaguillos."
                : "Regístrate o inicia sesión con tu cuenta de Google."}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/40 text-red-200 rounded-2xl border border-red-800/30 flex gap-2 items-center text-xs font-semibold backdrop-blur-sm">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. GOOGLE SIGN IN SCREEN */}
          {!onboardingUser && (
            <div className="space-y-6">
              {/* Mobile-only subhead */}
              <div className="block md:hidden text-center">
                <h2 className="text-lg font-bold text-white">Iniciar Sesión</h2>
                <p className="text-xs text-white/50 mt-1">Conéctate utilizando tu cuenta de Google.</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full h-14 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 flex items-center justify-center gap-3 rounded-2xl transition-all active:scale-95 text-sm font-bold text-white shadow-sm hover:shadow-primary/5 group"
              >
                <img
                  alt="Google Logo"
                  className="w-5 h-5 transition-transform group-hover:scale-110"
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                />
                {loading ? "Cargando..." : "Continuar con Google"}
              </button>
            </div>
          )}

          {/* 2. FIRST TIME GOOGLE ONBOARDING SETUP */}
          {onboardingUser && (
            <form onSubmit={handleOnboardingSubmit} className="space-y-6">
              {/* Onboarding text (Mobile only subhead) */}
              <div className="block md:hidden text-center">
                <h2 className="text-lg font-bold text-white">Completar Registro</h2>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Hola <span className="text-primary font-bold">{onboardingUser.email}</span>, dinos cuál será tu función:
                </p>
              </div>

              {/* Role Question */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-white/70 ml-1">¿Quién eres?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setOnboardingRole("monaguillo")}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
                      onboardingRole === "monaguillo"
                        ? "border-primary bg-primary/20 text-white shadow-lg shadow-primary/10"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary text-3xl">child_care</span>
                    <span className="text-xs font-bold">Monaguillo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingRole("padre")}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
                      onboardingRole === "padre"
                        ? "border-primary bg-primary/20 text-white shadow-lg shadow-primary/10"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary text-3xl">family_restroom</span>
                    <span className="text-xs font-bold">Padre / Tutor</span>
                  </button>
                </div>
              </div>

              {/* Conditional Parent Child email linking inputs */}
              {onboardingRole === "padre" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center ml-1">
                    <label className="block text-xs font-bold text-white/70">
                      Correo de tus hijos (monaguillos)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddChildEmail}
                      className="text-primary hover:text-primary-container font-bold text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Añadir hijo
                    </button>
                  </div>

                  <div className="space-y-2">
                    {childEmails.map((cEmail, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          required
                          type="email"
                          placeholder="hijo@ejemplo.com"
                          value={cEmail}
                          onChange={(e) => handleChildEmailChange(index, e.target.value)}
                          className="flex-1 h-11 px-4 rounded-xl border border-white/10 text-xs outline-none bg-white/5 text-white focus:border-primary focus:bg-white/10 transition-all"
                        />
                        {childEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChildEmail(index)}
                            className="p-2 text-error hover:bg-error-container/20 rounded-lg"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-primary/70 mt-1 ml-1 italic font-semibold">
                    Vincula la cuenta de tu hijo para monitorear sus turnos y asistencias.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-container transition-all shadow-md active:scale-95 flex items-center justify-center shadow-primary/10"
              >
                {loading ? "Guardando Perfil..." : "Completar Registro"}
              </button>
            </form>
          )}

          {/* 3. SIMULATED ACCOUNTS MODAL DIALOG (DEV HELPER) */}
          {showSimulatedAccounts && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1c1c1c]/95 border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-white">
                <div className="text-center">
                  <h3 className="font-bold text-primary text-base flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined">account_circle</span>
                    Simulador de Google Login
                  </h3>
                  <p className="text-[10px] text-white/50 mt-1">
                    Estás en modo simulación. Selecciona cuál cuenta de Google deseas simular para probar los roles:
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleSelectSimulatedAccount("monaguillo")}
                    className="w-full text-left p-3 border border-white/10 rounded-xl hover:bg-white/5 hover:border-primary transition-all flex items-center gap-3 text-xs text-white"
                  >
                    <span className="material-symbols-outlined text-primary text-lg">child_care</span>
                    <div>
                      <p className="font-bold text-white">Josué Sánchez (Monaguillo)</p>
                      <p className="text-[10px] text-white/50">monaguillo@joselito.com</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectSimulatedAccount("padre")}
                    className="w-full text-left p-3 border border-white/10 rounded-xl hover:bg-white/5 hover:border-primary transition-all flex items-center gap-3 text-xs text-white"
                  >
                    <span className="material-symbols-outlined text-primary text-lg">family_restroom</span>
                    <div>
                      <p className="font-bold text-white">Carlos Sánchez (Padre)</p>
                      <p className="text-[10px] text-white/50">padre@joselito.com</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectSimulatedAccount("admin")}
                    className="w-full text-left p-3 border border-white/10 rounded-xl hover:bg-white/5 hover:border-primary transition-all flex items-center gap-3 text-xs text-white"
                  >
                    <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>
                    <div>
                      <p className="font-bold text-white">Coordinador (Administrador)</p>
                      <p className="text-[10px] text-white/50">admin@joselito.com</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectSimulatedAccount("new-user")}
                    className="w-full text-left p-3 border border-white/10 rounded-xl hover:bg-white/5 hover:border-secondary transition-all flex items-center gap-3 text-xs text-white"
                  >
                    <span className="material-symbols-outlined text-secondary text-lg">person_add</span>
                    <div>
                      <p className="font-bold text-white">Registrar Nueva Cuenta Google</p>
                      <p className="text-[10px] text-white/50">Simula un nuevo correo electrónico</p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setShowSimulatedAccounts(false)}
                  className="w-full border border-white/10 text-white py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
