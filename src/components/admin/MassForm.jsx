import { useState } from "react";
import { db } from "../../services/firebase";
import { alerts } from "../../services/alerts";

export default function MassForm({ onMassCreated }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0); // 0 = Domingo
  const [specificDate, setSpecificDate] = useState("");
  const [type, setType] = useState("ORDINARIA");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [serversRequired, setServersRequired] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const daysOfWeekNames = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miércoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
    { value: 6, label: "Sábado" }
  ];

  const massTypesList = [
    "ORDINARIA", "BAUTIZO", "SOLEMNE", "CONFIRMACIÓN", 
    "PRIMERA COMUNIÓN", "CUERPO PRESENTTE", "ESPECIAL"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !time) {
      alerts.alert("Completa los campos requeridos (Título y Hora).", "Campo requerido", "warning");
      return;
    }

    let finalDay = Number(dayOfWeek);
    let finalDate = null;

    if (!isRecurring) {
      if (!specificDate) {
        alerts.alert("Selecciona la fecha específica del evento especial.", "Fecha requerida", "warning");
        return;
      }
      const d = new Date(specificDate + "T00:00:00");
      finalDay = d.getDay();
      finalDate = specificDate;
    }

    setSubmitting(true);
    try {
      await db.createMass({
        title: title.trim(),
        time,
        dayOfWeek: finalDay,
        specificDate: finalDate,
        type,
        notes: notes.trim(),
        isRecurring,
        serversRequired: Number(serversRequired) || 3
      });

      alerts.alert(`Celebración "${title}" programada con éxito.`, "Misa Creada", "success");
      setTitle("");
      setTime("");
      setNotes("");
      setSpecificDate("");
      if (onMassCreated) onMassCreated();
    } catch (err) {
      alerts.alert(err.message || "Error al crear la misa.", "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">add_circle</span>
            Programar Nueva Celebración Litúrgica
          </h2>
          <p className="text-xs text-on-surface-variant">Configura el horario, tipo y servidores requeridos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Título de la Misa *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ej. Misa Dominical Mayor"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-secondary transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Hora de Inicio *
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Tipo de Celebración
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
          >
            {massTypesList.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Monaguillos Requeridos
          </label>
          <input
            type="number"
            min="1"
            max="12"
            value={serversRequired}
            onChange={(e) => setServersRequired(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
          />
        </div>
      </div>

      {/* Recurrence Toggle */}
      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">¿Misa Recurrente?</h4>
          <p className="text-xs text-on-surface-variant">Si está activo, se repetirá semanalmente en el día seleccionado.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
        </label>
      </div>

      {isRecurring ? (
        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Día de la Semana
          </label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
          >
            {daysOfWeekNames.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            Fecha Específica (Evento Único) *
          </label>
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
          Notas o Instrucciones Litúrgicas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="2"
          placeholder="ej. Túnica roja, se requiere incensario y crucífero."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-secondary transition-colors"
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-primary hover:bg-primary-container text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">save</span>
        {submitting ? "Guardando Celebración..." : "Guardar Misa en Calendario"}
      </button>
    </form>
  );
}
