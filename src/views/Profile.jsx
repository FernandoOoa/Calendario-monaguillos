import { useEffect, useState } from "react";
import { alerts } from "../services/alerts";
import { db } from "../services/firebase";

export default function Profile({ user, onUpdateUser }) {
  const [stats, setStats] = useState({ servedCount: 0, punctuality: 100, level: 1 });
  const [recurrenceConfirmed, setRecurrenceConfirmed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [children, setChildren] = useState([]);
  const [parishRecurringMasses, setParishRecurringMasses] = useState([]);
  const [selectedRecurringMasses, setSelectedRecurringMasses] = useState([]);

  // New child form for parents
  const [newChildEmail, setNewChildEmail] = useState("");
  const [childFormError, setChildFormError] = useState("");
  const [childFormSuccess, setChildFormSuccess] = useState("");

  const loadProfileData = async () => {
    if (!user) return;
    try {
      // Fetch available recurring masses
      const allMasses = await db.getAllMasses();
      const recMasses = allMasses.filter(m => m.isRecurring);
      
      const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // L, M, M, J, V, S, D
      const sortedRecMasses = [...recMasses].sort((a, b) => {
        const orderA = dayOrder.indexOf(a.dayOfWeek);
        const orderB = dayOrder.indexOf(b.dayOfWeek);
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.time.localeCompare(b.time);
      });
      setParishRecurringMasses(sortedRecMasses);

      if (user.role === "monaguillo") {
        const profile = await db.getUserProfile(user.uid);
        if (profile) {
          setStats({
            servedCount: profile.servedCount || 0,
            punctuality: profile.punctuality || 100,
            level: profile.level || 1
          });
          setRecurrenceConfirmed(profile.activeRecurrence || false);
          setSelectedRecurringMasses(profile.recurringMasses || []);
        }

        const hist = await db.getHistory(user.uid);
        setHistory(hist);
      } else if (user.role === "padre") {
        const list = await db.getChildrenForParent(user.uid);
        setChildren(list);
      }

      const notifs = await db.getNotifications(user.uid);
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProfileData();

    // Event listeners
    const handleUpdate = () => loadProfileData();
    window.addEventListener("notifications-updated", handleUpdate);
    window.addEventListener("mass-state-updated", handleUpdate);

    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
      window.removeEventListener("mass-state-updated", handleUpdate);
    };
  }, [user]);

  const handleRecurrenceToggle = async (e) => {
    const val = e.target.checked;
    setRecurrenceConfirmed(val);
    try {
      await db.confirmRecurrence(user.uid, val, selectedRecurringMasses);
      // Trigger user state reload in app shell
      if (onUpdateUser) {
        onUpdateUser({ ...user, activeRecurrence: val, recurringMasses: selectedRecurringMasses });
      }
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert("Error actualizando recurrencia", "Error", "error");
    }
  };

  const handleToggleMassSelection = async (massId) => {
    let nextSelection = [...selectedRecurringMasses];
    if (nextSelection.includes(massId)) {
      nextSelection = nextSelection.filter(id => id !== massId);
    } else {
      nextSelection.push(massId);
    }
    setSelectedRecurringMasses(nextSelection);
    
    // Auto-save if recurrence is currently active/confirmed
    try {
      await db.confirmRecurrence(user.uid, recurrenceConfirmed, nextSelection);
      if (onUpdateUser) {
        onUpdateUser({ ...user, activeRecurrence: recurrenceConfirmed, recurringMasses: nextSelection });
      }
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert("Error al actualizar la asignación de misas", "Error", "error");
    }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    setChildFormError("");
    setChildFormSuccess("");

    if (!newChildEmail.trim()) return;

    try {
      // Create relationship
      const users = JSON.parse(localStorage.getItem("joselito_users") || "{}");

      // Update parent childEmails list
      const parentUser = users[user.uid];
      if (!parentUser.childEmails) parentUser.childEmails = [];

      if (parentUser.childEmails.includes(newChildEmail)) {
        setChildFormError("Este correo ya está en tu lista.");
        return;
      }

      parentUser.childEmails.push(newChildEmail);
      users[user.uid] = parentUser;

      // Check if child user exists
      const childUser = Object.values(users).find(u => u.email.toLowerCase() === newChildEmail.toLowerCase());
      if (childUser) {
        childUser.linkedParentUid = user.uid;
        users[childUser.uid] = childUser;
        setChildFormSuccess(`¡Hijo vinculado exitosamente! Perfil activo.`);
      } else {
        // Pre-create child pending account
        const childUid = `child-uid-${Date.now()}`;
        users[childUid] = {
          uid: childUid,
          email: newChildEmail,
          name: "Pendiente",
          lastName: "Registro",
          role: "monaguillo",
          level: 1,
          servedCount: 0,
          punctuality: 100,
          isPendingSignUp: true,
          linkedParentUid: user.uid
        };
        setChildFormSuccess(`Hijo registrado. Esperando que cree su cuenta con: ${newChildEmail}`);
      }

      localStorage.setItem("joselito_users", JSON.stringify(users));
      setNewChildEmail("");
      loadProfileData();

      if (onUpdateUser) {
        onUpdateUser(parentUser);
      }
    } catch (err) {
      setChildFormError("Error al registrar hijo.");
    }
  };

  // Determine next month name dynamically
  const getNextMonthName = () => {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const now = new Date();
    const nextIdx = (now.getMonth() + 1) % 12;
    return months[nextIdx];
  };

  const renderProfileMassItem = (mass) => {
    const isSelected = selectedRecurringMasses.includes(mass.id);
    const dayLabel = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][mass.dayOfWeek];
    
    return (
      <div 
        key={mass.id} 
        onClick={() => handleToggleMassSelection(mass.id)}
        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
          isSelected 
            ? "bg-primary/10 border-primary/40 text-white" 
            : "bg-white/5 border-white/5 text-on-surface-variant hover:bg-white/[0.08]"
        }`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[11px] font-bold text-white truncate">{mass.title}</p>
          <p className="text-[9px] text-on-surface-variant font-semibold mt-0.5">
            {dayLabel} a las {mass.time}
          </p>
        </div>
        <div className="shrink-0 flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // handled by click on container
            className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary pointer-events-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-grow py-8 max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop font-sans pb-24 md:pb-8">
      {/* Header Profile Section */}
      <section className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 text-center md:text-left glass-card p-6 rounded-3xl border border-white/10 shadow-lg">
        <div className="relative">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={`${user.name} avatar`}
              referrerPolicy="no-referrer"
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/10 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/20 text-primary flex items-center justify-center text-3xl font-bold border-4 border-white/10 shadow-md uppercase">
              {user.name.charAt(0)}
              {user.lastName?.charAt(0)}
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-secondary/20 p-1.5 rounded-full shadow-md border border-white/10 flex items-center justify-center backdrop-blur-md">
            <span className="material-symbols-outlined text-secondary text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
          </div>
        </div>

        <div className="flex-grow">
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">
            {user.name} {user.lastName}
          </h1>
          <p className="text-xs text-on-surface-variant flex items-center justify-center md:justify-start gap-1.5 font-semibold">
            <span className="material-symbols-outlined text-primary text-base">church</span>
            Parroquia El Padre Eterno
          </p>
          <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/10 font-bold text-[10px] uppercase tracking-wider">
              {user.role === "monaguillo" ? "Acólito" : user.role === "padre" ? "Padre / Tutor" : "Administrador"}
            </span>
            {user.role === "monaguillo" && (
              <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/10 font-bold text-[10px] uppercase tracking-wider">
                Nivel {stats.level}
              </span>
            )}
          </div>
        </div>

        {user.role === "monaguillo" && (
          <div className="hidden lg:flex gap-4">
            <div className="glass-card p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
              <p className="text-primary font-bold text-xl">{stats.servedCount}</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Misas Servidas</p>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
              <p className="text-secondary font-bold text-xl">{stats.punctuality}%</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Puntualidad</p>
            </div>
          </div>
        )}
      </section>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Role dependent actions */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Altar Server Recurrence Confirmation */}
          {user.role === "monaguillo" && (
            <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg border-l-4 border-l-secondary">
              <h2 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">event_repeat</span>
                Disponibilidad {getNextMonthName()}
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                Confirma tu disponibilidad para renovar tus horarios recurrentes el mes siguiente.
              </p>
              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl mb-4">
                <span className="text-xs font-bold text-on-surface">Confirmar Asistencia</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurrenceConfirmed}
                    onChange={handleRecurrenceToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Recurring masses selection list */}
              <div className="border-t border-white/10 pt-4 space-y-4">
                <span className="font-bold text-secondary text-[11px] uppercase tracking-wider block mb-1">Mis Misas Recurrentes</span>
                {parishRecurringMasses.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/70 italic">No hay misas recurrentes configuradas.</p>
                ) : (
                  <div className="space-y-4 max-h-72 overflow-y-auto no-scrollbar pr-1">
                    {/* Morning Masses */}
                    {parishRecurringMasses.filter(m => m.time < "12:00").length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-amber-400">light_mode</span>
                          Mañana (AM)
                        </span>
                        <div className="space-y-1.5">
                          {parishRecurringMasses.filter(m => m.time < "12:00").map(mass => renderProfileMassItem(mass))}
                        </div>
                      </div>
                    )}

                    {/* Afternoon Masses */}
                    {parishRecurringMasses.filter(m => m.time >= "12:00").length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-indigo-400">dark_mode</span>
                          Tarde / Noche (PM)
                        </span>
                        <div className="space-y-1.5">
                          {parishRecurringMasses.filter(m => m.time >= "12:00").map(mass => renderProfileMassItem(mass))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-on-surface-variant/70 italic mt-4 text-center">
                * Si no confirmas antes de fin de mes, se liberarán tus turnos recurrentes.
              </p>
            </div>
          )}

          {/* Parent: Linked Children List */}
          {user.role === "padre" && (
            <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg">
              <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">family_restroom</span>
                Monaguillos a Cargo
              </h2>

              {children.length === 0 ? (
                <p className="text-xs text-on-surface-variant/70 italic text-center py-4">No tienes hijos vinculados aún.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {children.map((child) => (
                    <div key={child.uid} className="p-3 bg-white/[0.02] rounded-2xl flex items-center justify-between border border-white/5">
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          {child.name === "Pendiente" ? `Pendiente: ${child.email}` : `${child.name} ${child.lastName}`}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {child.isPendingSignUp ? "Esperando registro..." : `Nivel ${child.level} • ${child.servedCount} misas`}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${child.isPendingSignUp
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}>
                        {child.isPendingSignUp ? "PENDIENTE" : "ACTIVO"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add child form */}
              <form onSubmit={handleAddChild} className="border-t border-white/10 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-on-surface-variant">Vincular otro hijo</h3>

                {childFormError && <p className="text-[10px] text-error font-bold">{childFormError}</p>}
                {childFormSuccess && <p className="text-[10px] text-green-400 font-bold">{childFormSuccess}</p>}

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="hijo@ejemplo.com"
                    value={newChildEmail}
                    onChange={(e) => setNewChildEmail(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-on-surface outline-none focus:border-primary placeholder:text-on-surface-variant/40"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white px-3 rounded-lg text-xs font-bold active:scale-95 transition-all"
                  >
                    Vincular
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Aggregated Notification Bell Logs */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg flex-grow">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">notifications</span>
              Historial de Alertas (In-App)
            </h2>
            <div className="space-y-3 overflow-y-auto max-h-60 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-on-surface-variant/70 italic">
                  Sin alertas recientes.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/5 flex gap-2">
                    <span className={`material-symbols-outlined text-lg ${notif.type === "error" ? "text-error" :
                        notif.type === "warning" ? "text-secondary" : "text-primary"
                      }`}>
                      {notif.type === "error" ? "error" : "info"}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface">{notif.title}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 leading-snug">{notif.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History & Details */}
        <div className="lg:col-span-8">
          {user.role === "admin" ? (
            <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg h-full flex flex-col justify-center items-center text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-3">admin_panel_settings</span>
              <h2 className="text-base font-bold text-on-surface mb-2">Panel de Control de Coordinador</h2>
              <p className="max-w-md text-xs text-on-surface-variant leading-relaxed">
                Como Coordinador (Administrador), tienes acceso a todas las herramientas de gestión en la pestaña de <strong>Administración</strong>.
                Ahí podrás crear nuevas misas, gestionar los registros de los monaguillos y configurar el sistema.
              </p>
            </div>
          ) : (
            <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-lg h-full flex flex-col">
              <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                {user.role === "monaguillo" ? "Mi Historial de Servicio" : "Resumen de Turnos y Actividad"}
              </h2>

              {user.role === "monaguillo" ? (
                history.length === 0 ? (
                  <div className="text-center py-16 text-xs text-on-surface-variant/70 italic bg-white/[0.01] border border-dashed border-white/10 rounded-2xl flex-grow flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
                    Aún no has registrado misas servidas en tu historial.
                  </div>
                ) : (
                  <div className="overflow-x-auto flex-grow no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          <th className="py-3">Misa / Ubicación</th>
                          <th className="py-3">Fecha y Hora</th>
                          <th className="py-3">Rol Litúrgico</th>
                          <th className="py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {history.map((hist) => (
                          <tr key={hist.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4">
                              <p className="font-bold text-on-surface">{hist.title}</p>
                              <p className="text-[10px] text-on-surface-variant">{hist.location}</p>
                            </td>
                            <td className="py-4">
                              <p className="font-bold text-on-surface">{new Date(hist.date + "T00:00:00").toLocaleDateString()}</p>
                              <p className="text-[10px] text-on-surface-variant">{hist.time}</p>
                            </td>
                            <td className="py-4">
                              <span className="px-2.5 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/20 font-bold text-[9px] uppercase tracking-wide">
                                {hist.role}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className="flex items-center gap-1 font-semibold text-on-surface">
                                <span className={`w-2 h-2 rounded-full ${hist.status.includes("Cumplido") ? "bg-green-500" : "bg-error"
                                  }`} />
                                {hist.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                // Parent summary info
                <div className="flex-grow flex flex-col justify-center items-center text-center p-8 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-on-surface-variant/80">
                  <span className="material-symbols-outlined text-4xl text-primary mb-3">supervisor_account</span>
                  <p className="font-bold text-on-surface text-sm mb-2">Panel de Control de Padre / Tutor</p>
                  <p className="max-w-md leading-relaxed">
                    Desde esta sección puedes monitorear el servicio al altar de tus hijos.
                    Recibirás alertas en tu correo electrónico en tiempo real en caso de que tus hijos cancelen su asistencia de último minuto,
                    permitiéndote estar enterado de sus responsabilidades parroquiales.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
