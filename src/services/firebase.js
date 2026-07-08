import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { getLocalDateString } from "../utils/time";

// Provided Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDputZvY06Qi9K2fKjeFIenDW_1ahj3Y4Y",
  authDomain: "calendario-monaguillos.firebaseapp.com",
  projectId: "calendario-monaguillos",
  storageBucket: "calendario-monaguillos.firebasestorage.app",
  messagingSenderId: "224434813022",
  appId: "1:224434813022:web:85b81d168f4a22ad965ccf"
};

// Initialize Firebase App
let firebaseApp = null;
let realAuth = null;
let realDb = null;

try {
  firebaseApp = initializeApp(firebaseConfig);
  realAuth = getAuth(firebaseApp);
  realDb = getFirestore(firebaseApp);
} catch (e) {
  console.warn("Firebase initialization failed. Falling back to local simulation.", e);
}

// Check if we should use real Firebase (always enabled in simplified version)
const isRealFirebaseEnabled = () => true;

const toggleRealFirebase = (enable) => {
  // Simulación desactivada en modo producción simplificado
};

// ==========================================
// SEED DATA FOR SIMULATION
// ==========================================
const DEFAULT_USERS = {
  "admin-uid": {
    uid: "admin-uid",
    email: "admin@joselito.com",
    name: "Administrador",
    lastName: "Parroquial",
    role: "admin",
    level: 5,
    servedCount: 150,
    punctuality: 100,
    photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "parent-uid": {
    uid: "parent-uid",
    email: "padre@joselito.com",
    name: "Carlos",
    lastName: "Sánchez",
    role: "padre",
    childEmails: ["monaguillo@joselito.com"],
    photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "monaguillo-uid": {
    uid: "monaguillo-uid",
    email: "monaguillo@joselito.com",
    name: "Josué",
    lastName: "Sánchez",
    role: "monaguillo",
    level: 4,
    servedCount: 42,
    punctuality: 98,
    activeRecurrence: true,
    photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "mateo-uid": {
    uid: "mateo-uid",
    email: "mateo@joselito.com",
    name: "Mateo",
    lastName: "Rodríguez",
    role: "monaguillo",
    level: 3,
    servedCount: 28,
    punctuality: 95,
    activeRecurrence: true,
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "juan-uid": {
    uid: "juan-uid",
    email: "juan@joselito.com",
    name: "Juan Pablo",
    lastName: "Silva",
    role: "monaguillo",
    level: 2,
    servedCount: 15,
    punctuality: 90,
    activeRecurrence: false,
    photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "sofia-uid": {
    uid: "sofia-uid",
    email: "sofia@joselito.com",
    name: "Sofía",
    lastName: "García",
    role: "monaguillo",
    level: 4,
    servedCount: 37,
    punctuality: 97,
    activeRecurrence: true,
    photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
  }
};

const DEFAULT_MASSES = [
  {
    id: "mass-1",
    time: "08:00",
    title: "Misa de la Mañana",
    type: "ORDINARIA",
    dayOfWeek: 0, // Domingo
    notes: "Misa matutina con la comunidad.",
    isRecurring: true
  },
  {
    id: "mass-2",
    time: "10:00",
    title: "Misa Dominical",
    type: "ORDINARIA",
    dayOfWeek: 0, // Domingo
    notes: "Misa mayor con coro.",
    isRecurring: true
  },
  {
    id: "mass-3",
    time: "11:00",
    title: "Ceremonia Bautismal",
    type: "BAUTIZO",
    dayOfWeek: 0, // Domingo
    notes: "Se requiere túnica de gala.",
    isRecurring: false
  },
  {
    id: "mass-4",
    time: "18:00",
    title: "Misa Vespertina",
    type: "SOLEMNE",
    dayOfWeek: 0, // Domingo
    notes: "Se requiere incienso y crucífero.",
    isRecurring: true
  },
  {
    id: "mass-5",
    time: "19:00",
    title: "Misa de Juventud",
    type: "SOLEMNE",
    dayOfWeek: 6, // Sábado
    notes: "Participación activa del coro juvenil.",
    isRecurring: true
  },
  {
    id: "mass-6",
    time: "18:30",
    title: "Misa Semanal",
    type: "ORDINARIA",
    dayOfWeek: 2, // Martes
    notes: "Misa comunitaria ordinaria.",
    isRecurring: true
  }
];

const DEFAULT_REGISTRATIONS = [
  // Registered for mass-2 (Misa Dominical 10:00 AM)
  { id: "reg-1", massId: "mass-2", date: "2026-06-14", userUid: "mateo-uid", userName: "Mateo Rodríguez", userRole: "Ceremoniario", status: "pending" },
  { id: "reg-2", massId: "mass-2", date: "2026-06-14", userUid: "juan-uid", userName: "Juan Pablo Silva", userRole: "Turiferario", status: "pending" },
  { id: "reg-3", massId: "mass-2", date: "2026-06-14", userUid: "monaguillo-uid", userName: "Josué Sánchez", userRole: "Navicularia", status: "pending" },

  // Registered for mass-1 (Misa de la Mañana 08:00 AM)
  { id: "reg-4", massId: "mass-1", date: "2026-06-14", userUid: "mateo-uid", userName: "Mateo Rodríguez", userRole: "Acólito", status: "checked-in" },
  { id: "reg-5", massId: "mass-1", date: "2026-06-14", userUid: "sofia-uid", userName: "Sofía García", userRole: "Acólito", status: "attended" }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "notif-1",
    recipientUid: "monaguillo-uid",
    type: "warning",
    title: "Recordatorio: Check-in",
    content: "Misa dominical en 15 min. Por favor, realiza el check-in en la sacristía.",
    date: "2026-06-08T14:45:00-06:00",
    read: false
  },
  {
    id: "notif-2",
    recipientUid: "monaguillo-uid",
    type: "info",
    title: "Cambio de Turno",
    content: "Mateo Rodríguez solicitó un reemplazo para la misa de la tarde.",
    date: "2026-06-07T18:00:00-06:00",
    read: false
  },
  {
    id: "notif-3",
    recipientUid: "monaguillo-uid",
    type: "success",
    title: "Túnica Lista",
    content: "La lavandería de la parroquia ha marcado tu túnica como lista.",
    date: "2026-06-05T12:00:00-06:00",
    read: true
  }
];

const DEFAULT_HISTORY = [
  { id: "hist-1", userUid: "monaguillo-uid", title: "Misa Dominical", location: "Parroquia Principal", date: "2026-05-31", time: "08:00", role: "Crucífero", status: "Cumplido" },
  { id: "hist-2", userUid: "monaguillo-uid", title: "Adoración Nocturna", location: "Capilla del Santísimo", date: "2026-05-28", time: "20:00", role: "Turanio", status: "Cumplido" },
  { id: "hist-3", userUid: "monaguillo-uid", title: "Misa de Confirmación", location: "Catedral Metropolitana", date: "2026-05-24", time: "11:00", role: "Báculo", status: "Cumplido" },
  { id: "hist-4", userUid: "monaguillo-uid", title: "Misa Semanal", location: "Parroquia Principal", date: "2026-05-19", time: "18:00", role: "Ceroferario", status: "Faltó (Exc.)" }
];

// Initialize Storage Helpers
const getStorageItem = (key, defaultValue) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

const setStorageItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Initialize simulated database from localStorage
const initSimulatedDb = () => {
  if (!localStorage.getItem("joselito_db_initialized")) {
    setStorageItem("joselito_users", DEFAULT_USERS);
    setStorageItem("joselito_masses", DEFAULT_MASSES);
    setStorageItem("joselito_registrations", DEFAULT_REGISTRATIONS);
    setStorageItem("joselito_notifications", DEFAULT_NOTIFICATIONS);
    setStorageItem("joselito_history", DEFAULT_HISTORY);
    setStorageItem("joselito_email_logs", []);
    localStorage.setItem("joselito_db_initialized", "true");
  }
};
initSimulatedDb();

const getSimulatedTime = () => {
  return new Date();
};

const syncRecurringAssignments = async (userUid) => {
  let addedCount = 0;
  let removedCount = 0;
  try {
    let user = null;
    let masses = [];
    let regs = [];
    
    const isReal = isRealFirebaseEnabled() && realDb;

    if (isReal) {
      try {
        const userSnap = await getDoc(doc(realDb, "users", userUid));
        if (!userSnap.exists()) return { addedCount: 0, removedCount: 0, error: "User doc not found in Firestore" };
        user = { uid: userUid, ...userSnap.data() };

        const massesSnap = await getDocs(collection(realDb, "masses"));
        masses = massesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const now = getSimulatedTime();
        const todayStr = getLocalDateString(now);
        const qRegs = query(
          collection(realDb, "registrations"),
          where("userUid", "==", userUid)
        );
        const regsSnap = await getDocs(qRegs);
        regs = regsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.date >= todayStr);
      } catch (e) {
        console.error("Error fetching data for syncRecurringAssignments:", e);
        return { addedCount: 0, removedCount: 0, error: e.message };
      }
    } else {
      const users = getStorageItem("joselito_users", {});
      user = users[userUid];
      if (!user) return { addedCount: 0, removedCount: 0, error: "User local profile not found" };
      masses = getStorageItem("joselito_masses", []);
      regs = getStorageItem("joselito_registrations", []);
    }

    // Case-insensitive role comparison
    if (user.role?.toLowerCase() !== "monaguillo") return { addedCount: 0, removedCount: 0, error: "User is not a monaguillo" };

    const now = getSimulatedTime();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let userChanged = false;

    // Monthly reset check: if current simulated month is different from last recurrence check month
    if (user.lastRecurrenceCheckMonth !== currentMonthStr) {
      user.activeRecurrence = false;
      user.lastRecurrenceCheckMonth = currentMonthStr;
      userChanged = true;
    }

    const todayStr = getLocalDateString(now);

    if (user.activeRecurrence) {
      // Auto-register for future occurrences of recurringMasses
      const recurringMassIds = user.recurringMasses || [];
      
      // Generate dates for the next 45 days
      for (let i = 0; i < 45; i++) {
        const tempDate = new Date(now);
        tempDate.setDate(now.getDate() + i);
        const dateStr = getLocalDateString(tempDate);
        const dayOfWeek = tempDate.getDay();

        for (const massId of recurringMassIds) {
          const mass = masses.find(m => m.id === massId);
          // Loose type check for dayOfWeek
          if (mass && mass.isRecurring && Number(mass.dayOfWeek) === Number(dayOfWeek)) {
            // Check if registration exists for THIS specific user (active or cancelled)
            const existing = regs.find(r => r.massId === massId && r.userUid === userUid && r.date === dateStr);
            if (!existing) {
              const newReg = {
                massId,
                date: dateStr,
                userUid,
                userName: `${user.name} ${user.lastName}`,
                userEmail: user.email,
                userRole: "Monaguillo",
                userPhotoURL: user.photoURL || "",
                status: "pending",
                massTitle: mass.title,
                massTime: mass.time,
                massLocation: "Templo Parroquial"
              };

              if (isReal) {
                await addDoc(collection(realDb, "registrations"), newReg);
                addedCount++;
              } else {
                regs.push({ id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, ...newReg });
                addedCount++;
              }
            }
          }
        }
      }
    } else {
      // If activeRecurrence is false, clean up all future pending registrations that are for recurring masses
      for (const r of regs) {
        if (r.userUid === userUid && r.date >= todayStr && r.status === "pending") {
          const mass = masses.find(m => m.id === r.massId);
          if (mass && mass.isRecurring) {
            if (isReal) {
              await deleteDoc(doc(realDb, "registrations", r.id));
              removedCount++;
            }
          }
        }
      }
      if (!isReal) {
        const lengthBefore = regs.length;
        regs = regs.filter(r => {
          if (r.userUid !== userUid) return true;
          if (r.date < todayStr) return true;
          if (r.status !== "pending") return true;
          const mass = masses.find(m => m.id === r.massId);
          if (mass && mass.isRecurring) return false;
          return true;
        });
        removedCount += (lengthBefore - regs.length);
      }
    }

    // Also if any recurring mass was unchecked, remove its future registrations
    if (user.activeRecurrence) {
      const recurringMassIds = user.recurringMasses || [];
      for (const r of regs) {
        if (r.userUid === userUid && r.date >= todayStr && r.status === "pending") {
          const mass = masses.find(m => m.id === r.massId);
          if (mass && mass.isRecurring && !recurringMassIds.includes(r.massId)) {
            if (isReal) {
              await deleteDoc(doc(realDb, "registrations", r.id));
              removedCount++;
            }
          }
        }
      }
      if (!isReal) {
        const lengthBefore = regs.length;
        regs = regs.filter(r => {
          if (r.userUid !== userUid) return true;
          if (r.date < todayStr) return true;
          if (r.status !== "pending") return true;
          const mass = masses.find(m => m.id === r.massId);
          if (mass && mass.isRecurring && !recurringMassIds.includes(r.massId)) return false;
          return true;
        });
        removedCount += (lengthBefore - regs.length);
      }
    }

    if (!isReal) {
      setStorageItem("joselito_registrations", regs);
    }

    if (userChanged) {
      if (isReal) {
        await updateDoc(doc(realDb, "users", userUid), {
          activeRecurrence: user.activeRecurrence,
          lastRecurrenceCheckMonth: user.lastRecurrenceCheckMonth
        });
      } else {
        const users = getStorageItem("joselito_users", {});
        users[userUid] = user;
        setStorageItem("joselito_users", users);
        const curr = getStorageItem("joselito_current_user", null);
        if (curr && curr.uid === userUid) {
          setStorageItem("joselito_current_user", { ...curr, ...user });
        }
      }
    }
    return { addedCount, removedCount };
  } catch (err) {
    console.error("Error in syncRecurringAssignments:", err);
    return { addedCount, removedCount, error: err.message };
  }
};

const setSimulatedTime = (dateString) => {
  // Simulación desactivada en modo producción simplificado
};

// Simulated Email Notification Logger
const logSimulatedEmail = (to, subject, bodyHtml) => {
  const logs = getStorageItem("joselito_email_logs", []);
  const newLog = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: getSimulatedTime().toISOString(),
    to,
    subject,
    bodyHtml
  };
  setStorageItem("joselito_email_logs", [newLog, ...logs]);
  window.dispatchEvent(new CustomEvent("simulated-email-sent", { detail: newLog }));
};

// ==========================================
// SIMULATED AUTH API
// ==========================================
let authStateListener = null;
let currentSimulatedUser = getStorageItem("joselito_current_user", null);

const simulatedAuth = {
  login: async (email, password) => {
    const users = getStorageItem("joselito_users", {});
    const user = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) throw new Error("Usuario no encontrado.");
    // In simulation mode, any password works, but let's check
    if (password.length < 4) throw new Error("Contraseña incorrecta (min. 4 caracteres).");
    
    currentSimulatedUser = user;
    setStorageItem("joselito_current_user", user);
    if (authStateListener) authStateListener(user);
    return user;
  },
  
  register: async (email, password, name, lastName, role, childEmails = []) => {
    const users = getStorageItem("joselito_users", {});
    const emailExists = Object.values(users).some(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      // Prevent duplicates, check if it was pre-created by a parent
      const existingUser = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser && existingUser.isPendingSignUp) {
        // Child is registering their pre-created account: upgrade it!
        existingUser.name = name;
        existingUser.lastName = lastName;
        existingUser.isPendingSignUp = false;
        existingUser.role = "monaguillo";
        // Update user
        users[existingUser.uid] = existingUser;
        setStorageItem("joselito_users", users);
        
        currentSimulatedUser = existingUser;
        setStorageItem("joselito_current_user", existingUser);
        if (authStateListener) authStateListener(existingUser);
        return existingUser;
      }
      throw new Error("El correo ya está registrado.");
    }
    
    const uid = `uid-${Date.now()}`;
    const newUser = {
      uid,
      email,
      name,
      lastName,
      role, // 'monaguillo' or 'padre'
      level: role === "monaguillo" ? 1 : null,
      servedCount: role === "monaguillo" ? 0 : null,
      punctuality: role === "monaguillo" ? 100 : null,
      childEmails: role === "padre" ? childEmails : []
    };
    
    users[uid] = newUser;
    
    // Account linking: Check if this new monaguillo email was already added by a parent
    if (role === "monaguillo") {
      Object.values(users).forEach(u => {
        if (u.role === "padre" && u.childEmails && u.childEmails.includes(email)) {
          // Link history and set parent reference
          newUser.linkedParentUid = u.uid;
        }
      });
    }
    
    // If user is a parent, register their children as pending profiles if they don't exist
    if (role === "padre" && childEmails.length > 0) {
      childEmails.forEach(cEmail => {
        const childExists = Object.values(users).find(u => u.email.toLowerCase() === cEmail.toLowerCase());
        if (!childExists) {
          const childUid = `child-uid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          users[childUid] = {
            uid: childUid,
            email: cEmail,
            name: "Pendiente",
            lastName: "Registro",
            role: "monaguillo",
            level: 1,
            servedCount: 0,
            punctuality: 100,
            isPendingSignUp: true,
            linkedParentUid: uid
          };
        } else {
          childExists.linkedParentUid = uid;
          users[childExists.uid] = childExists;
        }
      });
    }
    
    setStorageItem("joselito_users", users);
    
    currentSimulatedUser = newUser;
    setStorageItem("joselito_current_user", newUser);
    if (authStateListener) authStateListener(newUser);
    return newUser;
  },
  
  logout: async () => {
    currentSimulatedUser = null;
    localStorage.removeItem("joselito_current_user");
    if (authStateListener) authStateListener(null);
  },
  
  onAuthStateChanged: (callback) => {
    authStateListener = callback;
    // Immediately emit current state
    callback(currentSimulatedUser);
    return () => { authStateListener = null; };
  },
  
  signInWithGoogle: async () => {
    // Simulate google sign-in by logging in default monaguillo or creating one
    const users = getStorageItem("joselito_users", {});
    let googleUser = Object.values(users).find(u => u.email === "monaguillo@joselito.com");
    
    if (!googleUser) {
      googleUser = {
        uid: "monaguillo-uid",
        email: "monaguillo@joselito.com",
        name: "Josué",
        lastName: "Sánchez",
        role: "monaguillo",
        level: 4,
        servedCount: 42,
        punctuality: 98,
        activeRecurrence: true,
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"
      };
      users["monaguillo-uid"] = googleUser;
      setStorageItem("joselito_users", users);
    }
    
    currentSimulatedUser = googleUser;
    setStorageItem("joselito_current_user", googleUser);
    if (authStateListener) authStateListener(googleUser);
    return googleUser;
  }
};

// ==========================================
// SIMULATED FIRESTORE API
// ==========================================
const simulatedDb = {
  getMassesForDay: async (dayOfWeek, dateStr) => {
    const masses = getStorageItem("joselito_masses", []);
    const regs = getStorageItem("joselito_registrations", []);
    
    // Filter masses:
    // 1) if it has a specificDate, it must match dateStr.
    // 2) otherwise, it matches the day of the week.
    const filteredMasses = masses.filter(m => {
      if (m.specificDate) {
        return m.specificDate === dateStr;
      }
      return m.dayOfWeek === dayOfWeek;
    });
    
    // Attach current registrations to each mass for this date
    return filteredMasses.map(mass => {
      const massRegs = regs.filter(r => r.massId === mass.id && r.date === dateStr && r.status !== "cancelled");
      return {
        ...mass,
        registrations: massRegs
      };
    });
  },
  
  registerForMass: async (massId, user, role, dateStr) => {
    const regs = getStorageItem("joselito_registrations", []);
    
    // Prevent duplicate registration on the same date (reusing cancelled ones)
    const targetDateStr = dateStr || getLocalDateString(getSimulatedTime());
    const existingIndex = regs.findIndex(r => r.massId === massId && r.userUid === user.uid && r.date === targetDateStr);
    if (existingIndex !== -1) {
      if (regs[existingIndex].status === "cancelled") {
        regs[existingIndex].status = "pending";
        setStorageItem("joselito_registrations", regs);
        return regs[existingIndex];
      } else {
        throw new Error("Ya estás registrado para esta misa.");
      }
    }
    
    // Find mass details to denormalize
    const masses = getStorageItem("joselito_masses", []);
    const massData = masses.find(m => m.id === massId);

    const newReg = {
      id: `reg-${Date.now()}`,
      massId,
      date: targetDateStr,
      userUid: user.uid,
      userName: `${user.name} ${user.lastName}`,
      userEmail: user.email,
      userRole: "Monaguillo",
      userPhotoURL: user.photoURL || "",
      status: "pending",
      massTitle: massData?.title || "Misa",
      massTime: massData?.time || "",
      massLocation: "Templo Parroquial"
    };
    
    regs.push(newReg);
    setStorageItem("joselito_registrations", regs);
    
    // Log simulation email
    logSimulatedEmail(
      user.email,
      "Confirmación de Asistencia a Misa",
      `<p>Hola <strong>${user.name}</strong>, te has anotado como <strong>${role}</strong> para la misa en el calendario del día <strong>${dateStr}</strong>.</p>`
    );
    
    return newReg;
  },
  
  cancelMassRegistration: async (massId, userUid, dateStr) => {
    let regs = getStorageItem("joselito_registrations", []);
    const regToCancel = regs.find(r => r.massId === massId && r.userUid === userUid && r.date === dateStr);
    
    if (!regToCancel) throw new Error("Registro no encontrado.");
    
    regToCancel.status = "cancelled";
    setStorageItem("joselito_registrations", regs);
    
    // Get user info and parent info
    const users = getStorageItem("joselito_users", {});
    const user = users[userUid];
    
    if (user) {
      // If monaguillo has linked parent, send notification and email
      if (user.linkedParentUid) {
        const parent = users[user.linkedParentUid];
        if (parent) {
          // Add in-app notification to parent
          const notifs = getStorageItem("joselito_notifications", []);
          notifs.push({
            id: `notif-${Date.now()}`,
            recipientUid: parent.uid,
            type: "error",
            title: "Cancelación de Turno",
            content: `${user.name} ha cancelado su asistencia para la misa del día ${dateStr}.`,
            date: getSimulatedTime().toISOString(),
            read: false
          });
          setStorageItem("joselito_notifications", notifs);
          
          // Send simulated email
          logSimulatedEmail(
            parent.email,
            "Cancelación de Servicio - Monaguillos",
            `<p>Estimado/a ${parent.name}, le notificamos que su hijo/a <strong>${user.name} ${user.lastName}</strong> ha cancelado su turno de servicio programado para la misa del <strong>${dateStr}</strong>.</p>`
          );
        }
      }
    }
  },
  
  checkInForMass: async (massId, userUid, dateStr) => {
    const regs = getStorageItem("joselito_registrations", []);
    const reg = regs.find(r => r.massId === massId && r.userUid === userUid && r.date === dateStr);
    
    if (!reg) throw new Error("No estás registrado en esta misa.");
    
    reg.status = "checked-in";
    setStorageItem("joselito_registrations", regs);
    
    // Create check-in log
    return reg;
  },
  
  confirmRecurrence: async (userUid, confirmStatus, recurringMasses = []) => {
    const users = getStorageItem("joselito_users", {});
    if (users[userUid]) {
      users[userUid].activeRecurrence = confirmStatus;
      users[userUid].recurringMasses = recurringMasses;
      setStorageItem("joselito_users", users);
      
      // Update global context user
      if (currentSimulatedUser && currentSimulatedUser.uid === userUid) {
        currentSimulatedUser.activeRecurrence = confirmStatus;
        currentSimulatedUser.recurringMasses = recurringMasses;
        setStorageItem("joselito_current_user", currentSimulatedUser);
      }
      syncRecurringAssignments(userUid);
    }
  },
  
  createMass: async (massData) => {
    const masses = getStorageItem("joselito_masses", []);
    const newMass = {
      id: `mass-${Date.now()}`,
      ...massData
    };
    masses.push(newMass);
    setStorageItem("joselito_masses", masses);
    return newMass;
  },

  updateMass: async (massId, massData) => {
    const masses = getStorageItem("joselito_masses", []);
    const idx = masses.findIndex(m => m.id === massId);
    if (idx !== -1) {
      masses[idx] = { ...masses[idx], ...massData };
      setStorageItem("joselito_masses", masses);
      return masses[idx];
    }
  },
  
  deleteMass: async (massId) => {
    let masses = getStorageItem("joselito_masses", []);
    masses = masses.filter(m => m.id !== massId);
    setStorageItem("joselito_masses", masses);
    
    // Also remove registrations associated
    let regs = getStorageItem("joselito_registrations", []);
    regs = regs.filter(r => r.massId !== massId);
    setStorageItem("joselito_registrations", regs);
  },
  
  getMassAttendance: async (massId, dateStr) => {
    const regs = getStorageItem("joselito_registrations", []);
    return regs.filter(r => r.massId === massId && r.date === dateStr && r.status !== "cancelled");
  },
  
  getNotifications: async (userUid) => {
    const notifs = getStorageItem("joselito_notifications", []);
    // Return notifications for user, sorted by date desc
    return notifs
      .filter(n => n.recipientUid === userUid)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  
  markNotificationsAsRead: async (userUid) => {
    const notifs = getStorageItem("joselito_notifications", []);
    notifs.forEach(n => {
      if (n.recipientUid === userUid) n.read = true;
    });
    setStorageItem("joselito_notifications", notifs);
  },
  
  getHistory: async (userUid) => {
    const hist = getStorageItem("joselito_history", []);
    return hist.filter(h => h.userUid === userUid);
  },
  
  getUserProfile: async (uid) => {
    syncRecurringAssignments(uid);
    const users = getStorageItem("joselito_users", {});
    return users[uid] || null;
  },
  
  getChildrenForParent: async (parentUid) => {
    const users = getStorageItem("joselito_users", {});
    const parent = users[parentUid];
    if (!parent || !parent.childEmails) return [];
    
    return Object.values(users).filter(u => 
      u.role === "monaguillo" && parent.childEmails.includes(u.email)
    );
  },
  
  createUserProfile: async (uid, email, name, lastName, role, childEmails = []) => {
    const users = getStorageItem("joselito_users", {});
    
    // If it's a pending child account registration, merge info
    const existingChildKey = Object.keys(users).find(
      k => users[k].email.toLowerCase() === email.toLowerCase()
    );

    let finalProfile = { uid, email, name, lastName, role };

    if (existingChildKey && users[existingChildKey].isPendingSignUp) {
      finalProfile = {
        ...users[existingChildKey],
        uid, // adopt new login uid
        name: name !== "Google" ? name : "Nuevo",
        lastName: lastName !== "User" ? lastName : "Monaguillo",
        isPendingSignUp: false
      };
      delete users[existingChildKey]; // remove pending key
    } else {
      finalProfile.role = role;
      finalProfile.name = name !== "Google" ? name : (role === "monaguillo" ? "Nuevo" : "Padre");
      finalProfile.lastName = lastName !== "User" ? lastName : (role === "monaguillo" ? "Monaguillo" : "Tutor");
      
      if (role === "monaguillo") {
        finalProfile.level = 1;
        finalProfile.servedCount = 0;
        finalProfile.punctuality = 100;
        
        // Check for parents linking this email
        Object.values(users).forEach(u => {
          if (u.role === "padre" && u.childEmails && u.childEmails.includes(email)) {
            finalProfile.linkedParentUid = u.uid;
          }
        });
      } else {
        finalProfile.childEmails = childEmails;
        
        // Add children as pending or link them if active
        childEmails.forEach(cEmail => {
          const childUser = Object.values(users).find(u => u.email.toLowerCase() === cEmail.toLowerCase());
          if (!childUser) {
            const childUid = `child-uid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            users[childUid] = {
              uid: childUid,
              email: cEmail,
              name: "Pendiente",
              lastName: "Registro",
              role: "monaguillo",
              level: 1,
              servedCount: 0,
              punctuality: 100,
              isPendingSignUp: true,
              linkedParentUid: uid
            };
          } else {
            childUser.linkedParentUid = uid;
            users[childUser.uid] = childUser;
          }
        });
      }
    }
    
    users[finalProfile.uid] = finalProfile;
    setStorageItem("joselito_users", users);
    setStorageItem("joselito_current_user", finalProfile);
    return finalProfile;
  }
};

// ==========================================
// EXPORT API SELECTOR (REAL VS SIMULATION)
// ==========================================

// ==========================================
// EXPORT API SELECTOR (REAL VS SIMULATION)
// ==========================================

const handleFirestoreError = (e) => {
  console.error("Firestore operation failed:", e);
  if (e.code === "permission-denied" || (e.message && e.message.includes("permission"))) {
    throw new Error(
      "Permisos insuficientes en Firebase: Asegúrate de configurar las reglas de seguridad de Firestore Database en tu consola de Firebase -> Firestore -> Reglas a: 'allow read, write: if request.auth != null;'"
    );
  }
  throw e;
};

export const auth = {
  login: async (email, password) => {
    if (isRealFirebaseEnabled() && realAuth) {
      try {
        const res = await signInWithEmailAndPassword(realAuth, email, password);
        const userDoc = await getDoc(doc(realDb, "users", res.user.uid));
        return { uid: res.user.uid, email: res.user.email, ...userDoc.data() };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedAuth.login(email, password);
  },
  
  register: async (email, password, name, lastName, role, childEmails = []) => {
    if (isRealFirebaseEnabled() && realAuth && realDb) {
      try {
        const res = await createUserWithEmailAndPassword(realAuth, email, password);
        const userProfile = {
          uid: res.user.uid,
          email,
          name,
          lastName,
          role,
          level: role === "monaguillo" ? 1 : null,
          servedCount: role === "monaguillo" ? 0 : null,
          punctuality: role === "monaguillo" ? 100 : null,
          childEmails: role === "padre" ? childEmails : []
        };
        await setDoc(doc(realDb, "users", res.user.uid), userProfile);
        
        if (role === "padre" && childEmails.length > 0) {
          for (const cEmail of childEmails) {
            const q = query(collection(realDb, "users"), where("email", "==", cEmail));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
              const childUid = `child-uid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              await setDoc(doc(realDb, "users", childUid), {
                uid: childUid,
                email: cEmail,
                name: "Pendiente",
                lastName: "Registro",
                role: "monaguillo",
                level: 1,
                servedCount: 0,
                punctuality: 100,
                isPendingSignUp: true,
                linkedParentUid: res.user.uid
              });
            } else {
              const childDoc = querySnapshot.docs[0];
              await updateDoc(doc(realDb, "users", childDoc.id), {
                linkedParentUid: res.user.uid
              });
            }
          }
        }
        return userProfile;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedAuth.register(email, password, name, lastName, role, childEmails);
  },
  
  logout: async () => {
    if (isRealFirebaseEnabled() && realAuth) {
      try {
        await signOut(realAuth);
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedAuth.logout();
  },
  
  onAuthStateChanged: (callback) => {
    if (isRealFirebaseEnabled() && realAuth && realDb) {
      return onAuthStateChanged(realAuth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(realDb, "users", firebaseUser.uid));
            callback({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              photoURL: firebaseUser.photoURL || "",
              ...userDoc.data() 
            });
          } catch (e) {
            console.error("Error fetching user profile in auth state change:", e);
            callback({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              name: firebaseUser.displayName || "Usuario",
              photoURL: firebaseUser.photoURL || "",
              lastName: "",
              role: "monaguillo",
              error: "Error de permisos en Firestore. Asegúrate de configurar las reglas en tu consola de Firebase."
            });
          }
        } else {
          callback(null);
        }
      });
    }
    return simulatedAuth.onAuthStateChanged(callback);
  },
  
  signInWithGoogle: async () => {
    if (isRealFirebaseEnabled() && realAuth && realDb) {
      try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(realAuth, provider);
        const userDoc = await getDoc(doc(realDb, "users", res.user.uid));
        if (!userDoc.exists()) {
          const userProfile = {
            uid: res.user.uid,
            email: res.user.email,
            name: res.user.displayName?.split(" ")[0] || "Google User",
            lastName: res.user.displayName?.split(" ").slice(1).join(" ") || "",
            photoURL: res.user.photoURL || "",
            role: "monaguillo",
            level: 1,
            servedCount: 0,
            punctuality: 100
          };
          await setDoc(doc(realDb, "users", res.user.uid), userProfile);
          return userProfile;
        }
        const existingData = userDoc.data();
        if (!existingData.photoURL && res.user.photoURL) {
          await updateDoc(doc(realDb, "users", res.user.uid), { photoURL: res.user.photoURL });
          existingData.photoURL = res.user.photoURL;
        }
        return { uid: res.user.uid, email: res.user.email, photoURL: res.user.photoURL || existingData.photoURL || "", ...existingData };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedAuth.signInWithGoogle();
  }
};

export const db = {
  getMassesForDay: async (dayOfWeek, dateStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const qRecurring = query(
          collection(realDb, "masses"), 
          where("dayOfWeek", "==", dayOfWeek)
        );
        const qSpecific = query(
          collection(realDb, "masses"), 
          where("specificDate", "==", dateStr)
        );
        
        const [recSnap, specSnap] = await Promise.all([
          getDocs(qRecurring),
          getDocs(qSpecific)
        ]);
        
        const recMasses = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const specMasses = specSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const merged = [...recMasses, ...specMasses];
        const uniqueMap = new Map();
        merged.forEach(m => {
          if (m.specificDate && m.specificDate !== dateStr) {
            return;
          }
          uniqueMap.set(m.id, m);
        });
        const masses = Array.from(uniqueMap.values());
        
        const qRegs = query(collection(realDb, "registrations"), where("date", "==", dateStr));
        const regSnap = await getDocs(qRegs);
        const regs = regSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        return masses.map(mass => ({
          ...mass,
          registrations: regs.filter(r => r.massId === mass.id && r.status !== "cancelled")
        }));
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.getMassesForDay(dayOfWeek, dateStr);
  },
  
  registerForMass: async (massId, user, role, dateStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const targetDateStr = dateStr || getLocalDateString(getSimulatedTime());
        
        // Check if mass has started
        const massSnap = await getDoc(doc(realDb, "masses", massId));
        const massData = massSnap.exists() ? massSnap.data() : null;
        if (!massData) throw new Error("Misa no encontrada.");

        const [year, month, day] = targetDateStr.split("-").map(Number);
        const [hour, minute] = massData.time.split(":").map(Number);
        const massStart = new Date(year, month - 1, day, hour, minute);
        if (new Date() > massStart) {
          throw new Error("Esta celebración ya inició o ha finalizado. No es posible inscribirse.");
        }

        const q = query(
          collection(realDb, "registrations"), 
          where("massId", "==", massId),
          where("userUid", "==", user.uid),
          where("date", "==", targetDateStr)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const regDoc = snap.docs[0];
          if (regDoc.data().status === "cancelled") {
            await updateDoc(doc(realDb, "registrations", regDoc.id), { status: "pending" });
            return { id: regDoc.id, ...regDoc.data(), status: "pending" };
          } else {
            throw new Error("Ya estás registrado para esta misa.");
          }
        }

        const newReg = {
          massId,
          date: targetDateStr,
          userUid: user.uid,
          userName: `${user.name} ${user.lastName}`,
          userEmail: user.email,
          userRole: "Monaguillo",
          userPhotoURL: user.photoURL || "",
          status: "pending",
          massTitle: massData?.title || "Misa",
          massTime: massData?.time || "",
          massLocation: "Templo Parroquial"
        };
        
        const docRef = await addDoc(collection(realDb, "registrations"), newReg);
        
        await addDoc(collection(realDb, "mail"), {
          to: user.email,
          timestamp: new Date().toISOString(),
          message: {
            subject: "Confirmación de Asistencia a Misa",
            html: `<p>Hola <strong>${user.name}</strong>, te has anotado para la misa el día <strong>${targetDateStr}</strong>.</p>`
          }
        });
        
        return { id: docRef.id, ...newReg };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.registerForMass(massId, user, role, dateStr);
  },
  
  cancelMassRegistration: async (massId, userUid, dateStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(
          collection(realDb, "registrations"), 
          where("massId", "==", massId),
          where("userUid", "==", userUid),
          where("date", "==", dateStr)
        );
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Registro no encontrado.");

        // Check if mass has started
        const massSnap = await getDoc(doc(realDb, "masses", massId));
        if (massSnap.exists()) {
          const massData = massSnap.data();
          const [year, month, day] = dateStr.split("-").map(Number);
          const [hour, minute] = massData.time.split(":").map(Number);
          const massStart = new Date(year, month - 1, day, hour, minute);
          if (new Date() > massStart) {
            throw new Error("Esta celebración ya inició o ha finalizado. No es posible cancelar la asistencia.");
          }
        }
        
        const regDoc = snap.docs[0];
        await updateDoc(doc(realDb, "registrations", regDoc.id), { status: "cancelled" });
        
        const userSnap = await getDoc(doc(realDb, "users", userUid));
        if (userSnap.exists()) {
          const user = userSnap.data();
          if (user.linkedParentUid) {
            const parentSnap = await getDoc(doc(realDb, "users", user.linkedParentUid));
            if (parentSnap.exists()) {
              const parent = parentSnap.data();
              
              await addDoc(collection(realDb, "notifications"), {
                recipientUid: parent.uid,
                type: "error",
                title: "Cancelación de Turno",
                content: `${user.name} ha cancelado su asistencia para la misa del día ${dateStr}.`,
                date: getSimulatedTime().toISOString(),
                read: false
              });
              
              await addDoc(collection(realDb, "mail"), {
                to: parent.email,
                timestamp: new Date().toISOString(),
                message: {
                  subject: "Cancelación de Servicio - Monaguillos",
                  html: `<p>Estimado/a ${parent.name}, le notificamos que su hijo/a <strong>${user.name} ${user.lastName}</strong> ha cancelado su turno de servicio programado para la misa del <strong>${dateStr}</strong>.</p>`
                }
              });
            }
          }
        }
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.cancelMassRegistration(massId, userUid, dateStr);
  },
  
  checkInForMass: async (massId, userUid, dateStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(
          collection(realDb, "registrations"), 
          where("massId", "==", massId),
          where("userUid", "==", userUid),
          where("date", "==", dateStr)
        );
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("No estás registrado en esta misa.");
        
        const regDoc = snap.docs[0];
        await updateDoc(doc(realDb, "registrations", regDoc.id), {
          status: "checked-in"
        });
        return { id: regDoc.id, ...regDoc.data(), status: "checked-in" };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.checkInForMass(massId, userUid, dateStr);
  },
  
  confirmRecurrence: async (userUid, confirmStatus, recurringMasses = []) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await updateDoc(doc(realDb, "users", userUid), {
          activeRecurrence: confirmStatus,
          recurringMasses: recurringMasses
        });
        await syncRecurringAssignments(userUid);
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.confirmRecurrence(userUid, confirmStatus, recurringMasses);
  },
  
  requestShiftSwap: async (userUid, userName) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const querySnapshot = await getDocs(collection(realDb, "users"));
        const otherMonaguillos = querySnapshot.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.role?.toLowerCase() === "monaguillo" && u.uid !== userUid);

        for (const monaguillo of otherMonaguillos) {
          await addDoc(collection(realDb, "notifications"), {
            recipientUid: monaguillo.uid,
            type: "info",
            title: "Solicitud de Cambio de Turno",
            content: `${userName} ha solicitado un cambio de turno. Por favor, revisa el calendario.`,
            date: new Date().toISOString(),
            read: false
          });
        }
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    } else {
      const users = getStorageItem("joselito_users", {});
      const otherMonaguillos = Object.values(users)
        .filter(u => u.role?.toLowerCase() === "monaguillo" && u.uid !== userUid);
      
      const notifs = getStorageItem("joselito_notifications", []);
      for (const monaguillo of otherMonaguillos) {
        notifs.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          recipientUid: monaguillo.uid,
          type: "info",
          title: "Solicitud de Cambio de Turno",
          content: `${userName} ha solicitado un cambio de turno. Por favor, revisa el calendario.`,
          date: new Date().toISOString(),
          read: false
        });
      }
      setStorageItem("joselito_notifications", notifs);
      window.dispatchEvent(new Event("notifications-updated"));
    }
  },
  
  requestRegistrationSwap: async (regId, userUid, userName, massTitle, dateStr, timeStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await updateDoc(doc(realDb, "registrations", regId), {
          status: "swap_requested"
        });

        const regSnap = await getDoc(doc(realDb, "registrations", regId));
        const regData = regSnap.exists() ? regSnap.data() : {};
        const massId = regData.massId || "";

        // Notify other monaguillos
        const querySnapshot = await getDocs(collection(realDb, "users"));
        const otherMonaguillos = querySnapshot.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.role?.toLowerCase() === "monaguillo" && u.uid !== userUid);

        for (const monaguillo of otherMonaguillos) {
          await addDoc(collection(realDb, "notifications"), {
            recipientUid: monaguillo.uid,
            type: "warning",
            title: "Cambio de Turno Disponible",
            content: `${userName} solicita cambio para la Misa: ${massTitle} el ${dateStr} a las ${timeStr}.`,
            date: new Date().toISOString(),
            read: false,
            massId,
            targetDate: dateStr
          });
        }
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    } else {
      const regs = getStorageItem("joselito_registrations", []);
      const reg = regs.find(r => r.id === regId);
      const massId = reg ? reg.massId : "";
      if (reg) {
        reg.status = "swap_requested";
        setStorageItem("joselito_registrations", regs);
      }

      // Notify other monaguillos
      const users = getStorageItem("joselito_users", {});
      const otherMonaguillos = Object.values(users)
        .filter(u => u.role?.toLowerCase() === "monaguillo" && u.uid !== userUid);
      
      const notifs = getStorageItem("joselito_notifications", []);
      for (const monaguillo of otherMonaguillos) {
        notifs.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          recipientUid: monaguillo.uid,
          type: "warning",
          title: "Cambio de Turno Disponible",
          content: `${userName} solicita cambio para la Misa: ${massTitle} el ${dateStr} a las ${timeStr}.`,
          date: new Date().toISOString(),
          read: false,
          massId,
          targetDate: dateStr
        });
      }
      setStorageItem("joselito_notifications", notifs);
      window.dispatchEvent(new Event("notifications-updated"));
    }
  },

  acceptRegistrationSwap: async (regId, userUid, userName, userEmail, userPhotoURL, originalUserUid, massTitle, dateStr, timeStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await updateDoc(doc(realDb, "registrations", regId), {
          userUid,
          userName,
          userEmail,
          userPhotoURL: userPhotoURL || "",
          status: "pending"
        });

        const regSnap = await getDoc(doc(realDb, "registrations", regId));
        const regData = regSnap.exists() ? regSnap.data() : {};
        const massId = regData.massId || "";

        // Notify the original monaguillo
        await addDoc(collection(realDb, "notifications"), {
          recipientUid: originalUserUid,
          type: "success",
          title: "Cambio Aceptado",
          content: `${userName} aceptó tu cambio de turno para la Misa: ${massTitle} el ${dateStr}.`,
          date: new Date().toISOString(),
          read: false,
          massId,
          targetDate: dateStr
        });
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    } else {
      const regs = getStorageItem("joselito_registrations", []);
      const reg = regs.find(r => r.id === regId);
      const massId = reg ? reg.massId : "";
      if (reg) {
        reg.userUid = userUid;
        reg.userName = userName;
        reg.userEmail = userEmail;
        reg.userPhotoURL = userPhotoURL || "";
        reg.status = "pending";
        setStorageItem("joselito_registrations", regs);
      }

      // Notify the original monaguillo
      const notifs = getStorageItem("joselito_notifications", []);
      notifs.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        recipientUid: originalUserUid,
        type: "success",
        title: "Cambio Aceptado",
        content: `${userName} aceptó tu cambio de turno para la Misa: ${massTitle} el ${dateStr}.`,
        date: new Date().toISOString(),
        read: false,
        massId,
        targetDate: dateStr
      });
      setStorageItem("joselito_notifications", notifs);
      window.dispatchEvent(new Event("notifications-updated"));
    }
  },
  
  createMass: async (massData) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const docRef = await addDoc(collection(realDb, "masses"), massData);
        return { id: docRef.id, ...massData };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.createMass(massData);
  },

  updateMass: async (massId, massData) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await updateDoc(doc(realDb, "masses", massId), massData);
        return { id: massId, ...massData };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.updateMass(massId, massData);
  },
  
  getAllMasses: async () => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const querySnapshot = await getDocs(collection(realDb, "masses"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return JSON.parse(localStorage.getItem("joselito_masses") || "[]");
  },

  updateRegistrationStatus: async (regId, status) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await updateDoc(doc(realDb, "registrations", regId), { status });
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    const regs = JSON.parse(localStorage.getItem("joselito_registrations") || "[]");
    const match = regs.find(r => r.id === regId);
    if (match) {
      match.status = status;
      localStorage.setItem("joselito_registrations", JSON.stringify(regs));
    }
  },

  deleteMass: async (massId) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await deleteDoc(doc(realDb, "masses", massId));
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.deleteMass(massId);
  },
  
  getMassAttendance: async (massId, dateStr) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(
          collection(realDb, "registrations"), 
          where("massId", "==", massId),
          where("date", "==", dateStr)
        );
        const snap = await getDocs(q);
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.status !== "cancelled");
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.getMassAttendance(massId, dateStr);
  },
  
  getNotifications: async (userUid) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(
          collection(realDb, "notifications"), 
          where("recipientUid", "==", userUid)
        );
        const snap = await getDocs(q);
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.getNotifications(userUid);
  },
  
  markNotificationsAsRead: async (userUid) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(
          collection(realDb, "notifications"), 
          where("recipientUid", "==", userUid),
          where("read", "==", false)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await updateDoc(doc(realDb, "notifications", d.id), { read: true });
        }
        return;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.markNotificationsAsRead(userUid);
  },
  
  getHistory: async (userUid) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(collection(realDb, "registrations"), where("userUid", "==", userUid));
        const snap = await getDocs(q);
        const now = new Date();
        const registrations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        return registrations.map(reg => {
          const [year, month, day] = reg.date.split("-").map(Number);
          const [hour, minute] = (reg.massTime || "00:00").split(":").map(Number);
          const massDate = new Date(year, month - 1, day, hour, minute);
          
          return {
            id: reg.id,
            title: reg.massTitle || "Misa",
            location: reg.massLocation || "Templo Parroquial",
            date: reg.date,
            time: reg.massTime || "",
            role: reg.userRole || "Monaguillo",
            status: reg.status === "attended" ? "Cumplido" : 
                    reg.status === "cancelled" ? "Cancelado" : 
                    reg.status === "checked-in" ? "Asistido (Check-in)" : "Faltó (No asistió)",
            massDate
          };
        })
        .filter(hist => hist.massDate < now)
        .sort((a, b) => b.massDate - a.massDate);
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.getHistory(userUid);
  },
  
  getUserProfile: async (uid) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        await syncRecurringAssignments(uid);
        const snap = await getDoc(doc(realDb, "users", uid));
        if (!snap.exists()) return null;
        const userData = snap.data();
        
        // Fetch all registrations to calculate stats dynamically
        const q = query(collection(realDb, "registrations"), where("userUid", "==", uid));
        const qSnap = await getDocs(q);
        const regs = qSnap.docs.map(d => d.data());
        
        const now = new Date();
        const pastRegs = regs.filter(reg => {
          const [year, month, day] = reg.date.split("-").map(Number);
          const [hour, minute] = (reg.massTime || "00:00").split(":").map(Number);
          const massDate = new Date(year, month - 1, day, hour, minute);
          return massDate < now;
        });
        
        const servedCount = pastRegs.filter(r => r.status === "attended").length;
        const totalExpected = pastRegs.filter(r => r.status !== "cancelled").length;
        const attendedOrCheckedIn = pastRegs.filter(r => r.status === "attended" || r.status === "checked-in").length;
        
        let punctuality = 100;
        if (totalExpected > 0) {
          const fancyPercent = (attendedOrCheckedIn / totalExpected) * 100;
          punctuality = Math.round(fancyPercent);
        }
        
        let level = 1;
        if (servedCount > 50) level = 5;
        else if (servedCount > 30) level = 4;
        else if (servedCount > 15) level = 3;
        else if (servedCount > 5) level = 2;
        
        return {
          uid,
          ...userData,
          servedCount,
          punctuality,
          level
        };
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.getUserProfile(uid);
  },
  
  getChildrenForParent: async (parentUid) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const snap = await getDoc(doc(realDb, "users", parentUid));
        if (!snap.exists()) return [];
        const parent = snap.data();
        if (!parent.childEmails || parent.childEmails.length === 0) return [];
        
        const q = query(collection(realDb, "users"), where("email", "in", parent.childEmails));
        const childSnap = await getDocs(q);
        return childSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.getChildrenForParent(parentUid);
  },
  
  createUserProfile: async (uid, email, name, lastName, role, childEmails = []) => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        let linkedParentUid = null;
        const qParent = query(
          collection(realDb, "users"), 
          where("role", "==", "padre"), 
          where("childEmails", "array-contains", email)
        );
        const parentSnap = await getDocs(qParent);
        if (!parentSnap.empty) {
          linkedParentUid = parentSnap.docs[0].id;
        }

        const userProfile = {
          uid,
          email,
          name,
          lastName,
          role,
          level: role === "monaguillo" ? 1 : null,
          servedCount: role === "monaguillo" ? 0 : null,
          punctuality: role === "monaguillo" ? 100 : null,
          childEmails: role === "padre" ? childEmails : [],
          linkedParentUid
        };
        
        await setDoc(doc(realDb, "users", uid), userProfile);

        if (role === "padre" && childEmails.length > 0) {
          for (const cEmail of childEmails) {
            const q = query(collection(realDb, "users"), where("email", "==", cEmail));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
              const childUid = `child-uid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              await setDoc(doc(realDb, "users", childUid), {
                uid: childUid,
                email: cEmail,
                name: "Pendiente",
                lastName: "Registro",
                role: "monaguillo",
                level: 1,
                servedCount: 0,
                punctuality: 100,
                isPendingSignUp: true,
                linkedParentUid: uid
              });
            } else {
              const childDoc = querySnapshot.docs[0];
              await updateDoc(doc(realDb, "users", childDoc.id), {
                linkedParentUid: uid
              });
            }
          }
        }
        return userProfile;
      } catch (e) {
        return handleFirestoreError(e);
      }
    }
    return simulatedDb.createUserProfile(uid, email, name, lastName, role, childEmails);
  },

  getEmailLogs: async () => {
    if (isRealFirebaseEnabled() && realDb) {
      try {
        const q = query(collection(realDb, "mail"), orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            to: data.to,
            subject: data.message?.subject || "",
            bodyHtml: data.message?.html || "",
            timestamp: data.timestamp || new Date().toISOString()
          };
        });
      } catch (e) {
        console.error("Error fetching email logs:", e);
        return [];
      }
    }
    return [];
  }
};

// ==========================================
// DEV UTILITY EXPORTS
// ==========================================
export const dev = {
  getSimulatedTime,
  setSimulatedTime,
  
  getEmailLogs: () => {
    return getStorageItem("joselito_email_logs", []);
  },
  
  clearEmailLogs: () => {
    setStorageItem("joselito_email_logs", []);
    window.dispatchEvent(new Event("simulated-emails-cleared"));
  },
  
  resetDatabase: () => {
    localStorage.removeItem("joselito_db_initialized");
    localStorage.removeItem("joselito_users");
    localStorage.removeItem("joselito_masses");
    localStorage.removeItem("joselito_registrations");
    localStorage.removeItem("joselito_notifications");
    localStorage.removeItem("joselito_history");
    localStorage.removeItem("joselito_current_user");
    localStorage.removeItem("joselito_email_logs");
    initSimulatedDb();
    currentSimulatedUser = getStorageItem("joselito_current_user", null);
    if (authStateListener) authStateListener(currentSimulatedUser);
    window.location.reload();
  },
  
  toggleRealFirebase,
  isRealFirebaseEnabled,
  
  // Send a simulated check-in reminder
  triggerCheckInReminder: (user) => {
    logSimulatedEmail(
      user.email,
      "Recordatorio de Check-in - Joselito",
      `<p>Hola <strong>${user.name}</strong>, recuerda que tu ventana de confirmación de asistencia (Check-in) para tu misa asignada de hoy ya está abierta. Tienes desde 1 hora antes hasta 1 hora después del inicio para registrar tu asistencia en la aplicación.</p>`
    );
    
    // Add in-app notification
    const notifs = getStorageItem("joselito_notifications", []);
    notifs.push({
      id: `notif-${Date.now()}`,
      recipientUid: user.uid,
      type: "warning",
      title: "Recordatorio de Check-in",
      content: "La ventana para confirmar tu asistencia a misa está abierta. ¡Realiza tu Check-in!",
      date: getSimulatedTime().toISOString(),
      read: false
    });
    setStorageItem("joselito_notifications", notifs);
    window.dispatchEvent(new Event("notifications-updated"));
  }
};
