import React, { useState, useEffect } from "react";
import { db, dev } from "../services/firebase";
import { alerts } from "../services/alerts";

export default function Dashboard({ user, onSelectMass }) {
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // Date object
  const [masses, setMasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate the week based on current simulated time
  const generateWeek = () => {
    const refDate = dev.getSimulatedTime();
    const currentDayIdx = refDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Find the Monday of the current week
    const mondayOffset = currentDayIdx === 0 ? -6 : 1 - currentDayIdx;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + mondayOffset);
    
    const days = [];
    const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
    
    for (let i = 0; i < 7; i++) {
      const tempDate = new Date(monday);
      tempDate.setDate(monday.getDate() + i);
      
      const dateStr = tempDate.toISOString().split("T")[0];
      const dayOfWeek = tempDate.getDay();
      
      days.push({
        date: tempDate,
        dateStr,
        dayOfWeek,
        name: dayNames[dayOfWeek],
        dayNum: tempDate.getDate(),
        isSundayOrSaturday: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    
    setWeekDays(days);
    
    // Set selected date to today if it falls in this week, otherwise Monday
    const todayStr = refDate.toISOString().split("T")[0];
    const matchToday = days.find(d => d.dateStr === todayStr);
    
    if (matchToday) {
      setSelectedDate(matchToday);
    } else {
      setSelectedDate(days[0]); // default to Monday
    }
  };

  useEffect(() => {
    generateWeek();
    
    // Listen for time changes in the dev panel
    const handleTimeChange = () => {
      generateWeek();
    };
    window.addEventListener("simulated-time-changed", handleTimeChange);
    return () => window.removeEventListener("simulated-time-changed", handleTimeChange);
  }, []);

  // Fetch masses for the selected day
  const fetchMasses = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const dayMasses = await db.getMassesForDay(selectedDate.dayOfWeek, selectedDate.dateStr);
      setMasses(dayMasses);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasses();
    
    // Register event listener for local state sync
    const handleSync = () => fetchMasses();
    window.addEventListener("mass-state-updated", handleSync);
    window.addEventListener("simulated-time-changed", handleSync);
    return () => {
      window.removeEventListener("mass-state-updated", handleSync);
      window.removeEventListener("simulated-time-changed", handleSync);
    };
  }, [selectedDate]);

  const handleRegister = async (e, massId) => {
    e.stopPropagation();
    try {
      await db.registerForMass(massId, user, "Acólito");
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert(err.message, "Error al anotarse", "error");
    }
  };

  const handleRequestSwap = async () => {
    if (user.role !== "monaguillo") {
      alerts.alert("Solo los monaguillos pueden solicitar un cambio de turno.", "Operación no permitida", "warning");
      return;
    }
    // Simulate shift swap request
    await alerts.alert("Tu solicitud de cambio de turno ha sido publicada. Los demás servidores recibirán una notificación.", "Cambio de Turno", "success");
    // Trigger in-app notification simulation for others
    const event = new Event("notifications-updated");
    window.dispatchEvent(event);
  };

  return (
    <div className="flex-grow py-8 max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop">
      {/* Header Section */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-sans text-2xl md:text-3xl font-bold text-primary mb-1">Horario Semanal</h1>
            <p className="text-sm text-on-surface-variant">Gestiona tus turnos y asiste a la comunidad en el servicio del altar.</p>
          </div>
          {user.role === "monaguillo" && (
            <button
              onClick={handleRequestSwap}
              className="bg-tertiary-fixed text-on-tertiary-fixed px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:scale-102 transition-transform active:scale-95 border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              SOLICITAR CAMBIO
            </button>
          )}
        </div>

        {/* Horizontal Weekly Calendar Selector */}
        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-3 -mx-container-padding-mobile px-container-padding-mobile md:mx-0 md:px-0">
          {weekDays.map((day) => {
            const isSelected = selectedDate && selectedDate.dateStr === day.dateStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day)}
                className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border ${
                  isSelected
                    ? "bg-primary text-white shadow-lg scale-102 border-primary"
                    : "bg-white text-on-surface-variant hover:bg-surface-container-high border-outline-variant"
                }`}
              >
                <span className={`text-[10px] font-bold tracking-widest uppercase ${
                  isSelected ? "opacity-90" : day.isSundayOrSaturday ? "text-primary font-bold" : "opacity-60"
                }`}>
                  {day.name}
                </span>
                <span className="text-xl font-bold">
                  {day.dayNum}
                </span>
                {/* Simulated dot indicator if day has masses (we can simulate standard masses on Sunday/Tues/Sat) */}
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isSelected ? "bg-white" : (day.dayOfWeek === 0 || day.dayOfWeek === 2 || day.dayOfWeek === 6) ? "bg-primary" : "bg-transparent"
                }`} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Mass Cards Grid */}
      <h2 className="text-lg font-bold text-on-surface mb-4">Celebraciones del Día</h2>
      
      {loading ? (
        <div className="text-center py-12">
          <p className="text-on-surface-variant text-sm">Cargando misas...</p>
        </div>
      ) : masses.length === 0 ? (
        <section className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-primary transition-colors">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">event_note</span>
          <div>
            <p className="font-bold text-on-surface-variant text-base">Sin más misas</p>
            <p className="text-xs text-on-surface-variant/70 mt-1">No hay más celebraciones programadas para este día.</p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
          {masses.map((mass) => {
            const isUserRegistered = mass.registrations?.some(r => r.userUid === user.uid);
            const userReg = mass.registrations?.find(r => r.userUid === user.uid);
            
            return (
              <div
                key={mass.id}
                onClick={() => onSelectMass(mass, selectedDate.dateStr)}
                className={`group relative bg-white rounded-3xl p-6 shadow-sm border border-outline-variant/50 hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 ${
                  mass.type === "SOLEMNE" 
                    ? "border-l-primary" 
                    : mass.type === "BAUTIZO" 
                      ? "border-l-tertiary-container" 
                      : "border-l-secondary"
                }`}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="text-primary font-bold text-xl">{mass.time}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold w-fit mt-1 tracking-wider ${
                      mass.type === "SOLEMNE"
                        ? "bg-primary/10 text-primary"
                        : mass.type === "BAUTIZO"
                          ? "bg-tertiary-container/30 text-on-tertiary-container"
                          : "bg-secondary-container text-on-secondary-container"
                    }`}>
                      {mass.type}
                    </span>
                  </div>
                  <span className={`material-symbols-outlined scale-110 ${
                    mass.type === "SOLEMNE" 
                      ? "text-primary" 
                      : mass.type === "BAUTIZO" 
                        ? "text-tertiary-container" 
                        : "text-secondary"
                  }`}>
                    {mass.type === "BAUTIZO" ? "water_drop" : "church"}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-base font-bold text-on-surface mb-4">{mass.title}</h3>
                
                {/* Altar Servers Count & Avatars */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-primary">group</span>
                    <span>{mass.registrations?.length || 0} servidores anotados</span>
                  </div>
                  
                  {mass.registrations && mass.registrations.length > 0 ? (
                    <div className="flex -space-x-2.5 overflow-hidden">
                      {mass.registrations.slice(0, 4).map((reg) => (
                        reg.userPhotoURL ? (
                          <img
                            key={reg.id}
                            src={reg.userPhotoURL}
                            alt={`${reg.userName} avatar`}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                            title={`${reg.userName} (${reg.userRole})`}
                          />
                        ) : (
                          <div 
                            key={reg.id} 
                            className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container ring-2 ring-white flex items-center justify-center text-[10px] font-bold uppercase"
                            title={`${reg.userName} (${reg.userRole})`}
                          >
                            {reg.userName.charAt(0)}
                          </div>
                        )
                      ))}
                      {mass.registrations.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-surface-container-high text-primary ring-2 ring-white flex items-center justify-center text-[9px] font-bold">
                          +{mass.registrations.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-on-surface-variant/60 italic">Sin monaguillos registrados.</p>
                  )}
                </div>

                {/* Action Button */}
                {user.role === "monaguillo" && (
                  <div className="mt-auto">
                    {isUserRegistered ? (
                      <div className="w-full text-center py-2.5 bg-primary-fixed/20 text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        {userReg.status === "checked-in" ? "ASISTENCIA CONFIRMADA" : "INSCRITO"}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleRegister(e, mass.id)}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold text-xs tracking-wider hover:bg-primary-container transition-colors shadow-sm active:scale-95"
                      >
                        ANOTARSE
                      </button>
                    )}
                  </div>
                )}
                
                {user.role !== "monaguillo" && (
                  <button className="w-full border border-outline text-on-surface py-2.5 rounded-xl font-bold text-xs hover:bg-surface-container-low transition-colors">
                    VER ASISTENCIA
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
