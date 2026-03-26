import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =======================
   FIREBASE
======================= */
const firebaseConfig = {
  apiKey: "AIzaSyD-W21i17SvUKZzxjFp-VAUsSNq7bTGOmA",
  authDomain: "panelbronxx.firebaseapp.com",
  projectId: "panelbronxx",
  storageBucket: "panelbronxx.firebasestorage.app",
  messagingSenderId: "34518227374",
  appId: "1:34518227374:web:e39bd991f5a1c257bb503f",
  measurementId: "G-JF1B7WBV5G"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================================================
   CONFIGURACION DE ICONOS
========================================================= */
const ICONS = {
  ver: "vercuentas.png",
  editar: "editar.png",
  renovar: "renovar.png",
  eliminar: "eliminar.png",
  whatsapp: "wasapi.png"
};

/* =========================================================
   ESTADO
========================================================= */
let cuentas = [];
let currentSearch = "";
let currentFilter = "todos";
let cuentasRef = null;
let unsubscribeCuentas = null;

/* =========================================================
   DOM LOGIN
========================================================= */
const loginView = document.getElementById("loginView");
const panelView = document.getElementById("panelView");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const registerBtn = document.getElementById("registerBtn");

/* =========================================================
   DOM PANEL
========================================================= */
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle = document.getElementById("menuToggle");
const sidebarClose = document.getElementById("sidebarClose");

const navButtons = document.querySelectorAll(".nav-btn");
const sections = {
  dashboard: document.getElementById("dashboardSection"),
  cuentas: document.getElementById("cuentasSection"),
  renovaciones: document.getElementById("renovacionesSection"),
  agregar: document.getElementById("agregarSection")
};

const searchInput = document.getElementById("searchInput");
const filterEstado = document.getElementById("filterEstado");

const tablaCuentas = document.getElementById("tablaCuentas");
const listaRenovaciones = document.getElementById("listaRenovaciones");
const dashboardRenovaciones = document.getElementById("dashboardRenovaciones");
const tableCountBadge = document.getElementById("tableCountBadge");

const statTotal = document.getElementById("statTotal");
const statPorVencer = document.getElementById("statPorVencer");
const statVencidas = document.getElementById("statVencidas");
const statIngresos = document.getElementById("statIngresos");

const labelActivas = document.getElementById("labelActivas");
const labelWarning = document.getElementById("labelWarning");
const labelDanger = document.getElementById("labelDanger");

const barActivas = document.getElementById("barActivas");
const barWarning = document.getElementById("barWarning");
const barDanger = document.getElementById("barDanger");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const detalleCuenta = document.getElementById("detalleCuenta");

const toast = document.getElementById("toast");
const accountForm = document.getElementById("accountForm");
const editId = document.getElementById("editId");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");

/* inputs del formulario */
const servicioInput = document.getElementById("servicio");
const clienteInput = document.getElementById("cliente");
const correoInput = document.getElementById("correo");
const contrasenaInput = document.getElementById("contrasena");
const perfilInput = document.getElementById("perfil");
const pinInput = document.getElementById("pin");
const telefonoInput = document.getElementById("telefono");
const precioCompraInput = document.getElementById("precioCompra");
const precioVentaInput = document.getElementById("precioVenta");
const expiraInput = document.getElementById("expira");
const notaInput = document.getElementById("nota");

/* =========================================================
   INICIO
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  setupAuth();
  updateGananciaField();
  startCountdownRefresh();
});

/* =========================================================
   AUTH
========================================================= */
function setupAuth() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const uid = user.uid;

      cuentasRef = collection(db, "users", uid, "cuentas");

      if (loginView) loginView.style.display = "none";
      if (panelView) panelView.style.display = "block";
      if (loginError) loginError.textContent = "";

      listenCuentas();
    } else {
      cuentasRef = null;

      if (unsubscribeCuentas) {
        unsubscribeCuentas();
        unsubscribeCuentas = null;
      }

      cuentas = [];
      renderAll();

      if (panelView) panelView.style.display = "none";
      if (loginView) loginView.style.display = "flex";
    }
  });
}

async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function registerUser(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

async function logoutUser() {
  return signOut(auth);
}

/* =========================================================
   FIRESTORE
========================================================= */
function listenCuentas() {
  if (!cuentasRef) return;

  try {
    if (unsubscribeCuentas) unsubscribeCuentas();

    const q = query(cuentasRef);

    unsubscribeCuentas = onSnapshot(
      q,
      (snapshot) => {
        cuentas = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          const precioCompra = Number(data.precioCompra ?? 0);
          const precioVenta = Number(data.precioVenta ?? 0);
          const ganancia = Number(data.ganancia ?? (precioVenta - precioCompra));

          return {
            id: docSnap.id,
            servicio: data.servicio ?? "",
            cliente: data.cliente ?? "",
            logo: data.logo ?? "",
            correo: data.correo ?? "",
            contrasena: data.contrasena ?? "",
            perfil: data.perfil ?? "",
            pin: data.pin ?? "",
            nota: data.nota ?? "",
            precioCompra,
            precioVenta,
            ganancia,
            expira: data.expira ?? "",
            telefono: data.telefono ?? "",
            createdAt: data.createdAt ?? null
          };
        });

        renderAll();
      },
      (error) => {
        console.error("Error leyendo cuentas:", error);
        showToast("No se pudieron cargar las cuentas.");
      }
    );
  } catch (error) {
    console.error("Error iniciando listener:", error);
    showToast("Error de conexión con Firebase.");
  }
}

/* =========================================================
   EVENTOS
========================================================= */
function bindEvents() {
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value.trim() || "";

    if (loginError) loginError.textContent = "";

    if (!email || !password) {
      if (loginError) loginError.textContent = "Completa correo y contraseña.";
      return;
    }

    try {
      await loginUser(email, password);
    } catch (error) {
      console.error("Error login:", error);
      if (loginError) loginError.textContent = "Correo o contraseña incorrectos.";
    }
  });

  registerBtn?.addEventListener("click", async () => {
    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value.trim() || "";

    if (loginError) loginError.textContent = "";

    if (!email || !password) {
      if (loginError) loginError.textContent = "Escribe correo y contraseña para registrarte.";
      return;
    }

    if (password.length < 6) {
      if (loginError) loginError.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }

    try {
      await registerUser(email, password);
      if (loginError) loginError.textContent = "";
      showToast("Cuenta creada correctamente.");
    } catch (error) {
      console.error("Error registro:", error);
      if (loginError) loginError.textContent = "No se pudo registrar el usuario.";
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
      showToast("No se pudo cerrar sesión.");
    }
  });

  menuToggle?.addEventListener("click", openSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      activateSection(section);
    });
  });

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    renderAccountsTable();
    renderRenewals();
  });

  filterEstado?.addEventListener("change", (e) => {
    currentFilter = e.target.value;
    renderAccountsTable();
  });

  modalClose?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", closeModal);

  accountForm?.addEventListener("submit", handleCreateOrUpdateAccount);

  resetBtn?.addEventListener("click", () => {
    resetFormState();
  });

  precioCompraInput?.addEventListener("input", updateGananciaField);
  precioVentaInput?.addEventListener("input", updateGananciaField);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 920) {
      sidebar?.classList.remove("show");
      sidebarOverlay?.classList.remove("show");
    }
    const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html"; // o index.html si ahí está tu login
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
});
  });
}

/* =========================================================
   SIDEBAR
========================================================= */
function openSidebar() {
  sidebar?.classList.add("show");
  sidebarOverlay?.classList.add("show");
}

function closeSidebar() {
  sidebar?.classList.remove("show");
  sidebarOverlay?.classList.remove("show");
}

/* =========================================================
   SECCIONES
========================================================= */
function activateSection(sectionName) {
  Object.values(sections).forEach((section) => section?.classList.remove("active"));
  navButtons.forEach((btn) => btn.classList.remove("active"));

  if (sections[sectionName]) {
    sections[sectionName].classList.add("active");
    document.querySelector(`.nav-btn[data-section="${sectionName}"]`)?.classList.add("active");
  }

  closeSidebar();
}

/* =========================================================
   RENDER GENERAL
========================================================= */
function renderAll() {
  renderDashboard();
  renderAccountsTable();
  renderRenewals();
}

/* =========================================================
   UTILS
========================================================= */
function parseDateLocal(dateString) {
  if (!dateString || !dateString.includes("-")) return new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59);
}

function getNow() {
  return new Date();
}

function diffDays(dateString) {
  const now = getNow().getTime();
  const expiry = parseDateLocal(dateString).getTime();
  const diff = expiry - now;

  if (diff < 0) {
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getRemainingTime(dateString) {
  const now = getNow().getTime();
  const expiry = parseDateLocal(dateString).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    const past = Math.abs(diff);
    const days = Math.floor(past / (1000 * 60 * 60 * 24));
    const hours = Math.floor((past % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
      expired: true,
      text: `Vencida hace ${days}d ${hours}h`
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    expired: false,
    text: `${days}d ${hours}h`
  };
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusInfo(expira) {
  const days = diffDays(expira);

  if (days < 0) {
    return {
      key: "vencida",
      label: "Vencida",
      className: "days-badge days-danger"
    };
  }

  if (days <= 3) {
    return {
      key: "por-vencer",
      label: "Próxima a vencer",
      className: "days-badge days-warning"
    };
  }

  return {
    key: "activa",
    label: "Activa",
    className: "days-badge days-good"
  };
} 

function getFilteredAccounts() {
  return cuentas.filter((account) => {
    const searchable = [
      account.servicio,
      account.cliente,
      account.correo,
      account.telefono
    ].join(" ").toLowerCase();

    const matchesSearch = searchable.includes(currentSearch);
    const status = getStatusInfo(account.expira).key;

    const matchesFilter =
      currentFilter === "todos" ||
      (currentFilter === "activa" && status === "activa") ||
      (currentFilter === "por-vencer" && status === "por-vencer") ||
      (currentFilter === "vencida" && status === "vencida");

    return matchesSearch && matchesFilter;
  });
}

function sortByExpiryAscending(list) {
  return [...list].sort((a, b) => parseDateLocal(a.expira) - parseDateLocal(b.expira));
}

function buildAvatarHTML(account) {
  const logo = String(account.logo || "").trim();
  const letter = escapeHTML((account.servicio || "S").charAt(0).toUpperCase());

  if (logo) {
    return `
      <div class="service-avatar">
        <img
          src="${escapeHTML(logo)}"
          alt="${escapeHTML(account.servicio)}"
          onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;fallback&quot;>${letter}</div>';"
        />
      </div>
    `;
  }

  return `
    <div class="service-avatar">
      <div class="fallback">${letter}</div>
    </div>
  `;
}

function buildIconButton(iconSrc, altText, extraClass, action) {
  return `
    <button class="action-btn icon-btn ${extraClass}" ${action} title="${escapeHTML(altText)}" aria-label="${escapeHTML(altText)}" type="button">
      <img
        src="${escapeHTML(iconSrc)}"
        alt="${escapeHTML(altText)}"
        onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${escapeHTML(altText)}</span>';"
      />
      <span>${escapeHTML(altText)}</span>
    </button>
  `;
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function startCountdownRefresh() {
  setInterval(() => {
    renderAccountsTable();
    renderRenewals();
    renderDashboard();
  }, 60000);
}

function updateGananciaField() {
  const compra = Number(precioCompraInput?.value || 0);
  const venta = Number(precioVentaInput?.value || 0);
  return venta - compra;
}

function resetFormState() {
  if (editId) editId.value = "";
  if (submitBtn) submitBtn.textContent = "Guardar cuenta";
  accountForm?.reset();
}

function addOneMonthKeepingDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  const targetMonth = base.getMonth() + 1;
  const targetYear = base.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;

  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const finalDay = Math.min(day, lastDayOfTargetMonth);

  const result = new Date(targetYear, normalizedMonth, finalDay);
  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, "0");
  const d = String(result.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/* =========================================================
   DASHBOARD
========================================================= */
function renderDashboard() {
  const total = cuentas.length;

  const porVencer = cuentas.filter((c) => {
    const d = diffDays(c.expira);
    return d >= 0 && d <= 3;
  }).length;

  const vencidas = cuentas.filter((c) => diffDays(c.expira) < 0).length;
  const activas = total - porVencer - vencidas;

  const ganancias = cuentas.reduce((sum, c) => sum + Number(c.ganancia || 0), 0);

  if (statTotal) statTotal.textContent = total;
  if (statPorVencer) statPorVencer.textContent = porVencer;
  if (statVencidas) statVencidas.textContent = vencidas;
  if (statIngresos) statIngresos.textContent = formatCurrency(ganancias);

  if (labelActivas) labelActivas.textContent = activas;
  if (labelWarning) labelWarning.textContent = porVencer;
  if (labelDanger) labelDanger.textContent = vencidas;

  const activePercent = total ? (activas / total) * 100 : 0;
  const warningPercent = total ? (porVencer / total) * 100 : 0;
  const dangerPercent = total ? (vencidas / total) * 100 : 0;

  if (barActivas) barActivas.style.width = `${activePercent}%`;
  if (barWarning) barWarning.style.width = `${warningPercent}%`;
  if (barDanger) barDanger.style.width = `${dangerPercent}%`;

  renderDashboardRenewals();
}

function renderDashboardRenewals() {
  if (!dashboardRenovaciones) return;

  const upcoming = sortByExpiryAscending(
    cuentas.filter((c) => diffDays(c.expira) <= 5)
  ).slice(0, 5);

  if (!upcoming.length) {
    dashboardRenovaciones.innerHTML = `
      <div class="mini-item">
        <strong>Sin alertas</strong>
        <span>No hay cuentas cercanas a vencer.</span>
      </div>
    `;
    return;
  }

  dashboardRenovaciones.innerHTML = upcoming.map((account) => {
    const remaining = getRemainingTime(account.expira);

    return `
      <div class="mini-item">
        <strong>${escapeHTML(account.servicio)} - ${escapeHTML(account.cliente)}</strong>
        <span>${remaining.text}</span>
      </div>
    `;
  }).join("");
}

/* =========================================================
   TABLA DE CUENTAS
========================================================= */
function renderAccountsTable() {
  if (!tablaCuentas || !tableCountBadge) return;

  const filtered = sortByExpiryAscending(getFilteredAccounts());

  tableCountBadge.textContent = `${filtered.length} registro${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    tablaCuentas.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            No se encontraron cuentas con ese filtro o búsqueda.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tablaCuentas.innerHTML = filtered.map((account) => {
    const status = getStatusInfo(account.expira);
    const remaining = getRemainingTime(account.expira);

    return `
      <tr>
        <td>
          <div class="service-cell">
            ${buildAvatarHTML(account)}
            <div class="service-info">
              <strong>${escapeHTML(account.servicio)}</strong>
              <span>${escapeHTML(account.correo)}</span>
            </div>
          </div>
        </td>

        <td>
          <strong>${escapeHTML(account.cliente)}</strong>
        </td>

        <td>
          <div class="actions-group">
            ${buildIconButton(ICONS.ver, "Ver", "btn-view", `onclick="verCuenta('${account.id}')"`) }
          </div>
        </td>

        <td>
          <span class="price-tag">${formatCurrency(account.precioVenta)}</span>
        </td>

        <td>${escapeHTML(account.expira)}</td>

        <td>
          <span class="${status.className}">
            ${remaining.text}
          </span>
        </td>

        <td>
          <div class="actions-group">
            ${buildIconButton(ICONS.renovar, "Renovar", "btn-renew", `onclick="renovarCuenta('${account.id}')"`) }
            ${buildIconButton(ICONS.eliminar, "Eliminar", "btn-delete", `onclick="eliminarCuenta('${account.id}')"`) }
            ${buildIconButton(ICONS.whatsapp, "WhatsApp", "btn-whatsapp", `onclick="enviarWhatsApp('${account.id}', false)"`) }
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* =========================================================
   RENOVACIONES
========================================================= */
function renderRenewals() {
  if (!listaRenovaciones) return;

  const filtered = sortByExpiryAscending(
    cuentas.filter((account) => {
      const days = diffDays(account.expira);
      const searchable = [
        account.servicio,
        account.cliente,
        account.correo
      ].join(" ").toLowerCase();

      return days <= 5 && searchable.includes(currentSearch);
    })
  );

  if (!filtered.length) {
    listaRenovaciones.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        No hay renovaciones cercanas registradas.
      </div>
    `;
    return;
  }

  listaRenovaciones.innerHTML = filtered.map((account) => {
    const status = getStatusInfo(account.expira);
    const remaining = getRemainingTime(account.expira);

    return `
      <article class="renew-card compact-renew-card">
        <div class="renew-top">
          <div style="display:flex; gap:12px; align-items:center;">
            ${buildAvatarHTML(account)}
            <div>
              <h3>${escapeHTML(account.servicio)}</h3>
              <span>${escapeHTML(account.cliente)}</span>
            </div>
          </div>
          <span class="${status.className}">
            ${status.label}
          </span>
        </div>

        <div class="renew-info compact-info">
          <div class="renew-line">
            <span>Expira</span>
            <b>${escapeHTML(account.expira)}</b>
          </div>
          <div class="renew-line">
            <span>Restante</span>
            <b>${remaining.text}</b>
          </div>
        </div>

        <div class="renew-actions">
          ${buildIconButton(ICONS.whatsapp, "WhatsApp", "btn-whatsapp", `onclick="enviarWhatsApp('${account.id}', true)"`) }
          ${buildIconButton(ICONS.renovar, "Renovar", "btn-renew", `onclick="renovarCuenta('${account.id}')"`) }
          ${buildIconButton(ICONS.eliminar, "Eliminar", "btn-delete", `onclick="eliminarCuenta('${account.id}')"`) }
        </div>
      </article>
    `;
  }).join("");
}

/* =========================================================
   CRUD
========================================================= */
async function handleCreateOrUpdateAccount(event) {
  event.preventDefault();

  if (!cuentasRef) {
    showToast("Debes iniciar sesión.");
    return;
  }

  const precioCompra = Number(precioCompraInput?.value || 0);
  const precioVenta = Number(precioVentaInput?.value || 0);
  const ganancia = precioVenta - precioCompra;

const data = {
  servicio: servicioInput?.value.trim() || "",
  cliente: clienteInput?.value.trim() || "",
  correo: correoInput?.value.trim() || "",
  contrasena: contrasenaInput?.value.trim() || "",
  perfil: perfilInput?.value.trim() || "",
  pin: pinInput?.value.trim() || "",
  nota: notaInput?.value.trim() || "",
  precioCompra,
  precioVenta,
  ganancia,
  expira: expiraInput?.value || "",
  telefono: telefonoInput?.value.trim() || ""
};

  if (!data.servicio || !data.cliente || !data.correo || !data.contrasena || !data.perfil || !data.expira || !data.telefono) {
    showToast("Completa todos los campos obligatorios.");
    return;
  }

  try {
    const editingId = editId?.value?.trim();

    if (editingId) {
      await updateDoc(doc(cuentasRef, editingId), data);
      showToast("Cuenta actualizada correctamente.");
    } else {
      await addDoc(cuentasRef, {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast("Cuenta agregada correctamente.");
    }

    resetFormState();
    activateSection("cuentas");
  } catch (error) {
    console.error("Error guardando cuenta:", error);
    showToast("No se pudo guardar la cuenta.");
  }
}

function editarCuenta(id) {
  const account = cuentas.find((c) => c.id === id);
  if (!account) return;

  servicioInput.value = account.servicio || "";
  clienteInput.value = account.cliente || "";
  correoInput.value = account.correo || "";
  contrasenaInput.value = account.contrasena || "";
  perfilInput.value = account.perfil || "";
  pinInput.value = account.pin || "";
  telefonoInput.value = account.telefono || "";
  precioCompraInput.value = account.precioCompra ?? "";
  precioVentaInput.value = account.precioVenta ?? "";
  expiraInput.value = account.expira || "";
  notaInput.value = account.nota || "";

  editId.value = account.id;
  submitBtn.textContent = "Actualizar cuenta";
  updateGananciaField();
  activateSection("agregar");
  showToast("Editando cuenta.");
}

async function eliminarCuenta(id) {
  if (!cuentasRef) return;

  const account = cuentas.find((c) => c.id === id);
  if (!account) return;

  const ok = confirm(`¿Eliminar la cuenta de ${account.cliente} - ${account.servicio}?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(cuentasRef, id));
    showToast("Cuenta eliminada.");
  } catch (error) {
    console.error("Error eliminando cuenta:", error);
    showToast("No se pudo eliminar la cuenta.");
  }
}

async function renovarCuenta(id) {
  if (!cuentasRef) return;

  const account = cuentas.find((c) => c.id === id);
  if (!account) return;

  const nuevaFecha = addOneMonthKeepingDay(account.expira);

  try {
    await updateDoc(doc(cuentasRef, id), {
      expira: nuevaFecha
    });

    showToast(`Cuenta renovada: ${account.servicio} - ${account.cliente}`);
  } catch (error) {
    console.error("Error renovando cuenta:", error);
    showToast("No se pudo renovar la cuenta.");
  }
}

/* =========================================================
   MODAL
========================================================= */
function verCuenta(id) {
  const account = cuentas.find((c) => c.id === id);
  if (!account || !detalleCuenta || !modal) return;

  detalleCuenta.innerHTML = `
    <div class="simple-detail">
      <div class="simple-detail-title">${escapeHTML(account.servicio)}</div>

      <div style="display:flex; justify-content:center; margin-bottom:10px;">
        ${buildAvatarHTML(account)}
      </div>

      <div class="detail-row">
        <span>Cliente</span>
        <b>${escapeHTML(account.cliente)}</b>
      </div>

      <div class="detail-row">
        <span>Correo</span>
        <b>${escapeHTML(account.correo)}</b>
      </div>

      <div class="detail-row">
        <span>Perfil</span>
        <b>${escapeHTML(account.perfil)}</b>
      </div>

      <div class="detail-row">
        <span>PIN</span>
        <b>${escapeHTML(account.pin || "-")}</b>
      </div>

      <div class="detail-row">
        <span>Contraseña</span>
        <div class="detail-password">
          <b id="passwordText">••••••••••</b>
          <button class="toggle-pass-btn" type="button" onclick="togglePasswordView('${escapeHTML(account.contrasena)}')">
            Ver
          </button>
        </div>
      </div>

      <div class="detail-row">
        <span>Expira</span>
        <b>${escapeHTML(account.expira)}</b>
      </div>

      <div class="detail-row">
        <span>WhatsApp</span>
        <b>${escapeHTML(account.telefono)}</b>
      </div>

      <div class="detail-row">
        <span>Precio compra</span>
        <b>${formatCurrency(account.precioCompra)}</b>
      </div>

      <div class="detail-row">
        <span>Precio venta</span>
        <b>${formatCurrency(account.precioVenta)}</b>
      </div>

      <div class="detail-row">
        <span>Ganancia</span>
        <b>${formatCurrency(account.ganancia)}</b>
      </div>

      <div class="detail-row">
        <span>Nota</span>
        <b>${escapeHTML(account.nota || "-")}</b>
      </div>

      <div style="margin-top:16px; display:flex; justify-content:center;">
        <button class="primary-btn" type="button" onclick="editarDesdeModal('${account.id}')">
          Editar cuenta
        </button>
      </div>
    </div>
  `;

  modal.classList.add("show");
}

function editarDesdeModal(id) {
  closeModal();
  editarCuenta(id);
}

function togglePasswordView(password) {
  const passwordText = document.getElementById("passwordText");
  const toggleBtn = document.querySelector(".toggle-pass-btn");
  if (!passwordText || !toggleBtn) return;

  const isHidden = passwordText.textContent.includes("•");

  if (isHidden) {
    passwordText.textContent = password;
    toggleBtn.textContent = "Ocultar";
  } else {
    passwordText.textContent = "••••••••••";
    toggleBtn.textContent = "Ver";
  }
}

function closeModal() {
  modal?.classList.remove("show");
}

/* =========================================================
   WHATSAPP
========================================================= */
function enviarWhatsApp(id, esRenovacion) {
  const account = cuentas.find((c) => c.id === id);
  if (!account) return;

  let mensaje = "";

  if (esRenovacion) {
    mensaje =
      `👋 Hola ${account.cliente}!\n\n` +
      `Espero que estés teniendo un excelente día 😊\n\n` +
      `📺 Te escribo porque tu cuenta de *${account.servicio}* está próxima a vencer ⏳\n\n` +
      `📧 Correo asociado: ${account.correo}\n\n` +
      `✨ Al renovar tu cuenta mantienes todos tus beneficios:\n` +
      `✔ Tu perfil personalizado\n` +
      `✔ Historial de reproducciones\n` +
      `✔ Series y películas guardadas\n\n` +
      `💡 Es decir, no perderás nada de tu contenido ni configuraciones 😉\n\n` +
      `🚀 La renovación es rápida y sin interrupciones.\n` +
      `Puedo ayudarte a activarla de inmediato.\n\n` +
      `💬 Solo respóndeme este mensaje y lo hacemos en minutos.\n\n` +
      `🙏 Gracias por confiar en nuestro servicio.\n` +
      `¡Quedo atento a tu confirmación! 🙌`;
  } else {
    mensaje =
      `👋 Hola ${account.cliente}!\n\n` +
      `Espero que te encuentres muy bien 😊\n\n` +
      `📺 Te escribo con respecto a tu cuenta de *${account.servicio}*.\n\n` +
      `📅 Fecha de expiración: ${account.expira}\n` +
      `📧 Correo asociado: ${account.correo}\n\n` +
      `💡 Si deseas renovarla, hacer algún cambio o tienes alguna consulta, con gusto puedo ayudarte.\n\n` +
      `🚀 Estoy disponible para asistirte en cualquier momento.\n\n` +
      `💬 Quedo atento a tu mensaje 😊`;
  }

  const phone = String(account.telefono).replace(/\D/g, "");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
}

/* =========================================================
   EXPONER FUNCIONES
========================================================= */
window.verCuenta = verCuenta;
window.editarCuenta = editarCuenta;
window.eliminarCuenta = eliminarCuenta;
window.renovarCuenta = renovarCuenta;
window.enviarWhatsApp = enviarWhatsApp;
window.togglePasswordView = togglePasswordView;
window.editarDesdeModal = editarDesdeModal;
