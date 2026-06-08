import React, { useState, useEffect, useRef } from "react";
import { db } from "../services/firebase";

export default function NotificationBell({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const list = await db.getNotifications(user.uid);
      setNotifications(list);
    } catch (e) {
      console.error("Error fetching notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll or listen for simulated updates
    const handleUpdate = () => fetchNotifications();
    window.addEventListener("notifications-updated", handleUpdate);
    window.addEventListener("simulated-email-sent", handleUpdate); // Simulated notifications often happen on email events too
    
    // Click outside listener
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
      window.removeEventListener("simulated-email-sent", handleUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await db.markNotificationsAsRead(user.uid);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-surface-container-high transition-all relative flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-on-surface-variant text-[24px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden text-white">
          {/* Header */}
          <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">notifications_active</span>
              Campanita
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-primary font-bold text-xs hover:underline"
              >
                Marcar como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto no-scrollbar divide-y divide-outline-variant/50">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                No tienes notificaciones.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 transition-colors flex gap-3 ${notif.read ? "bg-[#1c1c1c]" : "bg-white/[0.03]"}`}
                >
                  {/* Status Icon */}
                  <span className={`material-symbols-outlined text-xl mt-0.5 ${
                    notif.type === "error" ? "text-error" : 
                    notif.type === "warning" ? "text-secondary" : 
                    notif.type === "success" ? "text-green-600" : "text-primary"
                  }`}>
                    {notif.type === "error" ? "error" :
                     notif.type === "warning" ? "timer" :
                     notif.type === "success" ? "check_circle" : "info"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${notif.read ? "text-on-surface" : "text-primary"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {notif.content}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">
                      {new Date(notif.date).toLocaleDateString()} a las {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
