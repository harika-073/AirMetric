
/* ==========================================
   AIRWATCH - COMPLETE SCRIPT
   Login, Signup, Dashboard, Readings,
   Historical Analysis, Sensors and CSV Export
   Browser storage demo - no SQL connection
========================================== */

"use strict";

const ADMIN_EMAIL = "admin@airwatch.com";
const ADMIN_PASSWORD = "Admin@123";

const KEYS = {
  users: "airwatch_registered_users_v2",
  readings: "airwatch_readings_v2",
  sensors: "airwatch_sensors_v2",
  session: "airwatch_session_v2"
};

const $ = (id) => document.getElementById(id);

function readStorage(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let users = readStorage(KEYS.users);
let readings = readStorage(KEYS.readings);
let sensors = readStorage(KEYS.sensors);

if (!Array.isArray(users)) users = [];
if (!Array.isArray(readings)) readings = [];
if (!Array.isArray(sensors)) sensors = [];

let currentAccount = null;
let signupMode = false;

const sectionNames = {
  overview: "Dashboard Overview",
  readings: "Sensor Readings",
  history: "Historical Analysis",
  sensors: "Sensors"
};

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

function setMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function setDefaultDate(id) {
  const input = $(id);
  if (!input) return;

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  input.value = now.toISOString().slice(0, 16);
}

[
  "readingDate",
  "historyDate",
  "sensorReadingDate"
].forEach(setDefaultDate);

/* ==========================================
   LOGIN AND SIGNUP
========================================== */

function setAuthMode(isSignup) {
  signupMode = isSignup;

  $("authTitle").textContent =
    isSignup ? "Create Account" : "Welcome Back";

  $("authDescription").textContent =
    isSignup
      ? "Create a user account to access AirWatch."
      : "Login to open your dashboard.";

  $("loginForm").querySelector('[type="submit"]').textContent =
    isSignup ? "Create Account" : "Login";

  $("toggleSignup").textContent =
    isSignup
      ? "Already registered? Login"
      : "New user? Create an account";

  $("authRole").value = "user";
  $("authRole").disabled = isSignup;
  $("loginError").textContent = "";
}

$("toggleSignup").addEventListener("click", () => {
  setAuthMode(!signupMode);
});

$("authRole").addEventListener("change", () => {
  setMessage("loginError", "");
});

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  const role = $("authRole").value;

  setMessage("loginError", "");

  if (!email || !password) {
    setMessage("loginError", "Enter your email and password.");
    return;
  }

  // Fixed admin demo account
  if (role === "admin") {
    if (signupMode) {
      setMessage("loginError", "Admin signup is not available.");
      return;
    }

    if (
      email !== ADMIN_EMAIL ||
      password !== ADMIN_PASSWORD
    ) {
      setMessage("loginError", "Invalid admin credentials.");
      return;
    }

    loginSuccess({
      email: ADMIN_EMAIL,
      role: "admin"
    });
    return;
  }

  // New user signup
  if (signupMode) {
    if (password.length < 6) {
      setMessage(
        "loginError",
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (email === ADMIN_EMAIL) {
      setMessage("loginError", "This email is reserved.");
      return;
    }

    if (users.some((u) => u.email === email)) {
      setMessage(
        "loginError",
        "This account already exists. Please log in."
      );
      return;
    }

    const newUser = {
      id: makeId(),
      email,
      password
    };

    try {
      users.push(newUser);
      writeStorage(KEYS.users, users);
    } catch (error) {
      users = users.filter((u) => u.id !== newUser.id);
      setMessage(
        "loginError",
        "Could not save account. Check browser storage."
      );
      return;
    }

    // Automatically open dashboard after signup
    loginSuccess({
      email: newUser.email,
      role: "user"
    });
    return;
  }

  // Existing user login
  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    setMessage(
      "loginError",
      "Account not found or password is incorrect. Sign up first if new."
    );
    return;
  }

  loginSuccess({
    email: user.email,
    role: "user"
  });
});

function loginSuccess(account) {
  currentAccount = account;

  try {
    // Persist session across page refreshes in this browser
    localStorage.setItem(KEYS.session, JSON.stringify(account));
  } catch (error) {
    console.error("Could not save session:", error);
  }

  $("loginPage").classList.add("hidden");
  $("dashboardPage").classList.remove("hidden");

  $("currentUser").textContent = account.email;
  $("roleBadge").textContent = account.role.toUpperCase();

  setAuthMode(false);
  $("password").value = "";

  renderAll();
  showSection("overview");
}

function restoreSession() {
  const saved = readStorage(KEYS.session, null);

  if (!saved || !saved.email || !saved.role) return;

  if (
    saved.role === "admin" &&
    saved.email === ADMIN_EMAIL
  ) {
    loginSuccess(saved);
    return;
  }

  const existingUser = users.some(
    (u) => u.email === saved.email
  );

  if (saved.role === "user" && existingUser) {
    loginSuccess(saved);
  } else {
    localStorage.removeItem(KEYS.session);
  }
}

$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(KEYS.session);
  currentAccount = null;

  $("dashboardPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");

  $("password").value = "";
  setAuthMode(false);
});

/* ==========================================
   NAVIGATION
========================================== */

function showSection(name) {
  if (!sectionNames[name]) return;

  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.add("hidden");
  });

  $(name + "Section").classList.remove("hidden");
  $("pageTitle").textContent = sectionNames[name];

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.section === name
    );
  });

  if (name === "overview" || name === "history") {
    drawCharts();
  }
}

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.section);
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.go);
  });
});

/* ==========================================
   AQI STATUS
========================================== */

function getAqiStatus(aqi) {
  if (aqi <= 50) return { label: "Good", className: "good" };
  if (aqi <= 100) return { label: "Moderate", className: "moderate" };
  if (aqi <= 200) return { label: "Poor", className: "poor" };
  if (aqi <= 300) return { label: "Very Poor", className: "poor" };
  return { label: "Severe", className: "poor" };
}

function statusBadge(aqi) {
  const status = getAqiStatus(Number(aqi));
  return `<span class="aqi-badge ${status.className}">
    ${status.label}
  </span>`;
}

function sortedReadings() {
  return [...readings].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

/* ==========================================
   ADD READINGS FROM ALL THREE PAGES
========================================== */

function saveNewReading(data, messageId, formId) {
  const sensorId = data.sensorId.trim();
  const location = data.location.trim();

  const aqi = Number(data.aqi);
  const pm25 = Number(data.pm25);
  const pm10 = Number(data.pm10);
  const temperature = Number(data.temperature);
  const humidity = Number(data.humidity);
  const date = new Date(data.date);

  if (!sensorId || !location) {
    setMessage(messageId, "Enter sensor ID and location.");
    return;
  }

  if (
    !Number.isFinite(aqi) || aqi < 0 || aqi > 500 ||
    !Number.isFinite(pm25) || pm25 < 0 ||
    !Number.isFinite(pm10) || pm10 < 0 ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(humidity) || humidity < 0 || humidity > 100 ||
    Number.isNaN(date.getTime())
  ) {
    setMessage(messageId, "Please enter valid sensor values.");
    return;
  }

  const record = {
    id: makeId(),
    sensorId,
    location,
    aqi,
    pm25,
    pm10,
    temperature,
    humidity,
    date: date.toISOString()
  };

  const oldReadings = readings;
  const oldSensors = sensors;

  readings = [...readings, record];

  if (!sensors.some(
    (s) => s.sensorId.toLowerCase() === sensorId.toLowerCase()
  )) {
    sensors = [
      ...sensors,
      {
        id: makeId(),
        sensorId,
        location,
        createdAt: new Date().toISOString()
      }
    ];
  }

  try {
    writeStorage(KEYS.readings, readings);
    writeStorage(KEYS.sensors, sensors);
  } catch (error) {
    readings = oldReadings;
    sensors = oldSensors;
    setMessage(messageId, "Could not save. Check browser storage.");
    return;
  }

  $(formId).reset();
  setDefaultDate(
    $(formId).querySelector('input[type="datetime-local"]')?.id
  );

  setMessage(messageId, "Reading saved successfully!");
  renderAll();
}

$("readingForm").addEventListener("submit", (event) => {
  event.preventDefault();

  saveNewReading({
    sensorId: $("sensorId").value,
    location: $("location").value,
    aqi: $("aqi").value,
    pm25: $("pm25").value,
    pm10: $("pm10").value,
    temperature: $("temperature").value,
    humidity: $("humidity").value,
    date: $("readingDate").value
  }, "readingMessage", "readingForm");
});

$("historyReadingForm").addEventListener("submit", (event) => {
  event.preventDefault();

  saveNewReading({
    sensorId: $("historySensorId").value,
    location: $("historyLocation").value,
    aqi: $("historyAqi").value,
    pm25: $("historyPm25").value,
    pm10: $("historyPm10").value,
    temperature: $("historyTemperature").value,
    humidity: $("historyHumidity").value,
    date: $("historyDate").value
  }, "historyMessage", "historyReadingForm");
});

$("sensorReadingForm").addEventListener("submit", (event) => {
  event.preventDefault();

  saveNewReading({
    sensorId: $("sensorReadingId").value,
    location: $("sensorReadingLocation").value,
    aqi: $("sensorReadingAqi").value,
    pm25: $("sensorReadingPm25").value,
    pm10: $("sensorReadingPm10").value,
    temperature: $("sensorReadingTemp").value,
    humidity: $("sensorReadingHumidity").value,
    date: $("sensorReadingDate").value
  }, "sensorReadingMessage", "sensorReadingForm");
});

/* ==========================================
   REGISTER SENSORS
========================================== */

$("sensorForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const sensorId = $("newSensorId").value.trim();
  const location = $("newSensorLocation").value.trim();

  if (!sensorId || !location) {
    setMessage("sensorMessage", "Enter sensor ID and location.");
    return;
  }

  if (sensors.some(
    (s) => s.sensorId.toLowerCase() === sensorId.toLowerCase()
  )) {
    setMessage("sensorMessage", "This sensor ID already exists.");
    return;
  }

  sensors.push({
    id: makeId(),
    sensorId,
    location,
    createdAt: new Date().toISOString()
  });

  try {
    writeStorage(KEYS.sensors, sensors);
  } catch (error) {
    sensors.pop();
    setMessage("sensorMessage", "Could not save this sensor.");
    return;
  }

  $("sensorForm").reset();
  setMessage("sensorMessage", "Sensor registered successfully!");
  renderSensors();
});

/* ==========================================
   SEARCH AND DELETE READINGS
========================================== */

$("searchReadings").addEventListener("input", renderReadingsTable);

function renderReadingsTable() {
  const query = $("searchReadings").value.trim().toLowerCase();

  const filtered = sortedReadings().filter((r) =>
    r.sensorId.toLowerCase().includes(query) ||
    r.location.toLowerCase().includes(query)
  );

  $("readingsTableBody").innerHTML = filtered.map((r) => `
    <tr>
      <td>${escapeHTML(formatDate(r.date))}</td>
      <td>${escapeHTML(r.sensorId)}</td>
      <td>${escapeHTML(r.location)}</td>
      <td>${r.aqi} ${statusBadge(r.aqi)}</td>
      <td>${Number(r.pm25).toFixed(1)}</td>
      <td>${Number(r.pm10).toFixed(1)}</td>
      <td>${Number(r.temperature).toFixed(1)}°C</td>
      <td>${Number(r.humidity).toFixed(1)}%</td>
      <td><button class="delete-btn" data-delete="${escapeHTML(r.id)}">Delete</button></td>
    </tr>
  `).join("");

  $("readingsEmpty").classList.toggle("hidden", filtered.length > 0);
}

$("readingsTableBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  const record = readings.find((r) => r.id === button.dataset.delete);
  if (!record || !confirm("Delete this reading?")) return;

  const previous = readings;
  readings = readings.filter((r) => r.id !== record.id);

  try {
    writeStorage(KEYS.readings, readings);
  } catch (error) {
    readings = previous;
    alert("Could not delete this reading.");
    return;
  }

  renderAll();
});

/* ==========================================
   OVERVIEW
========================================== */

function renderOverview() {
  const latest = sortedReadings()[0];

  $("totalReadings").textContent = readings.length;

  if (!latest) {
    $("latestAqi").textContent = "--";
    $("latestPm25").textContent = "--";
    $("latestPm10").textContent = "--";
    $("aqiStatus").textContent = "No data";
    $("aqiStatus").className = "status-badge";
  } else {
    $("latestAqi").textContent = latest.aqi;
    $("latestPm25").textContent = Number(latest.pm25).toFixed(1);
    $("latestPm10").textContent = Number(latest.pm10).toFixed(1);

    const status = getAqiStatus(latest.aqi);
    $("aqiStatus").textContent = status.label;
    $("aqiStatus").className = "status-badge " + status.className;
  }

  const recent = sortedReadings().slice(0, 5);

  $("recentTableBody").innerHTML = recent.map((r) => `
    <tr>
      <td>${escapeHTML(formatDate(r.date))}</td>
      <td>${escapeHTML(r.sensorId)}</td>
      <td>${escapeHTML(r.location)}</td>
      <td>${r.aqi}</td>
      <td>${statusBadge(r.aqi)}</td>
    </tr>
  `).join("");

  $("recentEmpty").classList.toggle("hidden", recent.length > 0);
}

/* ==========================================
   HISTORICAL ANALYSIS
========================================== */

function renderHistory() {
  const values = readings.map((r) => Number(r.aqi));

  if (!values.length) {
    $("averageAqi").textContent = "--";
    $("highestAqi").textContent = "--";
    $("lowestAqi").textContent = "--";
    $("historySummary").textContent = "No data available yet.";
    $("historyTableBody").innerHTML = "";
    $("historyEmpty").classList.remove("hidden");
    return;
  }

  const average =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  $("averageAqi").textContent = average.toFixed(1);
  $("highestAqi").textContent = highest;
  $("lowestAqi").textContent = lowest;

  $("historySummary").textContent =
    `${readings.length} readings. Average AQI: ${average.toFixed(1)}. ` +
    `Highest: ${highest}. Lowest: ${lowest}.`;

  $("historyTableBody").innerHTML = sortedReadings().map((r) => `
    <tr>
      <td>${escapeHTML(formatDate(r.date))}</td>
      <td>${escapeHTML(r.sensorId)}</td>
      <td>${escapeHTML(r.location)}</td>
      <td>${r.aqi}</td>
      <td>${statusBadge(r.aqi)}</td>
    </tr>
  `).join("");

  $("historyEmpty").classList.add("hidden");
}

/* ==========================================
   SENSOR CARDS
========================================== */

function renderSensors() {
  const map = new Map();

  sensors.forEach((s) => {
    map.set(s.sensorId.toLowerCase(), {
      ...s,
      count: 0,
      latestAqi: null,
      latestDate: null
    });
  });

  readings.forEach((r) => {
    const key = r.sensorId.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        id: makeId(),
        sensorId: r.sensorId,
        location: r.location,
        createdAt: r.date,
        count: 0,
        latestAqi: null,
        latestDate: null
      });
    }

    const sensor = map.get(key);
    sensor.count++;

    if (
      !sensor.latestDate ||
      new Date(r.date) > new Date(sensor.latestDate)
    ) {
      sensor.latestDate = r.date;
      sensor.latestAqi = Number(r.aqi);
      sensor.location = r.location;
    }
  });

  const list = [...map.values()];

  $("sensorCards").innerHTML = list.map((s) => `
    <article class="sensor-card">
      <div class="sensor-icon">⌖</div>
      <h4>${escapeHTML(s.sensorId)}</h4>
      <p>Location: ${escapeHTML(s.location)}</p>
      <p>Readings: <strong>${s.count}</strong></p>
      <p>Latest AQI: <strong>${s.latestAqi ?? "--"}</strong></p>
      <p>Last recorded: ${
        s.latestDate ? escapeHTML(formatDate(s.latestDate)) : "No readings yet"
      }</p>
      ${s.latestAqi !== null ? statusBadge(s.latestAqi) : ""}
    </article>
  `).join("");

  $("sensorsEmpty").classList.toggle("hidden", list.length > 0);
}

/* ==========================================
   AQI CHARTS
========================================== */

function drawCharts() {
  drawAqiChart("aqiChart");
  drawAqiChart("historyChart");
}

function drawAqiChart(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;

  const emptyId = canvasId === "aqiChart" ? "chartEmpty" : "historyEmpty";
  const empty = $(emptyId);
  const ctx = canvas.getContext("2d");

  const width = Math.max(canvas.clientWidth, 280);
  const height = 240;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = height + "px";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const records = [...readings]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-12);

  if (!records.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  const p = { left: 42, right: 15, top: 20, bottom: 42 };
  const plotW = width - p.left - p.right;
  const plotH = height - p.top - p.bottom;

  const max = Math.max(
    100,
    Math.ceil(Math.max(...records.map((r) => Number(r.aqi))) / 50) * 50
  );

  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 4; i++) {
    const value = max * i / 4;
    const y = p.top + plotH - value / max * plotH;

    ctx.strokeStyle = "#e8efeb";
    ctx.beginPath();
    ctx.moveTo(p.left, y);
    ctx.lineTo(width - p.right, y);
    ctx.stroke();

    ctx.fillStyle = "#87968e";
    ctx.fillText(String(Math.round(value)), p.left - 8, y);
  }

  const points = records.map((r, i) => ({
    x: records.length === 1
      ? p.left + plotW / 2
      : p.left + i / (records.length - 1) * plotW,
    y: p.top + plotH - Number(r.aqi) / max * plotH,
    record: r
  }));

  ctx.beginPath();
  ctx.moveTo(points[0].x, p.top + plotH);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points[points.length - 1].x, p.top + plotH);
  ctx.closePath();
  ctx.fillStyle = "rgba(21,150,106,0.10)";
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#15966a";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  points.forEach((point, i) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#15966a";
    ctx.fill();

    if (
      records.length <= 6 ||
      i === 0 ||
      i === points.length - 1 ||
      i % 2 === 0
    ) {
      const d = new Date(point.record.date);
      const label = Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleDateString([], { month: "short", day: "numeric" });

      ctx.fillStyle = "#87968e";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, point.x, p.top + plotH + 12);
    }
  });
}

window.addEventListener("resize", () => {
  if (!$("dashboardPage").classList.contains("hidden")) drawCharts();
});

/* ==========================================
   CSV EXPORT
========================================== */

function exportCsv() {
  if (!readings.length) {
    alert("There are no readings to export.");
    return;
  }

  const headers = [
    "Reading ID", "Sensor ID", "Location", "AQI",
    "PM2.5", "PM10", "Temperature Celsius",
    "Humidity Percent", "Date and Time"
  ];

  const rows = sortedReadings().map((r) => [
    r.id, r.sensorId, r.location, r.aqi,
    r.pm25, r.pm10, r.temperature, r.humidity, r.date
  ]);

  const cell = (value) =>
    '"' + String(value ?? "").replace(/"/g, '""') + '"';

  const csv = [headers, ...rows]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "airwatch_sensor_readings.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

$("historyExportBtn").addEventListener("click", exportCsv);

/* ==========================================
   REFRESH ALL DASHBOARD CONTENT
========================================== */

function renderAll() {
  renderOverview();
  renderReadingsTable();
  renderHistory();
  renderSensors();
  drawCharts();
}

/* ==========================================
   START APPLICATION
========================================== */

// Start on login unless a valid saved session exists.
$("loginPage").classList.remove("hidden");
$("dashboardPage").classList.add("hidden");
restoreSession();
