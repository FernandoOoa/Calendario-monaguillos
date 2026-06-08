import React, { useState, useEffect } from "react";
import { db, dev } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM, getLocalDateString } from "../utils/time";

export default function Home({ user, onSelectMass }) {
  const [nextMassData, setNextMassData] = useState(null); // { mass, dateStr, massStart }
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("Acólito");
  const [countdownText, setCountdownText] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [parentChildrenRegs, setParentChildrenRegs] = useState([]);

  const rolesList = ["Acólito", "Crucífero", "Turiferario", "Ceroferario", "Navicularia", "Ceremoniario"];

  // Find next upcoming mass algorithm
  const findNextMass = async () => {
    setLoading(true);
    try {
      const now = dev.getSimulatedTime();
      let found = null;
      
      // Look day by day for the next 7 days
      for (let i = 0; i < 7; i++) {
        const tempDate = new Date(now);
        tempDate.setDate(now.getDate() + i);
        const dateStr = getLocalDateString(tempDate);
        const dayOfWeek = tempDate.getDay();
        
        const dayMasses = await db.getMassesForDay(dayOfWeek, dateStr);
        if (dayMasses.length > 0) {
          const candidates = dayMasses.map(mass => {
            const [hour, minute] = mass.time.split(":").map(Number);
            const [year, month, day] = dateStr.split("-").map(Number);
            const massStart = new Date(year, month - 1, day, hour, minute);
            return { mass, dateStr, massStart };
          });
          
          // Filter out finished masses (mass start + 1 hour has passed)
          const upcoming = candidates.filter(c => {
            const massEnd = new Date(c.massStart.getTime() + 60 * 60 * 1000);
            return massEnd > now;
          });
          
          if (upcoming.length > 0) {
            // Sort ascending by start time
            upcoming.sort((a, b) => a.massStart - b.massStart);
            found = upcoming[0];
            break;
          }
        }
      }
      
      setNextMassData(found);
      if (found) {
        // Fetch registrations for this next mass
        const list = await db.getMassAttendance(found.mass.id, found.dateStr);
        setRegistrations(list);
        
        // If parent, see if any child is registered
        if (user.role === "padre") {
          const childRegs = list.filter(r => user.childEmails?.includes(r.userEmail || ""));
          setParentChildrenRegs(childRegs);
        }
      }
    } catch (e) {
      console.error("Error finding next mass:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    findNextMass();
    
    // Listen for state changes (e.g. time travel, register)
    const handleSync = () => findNextMass();
    window.addEventListener("mass-state-updated", handleSync);
    window.addEventListener("simulated-time-changed", handleSync);
    
    return () => {
      window.removeEventListener("mass-state-updated", handleSync);
      window.removeEventListener("simulated-time-changed", handleSync);
    };
  }, [user]);

  // Update countdown clock
  useEffect(() => {
    if (!nextMassData) return;
    
    const updateCountdown = () => {
      const now = dev.getSimulatedTime();
      const massStart = nextMassData.massStart;
      const diffMs = massStart - now;
      
      // Set check-in status (open if within +/- 1 hour window)
      const diffMins = diffMs / 60000;
      const isOpen = diffMins >= -60 && diffMins <= 60;
      setCheckInOpen(isOpen);

      if (diffMs <= 0) {
        if (Math.abs(diffMins) <= 60) {
          setCountdownText("¡Misa en curso / Ventana de check-in activa!");
        } else {
          setCountdownText("Celebración finalizada.");
        }
        return;
      }
      
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const diffMinsTotal = Math.floor(diffMs / 60000);
      const mins = diffMinsTotal % 60;
      const hoursTotal = Math.floor(diffMinsTotal / 60);
      const hours = hoursTotal % 24;
      const days = Math.floor(hoursTotal / 24);
      
      let text = "Faltan: ";
      if (days > 0) {
        text += `${days} ${days === 1 ? "día" : "días"}, ${hours}h ${mins}m y ${seconds}s`;
      } else if (hours > 0) {
        text += `${hours}h ${mins}m y ${seconds}s`;
      } else if (mins > 0) {
        text += `${mins} min(s) y ${seconds}s`;
      } else {
        text += `${seconds} seg(s)`;
      }
      setCountdownText(text);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // update every 1s (second precision)
    return () => clearInterval(interval);
  }, [nextMassData]);

  // Sign up from home card
  const handleRegister = async () => {
    if (!nextMassData || user.role !== "monaguillo") return;
    setActionLoading(true);
    try {
      await db.registerForMass(nextMassData.mass.id, user, selectedRole, nextMassData.dateStr);
      window.dispatchEvent(new Event("mass-state-updated"));
      alerts.alert("¡Te has anotado con éxito para la misa!", "Inscripción Exitosa", "success");
    } catch (err) {
      alerts.alert(err.message, "Error al anotarse", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel registration from home card
  const handleCancel = async () => {
    if (!nextMassData) return;
    const ok = await alerts.confirm("¿Estás seguro de que deseas cancelar tu asistencia a esta misa? Se notificará a tu tutor.", "Cancelar Asistencia");
    if (!ok) return;
    setActionLoading(true);
    try {
      await db.cancelMassRegistration(nextMassData.mass.id, user.uid, nextMassData.dateStr);
      window.dispatchEvent(new Event("mass-state-updated"));
      alerts.alert("Tu asistencia ha sido cancelada correctamente.", "Cancelación Completada", "info");
    } catch (err) {
      alerts.alert(err.message, "Error al cancelar", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Check-in from home card
  const handleCheckIn = async () => {
    if (!nextMassData) return;
    setActionLoading(true);
    try {
      await db.checkInForMass(nextMassData.mass.id, user.uid, nextMassData.dateStr);
      window.dispatchEvent(new Event("mass-state-updated"));
      alerts.alert("¡Check-in realizado! Has confirmado que estás en el templo.", "Check-in Exitoso", "success");
    } catch (err) {
      alerts.alert(err.message, "Error al realizar check-in", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-8">
        <p className="text-on-surface-variant text-xs font-semibold animate-pulse">Buscando misa próxima...</p>
      </div>
    );
  }

  if (!nextMassData) {
    return (
      <div className="flex-grow py-8 max-w-4xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop flex flex-col items-center justify-center text-center gap-4">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">church</span>
        <div>
          <h2 className="text-lg font-bold text-on-surface">Sin Misas Programadas</h2>
          <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm">No se encontraron celebraciones en los próximos 7 días en el calendario.</p>
        </div>
      </div>
    );
  }

  const { mass, dateStr, massStart } = nextMassData;
  const userReg = registrations.find(r => r.userUid === user.uid);
  const isUserRegistered = !!userReg;
  const isUserCheckedIn = userReg?.status === "checked-in" || userReg?.status === "attended";
  
  // Footprint tracker stages
  const stepInscrito = isUserRegistered;
  const stepEnSitio = isUserCheckedIn;
  const isMassFinished = dev.getSimulatedTime() > new Date(massStart.getTime() + 60 * 60000);
  const stepServido = isUserCheckedIn && isMassFinished;

  // Format date readable in spanish
  const formatDateSpanish = (date) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  return (
    <div className="flex-grow py-6 max-w-4xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop font-sans pb-24 md:pb-8">
      {/* Welcome Section */}
      <section className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface">¡Hola, {user.name}!</h1>
          <p className="text-xs text-on-surface-variant">Esta es la próxima celebración programada en la parroquia.</p>
        </div>
        <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          {user.role === "monaguillo" ? "Monaguillo" : user.role === "padre" ? "Padre / Tutor" : "Coordinador (Admin)"}
        </span>
      </section>

      {/* Main Upcoming Mass Hero Card */}
      <main className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        {/* Banner with type/details */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 md:p-8 text-white relative">
          {/*church pattern overlay*/}
          <div className="absolute inset-0 opacity-10 flex items-center justify-end pr-10 overflow-hidden select-none pointer-events-none">
            <span className="material-symbols-outlined text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              church
            </span>
          </div>

          <div className="relative space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold text-[9px] tracking-wider uppercase border border-white/10">
                {mass.type}
              </span>
              <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full font-bold text-[9px] tracking-wider uppercase">
                {countdownText}
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{mass.title}</h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1.5 text-xs font-semibold opacity-90">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg">calendar_month</span>
                {formatDateSpanish(massStart)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg">schedule</span>
                {formatTimeToAMPM(mass.time)}
              </span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Notes description */}
          {mass.notes && (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="font-bold text-secondary text-sm block mb-1.5">Notas Litúrgicas / Requisitos:</span>
              <p className="text-sm text-gray-200 leading-relaxed">{mass.notes}</p>
            </div>
          )}

          {/* Parent linked kids notifier */}
          {user.role === "padre" && (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-start gap-3.5">
              <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              <div className="text-sm">
                <span className="font-bold text-secondary block mb-1.5">Monitoreo de Hijos:</span>
                {parentChildrenRegs.length === 0 ? (
                  <p className="text-gray-400 italic">Ninguno de tus hijos vinculados se ha anotado todavía para esta misa.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {parentChildrenRegs.map(reg => (
                      <div key={reg.id} className="flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span>
                          <strong className="text-white">{reg.userName}</strong> está inscrito como <strong className="text-secondary">{reg.userRole}</strong> (Estado: 
                          <span className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            reg.status === "checked-in" || reg.status === "attended" 
                              ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                              : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}>
                            {reg.status === "checked-in" ? "EN TEMPLO" : reg.status === "attended" ? "COMPLETADO" : "PENDIENTE"}
                          </span>)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registered servers stack list */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3.5 flex items-center justify-between">
              <span>Servidores Litúrgicos Inscritos</span>
              <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-white font-bold">
                {registrations.length} monaguillos
              </span>
            </h3>

            {registrations.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                No hay monaguillos inscritos para esta celebración todavía.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registrations.map(reg => {
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
                            alt={reg.userName}
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
                        <p className="text-xs text-gray-300 font-medium">{reg.userRole}</p>
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
                })}
              </div>
            )}
          </div>

          {/* Camino al Servicio Timeline (Only for registered Monaguillos) */}
          {user.role === "monaguillo" && isUserRegistered && (
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-secondary tracking-wider uppercase mb-4">
                Mi Camino al Servicio en esta Misa
              </h4>
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
            </div>
          )}

          {/* Role selector selector if not registered */}
          {user.role === "monaguillo" && !isUserRegistered && (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3">
              <label className="text-sm font-bold text-secondary">Selecciona tu Rol Litúrgico para anotarte:</label>
              <div className="grid grid-cols-3 gap-2">
                {rolesList.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all ${
                      selectedRole === r
                        ? "bg-primary text-white border-primary shadow"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
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
        <footer className="p-6 md:px-8 bg-black/40 border-t border-white/10 flex flex-col gap-3">
          {user.role === "monaguillo" && (
            <>
              {/* Check-in Button */}
              {isUserRegistered && (
                <button
                  onClick={handleCheckIn}
                  disabled={!checkInOpen || isUserCheckedIn || actionLoading}
                  className={`w-full font-extrabold text-sm py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isUserCheckedIn
                      ? "bg-green-600 text-white cursor-not-allowed border border-green-400/20"
                      : checkInOpen
                        ? "bg-secondary text-black hover:bg-secondary/90"
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                  {isUserCheckedIn 
                    ? "CHECK-IN REALIZADO (EN TEMPLO)" 
                    : checkInOpen 
                      ? "CONFIRMAR ASISTENCIA (CHECK-IN)" 
                      : "CHECK-IN FUERA DE RANGO HORA"}
                </button>
              )}

              {/* Register / Cancel Button group */}
              <div className="flex gap-2">
                {isUserRegistered ? (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="flex-1 border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors text-sm active:scale-95"
                  >
                    CANCELAR ASISTENCIA A ESTA MISA
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={actionLoading}
                    className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors text-sm active:scale-95"
                  >
                    ANOTARSE EN ESTA MISA
                  </button>
                )}
              </div>
            </>
          )}

          {/* Admin quick access */}
          {user.role === "admin" && (
            <button
              onClick={() => onSelectMass(mass, dateStr)}
              className="w-full bg-primary text-white py-4 rounded-xl font-extrabold text-sm hover:bg-primary/90 transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">playlist_add_check</span>
              VER HOJA DE ASISTENCIA EN DETALLE
            </button>
          )}

          {user.role === "padre" && (
            <p className="text-xs text-center text-gray-400 italic leading-relaxed">
              * Para inscribir o modificar turnos de tus hijos, utiliza la pestaña de Calendario o comunícate con el Coordinador.
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
