// Firebase CDN
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc,
  collection, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// =======================
// Firebase config
// =======================
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

// =======================
// Helpers UI
// =======================
function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
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
  clearTimeout(window.__t);
  window.__t = setTimeout(() => (elToast.style.display = "none"), 3500);
}
$("toastX")?.addEventListener("click", () => {
  const elToast = $("toast");
  if (elToast) elToast.style.display = "none";
});

// =======================
// Dates
// =======================
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
function daysUntil(dateISO) {
  if (!dateISO) return null;
  const a = new Date(dateISO + "T00:00:00");
  const b = new Date(todayISO() + "T00:00:00");
  const ms = a - b;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function hoursSinceISO(iso) {
  if (!iso) return null;
  const a = new Date(iso);
  const b = new Date();
  const ms = b - a;
  return Math.floor(ms / (1000 * 60 * 60));
}
function addDaysISO(dateISO, days) {
  if (!dateISO) return "";
  const d = new Date(dateISO + "T00:00:00");
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

// Cuenta atrás
function endOfDayISO(dateISO) {
  if (!dateISO) return null;
  return new Date(dateISO + "T23:59:59");
}
function timeLeftLabel(dateISO) {
  const end = endOfDayISO(dateISO);
  if (!end) return "—";

  const now = new Date();
  let diff = end.getTime() - now.getTime();
  const past = diff < 0;
  diff = Math.abs(diff);

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  const base = `${days}d ${hours}h ${mins}m`;
  return past ? `VENCIDA (${base})` : base;
}

// =======================
// Auth + Tenant context
// =======================
let currentUser = null;
let currentProfile = null; // {role, name, tenantId}
let tenantId = null;

let db = { accounts: [], expenses: [] };

let unsubAccounts = null;
let unsubExpenses = null;

// =======================
// LOGIN
// =======================
async function doLogin() {
  $("loginError") && ($("loginError").textContent = "");
  const email = ($("loginEmail")?.value || "").trim();
  const pass = $("loginPass")?.value || "";

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    console.error("LOGIN ERROR:", e.code, e.message);
    $("loginError") && ($("loginError").textContent = `Error: ${e.code}`);
    toast(`Error: ${e.code}`);
  }
}

$("btnLogin")?.addEventListener("click", doLogin);
$("loginPass")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
$("btnLogout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Logout error:", e);
  }
});

// =======================
// Profile (opcional)
// =======================
async function loadUserProfile(uid) {
  const ref = doc(fs, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// =======================
// Subscribe tenant data
// =======================
function subscribeTenantData(tid) {
  tenantId = tid;

  if (unsubAccounts) unsubAccounts();
  if (unsubExpenses) unsubExpenses();
  unsubAccounts = null;
  unsubExpenses = null;

  // Accounts
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
      toast("Error cargando cuentas (Firestore). Revisa consola/permisos/índices.");
    }
  );

  // Expenses
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
      toast("Error cargando gastos (Firestore). Revisa consola/permisos/índices.");
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

// =======================
// Session handler (CORREGIDO)
// =======================
onAuthStateChanged(auth, async (u) => {
  currentUser = u;

  if (!u) {
    unsubscribeAll();
    $("loginScreen") && ($("loginScreen").style.display = "flex");
    toast("Sesión cerrada.");
    renderAll();
    return;
  }

  $("loginScreen") && ($("loginScreen").style.display = "none");
  toast("Sesión iniciada ✅");

  let profile = null;
  try {
    profile = await loadUserProfile(u.uid);
  } catch (e) {
    console.error("Profile load error:", e);
  }

  // Perfil opcional: si no existe, igual deja entrar
  currentProfile = profile || { role: "user", name: "", tenantId: u.uid };

  // ✅ Cada usuario ve SOLO su información
  subscribeTenantData(u.uid);
});

// =======================
// UI Tabs
// =======================
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    document.querySelectorAll(".tabPage").forEach((p) => p.classList.add("hidden"));
    $(target)?.classList.remove("hidden");
    renderAll();
  });
});

// show/hide panels
let uiToggles = { kpis: true, charts: true, tables: true };
function applyToggles() {
  $("kpiPanel")?.classList.toggle("hidden", !uiToggles.kpis);
  $("chartPanel")?.classList.toggle("hidden", !uiToggles.charts);
  $("tablePanel")?.classList.toggle("hidden", !uiToggles.tables);
}
$("btnToggleKpis")?.addEventListener("click", () => {
  uiToggles.kpis = !uiToggles.kpis;
  applyToggles();
});
$("btnToggleCharts")?.addEventListener("click", () => {
  uiToggles.charts = !uiToggles.charts;
  applyToggles();
});
$("btnToggleTables")?.addEventListener("click", () => {
  uiToggles.tables = !uiToggles.tables;
  applyToggles();
});
applyToggles();

// =======================
// Models
// =======================
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

// =======================
// Firestore CRUD
// =======================
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
async function updateAccountFirestore(id, a) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "accounts", id);
  a.updatedAt = serverTimestamp();
  await updateDoc(ref, a);
}
async function deleteAccountFirestore(id) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "accounts", id);
  await deleteDoc(ref);
}
async function renewAccountFirestore(id, currentExpire) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "accounts", id);
  const newExpire = addDaysISO(currentExpire, 30);
  await updateDoc(ref, { expire: newExpire, updatedAt: serverTimestamp() });
}

async function addExpenseFirestore(e) {
  if (!requireTenant()) return;
  const ref = collection(fs, "tenants", tenantId, "expenses");
  e.createdAt = serverTimestamp();
  e.updatedAt = serverTimestamp();
  e.createdBy = currentUser.uid;
  await addDoc(ref, e);
}
async function updateExpenseFirestore(id, e) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "expenses", id);
  e.updatedAt = serverTimestamp();
  await updateDoc(ref, e);
}
async function deleteExpenseFirestore(id) {
  if (!requireTenant()) return;
  const ref = doc(fs, "tenants", tenantId, "expenses", id);
  await deleteDoc(ref);
}

// =======================
// Modals
// =======================
let editingAccId = null;
let editingExpId = null;

function syncCategoryUI() {
  const cat = $("mCategory")?.value;
  const iptv = isIPTVCategory(cat);
  $("boxIPTV")?.classList.toggle("hidden", !iptv);
  $("boxStreaming")?.classList.toggle("hidden", iptv);
}
$("mCategory")?.addEventListener("input", syncCategoryUI);

function openAccModal(title) {
  $("modalAccTitle") && ($("modalAccTitle").textContent = title);
  $("modalAccBack") && ($("modalAccBack").style.display = "flex");
  syncCategoryUI();
}
function closeAccModal() {
  $("modalAccBack") && ($("modalAccBack").style.display = "none");
  editingAccId = null;
}
$("btnAccClose")?.addEventListener("click", closeAccModal);
$("modalAccBack")?.addEventListener("click", (e) => {
  if (e.target.id === "modalAccBack") closeAccModal();
});

function setAccModalFromRow(a) {
  $("mCategory").value = a.category || "";
  $("mName").value = a.profileName || "";
  $("mPhone").value = a.phone || "";
  $("mProfiles").value = a.profiles ?? 1;

  $("mPin").value = a.pin || "";
  $("mEmail").value = a.email || "";
  $("mPass").value = a.pass || "";
  $("mAccountName").value = a.accountName || "";

  $("mUser").value = a.user || "";
  $("mIptvPass").value = a.iptvPass || "";
  $("mUrl").value = a.url || "";
  $("mPlan").value = a.plan || "";

  $("mProvider").value = a.provider || "";
  $("mBuyPrice").value = a.buyPrice ?? 0;
  $("mSellPrice").value = a.sellPrice ?? 0;
  $("mExpire").value = a.expire || "";
  $("mAlertDays").value = a.alertDays ?? 3;

  $("mCollect").value = a.collect || "NO";
  $("mTag").value = a.tag || "";
  $("mNotes").value = a.notes || "";
  syncCategoryUI();
}

function getAccRowFromModal(base) {
  const a = base ? { ...base } : blankAccount();

  a.category = $("mCategory").value.trim();
  a.profileName = $("mName").value.trim();
  a.phone = $("mPhone").value.trim();
  a.profiles = Math.max(0, +$("mProfiles").value || 0);

  a.pin = $("mPin").value.trim();
  a.email = $("mEmail").value.trim();
  a.pass = $("mPass").value.trim();
  a.accountName = $("mAccountName").value.trim();

  a.user = $("mUser").value.trim();
  a.iptvPass = $("mIptvPass").value.trim();
  a.url = $("mUrl").value.trim();
  a.plan = $("mPlan").value.trim();

  a.provider = $("mProvider").value.trim();
  a.buyPrice = Math.max(0, +$("mBuyPrice").value || 0);
  a.sellPrice = Math.max(0, +$("mSellPrice").value || 0);
  a.expire = $("mExpire").value;
  a.alertDays = Math.max(0, +$("mAlertDays").value || 0);

  a.collect = $("mCollect").value;
  a.tag = $("mTag").value.trim();
  a.notes = $("mNotes").value.trim();

  return a;
}

function validateAccount(a) {
  if (!a.category) return "Falta categoría.";
  if (!a.profileName) return "Falta perfil/nombre.";
  if (a.sellPrice < 0 || a.buyPrice < 0) return "Precios inválidos.";

  if (isIPTVCategory(a.category)) {
    if (!a.user) return "En IPTV falta Usuario.";
    if (!a.url) return "En IPTV falta URL.";
    if (!a.iptvPass) return "En IPTV falta Clave.";
  } else {
    if (!a.email) return "En Streaming falta Correo.";
    if (!a.pass) return "En Streaming falta Clave.";
  }
  return null;
}

function openExpModal(title) {
  $("modalExpTitle") && ($("modalExpTitle").textContent = title);
  $("modalExpBack") && ($("modalExpBack").style.display = "flex");
}
function closeExpModal() {
  $("modalExpBack") && ($("modalExpBack").style.display = "none");
  editingExpId = null;
}
$("btnExpClose")?.addEventListener("click", closeExpModal);
$("modalExpBack")?.addEventListener("click", (e) => {
  if (e.target.id === "modalExpBack") closeExpModal();
});

function setExpModalFromRow(e) {
  $("eDate").value = e.date || todayISO();
  $("eCategory").value = e.category || "";
  $("eProvider").value = e.provider || "";
  $("eAmount").value = e.amount ?? 0;
  $("eNote").value = e.note || "";
}
function getExpRowFromModal(base) {
  const e = base ? { ...base } : blankExpense();
  e.date = $("eDate").value || todayISO();
  e.category = $("eCategory").value.trim();
  e.provider = $("eProvider").value.trim();
  e.amount = Math.max(0, +$("eAmount").value || 0);
  e.note = $("eNote").value.trim();
  return e;
}
function validateExpense(e) {
  if (!e.date) return "Falta fecha.";
  if (!e.category) return "Falta categoría del gasto.";
  if (!(e.amount > 0)) return "Monto debe ser mayor a 0.";
  return null;
}

// botones arriba
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
    if (!editingAccId) await addAccountFirestore(a);
    else await updateAccountFirestore(editingAccId, a);

    closeAccModal();
    toast("Cuenta guardada ✅");
  } catch (e) {
    console.error("Save account error:", e);
    toast("Error guardando cuenta (Firestore). Revisa consola/permisos.");
  }
});

$("btnExpSave")?.addEventListener("click", async () => {
  const base = editingExpId ? db.expenses.find((x) => x.id === editingExpId) : null;
  const e = getExpRowFromModal(base);
  const err = validateExpense(e);
  if (err) return toast(err);

  try {
    if (!editingExpId) await addExpenseFirestore(e);
    else await updateExpenseFirestore(editingExpId, e);

    closeExpModal();
    toast("Gasto guardado ✅");
  } catch (er) {
    console.error("Save expense error:", er);
    toast("Error guardando gasto (Firestore). Revisa consola/permisos.");
  }
});

// =======================
// WhatsApp
// =======================
function buildWhatsAppMessage(a) {
  const cat = a.category || "Cuenta";
  const exp = a.expire ? a.expire : "—";
  const d = daysUntil(a.expire);
  const daysTxt = d === null ? "—" : `${d} día(s)`;
  const price = fmt(+a.sellPrice || 0, 2);

  const access = isIPTVCategory(a.category)
    ? `Usuario: ${a.user || "—"}\nClave: ${a.iptvPass || "—"}\nURL: ${a.url || "—"}`
    : `Correo: ${a.email || "—"}\nClave: ${a.pass || "—"}\nPIN: ${a.pin || "—"}`;

  let msg = `Hola ${a.profileName || ""} 👋
📌 Plataforma: ${cat}
💰 Precio: ${price}
📅 Expira: ${exp} (faltan: ${daysTxt})

🔑 Datos:
${access}

✅ Si deseas renovar tu ${cat}, respóndeme "RENOVAR" y te lo dejo activo.`;

  if (a.notes) msg += `\n\n📝 Nota: ${a.notes}`;
  return msg;
}
function openWhatsApp(a) {
  const phone = normalizePhone(a.phone);
  if (!phone) return toast("No hay celular válido para WhatsApp.");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(a))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// =======================
// Filtros
// =======================
function filterAccounts() {
  const q = ($("qAcc")?.value || "").trim().toLowerCase();
  const cat = ($("fCategoryAcc")?.value || "").trim().toLowerCase();
  const prov = ($("fProviderAcc")?.value || "").trim().toLowerCase();
  const collect = $("fCollectAcc")?.value || "";
  const exp = $("fExpAcc")?.value || "";

  return db.accounts.filter((a) => {
    if (cat && !(a.category || "").toLowerCase().includes(cat)) return false;
    if (prov && !(a.provider || "").toLowerCase().includes(prov)) return false;

    if (collect === "YES" && a.collect !== "YES") return false;
    if (collect === "NO" && a.collect === "YES") return false;

    if (exp) {
      const d = daysUntil(a.expire);
      if (exp === "EXPIRED" && !(d !== null && d < 0)) return false;
      if (exp === "SOON") {
        const al = +a.alertDays || 0;
        if (!(d !== null && d <= al && d >= 0)) return false;
      }
    }

    if (q) {
      const blob = [
        a.category, a.profileName, a.phone,
        a.pin, a.email, a.pass,
        a.user, a.iptvPass, a.url,
        a.provider, a.accountName, a.plan, a.tag, a.notes,
        String(a.buyPrice), String(a.sellPrice), a.expire
      ].join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }

    return true;
  });
}

function filterExpenses() {
  const q = ($("qExp")?.value || "").trim().toLowerCase();
  const cat = ($("fExpCat")?.value || "").trim().toLowerCase();
  const from = $("fExpFrom")?.value || "";
  const to = $("fExpTo")?.value || "";

  return db.expenses.filter((x) => {
    if (cat && !(x.category || "").toLowerCase().includes(cat)) return false;
    if (from && (x.date || "") < from) return false;
    if (to && (x.date || "") > to) return false;

    if (q) {
      const blob = [x.date, x.category, x.provider, x.note, String(x.amount)].join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

["qAcc", "fCategoryAcc", "fProviderAcc", "fCollectAcc", "fExpAcc"].forEach((id) => {
  $(id)?.addEventListener("input", renderAccounts);
  $(id)?.addEventListener("change", renderAccounts);
});
["qExp", "fExpCat", "fExpFrom", "fExpTo"].forEach((id) => {
  $(id)?.addEventListener("input", renderExpenses);
  $(id)?.addEventListener("change", renderExpenses);
});
$("aWindow")?.addEventListener("change", renderAnalytics);
$("aMetric")?.addEventListener("change", renderAnalytics);
$("aTopN")?.addEventListener("change", renderAnalytics);

// =======================
// Render tables
// =======================
function statusPillAccount(a) {
  const d = daysUntil(a.expire);
  if (d === null) return `<span class="pill">Sin fecha</span>`;
  const al = +a.alertDays || 0;
  if (d < 0) return `<span class="pill danger">Vencido</span>`;
  if (d <= al) return `<span class="pill warn">Por vencer</span>`;
  return `<span class="pill ok">OK</span>`;
}
function countdownPillClass(a) {
  const d = daysUntil(a.expire);
  if (d === null) return "";
  if (d < 0) return "danger";
  if (d <= (+a.alertDays || 0)) return "warn";
  return "ok";
}

function tsToISO(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return null;
}

function renderAccounts() {
  const tbody = $("tbodyAcc");
  if (!tbody) return;

  const list = filterAccounts();
  $("countChipAcc") && ($("countChipAcc").textContent = `${list.length} cuentas`);
  tbody.innerHTML = "";

  list
    .slice()
    .sort((a, b) => (a.expire || "9999-12-31").localeCompare(b.expire || "9999-12-31"))
    .forEach((a) => {
      const d = daysUntil(a.expire);
      const createdISO = tsToISO(a.createdAt) || tsToISO(a.updatedAt);
      const hrs = createdISO ? hoursSinceISO(createdISO) : null;
      const profit = (+a.sellPrice || 0) - (+a.buyPrice || 0);

      const access = isIPTVCategory(a.category)
        ? `<div class="small"><span class="muted">U:</span> ${escapeHtml(a.user || "")}</div>
           <div class="small"><span class="muted">C:</span> ${escapeHtml(a.iptvPass || "")}</div>
           <div class="small"><span class="muted">URL:</span> ${escapeHtml(a.url || "")}</div>`
        : `<div class="small"><span class="muted">Correo:</span> ${escapeHtml(a.email || "")}</div>
           <div class="small"><span class="muted">Clave:</span> ${escapeHtml(a.pass || "")}</div>
           <div class="small"><span class="muted">PIN:</span> ${escapeHtml(a.pin || "")}</div>`;

      const notesShort = (a.notes || "").trim();
      const notesView = notesShort
        ? escapeHtml(notesShort.slice(0, 80)) + (notesShort.length > 80 ? "…" : "")
        : "";

      const tr = document.createElement("tr");
      const shouldBlink = d !== null && d >= 0 && d <= (+a.alertDays || 0);
      if (shouldBlink) tr.classList.add("blinkRow");

      tr.innerHTML = `
        <td><span class="pill">${escapeHtml(a.category || "")}</span></td>
        <td><div><b>${escapeHtml(a.profileName || "")}</b></div><div class="muted small">${escapeHtml(a.tag || "")}</div></td>
        <td class="small">${escapeHtml(a.phone || "")}</td>
        <td>${access}</td>
        <td><div>${escapeHtml(a.provider || "")}</div><div class="muted small">${escapeHtml(a.accountName || a.plan || "")}</div></td>
        <td class="right mono">${fmt(+a.buyPrice || 0, 2)}</td>
        <td class="right mono">${fmt(+a.sellPrice || 0, 2)}</td>
        <td class="right mono">${fmt(profit, 2)}</td>
        <td><div>${escapeHtml(a.expire || "")}</div><div class="small">${statusPillAccount(a)}</div></td>
        <td class="right mono">${d === null ? "—" : fmt0(d)}</td>
        <td class="right mono">${hrs === null ? "—" : fmt0(hrs)}</td>
        <td><input type="checkbox" ${a.collect === "YES" ? "checked" : ""} data-act="collect" data-id="${a.id}" /></td>
        <td><span class="pill ${countdownPillClass(a)}">${escapeHtml(timeLeftLabel(a.expire))}</span></td>
        <td class="right mono">${fmt0(+a.profiles || 0)}</td>
        <td class="small">${notesView}</td>
        <td class="right">
          <button class="iconBtn" data-act="wa" data-id="${a.id}" title="WhatsApp">💬</button>
          <button class="iconBtn" data-act="renew" data-id="${a.id}" title="Renovar +30 días">🔁</button>
          <button class="iconBtn" data-act="edit" data-id="${a.id}">✏️</button>
          <button class="iconBtn" data-act="del" data-id="${a.id}">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll("button[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      const row = db.accounts.find((x) => x.id === id);
      if (!row) return;

      if (act === "edit") {
        editingAccId = id;
        setAccModalFromRow(row);
        openAccModal("Editar cuenta");
      } else if (act === "del") {
        if (!confirm("¿Eliminar esta cuenta?")) return;
        await deleteAccountFirestore(id);
        toast("Cuenta eliminada ✅");
      } else if (act === "wa") {
        openWhatsApp(row);
      } else if (act === "renew") {
        if (!row.expire) return toast("Esta cuenta no tiene expiración.");
        await renewAccountFirestore(id, row.expire);
        toast("Renovado +30 días ✅");
      }
    });
  });

  tbody.querySelectorAll("input[type=checkbox][data-act]").forEach((ch) => {
    ch.addEventListener("change", async () => {
      const id = ch.dataset.id;
      try {
        await updateAccountFirestore(id, { collect: ch.checked ? "YES" : "NO" });
      } catch (e) {
        console.error("Update collect error:", e);
        toast("Error actualizando Cobrar.");
      }
    });
  });
}

function renderExpenses() {
  const tbody = $("tbodyExp");
  if (!tbody) return;

  const list = filterExpenses();
  $("countChipExp") && ($("countChipExp").textContent = `${list.length} gastos`);
  tbody.innerHTML = "";

  list
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .forEach((e) => {
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

      if (act === "edit") {
        editingExpId = id;
        setExpModalFromRow(row);
        openExpModal("Editar gasto");
      } else if (act === "del") {
        if (!confirm("¿Eliminar este gasto?")) return;
        await deleteExpenseFirestore(id);
        toast("Gasto eliminado ✅");
      }
    });
  });
}

// =======================
// Dashboard + Charts
// =======================
function sumAccounts() {
  const sales = db.accounts.reduce((s, a) => s + (+a.sellPrice || 0), 0);
  const costs = db.accounts.reduce((s, a) => s + (+a.buyPrice || 0), 0);
  return { sales, costs };
}
function sumExpenses() {
  return db.expenses.reduce((s, e) => s + (+e.amount || 0), 0);
}
function countExpSoonAndExpired() {
  let soon = 0, expired = 0, urgent = 0;
  db.accounts.forEach((a) => {
    const d = daysUntil(a.expire);
    if (d === null) return;
    if (d < 0) expired++;
    else {
      const al = +a.alertDays || 0;
      if (d <= al) soon++;
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

    const k = (a.category || "Sin categoría").trim() || "Sin categoría";
    map.set(k, (map.get(k) || 0) + 1);
  });

  let best = null, bestV = 0;
  for (const [k, v] of map.entries()) {
    if (v > bestV) { best = k; bestV = v; }
  }
  return best ? `${best} (${bestV})` : "—";
}

// chart helpers (simple)
function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function drawBarChart(canvas, items, opts = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  clearCanvas(canvas);

  const padL = 48, padR = 10, padT = 14, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, w, h);

  const max = Math.max(1, ...items.map((x) => x.value));
  const n = Math.max(1, items.length);
  const gap = 8;
  const barW = Math.max(10, (plotW - gap * (n - 1)) / n);

  ctx.strokeStyle = "rgba(231,236,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  ctx.fillStyle = "rgba(231,236,255,0.7)";
  ctx.font = "12px system-ui";
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = Math.round((max * i) / ticks);
    const y = padT + plotH - (plotH * i) / ticks;
    ctx.strokeStyle = "rgba(231,236,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(String(v), 8, y + 4);
  }

  items.forEach((it, i) => {
    const x = padL + i * (barW + gap);
    const bh = (it.value / max) * plotH;
    const y = padT + plotH - bh;

    ctx.fillStyle = opts.barColor || "rgba(110,168,254,0.55)";
    ctx.fillRect(x, y, barW, bh);

    ctx.fillStyle = "rgba(231,236,255,0.85)";
    ctx.font = "11px system-ui";
    const lbl = (it.label.length > 10) ? it.label.slice(0, 10) + "…" : it.label;
    ctx.save();
    ctx.translate(x + barW / 2, padT + plotH + 14);
    ctx.rotate(-0.35);
    ctx.textAlign = "center";
    ctx.fillText(lbl, 0, 0);
    ctx.restore();
  });
}

function groupAccountsByCategoryWithinDays(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();
  db.accounts.forEach((a) => {
    const tISO = tsToISO(a.createdAt) || tsToISO(a.updatedAt);
    if (!tISO) return;
    const t = new Date(tISO).getTime();
    if (t < cutoff) return;
    const k = (a.category || "Sin categoría").trim() || "Sin categoría";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}
function groupExpensesByCategoryWithinDays(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();
  db.expenses.forEach((e) => {
    const t = new Date((e.date || "") + "T00:00:00").getTime();
    if (!t || t < cutoff) return;
    const k = (e.category || "Sin categoría").trim() || "Sin categoría";
    map.set(k, (map.get(k) || 0) + (+e.amount || 0));
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// analytics
function topCategoriesChart(days, metric, topN) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const map = new Map();

  db.accounts.forEach((a) => {
    const tISO = tsToISO(a.createdAt) || tsToISO(a.updatedAt);
    if (!tISO) return;
    const t = new Date(tISO).getTime();
    if (t < cutoff) return;

    const k = (a.category || "Sin categoría").trim() || "Sin categoría";
    const revenue = (+a.sellPrice || 0);
    const prof = (+a.sellPrice || 0) - (+a.buyPrice || 0);
    const add = metric === "count" ? 1 : metric === "revenue" ? revenue : prof;
    map.set(k, (map.get(k) || 0) + add);
  });

  let items = [...map.entries()].map(([label, value]) => ({ label, value }));
  items.sort((a, b) => b.value - a.value);
  return items.slice(0, topN);
}

function renderAnalytics() {
  if (!$("chartTopCats")) return;

  const days = +($("aWindow")?.value || 7);
  const metric = $("aMetric")?.value || "count";
  const topN = +($("aTopN")?.value || 5);

  const title =
    metric === "count" ? `Top categorías por cantidad (últimos ${days} días)` :
      metric === "revenue" ? `Top categorías por ingresos (últimos ${days} días)` :
        `Top categorías por ganancia (últimos ${days} días)`;

  $("aTitle") && ($("aTitle").textContent = title);

  const items = topCategoriesChart(days, metric, topN);
  drawBarChart($("chartTopCats"), items.length ? items : [{ label: "Sin datos", value: 0 }], {
    barColor: "rgba(46,204,113,0.45)"
  });
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

  $("countChipDash") && ($("countChipDash").textContent = `${db.accounts.length} cuentas · ${db.expenses.length} gastos`);
  $("miniAccounts") && ($("miniAccounts").textContent = fmt0(db.accounts.length));
  $("miniExpenses") && ($("miniExpenses").textContent = fmt0(db.expenses.length));
  $("miniCollect") && ($("miniCollect").textContent = fmt0(db.accounts.filter((a) => a.collect === "YES").length));
  $("miniUrgent") && ($("miniUrgent").textContent = fmt0(expState.urgent));

  const sales7 = groupAccountsByCategoryWithinDays(7).slice(0, 10);
  const sales30 = groupAccountsByCategoryWithinDays(30).slice(0, 10);
  const exp30 = groupExpensesByCategoryWithinDays(30).slice(0, 10);

  drawBarChart($("chartSales7"), sales7.length ? sales7 : [{ label: "Sin datos", value: 0 }], { barColor: "rgba(110,168,254,0.55)" });
  drawBarChart($("chartSales30"), sales30.length ? sales30 : [{ label: "Sin datos", value: 0 }], { barColor: "rgba(110,168,254,0.55)" });
  drawBarChart($("chartExpenses30"), exp30.length ? exp30 : [{ label: "Sin datos", value: 0 }], { barColor: "rgba(255,107,107,0.40)" });
}

// refrescar cada minuto
setInterval(() => renderAll(), 60000);

function renderAll() {
  if ($("kpiSales")) renderDashboard();
  if ($("tbodyAcc")) renderAccounts();
  if ($("tbodyExp")) renderExpenses();
  if ($("chartTopCats")) renderAnalytics();
}

// =======================
// Backup JSON
// =======================
$("btnBackup")?.addEventListener("click", () => {
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
});

// =======================
// Import CSV
// =======================
$("btnImportCsvBtn")?.addEventListener("click", () => $("fileImportCsv")?.click());

function parseCSV(text) {
  const out = [];
  let row = [], val = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (ch === '"') {
      if (inQ && nx === '"') { val += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      row.push(val); val = "";
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && nx === '\n') i++;
      row.push(val);
      if (row.some((x) => String(x).trim() !== "")) out.push(row);
      row = []; val = "";
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
    .trim().toLowerCase()
    .replaceAll("á", "a").replaceAll("é", "e").replaceAll("í", "i").replaceAll("ó", "o").replaceAll("ú", "u")
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
  a.category = (obj.categoria || obj.category || obj.tipo || "").trim();
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

  const cob = String(obj.cobrar || obj.pendiente || obj.collect || "NO").trim().toUpperCase();
  a.collect = (cob === "SI" || cob === "YES" || cob === "1" || cob === "TRUE") ? "YES" : "NO";

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
      headers.forEach((h, i) => (o[h] = String(cols[i] ?? "").trim()));
      return o;
    });

    const hasAmount = headers.includes("monto") || headers.includes("amount");
    const hasSell = headers.includes("precio") || headers.includes("venta") || headers.includes("sellprice");

    if (hasAmount && !hasSell) {
      const incoming = rowsObj.map(mapCSVToExpense).filter((x) => x.category && x.amount > 0);
      for (const it of incoming) await addExpenseFirestore(it);
      toast(`CSV importado: ${incoming.length} gastos ✅`);
    } else {
      const incoming = rowsObj.map(mapCSVToAccount).filter((x) => x.category && x.profileName);
      for (const it of incoming) await addAccountFirestore(it);
      toast(`CSV importado: ${incoming.length} cuentas ✅`);
    }
  } catch (err) {
    console.error("CSV import error:", err);
    toast("No se pudo importar CSV.");
  }
});

// (opcional) soporte si algún día usas <form id="loginForm">
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    doLogin();
  });
}
