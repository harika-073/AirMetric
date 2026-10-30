
/* AirSense - Air Quality Sensor Readings and Historical Analysis */
const API_URL = "https://airmetric2026.gt.tc/api";
async function login(event) {
  event.preventDefault();

  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;
  const error = $("#loginError");

  if (!email || !password) {
    error.textContent = "Enter your email and password.";
    return;
  }

  error.textContent = "Checking login...";

  try {
    const result = await loginUser(email, password, selectedRole);

    if (!result.success) {
      error.textContent = result.message || "Invalid email or password.";
      return;
    }

    currentUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));

    error.textContent = "";
    showApp();

  } catch (err) {
    console.error("Login error:", err);
    error.textContent = "Cannot connect to server. Check your API URL.";
  }
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEY = "airsense_readings_v1";
const SESSION_KEY = "airsense_session_v1";

let selectedRole = "user"; 
let currentUser = null;
let trendChart = null;
let statusChart = null;
let comparisonChart = null;
let toastTimer;

const seedReadings = [
  { id: "r-1001", location: "Hyderabad Central", sensor: "AS-101", timestamp: "2026-10-29T09:30:00", aqi: 42, pm25: 12.4, co2: 418, temp: 26.2 },
  { id: "r-1002", location: "Tech Park", sensor: "AS-102", timestamp: "2026-10-29T09:15:00", aqi: 58, pm25: 18.6, co2: 436, temp: 27.1 },
  { id: "r-1003", location: "Lake View", sensor: "AS-103", timestamp: "2026-10-29T09:00:00", aqi: 31, pm25: 8.2, co2: 405, temp: 25.4 },
  { id: "r-1004", location: "University", sensor: "AS-104", timestamp: "2026-10-29T08:45:00", aqi: 76, pm25: 24.1, co2: 452, temp: 28.0 },
  { id: "r-1005", location: "Hyderabad Central", sensor: "AS-101", timestamp: "2026-10-28T18:30:00", aqi: 48, pm25: 14.1, co2: 421, temp: 27.0 },
  { id: "r-1006", location: "Tech Park", sensor: "AS-102", timestamp: "2026-10-28T18:15:00", aqi: 63, pm25: 20.3, co2: 440, temp: 28.2 },
  { id: "r-1007", location: "Lake View", sensor: "AS-103", timestamp: "2026-10-28T18:00:00", aqi: 29, pm25: 7.9, co2: 403, temp: 26.1 },
  { id: "r-1008", location: "University", sensor: "AS-104", timestamp: "2026-10-28T17:45:00", aqi: 81, pm25: 26.4, co2: 461, temp: 29.1 },
  { id: "r-1009", location: "Hyderabad Central", sensor: "AS-101", timestamp: "2026-10-27T09:30:00", aqi: 39, pm25: 11.2, co2: 416, temp: 25.8 },
  { id: "r-1010", location: "Tech Park", sensor: "AS-102", timestamp: "2026-10-27T09:15:00", aqi: 54, pm25: 17.1, co2: 432, temp: 26.7 },
  { id: "r-1011", location: "Lake View", sensor: "AS-103", timestamp: "2026-10-27T09:00:00", aqi: 35, pm25: 9.3, co2: 407, temp: 25.2 },
  { id: "r-1012", location: "University", sensor: "AS-104", timestamp: "2026-10-27T08:45:00", aqi: 68, pm25: 21.5, co2: 449, temp: 27.7 },
  { id: "r-1013", location: "Hyderabad Central", sensor: "AS-101", timestamp: "2026-10-26T09:30:00", aqi: 46, pm25: 13.7, co2: 420, temp: 26.4 },
  { id: "r-1014", location: "Tech Park", sensor: "AS-102", timestamp: "2026-10-26T09:15:00", aqi: 61, pm25: 19.8, co2: 441, temp: 27.8 },
  { id: "r-1015", location: "Lake View", sensor: "AS-103", timestamp: "2026-10-26T09:00:00", aqi: 28, pm25: 7.2, co2: 401, temp: 24.9 },
  { id: "r-1016", location: "University", sensor: "AS-104", timestamp: "2026-10-26T08:45:00", aqi: 73, pm25: 23.8, co2: 455, temp: 28.4 },
  { id: "r-1017", location: "Hyderabad Central", sensor: "AS-101", timestamp: "2026-10-25T09:30:00", aqi: 51, pm25: 15.8, co2: 424, temp: 26.9 },
  { id: "r-1018", location: "Tech Park", sensor: "AS-102", timestamp: "2026-10-25T09:15:00", aqi: 66, pm25: 21.1, co2: 447, temp: 28.3 },
  { id: "r-1019", location: "Lake View", sensor: "AS-103", timestamp: "2026-10-25T09:00:00", aqi: 33, pm25: 8.6, co2: 404, temp: 25.7 },
  { id: "r-1020", location: "University", sensor: "AS-104", timestamp: "2026-10-25T08:45:00", aqi: 88, pm25: 28.5, co2: 469, temp: 29.3 }
];

const locations = [
  { name: "Hyderabad Central", sensor: "AS-101", symbol: "⌖" },
  { name: "Tech Park", sensor: "AS-102", symbol: "⌘" },
  { name: "Lake View", sensor: "AS-103", symbol: "⌁" },
  { name: "University", sensor: "AS-104", symbol: "⌂" }
];

function getReadings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("Could not read saved readings:", error);
  }

  saveReadings(seedReadings);
  return [...seedReadings];
}

function saveReadings(readings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
}

function statusFor(aqi) {
  return aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : "Unhealthy";
}

function statusClass(status) {
  return status === "Good"
    ? "status-good"
    : status === "Moderate"
      ? "status-moderate"
      : "status-unhealthy";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function shortDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function latestByLocation(readings = getReadings()) {
  const result = {};

  [...readings]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .forEach(reading => {
      if (!result[reading.location]) {
        result[reading.location] = reading;
      }
    });

  return result;
}

function toast(message) {
  const node = $("#toast");
  if (!node) return;

  node.textContent = message;
  node.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
}

function setRole(role) {
  selectedRole = role;

  $$(".role-option").forEach(button => {
    button.classList.toggle("active", button.dataset.role === role);
  });

  const error = $("#loginError");
  const username = $("#loginEmail");

  if (error) error.textContent = "";
  if (username) {
    username.placeholder = role === "admin"
      ? "Admin username or email"
      : "Enter your username";
  }
}


async function login(event) {
  event.preventDefault();

  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;
  const error = $("#loginError");

  if (!email || !password) {
    error.textContent = "Enter your email and password.";
    return;
  }

  error.textContent = "Checking login...";

  try {
    const result = await loginUser(email, password, selectedRole);

    if (!result.success) {
      error.textContent = result.message || "Invalid email or password.";
      return;
    }

    currentUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));

    error.textContent = "";
    showApp();

  } catch (error) {
    console.error("Login error:", error);
    error.textContent = "Cannot connect to server. Check your API URL.";
  }
}


  /*
   * This selects the requested interface.
   * Real authentication and role permissions must be verified by a server.
   */
  currentUser = {
    name: username.includes("@") ? username.split("@")[0] : username,
    role: selectedRole
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  showApp();
}

function showApp() {
  if (!currentUser) return;

  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");

  const isAdmin = currentUser.role === "admin";
  const display = isAdmin
    ? "Administrator"
    : currentUser.name.replace(/[._-]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());

  $("#profileName").textContent = display;
  $("#profileRole").textContent = isAdmin ? "ADMIN ACCOUNT" : "USER ACCOUNT";
  $("#profileAvatar").textContent = display.charAt(0).toUpperCase();
  $("#topAvatar").textContent = display.charAt(0).toUpperCase();

  $$(".admin-only").forEach(element => {
    element.classList.toggle("hidden", !isAdmin);
  });

  renderAll();
  navigate("overview");
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);

  $("#appShell").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  $("#loginForm").reset();

  setRole("user");
  $("#sidebar").classList.remove("open");
}

function navigate(view) {
  const target = $(`#view-${view}`);
  if (!target) return;

  $$(".view").forEach(section => section.classList.remove("active-view"));
  target.classList.add("active-view");

  $$(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const names = {
    overview: "Overview",
    history: "Historical readings",
    sensors: "Sensors",
    comparison: "Compare monitors",
    manage: "Manage readings"
  };

  $("#breadcrumbCurrent").textContent = names[view] || "Overview";
  $("#sidebar").classList.remove("open");

  if (view === "history") renderHistory();
  if (view === "sensors") renderSensors();
  if (view === "comparison") renderComparison();
  if (view === "manage" && currentUser?.role === "admin") renderAdminTable();
  if (view === "overview") renderOverview();
}

function tableRow(reading) {
  const status = statusFor(Number(reading.aqi));

  return `
    <tr>
      <td>
        <div class="table-location">
          <span class="table-icon">⌖</span>
          <strong>${escapeHTML(reading.location)}</strong>
        </div>
      </td>
      <td>${formatDate(reading.timestamp)}</td>
      <td><strong>${Number(reading.aqi)}</strong></td>
      <td>${Number(reading.pm25).toFixed(1)}</td>
      <td>${Number(reading.temp).toFixed(1)}°C</td>
      <td>
        <span class="status-badge ${statusClass(status)}">${status}</span>
      </td>
    </tr>`;
}

function renderOverview() {
  const readings = getReadings().sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  if (!readings.length) return;

  const latest = latestByLocation(readings);
  const current = readings[0];

  $("#metricAqi").textContent = current.aqi;
  $("#metricPm").textContent = Number(current.pm25).toFixed(1);
  $("#metricCo2").textContent = current.co2;
  $("#metricTemp").textContent = Number(current.temp).toFixed(1);

  const status = statusFor(Number(current.aqi));
  $("#aqiStatus").textContent = status;
  $("#aqiStatus").className = `quality-tag ${status.toLowerCase()}`;
  $("#sensorNavCount").textContent = locations.length;

  $("#recentTableBody").innerHTML = readings.slice(0, 5).map(tableRow).join("");

  $("#locationCards").innerHTML = locations.map(location => {
    const reading = latest[location.name];
    if (!reading) return "";

    const quality = statusFor(Number(reading.aqi));

    return `
      <article class="location-card">
        <div class="location-card-top">
          <span class="location-symbol">${location.symbol}</span>
          <span class="online-dot">Online</span>
        </div>
        <h3>${escapeHTML(location.name)}</h3>
        <div class="sensor-id">Sensor ${location.sensor}</div>
        <div class="location-reading">
          <strong>${reading.aqi}</strong>
          <span>AQI</span>
          <span class="status-badge ${statusClass(quality)}">${quality}</span>
        </div>
        <div class="location-bottom">
          <span>PM2.5</span>
          <strong>${Number(reading.pm25).toFixed(1)} µg/m³</strong>
        </div>
      </article>`;
  }).join("");

  renderCharts(readings);
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1b2b4b",
        padding: 11,
        cornerRadius: 9
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#95a2ba", font: { size: 10 } },
        border: { display: false }
      },
      y: {
        grid: { color: "rgba(151,168,200,.15)" },
        ticks: { color: "#95a2ba", font: { size: 10 } },
        border: { display: false }
      }
    }
  };
}

function renderCharts(readings) {
  if (typeof Chart === "undefined") return;

  const range = Number($("#trendRange")?.value || 7);
  const grouped = {};

  readings.forEach(reading => {
    const key = shortDate(reading.timestamp);

    if (!grouped[key]) grouped[key] = { aqi: [], pm: [] };

    grouped[key].aqi.push(Number(reading.aqi));
    grouped[key].pm.push(Number(reading.pm25));
  });

  const keys = Object.keys(grouped).reverse().slice(-range);
  const aqi = keys.map(key =>
    grouped[key].aqi.reduce((sum, value) => sum + value, 0) /
    grouped[key].aqi.length
  );
  const pm = keys.map(key =>
    grouped[key].pm.reduce((sum, value) => sum + value, 0) /
    grouped[key].pm.length
  );

  const trendCanvas = $("#trendChart");

  if (trendCanvas) {
    if (trendChart) trendChart.destroy();

    const options = chartDefaults();

    options.plugins.tooltip.callbacks = {
      label: context =>
        `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`
    };

    trendChart = new Chart(trendCanvas, {
      type: "line",
      data: {
        labels: keys,
        datasets: [
          {
            label: "AQI",
            data: aqi,
            borderColor: "#4285f4",
            backgroundColor: "rgba(66,133,244,.10)",
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointRadius: 3
          },
          {
            label: "PM2.5",
            data: pm,
            borderColor: "#9c83f2",
            fill: false,
            tension: 0.38,
            borderWidth: 2,
            pointRadius: 2,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        ...options,
        scales: {
          ...options.scales,
          y: { ...options.scales.y, beginAtZero: true },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { color: "#95a2ba", font: { size: 10 } },
            border: { display: false }
          }
        }
      }
    });
  }

  const counts = { Good: 0, Moderate: 0, Unhealthy: 0 };

  readings.forEach(reading => {
    counts[statusFor(Number(reading.aqi))]++;
  });

  const total = readings.length || 1;

  $("#totalReadings").textContent = readings.length;
  $("#goodCount").textContent = `${Math.round(counts.Good / total * 100)}%`;
  $("#moderateCount").textContent = `${Math.round(counts.Moderate / total * 100)}%`;
  $("#unhealthyCount").textContent = `${Math.round(counts.Unhealthy / total * 100)}%`;

  const donutCanvas = $("#statusChart");

  if (donutCanvas) {
    if (statusChart) statusChart.destroy();

    statusChart = new Chart(donutCanvas, {
      type: "doughnut",
      data: {
        labels: ["Good", "Moderate", "Unhealthy"],
        datasets: [{
          data: [counts.Good, counts.Moderate, counts.Unhealthy],
          backgroundColor: ["#43b98c", "#efc454", "#e87983"],
          borderWidth: 0,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "76%",
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#1b2b4b", padding: 10 }
        }
      }
    });
  }
}

function renderHistory() {
  const readings = getReadings().sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const query = $("#historySearch").value.trim().toLowerCase();
  const status = $("#historyStatus").value;
  const days = $("#historyDays").value;
  const cutoff = days === "all"
    ? null
    : Date.now() - Number(days) * 86400000;

  const filtered = readings.filter(reading =>
    (!query || `${reading.location} ${reading.sensor}`.toLowerCase().includes(query)) &&
    (status === "all" || statusFor(Number(reading.aqi)) === status) &&
    (!cutoff || new Date(reading.timestamp).getTime() >= cutoff)
  );

  $("#historyTableBody").innerHTML = filtered.map(reading => {
    const quality = statusFor(Number(reading.aqi));

    return `
      <tr>
        <td><strong>${escapeHTML(reading.location)}</strong></td>
        <td>${escapeHTML(reading.sensor)}</td>
        <td>${formatDate(reading.timestamp)}</td>
        <td><strong>${reading.aqi}</strong></td>
        <td>${Number(reading.pm25).toFixed(1)}</td>
        <td>${reading.co2}</td>
        <td>${Number(reading.temp).toFixed(1)}</td>
        <td><span class="status-badge ${statusClass(quality)}">${quality}</span></td>
      </tr>`;
  }).join("");

  $("#historyEmpty").classList.toggle("hidden", filtered.length > 0);
  $("#historyResultCount").textContent =
    `Showing ${filtered.length} of ${readings.length} records`;
  $("#historyRecordBadge").textContent = `${filtered.length} records`;
}

function renderSensors() {
  const latest = latestByLocation();

  $("#sensorCards").innerHTML = locations.map(location => {
    const reading = latest[location.name];
    if (!reading) return "";

    const quality = statusFor(Number(reading.aqi));

    return `
      <article class="sensor-detail-card">
        <div class="sensor-detail-head">
          <span class="location-symbol">${location.symbol}</span>
          <div>
            <h2>${escapeHTML(location.name)}</h2>
            <p>${location.sensor} · Air quality sensor</p>
          </div>
          <div class="sensor-detail-aqi">
            <strong>${reading.aqi}</strong>
            <span>AQI · ${quality}</span>
          </div>
        </div>
        <div class="sensor-stat-grid">
          <div class="sensor-stat">
            <span>PM2.5</span>
            <strong>${Number(reading.pm25).toFixed(1)} <small>µg/m³</small></strong>
          </div>
          <div class="sensor-stat">
            <span>CO₂</span>
            <strong>${reading.co2} <small>ppm</small></strong>
          </div>
          <div class="sensor-stat">
            <span>Temperature</span>
            <strong>${Number(reading.temp).toFixed(1)} <small>°C</small></strong>
          </div>
        </div>
        <div class="sensor-detail-foot">
          <span><i class="online-dot"></i> Connected</span>
          <span>Last reading: ${formatDate(reading.timestamp)}</span>
        </div>
      </article>`;
  }).join("");
}

function renderComparison() {
  const latest = latestByLocation();
  const columns = locations.map(location => latest[location.name]).filter(Boolean);

  const rows = [
    ["AQI", reading => reading.aqi],
    ["PM2.5 (µg/m³)", reading => Number(reading.pm25).toFixed(1)],
    ["CO₂ (ppm)", reading => reading.co2],
    ["Temperature (°C)", reading => Number(reading.temp).toFixed(1)]
  ];

  $("#comparisonTableBody").innerHTML = rows.map(([label, getter]) => `
    <tr>
      <td><strong>${label}</strong></td>
      ${columns.map(reading => `<td>${getter(reading)}</td>`).join("")}
    </tr>
  `).join("");

  const canvas = $("#comparisonChart");

  if (typeof Chart !== "undefined" && canvas) {
    if (comparisonChart) comparisonChart.destroy();

    const options = chartDefaults();

    comparisonChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: columns.map(reading => reading.location),
        datasets: [{
          label: "AQI",
          data: columns.map(reading => reading.aqi),
          backgroundColor: ["#5488f7", "#8c79ed", "#45b995", "#efbd55"],
          borderRadius: 7,
          maxBarThickness: 42
        }]
      },
      options: {
        ...options,
        scales: {
          ...options.scales,
          y: { ...options.scales.y, beginAtZero: true }
        }
      }
    });
  }
}

function renderAdminTable() {
  const readings = getReadings().sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  $("#adminTableBody").innerHTML = readings.map(reading => {
    const quality = statusFor(Number(reading.aqi));

    return `
      <tr>
        <td><strong>${escapeHTML(reading.location)}</strong></td>
        <td>${escapeHTML(reading.sensor)}</td>
        <td>${formatDate(reading.timestamp)}</td>
        <td>${reading.aqi}</td>
        <td><span class="status-badge ${statusClass(quality)}">${quality}</span></td>
        <td><button class="delete-button" data-delete="${escapeHTML(reading.id)}">Remove</button></td>
      </tr>`;
  }).join("");
}

function renderAll() {
  renderOverview();
  renderHistory();
  renderSensors();
  renderComparison();

  if (currentUser?.role === "admin") {
    renderAdminTable();
  }
}

function exportCSV() {
  const readings = getReadings().sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const header = [
    "Location", "Sensor ID", "Timestamp", "AQI",
    "PM2.5 (ug/m3)", "CO2 (ppm)", "Temperature (C)", "Status"
  ];

  const csv = [header, ...readings.map(reading => [
    reading.location,
    reading.sensor,
    reading.timestamp,
    reading.aqi,
    reading.pm25,
    reading.co2,
    reading.temp,
    statusFor(Number(reading.aqi))
  ])].map(row =>
    row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "airsense-historical-readings.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  toast("CSV report exported.");
}

function addReading(event) {
  event.preventDefault();

  if (currentUser?.role !== "admin") return;

  const aqi = Number($("#readingAqi").value);
  const pm25 = Number($("#readingPm").value);
  const co2 = Number($("#readingCo2").value);
  const temp = Number($("#readingTemp").value);
  const sensor = $("#readingSensor").value.trim();

  if (!sensor || aqi < 0 || aqi > 500 || pm25 < 0 || co2 < 0) {
    $("#addReadingMessage").textContent =
      "Enter valid readings and an AQI between 0 and 500.";
    return;
  }

  const record = {
    id: `r-${Date.now()}`,
    location: $("#readingLocation").value,
    sensor,
    timestamp: new Date().toISOString(),
    aqi,
    pm25,
    co2,
    temp
  };

  const readings = getReadings();
  readings.unshift(record);
  saveReadings(readings);

  $("#addReadingForm").reset();
  $("#addReadingMessage").textContent = "Reading saved successfully.";

  renderAll();
  toast("New sensor reading saved.");
}

function removeReading(id) {
  if (currentUser?.role !== "admin") return;

  const readings = getReadings().filter(reading => reading.id !== id);
  saveReadings(readings);

  renderAll();
  toast("Reading removed.");
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  const symbol = document.body.classList.contains("dark") ? "☀" : "☾";

  const themeButton = $("#themeToggle");
  const loginThemeButton = $("#themeToggleLogin");

  if (themeButton) themeButton.textContent = symbol;
  if (loginThemeButton) loginThemeButton.textContent = symbol;

  if (currentUser) renderCharts(getReadings());
}

function bindEvents() {
  $$(".role-option").forEach(button => {
    button.addEventListener("click", () => setRole(button.dataset.role));
  });

  $("#loginForm").addEventListener("submit", login);

  $("#togglePassword").addEventListener("click", () => {
    const input = $("#loginPassword");
    input.type = input.type === "password" ? "text" : "password";
    $("#togglePassword").textContent =
      input.type === "password" ? "◉" : "◎";
  });

  $("#forgotPassword").addEventListener("click", () => {
    toast("Please contact your project administrator for account assistance.");
  });

  $("#logoutButton").addEventListener("click", logout);

  $$(".nav-link").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.view));
  });

  $$("[data-goto]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.goto));
  });

  $("#trendRange").addEventListener("change", () => renderCharts(getReadings()));

  ["historySearch", "historyStatus", "historyDays"].forEach(id => {
    const element = $("#" + id);
    element.addEventListener(
      id === "historySearch" ? "input" : "change",
      renderHistory
    );
  });

  $("#clearFilters").addEventListener("click", () => {
    $("#historySearch").value = "";
    $("#historyStatus").value = "all";
    $("#historyDays").value = "all";
    renderHistory();
  });

  $("#exportButton").addEventListener("click", exportCSV);
  $("#historyExportButton").addEventListener("click", exportCSV);
  $("#addReadingForm").addEventListener("submit", addReading);

  $("#adminTableBody").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (button && confirm("Remove this sensor reading?")) {
      removeReading(button.dataset.delete);
    }
  });

  $("#mobileMenu").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#themeToggleLogin").addEventListener("click", toggleTheme);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    bindEvents();
    getReadings();

    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));

    if (session && session.role && session.name) {
      currentUser = session;
      showApp();
    }
  } catch (error) {
    console.error("Application initialization failed:", error);
  }
});

const API_URL = "https://YOUR-INFINITYFREE-DOMAIN/api";

// Register user
// Register a new user
async function registerUser(name, email, password) {
  const response = await fetch(`${API_URL}/register.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Registration failed.");
  }

  return result;
}


// Login existing user
async function loginUser(email, password, role) {
  const response = await fetch(`${API_URL}/login.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      role
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Login failed.");
  }

  return result;
}
