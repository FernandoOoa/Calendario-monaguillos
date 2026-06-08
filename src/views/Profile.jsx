import React, { useState, useEffect } from "react";
import { db, dev } from "../services/firebase";

export default function Profile({ user, onUpdateUser }) {
  const [stats, setStats] = useState({ servedCount: 0, punctuality: 100, level: 1 });
  const [recurrenceConfirmed, setRecurrenceConfirmed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [children, setChildren] = useState([]);
  
  // New child form for parents
  const [newChildEmail, setNewChildEmail] = useState("");
  const [childFormError, setChildFormError] = useState("");
  const [childFormSuccess, setChildFormSuccess] = useState("");

  const loadProfileData = async () => {
    if (!user) return;
    try {
      if (user.role === "monaguillo") {
        const profile = await db.getUserProfile(user.uid);
        if (profile) {
          setStats({
            servedCount: profile.servedCount || 0,
            punctuality: profile.punctuality || 100,
            level: profile.level || 1
          });
          setRecurrenceConfirmed(profile.activeRecurrence || false);
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
    window.addEventListener("simulated-email-sent", handleUpdate);
    window.addEventListener("mass-state-updated", handleUpdate);
    
    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
      window.removeEventListener("simulated-email-sent", handleUpdate);
      window.removeEventListener("mass-state-updated", handleUpdate);
    };
  }, [user]);

  const handleRecurrenceToggle = async (e) => {
    const val = e.target.checked;
    setRecurrenceConfirmed(val);
    try {
      await db.confirmRecurrence(user.uid, val);
      // Trigger user state reload in app shell
      if (onUpdateUser) {
        onUpdateUser({ ...user, activeRecurrence: val });
      }
    } catch (err) {
      alert("Error actualizando recurrencia");
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
    const now = dev.getSimulatedTime();
    const nextIdx = (now.getMonth() + 1) % 12;
    return months[nextIdx];
  };

  return (
    <div className="flex-grow py-8 max-w-7xl mx-auto w-full px-container-padding-mobile md:px-container-padding-desktop font-sans pb-24 md:pb-8">
      {/* Header Profile Section */}
      <section className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 text-center md:text-left bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow">
        <div className="relative">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-3xl font-bold border-4 border-white card-shadow uppercase">
            {user.name.charAt(0)}
            {user.lastName?.charAt(0)}
          </div>
          <div className="absolute bottom-1 right-1 bg-secondary-container p-1.5 rounded-full shadow-md border border-white flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary-container text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
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
            Parroquia San José Sánchez del Río
          </p>
          <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider">
              {user.role === "monaguillo" ? "Acólito" : user.role === "padre" ? "Padre / Tutor" : "Administrador"}
            </span>
            {user.role === "monaguillo" && (
              <span className="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px] uppercase tracking-wider">
                Nivel {stats.level}
              </span>
            )}
          </div>
        </div>

        {user.role === "monaguillo" && (
          <div className="hidden lg:flex gap-4">
            <div className="bg-surface-container-lowest p-4 rounded-2xl card-shadow border border-outline-variant/30 text-center min-w-[120px]">
              <p className="text-primary font-bold text-xl">{stats.servedCount}</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Misas Servidas</p>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-2xl card-shadow border border-outline-variant/30 text-center min-w-[120px]">
              <p className="text-secondary font-bold text-xl">{stats.punctuality}%</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Puntualidad</p>
            </div>
          </div>
        )}
      </section>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">
        
        {/* Left Column: Role dependent actions */}
        <div className="lg:col-span-4 flex flex-col gap-card-gap">
          
          {/* Altar Server Recurrence Confirmation */}
          {user.role === "monaguillo" && (
            <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow border-l-4 border-l-secondary">
              <h2 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">event_repeat</span>
                Disponibilidad {getNextMonthName()}
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                Confirma tu disponibilidad para renovar tus horarios recurrentes el mes siguiente.
              </p>
              <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl">
                <span className="text-xs font-bold text-on-surface">Confirmar Asistencia</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurrenceConfirmed}
                    onChange={handleRecurrenceToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <p className="text-[10px] text-on-surface-variant/70 italic mt-3 text-center">
                * Si no confirmas antes de fin de mes, se liberarán tus turnos recurrentes.
              </p>
            </div>
          )}

          {/* Parent: Linked Children List */}
          {user.role === "padre" && (
            <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow">
              <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">family_restroom</span>
                Monaguillos a Cargo
              </h2>

              {children.length === 0 ? (
                <p className="text-xs text-on-surface-variant/70 italic text-center py-4">No tienes hijos vinculados aún.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {children.map((child) => (
                    <div key={child.uid} className="p-3 bg-surface-container rounded-2xl flex items-center justify-between border border-outline-variant/30">
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          {child.name === "Pendiente" ? `Pendiente: ${child.email}` : `${child.name} ${child.lastName}`}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {child.isPendingSignUp ? "Esperando registro..." : `Nivel ${child.level} • ${child.servedCount} misas`}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        child.isPendingSignUp ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                      }`}>
                        {child.isPendingSignUp ? "PENDIENTE" : "ACTIVO"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add child form */}
              <form onSubmit={handleAddChild} className="border-t border-outline-variant/40 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-on-surface-variant">Vincular otro hijo</h3>
                
                {childFormError && <p className="text-[10px] text-error font-bold">{childFormError}</p>}
                {childFormSuccess && <p className="text-[10px] text-green-600 font-bold">{childFormSuccess}</p>}

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="hijo@ejemplo.com"
                    value={newChildEmail}
                    onChange={(e) => setNewChildEmail(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-outline-variant text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white px-3 rounded-lg text-xs font-bold hover:bg-primary-container active:scale-95 transition-transform"
                  >
                    Vincular
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Aggregated Notification Bell Logs */}
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow flex-grow">
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
                  <div key={notif.id} className="p-3 bg-surface-container rounded-xl border border-outline-variant/20 flex gap-2">
                    <span className={`material-symbols-outlined text-lg ${
                      notif.type === "error" ? "text-error" : 
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
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/40 card-shadow h-full flex flex-col">
            <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              {user.role === "monaguillo" ? "Mi Historial de Servicio" : "Resumen de Turnos y Actividad"}
            </h2>

            {user.role === "monaguillo" ? (
              history.length === 0 ? (
                <div className="text-center py-16 text-xs text-on-surface-variant/70 italic bg-surface-container-low rounded-2xl flex-grow flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
                  Aún no has registrado misas servidas en tu historial.
                </div>
              ) : (
                <div className="overflow-x-auto flex-grow no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-outline-variant text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        <th className="py-3">Misa / Ubicación</th>
                        <th className="py-3">Fecha y Hora</th>
                        <th className="py-3">Rol Litúrgico</th>
                        <th className="py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/50">
                      {history.map((hist) => (
                        <tr key={hist.id} className="hover:bg-surface-container/30 transition-colors">
                          <td className="py-4">
                            <p className="font-bold text-on-surface">{hist.title}</p>
                            <p className="text-[10px] text-on-surface-variant">{hist.location}</p>
                          </td>
                          <td className="py-4">
                            <p className="font-bold text-on-surface">{new Date(hist.date + "T00:00:00").toLocaleDateString()}</p>
                            <p className="text-[10px] text-on-surface-variant">{hist.time}</p>
                          </td>
                          <td className="py-4">
                            <span className="px-2.5 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-bold text-[9px] uppercase tracking-wide">
                              {hist.role}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="flex items-center gap-1 font-semibold text-on-surface">
                              <span className={`w-2 h-2 rounded-full ${
                                hist.status.includes("Cumplido") ? "bg-green-600" : "bg-error"
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
              <div className="flex-grow flex flex-col justify-center items-center text-center p-8 bg-surface-container-low rounded-2xl text-xs text-on-surface-variant/80">
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
        </div>

      </div>
    </div>
  );
}
