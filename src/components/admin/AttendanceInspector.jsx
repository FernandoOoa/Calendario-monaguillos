import { useState, useEffect, useCallback } from "react";
import { db } from "../../services/firebase";
import { alerts } from "../../services/alerts";
import { formatTimeToAMPM, getLocalDateString } from "../../utils/time";
import { exportAttendanceCSV, printSacristySheet } from "../../utils/reportExporter";

export default function AttendanceInspector() {
  const [inspectDate, setInspectDate] = useState(getLocalDateString(new Date()));
  const [inspectMasses, setInspectMasses] = useState([]);
  const [selectedMassId, setSelectedMassId] = useState("");
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMassesForDate = async () => {
    if (!inspectDate) return;
    setLoading(true);
    try {
      const dateObj = new Date(inspectDate + "T00:00:00");
      const dayOfWeek = dateObj.getDay();
      const dayMasses = await db.getMassesForDay(dayOfWeek, inspectDate);
      setInspectMasses(dayMasses);

      if (dayMasses.length > 0) {
        setSelectedMassId(dayMasses[0].id);
      } else {
        setSelectedMassId("");
        setAttendanceList([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMassesForDate();
  }, [inspectDate]);

  const loadAttendance = async () => {
    if (!selectedMassId || !inspectDate) {
      setAttendanceList([]);
      return;
    }
    try {
      const list = await db.getMassAttendance(selectedMassId, inspectDate);
      setAttendanceList(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedMassId, inspectDate]);

  const handleUpdateStatus = async (regId, newStatus) => {
    try {
      await db.updateRegistrationStatus(regId, newStatus);
      loadAttendance();
      alerts.alert(`Estado de asistencia actualizado a: ${newStatus}`, "Actualizado", "success");
    } catch (err) {
      alerts.alert(err.message, "Error al actualizar", "error");
    }
  };

  const selectedMass = inspectMasses.find(m => m.id === selectedMassId);

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">fact_check</span>
            Fiscalizador de Asistencia Parroquial
          </h2>
          <p className="text-xs text-on-surface-variant">Revisa, confirma asistencia y genera hojas de sacristía.</p>
        </div>

        {selectedMass && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAttendanceCSV(selectedMass.title, inspectDate, selectedMass.time, attendanceList)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-white/10"
              title="Descargar reporte CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar CSV
            </button>
            <button
              onClick={() => printSacristySheet(selectedMass.title, inspectDate, selectedMass.time, attendanceList)}
              className="px-3 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              title="Imprimir Hoja para Sacristía"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Hoja Sacristía
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Seleccionar Fecha de Inspección
          </label>
          <input
            type="date"
            value={inspectDate}
            onChange={(e) => setInspectDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Seleccionar Celebración
          </label>
          <select
            value={selectedMassId}
            onChange={(e) => setSelectedMassId(e.target.value)}
            disabled={inspectMasses.length === 0}
            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors disabled:opacity-50"
          >
            {inspectMasses.length === 0 ? (
              <option value="">No hay misas en esta fecha</option>
            ) : (
              inspectMasses.map(m => (
                <option key={m.id} value={m.id}>
                  {formatTimeToAMPM(m.time)} - {m.title} ({m.type})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      {selectedMass ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
            <div>
              <span className="text-gray-400">Total Servidores Anotados: </span>
              <strong className="text-white font-bold">{attendanceList.length} / {selectedMass.serversRequired || 3}</strong>
            </div>
            <div>
              <span className="text-gray-400">Tipo: </span>
              <span className="text-secondary font-bold">{selectedMass.type}</span>
            </div>
          </div>

          {attendanceList.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
              <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">group_off</span>
              <p className="text-sm text-gray-400 font-semibold">No hay monaguillos inscritos para esta misa aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/10 text-gray-300 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="p-4">Monaguillo</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones de Marcado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-200">
                  {attendanceList.map((reg) => (
                    <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        {reg.userPhotoURL ? (
                          <img src={reg.userPhotoURL} alt={reg.userName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-white font-bold flex items-center justify-center text-xs">
                            {reg.userName.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-white text-sm">{reg.userName}</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-white/10 text-gray-300 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                          {reg.userRole || "Acólito"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          reg.status === "attended" 
                            ? "bg-green-500/20 text-green-400 border border-green-500/40"
                            : reg.status === "checked-in"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                              : reg.status === "absent"
                                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                        }`}>
                          {reg.status === "attended" ? "Asistió" : reg.status === "checked-in" ? "En Sitio (Check-in)" : reg.status === "absent" ? "Faltó" : "Pendiente"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleUpdateStatus(reg.id, "attended")}
                          className="px-2.5 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 font-bold rounded-lg transition-colors border border-green-500/30"
                          title="Marcar como Asistió"
                        >
                          Asistió
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(reg.id, "absent")}
                          className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 font-bold rounded-lg transition-colors border border-red-500/30"
                          title="Marcar como Faltó"
                        >
                          Faltó
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
          <p className="text-sm text-gray-400">Selecciona una fecha con misas programadas para inspeccionar las asistencias.</p>
        </div>
      )}
    </div>
  );
}
