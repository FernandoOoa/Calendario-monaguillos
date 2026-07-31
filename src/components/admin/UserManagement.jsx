import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { alerts } from "../../services/alerts";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("monaguillo");
  const [editLevel, setEditLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await db.getAllUsers();
      setUsers(list);
    } catch (e) {
      console.error("Error al cargar lista de usuarios:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setEditRole(user.role || "monaguillo");
    setEditLevel(user.level || 1);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      if (editRole !== editingUser.role) {
        await db.updateUserRole(editingUser.uid, editRole);
      }
      if (editingUser.role === "monaguillo" && Number(editLevel) !== editingUser.level) {
        await db.updateUserLevel(editingUser.uid, editLevel);
      }
      alerts.alert(`Perfil de ${editingUser.name} actualizado correctamente.`, "Usuario Actualizado", "success");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alerts.alert(err.message, "Error al actualizar", "error");
    }
  };

  const handleDeleteUser = async (user) => {
    const ok = await alerts.confirm(
      `¿Estás seguro de que deseas eliminar al usuario "${user.name} ${user.lastName}"?`,
      "Eliminar Usuario"
    );
    if (!ok) return;
    try {
      await db.deleteUser(user.uid);
      alerts.alert("Usuario eliminado correctamente.", "Eliminado", "info");
      loadUsers();
    } catch (err) {
      alerts.alert(err.message, "Error al eliminar", "error");
    }
  };

  const handleResetUser = async (user) => {
    const ok = await alerts.confirm(
      `¿Estás seguro de que deseas reiniciar todos los datos de "${user.name} ${user.lastName}"? Se restablecerán sus estadísticas, nivel (a 1), historial, inscripciones y notificaciones como si fuera un usuario nuevo.`,
      "Reiniciar Datos de Usuario"
    );
    if (!ok) return;
    try {
      await db.resetUserData(user.uid);
      alerts.alert(`Datos de ${user.name} reiniciados con éxito como un usuario nuevo.`, "Usuario Reiniciado", "success");
      loadUsers();
      window.dispatchEvent(new Event("mass-state-updated"));
    } catch (err) {
      alerts.alert(err.message || "Error al reiniciar los datos.", "Error al reiniciar", "error");
    }
  };

  const filteredUsers = users.filter(user => {
    const nameMatch = `${user.name} ${user.lastName} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const roleMatch = roleFilter === "all" || user.role === roleFilter;
    return nameMatch && roleMatch;
  });

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">manage_accounts</span>
            Control de Usuarios y Vínculos Familiares
          </h2>
          <p className="text-xs text-on-surface-variant">Gestión de cuentas, roles, niveles de monaguillos e hijos vinculados a padres.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-secondary w-full sm:w-64"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary w-full sm:w-auto"
          >
            <option value="all">Todos los Roles ({users.length})</option>
            <option value="monaguillo">Monaguillos ({users.filter(u => u.role === "monaguillo").length})</option>
            <option value="padre">Padres / Tutores ({users.filter(u => u.role === "padre").length})</option>
            <option value="admin">Administradores ({users.filter(u => u.role === "admin").length})</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400 font-semibold animate-pulse">
          Cargando usuarios registrados...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
          <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">no_accounts</span>
          <p className="text-sm text-gray-400 font-semibold">No se encontraron usuarios con los criterios de búsqueda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/10 text-gray-300 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Nivel / Estadísticas</th>
                <th className="p-4">Vínculo Familiar (Hijos)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {filteredUsers.map((user) => {
                let parentUser = null;
                if (user.role === "monaguillo" && user.linkedParentUid) {
                  parentUser = users.find(u => u.uid === user.linkedParentUid);
                }

                return (
                  <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-white font-bold flex items-center justify-center text-xs border border-white/10">
                          {user.name ? user.name.charAt(0) : "U"}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white text-sm">{user.name} {user.lastName}</p>
                        <p className="text-[11px] text-gray-400">{user.email}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        user.role === "admin" 
                          ? "bg-primary text-white" 
                          : user.role === "padre" 
                            ? "bg-secondary text-black" 
                            : "bg-white/10 text-white border border-white/10"
                      }`}>
                        {user.role === "admin" ? "Administrador" : user.role === "padre" ? "Padre / Tutor" : "Monaguillo"}
                      </span>
                    </td>

                    <td className="p-4">
                      {user.role === "monaguillo" ? (
                        <div>
                          <span className="font-bold text-secondary text-xs">Nivel {user.level || 1}</span>
                          <p className="text-[11px] text-gray-400">
                            {user.servedCount || 0} misas servidas | {user.punctuality || 100}% puntual
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">N/A</span>
                      )}
                    </td>

                    <td className="p-4">
                      {user.role === "padre" ? (
                        <div>
                          {user.childEmails && user.childEmails.length > 0 ? (
                            <div className="space-y-1">
                              {user.childEmails.map((cEmail, i) => {
                                const childObj = users.find(u => u.email.toLowerCase() === cEmail.toLowerCase());
                                return (
                                  <div key={i} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                    <span className="material-symbols-outlined text-[14px] text-secondary">child_care</span>
                                    <span className="font-bold text-white text-[11px]">
                                      {childObj ? `${childObj.name} ${childObj.lastName}` : cEmail}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Sin hijos vinculados</span>
                          )}
                        </div>
                      ) : user.role === "monaguillo" ? (
                        <div>
                          {parentUser ? (
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <span className="material-symbols-outlined text-[14px] text-secondary">family_restroom</span>
                              <span>Tutor: <strong>{parentUser.name} {parentUser.lastName}</strong></span>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Sin tutor registrado</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">N/A</span>
                      )}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleStartEdit(user)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/10 flex items-center gap-1 inline-flex"
                        title="Editar rol/nivel"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Editar
                      </button>

                      <button
                        onClick={() => handleResetUser(user)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg transition-colors border border-amber-500/30 flex items-center gap-1 inline-flex"
                        title="Reiniciar datos como nuevo usuario"
                      >
                        <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                        Reiniciar
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-lg transition-colors border border-red-500/30 flex items-center gap-1 inline-flex"
                        title="Eliminar usuario completamente"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="glass-card max-w-md w-full p-6 space-y-5 border border-white/20">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Editar Usuario: {editingUser.name} {editingUser.lastName}</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Rol de Usuario</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary"
              >
                <option value="monaguillo">Monaguillo</option>
                <option value="padre">Padre / Tutor</option>
                <option value="admin">Administrador (Coordinador)</option>
              </select>
            </div>

            {editingUser.role === "monaguillo" && (
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Nivel de Monaguillo</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(Number(e.target.value))}
                  className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary"
                >
                  <option value={1}>Nivel 1 - Principiante (Acólito)</option>
                  <option value={2}>Nivel 2 - Intermedio</option>
                  <option value={3}>Nivel 3 - Avanzado</option>
                  <option value={4}>Nivel 4 - Navicularia / Turiferario</option>
                  <option value={5}>Nivel 5 - Maestro de Ceremonias</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
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
