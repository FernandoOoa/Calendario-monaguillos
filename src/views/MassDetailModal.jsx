import React, { useState, useEffect } from "react";
import { db, dev } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM } from "../utils/time";

export default function MassDetailModal({ mass, dateStr, user, onClose }) {
  const [registrations, setRegistrations] = useState([]);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInStatusText, setCheckInStatusText] = useState("");
  const [selectedRole, setSelectedRole] = useState("Acólito");
  const [loading, setLoading] = useState(false);

  const rolesList = ["Acólito", "Crucífero", "Turiferario", "Ceroferario", "Navicularia", "Ceremoniario"];

  const fetchRegistrations = async () => {
    try {
      const list = await db.getMassAttendance(mass.id, dateStr);
      setRegistrations(list);
    } catch (e) {
      console.error(e);
    }
  };

  const checkCheckInWindow = () => {
    // Parse mass datetime safely in local time
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = mass.time.split(":").map(Number);
    const massStart = new Date(year, month - 1, day, hour, minute);
    
    const now = dev.getSimulatedTime();
    const diffMs = now - massStart;
    const diffMins = diffMs / 60000;
    
    // Check-in active from 1 hour before to 1 hour after mass start
    const isOpen = diffMins >= -60 && diffMins <= 60;
    setIsCheckInOpen(isOpen);

    if (isOpen) {
      setCheckInStatusText("¡Ventana de Check-in abierta! Confirma tu asistencia.");
    } else if (diffMins < -60) {
      const hoursLeft = Math.ceil((-diffMins - 60) / 60);
      setCheckInStatusText(`Check-in se habilitará en aprox. ${hoursLeft} hora(s).`);
    } else {
      setCheckInStatusText("La ventana de Check-in ya ha cerrado.");
    }
  };

  useEffect(() => {
    fetchRegistrations();
    checkCheckInWindow();

    // Listen to time shifts or state updates
    const handleUpdate = () => {
      fetchRegistrations();
      checkCheckInWindow();
    };
    
    window.addEventListener("mass-state-updated", handleUpdate);
    window.addEventListener("simulated-time-changed", handleUpdate);
    
    return () => {
      window.removeEventListener("mass-state-updated", handleUpdate);
      window.removeEventListener("simulated-time-changed", handleUpdate);
    };
  }, [mass, dateStr]);

  const handleRegister = async () => {
    if (user.role !== "monaguillo") return;
    setLoading(true);
    try {
      await db.registerForMass(mass.id, user, selectedRole);
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert(err.message, "Error al anotarse", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const ok = await alerts.confirm("¿Estás seguro de que deseas cancelar tu asistencia a esta misa?", "Cancelar asistencia");
    if (!ok) return;
    setLoading(true);
    try {
      await db.cancelMassRegistration(mass.id, user.uid, dateStr);
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert(err.message, "Error al cancelar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await db.checkInForMass(mass.id, user.uid, dateStr);
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert(err.message, "Error al realizar check-in", "error");
    } finally {
      setLoading(false);
    }
  };

  const userReg = registrations.find(r => r.userUid === user.uid);
  const isUserRegistered = !!userReg;
  const isUserCheckedIn = userReg?.status === "checked-in" || userReg?.status === "attended";
  
  // Footprint tracker stages logic
  const stepInscrito = isUserRegistered;
  const stepEnSitio = isUserCheckedIn;
  
  // Step 3 (Servido) is active if checked-in AND the mass hour has passed by 1 hour (simulated time)
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = mass.time.split(":").map(Number);
  const massStart = new Date(year, month - 1, day, hour, minute);
  const isMassFinished = dev.getSimulatedTime() > new Date(massStart.getTime() + 60 * 60000);
  const stepServido = isUserCheckedIn && isMassFinished;

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/40 modal-blur flex items-center justify-center p-4 md:p-8 font-sans">
      {/* Modal Container */}
      <main className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Banner Image / Header */}
        <div className="relative h-40 md:h-52 flex-shrink-0">
          <img
            className="w-full h-full object-cover"
            alt="Interior de iglesia"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC67G4S0X1oDYsuCT50k6NYeLjbZImRiyXakxsO7fEslduQBkLTzDB8rQkd4oIU_NbRCceIsxcctphIWjRmDHuoLb5SZwfGBxazLmYcTkVtliWF8DjDUY50tRbKZX7zITvUlDZ3g3r71XD2fcMFrLRFHds9ivcWYuxJQCRtaCFsxTDQyGZTvzr6SEtT_pdyO7IIux-UVxtqGo15fujuoDVMGuZnqQGxXeoW2ZlzHJrE-TVt7-mUwckcmwfWQaNSp5lZufq3ZVjk3yw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all active:scale-95 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {/* Title and Badge */}
          <div className="absolute bottom-4 left-6">
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-bold text-[10px] tracking-wider uppercase">
              {mass.type}
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-primary mt-1">
              {mass.title} — {formatTimeToAMPM(mass.time)}
            </h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar">
          
          {/* Notes */}
          {mass.notes && (
            <div className="bg-surface-container/50 border border-outline-variant/30 p-4 rounded-2xl text-xs text-on-surface-variant leading-relaxed">
              <span className="font-bold text-on-surface block mb-1">Notas Litúrgicas:</span>
              {mass.notes}
            </div>
          )}

          {/* Notification Alert Banner */}
          <section className="bg-primary-fixed/20 text-on-primary-fixed p-4 rounded-2xl flex items-start gap-3 border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <div>
              <p className="text-[10px] font-bold tracking-wider mb-1 uppercase">REGLA DE ASISTENCIA Y CHECK-IN</p>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                El check-in se activa 60 minutos antes de la misa y cierra 60 minutos después. 
                <span className="font-bold text-primary block mt-1">{checkInStatusText}</span>
              </p>
            </div>
          </section>

          {/* Registered Altar Servers */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-on-surface">Servidores Asignados</h2>
              <span className="text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant">
                {registrations.length} Acólito(s)
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registrations.length === 0 ? (
                <div className="sm:col-span-2 text-center py-6 text-xs text-on-surface-variant/70 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
                  No hay monaguillos registrados para esta misa. ¡Sé el primero en anotarte!
                </div>
              ) : (
                registrations.map((reg) => {
                  const isCurrent = reg.userUid === user.uid;
                  const isChecked = reg.status === "checked-in" || reg.status === "attended";
                  
                  return (
                    <div
                      key={reg.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-primary-fixed/10 border-primary-fixed-dim"
                          : "bg-white border-outline-variant/60 hover:shadow-sm"
                      }`}
                    >
                      <div className="relative">
                        {reg.userPhotoURL ? (
                          <img
                            src={reg.userPhotoURL}
                            alt={`${reg.userName} avatar`}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold uppercase">
                            {reg.userName.charAt(0)}
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[8px] rounded-full px-1 py-0.5 leading-none font-bold scale-90">
                            TÚ
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-on-surface truncate">{reg.userName}</p>
                        <p className="text-[10px] text-on-surface-variant">{reg.userRole}</p>
                      </div>

                      {isChecked ? (
                        <span className="material-symbols-outlined text-green-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">
                          schedule
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Camino al Servicio Progress Tracker */}
          {user.role === "monaguillo" && isUserRegistered && (
            <section className="bg-surface-container-lowest border border-outline-variant/50 p-4 rounded-2xl">
              <h3 className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase mb-4">
                Mi Camino al Servicio
              </h3>
              <div className="flex items-center justify-between px-2">
                {/* Step 1: Inscrito */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`material-symbols-outlined text-2xl transition-colors ${stepInscrito ? "text-secondary" : "text-outline-variant"}`} style={{ fontVariationSettings: stepInscrito ? "'FILL' 1" : "'FILL' 0" }}>
                    footprint
                  </span>
                  <span className={`text-[10px] font-bold ${stepInscrito ? "text-secondary" : "text-on-surface-variant"}`}>
                    Inscrito
                  </span>
                </div>

                <div className={`h-[2px] flex-1 mx-3 mb-6 transition-colors ${stepEnSitio ? "bg-secondary" : "bg-outline-variant/50"}`} />

                {/* Step 2: En Sitio */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`material-symbols-outlined text-2xl transition-colors ${stepEnSitio ? "text-secondary" : "text-outline-variant"}`} style={{ fontVariationSettings: stepEnSitio ? "'FILL' 1" : "'FILL' 0" }}>
                    footprint
                  </span>
                  <span className={`text-[10px] font-bold ${stepEnSitio ? "text-secondary" : "text-on-surface-variant"}`}>
                    En Sitio
                  </span>
                </div>

                <div className={`h-[2px] flex-1 mx-3 mb-6 transition-colors ${stepServido ? "bg-secondary" : "bg-outline-variant/50"}`} />

                {/* Step 3: Servido */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`material-symbols-outlined text-2xl transition-colors ${stepServido ? "text-secondary" : "text-outline-variant"}`} style={{ fontVariationSettings: stepServido ? "'FILL' 1" : "'FILL' 0" }}>
                    footprint
                  </span>
                  <span className={`text-[10px] font-bold ${stepServido ? "text-secondary" : "text-on-surface-variant"}`}>
                    Servido
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Role selector if not registered */}
          {user.role === "monaguillo" && !isUserRegistered && (
            <div className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant">Selecciona tu Rol Litúrgico:</label>
              <div className="grid grid-cols-3 gap-2">
                {rolesList.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`h-9 rounded-xl text-xs font-bold border transition-all ${
                      selectedRole === r
                        ? "bg-primary text-white border-primary"
                        : "bg-white border-outline-variant text-on-surface-variant hover:border-outline"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <footer className="p-6 bg-surface-container-low border-t border-outline-variant/30 flex flex-col gap-2 flex-shrink-0">
          {user.role === "monaguillo" && (
            <>
              {/* Check-in Button */}
              {isUserRegistered && (
                <button
                  onClick={handleCheckIn}
                  disabled={!isCheckInOpen || isUserCheckedIn || loading}
                  className={`w-full font-bold text-xs py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isUserCheckedIn
                      ? "bg-green-600 text-white cursor-not-allowed"
                      : isCheckInOpen
                        ? "bg-secondary text-on-secondary hover:opacity-90"
                        : "bg-surface-variant text-on-surface-variant opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                  {isUserCheckedIn 
                    ? "CHECK-IN REALIZADO (EN SITIO)" 
                    : isCheckInOpen 
                      ? "CONFIRMAR ASISTENCIA (CHECK-IN)" 
                      : "CHECK-IN FUERA DE RANGO HORA"}
                </button>
              )}

              {/* Register / Cancel Button group */}
              <div className="flex gap-2">
                {isUserRegistered ? (
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 border-2 border-primary text-primary font-bold py-3 rounded-xl hover:bg-primary-fixed/10 transition-colors text-xs active:scale-95"
                  >
                    CANCELAR TURNO
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-container transition-colors text-xs active:scale-95"
                  >
                    ANOTARME
                  </button>
                )}
              </div>
            </>
          )}

          {user.role !== "monaguillo" && (
            <button
              onClick={onClose}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-xs hover:bg-primary-container transition-colors"
            >
              CERRAR
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
