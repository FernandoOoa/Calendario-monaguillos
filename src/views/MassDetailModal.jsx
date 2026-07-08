import React, { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM } from "../utils/time";

export default function MassDetailModal({ mass, dateStr, user, onClose }) {
  const [registrations, setRegistrations] = useState([]);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInStatusText, setCheckInStatusText] = useState("");
  const [loading, setLoading] = useState(false);

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
    
    const now = new Date();
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
      await db.registerForMass(mass.id, user, "Monaguillo", dateStr);
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
  const isMassFinished = new Date() > new Date(massStart.getTime() + 60 * 60000);
  const hasStarted = new Date() > massStart;
  const stepServido = isUserCheckedIn && isMassFinished;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 modal-blur flex items-center justify-center p-4 md:p-8 font-sans">
      {/* Modal Container */}
      <main className="relative w-full max-w-2xl bg-[#121212] border border-white/15 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] glass-card">
        
        {/* Banner Image / Header */}
        <div className="relative h-44 md:h-56 flex-shrink-0">
          <img
            className="w-full h-full object-cover"
            alt="Interior de iglesia"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC67G4S0X1oDYsuCT50k6NYeLjbZImRiyXakxsO7fEslduQBkLTzDB8rQkd4oIU_NbRCceIsxcctphIWjRmDHuoLb5SZwfGBxazLmYcTkVtliWF8DjDUY50tRbKZX7zITvUlDZ3g3r71XD2fcMFrLRFHds9ivcWYuxJQCRtaCFsxTDQyGZTvzr6SEtT_pdyO7IIux-UVxtqGo15fujuoDVMGuZnqQGxXeoW2ZlzHJrE-TVt7-mUwckcmwfWQaNSp5lZufq3ZVjk3yw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent"></div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-all active:scale-95 flex items-center justify-center border border-white/10"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          {/* Title and Badge */}
          <div className="absolute bottom-4 left-6 right-6">
            <span className="bg-secondary text-black px-3 py-1 rounded-full font-extrabold text-xs tracking-wider uppercase shadow-md">
              {mass.type}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2 drop-shadow-md">
              {mass.title} — {formatTimeToAMPM(mass.time)}
            </h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 no-scrollbar">
          
          {/* Notes */}
          {mass.notes && (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="font-bold text-secondary text-sm block mb-1.5">Notas Litúrgicas:</span>
              <p className="text-sm text-gray-200 leading-relaxed">{mass.notes}</p>
            </div>
          )}

          {/* Notification Alert Banner */}
          <section className="bg-primary/20 text-white p-5 rounded-2xl flex items-start gap-3.5 border border-primary/30">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <div>
              <p className="text-xs font-bold text-secondary tracking-wider mb-1 uppercase">REGLA DE ASISTENCIA Y CHECK-IN</p>
              <p className="text-sm leading-relaxed text-gray-200">
                El check-in se activa 60 minutos antes de la misa y cierra 60 minutos después. 
                <span className="font-bold text-amber-400 block mt-1.5 text-sm">{checkInStatusText}</span>
              </p>
            </div>
          </section>

          {/* Registered Altar Servers */}
          <section>
            <div className="flex justify-between items-center mb-3.5">
              <h2 className="text-base font-bold text-white">Servidores Asignados</h2>
              <span className="text-xs font-bold bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-white">
                {registrations.length} {mass.serversRequired ? `de ${mass.serversRequired}` : ""} Acólito(s)
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registrations.length === 0 ? (
                <div className="sm:col-span-2 text-center py-8 text-sm text-gray-400 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  No hay monaguillos registrados para esta misa. ¡Sé el primero en anotarte!
                </div>
              ) : (
                registrations.map((reg) => {
                  const isCurrent = reg.userUid === user.uid;
                  const isChecked = reg.status === "checked-in" || reg.status === "attended";
                  
                  return (
                    <div
                      key={reg.id}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-primary/20 border-primary/40 text-white shadow-md"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      }`}
                    >
                      <div className="relative">
                        {reg.userPhotoURL ? (
                          <img
                            src={reg.userPhotoURL}
                            alt={`${reg.userName} avatar`}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-extrabold uppercase">
                            {reg.userName.charAt(0)}
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[9px] rounded-full px-1.5 py-0.5 leading-none font-bold scale-90">
                            TÚ
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{reg.userName}</p>
                      </div>

                      {isChecked ? (
                        <span className="material-symbols-outlined text-green-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-400 text-xl">
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
            <section className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
              <h3 className="text-xs font-bold text-secondary tracking-wider uppercase mb-4">
                Mi Camino al Servicio
              </h3>
              <div className="flex items-center justify-between px-3">
                {/* Step 1: Inscrito */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`material-symbols-outlined text-2xl transition-colors ${stepInscrito ? "text-secondary" : "text-white/10"}`} style={{ fontVariationSettings: stepInscrito ? "'FILL' 1" : "'FILL' 0" }}>
                    footprint
                  </span>
                  <span className={`text-xs font-bold ${stepInscrito ? "text-secondary" : "text-gray-400"}`}>
                    Inscrito
                  </span>
                </div>

                <div className={`h-[2px] flex-1 mx-3 mb-6 transition-colors ${stepEnSitio ? "bg-secondary" : "bg-white/10"}`} />

                {/* Step 2: En Sitio */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`material-symbols-outlined text-2xl transition-colors ${stepEnSitio ? "text-secondary" : "text-white/10"}`} style={{ fontVariationSettings: stepEnSitio ? "'FILL' 1" : "'FILL' 0" }}>
                    footprint
                  </span>
                  <span className={`text-xs font-bold ${stepEnSitio ? "text-secondary" : "text-gray-400"}`}>
                    En Sitio
                  </span>
                </div>

                <div className={`h-[2px] flex-1 mx-3 mb-6 transition-colors ${stepServido ? "bg-secondary" : "bg-white/10"}`} />

                {/* Step 3: Servido */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`material-symbols-outlined text-2xl transition-colors ${stepServido ? "text-secondary" : "text-white/10"}`} style={{ fontVariationSettings: stepServido ? "'FILL' 1" : "'FILL' 0" }}>
                    footprint
                  </span>
                  <span className={`text-xs font-bold ${stepServido ? "text-secondary" : "text-gray-400"}`}>
                    Servido
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Selector de rol eliminado */}

        </div>

        {/* Footer Actions */}
        <footer className="p-6 bg-black/40 border-t border-white/10 flex flex-col gap-3 flex-shrink-0">
          {user.role === "monaguillo" && (
            <>
              {/* Check-in Button */}
              {isUserRegistered && (
                <button
                  onClick={handleCheckIn}
                  disabled={!isCheckInOpen || isUserCheckedIn || loading}
                  className={`w-full font-extrabold text-sm py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isUserCheckedIn
                      ? "bg-green-600 text-white cursor-not-allowed border border-green-400/20"
                      : isCheckInOpen
                        ? "bg-secondary text-black hover:bg-secondary/90"
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
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
              <div className="flex gap-2 w-full">
                {hasStarted ? (
                  isUserRegistered ? (
                    <div className="w-full text-center text-xs font-bold py-3 px-4 rounded-xl bg-error/10 border border-error/20 text-error">
                      {isUserCheckedIn 
                        ? "Misa finalizada. Servicio completado." 
                        : "Esta celebración ya inició o finalizó. No es posible cancelar."}
                    </div>
                  ) : (
                    <div className="w-full text-center text-xs font-bold py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                      Esta celebración ya inició o finalizó. No es posible inscribirse.
                    </div>
                  )
                ) : isUserRegistered ? (
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors text-sm active:scale-95"
                  >
                    CANCELAR TURNO
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors text-sm active:scale-95"
                  >
                    ANOTARSE
                  </button>
                )}
              </div>
            </>
          )}

          {user.role !== "monaguillo" && (
            <button
              onClick={onClose}
              className="w-full bg-primary text-white py-4 rounded-xl font-extrabold text-sm hover:bg-primary/90 transition-colors"
            >
              CERRAR
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
