import React, { useState, useEffect } from "react";
import { dev } from "../services/firebase";
import { alerts } from "../services/alerts";

export default function DevPanel() {
  const [simTime, setSimTime] = useState("");
  const [emailLogs, setEmailLogs] = useState([]);
  const [realFirebase, setRealFirebase] = useState(false);
  const [currentFormattedTime, setCurrentFormattedTime] = useState({ text: "", isShifted: false });
  const [successMsg, setSuccessMsg] = useState("");

  const updateFormattedTime = () => {
    const cTime = dev.getSimulatedTime();
    const isShifted = localStorage.getItem("joselito_simulated_time") !== null;
    
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const dayName = days[cTime.getDay()];
    const dateNum = cTime.getDate();
    const monthName = months[cTime.getMonth()];
    
    let hour = cTime.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 to 12
    const min = cTime.getMinutes().toString().padStart(2, "0");
    const sec = cTime.getSeconds().toString().padStart(2, "0");
    
    const formatted = `${dayName} ${dateNum} de ${monthName}, ${hour}:${min}:${sec} ${ampm}`;
    setCurrentFormattedTime({ text: formatted, isShifted });
  };

  useEffect(() => {
    const updateLogs = () => {
      setEmailLogs(dev.getEmailLogs());
    };
    updateLogs();

    setRealFirebase(dev.isRealFirebaseEnabled());

    const currentTime = dev.getSimulatedTime();
    const tzOffset = currentTime.getTimezoneOffset() * 60000;
    const localISOTime = new Date(currentTime.getTime() - tzOffset).toISOString().slice(0, 16);
    setSimTime(localISOTime);

    updateFormattedTime();
    const timer = setInterval(updateFormattedTime, 1000);

    const handleEmail = () => updateLogs();
    const handleTime = () => {
      const cTime = dev.getSimulatedTime();
      const offset = cTime.getTimezoneOffset() * 60000;
      setSimTime(new Date(cTime.getTime() - offset).toISOString().slice(0, 16));
      updateFormattedTime();
    };

    window.addEventListener("simulated-email-sent", handleEmail);
    window.addEventListener("simulated-emails-cleared", handleEmail);
    window.addEventListener("simulated-time-changed", handleTime);

    return () => {
      clearInterval(timer);
      window.removeEventListener("simulated-email-sent", handleEmail);
      window.removeEventListener("simulated-emails-cleared", handleEmail);
      window.removeEventListener("simulated-time-changed", handleTime);
    };
  }, []);

  const handleTimeChange = (e) => {
    const val = e.target.value;
    setSimTime(val);
    if (val) {
      dev.setSimulatedTime(new Date(val).toISOString());
      setSuccessMsg("¡Hora simulada establecida!");
    } else {
      dev.setSimulatedTime(null);
      setSuccessMsg("¡Hora restablecida a la hora real!");
    }
    updateFormattedTime();
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleResetTime = () => {
    dev.setSimulatedTime(null);
    setSuccessMsg("¡Hora del sistema restablecida a la hora real!");
    updateFormattedTime();
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleResetDb = async () => {
    const ok = await alerts.confirm("¿Estás seguro de reiniciar la base de datos a sus valores semilla predeterminados?", "Reiniciar Base de Datos");
    if (ok) {
      dev.resetDatabase();
    }
  };

  const handleToggleFirebase = async () => {
    const nextMode = !realFirebase;
    const ok = await alerts.confirm(`¿Cambiar al modo Firebase ${nextMode ? 'REAL (Firestore/Auth)' : 'SIMULADO (LocalStorage)'}? La página se recargará.`, "Cambiar Entorno");
    if (ok) {
      dev.toggleRealFirebase(nextMode);
    }
  };

  return (
    <div className="bg-[#1c1c1c] p-6 rounded-3xl border border-white/10 card-shadow space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
        <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">build</span>
          Herramientas de Desarrollador
        </h3>
        <span className="text-[9px] bg-primary-fixed/30 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Módulo Dev
        </span>
      </div>

      {/* Body */}
      <div className="space-y-6 text-xs">
        {/* Mode Switch */}
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30">
          <h4 className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px] text-primary">cloud</span>
            Entorno de Ejecución
          </h4>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-on-surface-variant">Base de Datos y Autenticación:</span>
            <button
              onClick={handleToggleFirebase}
              className={`px-4 py-1.5 rounded-xl font-bold text-[10px] tracking-wider transition-colors ${
                realFirebase 
                  ? "bg-green-600 text-white hover:bg-green-700" 
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {realFirebase ? "FIREBASE REAL" : "SIMULACIÓN LOCAL"}
            </button>
          </div>
          <p className="text-[10px] text-on-surface-variant/70 mt-2 italic leading-relaxed">
            {realFirebase 
              ? "Sincronizado con Firebase Firestore y Auth en la nube." 
              : "Operando de forma aislada en LocalStorage. Cambiar a Firebase Real requiere que tengas configuradas las Reglas de Seguridad en tu consola."}
          </p>
        </div>

        {/* Time Simulation */}
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 space-y-3">
          <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
            Simulador de Tiempo (Time Travel)
          </h4>

          {/* Current Active Time Display */}
          <div className="p-3 bg-[#161616] rounded-xl border border-white/10 space-y-1">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Hora actual del sistema:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentFormattedTime.isShifted ? "bg-orange-500 animate-pulse" : "bg-green-600"}`} />
              <span className="font-bold text-xs text-on-surface">
                {currentFormattedTime.text || "Cargando..."}
              </span>
            </div>
            <span className="text-[9px] text-on-surface-variant/70 italic block">
              {currentFormattedTime.isShifted 
                ? "⚠️ Tiempo congelado en la hora simulada." 
                : "🟢 Corriendo en tiempo real."}
            </span>
          </div>

          {/* Confirmation Message */}
          {successMsg && (
            <div className="p-2.5 bg-green-100 border border-green-200 rounded-xl text-[10px] text-green-800 font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {successMsg}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="datetime-local"
              value={simTime}
              onChange={handleTimeChange}
              className="w-full h-11 px-4 bg-white/5 border border-white/10 text-white rounded-xl text-xs outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={handleResetTime}
                className="flex-1 h-10 border-2 border-outline text-on-surface hover:bg-surface-container rounded-xl font-bold transition-all text-xs"
              >
                Restablecer Hora Real
              </button>
            </div>
          </div>
        </div>

        {/* Database Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleResetDb}
            className="flex-1 h-11 bg-error/10 text-error hover:bg-error hover:text-white border border-error/20 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reiniciar Base de Datos Local
          </button>
        </div>

        {/* Email Logs Logger */}
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col max-h-72">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
              Logs de Correo Electrónico ({emailLogs.length})
            </h4>
            {emailLogs.length > 0 && (
              <button
                onClick={() => dev.clearEmailLogs()}
                className="text-primary font-bold hover:underline text-[10px]"
              >
                Limpiar logs
              </button>
            )}
          </div>

          {emailLogs.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant/60 bg-[#161616] border border-dashed border-white/10 rounded-xl font-medium">
              No se han gatillado correos electrónicos automáticos en esta sesión.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-52 no-scrollbar">
              {emailLogs.map((log) => (
                <div key={log.id} className="bg-[#161616] p-3 rounded-xl border border-white/10 flex flex-col gap-1.5 shadow-sm">
                  <div className="flex justify-between font-bold text-[9px] text-on-surface-variant border-b pb-1.5">
                    <span>Para: {log.to}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="font-bold text-primary text-[10px]">{log.subject}</div>
                  <div 
                    className="text-[9px] text-on-surface-variant/80 max-h-16 overflow-y-auto no-scrollbar font-mono leading-tight bg-surface-container-low p-2 rounded-lg" 
                    dangerouslySetInnerHTML={{ __html: log.bodyHtml }} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
