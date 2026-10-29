/* =========================================================
   AIRMETRIC — APPLICATION SCRIPT
   Admin/User authentication, dashboard, sensors, readings,
   alerts, reports, CSV export and browser-side persistence.
   ========================================================= */

const $ = (id) => document.getElementById(id);

const STORE = {
  accounts: "airmetric_accounts_v1",
  session: "airmetric_session_v1",
  data: "airmetric_data_v1"
};

let currentUser = null;
let authRole = "admin";
let authMode = "login";
let nextSensorId = 5;
let nextReadingId = 9;
let resolvedAlerts = new Set();
let aqiChart = null;
let pollutionChart = null;
let toastTimer = null;

const dateOffset = (days, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 30, 0, 0);
  return date.toISOString().slice(0, 16);
};

const initialSensors = [
  { id: 1, name: "Campus Central", location: "College Campus", lat: 16.30, lon: 80.45, status: "Active" },
  { id: 2, name: "City Monitor", location: "City Center", lat: 16.31, lon: 80.44, status: "Active" },
  { id: 3, name: "Industrial Watch", location: "Industrial Area", lat: 16.34, lon: 80.48, status: "Maintenance" },
  { id: 4, name: "Green Park Sensor", location: "Green Park", lat: 16.29, lon: 80.43, status: "Inactive" }
];

const initialReadings = [
  { id: 1, sensorId: 1, date: dateOffset(6, 8), pm25: 24, pm10: 41, co2: 420, aqi: 65 },
  { id: 2, sensorId: 2, date: dateOffset(5, 9), pm25: 42, pm10: 70, co2: 450, aqi: 105 },
  { id: 3, sensorId: 3, date: dateOffset(4, 10), pm25: 71, pm10: 120, co2: 520, aqi: 165 },
  { id: 4, sensorId: 1, date: dateOffset(3, 11), pm25: 29, pm10: 48, co2: 430, aqi: 78 },
  { id: 5, sensorId: 2, date: dateOffset(2, 12), pm25: 52, pm10: 90, co2: 470, aqi: 125 },
  { id: 6, sensorId: 3, date: dateOffset(1, 13), pm25: 85, pm10: 145, co2: 580, aqi: 210 },
  { id: 7, sensorId: 1, date: dateOffset(0, 9), pm25: 20, pm10: 36, co2: 410, aqi: 52 },
  { id: 8, sensorId: 2, date: dateOffset(0, 11), pm25: 45, pm10: 77, co2: 460, aqi: 115 }
];

let sensors = [];
let readings = [];

/* -------------------- STORAGE -------------------- */

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Unable to read saved data:", error);
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORE.data, JSON.stringify({
    sensors,
    readings,
    resolvedAlerts: [...resolvedAlerts],
    nextSensorId,
    nextReadingId
  }));
}

function loadData() {
  const saved = readStore(STORE.data, null);

  if (saved && Array.isArray(saved.sensors) && Array.isArray(saved.readings)) {
    sensors = saved.sensors;
    readings = saved.readings;
    resolvedAlerts = new Set(saved.resolvedAlerts || []);
    nextSensorId = saved.nextSensorId || Math.max(0, ...sensors.map(s => s.id)) + 1;
    nextReadingId = saved.nextReadingId || Math.max(0, ...readings.map(r => r.id)) + 1;
  } else {
    sensors = structuredClone(initialSensors);
    readings = structuredClone(initialReadings);
    resolvedAlerts = new Set();
    nextSensorId = 5;
    nextReadingId = 9;
    saveData();
  }
}

function isAdmin() {
  return currentUser?.role === "admin";
}

/* -------------------- UTILITIES -------------------- */

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showAuthMessage(message, success = false) {
  const element = $("auth-message");
  element.textContent = message;
  element.classList.toggle("success", success);
}

function sensorById(id) {
  return sensors.find(sensor => sensor.id === Number(id));
}

function sensorName(id) {
  return sensorById(id)?.name || "Deleted sensor";
}

function fmtDate(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function aqiCategory(aqi) {
  if (aqi <= 50) return ["Good", "good"];
  if (aqi <= 100) return ["Moderate", "moderate"];
  if (aqi <= 150) return ["Poor", "poor"];
  if (aqi <= 200) return ["Very Poor", "severe"];
  return ["Severe", "severe"];
}

function badge(label, kind) {
  return `<span class="badge badge-${esc(String(kind).toLowerCase())}">${esc(label)}</span>`;
}

function requireAdmin() {
  if (isAdmin()) return true;
  showToast("Admin access is required for this action.");
  return false;
}

/* -------------------- AUTHENTICATION -------------------- */

/*
  This is browser-side account handling for the project interface.
  It is not a substitute for server-side authentication.
*/

async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Compatibility fallback for environments without Web Crypto.
  // Real authentication should always hash passwords on a server.
  return "local-" + btoa(unescape(encodeURIComponent(password)));
}

function updateAuthUI() {
  document.querySelectorAll(".auth-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.role === authRole);
  });

  $("auth-title").textContent =
    authRole === "admin" ? "Admin Login" : "User Login";

  $("auth-subtitle").textContent = authRole === "admin"
    ? "Sign in to manage air quality data and monitoring stations."
    : "Sign in to view air quality information and reports.";

  $("role-note").textContent = authRole === "admin"
    ? "Admin access includes management controls."
    : "User access allows viewing and exploring air quality data.";

  $("mode-login").classList.toggle("active", authMode === "login");
  $("mode-signup").classList.toggle("active", authMode === "signup");

  $("name-field").hidden = authMode !== "signup";
  $("confirm-field").hidden = authMode !== "signup";

  $("auth-name").required = authMode === "signup";
  $("auth-confirm").required = authMode === "signup";

  $("auth-submit").textContent = authMode === "signup"
    ? `Create ${authRole === "admin" ? "Admin" : "User"} Account`
    : `Sign In as ${authRole === "admin" ? "Admin" : "User"}`;

  showAuthMessage("");
}

document.querySelectorAll(".auth-tab").forEach(button => {
  button.addEventListener("click", () => {
    authRole = button.dataset.role;
    authMode = "login";
    $("auth-form").reset();
    updateAuthUI();
  });
});

$("mode-login").addEventListener("click", () => {
  authMode = "login";
  updateAuthUI();
});

$("mode-signup").addEventListener("click", () => {
  authMode = "signup";
  updateAuthUI();
});

$("auth-form").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("auth-email").value.trim().toLowerCase();
  const password = $("auth-password").value;

  if (!email || password.length < 8) {
    showAuthMessage("Enter a valid email and a password of at least 8 characters.");
    return;
  }

  const accounts = readStore(STORE.accounts, []);

  if (authMode === "signup") {
    const name = $("auth-name").value.trim();
    const confirmation = $("auth-confirm").value;

    if (!name) {
      showAuthMessage("Please enter your full name.");
      return;
    }

    if (password !== confirmation) {
      showAuthMessage("Passwords do not match.");
      return;
    }

    if (accounts.some(account =>
      account.email === email && account.role === authRole
    )) {
      showAuthMessage("An account already exists for this email and role.");
      return;
    }

    const passwordHash = await hashPassword(password);

    accounts.push({
      name,
      email,
      passwordHash,
      role: authRole,
      createdAt: new Date().toISOString()
    });

    localStorage.setItem(STORE.accounts, JSON.stringify(accounts));

    authMode = "login";
    $("auth-password").value = "";
    $("auth-confirm").value = "";
    updateAuthUI();
    showAuthMessage("Account created. Please sign in.", true);
    return;
  }

  const passwordHash = await hashPassword(password);

  const account = accounts.find(item =>
    item.email === email &&
    item.role === authRole &&
    item.passwordHash === passwordHash
  );

  if (!account) {
    showAuthMessage("Invalid email or password for this account type.");
    return;
  }

  currentUser = account;

  localStorage.setItem(STORE.session, JSON.stringify({
    email: account.email,
    role: account.role
  }));

  enterApplication();
});

function enterApplication() {
  if (!currentUser) return;

  $("auth-screen").hidden = true;
  $("app-shell").hidden = false;

  document.body.classList.toggle("user-mode", !isAdmin());

  $("current-user-name").textContent =
    currentUser.name || currentUser.email;

  $("current-user-role").textContent =
    isAdmin() ? "ADMIN ACCESS" : "USER ACCESS";

  $("user-avatar").textContent =
    (currentUser.name || currentUser.email).trim().charAt(0).toUpperCase();

  document.querySelectorAll(".admin-only").forEach(element => {
    element.hidden = !isAdmin();
  });

  loadData();
  showPage("dashboard");
}

function logout() {
  currentUser = null;
  localStorage.removeItem(STORE.session);

  $("app-shell").hidden = true;
  $("auth-screen").hidden = false;

  document.body.classList.remove("user-mode");
  $("auth-form").reset();

  authMode = "login";
  authRole = "admin";
  updateAuthUI();
}

$("logout-button").addEventListener("click", logout);

function restoreSession() {
  const session = readStore(STORE.session, null);
  const accounts = readStore(STORE.accounts, []);

  if (session) {
    const account = accounts.find(item =>
      item.email === session.email && item.role === session.role
    );

    if (account) {
      currentUser = account;
      enterApplication();
      return;
    }
  }

  $("auth-screen").hidden = false;
  $("app-shell").hidden = true;
  updateAuthUI();
}

/* -------------------- PAGE NAVIGATION -------------------- */

function showPage(page) {
  const target = $(page);
  if (!target) return;

  if (!isAdmin() && ["sensors", "readings", "alerts", "reports", "docs"].includes(page)) {
    // Users can view these sections, but cannot change their data.
  }

  document.querySelectorAll(".page").forEach(element => {
    element.classList.remove("active");
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.remove("active");
  });

  target.classList.add("active");
  document.querySelector(`.nav[data-page="${page}"]`)?.classList.add("active");

  const titles = {
    dashboard: "Air Quality Dashboard",
    sensors: "Sensor Management",
    readings: "Historical Readings",
    alerts: "Pollution Alerts",
    reports: "Reports & Analytics",
    docs: "DBMS Documentation"
  };

  $("page-title").textContent = titles[page] || "AirMetric";
  $("crumb").textContent = page.toUpperCase();

  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.goto));
});

/* -------------------- ALERTS DATA -------------------- */

function getAlerts() {
  return readings
    .filter(reading => reading.aqi > 150)
    .map(reading => ({
      id: reading.id,
      readingId: reading.id,
      sensorId: reading.sensorId,
      aqi: reading.aqi,
      date: reading.date,
      severity: reading.aqi > 200 ? "Severe" : "High",
      status: resolvedAlerts.has(reading.id) ? "Resolved" : "Open"
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* -------------------- DASHBOARD & CHARTS -------------------- */

function renderDashboard() {
  $("total-sensors").textContent = sensors.length;
  $("active-sensors").textContent =
    sensors.filter(sensor => sensor.status === "Active").length;

  const latest = [...readings].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const mostRecent = latest[0];

  $("latest-aqi").textContent = mostRecent ? mostRecent.aqi : "--";
  $("aqi-status").textContent = mostRecent
    ? aqiCategory(mostRecent.aqi)[0]
    : "No readings";

  $("open-alerts").textContent =
    getAlerts().filter(alert => alert.status === "Open").length;

  $("latest-table").innerHTML = latest.slice(0, 6).map(reading => `
    <tr>
      <td>${esc(sensorName(reading.sensorId))}</td>
      <td>${esc(sensorById(reading.sensorId)?.location || "Unknown")}</td>
      <td>${badge(
        `${reading.aqi} · ${aqiCategory(reading.aqi)[0]}`,
        aqiCategory(reading.aqi)[1]
      )}</td>
      <td>${reading.pm25}</td>
      <td>${reading.pm10}</td>
      <td>${esc(fmtDate(reading.date))}</td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="empty">No readings found.</td></tr>`;

  renderCharts(latest);
}

function renderCharts(latest) {
  if (typeof Chart === "undefined") return;

  const history = [...latest].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#b9c9df",
          boxWidth: 12,
          usePointStyle: true
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#91a2bb", maxTicksLimit: 7 },
        grid: { color: "#23344b" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#91a2bb" },
        grid: { color: "#23344b" }
      }
    }
  };

  if (aqiChart) aqiChart.destroy();

  aqiChart = new Chart($("aqiChart"), {
    type: "line",
    data: {
      labels: history.map(item => new Date(item.date).toLocaleDateString()),
      datasets: [{
        label: "AQI",
        data: history.map(item => item.aqi),
        borderColor: "#39d9a0",
        backgroundColor: "rgba(57,217,160,.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 4
      }]
    },
    options: chartOptions
  });

  if (pollutionChart) pollutionChart.destroy();

  const selected = history.slice(-8);

  pollutionChart = new Chart($("pollutionChart"), {
    type: "bar",
    data: {
      labels: selected.map(item => sensorName(item.sensorId).slice(0, 12)),
      datasets: [
        {
          label: "PM2.5",
          data: selected.map(item => item.pm25),
          backgroundColor: "#58a6ff"
        },
        {
          label: "PM10",
          data: selected.map(item => item.pm10),
          backgroundColor: "#f5ca58"
        },
        {
          label: "CO₂",
          data: selected.map(item => item.co2),
          backgroundColor: "#ff9c52"
        }
      ]
    },
    options: chartOptions
  });
}

/* -------------------- SENSOR MANAGEMENT -------------------- */

function renderSensorOptions() {
  const options = sensors.map(sensor =>
    `<option value="${sensor.id}">${esc(sensor.name)} — ${esc(sensor.location)}</option>`
  ).join("");

  const filter = $("reading-sensor-filter");
  const previousFilter = filter.value;

  filter.innerHTML = `<option value="">All sensors</option>${options}`;

  if ([...filter.options].some(option => option.value === previousFilter)) {
    filter.value = previousFilter;
  }

  const formSelect = $("reading-sensor");
  const previousSelection = formSelect.value;

  formSelect.innerHTML = options;

  if ([...formSelect.options].some(option => option.value === previousSelection)) {
    formSelect.value = previousSelection;
  }
}

function renderSensors() {
  const query = $("sensor-search").value.trim().toLowerCase();
  const status = $("sensor-status-filter").value;

  const filtered = sensors.filter(sensor =>
    `${sensor.name} ${sensor.location} ${sensor.id}`.toLowerCase().includes(query) &&
    (!status || sensor.status === status)
  );

  $("sensors-table").innerHTML = filtered.map(sensor => `
    <tr>
      <td>#${sensor.id}</td>
      <td>${esc(sensor.name)}</td>
      <td>${esc(sensor.location)}</td>
      <td>${badge(sensor.status, sensor.status.toLowerCase())}
      </td>
      ${isAdmin() ? `
        <td>
          <div class="table-actions">
            <button class="mini-btn" data-edit-sensor="${sensor.id}">Edit</button>
            <button class="mini-btn delete" data-delete-sensor="${sensor.id}">Delete</button>
          </div>
        </td>` : ""}
    </tr>
  `).join("") || `<tr><td colspan="${isAdmin() ? 5 : 4}" class="empty">No sensors match your search.</td></tr>`;
}

$("sensor-search").addEventListener("input", renderSensors);
$("sensor-status-filter").addEventListener("change", renderSensors);

$("add-sensor").addEventListener("click", () => {
  if (!requireAdmin()) return;

  $("sensor-form").reset();
  $("sensor-id").value = "";
  $("sensor-form-title").textContent = "Add Sensor";
  $("sensor-form-panel").hidden = false;
  $("sensor-form-panel").scrollIntoView({ behavior: "smooth" });
});

$("cancel-sensor").addEventListener("click", () => {
  $("sensor-form-panel").hidden = true;
});

$("sensor-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const id = Number($("sensor-id").value);

  const item = {
    name: $("sensor-name").value.trim(),
    location: $("sensor-location").value.trim(),
    lat: Number($("sensor-lat").value),
    lon: Number($("sensor-lon").value),
    status: $("sensor-status").value
  };

  if (
    !item.name || !item.location ||
    !Number.isFinite(item.lat) || !Number.isFinite(item.lon) ||
    item.lat < -90 || item.lat > 90 ||
    item.lon < -180 || item.lon > 180
  ) {
    showToast("Enter valid sensor details.");
    return;
  }

  if (id) {
    const existing = sensorById(id);
    if (existing) Object.assign(existing, item);
    showToast("Sensor updated.");
  } else {
    sensors.push({ id: nextSensorId++, ...item });
    showToast("Sensor added.");
  }

  saveData();
  $("sensor-form-panel").hidden = true;
  renderAll();
});

$("sensors-table").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-sensor]");
  const remove = event.target.closest("[data-delete-sensor]");

  if (edit) {
    if (!requireAdmin()) return;

    const sensor = sensorById(edit.dataset.editSensor);
    if (!sensor) return;

    $("sensor-id").value = sensor.id;
    $("sensor-name").value = sensor.name;
    $("sensor-location").value = sensor.location;
    $("sensor-lat").value = sensor.lat;
    $("sensor-lon").value = sensor.lon;
    $("sensor-status").value = sensor.status;
    $("sensor-form-title").textContent = "Edit Sensor";
    $("sensor-form-panel").hidden = false;
    $("sensor-form-panel").scrollIntoView({ behavior: "smooth" });
  }

  if (remove) {
    if (!requireAdmin()) return;

    const id = Number(remove.dataset.deleteSensor);
    if (!confirm("Delete this sensor and its related readings?")) return;

    const removedIds = readings
      .filter(reading => reading.sensorId === id)
      .map(reading => reading.id);

    sensors = sensors.filter(sensor => sensor.id !== id);
    readings = readings.filter(reading => reading.sensorId !== id);
    removedIds.forEach(readingId => resolvedAlerts.delete(readingId));

    saveData();
    renderAll();
    showToast("Sensor and related readings deleted.");
  }
});

/* -------------------- HISTORICAL READINGS -------------------- */

function getFilteredReadings() {
  const sensorId = $("reading-sensor-filter").value;
  const from = $("date-from").value;
  const to = $("date-to").value;

  return [...readings]
    .filter(reading => !sensorId || reading.sensorId === Number(sensorId))
    .filter(reading => !from || reading.date.slice(0, 10) >= from)
    .filter(reading => !to || reading.date.slice(0, 10) <= to)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderReadings() {
  const filtered = getFilteredReadings();

  $("record-count").textContent = filtered.length;

  $("avg-aqi").textContent = filtered.length
    ? Math.round(filtered.reduce((sum, item) => sum + item.aqi, 0) / filtered.length)
    : "--";

  $("max-aqi").textContent = filtered.length
    ? Math.max(...filtered.map(item => item.aqi))
    : "--";

  $("readings-table").innerHTML = filtered.map(reading => `
    <tr>
      <td>#${reading.id}</td>
      <td>${esc(sensorName(reading.sensorId))}</td>
      <td>${esc(fmtDate(reading.date))}</td>
      <td>${reading.pm25}</td>
      <td>${reading.pm10}</td>
      <td>${reading.co2}</td>
      <td>${badge(
        `${reading.aqi} · ${aqiCategory(reading.aqi)[0]}`,
        aqiCategory(reading.aqi)[1]
      )}</td>
      ${isAdmin() ? `
        <td>
          <div class="table-actions">
            <button class="mini-btn" data-edit-reading="${reading.id}">Edit</button>
            <button class="mini-btn delete" data-delete-reading="${reading.id}">Delete</button>
          </div>
        </td>` : ""}
    </tr>
  `).join("") || `<tr><td colspan="${isAdmin() ? 8 : 7}" class="empty">No readings match these filters.</td></tr>`;
}

["reading-sensor-filter", "date-from", "date-to"].forEach(id => {
  $(id).addEventListener("change", renderReadings);
});

$("clear-filters").addEventListener("click", () => {
  $("reading-sensor-filter").value = "";
  $("date-from").value = "";
  $("date-to").value = "";
  renderReadings();
});

$("add-reading").addEventListener("click", () => {
  if (!requireAdmin()) return;

  if (!sensors.length) {
    showToast("Add a sensor before adding readings.");
    return;
  }

  $("reading-form").reset();
  $("reading-id").value = "";
  $("reading-date").value = dateOffset(0, new Date().getHours());
  $("reading-form-title").textContent = "Add Reading";
  $("reading-form-panel").hidden = false;
  $("reading-form-panel").scrollIntoView({ behavior: "smooth" });
});

$("cancel-reading").addEventListener("click", () => {
  $("reading-form-panel").hidden = true;
});

$("reading-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const id = Number($("reading-id").value);
  const date = $("reading-date").value;

  const item = {
    sensorId: Number($("reading-sensor").value),
    date,
    pm25: Number($("reading-pm25").value),
    pm10: Number($("reading-pm10").value),
    co2: Number($("reading-co2").value),
    aqi: Number($("reading-aqi").value)
  };

  if (
    !sensorById(item.sensorId) ||
    !date || !Number.isFinite(new Date(date).getTime()) ||
    ![item.pm25, item.pm10, item.co2, item.aqi].every(Number.isFinite) ||
    item.pm25 < 0 || item.pm10 < 0 || item.co2 < 0 ||
    item.aqi < 0 || item.aqi > 500
  ) {
    showToast("Check the sensor, date and measurement values.");
    return;
  }

  if (id) {
    const existing = readings.find(reading => reading.id === id);
    if (existing) Object.assign(existing, item);
    resolvedAlerts.delete(id);
    showToast("Reading updated.");
  } else {
    readings.push({ id: nextReadingId++, ...item });
    showToast("Reading added.");
  }

  saveData();
  $("reading-form-panel").hidden = true;
  renderAll();
});

$("readings-table").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-reading]");
  const remove = event.target.closest("[data-delete-reading]");

  if (edit) {
    if (!requireAdmin()) return;

    const reading = readings.find(item =>
      item.id === Number(edit.dataset.editReading)
    );
    if (!reading) return;

    $("reading-id").value = reading.id;
    $("reading-sensor").value = String(reading.sensorId);
    $("reading-date").value = reading.date;
    $("reading-pm25").value = reading.pm25;
    $("reading-pm10").value = reading.pm10;
    $("reading-co2").value = reading.co2;
    $("reading-aqi").value = reading.aqi;
    $("reading-form-title").textContent = "Edit Reading";
    $("reading-form-panel").hidden = false;
    $("reading-form-panel").scrollIntoView({ behavior: "smooth" });
  }

  if (remove) {
    if (!requireAdmin()) return;

    const id = Number(remove.dataset.deleteReading);
    if (!confirm("Delete this reading?")) return;

    readings = readings.filter(reading => reading.id !== id);
    resolvedAlerts.delete(id);

    saveData();
    renderAll();
    showToast("Reading deleted.");
  }
});

/* -------------------- POLLUTION ALERTS -------------------- */

function renderAlerts() {
  const alerts = getAlerts();

  $("total-alerts").textContent = alerts.length;
  $("unresolved-alerts").textContent =
    alerts.filter(alert => alert.status === "Open").length;

  $("alerts-table").innerHTML = alerts.map(alert => `
    <tr>
      <td>#${alert.id}</td>
      <td>${esc(sensorName(alert.sensorId))}</td>
      <td>${esc(sensorById(alert.sensorId)?.location || "Unknown")}</td>
      <td>${alert.aqi}</td>
      <td>${badge(alert.severity, "severe")}</td>
      <td>${esc(fmtDate(alert.date))}</td>
      <td>${badge(alert.status, alert.status.toLowerCase())}</td>
      ${isAdmin() ? `
        <td>
          ${alert.status === "Open"
            ? `<button class="mini-btn" data-resolve="${alert.id}">Resolve</button>`
            : `<button class="mini-btn" data-reopen="${alert.id}">Reopen</button>`}
        </td>` : ""}
    </tr>
  `).join("") || `<tr><td colspan="${isAdmin() ? 8 : 7}" class="empty">No alerts found. Alerts are generated when AQI exceeds 150.</td></tr>`;
}

$("alerts-table").addEventListener("click", event => {
  if (!requireAdmin()) return;

  const resolve = event.target.closest("[data-resolve]");
  const reopen = event.target.closest("[data-reopen]");

  if (resolve) {
    resolvedAlerts.add(Number(resolve.dataset.resolve));
    showToast("Alert resolved.");
  }

  if (reopen) {
    resolvedAlerts.delete(Number(reopen.dataset.reopen));
    showToast("Alert reopened.");
  }

  saveData();
  renderAll();
});

/* -------------------- REPORTS -------------------- */

function renderReports() {
  $("total-readings").textContent = readings.length;

  $("overall-average").textContent = readings.length
    ? (readings.reduce((sum, reading) => sum + reading.aqi, 0) / readings.length).toFixed(1)
    : "--";

  const locations = sensors.map(sensor => {
    const items = readings.filter(reading => reading.sensorId === sensor.id);

    return {
      location: sensor.location,
      sensorCount: 1,
      count: items.length,
      highest: items.length ? Math.max(...items.map(item => item.aqi)) : null,
      average: items.length
        ? (items.reduce((sum, item) => sum + item.aqi, 0) / items.length).toFixed(1)
        : null
    };
  });

  const populated = locations
    .filter(item => item.highest !== null)
    .sort((a, b) => b.highest - a.highest);

  $("worst-location").textContent = populated[0]?.location || "--";

  $("location-report").innerHTML = locations.map(location => `
    <tr>
      <td>${esc(location.location)}</td>
      <td>${location.sensorCount}</td>
      <td>${location.count}</td>
      <td>${location.highest ?? "--"}</td>
      <td>${location.average ?? "--"}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="empty">No locations available.</td></tr>`;

  const days = {};

  readings.forEach(reading => {
    const day = reading.date.slice(0, 10);
    if (!days[day]) days[day] = [];
    days[day].push(reading.aqi);
  });

  $("daily-report").innerHTML = Object.keys(days).sort().reverse().map(day => {
    const values = days[day];
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return `
      <tr>
        <td>${esc(day)}</td>
        <td>${values.length}</td>
        <td>${average.toFixed(1)}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="3" class="empty">No readings available.</td></tr>`;
}

/* -------------------- CSV EXPORT -------------------- */

function exportCSV() {
  const rows = [
    ["Reading ID", "Sensor", "Location", "Recorded At", "PM2.5", "PM10", "CO2 ppm", "AQI"],
    ...getFilteredReadings().map(reading => [
      reading.id,
      sensorName(reading.sensorId),
      sensorById(reading.sensorId)?.location || "",
      reading.date,
      reading.pm25,
      reading.pm10,
      reading.co2,
      reading.aqi
    ])
  ];

  const csv = rows.map(row => row.map(value => {
    let text = String(value ?? "");

    // Prevent spreadsheet formula execution from exported text values.
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;

    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "airmetric-readings.csv";
  link.click();

  URL.revokeObjectURL(url);
  showToast("CSV file exported.");
}

$("export-csv").addEventListener("click", exportCSV);

/* -------------------- REFRESH ALL SECTIONS -------------------- */

function renderAll() {
  renderSensorOptions();
  renderDashboard();
  renderSensors();
  renderReadings();
  renderAlerts();
  renderReports();
}

/* -------------------- START APPLICATION -------------------- */

updateAuthUI();
restoreSession();
