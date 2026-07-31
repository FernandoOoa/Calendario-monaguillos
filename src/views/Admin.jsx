import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { alerts } from "../services/alerts";
import { formatTimeToAMPM } from "../utils/time";
import MassForm from "../components/admin/MassForm";
import AttendanceInspector from "../components/admin/AttendanceInspector";
import AuditLogsTable from "../components/admin/AuditLogsTable";
import UserManagement from "../components/admin/UserManagement";

export default function Admin({ user }) {
  const [activeTab, setActiveTab] = useState("create"); // 'create', 'manage', 'attendance', 'users', 'audit'
  const [massesList, setMassesList] = useState([]);
  const [editingMass, setEditingMass] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Mass Form states
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDayOfWeek, setEditDayOfWeek] = useState(0);
  const [editSpecificDate, setEditSpecificDate] = useState("");
  const [editType, setEditType] = useState("ORDINARIA");
  const [editNotes, setEditNotes] = useState("");
  const [editIsRecurring, setEditIsRecurring] = useState(true);
  const [editServersRequired, setEditServersRequired] = useState(3);

  const loadMasses = async () => {
    try {
      const list = await db.getAllMasses();
      setMassesList(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMasses();
    const handleUpdate = () => loadMasses();
    window.addEventListener("mass-state-updated", handleUpdate);
    return () => window.removeEventListener("mass-state-updated", handleUpdate);
  }, []);

  const handleStartEdit = (mass) => {
    setEditingMass(mass);
    setEditTitle(mass.title);
    setEditTime(mass.time);
    setEditDayOfWeek(mass.dayOfWeek || 0);
    setEditSpecificDate(mass.specificDate || "");
    setEditType(mass.type || "ORDINARIA");
    setEditNotes(mass.notes || "");
    setEditIsRecurring(mass.isRecurring !== false);
    setEditServersRequired(mass.serversRequired || 3);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMass) return;
    try {
      await db.updateMass(editingMass.id, {
        title: editTitle,
        time: editTime,
        dayOfWeek: Number(editDayOfWeek),
        specificDate: editIsRecurring ? null : editSpecificDate,
        type: editType,
        notes: editNotes,
        isRecurring: editIsRecurring,
        serversRequired: Number(editServersRequired)
      });
      alerts.alert("Misa actualizada con éxito.", "Guardado", "success");
      setEditingMass(null);
      loadMasses();
    } catch (err) {
      alerts.alert(err.message, "Error al actualizar", "error");
    }
  };

  const handleDeleteMass = async (massId, title) => {
    const ok = await alerts.confirm(`¿Estás seguro de eliminar la celebración "${title}"?`, "Eliminar Misa");
    if (!ok) return;
    try {
      await db.deleteMass(massId);
      alerts.alert("Misa eliminada correctamente.", "Eliminado", "info");
      loadMasses();
    } catch (err) {
      alerts.alert(err.message, "Error al eliminar", "error");
    }
  };

  const filteredMasses = massesList.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const daysOfWeekNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return (
    <div className="flex-grow py-6 max-w-5xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop font-sans pb-24 md:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">admin_panel_settings</span>
            Panel de Coordinación Parroquial
          </h1>
          <p className="text-xs text-on-surface-variant">Gestión de la agenda litúrgica, asignaciones y auditoría.</p>
        </div>
        <span className="text-xs bg-primary/20 text-white border border-primary/40 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
          Administrador
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "create" ? "bg-secondary text-black shadow-lg" : "text-gray-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Programar Misa
        </button>

        <button
          onClick={() => setActiveTab("manage")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "manage" ? "bg-secondary text-black shadow-lg" : "text-gray-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
          Gestionar Agenda ({massesList.length})
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "attendance" ? "bg-secondary text-black shadow-lg" : "text-gray-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">fact_check</span>
          Fiscalizar Asistencia
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "users" ? "bg-secondary text-black shadow-lg" : "text-gray-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
          Control de Usuarios
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === "audit" ? "bg-secondary text-black shadow-lg" : "text-gray-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
          Auditoría
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "create" && (
        <MassForm onMassCreated={loadMasses} />
      )}

      {activeTab === "users" && (
        <UserManagement />
      )}

      {activeTab === "manage" && (
        <div className="glass-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">calendar_view_day</span>
                Agenda Litúrgica Registrada
              </h2>
              <p className="text-xs text-on-surface-variant">Edita o elimina celebraciones de la parroquia.</p>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o tipo..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-secondary w-full sm:w-64"
            />
          </div>

          {filteredMasses.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
              <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">event_busy</span>
              <p className="text-sm text-gray-400 font-semibold">No se encontraron misas registradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMasses.map(mass => (
                <div key={mass.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-extrabold text-lg">{formatTimeToAMPM(mass.time)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        mass.type === "SOLEMNE" ? "bg-primary text-white" : mass.type === "BAUTIZO" ? "bg-secondary text-black" : "bg-white/10 text-white"
                      }`}>
                        {mass.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base">{mass.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {mass.isRecurring ? `Recurrente los ${daysOfWeekNames[mass.dayOfWeek]}` : `Fecha Especial: ${mass.specificDate}`}
                    </p>
                    {mass.notes && (
                      <p className="text-xs text-gray-400 mt-2 bg-black/30 p-2.5 rounded-lg border border-white/5 italic">
                        "{mass.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-white/10 pt-3 text-xs">
                    <span className="text-gray-400 font-semibold">
                      Cupos: <strong className="text-white">{mass.serversRequired || 3} monaguillos</strong>
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(mass)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteMass(mass.id, mass.title)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-lg transition-colors border border-red-500/30 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "attendance" && (
        <AttendanceInspector />
      )}

      {activeTab === "audit" && (
        <AuditLogsTable />
      )}

      {/* Edit Mass Modal */}
      {editingMass && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="glass-card max-w-lg w-full p-6 space-y-4 relative border border-white/20">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Editar Misa: {editingMass.title}</h3>
              <button
                type="button"
                onClick={() => setEditingMass(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Título</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Hora</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Cupos Requeridos</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={editServersRequired}
                  onChange={(e) => setEditServersRequired(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Tipo</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              >
                {["ORDINARIA", "BAUTIZO", "SOLEMNE", "CONFIRMACIÓN", "PRIMERA COMUNIÓN", "CUERPO PRESENTTE", "ESPECIAL"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingMass(null)}
                className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-secondary text-black font-bold text-xs rounded-xl"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
