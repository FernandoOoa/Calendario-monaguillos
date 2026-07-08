import React, { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM, getLocalDateString } from "../utils/time";

export default function Admin({ user }) {
  const [activeTab, setActiveTab] = useState("create"); // 'create', 'manage', 'attendance', 'emails'
  
  // Create Mass Form states
  const [massTitle, setMassTitle] = useState("");
  const [massTime, setMassTime] = useState("");
  const [massDayOfWeek, setMassDayOfWeek] = useState(0); // 0 = Sunday
  const [massSpecificDate, setMassSpecificDate] = useState("");
  const [massType, setMassType] = useState("ORDINARIA");
  const [massNotes, setMassNotes] = useState("");
  const [massIsRecurring, setMassIsRecurring] = useState(true);
  const [massServersRequired, setMassServersRequired] = useState(3);

  // Manage Mass states
  const [massesList, setMassesList] = useState([]);
  const [editingMass, setEditingMass] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDayOfWeek, setEditDayOfWeek] = useState(0);
  const [editSpecificDate, setEditSpecificDate] = useState("");
  const [editType, setEditType] = useState("ORDINARIA");
  const [editNotes, setEditNotes] = useState("");
  const [editIsRecurring, setEditIsRecurring] = useState(true);
  const [editServersRequired, setEditServersRequired] = useState(3);
  const [specialSearchQuery, setSpecialSearchQuery] = useState("");

  // Attendance Inspector states
  const [inspectDate, setInspectDate] = useState("");
  const [inspectMasses, setInspectMasses] = useState([]);
  const [selectedInspectMassId, setSelectedInspectMassId] = useState("");
  const [attendanceList, setAttendanceList] = useState([]);

  // Email Logs states
  const [emailLogs, setEmailLogs] = useState([]);

  // Feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const daysOfWeekNames = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miércoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
    { value: 6, label: "Sábado" }
  ];

  const massTypesList = ["ORDINARIA", "BAUTIZO", "SOLEMNE", "CONFIRMACIÓN", "PRIMERA COMUNIÓN", "CUERPO PRESENTTE", "ESPECIAL"];

  const loadAdminData = async () => {
    try {
      // Get all masses using the database service
      const masses = await db.getAllMasses();
      setMassesList(masses);
      
      // Update email logs
      const logs = await db.getEmailLogs();
      setEmailLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
    
    // Set initial inspect date to today
    const todayStr = getLocalDateString(new Date());
    setInspectDate(todayStr);

    const handleUpdate = () => loadAdminData();

    window.addEventListener("mass-state-updated", handleUpdate);
    return () => {
      window.removeEventListener("mass-state-updated", handleUpdate);
    };
  }, []);

  // Fetch masses for inspection date
  const loadInspectMasses = async () => {
    if (!inspectDate) return;
    try {
      const dateObj = new Date(inspectDate + "T00:00:00");
      const dayOfWeek = dateObj.getDay();
      
      const dayMasses = await db.getMassesForDay(dayOfWeek, inspectDate);
      setInspectMasses(dayMasses);
      
      if (dayMasses.length > 0) {
        setSelectedInspectMassId(dayMasses[0].id);
      } else {
        setSelectedInspectMassId("");
        setAttendanceList([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInspectMasses();
  }, [inspectDate]);

  // Load attendance list when inspector mass changes
  const loadAttendance = async () => {
    if (!selectedInspectMassId || !inspectDate) {
      setAttendanceList([]);
      return;
    }
    try {
      const list = await db.getMassAttendance(selectedInspectMassId, inspectDate);
      setAttendanceList(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedInspectMassId, inspectDate]);

  const handleCreateMass = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!massTitle || !massTime) {
      setErrorMsg("Completa los campos obligatorios.");
      return;
    }

    let finalDayOfWeek = Number(massDayOfWeek);
    let finalSpecificDate = null;
    if (!massIsRecurring) {
      if (!massSpecificDate) {
        setErrorMsg("Por favor selecciona una fecha específica para el evento.");
        return;
      }
      const dateObj = new Date(massSpecificDate + "T00:00:00");
      finalDayOfWeek = dateObj.getDay();
      finalSpecificDate = massSpecificDate;
    }

    try {
      await db.createMass({
        title: massTitle,
        time: massTime,
        dayOfWeek: finalDayOfWeek,
        specificDate: finalSpecificDate,
        type: massType,
        notes: massNotes,
        isRecurring: massIsRecurring,
        serversRequired: Number(massServersRequired)
      });
      setSuccessMsg("¡Misa/Evento creado con éxito en el calendario!");
      setMassTitle("");
      setMassTime("");
      setMassNotes("");
      setMassSpecificDate("");
      setMassServersRequired(3);
      loadAdminData();
      loadInspectMasses();
      
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      setErrorMsg("Error al crear misa.");
    }
  };

  const handleDeleteMass = async (massId) => {
    const ok = await alerts.confirm("¿Estás seguro de eliminar esta misa? Se cancelarán todos los registros asignados.", "Eliminar Misa");
    if (!ok) return;
    try {
      await db.deleteMass(massId);
      setSuccessMsg("Misa eliminada correctamente.");
      loadAdminData();
      loadInspectMasses();
      
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      setErrorMsg("Error al eliminar la misa.");
    }
  };

  const startEditMass = (mass) => {
    setEditingMass(mass);
    setEditTitle(mass.title);
    setEditTime(mass.time);
    setEditDayOfWeek(mass.dayOfWeek);
    setEditSpecificDate(mass.specificDate || "");
    setEditType(mass.type);
    setEditNotes(mass.notes || "");
    setEditIsRecurring(mass.isRecurring !== false);
    setEditServersRequired(mass.serversRequired || 3);
  };

  const handleSaveEditMass = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    if (!editTitle || !editTime) {
      setErrorMsg("Completa los campos obligatorios.");
      return;
    }

    let finalDayOfWeek = Number(editDayOfWeek);
    let finalSpecificDate = null;
    if (!editIsRecurring) {
      if (!editSpecificDate) {
        setErrorMsg("Por favor selecciona una fecha específica para el evento.");
        return;
      }
      const dateObj = new Date(editSpecificDate + "T00:00:00");
      finalDayOfWeek = dateObj.getDay();
      finalSpecificDate = editSpecificDate;
    }

    try {
      await db.updateMass(editingMass.id, {
        title: editTitle,
        time: editTime,
        dayOfWeek: finalDayOfWeek,
        specificDate: finalSpecificDate,
        type: editType,
        notes: editNotes,
        isRecurring: editIsRecurring,
        serversRequired: Number(editServersRequired)
      });
      setSuccessMsg("¡Misa actualizada con éxito!");
      setEditingMass(null);
      loadAdminData();
      loadInspectMasses();
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      setErrorMsg("Error al actualizar la misa.");
    }
  };

  // Toggle server attendance manually (Admin control)
  const handleToggleAttendanceStatus = async (reg) => {
    try {
      let nextStatus = "pending";
      if (reg.status === "pending") nextStatus = "checked-in";
      else if (reg.status === "checked-in") nextStatus = "attended";
      else if (reg.status === "attended") nextStatus = "cancelled";

      await db.updateRegistrationStatus(reg.id, nextStatus);
      loadAttendance();
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const getGroupedMasses = () => {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // L, M, M, J, V, S, D
    const grouped = [];

    dayOrder.forEach(dayNum => {
      const dayMasses = massesList.filter(m => m.dayOfWeek === dayNum && m.isRecurring !== false);
      if (dayMasses.length === 0) return;

      // Sort by time ascending
      const sorted = [...dayMasses].sort((a, b) => a.time.localeCompare(b.time));

      // Separate into morning and afternoon
      const morning = sorted.filter(m => m.time < "12:00");
      const afternoon = sorted.filter(m => m.time >= "12:00");

      grouped.push({
        dayNum,
        dayLabel: daysOfWeekNames.find(d => d.value === dayNum)?.label || "",
        morning,
        afternoon
      });
    });

    return grouped;
  };

  const renderMassRow = (mass) => (
    <div key={mass.id} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-on-surface truncate">{mass.title}</span>
          <span className="text-[9px] bg-primary/20 text-primary border border-primary/10 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
            {mass.type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
          <span className="font-bold text-primary">{formatTimeToAMPM(mass.time)}</span>
          <span>•</span>
          <span className={`font-bold ${
            mass.isRecurring 
              ? "text-green-400" 
              : "text-orange-400"
          }`}>
            {mass.isRecurring ? "SEMANAL" : `ÚNICA (${mass.specificDate})`}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => startEditMass(mass)}
          className="p-2 text-on-surface-variant hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Editar Misa"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button
          onClick={() => handleDeleteMass(mass.id)}
          className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
          title="Eliminar Misa"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-grow py-8 max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop font-sans pb-24 md:pb-8">
      {/* Header */}
      <section className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1">Panel de Administración</h1>
        <p className="text-xs text-on-surface-variant">Crea, modifica horarios de misas y supervisa la asistencia en tiempo real.</p>
      </section>

      {/* Admin Tab Switching */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
        <button
          onClick={() => { setActiveTab("create"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "create" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-white"
          }`}
        >
          Crear Misa
        </button>
        <button
          onClick={() => { setActiveTab("manage"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "manage" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-white"
          }`}
        >
          Gestionar Registro
        </button>
        <button
          onClick={() => { setActiveTab("attendance"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "attendance" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-white"
          }`}
        >
          Hojas de Asistencia
        </button>
        <button
          onClick={() => { setActiveTab("emails"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "emails" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-white"
          }`}
        >
          Correos Enviados
        </button>
      </div>

      {/* Success / Error Message alerts */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20 flex gap-2 items-center text-xs font-bold animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl border border-error/20 flex gap-2 items-center text-xs font-bold animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMsg}
        </div>
      )}

      {/* TAB: Create Mass Form */}
      {activeTab === "create" && (
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg max-w-xl mx-auto">
          <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary">add_box</span>
            Crear Misa o Evento Parroquial
          </h2>
          
          <form onSubmit={handleCreateMass} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Título de la Celebración *</label>
                <input
                  required
                  type="text"
                  placeholder="ej. Misa Dominical Familiar"
                  value={massTitle}
                  onChange={(e) => setMassTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs placeholder:text-on-surface-variant/40"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Hora de Inicio *</label>
                <input
                  required
                  type="time"
                  value={massTime}
                  onChange={(e) => setMassTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {massIsRecurring ? (
                <div>
                  <label className="block text-on-surface-variant mb-1 ml-1">Día de la Semana</label>
                  <select
                    value={massDayOfWeek}
                    onChange={(e) => setMassDayOfWeek(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl bg-[#1e1e1e] border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                  >
                    {daysOfWeekNames.map(d => (
                      <option key={d.value} value={d.value} className="bg-[#1e1e1e]">{d.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-on-surface-variant mb-1 ml-1">Fecha del Evento *</label>
                  <input
                    required
                    type="date"
                    value={massSpecificDate}
                    onChange={(e) => setMassSpecificDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Tipo de Misa</label>
                <select
                  value={massType}
                  onChange={(e) => setMassType(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#1e1e1e] border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                >
                  {massTypesList.map(t => (
                    <option key={t} value={t} className="bg-[#1e1e1e]">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Monaguillos Requeridos *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="10"
                  value={massServersRequired}
                  onChange={(e) => setMassServersRequired(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-on-surface-variant mb-1 ml-1">Notas Litúrgicas / Requisitos</label>
              <textarea
                rows="3"
                placeholder="ej. Se requiere incienso, turiferario y crucífero. Túnicas limpias."
                value={massNotes}
                onChange={(e) => setMassNotes(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs leading-relaxed placeholder:text-on-surface-variant/40"
              />
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={massIsRecurring}
                onChange={(e) => setMassIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="isRecurring" className="text-xs text-on-surface-variant cursor-pointer select-none">
                Programar automáticamente todas las semanas (Misa Recurrente)
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              Registrar en Calendario
            </button>
          </form>
        </div>
      )}

      {/* TAB: Manage Masses List */}
      {activeTab === "manage" && (
        <div className="space-y-8">
          {/* Recurring Masses Section */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg">
            <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">event_repeat</span>
              Misas Recurrentes Semanales
            </h2>
            
            <div className="space-y-6">
              {massesList.filter(m => m.isRecurring !== false).length === 0 ? (
                <p className="text-xs text-on-surface-variant/70 italic text-center py-8">No hay misas recurrentes creadas.</p>
              ) : (
                getGroupedMasses().map(({ dayNum, dayLabel, morning, afternoon }) => (
                  <div key={dayNum} className="border border-white/5 bg-white/[0.01] rounded-2xl p-4 md:p-6 space-y-4 shadow-sm">
                    {/* Day Title */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                        {dayLabel}
                      </h3>
                      <span className="text-[10px] bg-white/5 text-on-surface-variant px-2.5 py-0.5 rounded-full font-bold">
                        {(morning.length + afternoon.length)} { (morning.length + afternoon.length) === 1 ? "Misa" : "Misas" }
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Morning Subsection */}
                      <div>
                        <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-amber-400">light_mode</span>
                          Mañana (AM)
                        </h4>
                        {morning.length === 0 ? (
                          <p className="text-xs text-on-surface-variant/40 italic py-2">No hay misas en la mañana.</p>
                        ) : (
                          <div className="space-y-2">
                            {morning.map(mass => renderMassRow(mass))}
                          </div>
                        )}
                      </div>

                      {/* Afternoon Subsection */}
                      <div>
                        <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-indigo-400">dark_mode</span>
                          Tarde / Noche (PM)
                        </h4>
                        {afternoon.length === 0 ? (
                          <p className="text-xs text-on-surface-variant/40 italic py-2">No hay misas en la tarde.</p>
                        ) : (
                          <div className="space-y-2">
                            {afternoon.map(mass => renderMassRow(mass))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Special / One-off Masses Section */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400">star</span>
                Misas Especiales y Eventos Únicos
              </h2>
              
              {/* Filter Search Bar */}
              <div className="relative w-full md:max-w-xs shrink-0">
                <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-on-surface-variant/40 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Filtrar por título, tipo o fecha..."
                  value={specialSearchQuery}
                  onChange={(e) => setSpecialSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary outline-none text-xs placeholder:text-on-surface-variant/40 font-semibold"
                />
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              {(() => {
                const specialMasses = massesList.filter(m => m.isRecurring === false);
                const sortedSpecial = [...specialMasses].sort((a, b) => {
                  const dateCompare = (a.specificDate || "").localeCompare(b.specificDate || "");
                  if (dateCompare !== 0) return dateCompare;
                  return a.time.localeCompare(b.time);
                });
                const filtered = sortedSpecial.filter(m => {
                  const q = specialSearchQuery.toLowerCase();
                  return (
                    m.title.toLowerCase().includes(q) ||
                    m.type.toLowerCase().includes(q) ||
                    (m.specificDate || "").includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <p className="text-xs text-on-surface-variant/70 italic text-center py-8">
                      {specialMasses.length === 0 ? "No hay misas especiales creadas." : "No se encontraron misas con los filtros actuales."}
                    </p>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        <th className="py-3 px-2">Fecha</th>
                        <th className="py-3 px-2">Hora</th>
                        <th className="py-3 px-2">Celebración / Tipo</th>
                        <th className="py-3 px-2">Monaguillos Requeridos</th>
                        <th className="py-3 px-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold">
                      {filtered.map((mass) => (
                        <tr key={mass.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-2 text-on-surface font-bold">
                            {mass.specificDate ? mass.specificDate.split("-").reverse().join("/") : "N/A"}
                          </td>
                          <td className="py-3.5 px-2 font-bold text-primary">
                            {formatTimeToAMPM(mass.time)}
                          </td>
                          <td className="py-3.5 px-2">
                            <p className="font-bold text-on-surface">{mass.title}</p>
                            <span className="text-[9px] bg-primary/20 text-primary border border-primary/10 px-1.5 py-0.5 rounded font-bold uppercase inline-block mt-0.5">
                              {mass.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 font-bold text-on-surface-variant text-center md:text-left">
                            {mass.serversRequired || 3}
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditMass(mass)}
                                className="p-2 text-on-surface-variant hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                title="Editar Misa"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMass(mass.id)}
                                className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                                title="Eliminar Misa"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Attendance Sheet Inspector */}
      {activeTab === "attendance" && (
        <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg space-y-6">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary">playlist_add_check</span>
            Control de Asistencia del Servidor (Real-time)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs font-bold">
            <div>
              <label className="block text-on-surface-variant mb-1 ml-1">Selecciona una Fecha:</label>
              <input
                type="date"
                value={inspectDate}
                onChange={(e) => setInspectDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary outline-none"
              />
            </div>
            
            <div>
              <label className="block text-on-surface-variant mb-1 ml-1">Selecciona la Misa de ese día:</label>
              {inspectMasses.length === 0 ? (
                <div className="h-11 px-4 rounded-xl border border-white/10 flex items-center bg-white/5 text-on-surface-variant italic">
                  No hay misas en este día.
                </div>
              ) : (
                <select
                  value={selectedInspectMassId}
                  onChange={(e) => setSelectedInspectMassId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#1e1e1e] border border-white/10 text-on-surface focus:border-primary outline-none"
                >
                  {inspectMasses.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#1e1e1e]">{m.time} — {m.title} ({m.type})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-on-surface mb-3 flex items-center justify-between">
              <span>Lista de Monaguillos Registrados</span>
              {selectedInspectMassId && (
                <span className="text-[10px] font-normal text-on-surface-variant/80 italic">
                  * Haz clic en el estado del monaguillo para modificarlo manualmente (Pruebas).
                </span>
              )}
            </h3>

            {!selectedInspectMassId ? (
              <div className="text-center py-12 text-xs text-on-surface-variant/70 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                Selecciona una fecha y una misa para ver su hoja de asistencia.
              </div>
            ) : attendanceList.length === 0 ? (
              <div className="text-center py-12 text-xs text-on-surface-variant/70 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                No hay monaguillos registrados para esta misa en la fecha seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2.5">Monaguillo</th>
                      <th className="py-2.5">Estado Asistencia</th>
                      <th className="py-2.5 text-right">Acción Manual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {attendanceList.map((reg) => (
                      <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 font-bold text-on-surface">{reg.userName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                            reg.status === "attended" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                            reg.status === "checked-in" ? "bg-secondary/20 text-secondary border border-secondary/10" :
                            reg.status === "cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}>
                            {reg.status === "attended" ? "COMPLETADO" :
                             reg.status === "checked-in" ? "VERIFICADO (EN SITIO)" :
                             reg.status === "cancelled" ? "CANCELADO" : "PENDIENTE"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleAttendanceStatus(reg)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-on-surface px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                          >
                            Rotar Estado
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Automated Email Logs */}
      {activeTab === "emails" && (
        <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">mail</span>
              Logs de Notificaciones de Correo Enviadas
            </h2>
            {/* Limpiar Logs deshabilitado en base de datos de producción */}
          </div>

          {emailLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-on-surface-variant/70 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              No se han gatillado notificaciones por correo electrónico todavía.
            </div>
          ) : (
            <div className="space-y-4">
              {emailLogs.map((log) => (
                <div key={log.id} className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row justify-between text-xs text-on-surface-variant border-b border-white/5 pb-2">
                    <span className="font-bold">Para: <span className="text-primary font-semibold">{log.to}</span></span>
                    <span className="text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="font-bold text-sm text-on-surface">{log.subject}</div>
                  <div 
                    className="text-xs text-on-surface-variant/90 bg-black/40 p-3 rounded-xl border border-white/5 font-sans leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: log.bodyHtml }} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Mass Modal Overlay */}
      {editingMass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditingMass(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">edit</span>
              Editar Misa o Evento Parroquial
            </h2>
            
            <form onSubmit={handleSaveEditMass} className="space-y-4 text-xs font-semibold text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant mb-1 ml-1">Título de la Celebración *</label>
                  <input
                    required
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 ml-1">Hora de Inicio *</label>
                  <input
                    required
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editIsRecurring ? (
                  <div>
                    <label className="block text-on-surface-variant mb-1 ml-1">Día de la Semana</label>
                    <select
                      value={editDayOfWeek}
                      onChange={(e) => setEditDayOfWeek(Number(e.target.value))}
                      className="w-full h-11 px-4 rounded-xl bg-[#1e1e1e] border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                    >
                      {daysOfWeekNames.map(d => (
                        <option key={d.value} value={d.value} className="bg-[#1e1e1e]">{d.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-on-surface-variant mb-1 ml-1">Fecha del Evento *</label>
                    <input
                      required
                      type="date"
                      value={editSpecificDate}
                      onChange={(e) => setEditSpecificDate(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-on-surface-variant mb-1 ml-1">Tipo de Misa</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-[#1e1e1e] border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                  >
                    {massTypesList.map(t => (
                      <option key={t} value={t} className="bg-[#1e1e1e]">{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 ml-1">Monaguillos Requeridos *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="10"
                    value={editServersRequired}
                    onChange={(e) => setEditServersRequired(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Notas Litúrgicas / Requisitos</label>
                <textarea
                  rows="3"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="editIsRecurring"
                  checked={editIsRecurring}
                  onChange={(e) => setEditIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="editIsRecurring" className="text-xs text-on-surface-variant cursor-pointer select-none">
                  Programar automáticamente todas las semanas (Misa Recurrente)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMass(null)}
                  className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-on-surface font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
