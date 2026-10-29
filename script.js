
"use strict";

/*
 AIRWATCH FRONTEND DEMO
 Storage: browser localStorage, NOT MySQL.
 Authentication: demonstration only, NOT secure production authentication.
*/

const $ = id => document.getElementById(id);
const STORAGE_KEY = "airwatch_project_v2";
const SESSION_KEY = "airwatch_demo_session";
const ALERT_THRESHOLD = 150;

const PAGE_TITLES = {
  dashboard: "Air Quality Dashboard",
  sensors: "Sensor Management",
  readings: "Historical Readings",
  alerts: "Pollution Alerts",
  reports: "Reports & Analytics",
  docs: "DBMS Documentation"
};

const DEMO_ACCOUNT = {
  email: "demo@airwatch.test",
  password: "AirWatch123",
  name: "Demo User"
};

let charts = { aqi: null, pollutants: null };
let authMode = "login";
let toastTimer;

const initialData = {
  sensors: [
    { id: 1, name: "Central Station", location: "Vijayawada City Centre", lat: 16.5062, lon: 80.6480, status: "Active" },
    { id: 2, name: "Campus Monitor", location: "College Campus", lat: 16.3067, lon: 80.4365, status: "Active" },
    { id: 3, name: "Industrial Monitor", location: "Industrial Area", lat: 16.5300, lon: 80.6800, status: "Maintenance" },
    { id: 4, name: "Green Park Sensor", location: "City Park", lat: 16.5100, lon: 80.6200, status: "Active" }
  ],
  readings: [],
  alerts: [],
  nextSensorId: 5,
  nextReadingId: 1,
  nextAlertId: 1
};

function localDateTime(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function seedReadings() {
  const values = [
    [1, 32, 58, 420, 82],
    [2, 48, 81, 455, 126],
    [3, 76, 130, 510, 178],
    [4, 18, 35, 390, 45],
    [1, 40, 70, 440, 105],
    [2, 55, 92, 470, 142],
    [3, 92, 155, 560, 226],
    [4, 22, 41, 400, 58],
    [1, 29, 50, 415, 76],
    [2, 43, 74, 445, 118],
    [3, 68, 118, 505, 164],
    [4, 15, 30, 380, 36]
  ];

  return values.map((v, i) => ({
    id: i + 1,
    sensorId: v[0],
    date: localDateTime((i - values.length + 1) * 180),
    pm25: v[1],
    pm10: v[2],
    co2: v[3],
    aqi: v[4]
  }));
}

function makeInitialData() {
  const data = structuredClone(initialData);
  data.readings = seedReadings();
  data.nextReadingId = data.readings.length + 1;
  return data;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.sensors) &&
          Array.isArray(parsed.readings) &&
          Array.isArray(parsed.alerts)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Unable to load saved demo data:", error);
  }

  const data = makeInitialData();
  saveData(data);
  return data;
}

let db = loadData();

/* Browser storage is used only for this frontend demonstration. */
function saveData(data = db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(error);
    notify("Could not save data in this browser.");
    return false;
  }
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
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

function number(value) {
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 1
  });
}

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Invalid date"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
}

function aqiCategory(aqi) {
  if (aqi <= 50) return { name: "Good", css: "good" };
  if (aqi <= 100) return { name: "Satisfactory", css: "good" };
  if (aqi <= 200) return { name: "Moderate", css: "moderate" };
  if (aqi <= 300) return { name: "Poor", css: "poor" };
  if (aqi <= 400) return { name: "Very Poor", css: "severe" };
  return { name: "Severe", css: "severe" };
}

function aqiBadge(aqi) {
  const category = aqiCategory(Number(aqi));
  return `<span class="badge badge-${category.css}">${escapeHTML(category.name)} (${number(aqi)})</span>`;
}

function statusBadge(status) {
  const css = String(status).toLowerCase();
  return `<span class="badge badge-${escapeHTML(css)}">${escapeHTML(status)}</span>`;
}

function sensorById(id) {
  return db.sensors.find(sensor => Number(sensor.id) === Number(id));
}

function sortedReadings(readings = db.readings) {
  return [...readings].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );
}

function showPage(page) {
  if (!PAGE_TITLES[page]) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("page-title").textContent = PAGE_TITLES[page];
  $("crumb").textContent = page.toUpperCase();

  if (page === "dashboard") renderDashboard();
  if (page === "sensors") renderSensors();
  if (page === "readings") renderReadings();
  if (page === "alerts") renderAlerts();
  if (page === "reports") renderReports();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function showApplication(user) {
  $("auth-screen").hidden = true;
  $("app").hidden = false;
  $("welcome-user").textContent = user.name;
  $("user-avatar").textContent = user.name
    .split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();

  showPage("dashboard");
}

function showAuthentication() {
  $("app").hidden = true;
  $("auth-screen").hidden = false;
  setAuthMode("login");
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";

  $("auth-title").textContent = registering ? "Create your account" : "Welcome back";
  $("auth-subtitle").textContent = registering
    ? "Create a demo account for this browser session."
    : "Sign in to monitor air quality and sensor readings.";
  $("name-wrap").hidden = !registering;
  $("auth-name").required = registering;
  $("auth-password").autocomplete = registering ? "new-password" : "current-password";
  $("auth-submit").textContent = registering ? "Create Account" : "Sign In";
  $("auth-switch-text").textContent = registering
    ? "Already have an account?"
    : "New to AirWatch?";
  $("auth-switch").textContent = registering ? "Sign in" : "Create account";
}

$("auth-switch").addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "register" : "login");
});

$("auth-form").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("auth-email").value.trim().toLowerCase();
  const password = $("auth-password").value;
  const name = $("auth-name").value.trim();

  if (authMode === "register") {
    if (name.length < 2) {
      notify("Enter a name with at least two characters.");
      return;
    }

    if (email === DEMO_ACCOUNT.email) {
      notify("That email is reserved for the demo account.");
      return;
    }

    /*
      No password is saved. Registration creates a session-only
      demonstration account and will not survive a page reload.
      Use a real backend and bcrypt for production registration.
    */
    if (password.length < 6) {
      notify("Password must contain at least six characters.");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      name,
      email,
      role: "user",
      demo: true
    }));

    $("auth-form").reset();
    showApplication(currentUser());
    notify("Demo session created. No account was saved to a server.");
    return;
  }

  if (email === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      role: "admin",
      demo: true
    }));

    $("auth-form").reset();
    showApplication(currentUser());
    notify("Demo login successful.");
    return;
  }

  notify("Invalid demo credentials. Use the demo account below.");
});

$("demo-login").addEventListener("click", () => {
  $("auth-email").value = DEMO_ACCOUNT.email;
  $("auth-password").value = DEMO_ACCOUNT.password;
  setAuthMode("login");
  $("auth-form").requestSubmit();
});

$("logout").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  showAuthentication();
  notify("You have logged out.");
});

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.goto));
});

/* POLLUTION ALERTS */

function generateAlertsForReading(reading) {
  if (Number(reading.aqi) <= ALERT_THRESHOLD) return;

  const existing = db.alerts.some(alert =>
    Number(alert.readingId) === Number(reading.id) &&
    alert.type === "HIGH_AQI"
  );

  if (existing) return;

  const sensor = sensorById(reading.sensorId);
  if (!sensor) return;

  db.alerts.push({
    id: db.nextAlertId++,
    sensorId: sensor.id,
    readingId: reading.id,
    type: "HIGH_AQI",
    message: `AQI ${reading.aqi} exceeded the demo threshold of ${ALERT_THRESHOLD}.`,
    severity: Number(reading.aqi) > 300 ? "Severe" : "High",
    date: reading.date,
    status: "Open"
  });
}

function rebuildAlerts() {
  db.alerts = [];
  db.nextAlertId = 1;

  db.readings.forEach(generateAlertsForReading);

  saveData();
}

/* DASHBOARD */

function renderDashboard() {
  $("total-sensors").textContent = db.sensors.length;
  $("active-sensors").textContent = db.sensors.filter(s => s.status === "Active").length;

  const latest = sortedReadings()[0];

  $("latest-aqi").textContent = latest ? number(latest.aqi) : "--";
  $("aqi-status").textContent = latest
    ? aqiCategory(Number(latest.aqi)).name
    : "No readings";

  $("open-alerts").textContent = db.alerts.filter(a => a.status === "Open").length;

  const latestRows = sortedReadings().slice(0, 8);

  $("latest-table").innerHTML = latestRows.length
    ? latestRows.map(reading => {
        const sensor = sensorById(reading.sensorId);
        return `<tr>
          <td>${escapeHTML(sensor?.name || "Deleted sensor")}</td>
          <td>${escapeHTML(sensor?.location || "Unknown")}</td>
          <td>${aqiBadge(reading.aqi)}</td>
          <td>${number(reading.pm25)}</td>
          <td>${number(reading.pm10)}</td>
          <td>${formatDate(reading.date)}</td>
        </tr>`;
      }).join("")
    : emptyRow(6, "No readings recorded yet.");

  renderCharts();
}

function renderCharts() {
  if (typeof Chart === "undefined") {
    notify("Charts could not load. Check your internet connection.");
    return;
  }

  const readings = sortedReadings().slice(0, 12).reverse();

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { labels: { color: "#c5d3e7", boxWidth: 12 } }
    },
    scales: {
      x: {
        ticks: { color: "#91a2bb", maxRotation: 40, minRotation: 0 },
        grid: { color: "#23344b" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#91a2bb" },
        grid: { color: "#23344b" }
      }
    }
  };

  if (charts.aqi) charts.aqi.destroy();
  if (charts.pollutants) charts.pollutants.destroy();

  charts.aqi = new Chart($("aqiChart"), {
    type: "line",
    data: {
      labels: readings.map(r => {
        const d = new Date(r.date);
        return Number.isNaN(d.getTime())
          ? "Unknown"
          : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      }),
      datasets: [{
        label: "AQI",
        data: readings.map(r => Number(r.aqi)),
        borderColor: "#39d9a0",
        backgroundColor: "#39d9a022",
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: commonOptions
  });

  const latestPerSensor = db.sensors.map(sensor => {
    const reading = sortedReadings().find(r => Number(r.sensorId) === Number(sensor.id));
    return { sensor, reading };
  }).filter(item => item.reading);

  charts.pollutants = new Chart($("pollutionChart"), {
    type: "bar",
    data: {
      labels: latestPerSensor.map(item => item.sensor.name),
      datasets: [
        { label: "PM2.5 (µg/m³)", data: latestPerSensor.map(item => item.reading.pm25), backgroundColor: "#58a6ff" },
        { label: "PM10 (µg/m³)", data: latestPerSensor.map(item => item.reading.pm10), backgroundColor: "#ff9c52" },
        { label: "CO₂ (ppm)", data: latestPerSensor.map(item => item.reading.co2), backgroundColor: "#39d9a0" }
      ]
    },
    options: commonOptions
  });
}

/* SENSORS */

function renderSensors() {
  const query = $("sensor-search").value.trim().toLowerCase();
  const status = $("sensor-status-filter").value;

  const sensors = db.sensors.filter(sensor =>
    `${sensor.name} ${sensor.location} ${sensor.id}`.toLowerCase().includes(query) &&
    (!status || sensor.status === status)
  );

  $("sensors-table").innerHTML = sensors.length
    ? sensors.map(sensor => `<tr>
      <td>#${sensor.id}</td>
      <td>${escapeHTML(sensor.name)}</td>
      <td>${escapeHTML(sensor.location)}</td>
      <td>${number(sensor.lat)}, ${number(sensor.lon)}</td>
      <td>${statusBadge(sensor.status)}</td>
      <td><div class="table-actions">
        <button class="mini-btn" data-edit-sensor="${sensor.id}">Edit</button>
        <button class="mini-btn delete" data-delete-sensor="${sensor.id}">Delete</button>
      </div></td>
    </tr>`).join("")
    : emptyRow(6, "No matching sensors found.");

  renderSensorOptions();
}

function renderSensorOptions() {
  const filter = $("reading-sensor-filter");
  const formSelect = $("reading-sensor");
  const oldFilter = filter.value;
  const oldForm = formSelect.value;

  const options = db.sensors.map(sensor =>
    `<option value="${sensor.id}">${escapeHTML(sensor.name)} — ${escapeHTML(sensor.location)}</option>`
  ).join("");

  filter.innerHTML = `<option value="">All sensors</option>${options}`;
  formSelect.innerHTML = options || `<option value="">Add a sensor first</option>`;

  if ([...filter.options].some(o => o.value === oldFilter)) filter.value = oldFilter;
  if ([...formSelect.options].some(o => o.value === oldForm)) formSelect.value = oldForm;
}

$("sensor-search").addEventListener("input", renderSensors);
$("sensor-status-filter").addEventListener("change", renderSensors);

$("add-sensor").addEventListener("click", () => {
  $("sensor-form").reset();
  $("sensor-id").value = "";
  $("sensor-form-title").textContent = "Add Sensor";
  $("sensor-status").value = "Active";
  $("sensor-form-panel").hidden = false;
  $("sensor-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("cancel-sensor").addEventListener("click", () => {
  $("sensor-form-panel").hidden = true;
});

$("sensor-form").addEventListener("submit", event => {
  event.preventDefault();

  const id = Number($("sensor-id").value);
  const lat = Number($("sensor-lat").value);
  const lon = Number($("sensor-lon").value);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180) {
    notify("Enter valid latitude and longitude.");
    return;
  }

  const sensor = {
    id: id || db.nextSensorId++,
    name: $("sensor-name").value.trim(),
    location: $("sensor-location").value.trim(),
    lat,
    lon,
    status: $("sensor-status").value
  };

  if (!sensor.name || !sensor.location) {
    notify("Sensor name and location are required.");
    return;
  }

  const index = db.sensors.findIndex(s => Number(s.id) === id);

  if (index >= 0) db.sensors[index] = sensor;
  else db.sensors.push(sensor);

  saveData();
  $("sensor-form-panel").hidden = true;
  renderSensors();
  renderDashboard();
  renderReports();
  notify(index >= 0 ? "Sensor updated." : "Sensor added.");
});

$("sensors-table").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-sensor]");
  const deleteButton = event.target.closest("[data-delete-sensor]");

  if (editButton) {
    const sensor = sensorById(editButton.dataset.editSensor);
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

  if (deleteButton) {
    const id = Number(deleteButton.dataset.deleteSensor);
    const sensor = sensorById(id);
    if (!sensor) return;

    if (db.readings.some(r => Number(r.sensorId) === id)) {
      notify("Cannot delete: this sensor has readings. Delete its readings first.");
      return;
    }

    if (!confirm(`Delete sensor "${sensor.name}"?`)) return;

    db.sensors = db.sensors.filter(s => Number(s.id) !== id);
    db.alerts = db.alerts.filter(a => Number(a.sensorId) !== id);
    saveData();
    renderSensors();
    renderDashboard();
    renderAlerts();
    renderReports();
    notify("Sensor deleted.");
  }
});

/* HISTORICAL READINGS */

function filteredReadings() {
  const sensorId = $("reading-sensor-filter").value;
  const from = $("date-from").value;
  const to = $("date-to").value;

  return sortedReadings().filter(reading => {
    const date = new Date(reading.date);
    const day = Number.isNaN(date.getTime()) ? "" : [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    return (!sensorId || Number(reading.sensorId) === Number(sensorId)) &&
      (!from || day >= from) &&
      (!to || day <= to);
  });
}

function renderReadings() {
  renderSensorOptions();

  const readings = filteredReadings();
  const values = readings.map(r => Number(r.aqi));

  $("avg-aqi").textContent = values.length
    ? number(values.reduce((sum, value) => sum + value, 0) / values.length)
    : "--";
  $("max-aqi").textContent = values.length ? number(Math.max(...values)) : "--";
  $("record-count").textContent = readings.length;

  $("readings-table").innerHTML = readings.length
    ? readings.map(reading => {
        const sensor = sensorById(reading.sensorId);
        return `<tr>
          <td>#${reading.id}</td>
          <td>${escapeHTML(sensor?.name || "Deleted sensor")}</td>
          <td>${formatDate(reading.date)}</td>
          <td>${number(reading.pm25)}</td>
          <td>${number(reading.pm10)}</td>
          <td>${number(reading.co2)}</td>
          <td>${aqiBadge(reading.aqi)}</td>
          <td><div class="table-actions">
            <button class="mini-btn" data-edit-reading="${reading.id}">Edit</button>
            <button class="mini-btn delete" data-delete-reading="${reading.id}">Delete</button>
          </div></td>
        </tr>`;
      }).join("")
    : emptyRow(8, "No readings match these filters.");
}

["reading-sensor-filter", "date-from", "date-to"].forEach(id => {
  $(id).addEventListener("change", renderReadings);
});

$("clear-filters").addEventListener("click", () => {
  $("reading-sensor-filter").value = "";
  $("date-from").value = "";
  $("date-to").value = "";
  renderReadings();
  notify("Filters cleared.");
});

$("add-reading").addEventListener("click", () => {
  if (!db.sensors.length) {
    notify("Add a sensor before recording readings.");
    showPage("sensors");
    return;
  }

  $("reading-form").reset();
  $("reading-id").value = "";
  $("reading-date").value = localDateTime();
  $("reading-form-title").textContent = "Add Reading";
  $("reading-form-panel").hidden = false;
  $("reading-form-panel").scrollIntoView({ behavior: "smooth" });
});

$("cancel-reading").addEventListener("click", () => {
  $("reading-form-panel").hidden = true;
});

$("reading-form").addEventListener("submit", event => {
  event.preventDefault();

  const id = Number($("reading-id").value);
  const sensorId = Number($("reading-sensor").value);
  const date = $("reading-date").value;
  const pm25 = Number($("reading-pm25").value);
  const pm10 = Number($("reading-pm10").value);
  const co2 = Number($("reading-co2").value);
  const aqi = Number($("reading-aqi").value);

  if (!sensorById(sensorId)) {
    notify("Choose a valid sensor.");
    return;
  }

  if (!date || Number.isNaN(new Date(date).getTime())) {
    notify("Enter a valid date and time.");
    return;
  }

  if ([pm25, pm10, co2, aqi].some(v => !Number.isFinite(v) || v < 0) || aqi > 500) {
    notify("Measurements must be non-negative and AQI must be 0–500.");
    return;
  }

  const reading = {
    id: id || db.nextReadingId++,
    sensorId, date, pm25, pm10, co2, aqi
  };

  const index = db.readings.findIndex(r => Number(r.id) === id);
  if (index >= 0) db.readings[index] = reading;
  else db.readings.push(reading);

  /*
    Refreshing demo alerts recalculates them from all readings.
    This demo therefore resets alert resolution status when readings
    are saved. Production applications should manage alerts in MySQL.
  */
  rebuildAlerts();
  saveData();

  $("reading-form-panel").hidden = true;
  renderReadings();
  renderDashboard();
  renderAlerts();
  renderReports();

  notify(index >= 0 ? "Reading updated and alerts refreshed." : "Reading added and alerts checked.");
});

$("readings-table").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-reading]");
  const deleteButton = event.target.closest("[data-delete-reading]");

  if (editButton) {
    const reading = db.readings.find(r => Number(r.id) === Number(editButton.dataset.editReading));
    if (!reading) return;

    $("reading-id").value = reading.id;
    $("reading-sensor").value = reading.sensorId;
    $("reading-date").value = reading.date;
    $("reading-pm25").value = reading.pm25;
    $("reading-pm10").value = reading.pm10;
    $("reading-co2").value = reading.co2;
    $("reading-aqi").value = reading.aqi;
    $("reading-form-title").textContent = "Edit Reading";
    $("reading-form-panel").hidden = false;
    $("reading-form-panel").scrollIntoView({ behavior: "smooth" });
  }

  if (deleteButton) {
    const id = Number(deleteButton.dataset.deleteReading);
    if (!confirm("Delete this reading and its related demo alerts?")) return;

    db.readings = db.readings.filter(r => Number(r.id) !== id);
    rebuildAlerts();
    saveData();

    renderReadings();
    renderDashboard();
    renderAlerts();
    renderReports();
    notify("Reading deleted.");
  }
});

/* ALERTS */

function renderAlerts() {
  const alerts = [...db.alerts].sort((a, b) => new Date(b.date) - new Date(a.date));

  $("total-alerts").textContent = alerts.length;
  $("unresolved-alerts").textContent = alerts.filter(a => a.status === "Open").length;

  $("alerts-table").innerHTML = alerts.length
    ? alerts.map(alert => {
        const sensor = sensorById(alert.sensorId);
        return `<tr>
          <td>#${alert.id}</td>
          <td>${escapeHTML(sensor?.name || "Deleted sensor")}</td>
          <td>${escapeHTML(sensor?.location || "Unknown")}</td>
          <td>${alert.readingId ? number(db.readings.find(r => Number(r.id) === Number(alert.readingId))?.aqi ?? "--") : "--"}</td>
          <td><span class="badge ${alert.severity === "Severe" ? "badge-severe" : "badge-poor"}">${escapeHTML(alert.severity)}</span></td>
          <td>${formatDate(alert.date)}</td>
          <td>${statusBadge(alert.status)}</td>
          <td>${alert.status === "Open"
            ? `<button class="mini-btn" data-resolve-alert="${alert.id}">Resolve</button>`
            : `<button class="mini-btn" data-reopen-alert="${alert.id}">Reopen</button>`}</td>
        </tr>`;
      }).join("")
    : emptyRow(8, "No pollution alerts. Add a reading with AQI above 150 to test alerts.");
}

$("alerts-table").addEventListener("click", event => {
  const resolve = event.target.closest("[data-resolve-alert]");
  const reopen = event.target.closest("[data-reopen-alert]");
  const button = resolve || reopen;
  if (!button) return;

  const alert = db.alerts.find(a => Number(a.id) === Number(
    button.dataset.resolveAlert || button.dataset.reopenAlert
  ));

  if (!alert) return;

  alert.status = resolve ? "Resolved" : "Open";
  saveData();
  renderAlerts();
  renderDashboard();
  notify(resolve ? "Alert resolved." : "Alert reopened.");
});

$("refresh-alerts").addEventListener("click", () => {
  rebuildAlerts();
  renderAlerts();
  renderDashboard();
  notify("Alerts recalculated from current readings.");
});

/* REPORTS */

function renderReports() {
  const groups = new Map();

  db.sensors.forEach(sensor => {
    if (!groups.has(sensor.location)) {
      groups.set(sensor.location, { sensors: new Set(), readings: [] });
    }
    groups.get(sensor.location).sensors.add(sensor.id);
  });

  db.readings.forEach(reading => {
    const sensor = sensorById(reading.sensorId);
    if (!sensor) return;

    if (!groups.has(sensor.location)) {
      groups.set(sensor.location, { sensors: new Set(), readings: [] });
    }
    groups.get(sensor.location).readings.push(reading);
  });

  const locationData = [...groups.entries()].map(([location, group]) => ({
    location,
    sensors: group.sensors.size,
    readings: group.readings.length,
    highest: group.readings.length ? Math.max(...group.readings.map(r => Number(r.aqi))) : null,
    average: group.readings.length
      ? group.readings.reduce((sum, r) => sum + Number(r.aqi), 0) / group.readings.length
      : null
  })).sort((a, b) => (b.highest ?? -1) - (a.highest ?? -1));

  const allAQI = db.readings.map(r => Number(r.aqi));

  $("total-readings").textContent = db.readings.length;
  $("overall-average").textContent = allAQI.length
    ? number(allAQI.reduce((sum, v) => sum + v, 0) / allAQI.length)
    : "--";
  $("worst-location").textContent = locationData.find(item => item.highest !== null)?.location || "--";

  $("location-report").innerHTML = locationData.length
    ? locationData.map(item => `<tr>
      <td>${escapeHTML(item.location)}</td>
      <td>${item.sensors}</td><td>${item.readings}</td>
      <td>${item.highest === null ? "--" : aqiBadge(item.highest)}</td>
      <td>${item.average === null ? "--" : number(item.average)}</td>
    </tr>`).join("")
    : emptyRow(5, "No location data available.");

  const days = new Map();

  db.readings.forEach(reading => {
    const d = new Date(reading.date);
    if (Number.isNaN(d.getTime())) return;

    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");

    if (!days.has(key)) days.set(key, []);
    days.get(key).push(Number(reading.aqi));
  });

  const daily = [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  $("daily-report").innerHTML = daily.length
    ? daily.map(([date, values]) => `<tr>
      <td>${escapeHTML(date)}</td><td>${values.length}</td>
      <td>${number(values.reduce((sum, v) => sum + v, 0) / values.length)}</td>
    </tr>`).join("")
    : emptyRow(3, "No readings available.");
}

/* CSV EXPORT */

$("export-csv").addEventListener("click", () => {
  const headers = ["reading_id", "sensor_id", "sensor_name", "location", "recorded_at", "pm25", "pm10", "co2", "aqi", "category"];

  const rows = sortedReadings().map(r => {
    const sensor = sensorById(r.sensorId);
    return [
      r.id, r.sensorId, sensor?.name || "", sensor?.location || "",
      r.date, r.pm25, r.pm10, r.co2, r.aqi, aqiCategory(r.aqi).name
    ];
  });

  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "airwatch-readings.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notify("CSV report exported.");
});

/* UTILITIES */

function emptyRow(columns, message) {
  return `<tr><td colspan="${columns}" class="empty">${escapeHTML(message)}</td></tr>`;
}

/* STARTUP */

function startApp() {
  // Seed missing alert data once when necessary.
  if (!db.alerts.length && db.readings.some(r => Number(r.aqi) > ALERT_THRESHOLD)) {
    rebuildAlerts();
  }

  const user = currentUser();
  if (user && user.name && user.email) showApplication(user);
  else showAuthentication();
}

startApp();
