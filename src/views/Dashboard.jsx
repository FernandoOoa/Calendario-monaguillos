import React, { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM, getLocalDateString } from "../utils/time";

export default function Dashboard({ user, onSelectMass }) {
  const [viewMode, setViewMode] = useState("week"); // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date()); // Anchor date for week or month
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // Selected day object
  const [masses, setMasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduledDays, setScheduledDays] = useState(new Set());

  // Generate 7 days for the weekly view
  const generateWeek = (refDate) => {
    const currentDayIdx = refDate.getDay();
    const sundayOffset = -currentDayIdx;
    const sunday = new Date(refDate);
    sunday.setDate(refDate.getDate() + sundayOffset);
    
    const days = [];
    const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
    
    for (let i = 0; i < 7; i++) {
      const tempDate = new Date(sunday);
      tempDate.setDate(sunday.getDate() + i);
      
      const dateStr = getLocalDateString(tempDate);
      const dayOfWeek = tempDate.getDay();
      
      days.push({
        date: tempDate,
        dateStr,
        dayOfWeek,
        name: dayNames[dayOfWeek],
        dayNum: tempDate.getDate(),
        isSundayOrSaturday: dayOfWeek === 0 || dayOfWeek === 6,
        isCurrentMonth: true
      });
    }
    return days;
  };

  // Generate 35 days (5 weeks) for the monthly view
  const generateMonth = (refDate) => {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const sunday = new Date(firstDay);
    sunday.setDate(1 - startDayOfWeek);
    
    const days = [];
    const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
    
    for (let i = 0; i < 35; i++) {
      const tempDate = new Date(sunday);
      tempDate.setDate(sunday.getDate() + i);
      
      const dateStr = getLocalDateString(tempDate);
      const dayOfWeek = tempDate.getDay();
      
      days.push({
        date: tempDate,
        dateStr,
        dayOfWeek,
        name: dayNames[dayOfWeek],
        dayNum: tempDate.getDate(),
        isSundayOrSaturday: dayOfWeek === 0 || dayOfWeek === 6,
        isCurrentMonth: tempDate.getMonth() === month
      });
    }
    return days;
  };

  // Sync calendar days based on currentDate and viewMode
  useEffect(() => {
    if (viewMode === "week") {
      setCalendarDays(generateWeek(currentDate));
    } else {
      setCalendarDays(generateMonth(currentDate));
    }
  }, [currentDate, viewMode]);

  // Set initial selected date to today
  useEffect(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    setSelectedDate({
      date: today,
      dateStr: todayStr,
      dayOfWeek: today.getDay()
    });
  }, []);

  const loadScheduledDays = async () => {
    try {
      const list = await db.getAllMasses();
      const days = new Set(list.map(m => m.dayOfWeek));
      setScheduledDays(days);
    } catch (e) {
      console.error("Error loading scheduled days:", e);
    }
  };

  useEffect(() => {
    loadScheduledDays();
    window.addEventListener("mass-state-updated", loadScheduledDays);
    return () => window.removeEventListener("mass-state-updated", loadScheduledDays);
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
      await db.registerForMass(massId, user, "Acólito", selectedDate.dateStr);
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

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

  return (
    <div className="flex-grow py-8 max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop">
      {/* Header Section */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-sans text-2xl md:text-3xl font-bold text-primary mb-1">Calendario de Turnos</h1>
            <p className="text-sm text-on-surface-variant">Gestiona tus turnos y asiste a la comunidad en el servicio del altar.</p>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "monaguillo" && (
              <button
                onClick={handleRequestSwap}
                className="bg-tertiary-fixed text-on-tertiary-fixed px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:scale-102 transition-all active:scale-95 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                SOLICITAR CAMBIO
              </button>
            )}
          </div>
        </div>

        {/* Calendar Navigation & View Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl glass-card mb-6">
          {/* Month/Week Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-xl glass-card hover:bg-white/10 flex items-center justify-center transition-all text-on-surface"
              title="Anterior"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            
            <h2 className="text-lg font-bold text-on-surface min-w-[140px] text-center capitalize">
              {viewMode === "week" ? "Semana Actual" : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </h2>

            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-xl glass-card hover:bg-white/10 flex items-center justify-center transition-all text-on-surface"
              title="Siguiente"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {/* View Toggles (Week vs Month) */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "week"
                  ? "bg-primary text-white shadow"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "month"
                  ? "bg-primary text-white shadow"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Mensual
            </button>
          </div>
        </div>

        {/* Real Calendar Grid */}
        <div className="glass-card rounded-3xl p-4 md:p-6 mb-8 overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 mb-3 text-center">
            {dayNames.map((name, idx) => (
              <div
                key={name}
                className={`text-xs font-bold tracking-widest ${
                  idx === 0 || idx === 6 ? "text-primary" : "text-white/80"
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const isSelected = selectedDate && selectedDate.dateStr === day.dateStr;
              const isToday = getLocalDateString(new Date()) === day.dateStr;
              
              // Mass schedule indicator rule (checks if this day of the week has a mass in the database)
              const hasMass = scheduledDays.has(day.dayOfWeek);

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square md:aspect-auto md:h-20 rounded-2xl p-2 flex flex-col items-center md:items-start justify-between transition-all border relative ${
                    isSelected
                      ? "bg-primary/20 border-primary shadow-lg text-white"
                      : isToday
                        ? "bg-white/5 border-secondary/50 text-white font-bold"
                        : "bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/5"
                  } ${!day.isCurrentMonth ? "opacity-30" : ""}`}
                >
                  {/* Day number */}
                  <span className={`text-xs md:text-sm font-extrabold ${
                    isSelected ? "text-white" : isToday ? "text-secondary" : "text-gray-200"
                  }`}>
                    {day.dayNum}
                  </span>

                  {/* Dot indicator (mass schedule) */}
                  <div className="flex items-center gap-1 justify-center md:justify-start w-full">
                    {hasMass && (
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-primary" : isToday ? "bg-secondary" : "bg-primary"
                      }`} />
                    )}
                    {isToday && (
                      <span className="hidden md:inline text-[9px] uppercase font-bold text-secondary">
                        Hoy
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mass Cards Grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Celebraciones del {selectedDate ? selectedDate.dateStr.split("-").reverse().join("/") : ""}
        </h2>
        {selectedDate && (
          <span className="text-xs text-white bg-white/5 px-3 py-1 rounded-full border border-white/5">
            {dayNames[selectedDate.dayOfWeek]}
          </span>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Cargando misas...</p>
        </div>
      ) : masses.length === 0 ? (
        <section className="glass-card border-2 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-primary/50 transition-colors">
          <span className="material-symbols-outlined text-4xl text-gray-400">event_note</span>
          <div>
            <p className="font-bold text-white text-base">Sin misas programadas</p>
            <p className="text-xs text-gray-400 mt-1">No hay celebraciones litúrgicas en esta fecha.</p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {masses.map((mass) => {
            const isUserRegistered = mass.registrations?.some(r => r.userUid === user.uid);
            const userReg = mass.registrations?.find(r => r.userUid === user.uid);
            
            return (
              <div
                key={mass.id}
                onClick={() => onSelectMass(mass, selectedDate.dateStr)}
                className={`group relative glass-card hover:bg-white/[0.04] rounded-3xl p-6 shadow-sm border border-white/10 hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 ${
                  mass.type === "SOLEMNE" 
                    ? "border-l-primary" 
                    : mass.type === "BAUTIZO" 
                      ? "border-l-secondary" 
                      : "border-l-accent"
                }`}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="text-white font-extrabold text-xl">{formatTimeToAMPM(mass.time)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold w-fit mt-1.5 tracking-wider ${
                      mass.type === "SOLEMNE"
                        ? "bg-primary text-white"
                        : mass.type === "BAUTIZO"
                          ? "bg-secondary text-black"
                          : "bg-white/10 text-white"
                    }`}>
                      {mass.type}
                    </span>
                  </div>
                  <span className={`material-symbols-outlined scale-110 ${
                    mass.type === "SOLEMNE" 
                      ? "text-primary" 
                      : mass.type === "BAUTIZO" 
                        ? "text-secondary" 
                        : "text-white"
                  }`}>
                    {mass.type === "BAUTIZO" ? "water_drop" : "church"}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-base font-bold text-white mb-4">{mass.title}</h3>
                
                {/* Altar Servers Count & Avatars */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-xs text-gray-300 font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
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
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-background"
                            title={`${reg.userName} (${reg.userRole})`}
                          />
                        ) : (
                          <div 
                            key={reg.id} 
                            className="w-8 h-8 rounded-full bg-primary/20 text-primary ring-2 ring-background flex items-center justify-center text-[10px] font-bold uppercase"
                            title={`${reg.userName} (${reg.userRole})`}
                          >
                            {reg.userName.charAt(0)}
                          </div>
                        )
                      ))}
                      {mass.registrations.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-white/5 text-primary ring-2 ring-background flex items-center justify-center text-[9px] font-bold">
                          +{mass.registrations.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">Sin monaguillos registrados.</p>
                  )}
                </div>

                {/* Action Button */}
                {user.role === "monaguillo" && (
                  <div className="mt-auto">
                    {isUserRegistered ? (
                      <div className="w-full text-center py-2.5 bg-secondary/10 text-secondary border border-secondary/20 font-bold text-xs rounded-xl flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        {userReg.status === "checked-in" ? "ASISTENCIA CONFIRMADA" : "INSCRITO"}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleRegister(e, mass.id)}
                        className="w-full bg-primary hover:bg-primary/95 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors shadow-sm active:scale-95"
                      >
                        ANOTARSE
                      </button>
                    )}
                  </div>
                )}
                
                {user.role !== "monaguillo" && (
                  <button className="w-full border border-white/10 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-white/5 transition-colors">
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
