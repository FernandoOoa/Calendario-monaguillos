import React, { useState, useEffect } from "react";
import { alerts } from "../services/alerts";

export default function CustomAlertModal() {
  const [activeDialog, setActiveDialog] = useState(null);

  useEffect(() => {
    const unsubscribe = alerts.subscribe((dialog) => {
      setActiveDialog(dialog);
    });
    return () => unsubscribe();
  }, []);

  if (!activeDialog) return null;

  const { type, title, message, typeStyle, resolve } = activeDialog;

  const handleClose = (value) => {
    setActiveDialog(null);
    resolve(value);
  };

  // Icon and colors based on status/type
  let icon = "info";
  let iconColor = "text-primary";
  let primaryButtonBg = "bg-primary text-white hover:bg-primary-container";
  
  if (type === "confirm") {
    icon = "help";
    iconColor = "text-secondary";
    primaryButtonBg = "bg-primary text-white hover:bg-primary-container";
  } else if (typeStyle === "success") {
    icon = "check_circle";
    iconColor = "text-green-600";
    primaryButtonBg = "bg-green-600 text-white hover:bg-green-700";
  } else if (typeStyle === "error") {
    icon = "error";
    iconColor = "text-error";
    primaryButtonBg = "bg-error text-white hover:bg-error/90";
  } else if (typeStyle === "warning") {
    icon = "warning";
    iconColor = "text-secondary";
    primaryButtonBg = "bg-secondary text-on-secondary hover:opacity-90";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 modal-blur animate-in fade-in duration-200">
      {/* Container */}
      <div className="w-full max-w-sm bg-white rounded-[28px] border border-outline-variant/40 card-shadow p-6 flex flex-col gap-4 text-center font-sans animate-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className={`w-14 h-14 rounded-full bg-surface-container flex items-center justify-center ${iconColor}`}>
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {icon}
            </span>
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-2">
          {type === "confirm" ? (
            <>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="flex-1 h-11 border-2 border-outline hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${primaryButtonBg}`}
              >
                Aceptar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleClose(true)}
              className={`w-full h-11 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${primaryButtonBg}`}
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
