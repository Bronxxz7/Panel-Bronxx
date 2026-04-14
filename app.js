import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

// 🔹 Authentication (LOGIN)
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// 🔹 Firestore (BASE DE DATOS)
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
/* =========================================================
   1) CONFIG FIREBASE
========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyD-W21i17SvUKZzxjFp-VAUsSNq7bTGOmA",
  authDomain: "panelbronxx.firebaseapp.com",
  projectId: "panelbronxx",
  storageBucket: "panelbronxx.firebasestorage.app",
  messagingSenderId: "34518227374",
  appId: "1:34518227374:web:e39bd991f5a1c257bb503f",
  measurementId: "G-JF1B7WBV5G"
};

let app = null;
let db = null;
let auth = null;
let firebaseReady = false;

if (firebaseReady) {
  auth = getAuth(app);
}

try {
  if (
    firebaseConfig.apiKey !== "TU_API_KEY" &&
    firebaseConfig.projectId !== "TU_PROJECT_ID"
  ) {
    app = initializeApp(firebaseConfig);

    // 🔥 inicializaciones
    db = getFirestore(app);
    auth = getAuth(app);

    firebaseReady = true;
    console.log("Firebase conectado");
  }
} catch (error) {
  console.error("Error Firebase:", error);
}

/* =========================================================
   2) DATOS DEMO
========================================================= */
const demoData = [
  {
    id: "1",
    servicio: "Disney Premium",
    correo: "disney.master.01@gmail.com",
    cliente: "Jeampyer",
    precioVenta: 10,
    fechaExpiracion: "2026-04-20T16:00:00.000Z",
    tipoCuenta: "Perfil",
    perfilCuenta: "Perfil 1",
    contrasena: "Disney123",
    pinCodigo: "5522",
    telefono: "51999111222",
    observaciones: "Cuenta compartida",
    renovaciones: 1
  },
  {
    id: "2",
    servicio: "Spotify Premium",
    correo: "spotify.family.2026@gmail.com",
    cliente: "Milsa",
    precioVenta: 12,
    fechaExpiracion: "2026-04-14T21:30:00.000Z",
    tipoCuenta: "Perfil",
    perfilCuenta: "Perfil 2",
    contrasena: "Spotify123",
    pinCodigo: "8899",
    telefono: "51955222654",
    observaciones: "Cliente frecuente",
    renovaciones: 2
  },
  {
    id: "3",
    servicio: "Netflix Premium",
    correo: "netflix.owner@gmail.com",
    cliente: "Milsa",
    precioVenta: 25,
    fechaExpiracion: "2026-04-16T11:00:00.000Z",
    tipoCuenta: "Completa",
    perfilCuenta: "",
    contrasena: "Netflix123",
    pinCodigo: "2211",
    telefono: "51955222654",
    observaciones: "Cuenta completa",
    renovaciones: 1
  },
  {
    id: "4",
    servicio: "Disney Premium",
    correo: "disney.master.01@gmail.com",
    cliente: "Milsa",
    precioVenta: 10,
    fechaExpiracion: "2026-04-20T16:00:00.000Z",
    tipoCuenta: "Perfil",
    perfilCuenta: "Perfil 3",
    contrasena: "Disney123",
    pinCodigo: "5533",
    telefono: "51955222654",
    observaciones: "",
    renovaciones: 0
  }
];

/* =========================================================
   3) ESTADO GLOBAL
========================================================= */
let cuentas = firebaseReady ? [] : [...demoData];
let clientes = [];
let filtroBusqueda = "";
let filtroTipo = "Todos";
let filtroTiempo = "30";
let currentSection = "dashboard";

let charts = {
  incomeChart: null,
  gananciasChart: null,
  serviciosChart: null
};

/* =========================================================
   4) SELECTORES
========================================================= */
const sections = {
  dashboard: document.getElementById("section-dashboard"),
  clientes: document.getElementById("section-clientes"),
  perfiles: document.getElementById("section-perfiles"),
  completas: document.getElementById("section-completas"),
  renovaciones: document.getElementById("section-renovaciones"),
  agregar: document.getElementById("section-agregar")
};

const navButtons = {
  dashboard: document.getElementById("nav-dashboard"),
  clientes: document.getElementById("nav-clientes"),
  perfiles: document.getElementById("nav-perfiles"),
  completas: document.getElementById("nav-completas"),
  renovaciones: document.getElementById("nav-renovaciones"),
  agregar: document.getElementById("nav-agregar")
};

const globalSearch = document.getElementById("globalSearch");
const globalTypeFilter = document.getElementById("globalTypeFilter");
const globalTimeFilter = document.getElementById("globalTimeFilter");
const refreshBtn = document.getElementById("refreshBtn");
const introScreen = document.getElementById("introScreen");
const cancelEditBtn = document.getElementById("cancelEditBtn");
/* 🔐 LOGIN */
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const dashboardStats = {
  totalCuentas: document.getElementById("totalCuentas"),
  totalClientes: document.getElementById("totalClientes"),
  porVencer: document.getElementById("porVencer"),
  gananciaEstimada: document.getElementById("gananciaEstimada"),
  sidebarIngresosMes: document.getElementById("sidebarIngresosMes")
};

const clientesContainer = document.getElementById("clientesContainer");
const perfilesTableBody = document.getElementById("perfilesTableBody");
const completasContainer = document.getElementById("completasContainer");
const renovacionesContainer = document.getElementById("renovacionesContainer");
const topClientesContainer = document.getElementById("topClientesContainer");

const formCuenta = document.getElementById("formCuenta");
const tipoCuentaSelect = document.getElementById("tipoCuenta");
const perfilCuentaWrap = document.getElementById("perfilCuentaWrap");
const perfilCuentaInput = document.getElementById("perfilCuenta");

const accountModal = document.getElementById("accountModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalEditBtn = document.getElementById("modalEditBtn");
const modalWhatsappBtn = document.getElementById("modalWhatsappBtn");

const modalServicio = document.getElementById("modalServicio");
const modalCorreo = document.getElementById("modalCorreo");
const modalCliente = document.getElementById("modalCliente");
const modalTipo = document.getElementById("modalTipo");
const modalPrecio = document.getElementById("modalPrecio");
const modalExpira = document.getElementById("modalExpira");
const modalContrasena = document.getElementById("modalContrasena");
const modalPin = document.getElementById("modalPin");
const modalTelefono = document.getElementById("modalTelefono");
const modalPerfilCuenta = document.getElementById("modalPerfilCuenta");
const modalObservaciones = document.getElementById("modalObservaciones");

/* =========================================================
   5) TEMA DESDE CSS
========================================================= */
const css = getComputedStyle(document.documentElement);
const BLUE = css.getPropertyValue("--blue-main").trim() || "#38bdf8";
const BLUE_SOFT = css.getPropertyValue("--blue-soft").trim() || "rgba(56,189,248,0.15)";
const BLUE_STRONG = css.getPropertyValue("--blue-strong").trim() || "#0ea5e9";
const BLUE_DARK = css.getPropertyValue("--blue-dark").trim() || "#0284c7";
const BLUE_DEEP = css.getPropertyValue("--blue-deep").trim() || "#0369a1";
const TEXT = css.getPropertyValue("--text-light").trim() || "#d8eeff";

/* =========================================================
   6) UTILIDADES
========================================================= */
function money(value) {
  return `S/. ${Number(value || 0).toFixed(2)}`;
}

function safeDate(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(dateValue) {
  const d = safeDate(dateValue);
  if (!d) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatDateTime(dateValue) {
  const d = safeDate(dateValue);
  if (!d) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

function formatDateTimeLocal(dateValue) {
  const d = safeDate(dateValue);
  if (!d) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRemainingTime(dateValue) {
  const d = safeDate(dateValue);
  if (!d) return null;

  const now = new Date();
  const diff = d.getTime() - now.getTime();

  if (diff <= 0) {
    const passedHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    return {
      expired: true,
      days: 0,
      hours: 0,
      totalHoursPassed: passedHours,
      text: "Expirada"
    };
  }

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = totalHours - days * 24;

  return {
    expired: false,
    days,
    hours,
    totalHours,
    text: `${days} día(s) y ${hours} hora(s)`
  };
}

function getStatus(dateValue) {
  const remaining = getRemainingTime(dateValue);

  if (!remaining) {
    return { text: "Sin fecha", className: "estado-neutro", dot: "dot-cyan", priority: 99 };
  }

  if (remaining.expired) {
    return { text: "Expirada", className: "estado-expirada", dot: "dot-red", priority: 1 };
  }

  if (remaining.totalHours <= 72) {
    return {
      text: `${remaining.days}d ${remaining.hours}h`,
      className: "estado-urgente",
      dot: "dot-amber",
      priority: 2
    };
  }

  if (remaining.totalHours <= 168) {
    return {
      text: `${remaining.days}d ${remaining.hours}h`,
      className: "estado-alerta",
      dot: "dot-cyan",
      priority: 3
    };
  }

  return {
    text: `${remaining.days}d ${remaining.hours}h`,
    className: "estado-activa",
    dot: "dot-green",
    priority: 4
  };
}

function initialOf(service) {
  return String(service || "?").trim().charAt(0).toUpperCase();
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isWithinRange(dateValue, filter) {
  if (filter === "Todos") return true;

  const remaining = getRemainingTime(dateValue);
  if (!remaining || remaining.expired) return true;

  const limit = Number(filter);
  return remaining.days <= limit;
}

function getClientLevel(totalCompras) {
  if (totalCompras >= 6) {
    return { texto: "Cliente VIP", clase: "badge-completa-verde" };
  }
  if (totalCompras >= 4) {
    return { texto: "Cliente frecuente", clase: "badge-blue" };
  }
  if (totalCompras >= 2) {
    return { texto: "Cliente potencial", clase: "badge-completa-naranja" };
  }
  return { texto: "Cliente normal", clase: "badge-gray" };
}

function filteredAccounts() {
  return cuentas.filter((item) => {
    const text = `${item.servicio} ${item.correo} ${item.cliente} ${item.perfilCuenta || ""}`;
    const bySearch = normalizeText(text).includes(normalizeText(filtroBusqueda));
    const byType = filtroTipo === "Todos" ? true : item.tipoCuenta === filtroTipo;
    const byTime = isWithinRange(item.fechaExpiracion, filtroTiempo);
    return bySearch && byType && byTime;
  });
}

function togglePerfilField() {
  if (!tipoCuentaSelect || !perfilCuentaWrap || !perfilCuentaInput) return;

  const isPerfil = tipoCuentaSelect.value === "Perfil";
  perfilCuentaWrap.style.display = isPerfil ? "block" : "none";

  if (!isPerfil) {
    perfilCuentaInput.value = "";
  }
}
function setupLogin() {
  if (!firebaseReady) {
    console.log("Firebase no está listo");
    return;
  }

  console.log("setupLogin ejecutado");

  onAuthStateChanged(auth, (user) => {
    console.log("Estado auth:", user);

    if (user) {
      loginScreen?.classList.add("hidden");
      appShell?.classList.remove("hidden");
      listenAccounts();
    } else {
      loginScreen?.classList.remove("hidden");
      appShell?.classList.add("hidden");
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Submit del login ejecutado");

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    console.log("Intentando login con:", email);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login correcto:", cred.user);

      // 🔥 FORZAR CAMBIO DE UI (IMPORTANTE)
      loginScreen.classList.add("hidden");
      appShell.classList.remove("hidden");

      // 🔥 cargar datos
      listenAccounts();

      loginError.textContent = "";
    } catch (error) {
      console.error("Error login:", error);
      loginError.textContent = `${error.code} - ${error.message}`;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
  });
}
/* =========================================================
   7) INTRO
========================================================= */
function initIntro() {
  setTimeout(() => {
    introScreen?.classList.add("hide");

    setTimeout(() => {
      // SIEMPRE mostrar login primero
      loginScreen?.classList.remove("hidden");
      appShell?.classList.add("hidden");
    }, 500);
  }, 2400);
}
/* =========================================================
   8) NAVEGACIÓN
========================================================= */
function showSection(sectionName) {
  currentSection = sectionName;

  Object.entries(sections).forEach(([key, section]) => {
    if (section) {
      section.classList.toggle("active-section", key === sectionName);
    }
  });

  Object.entries(navButtons).forEach(([key, btn]) => {
    if (btn) {
      btn.classList.toggle("active", key === sectionName);
    }
  });
}

function setupNavigation() {
  Object.entries(navButtons).forEach(([key, btn]) => {
    btn?.addEventListener("click", () => showSection(key));
  });
}

/* =========================================================
   9) FIREBASE / DEMO
========================================================= */
function mapFirestoreDoc(docSnap) {
  const data = docSnap.data();
  let fechaExpiracion = data.fechaExpiracion || null;

  if (fechaExpiracion?.seconds) {
    fechaExpiracion = new Date(fechaExpiracion.seconds * 1000).toISOString();
  }

  return {
    id: docSnap.id,
    servicio: data.servicio || "",
    correo: data.correo || "",
    cliente: data.cliente || "",
    precioVenta: Number(data.precioVenta || 0),
    fechaExpiracion,
    tipoCuenta: data.tipoCuenta || "Perfil",
    perfilCuenta: data.perfilCuenta || "",
    contrasena: data.contrasena || "",
    pinCodigo: data.pinCodigo || "",
    telefono: data.telefono || "",
    observaciones: data.observaciones || "",
    renovaciones: Number(data.renovaciones || 0)
  };
}

function buildClientsFromAccounts() {
  const map = new Map();

  cuentas.forEach((item) => {
    const key = item.cliente?.trim();
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        nombre: key,
        cuentas: 0,
        ganancia: 0,
        renovaciones: 0,
        contacto: item.telefono || "-"
      });
    }

    const current = map.get(key);
    current.cuentas += 1;
    current.ganancia += Number(item.precioVenta || 0);
    current.renovaciones += Number(item.renovaciones || 0);
    if (item.telefono) current.contacto = item.telefono;
  });

  clientes = [...map.values()];
}

function listenAccounts() {
  if (!firebaseReady) {
    buildClientsFromAccounts();
    renderAll();
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  onSnapshot(
    collection(db, "users", user.uid, "cuentas"),
    (snapshot) => {
      cuentas = snapshot.docs.map(mapFirestoreDoc);
      buildClientsFromAccounts();
      renderAll();
    }
  );
}

async function saveAccount(data, id = null) {
  if (!firebaseReady) {
    if (id) {
      cuentas = cuentas.map((item) => (item.id === id ? { ...item, ...data } : item));
    } else {
      cuentas.unshift({
        id: crypto.randomUUID(),
        ...data,
        renovaciones: Number(data.renovaciones || 0)
      });
    }

    buildClientsFromAccounts();
    renderAll();
    return;
  }

  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Debes iniciar sesión para guardar cuentas.");
      return;
    }

    if (id) {
      await updateDoc(
        doc(db, "users", user.uid, "cuentas", id),
        data
      );
    } else {
      await addDoc(
        collection(db, "users", user.uid, "cuentas"),
        {
          ...data,
          createdAt: serverTimestamp(),
          renovaciones: Number(data.renovaciones || 0)
        }
      );
    }
  } catch (error) {
    console.error("Error al guardar:", error);
    alert(`No se pudo guardar la cuenta: ${error.message}`);
  }
}
async function removeAccount(id) {
  if (!firebaseReady) {
    cuentas = cuentas.filter((item) => item.id !== id);
    buildClientsFromAccounts();
    renderAll();
    return;
  }

  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Debes iniciar sesión para eliminar cuentas.");
      return;
    }

    await deleteDoc(doc(db, "users", user.uid, "cuentas", id));
  } catch (error) {
    console.error("Error al eliminar:", error);
    alert(`No se pudo eliminar: ${error.message}`);
  }
}

async function renewAccount(id) {
  const account = cuentas.find((item) => item.id === id);
  if (!account) return;

  const currentDate = safeDate(account.fechaExpiracion) || new Date();
  const renewedDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    currentDate.getDate(),
    currentDate.getHours(),
    currentDate.getMinutes(),
    currentDate.getSeconds(),
    currentDate.getMilliseconds()
  );

  const payload = {
    fechaExpiracion: renewedDate.toISOString(),
    renovaciones: Number(account.renovaciones || 0) + 1
  };

  if (!firebaseReady) {
    cuentas = cuentas.map((item) => (item.id === id ? { ...item, ...payload } : item));
    buildClientsFromAccounts();
    renderAll();
    return;
  }

  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Debes iniciar sesión para renovar cuentas.");
      return;
    }

    await updateDoc(
      doc(db, "users", user.uid, "cuentas", id),
      payload
    );
  } catch (error) {
    console.error("Error al renovar:", error);
    alert(`No se pudo renovar: ${error.message}`);
  }
}

/* =========================================================
   10) WHATSAPP
========================================================= */
function buildRenewalMessage(account) {
  const remaining = getRemainingTime(account.fechaExpiracion);
  const fechaTexto = formatDateTime(account.fechaExpiracion);

  let tiempoTexto = "sin fecha registrada";
  if (remaining) {
    if (remaining.expired) {
      tiempoTexto = "ya venció";
    } else {
      tiempoTexto = `vence en ${remaining.days} día(s) y ${remaining.hours} hora(s)`;
    }
  }

  return `Hola ${account.cliente}, te escribo por tu cuenta de ${account.servicio}. Actualmente ${tiempoTexto}. La fecha de renovación es ${fechaTexto}. Si deseas renovarla, escríbeme para ayudarte.`;
}

function openWhatsApp(phone, message) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");

  if (!cleanPhone) {
    alert("Este cliente no tiene teléfono registrado.");
    return;
  }

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

/* =========================================================
   11) FILTROS
========================================================= */
function setupFilters() {
  globalSearch?.addEventListener("input", (e) => {
    filtroBusqueda = e.target.value;
    renderAll();
  });

  globalTypeFilter?.addEventListener("change", (e) => {
    filtroTipo = e.target.value;
    renderAll();
  });

  globalTimeFilter?.addEventListener("change", (e) => {
    filtroTiempo = e.target.value;
    renderAll();
  });

  refreshBtn?.addEventListener("click", () => {
    renderAll();
  });
}

/* =========================================================
   12) MODAL
========================================================= */
function openAccountModal(account) {
  if (!account) return;

  modalServicio.textContent = account.servicio || "-";
  modalCorreo.textContent = account.correo || "-";
  modalCliente.textContent = account.cliente || "-";
  modalTipo.textContent = account.tipoCuenta || "-";
  modalPrecio.textContent = money(account.precioVenta);
  modalExpira.textContent = formatDateTime(account.fechaExpiracion);
  modalContrasena.textContent = account.contrasena || "-";
  modalPin.textContent = account.pinCodigo || "-";
  modalTelefono.textContent = account.telefono || "-";
  if (modalPerfilCuenta) modalPerfilCuenta.textContent = account.perfilCuenta || "-";
  modalObservaciones.textContent = account.observaciones || "-";

  modalEditBtn.dataset.id = account.id;
  modalWhatsappBtn.dataset.id = account.id;

  accountModal.classList.add("active");
}

function closeAccountModal() {
  accountModal?.classList.remove("active");
}

function setupModal() {
  closeModalBtn?.addEventListener("click", closeAccountModal);

  accountModal?.addEventListener("click", (e) => {
    if (e.target === accountModal) {
      closeAccountModal();
    }
  });

  modalEditBtn?.addEventListener("click", () => {
    const id = modalEditBtn.dataset.id;
    if (!id) return;

    closeAccountModal();
    loadFormForEdit(id);
    showSection("agregar");
  });

  modalWhatsappBtn?.addEventListener("click", () => {
    const id = modalWhatsappBtn.dataset.id;
    const account = cuentas.find((x) => x.id === id);
    if (!account) return;

    const message = buildRenewalMessage(account);
    openWhatsApp(account.telefono, message);
  });
}

/* =========================================================
   13) DASHBOARD
========================================================= */
function renderDashboard() {
  const data = filteredAccounts();

  const totalCuentas = data.length;
  const totalClientes = new Set(data.map((x) => x.cliente).filter(Boolean)).size;
  const porVencer = data.filter((x) => {
    const remaining = getRemainingTime(x.fechaExpiracion);
    return remaining && !remaining.expired && remaining.totalHours <= 168;
  }).length;
  const gananciaEstimada = data.reduce((acc, item) => acc + Number(item.precioVenta || 0), 0);

  if (dashboardStats.totalCuentas) dashboardStats.totalCuentas.textContent = totalCuentas;
  if (dashboardStats.totalClientes) dashboardStats.totalClientes.textContent = totalClientes;
  if (dashboardStats.porVencer) dashboardStats.porVencer.textContent = porVencer;
  if (dashboardStats.gananciaEstimada) dashboardStats.gananciaEstimada.textContent = money(gananciaEstimada);
  if (dashboardStats.sidebarIngresosMes) dashboardStats.sidebarIngresosMes.textContent = money(gananciaEstimada);

  renderIncomeChart();
  renderGananciasChart();
  renderServiciosChart();
  renderTopClientes();
}

function renderIncomeChart() {
  const ctx = document.getElementById("incomeChart");
  if (!ctx) return;

  if (charts.incomeChart) charts.incomeChart.destroy();

  charts.incomeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      datasets: [
        {
          label: "Ingresos",
          data: [80, 120, 95, 150, 180, 210],
          borderColor: BLUE,
          backgroundColor: BLUE_SOFT,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: "#22d3ee",
          pointBorderWidth: 0,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 10, right: 10, bottom: 10, left: 10 }
      },
      plugins: {
        legend: {
          labels: { color: TEXT, boxWidth: 18 }
        }
      },
      scales: {
        x: {
          ticks: { color: TEXT },
          grid: { color: "rgba(255,255,255,.05)" }
        },
        y: {
          ticks: { color: TEXT },
          grid: { color: "rgba(255,255,255,.05)" }
        }
      }
    }
  });
}

function renderGananciasChart() {
  const ctx = document.getElementById("gananciasChart");
  if (!ctx) return;

  if (charts.gananciasChart) {
    charts.gananciasChart.destroy();
  }

  const cuentasOrdenadas = [...cuentas]
    .filter((c) => c.fechaExpiracion)
    .sort((a, b) => new Date(a.fechaExpiracion) - new Date(b.fechaExpiracion));

  const labels = cuentasOrdenadas.map((c) => {
    const d = new Date(c.fechaExpiracion);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const data = cuentasOrdenadas.map((c) => Number(c.precioVenta || 0));

  charts.gananciasChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Ingresos por día",
          data,
          borderColor: BLUE,
          backgroundColor: BLUE_SOFT,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: "#22d3ee",
          pointBorderColor: BLUE_STRONG,
          pointBorderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: TEXT }
        }
      },
      scales: {
        x: {
          ticks: { color: TEXT },
          grid: { color: "rgba(255,255,255,.05)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: TEXT },
          grid: { color: "rgba(255,255,255,.05)" }
        }
      }
    }
  });
}

function renderServiciosChart() {
  const ctx = document.getElementById("serviciosChart");
  if (!ctx) return;

  if (charts.serviciosChart) {
    charts.serviciosChart.destroy();
  }

  const serviciosMap = {};
  cuentas.forEach((c) => {
    const servicio = c.servicio || "Sin servicio";
    serviciosMap[servicio] = (serviciosMap[servicio] || 0) + 1;
  });

  const labels = Object.keys(serviciosMap);
  const data = Object.values(serviciosMap);

  charts.serviciosChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [BLUE_STRONG, BLUE, "#22d3ee", BLUE_DARK, BLUE_DEEP],
          borderColor: "#0f172a",
          borderWidth: 3,
          hoverOffset: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: TEXT,
            boxWidth: 18,
            padding: 14
          }
        }
      }
    }
  });
}

function renderTopClientes() {
  if (!topClientesContainer) return;

  const clientesMap = new Map();

  cuentas.forEach((c) => {
    const nombre = c.cliente || "Sin nombre";

    if (!clientesMap.has(nombre)) {
      clientesMap.set(nombre, {
        nombre,
        ingresos: 0,
        cuentas: 0
      });
    }

    const actual = clientesMap.get(nombre);
    actual.ingresos += Number(c.precioVenta || 0);
    actual.cuentas += 1;
  });

  const top = [...clientesMap.values()]
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 4);

  if (!top.length) {
    topClientesContainer.innerHTML = `<div class="empty-state">No hay clientes para mostrar.</div>`;
    return;
  }

  topClientesContainer.innerHTML = top
    .map(
      (cliente, index) => `
        <div class="cliente-card">
          <h3>#${index + 1} ${escapeHtml(cliente.nombre)}</h3>
          <p><strong>Ingresos:</strong> ${money(cliente.ingresos)}</p>
          <p><strong>Cuentas:</strong> ${cliente.cuentas}</p>
        </div>
      `
    )
    .join("");
}

/* =========================================================
   14) CLIENTES
========================================================= */
function renderClientes() {
  const filteredClients = clientes.filter((item) => {
    const text = `${item.nombre} ${item.contacto}`;
    return normalizeText(text).includes(normalizeText(filtroBusqueda));
  });

  if (!filteredClients.length) {
    clientesContainer.innerHTML = `<div class="empty-state">No hay clientes registrados.</div>`;
    return;
  }

  clientesContainer.innerHTML = filteredClients
    .map((item) => {
      const level = getClientLevel(item.cuentas);

      return `
        <div class="cliente-card">
          <h3>${escapeHtml(item.nombre)}</h3>
          <p><strong>Cuentas compradas:</strong> ${item.cuentas}</p>
          <p><strong>Ganancia generada:</strong> ${money(item.ganancia)}</p>
          <p><strong>Renovaciones:</strong> ${item.renovaciones}</p>
          <p><strong>Contacto:</strong> ${escapeHtml(item.contacto)}</p>

          <div class="client-extra">
            <div class="client-total">Total comprado: ${item.cuentas} cuenta(s)</div>
            <div class="client-level">
              <span class="badge ${level.clase}">${level.texto}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================================================
   15) PERFILES
========================================================= */
function renderPerfiles() {
  const data = cuentas.filter((x) => {
    const text = `${x.servicio} ${x.correo} ${x.cliente} ${x.perfilCuenta || ""}`;
    const bySearch = normalizeText(text).includes(normalizeText(filtroBusqueda));
    return x.tipoCuenta === "Perfil" && bySearch;
  });

  if (!data.length) {
    perfilesTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No hay cuentas de perfil registradas.</div>
        </td>
      </tr>
    `;
    return;
  }

  perfilesTableBody.innerHTML = data
    .map((item) => {
      const status = getStatus(item.fechaExpiracion);

      return `
        <tr>
          <td>
            <div class="servicio-cell">
              <div class="avatar-blue">${initialOf(item.servicio)}</div>
              <div>
                <strong>${escapeHtml(item.servicio)}</strong>
                <small>${escapeHtml(item.correo)}</small>
              </div>
            </div>
          </td>
          <td>
            ${escapeHtml(item.cliente)}
            <br>
            <small style="color:#9fb8cf;">${escapeHtml(item.perfilCuenta || "Sin perfil")}</small>
          </td>
          <td>${money(item.precioVenta)}</td>
          <td>
            ${formatDateTime(item.fechaExpiracion)}
            <br>
            <span class="badge ${status.className}">${status.text}</span>
          </td>
          <td>
            <div class="acciones">
              <button class="btn-accion btn-ver" data-id="${item.id}" title="Ver">
                <i class='bx bx-show'></i>
              </button>
              <button class="btn-accion btn-editar" data-id="${item.id}" title="Editar">
                <i class='bx bx-pencil'></i>
              </button>
              <button class="btn-accion btn-eliminar" data-id="${item.id}" title="Eliminar">
                <i class='bx bx-trash'></i>
              </button>
              <button class="btn-accion btn-renovar" data-id="${item.id}" title="Renovar">
                <i class='bx bx-refresh'></i>
              </button>
              <button class="btn-accion btn-whatsapp" data-id="${item.id}" title="WhatsApp">
                <img src="WhatsApp_icon.png" alt="WhatsApp" class="btn-whatsapp-img">
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  bindProfileActions();
}

function bindProfileActions() {
  document.querySelectorAll(".btn-ver").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const item = cuentas.find((x) => x.id === id);
      if (!item) return;
      openAccountModal(item);
    });
  });

  document.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      loadFormForEdit(id);
      showSection("agregar");
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = confirm("¿Seguro que deseas eliminar esta cuenta?");
      if (!ok) return;
      await removeAccount(btn.dataset.id);
    });
  });

  document.querySelectorAll(".btn-renovar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await renewAccount(btn.dataset.id);
      alert("Cuenta renovada por 1 mes.");
    });
  });

  document.querySelectorAll(".btn-whatsapp").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const item = cuentas.find((x) => x.id === id);
      if (!item) return;

      const message = buildRenewalMessage(item);
      openWhatsApp(item.telefono, message);
    });
  });
}

/* =========================================================
   16) COMPLETAS
========================================================= */
function groupFullAccounts(data) {
  const map = new Map();

  data.forEach((item) => {
    const correo = (item.correo || "").trim().toLowerCase();
    if (!correo) return;

    if (!map.has(correo)) {
      map.set(correo, {
        principalId: item.id,
        servicio: item.servicio,
        correo: item.correo,
        fechaExpiracion: item.fechaExpiracion,
        usuarios: 0,
        perfiles: 0,
        completas: 0,
        clientes: [],
        estadoGrupo: "completa"
      });
    }

    const current = map.get(correo);

    current.usuarios += 1;

    if (item.tipoCuenta === "Perfil") {
      current.perfiles += 1;
    }

    if (item.tipoCuenta === "Completa") {
      current.completas += 1;
      current.principalId = item.id;
      current.servicio = item.servicio || current.servicio;
      current.fechaExpiracion = item.fechaExpiracion || current.fechaExpiracion;
    }

    if (item.cliente && !current.clientes.includes(item.cliente)) {
      current.clientes.push(item.cliente);
    }
  });

  return [...map.values()]
    .map((item) => {
      if (item.perfiles >= 2) {
        item.estadoGrupo = "coincidencia";
      } else if (item.completas >= 1) {
        item.estadoGrupo = "completa";
      } else {
        return null;
      }

      return item;
    })
    .filter(Boolean);
}

function renderCompletas() {
  const grouped = groupFullAccounts(cuentas);

  if (!grouped.length) {
    completasContainer.innerHTML = `<div class="empty-state">No hay cuentas completas ni coincidencias entre perfiles.</div>`;
    return;
  }

  completasContainer.innerHTML = grouped
    .map((item) => {
      const status = getStatus(item.fechaExpiracion);
      const isCoincidencia = item.estadoGrupo === "coincidencia";

      return `
        <div class="completa-card ${isCoincidencia ? "completa-naranja" : "completa-verde"}">
          <div class="completa-top">
            <div>
              <h3>${escapeHtml(item.servicio || "Cuenta agrupada")}</h3>
              <p>${escapeHtml(item.correo)}</p>
            </div>
            <div class="status-dot ${isCoincidencia ? "dot-amber" : status.dot}"></div>
          </div>

          <span class="badge ${isCoincidencia ? "badge-completa-naranja" : "badge-completa-verde"}">
            ${isCoincidencia ? "Coincidencia entre perfiles" : "Cuenta completa propia"}
          </span>

          <div class="info-grid-2">
            <div class="info-box">
              <span>Usuarios usando este correo</span>
              <strong>${item.usuarios}</strong>
            </div>
            <div class="info-box">
              <span>Fecha y hora de vencimiento</span>
              <strong>${formatDateTime(item.fechaExpiracion)}</strong>
            </div>
          </div>

          ${
            isCoincidencia
              ? `
                <div class="info-box" style="margin-top: 10px;">
                  <span>Clientes detectados</span>
                  <strong style="font-size: 0.95rem;">${item.clientes.map(escapeHtml).join(", ")}</strong>
                </div>
              `
              : ""
          }

          <button class="full-card-btn" data-id="${item.principalId}">
            Ver detalles
          </button>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".full-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = cuentas.find((x) => x.id === btn.dataset.id);
      if (!item) return;
      openAccountModal(item);
    });
  });
}

/* =========================================================
   17) RENOVACIONES
========================================================= */
function renderRenovaciones() {
  const data = [...filteredAccounts()].sort((a, b) => {
    const A = getStatus(a.fechaExpiracion);
    const B = getStatus(b.fechaExpiracion);

    if (A.priority !== B.priority) return A.priority - B.priority;
    return (safeDate(a.fechaExpiracion) || 0) - (safeDate(b.fechaExpiracion) || 0);
  });

  if (!data.length) {
    renovacionesContainer.innerHTML = `<div class="empty-state">No hay renovaciones registradas.</div>`;
    return;
  }

  renovacionesContainer.innerHTML = data
    .map((item) => {
      const status = getStatus(item.fechaExpiracion);
      const remaining = getRemainingTime(item.fechaExpiracion);

      return `
        <div class="renovacion-card">
          <h3>${escapeHtml(item.servicio)}</h3>
          <p><strong>Cliente:</strong> ${escapeHtml(item.cliente)}</p>
          <p><strong>Correo:</strong> ${escapeHtml(item.correo)}</p>
          <p><strong>Expira:</strong> ${formatDateTime(item.fechaExpiracion)}</p>
          <p><strong>Tiempo restante:</strong> ${remaining ? remaining.text : "-"}</p>
          <p><strong>Estado:</strong> <span class="badge ${status.className}">${status.text}</span></p>
          <p><strong>Precio:</strong> ${money(item.precioVenta)}</p>

          <div class="acciones" style="margin-top: 14px;">
            <button class="btn-accion btn-renovar renovar-card-btn" data-id="${item.id}">
              <i class='bx bx-refresh'></i>
            </button>
            <button class="btn-accion btn-editar editar-card-btn" data-id="${item.id}">
              <i class='bx bx-pencil'></i>
            </button>
            <button class="btn-accion btn-whatsapp whatsapp-card-btn" data-id="${item.id}">
              <img src="WhatsApp_icon.png" alt="WhatsApp" class="btn-whatsapp-img">
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".renovar-card-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await renewAccount(btn.dataset.id);
      alert("Cuenta renovada por 1 mes.");
    });
  });

  document.querySelectorAll(".editar-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadFormForEdit(btn.dataset.id);
      showSection("agregar");
    });
  });

  document.querySelectorAll(".whatsapp-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = cuentas.find((x) => x.id === btn.dataset.id);
      if (!item) return;

      const message = buildRenewalMessage(item);
      openWhatsApp(item.telefono, message);
    });
  });
}

/* =========================================================
   18) FORMULARIO
========================================================= */
function clearForm() {
  formCuenta.reset();
  delete formCuenta.dataset.editId;
  togglePerfilField();
}

function loadFormForEdit(id) {
  const item = cuentas.find((x) => x.id === id);
  if (!item) return;

  document.getElementById("servicio").value = item.servicio || "";
  document.getElementById("correo").value = item.correo || "";
  document.getElementById("cliente").value = item.cliente || "";
  document.getElementById("precioVenta").value = item.precioVenta || "";
  document.getElementById("fechaExpiracion").value = formatDateTimeLocal(item.fechaExpiracion);
  document.getElementById("tipoCuenta").value = item.tipoCuenta || "Perfil";
  if (perfilCuentaInput) perfilCuentaInput.value = item.perfilCuenta || "";
  document.getElementById("contrasena").value = item.contrasena || "";
  document.getElementById("pinCodigo").value = item.pinCodigo || "";
  document.getElementById("telefono").value = item.telefono || "";
  document.getElementById("observaciones").value = item.observaciones || "";

  formCuenta.dataset.editId = id;
  togglePerfilField();
}

function setupForm() {
  formCuenta?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = formCuenta.dataset.editId || null;

    const data = {
      servicio: document.getElementById("servicio").value.trim(),
      correo: document.getElementById("correo").value.trim(),
      cliente: document.getElementById("cliente").value.trim(),
      precioVenta: Number(document.getElementById("precioVenta").value || 0),
      fechaExpiracion: document.getElementById("fechaExpiracion").value
        ? new Date(document.getElementById("fechaExpiracion").value).toISOString()
        : null,
      tipoCuenta: document.getElementById("tipoCuenta").value,
      perfilCuenta: document.getElementById("perfilCuenta")?.value?.trim?.() || "",
      contrasena: document.getElementById("contrasena").value.trim(),
      pinCodigo: document.getElementById("pinCodigo").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      observaciones: document.getElementById("observaciones").value.trim(),
      renovaciones: 0
    };

    if (!data.servicio || !data.correo || !data.cliente || !data.precioVenta) {
      alert("Completa servicio, correo, cliente y precio.");
      return;
    }

    const old = cuentas.find((x) => x.id === id);
    if (old) {
      data.renovaciones = old.renovaciones || 0;
    }

    await saveAccount(data, id);
    clearForm();
    showSection("perfiles");
    alert(id ? "Cuenta actualizada." : "Cuenta guardada.");
  });

  cancelEditBtn?.addEventListener("click", () => {
    clearForm();
  });

  tipoCuentaSelect?.addEventListener("change", togglePerfilField);
}

/* =========================================================
   19) RENDER GENERAL
========================================================= */
function renderAll() {
  buildClientsFromAccounts();
  renderDashboard();
  renderClientes();
  renderPerfiles(); 
  renderCompletas();
  renderRenovaciones();
}

/* =========================================================
   20) INIT
========================================================= */
function init() {
  initIntro();
  setupNavigation();
  setupFilters();
  setupForm();
  setupModal();
  togglePerfilField();
  setupLogin();
  showSection("dashboard");
}

document.addEventListener("DOMContentLoaded", init);
