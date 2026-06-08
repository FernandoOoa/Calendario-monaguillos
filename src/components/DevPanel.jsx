import React, { useState, useEffect } from "react";
import { dev } from "../services/firebase";

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [simTime, setSimTime] = useState("");
  const [emailLogs, setEmailLogs] = useState([]);
  const [realFirebase, setRealFirebase] = useState(false);

  useEffect(() => {
    // Get initial values
    const updateLogs = () => {
      setEmailLogs(dev.getEmailLogs());
    };
    updateLogs();

    setRealFirebase(dev.isRealFirebaseEnabled());

    const currentTime = dev.getSimulatedTime();
    // Format to yyyy-MM-ddThh:mm
    const tzOffset = currentTime.getTimezoneOffset() * 60000;
    const localISOTime = new Date(currentTime.getTime() - tzOffset).toISOString().slice(0, 16);
    setSimTime(localISOTime);

    // Event listeners
    const handleEmail = () => updateLogs();
    const handleTime = () => {
      const cTime = dev.getSimulatedTime();
      const offset = cTime.getTimezoneOffset() * 60000;
      setSimTime(new Date(cTime.getTime() - offset).toISOString().slice(0, 16));
    };

    window.addEventListener("simulated-email-sent", handleEmail);
    window.addEventListener("simulated-emails-cleared", handleEmail);
    window.addEventListener("simulated-time-changed", handleTime);

    return () => {
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
    } else {
      dev.setSimulatedTime(null);
    }
  };

  const handleResetTime = () => {
    dev.setSimulatedTime(null);
  };

  const handleResetDb = () => {
    if (confirm("¿Estás seguro de reiniciar la base de datos a sus valores semilla predeterminados?")) {
      dev.resetDatabase();
    }
  };

  const handleToggleFirebase = () => {
    const nextMode = !realFirebase;
    if (confirm(`¿Cambiar al modo Firebase ${nextMode ? 'REAL (Firestore/Auth)' : 'SIMULADO (LocalStorage)'}? La página se recargará.`)) {
      dev.toggleRealFirebase(nextMode);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-primary hover:bg-primary-container text-white rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 border-2 border-white"
        title="Panel de Desarrollador"
      >
        <span className="material-symbols-outlined">{isOpen ? "close" : "terminal"}</span>
      </button>

      {/* Sliding Drawer Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-80 md:w-96 bg-white border border-outline-variant rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-primary text-white p-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-sm tracking-wide">
              <span className="material-symbols-outlined text-[18px]">build</span>
              HERRAMIENTAS DE PRUEBA
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">DEV MODE</span>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs no-scrollbar">
            {/* Mode Switch */}
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50">
              <h4 className="font-bold text-on-surface mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">cloud</span>
                Base de Datos y Auth
              </h4>
              <div className="flex justify-between items-center">
                <span>Modo de Conexión:</span>
                <button
                  onClick={handleToggleFirebase}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    realFirebase 
                      ? "bg-green-600 text-white hover:bg-green-700" 
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {realFirebase ? "FIREBASE REAL" : "SIMULACIÓN LOCAL"}
                </button>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1.5 italic">
                {realFirebase 
                  ? "Conectado a Firebase Firestore y Autenticación con las credenciales provistas." 
                  : "Usando LocalStorage con datos semilla. ¡Ideal para pruebas sin configurar bases de datos!"}
              </p>
            </div>

            {/* Time Simulation */}
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50">
              <h4 className="font-bold text-on-surface mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                Simular Tiempo de la App
              </h4>
              <div className="space-y-2">
                <input
                  type="datetime-local"
                  value={simTime}
                  onChange={handleTimeChange}
                  className="w-full h-8 px-2 border border-outline-variant rounded-md text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleResetTime}
                    className="flex-1 h-7 border border-outline text-on-surface hover:bg-surface-container-high rounded-md font-bold"
                  >
                    Usar Hora Real
                  </button>
                </div>
                <p className="text-[10px] text-on-surface-variant italic">
                  * Cambiar el tiempo permite probar si la ventana de Check-in (±1 hora) se habilita correctamente para la misa.
                </p>
              </div>
            </div>

            {/* Database controls */}
            <div className="flex gap-2">
              <button
                onClick={handleResetDb}
                className="flex-1 h-8 bg-error text-white font-bold hover:bg-error-container rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Resetear Semilla
              </button>
            </div>

            {/* Email Logs */}
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50 flex flex-col max-h-56">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
                  Logs de Correo Automatizado ({emailLogs.length})
                </h4>
                {emailLogs.length > 0 && (
                  <button
                    onClick={() => dev.clearEmailLogs()}
                    className="text-primary font-bold hover:underline text-[10px]"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {emailLogs.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant bg-white border border-dashed border-outline-variant rounded-lg">
                  No se han enviado correos.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-40 no-scrollbar">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="bg-white p-2.5 rounded-lg border border-outline-variant">
                      <div className="flex justify-between font-bold text-[10px] text-on-surface-variant border-b pb-1 mb-1">
                        <span>Para: {log.to}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="font-semibold text-primary mb-0.5">{log.subject}</div>
                      <div 
                        className="text-[10px] text-on-surface-variant/80 max-h-12 overflow-y-auto no-scrollbar font-mono leading-tight bg-surface-container-low p-1 rounded" 
                        dangerouslySetInnerHTML={{ __html: log.bodyHtml }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
