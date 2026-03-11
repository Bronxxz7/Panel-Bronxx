import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc,
  collection, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp
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
const fs = getFirestore(app);

const $ = (id) => document.getElementById(id);

/* =======================
   HELPERS
======================= */
function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

function fmt0(n) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(msg) {
  const elToast = $("toast");
  const elMsg = $("toastMsg");
  if (!elToast || !elMsg) return;

  elMsg.textContent = msg;
  elToast.style.display = "flex";

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    elToast.style.display = "none";
  }, 3200);
}

$("toastX")?.addEventListener("click", () => {
  if ($("toast")) $("toast").style.display = "none";
});

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function daysUntil(dateISO) {
  if (!dateISO) return null;
  const target = new Date(`${dateISO}T00:00:00`);
  const today = new Date(`${todayISO()}T00:00:00`);
  return Math.floor((target - today) / (1000 * 60 * 60 * 24));
}

function addDaysISO(dateISO, days) {
  if (!dateISO) return "";
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isIPTVCategory(cat) {
  return String(cat || "").trim().toUpperCase() === "IPTV";
}

function endOfDayISO(dateISO) {
  if (!dateISO) return null;
  return new Date(`${dateISO}T23:59:59`);
}

function timeLeftLabel(dateISO) {
  const end = endOfDayISO(dateISO);
  if (!end) return "—";

  const now = new Date();
  let diff = end.getTime() - now.getTime();
  const past = diff < 0;
  diff = Math.abs(diff);

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const base = `${days}d ${hours}h`;
  return past ? `VENCIDA ${base}` : base;
}

function tsToISO(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return null;
}

function normalizeCategoryName(cat) {
  const value = String(cat || "").trim().toLowerCase();

  const map = {
    "netflix": "Netflix",
    "hbo": "HBO",
    "max": "HBO",
    "disney": "Disney",
    "disney+": "Disney",
    "prime": "Prime Video",
    "prime video": "Prime Video",
    "amazon prime": "Prime Video",
    "yt premium": "YouTube Premium",
    "youtube premium": "YouTube Premium",
    "spotify": "Spotify",
    "crunchyroll": "Crunchyroll",
    "paramount": "Paramount",
    "paramount+": "Paramount",
    "vix": "ViX",
    "canva": "Canva",
    "iptv": "IPTV"
  };

  return map[value] || String(cat || "").trim();
}

function getRenewalStatus(a) {
  const d = daysUntil(a.expire);
  if (d === null) return null;
  if (d < 0) return "EXPIRED";

  const alertDays = +a.alertDays || 0;
  if (d <= alertDays) return "SOON";

  return "OK";
}

function getValue(id, fallback = "") {
  const el = $(id);
  return el ? el.value : fallback;
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

function buildPlanLines(a) {
  const lines = [];

  if (a.accountName) lines.push(a.accountName);
  else if (a.plan) lines.push(a.plan);
  else if (a.notes) lines.push(...String(a.notes).trim().split(/\n+/).slice(0, 4));
  else lines.push(normalizeCategoryName(a.category) || "Cuenta");

  return lines.join("\n");
}

function formatExpireDisplay(dateISO) {
  if (!dateISO) return "—";
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

function getAccountDisplayName(a) {
  if (a.accountName?.trim()) return a.accountName.trim();
  if (a.email?.trim()) return a.email.trim();
  if (a.user?.trim()) return a.user.trim();
  if (a.plan?.trim()) return a.plan.trim();
  return "—";
}

function getClientDisplayName(a) {
  return String(a.profileName || "").trim() || "—";
}

/* =======================
   STATE
======================= */
let currentUser = null;
let currentProfile = null;
let tenantId = null;

let db = {
  accounts: [],
  expenses: []
};

let unsubAccounts = null;
let unsubExpenses = null;

let editingAccId = null;
let editingExpId = null;
let viewingAccId = null;

let uiToggles = {
  kpis: true,
  charts: true,
  tables: true
};

/* =======================
   AUTH
======================= */
async function doLogin() {
  const email = (getValue("loginEmail") || "").trim();
  const pass = (getValue("loginPass") || "").trim();
  const errEl = $("loginError");

  if (errEl) errEl.textContent = "";

  if (!email || !pass) {
    if (errEl) errEl.textContent = "Completa correo y contraseña.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    console.error("[LOGIN] error:", e);
    const code = e?.code || "";
    const msg =
      code === "auth/invalid-credential" ? "Correo o contraseña incorrectos." :
      code === "auth/user-not-found" ? "Usuario no existe." :
      code === "auth/wrong-password" ? "Contraseña incorrecta." :
      code === "auth/too-many-requests" ? "Demasiados intentos. Espera un momento." :
      `Error: ${code || "desconocido"}`;

    if (errEl) errEl.textContent = msg;
    toast(msg);
  }
}

$("btnLogin")?.addEventListener("click", doLogin);

["loginEmail", "loginPass"].forEach((id) => {
  $(id)?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
});

async function doLogout(ev) {
  if (ev?.preventDefault) ev.preventDefault();
  if (ev?.stopPropagation) ev.stopPropagation();

  try {
    await signOut(auth);
    toast("Sesión cerrada ✅");
    setTimeout(() => location.reload(), 250);
  } catch (e) {
    console.error("[LOGOUT] ERROR:", e);
    toast(`Error logout: ${e?.code || "unknown"}`);
  }
}

["btnLogout", "btnLogoutTop", "btnCloseSession", "logoutBtn"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("click", doLogout, { capture: true });
});

document.addEventListener("click", (e) => {
  const target = e.target?.closest?.("[data-logout]");
  if (target) doLogout(e);
});

/* =======================
   FIRESTORE PROFILE
======================= */
async function loadUserProfile(uid) {
  const ref = doc(fs, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

function subscribeTenantData(tid) {
  tenantId = tid;

  if (unsubAccounts) unsubAccounts();
  if (unsubExpenses) unsubExpenses();

  unsubAccounts = null;
  unsubExpenses = null;

  const accRef = collection(fs, "tenants", tid, "accounts");
  const accQ = query(accRef, orderBy("updatedAt", "desc"));

  unsubAccounts = onSnapshot(
    accQ,
    (ss) => {
      db.accounts = ss.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    },
    (err) => {
      console.error("Accounts snapshot error:", err);
      toast("Error cargando cuentas.");
    }
  );

  const expRef = collection(fs, "tenants", tid, "expenses");
  const expQ = query(expRef, orderBy("updatedAt", "desc"));

  unsubExpenses = onSnapshot(
    expQ,
    (ss) => {
      db.expenses = ss.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    },
    (err) => {
      console.error("Expenses snapshot error:", err);
      toast("Error cargando gastos.");
    }
  );
}

function unsubscribeAll() {
  if (unsubAccounts) unsubAccounts();
  if (unsubExpenses) unsubExpenses();
  unsubAccounts = null;
  unsubExpenses = null;
  db = { accounts: [], expenses: [] };
  tenantId = null;
}

onAuthStateChanged(auth, async (u) => {
  currentUser = u;

  if (!u) {
    unsubscribeAll();
    if ($("loginScreen")) $("loginScreen").style.display = "flex";
    renderAll();
    return;
  }

  if ($("loginScreen")) $("loginScreen").style.display = "none";

  let profile = null;
  try {
    profile = await loadUserProfile(u.uid);
  } catch (e) {
    console.error("Profile load error:", e);
  }

  currentProfile = profile || { role: "user", name: "", tenantId: u.uid };
  subscribeTenantData(currentProfile.tenantId || u.uid);
  toast("Sesión iniciada ✅");
});

/* =======================
   SIDE MENU
======================= */
function setupSideMenu() {
  const btnMenu = $("btnMenu");
  const overlay = $("sideMenu");
  const btnClose = $("btnCloseMenu");

  if (!btnMenu || !overlay) return;

  const openMenu = () => overlay.classList.add("open");
  const closeMenu = () => overlay.classList.remove("open");

  btnMenu.addEventListener("click", openMenu);
  btnClose?.addEventListener("click", closeMenu);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMenu();
  });

  overlay.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      if (!target) return;
      openTab(target);
      closeMenu();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

setupSideMenu();

/* =======================
   TABS
======================= */
function openTab(targetId) {
  document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
  const btn = document.querySelector(`.tab[data-tab="${targetId}"]`);
  if (btn) btn.classList.add("active");

  document.querySelectorAll(".tabPage").forEach((p) => p.classList.add("hidden"));
  document.getElementById(targetId)?.classList.remove("hidden");

  renderAll();
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => openTab(btn.dataset.tab));
});

/* =======================
   DASHBOARD TOGGLES
======================= */
function applyToggles() {
  $("kpiPanel")?.classList.toggle("hidden", !uiToggles.kpis);
  $("chartPanel")?.classList.toggle("hidden", !uiToggles.charts);
  $("tablePanel")?.classList.toggle("hidden", !uiToggles.tables);
}

function toggleKpis() {
  uiToggles.kpis = !uiToggles.kpis;
  applyToggles();
}

function toggleCharts() {
  uiToggles.charts = !uiToggles.charts;
  applyToggles();
}

function toggleTables() {
  uiToggles.tables = !uiToggles.tables;
  applyToggles();
}

$("btnToggleKpis")?.addEventListener("click", toggleKpis);
$("btnToggleCharts")?.addEventListener("click", toggleCharts);
$("btnToggleTables")?.addEventListener("click", toggleTables);

$("btnToggleKpisSide")?.addEventListener("click", toggleKpis);
$("btnToggleChartsSide")?.addEventListener("click", toggleCharts);
$("btnToggleTablesSide")?.addEventListener("click", toggleTables);

applyToggles();

/* =======================
   MODELS
======================= */
function blankAccount() {
  return {
    category: "",
    profileName: "",
    phone: "",
    profiles: 1,

    pin: "",
    email: "",
    pass: "",
    accountName: "",

    user: "",
    iptvPass: "",
    url: "",
    plan: "",

    provider: "",
    buyPrice: 0,
    sellPrice: 0,
    expire: "",
    alertDays: 3,

    collect: "NO",
    tag: "",
    notes: "",

    createdAt: null,
    updatedAt: null,
    createdBy: null
  };
}

function blankExpense() {
  return {
    date: todayISO(),
    category: "",
    provider: "",
    note: "",
    amount: 0,

    createdAt: null,
    updatedAt: null,
    createdBy: null
  };
}

/* =======================
   FIRESTORE CRUD
======================= */
function requireTenant() {
  if (!tenantId) {
    toast("No hay tenant cargado.");
    return false;
  }
  if (!currentUser) {
    toast("No has iniciado sesión.");
    return false;
  }
  return true;
}

async function addAccountFirestore(a) {
  if (!requireTenant()) return;
  const ref = collection(fs, "tenants", tenantId, "accounts");
  a.createdAt = serverTimestamp();
  a.updatedAt = serverTimestamp();
  a.createdBy = currentUser.uid;
  await addDoc(ref, a);
}

async function updateAccountFirestore(id, patch) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "accounts", id);
  patch.updatedAt = serverTimestamp();
  await updateDoc(ref, patch);
}

async function deleteAccountFirestore(id) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "accounts", id);
  await deleteDoc(ref);
}

async function renewAccountFirestore(id, currentExpire) {
  if (!requireTenant()) return;
  if (!currentExpire) {
    toast("Esta cuenta no tiene expiración.");
    return;
  }
  const ref = doc(fs, "tenants", tenantId, "accounts", id);
  const newExpire = addDaysISO(currentExpire, 30);
  await updateDoc(ref, {
    expire: newExpire,
    updatedAt: serverTimestamp()
  });
}

async function addExpenseFirestore(e) {
  if (!requireTenant()) return;
  const ref = collection(fs, "tenants", tenantId, "expenses");
  e.createdAt = serverTimestamp();
  e.updatedAt = serverTimestamp();
  e.createdBy = currentUser.uid;
  await addDoc(ref, e);
}

async function updateExpenseFirestore(id, patch) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "expenses", id);
  patch.updatedAt = serverTimestamp();
  await updateDoc(ref, patch);
}

async function deleteExpenseFirestore(id) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "expenses", id);
  await deleteDoc(ref);
}

/* =======================
   ACCOUNT MODAL
======================= */
function syncCategoryUI() {
  const cat = $("mCategory")?.value;
  const iptv = isIPTVCategory(cat);
  $("boxIPTV")?.classList.toggle("hidden", !iptv);
  $("boxStreaming")?.classList.toggle("hidden", iptv);
}

$("mCategory")?.addEventListener("input", syncCategoryUI);

function openAccModal(title) {
  if ($("modalAccTitle")) $("modalAccTitle").textContent = title;
  if ($("modalAccBack")) $("modalAccBack").style.display = "flex";
  syncCategoryUI();
}

function closeAccModal() {
  if ($("modalAccBack")) $("modalAccBack").style.display = "none";
  editingAccId = null;
}

$("btnAccClose")?.addEventListener("click", closeAccModal);
$("modalAccBack")?.addEventListener("click", (e) => {
  if (e.target.id === "modalAccBack") closeAccModal();
});

function setAccModalFromRow(a) {
  setValue("mCategory", a.category || "");
  setValue("mName", a.profileName || "");
  setValue("mPhone", a.phone || "");
  setValue("mProfiles", a.profiles ?? 1);

  setValue("mPin", a.pin || "");
  setValue("mEmail", a.email || "");
  setValue("mPass", a.pass || "");
  setValue("mAccountName", a.accountName || "");

  setValue("mUser", a.user || "");
  setValue("mIptvPass", a.iptvPass || "");
  setValue("mUrl", a.url || "");
  setValue("mPlan", a.plan || "");

  setValue("mProvider", a.provider || "");
  setValue("mBuyPrice", a.buyPrice ?? 0);
  setValue("mSellPrice", a.sellPrice ?? 0);
  setValue("mExpire", a.expire || "");
  setValue("mAlertDays", a.alertDays ?? 3);

  setValue("mTag", a.tag || "");
  setValue("mNotes", a.notes || "");

  syncCategoryUI();
}

function getAccRowFromModal(base) {
  const a = base ? { ...base } : blankAccount();

  a.category = normalizeCategoryName(String(getValue("mCategory", "")).trim());
  a.profileName = String(getValue("mName", "")).trim();
  a.phone = String(getValue("mPhone", "")).trim();
  a.profiles = Math.max(0, +(getValue("mProfiles", 0)) || 0);

  a.pin = String(getValue("mPin", "")).trim();
  a.email = String(getValue("mEmail", "")).trim();
  a.pass = String(getValue("mPass", "")).trim();
  a.accountName = String(getValue("mAccountName", "")).trim();

  a.user = String(getValue("mUser", "")).trim();
  a.iptvPass = String(getValue("mIptvPass", "")).trim();
  a.url = String(getValue("mUrl", "")).trim();
  a.plan = String(getValue("mPlan", "")).trim();

  a.provider = String(getValue("mProvider", "")).trim();
  a.buyPrice = Math.max(0, +(getValue("mBuyPrice", 0)) || 0);
  a.sellPrice = Math.max(0, +(getValue("mSellPrice", 0)) || 0);
  a.expire = getValue("mExpire", "");
  a.alertDays = Math.max(0, +(getValue("mAlertDays", 0)) || 0);

  a.tag = String(getValue("mTag", "")).trim();
  a.notes = String(getValue("mNotes", "")).trim();

  return a;
}

function validateAccount(a) {
  if (!a.category) return "Falta categoría.";
  if (!a.profileName) return "Falta cliente.";
  if (a.sellPrice < 0 || a.buyPrice < 0) return "Precios inválidos.";

  if (isIPTVCategory(a.category)) {
    if (!a.user) return "En IPTV falta Usuario.";
    if (!a.url) return "En IPTV falta URL.";
    if (!a.iptvPass) return "En IPTV falta Clave.";
  } else {
    if (!a.email && !a.user && !a.accountName) return "Falta una cuenta válida.";
    if (!a.pass && !a.iptvPass) return "Falta clave.";
  }

  return null;
}

/* =======================
   EXPENSE MODAL
======================= */
function openExpModal(title) {
  if ($("modalExpTitle")) $("modalExpTitle").textContent = title;
  if ($("modalExpBack")) $("modalExpBack").style.display = "flex";
}

function closeExpModal() {
  if ($("modalExpBack")) $("modalExpBack").style.display = "none";
  editingExpId = null;
}

$("btnExpClose")?.addEventListener("click", closeExpModal);
$("modalExpBack")?.addEventListener("click", (e) => {
  if (e.target.id === "modalExpBack") closeExpModal();
});

function setExpModalFromRow(e) {
  setValue("eDate", e.date || todayISO());
  setValue("eCategory", e.category || "");
  setValue("eProvider", e.provider || "");
  setValue("eAmount", e.amount ?? 0);
  setValue("eNote", e.note || "");
}

function getExpRowFromModal(base) {
  const e = base ? { ...base } : blankExpense();
  e.date = getValue("eDate", todayISO()) || todayISO();
  e.category = String(getValue("eCategory", "")).trim();
  e.provider = String(getValue("eProvider", "")).trim();
  e.amount = Math.max(0, +(getValue("eAmount", 0)) || 0);
  e.note = String(getValue("eNote", "")).trim();
  return e;
}

function validateExpense(e) {
  if (!e.date) return "Falta fecha.";
  if (!e.category) return "Falta categoría del gasto.";
  if (!(e.amount > 0)) return "Monto debe ser mayor a 0.";
  return null;
}

/* =======================
   NEW / SAVE BUTTONS
======================= */
$("btnNewAccount")?.addEventListener("click", () => {
  editingAccId = null;
  setAccModalFromRow(blankAccount());
  openAccModal("Nueva cuenta");
});

$("btnNewExpense")?.addEventListener("click", () => {
  editingExpId = null;
  setExpModalFromRow(blankExpense());
  openExpModal("Nuevo gasto");
});

$("btnAccSave")?.addEventListener("click", async () => {
  const base = editingAccId ? db.accounts.find((x) => x.id === editingAccId) : null;
  const a = getAccRowFromModal(base);
  const err = validateAccount(a);
  if (err) return toast(err);

  try {
    if (!editingAccId) {
      await addAccountFirestore(a);
    } else {
      await updateAccountFirestore(editingAccId, a);
    }

    closeAccModal();
    toast("Cuenta guardada ✅");
  } catch (e) {
    console.error("Save account error:", e);
    toast("Error guardando cuenta.");
  }
});

$("btnExpSave")?.addEventListener("click", async () => {
  const base = editingExpId ? db.expenses.find((x) => x.id === editingExpId) : null;
  const e = getExpRowFromModal(base);
  const err = validateExpense(e);
  if (err) return toast(err);

  try {
    if (!editingExpId) {
      await addExpenseFirestore(e);
    } else {
      await updateExpenseFirestore(editingExpId, e);
    }

    closeExpModal();
    toast("Gasto guardado ✅");
  } catch (er) {
    console.error("Save expense error:", er);
    toast("Error guardando gasto.");
  }
});

/* =======================
   WHATSAPP
======================= */
function buildWhatsAppMessage(a) {
  const cat = a.category || "Cuenta";
  const exp = a.expire ? formatExpireDisplay(a.expire) : "—";
  const d = daysUntil(a.expire);
  const daysTxt = d === null ? "—" : `${d} día(s)`;

  const access = isIPTVCategory(a.category)
    ? `Usuario: ${a.user || "—"}\nClave: ${a.iptvPass || "—"}\nURL: ${a.url || "—"}`
    : `Cuenta: ${a.accountName || a.email || a.user || "—"}\nClave: ${a.pass || "—"}\nPIN: ${a.pin || "—"}`;

  let msg = `Hola ${a.profileName || ""} 👋
📌 Plataforma: ${cat}
💰 Precio: ${fmt(+a.sellPrice || 0, 2)}
📅 Expira: ${exp} (faltan: ${daysTxt})

🔑 Datos:
${access}

✅ Si deseas renovar tu ${cat}, respóndeme "RENOVAR".`;

  if (a.notes) msg += `\n\n📝 Nota: ${a.notes}`;
  return msg;
}

function openWhatsApp(a) {
  const phone = normalizePhone(a.phone);
  if (!phone) return toast("No hay celular válido para WhatsApp.");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(a))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* =======================
   VIEW MODAL
======================= */
function openViewModal(accId) {
  const a = db.accounts.find((x) => x.id === accId);
  if (!a) return;

  viewingAccId = accId;
  const d = daysUntil(a.expire);
  const profit = (+a.sellPrice || 0) - (+a.buyPrice || 0);

  const accessBlock = isIPTVCategory(a.category)
    ? `<div class="subcard glass2">
        <b>Acceso IPTV</b>
        <div class="divider"></div>
        <div class="small"><span class="muted">Cliente:</span> ${escapeHtml(a.profileName || "")}</div>
        <div class="small"><span class="muted">Usuario:</span> ${escapeHtml(a.user || "")}</div>
        <div class="small"><span class="muted">Clave:</span> ${escapeHtml(a.iptvPass || "")}</div>
        <div class="small"><span class="muted">URL:</span> ${escapeHtml(a.url || "")}</div>
        <div class="small"><span class="muted">Plan:</span> ${escapeHtml(a.plan || "")}</div>
      </div>`
    : `<div class="subcard glass2">
        <b>Acceso Streaming</b>
        <div class="divider"></div>
        <div class="small"><span class="muted">Cliente:</span> ${escapeHtml(a.profileName || "")}</div>
        <div class="small"><span class="muted">Cuenta:</span> ${escapeHtml(getAccountDisplayName(a))}</div>
        <div class="small"><span class="muted">Clave:</span> ${escapeHtml(a.pass || "")}</div>
        <div class="small"><span class="muted">PIN:</span> ${escapeHtml(a.pin || "")}</div>
      </div>`;

  if ($("modalViewBody")) {
    $("modalViewBody").innerHTML = `
      <div class="row">
        <div class="subcard glass2">
          <b>${escapeHtml(a.category || "Cuenta")}</b>
          <div class="small muted">${escapeHtml(a.tag || "")}</div>
          <div class="divider"></div>
          <div class="small"><span class="muted">Cliente:</span> ${escapeHtml(a.profileName || "")}</div>
          <div class="small"><span class="muted">WhatsApp:</span> ${escapeHtml(a.phone || "")}</div>
          <div class="small"><span class="muted">Proveedor:</span> ${escapeHtml(a.provider || "")}</div>
        </div>

        <div class="subcard glass2">
          <b>Finanzas</b>
          <div class="divider"></div>
          <div class="small"><span class="muted">Costo:</span> ${fmt(+a.buyPrice || 0, 2)}</div>
          <div class="small"><span class="muted">Venta:</span> ${fmt(+a.sellPrice || 0, 2)}</div>
          <div class="small"><span class="muted">Ganancia:</span> ${fmt(profit, 2)}</div>
          <div class="divider"></div>
          <div class="small"><span class="muted">Expira:</span> ${escapeHtml(formatExpireDisplay(a.expire) || "—")}</div>
          <div class="small"><span class="muted">Días:</span> ${d === null ? "—" : fmt0(d)}</div>
          <div class="small"><span class="muted">Cuenta atrás:</span> ${escapeHtml(timeLeftLabel(a.expire))}</div>
        </div>
      </div>

      ${accessBlock}

      <div class="subcard glass2">
        <b>Notas</b>
        <div class="divider"></div>
        <div class="small">${escapeHtml(a.notes || "—")}</div>
      </div>

      <div class="row">
        <button class="btn" id="btnViewWA" type="button">💬 WhatsApp</button>
        <button class="btn" id="btnViewRenew" type="button">🔁 Renovar +30 días</button>
        <button class="btn danger" id="btnViewDelete" type="button">🗑️ Eliminar</button>
      </div>
    `;
  }

  if ($("modalViewBack")) $("modalViewBack").style.display = "flex";

  $("btnViewWA")?.addEventListener("click", () => openWhatsApp(a), { once: true });
  $("btnViewRenew")?.addEventListener("click", async () => {
    await renewAccountFirestore(a.id, a.expire);
    toast("Renovado +30 días ✅");
  }, { once: true });
  $("btnViewDelete")?.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    await deleteAccountFirestore(a.id);
    toast("Cuenta eliminada ✅");
    closeViewModal();
  }, { once: true });
}

function closeViewModal() {
  if ($("modalViewBack")) $("modalViewBack").style.display = "none";
  viewingAccId = null;
}

$("btnViewClose")?.addEventListener("click", closeViewModal);
$("modalViewBack")?.addEventListener("click", (e) => {
  if (e.target.id === "modalViewBack") closeViewModal();
});

$("btnViewEdit")?.addEventListener("click", () => {
  if (!viewingAccId) return;
  const row = db.accounts.find((x) => x.id === viewingAccId);
  if (!row) return;

  closeViewModal();
  editingAccId = row.id;
  setAccModalFromRow(row);
  openAccModal("Editar cuenta");
});

/* =======================
   FILTERS
======================= */
function filterAccounts() {
  const q = (getValue("qAcc") || "").trim().toLowerCase();
  const cat = (getValue("fCategoryAcc") || "").trim().toLowerCase();
  const prov = (getValue("fProviderAcc") || "").trim().toLowerCase();
  const exp = getValue("fExpAcc") || "";

  return db.accounts.filter((a) => {
    if (cat && !String(a.category || "").toLowerCase().includes(cat)) return false;
    if (prov && !String(a.provider || "").toLowerCase().includes(prov)) return false;

    if (exp) {
      const status = getRenewalStatus(a);
      if (exp === "EXPIRED" && status !== "EXPIRED") return false;
      if (exp === "SOON" && status !== "SOON") return false;
    }

    if (q) {
      const blob = [
        a.category,
        a.profileName,
        a.phone,
        a.pin,
        a.email,
        a.pass,
        a.user,
        a.iptvPass,
        a.url,
        a.provider,
        a.accountName,
        a.plan,
        a.tag,
        a.notes,
        String(a.buyPrice),
        String(a.sellPrice),
        a.expire
      ].join(" ").toLowerCase();

      if (!blob.includes(q)) return false;
    }

    return true;
  });
}

function filterExpenses() {
  const q = (getValue("qExp") || "").trim().toLowerCase();
  const cat = (getValue("fExpCat") || "").trim().toLowerCase();
  const from = getValue("fExpFrom") || "";
  const to = getValue("fExpTo") || "";

  return db.expenses.filter((x) => {
    if (cat && !String(x.category || "").toLowerCase().includes(cat)) return false;
    if (from && (x.date || "") < from) return false;
    if (to && (x.date || "") > to) return false;

    if (q) {
      const blob = [x.date, x.category, x.provider, x.note, String(x.amount)].join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function filterRenewals() {
  const search = (getValue("renewSearch") || "").trim().toLowerCase();
  const platform = getValue("renewPlatformFilter") || "";
  const status = getValue("renewStatusFilter") || "";

  return db.accounts
    .filter((a) => {
      const renewalStatus = getRenewalStatus(a);
      if (!(renewalStatus === "SOON" || renewalStatus === "EXPIRED")) return false;

      if (platform && normalizeCategoryName(a.category) !== platform) return false;
      if (status && renewalStatus !== status) return false;

      if (search) {
        const blob = [
          a.category,
          a.profileName,
          a.provider,
          a.phone,
          a.email,
          a.user,
          a.notes
        ].join(" ").toLowerCase();

        if (!blob.includes(search)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const da = daysUntil(a.expire);
      const dbb = daysUntil(b.expire);

      if (da === null && dbb === null) return 0;
      if (da === null) return 1;
      if (dbb === null) return -1;
      return da - dbb;
    });
}

["qAcc", "fCategoryAcc", "fProviderAcc", "fExpAcc"].forEach((id) => {
  $(id)?.addEventListener("input", renderAccounts);
  $(id)?.addEventListener("change", renderAccounts);
});

["qExp", "fExpCat", "fExpFrom", "fExpTo"].forEach((id) => {
  $(id)?.addEventListener("input", renderExpenses);
  $(id)?.addEventListener("change", renderExpenses);
});

["renewSearch", "renewPlatformFilter", "renewStatusFilter"].forEach((id) => {
  $(id)?.addEventListener("input", renderRenewals);
  $(id)?.addEventListener("change", renderRenewals);
});

$("aWindow")?.addEventListener("change", renderAnalytics);
$("aMetric")?.addEventListener("change", renderAnalytics);
$("aTopN")?.addEventListener("change", renderAnalytics);

/* =======================
   RENDER ACCOUNTS
======================= */
function countdownPillClass(a) {
  const status = getRenewalStatus(a);
  if (status === "EXPIRED") return "danger";
  if (status === "SOON") return "warn";
  if (status === "OK") return "";
  return "";
}

function renderAccounts() {
  const cards = $("cardsAcc");
  if (!cards) return;

  const list = filterAccounts()
    .slice()
    .sort((a, b) => (a.expire || "9999-12-31").localeCompare(b.expire || "9999-12-31"));

  if ($("countChipAcc")) {
    $("countChipAcc").textContent = `${list.length} cuentas`;
  }

  if (!list.length) {
    cards.innerHTML = `<div class="account-dark-empty">No hay cuentas para mostrar.</div>`;
    return;
  }

  cards.innerHTML = list.map((a) => {
    const category = normalizeCategoryName(a.category || "Cuenta");
    const clientText = getClientDisplayName(a);
    const countdown = timeLeftLabel(a.expire);
    const expireText = formatExpireDisplay(a.expire);
    const priceText = `$${fmt(+a.sellPrice || 0, 2)}`;
    const countdownClass = countdownPillClass(a);

    return `
      <div class="account-dark-row">
        <div class="account-dark-service">${escapeHtml(category)}</div>

        <div class="account-dark-client">${escapeHtml(clientText)}</div>

        <div class="account-dark-view-wrap">
          <button class="account-dark-view" data-act="view" data-id="${a.id}" type="button">
            👁️ Ver cuenta
          </button>
        </div>

        <div class="account-dark-price">${escapeHtml(priceText)}</div>

        <div class="account-dark-expire">${escapeHtml(expireText)}</div>

        <div class="account-dark-countdown ${countdownClass}">
          ${escapeHtml(countdown)}
        </div>

        <div class="account-dark-actions">
          <button class="account-dark-btn renew" data-act="renew" data-id="${a.id}" type="button">
            Renovar
          </button>

          <button
            class="account-dark-btn delete"
            data-act="delete"
            data-id="${a.id}"
            type="button"
            aria-label="Eliminar"
            title="Eliminar"
          >
            🗑️
          </button>

          <button
            class="account-dark-btn whatsapp"
            data-act="wa"
            data-id="${a.id}"
            type="button"
            aria-label="WhatsApp"
            title="WhatsApp"
          >
            <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M19.11 17.41c-.27-.14-1.58-.78-1.82-.87-.24-.09-.42-.14-.6.14-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.13-1.31-.79-.7-1.32-1.56-1.47-1.83-.15-.27-.02-.41.11-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.72.34-.25.27-.94.92-.94 2.24 0 1.32.96 2.59 1.09 2.77.14.18 1.89 2.89 4.58 4.05.64.28 1.15.45 1.54.58.65.21 1.24.18 1.71.11.52-.08 1.58-.65 1.81-1.28.22-.63.22-1.17.16-1.28-.07-.11-.24-.18-.51-.31z"/>
              <path fill="currentColor" d="M16.03 3.2C9.03 3.2 3.35 8.88 3.35 15.88c0 2.23.58 4.4 1.68 6.3L3.2 28.8l6.8-1.78a12.6 12.6 0 0 0 6.03 1.54h.01c7 0 12.68-5.68 12.68-12.69 0-3.39-1.32-6.58-3.72-8.97A12.58 12.58 0 0 0 16.03 3.2zm0 23.2h-.01a10.5 10.5 0 0 1-5.35-1.46l-.38-.23-4.03 1.06 1.08-3.93-.25-.4a10.55 10.55 0 1 1 8.94 4.96z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join("");

  cards.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      const row = db.accounts.find((x) => x.id === id);
      if (!row) return;

      try {
        if (act === "view") {
          openViewModal(id);
        } else if (act === "wa") {
          openWhatsApp(row);
        } else if (act === "renew") {
          await renewAccountFirestore(id, row.expire);
          toast("Renovado +30 días ✅");
        } else if (act === "delete") {
          if (!confirm("¿Eliminar esta cuenta?")) return;
          await deleteAccountFirestore(id);
          toast("Cuenta eliminada 🗑️");
        }
      } catch (e) {
        console.error("Account row action error:", e);
        toast("Ocurrió un error.");
      }
    });
  });
}

/* =======================
   RENDER RENEWALS
======================= */
function createRenewalCardHTML(a) {
  const status = getRenewalStatus(a);
  const category = normalizeCategoryName(a.category || "Cuenta");
  const clientText = getClientDisplayName(a);
  const expireText = formatExpireDisplay(a.expire);
  const countdown = timeLeftLabel(a.expire);
  const priceText = `$${fmt(+a.sellPrice || 0, 2)}`;
  const countdownClass =
    status === "EXPIRED" ? "danger" :
    status === "SOON" ? "warn" : "";

  const statusBadge = status === "EXPIRED"
    ? `<span class="pill danger">Vencido</span>`
    : `<span class="pill warn">Por vencer</span>`;

  return `
    <div class="account-dark-row renewal-row">
      <div class="account-dark-service">
        ${escapeHtml(category)}
        <div class="renewal-inline-status">${statusBadge}</div>
      </div>

      <div class="account-dark-client">${escapeHtml(clientText)}</div>

      <div class="account-dark-view-wrap">
        <button class="account-dark-view" data-act="view" data-id="${a.id}" type="button">
          👁️ Ver cuenta
        </button>
      </div>

      <div class="account-dark-price">${escapeHtml(priceText)}</div>

      <div class="account-dark-expire">${escapeHtml(expireText)}</div>

      <div class="account-dark-countdown ${countdownClass}">
        ${escapeHtml(countdown)}
      </div>

      <div class="account-dark-actions renewal-actions">
        <button class="account-dark-btn renew" data-act="renew" data-id="${a.id}" type="button">
          Renovar
        </button>

        <button class="account-dark-btn edit" data-act="edit" data-id="${a.id}" type="button">
          Editar
        </button>

        <button class="account-dark-btn whatsapp" data-act="wa" data-id="${a.id}" type="button" aria-label="WhatsApp" title="WhatsApp">
          <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M19.11 17.41c-.27-.14-1.58-.78-1.82-.87-.24-.09-.42-.14-.6.14-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.13-1.31-.79-.7-1.32-1.56-1.47-1.83-.15-.27-.02-.41.11-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.72.34-.25.27-.94.92-.94 2.24 0 1.32.96 2.59 1.09 2.77.14.18 1.89 2.89 4.58 4.05.64.28 1.15.45 1.54.58.65.21 1.24.18 1.71.11.52-.08 1.58-.65 1.81-1.28.22-.63.22-1.17.16-1.28-.07-.11-.24-.18-.51-.31z"/>
            <path fill="currentColor" d="M16.03 3.2C9.03 3.2 3.35 8.88 3.35 15.88c0 2.23.58 4.4 1.68 6.3L3.2 28.8l6.8-1.78a12.6 12.6 0 0 0 6.03 1.54h.01c7 0 12.68-5.68 12.68-12.69 0-3.39-1.32-6.58-3.72-8.97A12.58 12.58 0 0 0 16.03 3.2zm0 23.2h-.01a10.5 10.5 0 0 1-5.35-1.46l-.38-.23-4.03 1.06 1.08-3.93-.25-.4a10.55 10.55 0 1 1 8.94 4.96z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}


function renderRenewals() {
  const cards = $("cardsRenewals");
  const list = filterRenewals();
  const soonCount = list.filter((a) => getRenewalStatus(a) === "SOON").length;
  const expiredCount = list.filter((a) => getRenewalStatus(a) === "EXPIRED").length;

  if ($("countChipRenewals")) $("countChipRenewals").textContent = `${list.length} cuentas`;
  if ($("renewSoonCount")) $("renewSoonCount").textContent = String(soonCount);
  if ($("renewExpiredCount")) $("renewExpiredCount").textContent = String(expiredCount);
  if ($("renewVisibleCount")) $("renewVisibleCount").textContent = String(list.length);

  if (!cards) return;

  cards.innerHTML = list.length
    ? list.map((a) => createRenewalCardHTML(a)).join("")
    : `<div class="muted small">No hay cuentas por vencer o vencidas con esos filtros.</div>`;

  cards.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      const row = db.accounts.find((x) => x.id === id);
      if (!row) return;

      try {
        if (act === "renew") {
          await renewAccountFirestore(id, row.expire);
          toast("Renovado +30 días ✅");
        } else if (act === "edit") {
          editingAccId = id;
          setAccModalFromRow(row);
          openAccModal("Editar cuenta");
        } else if (act === "wa") {
          openWhatsApp(row);
        } else if (act === "view") {
          openViewModal(id);
        }
      } catch (e) {
        console.error("Renewals card action error:", e);
        toast("Ocurrió un error.");
      }
    });
  });
}

/* =======================
   RENDER EXPENSES
======================= */
function renderExpenses() {
  const tbody = $("tbodyExp");
  if (!tbody) return;

  const list = filterExpenses()
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if ($("countChipExp")) $("countChipExp").textContent = `${list.length} gastos`;
  tbody.innerHTML = "";

  list.forEach((e) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="mono">${escapeHtml(e.date || "")}</td>
      <td>${escapeHtml(e.category || "")}</td>
      <td>${escapeHtml(e.provider || "")}</td>
      <td class="small">${escapeHtml(e.note || "")}</td>
      <td class="right mono">${fmt(+e.amount || 0, 2)}</td>
      <td class="right">
        <button class="iconBtn" data-act="edit" data-id="${e.id}">✏️</button>
        <button class="iconBtn" data-act="del" data-id="${e.id}">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      const row = db.expenses.find((x) => x.id === id);
      if (!row) return;

      try {
        if (act === "edit") {
          editingExpId = id;
          setExpModalFromRow(row);
          openExpModal("Editar gasto");
        } else if (act === "del") {
          if (!confirm("¿Eliminar este gasto?")) return;
          await deleteExpenseFirestore(id);
          toast("Gasto eliminado ✅");
        }
      } catch (e) {
        console.error("Expense action error:", e);
        toast("Ocurrió un error.");
      }
    });
  });
}

/* =======================
   DASHBOARD
======================= */
function sumAccounts() {
  const sales = db.accounts.reduce((s, a) => s + (+a.sellPrice || 0), 0);
  const costs = db.accounts.reduce((s, a) => s + (+a.buyPrice || 0), 0);
  return { sales, costs };
}

function sumExpenses() {
  return db.expenses.reduce((s, e) => s + (+e.amount || 0), 0);
}

function countExpSoonAndExpired() {
  let soon = 0;
  let expired = 0;
  let urgent = 0;

  db.accounts.forEach((a) => {
    const d = daysUntil(a.expire);
    if (d === null) return;

    if (d < 0) {
      expired++;
    } else {
      const alertDays = +a.alertDays || 0;
      if (d <= alertDays) soon++;
      if (d <= 1) urgent++;
    }
  });

  return { soon, expired, urgent };
}

function topCategoryByWindow(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();

  db.accounts.forEach((a) => {
    const tISO = tsToISO(a.createdAt) || tsToISO(a.updatedAt);
    if (!tISO) return;
    const t = new Date(tISO).getTime();
    if (t < cutoff) return;

    const key = normalizeCategoryName(a.category || "Sin categoría") || "Sin categoría";
    map.set(key, (map.get(key) || 0) + 1);
  });

  let best = null;
  let bestV = 0;

  for (const [k, v] of map.entries()) {
    if (v > bestV) {
      best = k;
      bestV = v;
    }
  }

  return best ? `${best} (${bestV})` : "—";
}

function groupAccountsByCategoryWithinDays(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();

  db.accounts.forEach((a) => {
    const tISO = tsToISO(a.createdAt) || tsToISO(a.updatedAt);
    if (!tISO) return;
    const t = new Date(tISO).getTime();
    if (t < cutoff) return;

    const key = normalizeCategoryName(a.category || "Sin categoría") || "Sin categoría";
    map.set(key, (map.get(key) || 0) + 1);
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupExpensesByCategoryWithinDays(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();

  db.expenses.forEach((e) => {
    const t = new Date(`${e.date || ""}T00:00:00`).getTime();
    if (!t || t < cutoff) return;

    const key = (e.category || "Sin categoría").trim() || "Sin categoría";
    map.set(key, (map.get(key) || 0) + (+e.amount || 0));
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/* =======================
   CHARTS
======================= */
function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBarChart(canvas, items, opts = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  clearCanvas(canvas);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(255,255,255,0.28)");
  bg.addColorStop(1, "rgba(220,235,246,0.28)");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fill();

  const padL = 52;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const max = Math.max(1, ...items.map((x) => x.value));
  const n = Math.max(1, items.length);
  const gap = 10;
  const barW = Math.max(14, (plotW - gap * (n - 1)) / n);

  ctx.font = "12px system-ui";

  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = Math.round((max * i) / ticks);
    const y = padT + plotH - (plotH * i) / ticks;

    ctx.strokeStyle = "rgba(62,109,145,0.10)";
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();

    ctx.fillStyle = "rgba(23,56,78,0.75)";
    ctx.fillText(String(v), 10, y + 4);
  }

  ctx.strokeStyle = "rgba(62,109,145,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  const barColor = opts.barColor || "rgba(93,167,217,0.55)";
  const glow = opts.glow || "rgba(93,167,217,0.22)";

  items.forEach((it, i) => {
    const x = padL + i * (barW + gap);
    const bh = (it.value / max) * plotH;
    const y = padT + plotH - bh;

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = barColor;
    roundRect(ctx, x, y, barW, bh, 10);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(23,56,78,0.86)";
    ctx.font = "11px system-ui";

    const lbl = it.label.length > 10 ? `${it.label.slice(0, 10)}…` : it.label;

    ctx.save();
    ctx.translate(x + barW / 2, padT + plotH + 16);
    ctx.rotate(-0.35);
    ctx.textAlign = "center";
    ctx.fillText(lbl, 0, 0);
    ctx.restore();
  });
}

function topCategoriesChart(days, metric, topN) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();

  db.accounts.forEach((a) => {
    const tISO = tsToISO(a.createdAt) || tsToISO(a.updatedAt);
    if (!tISO) return;
    const t = new Date(tISO).getTime();
    if (t < cutoff) return;

    const key = normalizeCategoryName(a.category || "Sin categoría") || "Sin categoría";
    const revenue = +a.sellPrice || 0;
    const prof = (+a.sellPrice || 0) - (+a.buyPrice || 0);
    const add = metric === "count" ? 1 : metric === "revenue" ? revenue : prof;

    map.set(key, (map.get(key) || 0) + add);
  });

  const items = [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return items.slice(0, topN);
}

function renderAnalytics() {
  if (!$("chartTopCats")) return;

  const days = +(getValue("aWindow", 7)) || 7;
  const metric = getValue("aMetric", "count") || "count";
  const topN = +(getValue("aTopN", 5)) || 5;

  const title =
    metric === "count" ? `Top categorías por cantidad (últimos ${days} días)` :
    metric === "revenue" ? `Top categorías por ingresos (últimos ${days} días)` :
    `Top categorías por ganancia (últimos ${days} días)`;

  if ($("aTitle")) $("aTitle").textContent = title;

  const items = topCategoriesChart(days, metric, topN);
  drawBarChart(
    $("chartTopCats"),
    items.length ? items : [{ label: "Sin datos", value: 0 }],
    {
      barColor: "rgba(93,167,217,0.52)",
      glow: "rgba(93,167,217,0.22)"
    }
  );
}

function renderDashboard() {
  if (!$("kpiSales")) return;

  const s = sumAccounts();
  const expSum = sumExpenses();
  const net = s.sales - s.costs - expSum;
  const expState = countExpSoonAndExpired();

  $("kpiSales").textContent = fmt(s.sales, 2);
  $("kpiCosts").textContent = fmt(s.costs, 2);
  $("kpiExpenses").textContent = fmt(expSum, 2);
  $("kpiNet").textContent = fmt(net, 2);
  $("kpiExpSoon").textContent = fmt0(expState.soon);
  $("kpiExpired").textContent = fmt0(expState.expired);
  $("kpiTop7").textContent = topCategoryByWindow(7);
  $("kpiTop30").textContent = topCategoryByWindow(30);

  if ($("countChipDash")) $("countChipDash").textContent = `${db.accounts.length} cuentas · ${db.expenses.length} gastos`;
  if ($("miniAccounts")) $("miniAccounts").textContent = fmt0(db.accounts.length);
  if ($("miniExpenses")) $("miniExpenses").textContent = fmt0(db.expenses.length);
  if ($("miniCollect")) $("miniCollect").textContent = fmt0(expState.soon);
  if ($("miniUrgent")) $("miniUrgent").textContent = fmt0(expState.urgent);

  const sales7 = groupAccountsByCategoryWithinDays(7).slice(0, 10);
  const sales30 = groupAccountsByCategoryWithinDays(30).slice(0, 10);
  const exp30 = groupExpensesByCategoryWithinDays(30).slice(0, 10);

  drawBarChart(
    $("chartSales7"),
    sales7.length ? sales7 : [{ label: "Sin datos", value: 0 }],
    {
      barColor: "rgba(93,167,217,0.55)",
      glow: "rgba(93,167,217,0.22)"
    }
  );

  drawBarChart(
    $("chartSales30"),
    sales30.length ? sales30 : [{ label: "Sin datos", value: 0 }],
    {
      barColor: "rgba(131,194,231,0.62)",
      glow: "rgba(131,194,231,0.22)"
    }
  );

  drawBarChart(
    $("chartExpenses30"),
    exp30.length ? exp30 : [{ label: "Sin datos", value: 0 }],
    {
      barColor: "rgba(223,106,106,0.42)",
      glow: "rgba(223,106,106,0.20)"
    }
  );
}

/* =======================
   BACKUP
======================= */
function doBackup() {
  const backupData = {
    exportedAt: new Date().toISOString(),
    tenantId,
    accounts: db.accounts,
    expenses: db.expenses
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `respaldo_${tenantId || "tenant"}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  toast("Respaldo descargado 💾");
}

$("btnBackup")?.addEventListener("click", doBackup);
$("btnBackupTop")?.addEventListener("click", doBackup);

/* =======================
   CSV IMPORT
======================= */
$("btnImportCsvBtn")?.addEventListener("click", () => $("fileImportCsv")?.click());
$("btnImportCsvBtnTop")?.addEventListener("click", () => $("fileImportCsv")?.click());

function parseCSV(text) {
  const out = [];
  let row = [];
  let val = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1];

    if (ch === '"') {
      if (inQ && nx === '"') {
        val += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      row.push(val);
      val = "";
    } else if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && nx === "\n") i++;
      row.push(val);
      if (row.some((x) => String(x).trim() !== "")) out.push(row);
      row = [];
      val = "";
    } else {
      val += ch;
    }
  }

  row.push(val);
  if (row.some((x) => String(x).trim() !== "")) out.push(row);

  return out;
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replaceAll("á", "a")
    .replaceAll("é", "e")
    .replaceAll("í", "i")
    .replaceAll("ó", "o")
    .replaceAll("ú", "u")
    .replaceAll("ñ", "n")
    .replace(/\s+/g, "")
    .replaceAll("-", "")
    .replaceAll("_", "");
}

function numFromCell(x) {
  const s = String(x ?? "").trim();
  if (!s) return 0;
  const norm = s.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

function mapCSVToAccount(obj) {
  const a = blankAccount();

  a.category = normalizeCategoryName((obj.categoria || obj.category || obj.tipo || "").trim());
  a.profileName = (obj.perfil || obj.nombre || obj.cliente || obj.profile || "").trim();
  a.phone = (obj.celular || obj.telefono || obj.phone || "").trim();

  a.pin = (obj.pin || "").trim();
  a.email = (obj.correo || obj.email || "").trim();
  a.pass = (obj.clave || obj.password || obj.pass || "").trim();
  a.accountName = (obj.cuenta || obj.nombrecuenta || obj.accountname || "").trim();

  a.user = (obj.usuario || obj.user || "").trim();
  a.iptvPass = (obj.claveiptv || obj.iptvpass || obj.passiptv || "").trim();
  a.url = (obj.url || obj.link || "").trim();
  a.plan = (obj.plan || "").trim();

  a.provider = (obj.proveedor || obj.provider || "").trim();
  a.buyPrice = numFromCell(obj.costo || obj.compra || obj.costocompra || obj.buyprice || 0);
  a.sellPrice = numFromCell(obj.precio || obj.venta || obj.sellprice || 0);

  a.expire = (obj.expiracion || obj.expire || obj.vence || "").trim();
  a.alertDays = Math.max(0, numFromCell(obj.alerta || obj.alertadays || obj.diasalerta || 3)) || 3;

  a.profiles = Math.max(0, numFromCell(obj.perfiles || obj.cantidadperfiles || obj.slots || 1)) || 1;
  a.notes = (obj.notas || obj.nota || obj.observaciones || obj.extra || "").trim();
  a.tag = (obj.etiqueta || obj.tag || "").trim();

  return a;
}

function mapCSVToExpense(obj) {
  const e = blankExpense();
  e.date = (obj.fecha || obj.date || todayISO()).trim();
  e.category = (obj.categoriagasto || obj.categoria || obj.category || "").trim();
  e.provider = (obj.proveedor || obj.provider || "").trim();
  e.note = (obj.nota || obj.notas || obj.note || "").trim();
  e.amount = numFromCell(obj.monto || obj.amount || 0);
  return e;
}

$("fileImportCsv")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  if (!requireTenant()) return;

  try {
    const text = await file.text();
    const grid = parseCSV(text);
    if (grid.length < 2) throw new Error("CSV vacío");

    const headers = grid[0].map(normalizeHeader);
    const rowsObj = grid.slice(1).map((cols) => {
      const o = {};
      headers.forEach((h, i) => {
        o[h] = String(cols[i] ?? "").trim();
      });
      return o;
    });

    const hasAmount = headers.includes("monto") || headers.includes("amount");
    const hasSell = headers.includes("precio") || headers.includes("venta") || headers.includes("sellprice");

    if (hasAmount && !hasSell) {
      const incoming = rowsObj.map(mapCSVToExpense).filter((x) => x.category && x.amount > 0);
      for (const item of incoming) {
        await addExpenseFirestore(item);
      }
      toast(`CSV importado: ${incoming.length} gastos ✅`);
    } else {
      const incoming = rowsObj.map(mapCSVToAccount).filter((x) => x.category && x.profileName);
      for (const item of incoming) {
        await addAccountFirestore(item);
      }
      toast(`CSV importado: ${incoming.length} cuentas ✅`);
    }
  } catch (err) {
    console.error("CSV import error:", err);
    toast("No se pudo importar CSV.");
  }
});

/* =======================
   AUTO REFRESH COUNTDOWN
======================= */
setInterval(() => renderAll(), 60000);

/* =======================
   RENDER ALL
======================= */
function renderAll() {
  renderDashboard();
  renderAccounts();
  renderRenewals();
  renderExpenses();
  renderAnalytics();
}

/* =======================
   INITIAL
======================= */
renderAll();

/* =======================
   DARK MODE
======================= */

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  const enabled = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", enabled ? "1" : "0");
}

$("btnDarkMode")?.addEventListener("click", toggleDarkMode);

if (localStorage.getItem("darkMode") === "1") {
  document.body.classList.add("dark-mode");
}
