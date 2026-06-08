import React, { useState, useEffect } from "react";
import { db, dev } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM, getLocalDateString } from "../utils/time";

export default function Admin({ user }) {
  const [activeTab, setActiveTab] = useState("create"); // 'create', 'manage', 'attendance', 'emails'
  
  // Create Mass Form states
  const [massTitle, setMassTitle] = useState("");
  const [massTime, setMassTime] = useState("");
  const [massDayOfWeek, setMassDayOfWeek] = useState(0); // 0 = Sunday
  const [massType, setMassType] = useState("ORDINARIA");
  const [massNotes, setMassNotes] = useState("");
  const [massIsRecurring, setMassIsRecurring] = useState(true);

  // Manage Mass states
  const [massesList, setMassesList] = useState([]);

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
      // Get all masses (simulate query all)
      const masses = JSON.parse(localStorage.getItem("joselito_masses") || "[]");
      setMassesList(masses);
      
      // Update email logs
      setEmailLogs(dev.getEmailLogs());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
    
    // Set initial inspect date to today
    const todayStr = getLocalDateString(dev.getSimulatedTime());
    setInspectDate(todayStr);

    const handleUpdate = () => loadAdminData();
    const handleTimeChange = () => {
      const newTodayStr = getLocalDateString(dev.getSimulatedTime());
      setInspectDate(newTodayStr);
      loadAdminData();
    };

    window.addEventListener("mass-state-updated", handleUpdate);
    window.addEventListener("simulated-email-sent", handleUpdate);
    window.addEventListener("simulated-emails-cleared", handleUpdate);
    window.addEventListener("simulated-time-changed", handleTimeChange);
    return () => {
      window.removeEventListener("mass-state-updated", handleUpdate);
      window.removeEventListener("simulated-email-sent", handleUpdate);
      window.removeEventListener("simulated-emails-cleared", handleUpdate);
      window.removeEventListener("simulated-time-changed", handleTimeChange);
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

    try {
      await db.createMass({
        title: massTitle,
        time: massTime,
        dayOfWeek: Number(massDayOfWeek),
        type: massType,
        notes: massNotes,
        isRecurring: massIsRecurring
      });
      setSuccessMsg("¡Misa creada con éxito en el calendario!");
      setMassTitle("");
      setMassTime("");
      setMassNotes("");
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

  // Toggle server attendance manually (Admin control)
  const handleToggleAttendanceStatus = async (reg) => {
    try {
      const regs = JSON.parse(localStorage.getItem("joselito_registrations") || "[]");
      const match = regs.find(r => r.id === reg.id);
      if (match) {
        // Toggle: pending -> checked-in -> attended -> cancelled -> pending
        if (match.status === "pending") match.status = "checked-in";
        else if (match.status === "checked-in") match.status = "attended";
        else if (match.status === "attended") match.status = "cancelled";
        else match.status = "pending";
        
        localStorage.setItem("joselito_registrations", JSON.stringify(regs));
        loadAttendance();
        window.dispatchEvent(new Event("mass-state-updated"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-grow py-8 max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop font-sans pb-24 md:pb-8">
      {/* Header */}
      <section className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1">Panel de Administración</h1>
        <p className="text-xs text-on-surface-variant">Crea, modifica horarios de misas y supervisa la asistencia en tiempo real.</p>
      </section>

      {/* Admin Tab Switching */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 bg-surface-container rounded-2xl p-1">
        <button
          onClick={() => { setActiveTab("create"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "create" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Crear Misa
        </button>
        <button
          onClick={() => { setActiveTab("manage"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "manage" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Gestionar Registro
        </button>
        <button
          onClick={() => { setActiveTab("attendance"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "attendance" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Hojas de Asistencia
        </button>
        <button
          onClick={() => { setActiveTab("emails"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`flex-1 min-w-[100px] py-2 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === "emails" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Correos Enviados
        </button>
      </div>

      {/* Success / Error Message alerts */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-2xl border border-green-200 flex gap-2 items-center text-xs font-bold animate-in fade-in duration-300">
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
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/40 card-shadow max-w-xl mx-auto">
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
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Hora de Inicio *</label>
                <input
                  required
                  type="time"
                  value={massTime}
                  onChange={(e) => setMassTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Día de la Semana</label>
                <select
                  value={massDayOfWeek}
                  onChange={(e) => setMassDayOfWeek(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs bg-white"
                >
                  {daysOfWeekNames.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 ml-1">Tipo de Misa</label>
                <select
                  value={massType}
                  onChange={(e) => setMassType(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs bg-white"
                >
                  {massTypesList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-on-surface-variant mb-1 ml-1">Notas Litúrgicas / Requisitos</label>
              <textarea
                rows="3"
                placeholder="ej. Se requiere incienso, turiferario y crucífero. Túnicas limpias."
                value={massNotes}
                onChange={(e) => setMassNotes(e.target.value)}
                className="w-full p-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={massIsRecurring}
                onChange={(e) => setMassIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <label htmlFor="isRecurring" className="text-xs text-on-surface cursor-pointer select-none">
                Programar automáticamente todas las semanas (Misa Recurrente)
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              Registrar en Calendario
            </button>
          </form>
        </div>
      )}

      {/* TAB: Manage Masses List */}
      {activeTab === "manage" && (
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow">
          <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary">view_list</span>
            Misas Programadas Registradas
          </h2>
          
          <div className="overflow-x-auto no-scrollbar">
            {massesList.length === 0 ? (
              <p className="text-xs text-on-surface-variant/70 italic text-center py-8">No hay misas creadas.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-2">Celebración / Tipo</th>
                    <th className="py-3 px-2">Día de Semana</th>
                    <th className="py-3 px-2">Hora</th>
                    <th className="py-3 px-2">Recurrente</th>
                    <th className="py-3 px-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {massesList.map((mass) => (
                    <tr key={mass.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-3.5 px-2">
                        <p className="font-bold text-on-surface">{mass.title}</p>
                        <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">
                          {mass.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-semibold">
                        {daysOfWeekNames.find(d => d.value === mass.dayOfWeek)?.label}
                      </td>
                      <td className="py-3.5 px-2 font-bold text-primary">{formatTimeToAMPM(mass.time)}</td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                          mass.isRecurring ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {mass.isRecurring ? "SEMANAL" : "ÚNICA"}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <button
                          onClick={() => handleDeleteMass(mass.id)}
                          className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                          title="Eliminar Misa"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB: Attendance Sheet Inspector */}
      {activeTab === "attendance" && (
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow space-y-6">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary">playlist_add_check</span>
            Control de Asistencia del Servidor (Real-time)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container p-4 rounded-2xl border border-outline-variant/30 text-xs font-bold">
            <div>
              <label className="block text-on-surface-variant mb-1 ml-1">Selecciona una Fecha:</label>
              <input
                type="date"
                value={inspectDate}
                onChange={(e) => setInspectDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary outline-none"
              />
            </div>
            
            <div>
              <label className="block text-on-surface-variant mb-1 ml-1">Selecciona la Misa de ese día:</label>
              {inspectMasses.length === 0 ? (
                <div className="h-11 px-4 rounded-xl border border-outline-variant flex items-center bg-white text-on-surface-variant/70 italic">
                  No hay misas en este día.
                </div>
              ) : (
                <select
                  value={selectedInspectMassId}
                  onChange={(e) => setSelectedInspectMassId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary outline-none bg-white"
                >
                  {inspectMasses.map(m => (
                    <option key={m.id} value={m.id}>{m.time} — {m.title} ({m.type})</option>
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
              <div className="text-center py-12 text-xs text-on-surface-variant/70 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
                Selecciona una fecha y una misa para ver su hoja de asistencia.
              </div>
            ) : attendanceList.length === 0 ? (
              <div className="text-center py-12 text-xs text-on-surface-variant/70 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
                No hay monaguillos registrados para esta misa en la fecha seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2.5">Monaguillo</th>
                      <th className="py-2.5">Rol de Misa</th>
                      <th className="py-2.5">Estado Asistencia</th>
                      <th className="py-2.5 text-right">Acción Manual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {attendanceList.map((reg) => (
                      <tr key={reg.id} className="hover:bg-surface-container/20 transition-colors">
                        <td className="py-3 font-bold text-on-surface">{reg.userName}</td>
                        <td className="py-3 font-semibold text-on-surface-variant">{reg.userRole}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                            reg.status === "attended" ? "bg-green-100 text-green-700" :
                            reg.status === "checked-in" ? "bg-secondary-container text-on-secondary-container" :
                            reg.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                          }`}>
                            {reg.status === "attended" ? "COMPLETADO" :
                             reg.status === "checked-in" ? "VERIFICADO (EN SITIO)" :
                             reg.status === "cancelled" ? "CANCELADO" : "PENDIENTE"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleAttendanceStatus(reg)}
                            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-on-surface px-2.5 py-1 rounded-lg text-[10px] font-bold"
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
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">mail</span>
              Logs de Notificaciones de Correo Enviadas
            </h2>
            {emailLogs.length > 0 && (
              <button
                onClick={() => dev.clearEmailLogs()}
                className="text-primary font-bold text-xs hover:underline"
              >
                Limpiar Logs
              </button>
            )}
          </div>

          {emailLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-on-surface-variant/70 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
              No se han gatillado notificaciones por correo electrónico todavía.
            </div>
          ) : (
            <div className="space-y-4">
              {emailLogs.map((log) => (
                <div key={log.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/50 flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row justify-between text-xs text-on-surface-variant border-b border-outline-variant/30 pb-2">
                    <span className="font-bold">Para: <span className="text-primary font-semibold">{log.to}</span></span>
                    <span className="text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="font-bold text-sm text-on-surface">{log.subject}</div>
                  <div 
                    className="text-xs text-on-surface-variant bg-white p-3 rounded-xl border border-outline-variant/30 font-sans" 
                    dangerouslySetInnerHTML={{ __html: log.bodyHtml }} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
