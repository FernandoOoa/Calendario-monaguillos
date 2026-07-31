import { useState, useEffect } from "react";
import { db, dev } from "../../services/firebase";
import { alerts } from "../../services/alerts";

export default function AuditLogsTable() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");

  const loadLogs = async () => {
    try {
      const data = await db.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener("audit-log-added", handleUpdate);
    window.addEventListener("audit-logs-cleared", handleUpdate);
    return () => {
      window.removeEventListener("audit-log-added", handleUpdate);
      window.removeEventListener("audit-logs-cleared", handleUpdate);
    };
  }, []);

  const handleClearLogs = async () => {
    const ok = await alerts.confirm("¿Deseas vaciar el historial de auditoría del sistema?", "Limpiar Registros");
    if (!ok) return;
    dev.clearAuditLogs();
    loadLogs();
  };

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true;
    return log.category?.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">history</span>
            Auditoría de Actividad e Historial Interno
          </h2>
          <p className="text-xs text-on-surface-variant">Registro in-app de acciones y cambios de turno en la plataforma.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary"
          >
            <option value="all">Todas las Categorías</option>
            <option value="Misas">Misas</option>
            <option value="Notificaciones">Notificaciones</option>
          </select>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
          <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">assignment_late</span>
          <p className="text-sm text-gray-400 font-semibold">No se registran eventos de auditoría por el momento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/10 text-gray-300 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {filteredLogs.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-400 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString("es-ES")}
                  </td>
                  <td className="p-4 font-bold text-white">
                    {item.action}
                  </td>
                  <td className="p-4">
                    <span className="bg-secondary/20 text-secondary px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border border-secondary/30">
                      {item.category || "General"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">
                    {item.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
