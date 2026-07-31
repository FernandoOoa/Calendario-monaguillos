import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "../services/firebase";

const LiturgicalContext = createContext(null);

export function LiturgicalProvider({ children }) {
  const [selectedMass, setSelectedMass] = useState(null);
  const [selectedMassDateStr, setSelectedMassDateStr] = useState(null);
  const [allMasses, setAllMasses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [massesLoading, setMassesLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const loadAllMasses = useCallback(async () => {
    setMassesLoading(true);
    try {
      const list = await db.getAllMasses();
      setAllMasses(list);
    } catch (err) {
      console.error("Error al cargar lista global de misas:", err);
    } finally {
      setMassesLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const logs = await db.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error("Error al cargar registros de auditoría:", err);
    }
  }, []);

  useEffect(() => {
    loadAllMasses();
    loadAuditLogs();
  }, [loadAllMasses, loadAuditLogs, refreshTrigger]);

  useEffect(() => {
    const handleSync = () => triggerRefresh();
    window.addEventListener("mass-state-updated", handleSync);
    return () => window.removeEventListener("mass-state-updated", handleSync);
  }, [triggerRefresh]);

  const openMassDetail = (mass, dateStr) => {
    setSelectedMass(mass);
    setSelectedMassDateStr(dateStr);
  };

  const closeMassDetail = () => {
    setSelectedMass(null);
    setSelectedMassDateStr(null);
  };

  return (
    <LiturgicalContext.Provider
      value={{
        selectedMass,
        selectedMassDateStr,
        openMassDetail,
        closeMassDetail,
        allMasses,
        auditLogs,
        massesLoading,
        triggerRefresh,
      }}
    >
      {children}
    </LiturgicalContext.Provider>
  );
}

export function useLiturgical() {
  const context = useContext(LiturgicalContext);
  if (!context) {
    throw new Error("useLiturgical debe ser usado dentro de un LiturgicalProvider");
  }
  return context;
}
