import React from "react";
import NotificationBell from "./NotificationBell";

export default function Navigation({ user, currentView, onViewChange, onLogout }) {
  if (!user) return null;

  return (
    <>
      {/* Top Header - Desktop View (md and up) & Mobile Header */}
      <header className="bg-white border-b border-outline-variant/30 sticky top-0 z-40 w-full liturgical-shadow">
        <div className="flex justify-between items-center w-full px-container-padding-mobile md:px-container-padding-desktop max-w-7xl mx-auto h-16">
          {/* Logo / Brand */}
          <div 
            onClick={() => onViewChange("dashboard")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-115 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
              church
            </span>
            <span className="font-sans font-bold text-lg tracking-tight text-primary">
              Joselito
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => onViewChange("dashboard")}
              className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                currentView === "dashboard"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary hover:border-outline-variant"
              }`}
            >
              DASHBOARD
            </button>
            <button
              onClick={() => onViewChange("profile")}
              className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                currentView === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary hover:border-outline-variant"
              }`}
            >
              PERFIL
            </button>
            {user.role === "admin" && (
              <button
                onClick={() => onViewChange("admin")}
                className={`font-semibold text-xs tracking-wider pb-1 border-b-2 transition-all ${
                  currentView === "admin"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-primary hover:border-outline-variant"
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
              className="hidden md:flex items-center justify-center p-2 rounded-full hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>

            {/* User Avatar tag */}
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold border border-outline-variant uppercase">
              {user.name ? user.name.charAt(0) : (user.email ? user.email.charAt(0) : "U")}
              {user.lastName ? user.lastName.charAt(0) : ""}
            </div>

            {/* Logout button - Mobile */}
            <button
              onClick={onLogout}
              className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Tab Bar - Mobile View Only (hidden on md and up) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-white border-t border-outline-variant/30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe h-16 flex justify-around items-center">
        {/* Dashboard Tab */}
        <button
          onClick={() => onViewChange("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            currentView === "dashboard"
              ? "text-primary"
              : "text-on-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: currentView === "dashboard" ? "'FILL' 1" : "'FILL' 0" }}>
            dashboard
          </span>
          <span className="text-[10px] font-semibold tracking-wider mt-0.5">Dashboard</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => onViewChange("profile")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            currentView === "profile"
              ? "text-primary"
              : "text-on-surface-variant"
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
                ? "text-primary"
                : "text-on-surface-variant"
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
