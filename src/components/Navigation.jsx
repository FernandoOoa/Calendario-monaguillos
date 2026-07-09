import React from "react";
import NotificationBell from "./NotificationBell";

export default function Navigation({ user, currentView, onViewChange, onLogout }) {
  if (!user) return null;

  return (
    <>
      {/* Top Header - Desktop View (md and up) & Mobile Header */}
      <header className="bg-[#0c0c0c]/75 border-b border-white/5 sticky top-0 z-40 w-full backdrop-blur-md shadow-lg">
        <div className="flex justify-between items-center w-full px-container-padding-mobile md:px-container-padding-desktop max-w-7xl mx-auto h-16">
          {/* Logo / Brand */}
          <div 
            onClick={() => onViewChange("home")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img 
              src="/favicon.png" 
              alt="Joselito Logo" 
              className="w-7 h-7 rounded-lg group-hover:scale-110 transition-transform object-cover" 
            />
            <span className="font-sans font-bold text-lg tracking-tight text-white group-hover:text-secondary transition-colors">
              Joselito
            </span>
          </div>
 
          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => onViewChange("home")}
              className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                currentView === "home"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              INICIO
            </button>
            <button
              onClick={() => onViewChange("dashboard")}
              className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                currentView === "dashboard"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              CALENDARIO
            </button>
            <button
              onClick={() => onViewChange("profile")}
              className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                currentView === "profile"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              PERFIL
            </button>
            {user.role === "admin" && (
              <button
                onClick={() => onViewChange("admin")}
                className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                  currentView === "admin"
                    ? "border-secondary text-secondary"
                    : "border-transparent text-white/60 hover:text-white hover:border-white/20"
                }`}
              >
                ADMINISTRADOR
              </button>
            )}
          </nav>
 
          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell user={user} />
 
            {/* Logout button - Desktop */}
            <button
              onClick={onLogout}
              className="hidden md:flex items-center justify-center p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-error transition-colors"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>
 
            {/* User Avatar tag */}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={`${user.name || "Usuario"} avatar`}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 text-white flex items-center justify-center text-xs font-bold border border-white/10 uppercase">
                {user.name ? user.name.charAt(0) : (user.email ? user.email.charAt(0) : "U")}
                {user.lastName ? user.lastName.charAt(0) : ""}
              </div>
            )}
 
            {/* Logout button - Mobile */}
            <button
              onClick={onLogout}
              className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-error transition-colors"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>
          </div>
        </div>
      </header>
 
      {/* Bottom Tab Bar - Mobile View Only (hidden on md and up) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0c0c0c]/80 border-t border-white/5 backdrop-blur-md shadow-2xl pb-safe h-16 flex justify-around items-center">
        {/* Inicio Tab */}
        <button
          onClick={() => onViewChange("home")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            currentView === "home"
              ? "text-secondary"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: currentView === "home" ? "'FILL' 1" : "'FILL' 0" }}>
            home
          </span>
          <span className="text-[10px] font-semibold tracking-wider mt-0.5">Inicio</span>
        </button>
 
        {/* Calendario Tab */}
        <button
          onClick={() => onViewChange("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            currentView === "dashboard"
              ? "text-secondary"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: currentView === "dashboard" ? "'FILL' 1" : "'FILL' 0" }}>
            calendar_month
          </span>
          <span className="text-[10px] font-semibold tracking-wider mt-0.5">Calendario</span>
        </button>
 
        {/* Profile Tab */}
        <button
          onClick={() => onViewChange("profile")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            currentView === "profile"
              ? "text-secondary"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: currentView === "profile" ? "'FILL' 1" : "'FILL' 0" }}>
            person
          </span>
          <span className="text-[10px] font-semibold tracking-wider mt-0.5">Perfil</span>
        </button>
 
        {/* Admin Tab (conditional) */}
        {user.role === "admin" && (
          <button
            onClick={() => onViewChange("admin")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
              currentView === "admin"
                ? "text-secondary"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: currentView === "admin" ? "'FILL' 1" : "'FILL' 0" }}>
              admin_panel_settings
            </span>
            <span className="text-[10px] font-semibold tracking-wider mt-0.5">Admin</span>
          </button>
        )}
      </nav>
    </>
  );
}
