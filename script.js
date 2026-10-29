
"use strict";

// AirWatch frontend demonstration data.
// Later, PHP will load and save these records in MySQL.

const sensors = [
  { id: 1, name: "Central Station", location: "City Centre", aqi: 68, pm25: 24, pm10: 49, co2: 420, status: "Active" },
  { id: 2, name: "Green Park", location: "Green Park", aqi: 42, pm25: 12, pm10: 28, co2: 390, status: "Active" },
  { id: 3, name: "Industrial Zone", location: "Industrial Area", aqi: 156, pm25: 71, pm10: 112, co2: 620, status: "Active" },
  { id: 4, name: "School Campus", location: "Education District", aqi: 56, pm25: 18, pm10: 35, co2: 405, status: "Active" },
  { id: 5, name: "Riverside", location: "Riverside Road", aqi: 0, pm25: 0, pm10: 0, co2: 0, status: "Inactive" }
];

const readings = [
  { date: "2026-10-29 09:00", sensorId: 1, aqi: 55, pm25: 19, pm10: 38, co2: 410 },
  { date: "2026-10-29 10:00", sensorId: 1, aqi: 61, pm25: 22, pm10: 43, co2: 415 },
  { date: "2026-10-29 11:00", sensorId: 1, aqi: 68, pm25: 24, pm10: 49, co2: 420 },
  { date: "2026-10-29 09:00", sensorId: 2, aqi: 38, pm25: 10, pm10: 24, co2: 385 },
  { date: "2026-10-29 10:00", sensorId: 2, aqi: 42, pm25: 12, pm10: 28, co2: 390 },
  { date: "2026-10-29 09:00", sensorId: 3, aqi: 135, pm25: 62, pm10: 98, co2: 600 },
  { date: "2026-10-29 10:00", sensorId: 3, aqi: 156, pm25: 71, pm10: 112, co2: 620 },
  { date: "2026-10-29 09:00", sensorId: 4, aqi: 49, pm25: 15, pm10: 31, co2: 398 },
  { date: "2026-10-29 10:00", sensorId: 4, aqi: 56, pm25: 18, pm10: 35, co2: 405 }
];

let alerts = [
  { id: 1, sensorId: 3, title: "Elevated AQI detected", message: "The sample AQI at Industrial Zone is 156.", severity: "High", status: "Open", time: "Today, 10:00 AM" },
  { id: 2, sensorId: 3, title: "High PM2.5 concentration", message: "The sample PM2.5 reading is 71 µg/m³.", severity: "Severe", status: "Open", time: "Today, 10:00 AM" }
];

let currentAccount = null;
let chartInstance = null;
let nextSensorId = 6;

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function aqiCategory(aqi) {
  if (aqi <= 50) return { label: "Good", className: "good-status" };
  if (aqi <= 100) return { label: "Moderate", className: "moderate" };
  return { label: "Unhealthy", className: "bad-status" };
}

function getSensor(id) {
  return sensors.find(sensor => sensor.id === Number(id));
}

function openDashboard(name, role) {
  currentAccount = { name, role };
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("assistantToggle").classList.remove("hidden");

  $("profileName").textContent = name;
  $("welcomeName").textContent = name.split(" ")[0];
  $("profileRole").textContent = role === "admin" ? "Administrator preview" : "User preview";
  $("avatar").textContent = name.trim().charAt(0).toUpperCase() || "U";
  $("adminNavigation").classList.toggle("hidden", role !== "admin");
  document.querySelectorAll(".admin-only").forEach(el => {
    el.classList.toggle("hidden", role !== "admin");
  });

  $("currentDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });

  renderAll();
  showPage("overview");
}

function showAuthTab(tabName) {
  const isLogin = tabName === "login";
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("registerForm").classList.toggle("hidden", isLogin);
  document.querySelectorAll(".auth-tabs .tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.auth === tabName);
  });
  $("authMessage").textContent = "";
}

document.querySelectorAll("[data-auth]").forEach(button => {
  button.addEventListener("click", () => showAuthTab(button.dataset.auth));
});

// These forms deliberately do not pretend to authenticate against a database.
// The PHP/MySQL backend will implement real registration and sign-in.
$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  $("authMessage").textContent =
    "Real sign-in is not connected yet. Use a preview button to explore the frontend.";
});

$("registerForm").addEventListener("submit", event => {
  event.preventDefault();
  $("authMessage").textContent =
    "Registration screen is ready. Connect PHP and MySQL to create and securely authenticate accounts.";
});

$("demoUser").addEventListener("click", () => openDashboard("Demo User", "user"));
$("demoAdmin").addEventListener("click", () => openDashboard("Demo Admin", "admin"));

$("logoutButton").addEventListener("click", () => {
  currentAccount = null;
  $("app").classList.add("hidden");
  $("assistantToggle").classList.add("hidden");
  $("assistantPanel").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  $("loginForm").reset();
  showAuthTab("login");
});

function showPage(pageName) {
  if (!$( "page-" + pageName)) return;

  if (pageName === "admin" && currentAccount?.role !== "admin") {
    showToast("The admin preview is available only in admin mode.");
    return;
  }

  document.querySelectorAll(".page").forEach(page => page.classList.remove("active-page"));
  $("page-" + pageName).classList.add("active-page");

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });

  const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"] span`);
  $("pageBreadcrumb").textContent = activeLink ? activeLink.textContent : "Overview";
  $("sidebar").classList.remove("open");

  if (pageName === "overview" && chartInstance) chartInstance.resize();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});
document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.goto));
});
$("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));

function renderOverview() {
  const activeSensors = sensors.filter(sensor => sensor.status === "Active");
  const averageAQI = activeSensors.length
    ? Math.round(activeSensors.reduce((sum, sensor) => sum + sensor.aqi, 0) / activeSensors.length)
    : 0;
  const averagePM = activeSensors.length
    ? Math.round(activeSensors.reduce((sum, sensor) => sum + sensor.pm25, 0) / activeSensors.length)
    : 0;

  $("avgAqi").textContent = averageAQI;
  $("activeCount").innerHTML = `${activeSensors.length} <small>/ ${sensors.length}</small>`;
  $("alertCount").textContent = alerts.filter(alert => alert.status === "Open").length;
  $("avgPm").innerHTML = `${averagePM} <small>µg/m³</small>`;

  $("overviewSensorRows").innerHTML = sensors.map(sensor => {
    const category = aqiCategory(sensor.aqi);
    return `<tr>
      <td><div class="sensor-name"><span class="sensor-symbol">⌁</span>${escapeHTML(sensor.name)}</div></td>
      <td>${escapeHTML(sensor.location)}</td>
      <td><strong>${sensor.aqi}</strong></td>
      <td>${sensor.pm25} µg/m³</td>
      <td><span class="table-status ${sensor.status === "Inactive" ? "inactive" : ""}">${sensor.status}</span></td>
    </tr>`;
  }).join("");

  renderChart();
}

function renderChart() {
  if (!window.Chart || !$("aqiChart")) return;

  const count = Number($("chartPeriod").value || 7);
  const chartReadings = readings.slice(-count);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart($("aqiChart"), {
    type: "line",
    data: {
      labels: chartReadings.map(reading => {
        const sensor = getSensor(reading.sensorId);
        return `${sensor ? sensor.name : "Sensor"} · ${reading.date.slice(11)}`;
      }),
      datasets: [{
        label: "AQI",
        data: chartReadings.map(reading => reading.aqi),
        borderColor: "#19a878",
        backgroundColor: "rgba(25,168,120,.12)",
        fill: true,
        tension: .35,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: "#edf1f5" } },
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } }
      }
    }
  });
}
$("chartPeriod").addEventListener("change", renderChart);

function renderSensors() {
  $("sensorGrid").innerHTML = sensors.map(sensor => {
    const category = aqiCategory(sensor.aqi);
    const removeButton = currentAccount?.role === "admin"
      ? `<button class="secondary-btn remove-sensor" data-id="${sensor.id}">Remove</button>` : "";

    return `<article class="sensor-card">
      <div class="sensor-card-head">
        <span class="sensor-symbol">⌁</span>
        <span class="status-pill ${sensor.status === "Active" ? "good-status" : ""}">${sensor.status}</span>
      </div>
      <h3>${escapeHTML(sensor.name)}</h3>
      <p class="sensor-location">${escapeHTML(sensor.location)}</p>
      <div class="sensor-metrics">
        <div><small>AQI</small><strong>${sensor.aqi}</strong></div>
        <div><small>Category</small><strong>${category.label}</strong></div>
        <div><small>PM2.5</small><strong>${sensor.pm25}</strong></div>
        <div><small>PM10</small><strong>${sensor.pm10}</strong></div>
      </div>
      <p class="form-note">CO₂ sample: ${sensor.co2} ppm</p>
      ${removeButton}
    </article>`;
  }).join("");

  document.querySelectorAll(".remove-sensor").forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const index = sensors.findIndex(sensor => sensor.id === id);
      if (index < 0) return;

      sensors.splice(index, 1);
      renderAll();
      showToast("Removed from this preview only.");
    });
  });
}

$("addSensorButton").addEventListener("click", () => {
  $("sensorFormWrap").classList.remove("hidden");
  $("sensorName").focus();
});
$("cancelSensor").addEventListener("click", () => {
  $("sensorFormWrap").classList.add("hidden");
  $("sensorForm").reset();
});

$("sensorForm").addEventListener("submit", event => {
  event.preventDefault();
  if (currentAccount?.role !== "admin") {
    showToast("Admin preview required.");
    return;
  }

  sensors.push({
    id: nextSensorId++,
    name: $("sensorName").value.trim(),
    location: $("sensorLocation").value.trim(),
    aqi: 45, pm25: 14, pm10: 30, co2: 400, status: "Active"
  });

  $("sensorForm").reset();
  $("sensorFormWrap").classList.add("hidden");
  renderAll();
  showToast("Added to the preview. It is not saved to MySQL.");
});

function renderHistory() {
  $("historyRows").innerHTML = readings.slice().reverse().map(reading => {
    const sensor = getSensor(reading.sensorId);
    return `<tr>
      <td>${escapeHTML(reading.date)}</td>
      <td>${escapeHTML(sensor?.name || "Removed sensor")}</td>
      <td><strong>${reading.aqi}</strong></td>
      <td>${reading.pm25} µg/m³</td>
      <td>${reading.pm10} µg/m³</td>
      <td>${reading.co2} ppm</td>
    </tr>`;
  }).join("");
}

function renderAlerts() {
  if (!alerts.length) {
    $("alertList").innerHTML = '<article class="panel">No alerts in this preview.</article>';
    return;
  }

  $("alertList").innerHTML = alerts.map(alert => `
    <article class="alert-card ${alert.severity === "Severe" ? "severe" : ""}">
      <div>
        <h3>${escapeHTML(alert.title)}</h3>
        <p>${escapeHTML(alert.message)}</p>
        <div class="alert-meta">${escapeHTML(alert.time)} · ${escapeHTML(alert.severity)} · ${escapeHTML(alert.status)}</div>
      </div>
      ${alert.status === "Open" && currentAccount?.role === "admin"
        ? `<button class="secondary-btn resolve-alert" data-id="${alert.id}">Resolve</button>` : ""}
    </article>
  `).join("");

  document.querySelectorAll(".resolve-alert").forEach(button => {
    button.addEventListener("click", () => {
      const alert = alerts.find(item => item.id === Number(button.dataset.id));
      if (!alert) return;
      alert.status = "Resolved";
      renderAll();
      showToast("Alert marked resolved in this preview.");
    });
  });
}

function renderReports() {
  const average = readings.length
    ? Math.round(readings.reduce((sum, reading) => sum + reading.aqi, 0) / readings.length)
    : 0;
  const maximum = readings.length ? Math.max(...readings.map(reading => reading.aqi)) : 0;

  $("reportReadingCount").textContent = readings.length;
  $("reportAvgAqi").textContent = average;
  $("reportMaxAqi").textContent = maximum;
  $("reportInterpretation").textContent =
    `The sample dataset contains ${readings.length} readings. Its average AQI is ${average}, and its highest recorded sample AQI is ${maximum}. These values are demonstrations, not measurements from real sensors.`;
}

function renderAdmin() {
  $("adminSensors").textContent = sensors.length;
  $("adminReadings").textContent = readings.length;
  $("adminAlerts").textContent = alerts.filter(alert => alert.status === "Open").length;
}

function renderAll() {
  renderOverview();
  renderSensors();
  renderHistory();
  renderAlerts();
  renderReports();
  renderAdmin();
}

function downloadCSV(filename, rows) {
  const csv = rows.map(row => row.map(value =>
    `"${String(value ?? "").replace(/"/g, '""')}"`
  ).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

$("exportHistory").addEventListener("click", () => {
  const rows = [["Date and time", "Sensor", "AQI", "PM2.5", "PM10", "CO2"]];
  readings.forEach(reading => {
    rows.push([
      reading.date,
      getSensor(reading.sensorId)?.name || "Removed sensor",
      reading.aqi, reading.pm25, reading.pm10, reading.co2
    ]);
  });
  downloadCSV("airwatch-historical-readings.csv", rows);
});

$("downloadReport").addEventListener("click", () => {
  const rows = [
    ["AirWatch Sample Report"],
    ["Generated", new Date().toLocaleString()],
    ["Note", "Demonstration data, not real sensor measurements"],
    ["Total readings", readings.length],
    ["Average AQI", $("reportAvgAqi").textContent],
    ["Highest AQI", $("reportMaxAqi").textContent],
    [],
    ["Sensor", "Location", "Status", "AQI", "PM2.5", "PM10", "CO2"]
  ];
  sensors.forEach(sensor => rows.push([
    sensor.name, sensor.location, sensor.status,
    sensor.aqi, sensor.pm25, sensor.pm10, sensor.co2
  ]));
  downloadCSV("airwatch-report.csv", rows);
});

// Rule-based assistant. This is not a generative AI service.
$("assistantToggle").addEventListener("click", () => $("assistantPanel").classList.toggle("hidden"));
$("closeAssistant").addEventListener("click", () => $("assistantPanel").classList.add("hidden"));

function assistantReply(message) {
  const text = message.toLowerCase();

  if (text.includes("aqi") || text.includes("air quality")) {
    return "AQI stands for Air Quality Index. It summarizes air pollution levels. This project uses sample values, so they should not be treated as current local air-quality readings.";
  }
  if (text.includes("pm2.5") || text.includes("pm 2.5")) {
    return "PM2.5 means fine particles with a diameter of 2.5 micrometres or less. Fine particles can enter deep into the lungs.";
  }
  if (text.includes("pm10") || text.includes("pm 10")) {
    return "PM10 refers to inhalable particles with a diameter of 10 micrometres or less, including dust and other particles.";
  }
  if (text.includes("co2") || text.includes("carbon dioxide")) {
    return "CO₂ is carbon dioxide. In indoor settings, its concentration can help assess ventilation, but it is not the same as an outdoor AQI measurement.";
  }
  if (text.includes("alert")) {
    const open = alerts.filter(alert => alert.status === "Open");
    return `There are ${open.length} open sample alerts in this preview. Review the Alerts page for their descriptions.`;
  }
  if (text.includes("sensor")) {
    const active = sensors.filter(sensor => sensor.status === "Active").length;
    return `${active} of ${sensors.length} sample sensors are marked active. These are demo records, not connected hardware.`;
  }
  if (text.includes("health") || text.includes("protect")) {
    return "When air quality is poor, consider checking an official local air-quality service, reducing strenuous outdoor activity when advised, and following local public-health guidance.";
  }
  return "I can help explain AQI, PM2.5, PM10, CO₂, sensors, alerts, and the sample report. Ask me about one of these topics.";
}

function sendChatMessage() {
  const input = $("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.textContent = message;
  $("chatMessages").appendChild(userBubble);

  const botBubble = document.createElement("div");
  botBubble.className = "chat-bubble bot";
  botBubble.textContent = assistantReply(message);
  $("chatMessages").appendChild(botBubble);

  input.value = "";
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
}

$("sendChat").addEventListener("click", sendChatMessage);
$("chatInput").addEventListener("keydown", event => {
  if (event.key === "Enter") sendChatMessage();
});

// Initial date for the login preview and dashboard.
$("currentDate").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", day: "numeric", month: "short", year: "numeric"
});
