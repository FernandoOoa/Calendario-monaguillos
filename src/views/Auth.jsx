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
      setIsSimulationMode(localStorage.getItem("joselito_use_real_firebase") !== "true");
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
    <main className="flex-grow flex items-center justify-center px-container-padding-mobile py-8 relative w-full font-sans">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary-container rounded-full blur-3xl opacity-20"></div>
        <div className="absolute top-1/2 -right-48 w-[32rem] h-[32rem] bg-primary-fixed rounded-full blur-[100px] opacity-10"></div>
      </div>

      <div className="w-full max-w-md bg-white liturgical-shadow rounded-[32px] p-6 md:p-10 relative z-10">
        
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              church
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Joselito</h1>
            <p className="text-xs text-on-surface-variant mt-1 font-semibold">Calendario y Asistencia de Monaguillos</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl border border-error/20 flex gap-2 items-center text-xs font-semibold">
            <span className="material-symbols-outlined text-error text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. GOOGLE SIGN IN SCREEN */}
        {!onboardingUser && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-on-surface">Bienvenido al Altar</h2>
              <p className="text-xs text-on-surface-variant mt-1">Regístrate o inicia sesión con tu cuenta institucional o personal de Google.</p>
            </div>

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full h-14 bg-white border-2 border-outline-variant hover:border-primary flex items-center justify-center gap-3 rounded-2xl hover:bg-surface-container-low transition-all active:scale-95 text-sm font-bold text-on-surface shadow-sm"
            >
              <img
                alt="Google Logo"
                className="w-6 h-6"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYRlj_LQhjHGYQ4tVUyDfRHz3MRRz5qfMfdDUnm42_YhIpFzbS1Ic0FLvWt66bYzgDC4FmYN_y-XIM7H3idwsuCVEh6EeYSfLr1nkS7exBEIYQq3JK3UR_99tTp-Irbzjh491PRRspS1sZdmmni3OY_vnDB4_l58FRz52MP8ctHzRNOShhKl0fLpc-wly1TgUu1s34R3B9WapwYPpTpIru3iSC0CzfUTtTTWWkSuZ29yqDPW-40j786g5IcIt1uG5WYXT_PblHNjA"
              />
              {loading ? "Cargando..." : "Continuar con Google"}
            </button>
          </div>
        )}

        {/* 2. FIRST TIME GOOGLE ONBOARDING SETUP */}
        {onboardingUser && (
          <form onSubmit={handleOnboardingSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-on-surface">Completar Registro</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Hola <span className="text-primary font-bold">{onboardingUser.email}</span>, dinos cuál será tu función en el sistema:
              </p>
            </div>

            {/* Role Question */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-on-surface-variant ml-1">¿Quién eres?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOnboardingRole("monaguillo")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    onboardingRole === "monaguillo"
                      ? "border-primary bg-primary-fixed/20 shadow-sm"
                      : "border-outline-variant bg-surface hover:border-primary-fixed-dim"
                  }`}
                >
                  <span className="material-symbols-outlined text-primary text-3xl">child_care</span>
                  <span className="text-xs font-bold">Monaguillo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingRole("padre")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    onboardingRole === "padre"
                      ? "border-primary bg-primary-fixed/20 shadow-sm"
                      : "border-outline-variant bg-surface hover:border-primary-fixed-dim"
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
                  <label className="block text-xs font-bold text-on-surface-variant">
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
                        className="flex-1 h-11 px-4 rounded-xl border border-outline-variant text-xs outline-none bg-surface"
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
                <p className="text-[10px] text-tertiary mt-1 ml-1 italic font-semibold">
                  Vincula la cuenta de tu hijo para monitorear sus turnos y asistencias.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-container transition-all shadow-md active:scale-95 flex items-center justify-center"
            >
              {loading ? "Guardando Perfil..." : "Completar Registro"}
            </button>
          </form>
        )}

        {/* 3. SIMULATED ACCOUNTS MODAL DIALOG (DEV HELPER) */}
        {showSimulatedAccounts && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="text-center">
                <h3 className="font-bold text-primary text-base flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined">account_circle</span>
                  Simulador de Google Login
                </h3>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Estás en modo simulación. Selecciona cuál cuenta de Google deseas simular para probar los roles:
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleSelectSimulatedAccount("monaguillo")}
                  className="w-full text-left p-3 border border-outline-variant rounded-xl hover:bg-primary-fixed/20 hover:border-primary transition-all flex items-center gap-3 text-xs"
                >
                  <span className="material-symbols-outlined text-primary text-lg">child_care</span>
                  <div>
                    <p className="font-bold text-on-surface">Josué Sánchez (Monaguillo)</p>
                    <p className="text-[10px] text-on-surface-variant">monaguillo@joselito.com</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectSimulatedAccount("padre")}
                  className="w-full text-left p-3 border border-outline-variant rounded-xl hover:bg-primary-fixed/20 hover:border-primary transition-all flex items-center gap-3 text-xs"
                >
                  <span className="material-symbols-outlined text-primary text-lg">family_restroom</span>
                  <div>
                    <p className="font-bold text-on-surface">Carlos Sánchez (Padre)</p>
                    <p className="text-[10px] text-on-surface-variant">padre@joselito.com</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectSimulatedAccount("admin")}
                  className="w-full text-left p-3 border border-outline-variant rounded-xl hover:bg-primary-fixed/20 hover:border-primary transition-all flex items-center gap-3 text-xs"
                >
                  <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>
                  <div>
                    <p className="font-bold text-on-surface">Coordinador (Administrador)</p>
                    <p className="text-[10px] text-on-surface-variant">admin@joselito.com</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectSimulatedAccount("new-user")}
                  className="w-full text-left p-3 border border-outline-variant rounded-xl hover:bg-tertiary-fixed hover:border-secondary transition-all flex items-center gap-3 text-xs"
                >
                  <span className="material-symbols-outlined text-secondary text-lg">person_add</span>
                  <div>
                    <p className="font-bold text-on-surface">Registrar Nueva Cuenta Google</p>
                    <p className="text-[10px] text-on-surface-variant">Simula un nuevo correo electrónico</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowSimulatedAccounts(false)}
                className="w-full border border-outline text-on-surface py-2 rounded-xl text-xs font-bold hover:bg-surface-container"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
