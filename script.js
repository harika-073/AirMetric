
"use strict";

/*
 AetherIQ frontend prototype.
 Data is saved in this browser using localStorage.
 This is NOT yet connected to MySQL.
 Never use frontend-only authentication for real security.
*/

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "aetheriq_workspace_v1";
const REPORT_KEY = "aetheriq_reports_v1";

const DEMO_ACCOUNTS = [
  { name: "AetherIQ Admin", email: "admin@aetheriq.com", password: "AirIQ@123", role: "admin" },
  { name: "AetherIQ User", email: "user@aetheriq.com", password: "AirIQ@123", role: "user" }
];

const POLLUTANTS = {
  "PM2.5": { unit: "µg/m³", label: "Fine particulate matter" },
  "PM10": { unit: "µg/m³", label: "Coarse particulate matter" },
  "CO": { unit: "mg/m³", label: "Carbon monoxide" },
  "NO2": { unit: "µg/m³", label: "Nitrogen dioxide" },
  "SO2": { unit: "µg/m³", label: "Sulfur dioxide" },
  "O3": { unit: "µg/m³", label: "Ozone" }
};

const initialStations = [
  { id: "ST001", name: "Central Green Park", location: "Hyderabad, Telangana", type: "Urban" },
  { id: "ST002", name: "Industrial East", location: "Uppal, Hyderabad", type: "Industrial" },
  { id: "ST003", name: "Riverside Residential", location: "Secunderabad, Telangana", type: "Residential" }
];

function makeDate(daysAgo, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function seedReadings() {
  const examples = [
    ["ST001", "PM2.5", 8.4, "µg/m³", 42],
    ["ST001", "PM10", 16.2, "µg/m³", 42],
    ["ST001", "CO", 0.3, "mg/m³", 42],
    ["ST002", "PM2.5", 27.8, "µg/m³", 92],
    ["ST002", "NO2", 31.4, "µg/m³", 92],
    ["ST003", "PM10", 22.1, "µg/m³", 56],
    ["ST003", "SO2", 8.2, "µg/m³", 56],
    ["ST001", "O3", 19.5, "µg/m³", 38],
    ["ST002", "PM10", 42.6, "µg/m³", 108],
    ["ST003", "PM2.5", 11.3, "µg/m³", 38]
  ];

  return examples.map((r, i) => ({
    id: "RD" + String(i + 1).padStart(4, "0"),
    stationId: r[0],
    pollutant: r[1],
    value: r[2],
    unit: r[3],
    aqi: r[4],
    timestamp: makeDate(i % 7, 8 + (i % 9)),
    notes: "Illustrative sample measurement"
  }));
}

function loadWorkspace() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.readings) && Array.isArray(parsed.stations)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Workspace data could not be loaded.", error);
  }

  return {
    readings: seedReadings(),
    stations: initialStations.map(s => ({ ...s }))
  };
}

let db = loadWorkspace();
let currentUser = null;
let trendChart = null;
let reportChart = null;
let toastTimer = null;
let generatedReports = [];

try {
  const savedReports = JSON.parse(localStorage.getItem(REPORT_KEY) || "[]");
  if (Array.isArray(savedReports)) generatedReports = savedReports;
} catch (_) {
  generatedReports = [];
}

function saveWorkspace() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (error) {
    showToast("Could not save browser data. Check available storage.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDay(value) {
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short"
  });
}

function getStation(id) {
  return db.stations.find(s => s.id === id);
}

function getStatus(aqi) {
  if (aqi == null || aqi === "") return "Unrated";
  const n = Number(aqi);
  if (n <= 50) return "Good";
  if (n <= 100) return "Moderate";
  if (n <= 150) return "Poor";
  return "Unhealthy";
}

function statusClass(status) {
  return ({
    Good: "status-good",
    Moderate: "status-moderate",
    Poor: "status-poor",
    Unhealthy: "status-unhealthy"
  })[status] || "status-neutral";
}

function statusBadge(aqi) {
  const status = getStatus(aqi);
  return `<span class="status-pill ${statusClass(status)}">${escapeHTML(status)}</span>`;
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function isAdmin() {
  return currentUser?.role === "admin";
}

function updateRoleUI() {
  document.querySelectorAll(".admin-only").forEach(el => {
    el.classList.toggle("hidden", !isAdmin());
  });

  const adminNav = document.querySelector(".admin-nav");
  const adminLabel = document.querySelector(".admin-label");
  if (adminNav) adminNav.classList.toggle("hidden", !isAdmin());
  if (adminLabel) adminLabel.classList.toggle("hidden", !isAdmin());

  $("profileName").textContent = currentUser.name;
  $("profileRole").textContent = isAdmin() ? "Administrator" : "Standard user";
  $("profileAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
  $("welcomeText").textContent = `Welcome back, ${currentUser.name}.`;
}

/* Authentication: demo-only until the PHP backend is connected. */
function login(email, password, role) {
  const account = DEMO_ACCOUNTS.find(a =>
    a.email.toLowerCase() === email.trim().toLowerCase() &&
    a.password === password &&
    a.role === role
  );

  if (!account) {
    $("loginError").textContent = "Invalid demo credentials or account role. Please try again.";
    return;
  }

  currentUser = { name: account.name, email: account.email, role: account.role };
  $("loginError").textContent = "";
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  updateRoleUI();
  updateCurrentDate();
  renderAll();
  navigate("overview");
  showToast(`Welcome to AetherIQ, ${account.name}.`);
}

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  login($("email").value, $("password").value, $("loginRole").value);
});

document.querySelectorAll(".demo-account").forEach(button => {
  button.addEventListener("click", () => {
    const role = button.dataset.role;
    const account = DEMO_ACCOUNTS.find(a => a.role === role);
    $("email").value = account.email;
    $("password").value = account.password;
    $("loginRole").value = role;
    login(account.email, account.password, role);
  });
});

$("togglePassword").addEventListener("click", () => {
  const field = $("password");
  const showing = field.type === "text";
  field.type = showing ? "password" : "text";
  $("togglePassword").textContent = showing ? "Show" : "Hide";
});

$("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  $("app").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("password").value = "";
  $("loginError").textContent = "";
  $("sidebar").classList.remove("open");
});

$("profileButton").addEventListener("click", () => {
  showToast(`${currentUser?.email || ""} · ${isAdmin() ? "Administrator" : "Standard user"}`);
});

/* Navigation */
const PAGE_NAMES = {
  overview: "Overview",
  readings: "Air readings",
  stations: "Monitoring stations",
  reports: "Reports & analytics",
  alerts: "Pollution alerts",
  users: "User management"
};

function navigate(page) {
  if (!PAGE_NAMES[page]) return;
  if (page === "users" && !isAdmin()) {
    showToast("Administrator access is required.");
    return;
  }

  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });

  document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("breadcrumbPage").textContent = PAGE_NAMES[page];
  $("sidebar").classList.remove("open");

  if (page === "overview") renderOverview();
  if (page === "readings") renderReadings();
  if (page === "stations") renderStations();
  if (page === "reports") renderReports();
  if (page === "alerts") renderAlerts();
  if (page === "users") renderUsers();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    navigate(button.dataset.page);
  });
});

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

function updateCurrentDate() {
  $("currentDate").textContent = new Date().toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* Overview */
function latestReadingFor(pollutant) {
  return db.readings
    .filter(r => r.pollutant === pollutant)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
}

function averageAQI(readings) {
  const records = readings.filter(r => r.aqi != null && r.aqi !== "" && Number.isFinite(Number(r.aqi)));
  if (!records.length) return null;
  return Math.round(records.reduce((sum, r) => sum + Number(r.aqi), 0) / records.length);
}

function renderOverview() {
  const aqi = averageAQI(db.readings);
  const aqiText = aqi === null ? "—" : aqi;

  $("aqiValue").textContent = aqiText;
  $("aqiStatus").textContent = aqi === null ? "No data" : getStatus(aqi);
  $("aqiStatus").className = "status-pill " + statusClass(aqi === null ? "" : getStatus(aqi));
  $("aqiDescription").textContent = aqi === null ? "Add readings to begin" :
    aqi <= 50 ? "Good air quality range" :
    aqi <= 100 ? "Moderate air quality range" :
    aqi <= 150 ? "Elevated pollution levels" : "High pollution levels";
  $("aqiMeter").style.width = `${aqi === null ? 0 : Math.min(100, aqi / 300 * 100)}%`;

  const pm25 = latestReadingFor("PM2.5");
  const pm10 = latestReadingFor("PM10");
  const co = latestReadingFor("CO");
  $("pm25Value").textContent = pm25 ? Number(pm25.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
  $("pm10Value").textContent = pm10 ? Number(pm10.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
  $("coValue").textContent = co ? Number(co.value).toLocaleString(undefined, { maximumFractionDigits: 3 }) : "—";

  $("stationCount").textContent = db.stations.length;
  renderStationPreview();
  renderRecentReadings();
  renderDistribution();
  renderTrendChart();
  updateAlertBadge();
}

function renderStationPreview() {
  const container = $("stationPreview");
  if (!db.stations.length) {
    container.innerHTML = '<div class="empty-state">No stations added yet.</div>';
    return;
  }

  container.innerHTML = db.stations.slice(0, 4).map(station => {
    const readings = db.readings.filter(r => r.stationId === station.id);
    const aqi = averageAQI(readings);
    return `
      <div class="station-row">
        <div class="station-pin">⌖</div>
        <div class="station-row-info">
          <strong>${escapeHTML(station.name)}</strong>
          <small>${escapeHTML(station.location)}</small>
        </div>
        <div class="station-value">
          <strong>${aqi === null ? "—" : aqi}</strong>
          <small>${aqi === null ? "No AQI" : escapeHTML(getStatus(aqi))}</small>
        </div>
      </div>`;
  }).join("");
}

function renderRecentReadings() {
  const body = $("recentReadingsBody");
  const rows = [...db.readings]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="4">No readings available.</td></tr>';
    return;
  }

  body.innerHTML = rows.map(r => {
    const station = getStation(r.stationId);
    return `<tr>
      <td><div class="table-primary">${escapeHTML(station?.name || "Unknown station")}</div><div class="table-secondary">${escapeHTML(r.pollutant)}</div></td>
      <td class="value-cell">${escapeHTML(r.value)} <span class="table-secondary">${escapeHTML(r.unit)}</span></td>
      <td>${statusBadge(r.aqi)}</td>
      <td>${escapeHTML(formatDate(r.timestamp))}</td>
    </tr>`;
  }).join("");
}

function renderDistribution() {
  const container = $("distributionList");
  const groups = [
    { name: "Good", color: "#83e4ad" },
    { name: "Moderate", color: "#e7c578" },
    { name: "Poor", color: "#efa477" },
    { name: "Unhealthy", color: "#e58e98" }
  ];

  const rated = db.readings.filter(r => r.aqi != null && r.aqi !== "");
  container.innerHTML = groups.map(group => {
    const count = rated.filter(r => getStatus(r.aqi) === group.name).length;
    const pct = rated.length ? Math.round(count / rated.length * 100) : 0;
    return `<div class="distribution-row">
      <div class="distribution-label"><span>${group.name}</span><span>${count} · ${pct}%</span></div>
      <div class="distribution-track"><span style="width:${pct}%;background:${group.color}"></span></div>
    </div>`;
  }).join("");
}

/* Charts */
function chartColors() {
  const light = document.body.classList.contains("light-theme");
  return {
    text: light ? "#758679" : "#91a296",
    grid: light ? "#e7eee7" : "#29372e"
  };
}

function buildTrendSeries(days) {
  const now = new Date();
  const labels = [];
  const pm25 = [];
  const pm10 = [];
  const no2 = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString();
    labels.push(d.toLocaleDateString([], { day: "numeric", month: "short" }));

    const dayRows = db.readings.filter(r =>
      new Date(r.timestamp).toLocaleDateString() === key
    );

    function mean(pollutant) {
      const values = dayRows.filter(r => r.pollutant === pollutant).map(r => Number(r.value));
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }

    pm25.push(mean("PM2.5"));
    pm10.push(mean("PM10"));
    no2.push(mean("NO2"));
  }

  return { labels, pm25, pm10, no2 };
}

function renderTrendChart() {
  if (typeof Chart === "undefined" || !$("trendChart")) return;
  const days = Number($("chartRange").value || 7);
  const data = buildTrendSeries(days);
  const colors = chartColors();

  if (trendChart) trendChart.destroy();
  trendChart = new Chart($("trendChart"), {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        { label: "PM2.5", data: data.pm25, borderColor: "#83e4ad", backgroundColor: "#83e4ad16", fill: true, tension: .38, pointRadius: 2, spanGaps: true },
        { label: "PM10", data: data.pm10, borderColor: "#89bff1", backgroundColor: "transparent", tension: .38, pointRadius: 2, spanGaps: true },
        { label: "NO₂", data: data.no2, borderColor: "#bca3f4", backgroundColor: "transparent", tension: .38, pointRadius: 2, spanGaps: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#17231b", titleColor: "#edf5ee", bodyColor: "#b8cabc", padding: 12, cornerRadius: 9 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
        y: { beginAtZero: true, grid: { color: colors.grid }, border: { display: false }, ticks: { color: colors.text, maxTicksLimit: 5 } }
      }
    }
  });
}

$("chartRange").addEventListener("change", renderTrendChart);

/* Readings: create, edit, delete, search and filter */
function populateStationSelect(selectId, includeAll = false) {
  const select = $(selectId);
  if (!select) return;
  const previous = select.value;
  select.innerHTML = includeAll ? '<option value="">All stations</option>' : "";

  db.stations.forEach(station => {
    const option = document.createElement("option");
    option.value = station.id;
    option.textContent = station.name;
    select.appendChild(option);
  });

  if ([...select.options].some(o => o.value === previous)) select.value = previous;
}

function renderReadings() {
  const query = $("readingSearch").value.trim().toLowerCase();
  const pollutant = $("pollutantFilter").value;
  const status = $("statusFilter").value;

  const rows = [...db.readings]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .filter(r => {
      const station = getStation(r.stationId);
      const matchesQuery = [
        r.id, r.pollutant, station?.name, station?.location, getStatus(r.aqi)
      ].join(" ").toLowerCase().includes(query);
      return matchesQuery &&
        (!pollutant || r.pollutant === pollutant) &&
        (!status || getStatus(r.aqi) === status);
    });

  $("readingCountText").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
  $("readingsEmpty").classList.toggle("hidden", rows.length > 0);

  $("readingsBody").innerHTML = rows.map(r => {
    const station = getStation(r.stationId);
    return `<tr>
      <td><div class="table-primary">${escapeHTML(r.id)} · ${escapeHTML(station?.name || "Unknown station")}</div><div class="table-secondary">${escapeHTML(station?.location || "")}</div></td>
      <td><div class="table-primary">${escapeHTML(r.pollutant)}</div><div class="table-secondary">${escapeHTML(POLLUTANTS[r.pollutant]?.label || "")}</div></td>
      <td><span class="value-cell">${escapeHTML(r.value)}</span> <span class="table-secondary">${escapeHTML(r.unit)}</span></td>
      <td>${r.aqi == null || r.aqi === "" ? '<span class="status-pill status-neutral">Not rated</span>' : `<div class="table-primary">${escapeHTML(r.aqi)} AQI</div><div style="margin-top:5px">${statusBadge(r.aqi)}</div>`}</td>
      <td>${escapeHTML(formatDate(r.timestamp))}</td>
      <td class="admin-only">${isAdmin() ? `<div class="row-actions"><button class="small-action" data-edit-reading="${escapeHTML(r.id)}">Edit</button><button class="small-action danger" data-delete-reading="${escapeHTML(r.id)}">Delete</button></div>` : "—"}</td>
    </tr>`;
  }).join("");

  document.querySelectorAll("#readingsBody [data-edit-reading]").forEach(button => {
    button.addEventListener("click", () => openReadingModal(button.dataset.editReading));
  });

  document.querySelectorAll("#readingsBody [data-delete-reading]").forEach(button => {
    button.addEventListener("click", () => deleteReading(button.dataset.deleteReading));
  });
}

["readingSearch", "pollutantFilter", "statusFilter"].forEach(id => {
  $(id).addEventListener(id === "readingSearch" ? "input" : "change", renderReadings);
});

function openReadingModal(id = "") {
  if (!isAdmin()) {
    showToast("Administrator access is required to modify readings.");
    return;
  }

  if (!db.stations.length) {
    showToast("Add a monitoring station before entering readings.");
    navigate("stations");
    return;
  }

  populateStationSelect("readingStation");
  $("readingForm").reset();
  $("editReadingId").value = id;
  $("modalError").textContent = "";

  if (id) {
    const reading = db.readings.find(r => r.id === id);
    if (!reading) return;
    $("modalTitle").textContent = "Edit reading";
    $("readingStation").value = reading.stationId;
    $("readingPollutant").value = reading.pollutant;
    $("readingValue").value = reading.value;
    $("readingUnit").value = reading.unit;
    $("readingAQI").value = reading.aqi ?? "";
    $("readingTime").value = reading.timestamp;
    $("readingNotes").value = reading.notes || "";
  } else {
    $("modalTitle").textContent = "Add reading";
    $("readingTime").value = new Date().toISOString().slice(0, 16);
    $("readingUnit").value = POLLUTANTS[$("readingPollutant").value].unit;
  }

  $("modalBackdrop").classList.remove("hidden");
}

document.querySelectorAll('[data-action="add-reading"]').forEach(button => {
  button.addEventListener("click", () => openReadingModal());
});

$("readingPollutant").addEventListener("change", () => {
  $("readingUnit").value = POLLUTANTS[$("readingPollutant").value].unit;
});

function newId(prefix, records) {
  let id;
  do {
    id = prefix + Math.random().toString(36).slice(2, 9).toUpperCase();
  } while (records.some(record => record.id === id));
  return id;
}

$("readingForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!isAdmin()) return;

  const id = $("editReadingId").value;
  const value = Number($("readingValue").value);
  const aqiInput = $("readingAQI").value;
  const timestamp = $("readingTime").value;
  const pollutant = $("readingPollutant").value;

  if (!Number.isFinite(value) || value < 0) {
    $("modalError").textContent = "Enter a valid non-negative measurement.";
    return;
  }

  if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) {
    $("modalError").textContent = "Choose a valid date and time.";
    return;
  }

  if (aqiInput !== "" && (!Number.isFinite(Number(aqiInput)) || Number(aqiInput) < 0 || Number(aqiInput) > 500)) {
    $("modalError").textContent = "AQI must be between 0 and 500.";
    return;
  }

  const record = {
    id: id || newId("RD", db.readings),
    stationId: $("readingStation").value,
    pollutant,
    value,
    unit: $("readingUnit").value,
    aqi: aqiInput === "" ? null : Number(aqiInput),
    timestamp,
    notes: $("readingNotes").value.trim()
  };

  if (!record.stationId || !getStation(record.stationId)) {
    $("modalError").textContent = "Select a valid monitoring station.";
    return;
  }

  if (id) {
    const index = db.readings.findIndex(r => r.id === id);
    if (index >= 0) db.readings[index] = record;
  } else {
    db.readings.push(record);
  }

  saveWorkspace();
  closeReadingModal();
  renderAll();
  showToast(id ? "Reading updated successfully." : "New reading saved successfully.");
});

function deleteReading(id) {
  if (!isAdmin()) return;
  const record = db.readings.find(r => r.id === id);
  if (!record) return;

  if (!confirm(`Delete reading ${id} (${record.pollutant})?`)) return;
  db.readings = db.readings.filter(r => r.id !== id);
  saveWorkspace();
  renderAll();
  showToast("Reading deleted.");
}

function closeReadingModal() {
  $("modalBackdrop").classList.add("hidden");
}

$("closeModal").addEventListener("click", closeReadingModal);
$("cancelModal").addEventListener("click", closeReadingModal);
$("modalBackdrop").addEventListener("click", event => {
  if (event.target === $("modalBackdrop")) closeReadingModal();
});

/* Monitoring stations */
function renderStations() {
  const container = $("stationCards");

  if (!db.stations.length) {
    container.innerHTML = '<div class="panel empty-state"><span>⌖</span><h3>No monitoring stations</h3><p>Add a station to start organising readings.</p></div>';
    return;
  }

  container.innerHTML = db.stations.map(station => {
    const readings = db.readings.filter(r => r.stationId === station.id);
    const aqi = averageAQI(readings);
    const pm25 = latestReadingForStation(station.id, "PM2.5");

    return `<article class="station-card">
      <div class="station-card-top"><div class="station-card-icon">⌖</div>${aqi == null ? '<span class="status-pill status-neutral">No AQI</span>' : statusBadge(aqi)}</div>
      <h3>${escapeHTML(station.name)}</h3>
      <p>⌖ ${escapeHTML(station.location)}</p>
      <div class="station-card-metrics">
        <div><span>Average recorded AQI</span><strong>${aqi === null ? "—" : aqi}</strong></div>
        <div><span>PM2.5 latest</span><strong>${pm25 ? escapeHTML(pm25.value) : "—"}</strong></div>
      </div>
      <div class="station-card-bottom"><small>${escapeHTML(station.type)} · ${readings.length} reading(s)</small>${isAdmin() ? `<button class="small-action danger" data-delete-station="${escapeHTML(station.id)}">Delete</button>` : `<button class="small-action" data-station-readings="${escapeHTML(station.id)}">View readings</button>`}</div>
    </article>`;
  }).join("");

  document.querySelectorAll("[data-delete-station]").forEach(button => {
    button.addEventListener("click", () => deleteStation(button.dataset.deleteStation));
  });

  document.querySelectorAll("[data-station-readings]").forEach(button => {
    button.addEventListener("click", () => {
      navigate("readings");
      $("readingSearch").value = getStation(button.dataset.stationReadings)?.name || "";
      renderReadings();
    });
  });
}

function latestReadingForStation(stationId, pollutant) {
  return db.readings.filter(r => r.stationId === stationId && r.pollutant === pollutant)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
}

function openStationModal() {
  if (!isAdmin()) return;
  $("stationForm").reset();
  $("stationModalError").textContent = "";
  $("stationModalTitle").textContent = "Add monitoring station";
  $("stationModalBackdrop").classList.remove("hidden");
}

document.querySelector('[data-action="add-station"]').addEventListener("click", openStationModal);
$("closeStationModal").addEventListener("click", closeStationModal);
$("cancelStationModal").addEventListener("click", closeStationModal);
$("stationModalBackdrop").addEventListener("click", event => {
  if (event.target === $("stationModalBackdrop")) closeStationModal();
});

function closeStationModal() {
  $("stationModalBackdrop").classList.add("hidden");
}

$("stationForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!isAdmin()) return;

  const name = $("stationName").value.trim();
  const location = $("stationLocation").value.trim();

  if (!name || !location) {
    $("stationModalError").textContent = "Enter both the station name and location.";
    return;
  }

  if (db.stations.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    $("stationModalError").textContent = "A station with this name already exists.";
    return;
  }

  db.stations.push({
    id: newId("ST", db.stations),
    name,
    location,
    type: $("stationType").value
  });

  saveWorkspace();
  closeStationModal();
  renderAll();
  showToast("Monitoring station added.");
});

function deleteStation(id) {
  if (!isAdmin()) return;
  const station = getStation(id);
  if (!station) return;

  if (db.readings.some(r => r.stationId === id)) {
    showToast("This station has readings. Delete or reassign them first.");
    return;
  }

  if (!confirm(`Delete monitoring station "${station.name}"?`)) return;
  db.stations = db.stations.filter(s => s.id !== id);
  saveWorkspace();
  renderAll();
  showToast("Monitoring station deleted.");
}

/* Reports */
function getReportReadings() {
  const from = $("reportFrom").value;
  const to = $("reportTo").value;
  const station = $("reportStation").value;

  return db.readings.filter(r => {
    const date = new Date(r.timestamp);
    if (from && date < new Date(`${from}T00:00:00`)) return false;
    if (to && date > new Date(`${to}T23:59:59.999`)) return false;
    if (station && r.stationId !== station) return false;
    return true;
  }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function renderReports() {
  populateStationSelect("reportStation", true);
  const rows = getReportReadings();
  const avg = averageAQI(rows);
  const distinctStations = new Set(rows.map(r => r.stationId));

  $("reportTotal").textContent = rows.length;
  $("reportAvg").textContent = avg === null ? "—" : avg;
  $("reportStations").textContent = distinctStations.size;
  $("reportElevated").textContent = rows.filter(r => Number(r.aqi) > 50).length;

  renderReportChart(rows);
  renderReportHistory();
}

function renderReportChart(rows) {
  if (typeof Chart === "undefined" || !$("reportChart")) return;
  const colors = chartColors();
  const buckets = new Map();

  rows.forEach(r => {
    if (!buckets.has(r.pollutant)) buckets.set(r.pollutant, []);
    buckets.get(r.pollutant).push(Number(r.value));
  });

  const labels = [...buckets.keys()];
  const values = labels.map(name => {
    const list = buckets.get(name);
    return list.reduce((sum, n) => sum + n, 0) / list.length;
  });

  if (reportChart) reportChart.destroy();

  reportChart = new Chart($("reportChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Average measured concentration",
        data: values,
        backgroundColor: ["#83e4adbb", "#89bff1bb", "#bca3f4bb", "#e7c578bb", "#e99b8dbb", "#81cfc9bb"],
        borderRadius: 7,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#17231b", titleColor: "#edf5ee", bodyColor: "#b8cabc" }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.text } },
        y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.text } }
      }
    }
  });
}

$("applyReport").addEventListener("click", renderReports);

$("generateReport").addEventListener("click", () => {
  const rows = getReportReadings();
  const report = {
    id: newId("RP", generatedReports),
    name: "Environmental readings report",
    generatedAt: new Date().toISOString(),
    count: rows.length,
    averageAQI: averageAQI(rows),
    station: $("reportStation").value || "All stations",
    from: $("reportFrom").value || "Any",
    to: $("reportTo").value || "Any"
  };

  generatedReports.unshift(report);
  generatedReports = generatedReports.slice(0, 30);

  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(generatedReports));
  } catch (_) {
    showToast("Report history could not be saved.");
  }

  renderReportHistory();
  showToast("Report generated. Export CSV for a spreadsheet copy.");
});

function renderReportHistory() {
  const container = $("reportHistory");
  if (!generatedReports.length) {
    container.innerHTML = '<div class="empty-state"><span>▤</span><h3>No reports generated yet</h3><p>Choose your filters and generate your first report.</p></div>';
    return;
  }

  container.innerHTML = generatedReports.map(r => `
    <div class="report-history-row">
      <div class="report-history-icon">▤</div>
      <div><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(formatDate(r.generatedAt))} · ${escapeHTML(r.count)} records · Average AQI ${r.averageAQI ?? "—"}</small></div>
      <button class="small-action" data-export-saved="${escapeHTML(r.id)}">Export current data</button>
    </div>`).join("");

  container.querySelectorAll("[data-export-saved]").forEach(button => {
    button.addEventListener("click", () => exportCSV(getReportReadings(), "aetheriq-report.csv"));
  });
}

/* CSV export */
function csvEscape(value) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

function downloadCSV(rows, filename) {
  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCSV(readings, filename) {
  const header = ["Reading ID", "Station", "Location", "Pollutant", "Value", "Unit", "AQI", "Status", "Timestamp", "Notes"];
  const rows = readings.map(r => {
    const station = getStation(r.stationId);
    return [
      r.id, station?.name || "Unknown", station?.location || "",
      r.pollutant, r.value, r.unit, r.aqi ?? "", getStatus(r.aqi),
      r.timestamp, r.notes || ""
    ];
  });

  downloadCSV([header, ...rows], filename);
  showToast("CSV export downloaded.");
}

$("exportReadings").addEventListener("click", () => {
  const query = $("readingSearch").value.trim().toLowerCase();
  const pollutant = $("pollutantFilter").value;
  const status = $("statusFilter").value;

  const rows = db.readings.filter(r => {
    const station = getStation(r.stationId);
    return [r.id, r.pollutant, station?.name, station?.location, getStatus(r.aqi)]
      .join(" ").toLowerCase().includes(query) &&
      (!pollutant || r.pollutant === pollutant) &&
      (!status || getStatus(r.aqi) === status);
  });

  exportCSV(rows, "aetheriq-readings.csv");
});

$("exportReport").addEventListener("click", () => {
  exportCSV(getReportReadings(), "aetheriq-environmental-report.csv");
});

/* Alerts */
function getAlerts() {
  return db.readings.filter(r => Number(r.aqi) > 50)
    .sort((a, b) => Number(b.aqi) - Number(a.aqi));
}

function updateAlertBadge() {
  $("alertBadge").textContent = getAlerts().length;
}

function renderAlerts() {
  const alerts = getAlerts();
  $("alertTotal").textContent = alerts.length;
  $("alertElevated").textContent = alerts.filter(r => Number(r.aqi) > 100).length;

  const container = $("alertsList");
  if (!alerts.length) {
    container.innerHTML = '<div class="panel empty-state"><span>✓</span><h3>No elevated readings</h3><p>No readings currently exceed the demonstration AQI threshold of 50. This is not a live alert service.</p></div>';
    return;
  }

  container.innerHTML = alerts.map(r => {
    const station = getStation(r.stationId);
    const critical = Number(r.aqi) > 100;
    return `<article class="alert-item ${critical ? "critical" : ""}">
      <div class="alert-item-icon">${critical ? "!" : "◈"}</div>
      <div>
        <strong>${critical ? "Elevated AQI reading" : "Moderate AQI reading"} · ${escapeHTML(station?.name || "Unknown station")}</strong>
        <p>${escapeHTML(r.pollutant)} measured at ${escapeHTML(r.value)} ${escapeHTML(r.unit)}. Recorded AQI: ${escapeHTML(r.aqi)} (${escapeHTML(getStatus(r.aqi))}).</p>
        <small>${escapeHTML(formatDate(r.timestamp))} · Record ${escapeHTML(r.id)}</small>
      </div>
      ${isAdmin() ? `<button class="small-action" data-alert-edit="${escapeHTML(r.id)}">Review</button>` : ""}
    </article>`;
  }).join("");

  container.querySelectorAll("[data-alert-edit]").forEach(button => {
    button.addEventListener("click", () => openReadingModal(button.dataset.alertEdit));
  });
}

$("refreshAlerts").addEventListener("click", () => {
  renderAlerts();
  showToast("Alerts refreshed from the saved readings.");
});

/* Demo user list */
function renderUsers() {
  $("usersBody").innerHTML = DEMO_ACCOUNTS.map(account => `
    <tr>
      <td><div class="table-primary">${escapeHTML(account.name)}</div><div class="table-secondary">Demo account</div></td>
      <td>${escapeHTML(account.email)}</td>
      <td><span class="status-pill ${account.role === "admin" ? "status-good" : "status-neutral"}">${account.role === "admin" ? "Administrator" : "Standard user"}</span></td>
      <td>${account.role === "admin" ? "Manage demo data" : "View dashboard and reports"}</td>
    </tr>`).join("");
}

$("addUserBtn").addEventListener("click", () => {
  showToast("Create real accounts after connecting the PHP authentication API.");
});

/* Theme */
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  $("themeToggle").textContent = isLight ? "☾" : "☼";

  try {
    localStorage.setItem("aetheriq_theme", isLight ? "light" : "dark");
  } catch (_) {}

  renderTrendChart();
  if ($("page-reports").classList.contains("active")) renderReports();
});

try {
  if (localStorage.getItem("aetheriq_theme") === "light") {
    document.body.classList.add("light-theme");
    $("themeToggle").textContent = "☾";
  }
} catch (_) {}

/* Shared refresh */
function renderAll() {
  updateRoleUI();
  populateStationSelect("readingStation");
  populateStationSelect("reportStation", true);
  renderOverview();
  renderReadings();
  renderStations();
  renderReports();
  renderAlerts();
  renderUsers();
}

/* Keyboard shortcuts and modal escape */
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeReadingModal();
    closeStationModal();
    $("sidebar").classList.remove("open");
  }
});

/* Initialise login screen and dates */
updateCurrentDate();
$("loginRole").value = "user";
