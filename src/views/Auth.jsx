import { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

export default function Auth({ onAuthSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New Account Onboarding Setup state (for first-time log-ins)
  const [onboardingUser, setOnboardingUser] = useState(null); // holds temp user info
  const [userName, setUserName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [onboardingRole, setOnboardingRole] = useState("monaguillo");
  const [childEmails, setChildEmails] = useState([""]);

  useEffect(() => {
    if (user && (!user.role || user.isPendingSignUp)) {
      setOnboardingUser(user);
      setUserName(user.name && user.name !== "Nuevo" && user.name !== "Google User" ? user.name : "");
      setUserLastName(user.lastName && user.lastName !== "Usuario" ? user.lastName : "");
      setUserEmail(user.email || "");
    }
  }, [user]);

  // Handle Google Sign-In click directly using Firebase Auth
  const handleGoogleClick = async () => {
    setError("");
    setLoading(true);
    try {
      const userProfile = await auth.signInWithGoogle();
      checkUserOnboarding(userProfile);
    } catch (err) {
      console.error("Google auth error:", err);
      setError(err.message || "Error al iniciar sesión con Google.");
      setLoading(false);
    }
  };

  const handleCreateNewUserClick = async () => {
    setError("");
    setLoading(true);
    try {
      const userProfile = await auth.signInAsNewUser();
      checkUserOnboarding(userProfile);
    } catch (err) {
      console.error("New user error:", err);
      setError(err.message || "Error al iniciar el registro de nuevo usuario.");
    } finally {
      setLoading(false);
    }
  };

  // Inspect if the signed-in user has a role profile, otherwise trigger onboarding
  const checkUserOnboarding = async (userProfile) => {
    if (!userProfile || !userProfile.role || userProfile.isPendingSignUp) {
      setOnboardingUser(userProfile);
      setUserName(userProfile?.name && userProfile.name !== "Nuevo" && userProfile.name !== "Google User" ? userProfile.name : "");
      setUserLastName(userProfile?.lastName && userProfile.lastName !== "Usuario" ? userProfile.lastName : "");
      setUserEmail(userProfile?.email || "");
    } else {
      onAuthSuccess(userProfile);
    }
  };

  // Onboarding registration form submission
  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const finalEmail = (userEmail || onboardingUser?.email || "").trim().toLowerCase();
    const finalName = (userName || onboardingUser?.name || "Usuario").trim();
    const finalLastName = (userLastName || onboardingUser?.lastName || "").trim();

    if (!finalEmail) {
      setError("Por favor ingresa un correo electrónico válido.");
      setLoading(false);
      return;
    }

    if (!finalName) {
      setError("Por favor ingresa tu nombre.");
      setLoading(false);
      return;
    }

    const filteredChildEmails = childEmails.map(c => c.trim()).filter(c => c !== "");

    if (onboardingRole === "padre" && filteredChildEmails.length === 0) {
      setError("Debes agregar al menos un correo de hijo para vincular.");
      setLoading(false);
      return;
    }

    try {
      const targetUid = onboardingUser?.uid || `user-${Date.now()}`;
      const finalProfile = await db.createUserProfile(
        targetUid,
        finalEmail,
        finalName,
        finalLastName,
        onboardingRole,
        onboardingRole === "padre" ? filteredChildEmails : []
      );
      onAuthSuccess(finalProfile);
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setError(err.message || "Error completando el registro. Intenta de nuevo.");
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
          <img 
            src="/apple-touch-icon.png" 
            alt="Joselito Logo" 
            className="w-10 h-10 rounded-xl object-cover border border-white/10" 
          />
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
            <img 
              src="/apple-touch-icon.png" 
              alt="Joselito Logo" 
              className="w-16 h-16 rounded-2xl object-cover border border-white/10" 
            />
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
                ? "Completa tus datos personales y selecciona tu función."
                : "Regístrate o inicia sesión seleccionando tu cuenta de Google."}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/40 text-red-200 rounded-2xl border border-red-800/30 flex gap-2 items-center text-xs font-semibold backdrop-blur-sm">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. GOOGLE SIGN IN / LOGIN SELECTION SCREEN */}
          {!onboardingUser && (
            <div className="space-y-4">
              {/* Mobile-only subhead */}
              <div className="block md:hidden text-center">
                <h2 className="text-lg font-bold text-white">Iniciar Sesión</h2>
                <p className="text-xs text-white/50 mt-1">Conéctate seleccionando tu cuenta de Google.</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full h-14 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 flex items-center justify-center gap-3 rounded-2xl transition-all active:scale-95 text-sm font-bold text-white shadow-sm hover:shadow-primary/5 group"
                title="Abrir selector de cuentas de Google"
              >
                <img
                  alt="Google Logo"
                  className="w-5 h-5 transition-transform group-hover:scale-110"
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                />
                {loading ? "Cargando..." : "Escoger Cuenta de Google"}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[10px] text-white/40 font-bold uppercase tracking-wider">o registrar nueva cuenta</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={handleCreateNewUserClick}
                disabled={loading}
                className="w-full h-12 bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 text-secondary flex items-center justify-center gap-2 rounded-2xl transition-all active:scale-95 text-xs font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Registrarme como Papá o Monaguillo
              </button>
            </div>
          )}

          {/* 2. ONBOARDING / COMPLETAR REGISTRO FORM */}
          {onboardingUser && (
            <form onSubmit={handleOnboardingSubmit} className="space-y-5">
              {/* Account Chooser Link */}
              <div className="flex items-center justify-between bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10 text-xs">
                <span className="text-white/60 text-[11px] truncate">
                  Cuenta: <strong className="text-white">{onboardingUser.email || userEmail || "Nueva Cuenta"}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="text-primary hover:text-primary-container font-bold text-[11px] flex items-center gap-1 shrink-0 ml-2"
                >
                  <span className="material-symbols-outlined text-[14px]">switch_account</span>
                  Cambiar cuenta
                </button>
              </div>

              {/* User personal data fields */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-white/70 ml-1">Tus Datos Personales</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    type="text"
                    placeholder="Nombre (ej. Juan)"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="h-11 px-3.5 rounded-xl border border-white/10 text-xs outline-none bg-white/5 text-white focus:border-primary focus:bg-white/10 transition-all"
                  />
                  <input
                    required
                    type="text"
                    placeholder="Apellido (ej. Pérez)"
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                    className="h-11 px-3.5 rounded-xl border border-white/10 text-xs outline-none bg-white/5 text-white focus:border-primary focus:bg-white/10 transition-all"
                  />
                </div>
                <input
                  required
                  type="email"
                  placeholder="Correo electrónico"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-white/10 text-xs outline-none bg-white/5 text-white focus:border-primary focus:bg-white/10 transition-all"
                />
              </div>

              {/* Role Question */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-white/70 ml-1">¿Cuál es tu función?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingRole("monaguillo")}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                      onboardingRole === "monaguillo"
                        ? "border-primary bg-primary/20 text-white shadow-lg shadow-primary/10"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary text-2xl">child_care</span>
                    <span className="text-xs font-bold">Monaguillo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingRole("padre")}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                      onboardingRole === "padre"
                        ? "border-primary bg-primary/20 text-white shadow-lg shadow-primary/10"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary text-2xl">family_restroom</span>
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
                    Vincula la cuenta de tu hijo para monitorear sus turnos e inscribirlo en misas.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-container transition-all shadow-md active:scale-95 flex items-center justify-center shadow-primary/10 mt-2"
              >
                {loading ? "Guardando Registro..." : "Completar Registro"}
              </button>
            </form>
          )}

        </div>
      </section>

    </div>
  );
}
