// ========================================
// AIRWATCH - SMART AIR QUALITY MONITORING
// Demo frontend using browser localStorage
// ========================================

const DEMO_EMAIL = "demo@airwatch.com";
const DEMO_PASSWORD = "AirWatch123";

const STORAGE_KEY = "airwatch_readings_v1";
const SESSION_KEY = "airwatch_demo_session";

const $ = (id) => document.getElementById(id);

let readings = loadReadings();

const sectionNames = {
  overview: "Dashboard Overview",
  readings: "Sensor Readings",
  history: "Historical Analysis",
  sensors: "Sensors"
};

// ---------- STORAGE ----------

function loadReadings() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveReadings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
}

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

// ---------- LOGIN ----------

$("fillDemo").addEventListener("click", () => {
  $("email").value = DEMO_EMAIL;
  $("password").value = DEMO_PASSWORD;
  $("loginError").textContent = "";
});

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    $("loginError").textContent = "";
    showDashboard();
  } else {
    $("loginError").textContent =
      "Invalid email or password. Please try again.";
  }
});

function showDashboard() {
  $("loginPage").classList.add("hidden");
  $("dashboardPage").classList.remove("hidden");

  renderAll();
  showSection("overview");
}

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);

  $("dashboardPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
  $("password").value = "";
  $("loginError").textContent = "";
});

// Restore the demo session on page refresh in this tab.
if (sessionStorage.getItem(SESSION_KEY) === "true") {
  showDashboard();
}

// ---------- NAVIGATION ----------

function showSection(name) {
  if (!Object.prototype.hasOwnProperty.call(sectionNames, name)) return;

  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.add("hidden");
  });

  $(name + "Section").classList.remove("hidden");
  $("pageTitle").textContent = sectionNames[name];

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === name);
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

$("addReadingShortcut").addEventListener("click", () => {
  showSection("readings");
  $("sensorId").focus();
});

// ---------- UTILITIES ----------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function sortedReadings() {
  return [...readings].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

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
    ${escapeHTML(status.label)}
  </span>`;
}

// ---------- ADD READING ----------

function setDefaultDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  $("readingDate").value = now.toISOString().slice(0, 16);
}

setDefaultDate();

$("readingForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const aqi = Number($("aqi").value);
  const pm25 = Number($("pm25").value);
  const pm10 = Number($("pm10").value);
  const temperature = Number($("temperature").value);
  const humidity = Number($("humidity").value);
  const date = new Date($("readingDate").value);

  const sensorId = $("sensorId").value.trim();
  const location = $("location").value.trim();

  if (!sensorId || !location) {
    $("readingMessage").textContent =
      "Sensor ID and location are required.";
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
    $("readingMessage").textContent =
      "Please enter valid values for all fields.";
    return;
  }

  const reading = {
    id: createId(),
    sensorId,
    location,
    aqi,
    pm25,
    pm10,
    temperature,
    humidity,
    date: date.toISOString()
  };

  readings.push(reading);

  try {
    saveReadings();
  } catch (error) {
    readings.pop();
    $("readingMessage").textContent =
      "Could not save the reading. Check browser storage.";
    return;
  }

  $("readingForm").reset();
  setDefaultDate();

  $("readingMessage").textContent = "Reading saved successfully!";
  renderAll();

  window.setTimeout(() => {
    $("readingMessage").textContent = "";
  }, 4000);
});

// ---------- SEARCH AND READINGS TABLE ----------

$("searchReadings").addEventListener("input", renderReadingsTable);

function renderReadingsTable() {
  const query = $("searchReadings").value.trim().toLowerCase();

  const filtered = sortedReadings().filter((reading) =>
    String(reading.sensorId).toLowerCase().includes(query) ||
    String(reading.location).toLowerCase().includes(query)
  );

  $("readingsTableBody").innerHTML = filtered.map((reading) => `
    <tr>
      <td>${escapeHTML(formatDate(reading.date))}</td>
      <td>${escapeHTML(reading.sensorId)}</td>
      <td>${escapeHTML(reading.location)}</td>
      <td>${Number(reading.aqi)} ${statusBadge(reading.aqi)}</td>
      <td>${Number(reading.pm25).toFixed(1)}</td>
      <td>${Number(reading.pm10).toFixed(1)}</td>
      <td>${Number(reading.temperature).toFixed(1)}°C</td>
      <td>${Number(reading.humidity).toFixed(1)}%</td>
      <td>
        <button class="delete-btn" data-delete="${escapeHTML(reading.id)}">
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  $("readingsEmpty").classList.toggle("hidden", filtered.length > 0);
}

$("readingsTableBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  const id = button.dataset.delete;
  const reading = readings.find((item) => item.id === id);

  if (!reading) return;

  if (!window.confirm(`Delete the reading from ${reading.location}?`)) {
    return;
  }

  const previousReadings = readings;
  readings = readings.filter((item) => item.id !== id);

  try {
    saveReadings();
  } catch {
    readings = previousReadings;
    alert("Could not delete the record. Please try again.");
    return;
  }

  renderAll();
});

// ---------- OVERVIEW ----------

function renderOverview() {
  const recent = sortedReadings();
  const latest = recent[0];

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

    const status = getAqiStatus(Number(latest.aqi));
    $("aqiStatus").textContent = status.label;
    $("aqiStatus").className = "status-badge " + status.className;
  }

  const recentRows = recent.slice(0, 5);

  $("recentTableBody").innerHTML = recentRows.map((reading) => `
    <tr>
      <td>${escapeHTML(formatDate(reading.date))}</td>
      <td>${escapeHTML(reading.location)}</td>
      <td><strong>${Number(reading.aqi)}</strong></td>
      <td>${Number(reading.pm25).toFixed(1)}</td>
      <td>${Number(reading.pm10).toFixed(1)}</td>
      <td>${statusBadge(reading.aqi)}</td>
    </tr>
  `).join("");

  $("recentEmpty").classList.toggle("hidden", recentRows.length > 0);
}

// ---------- HISTORICAL ANALYSIS ----------

function renderHistory() {
  if (!readings.length) {
    $("averageAqi").textContent = "--";
    $("highestAqi").textContent = "--";
    $("lowestAqi").textContent = "--";
    $("historySummary").textContent = "No data is available yet.";
    $("historyEmpty").classList.remove("hidden");
    return;
  }

  const values = readings.map((reading) => Number(reading.aqi));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  $("averageAqi").textContent = average.toFixed(1);
  $("highestAqi").textContent = highest;
  $("lowestAqi").textContent = lowest;
  $("historyEmpty").classList.add("hidden");

  $("historySummary").textContent =
    `There are ${readings.length} saved readings. ` +
    `The average AQI is ${average.toFixed(1)}, classified as ` +
    `${getAqiStatus(average).label}. The highest recorded AQI is ${highest}, ` +
    `and the lowest is ${lowest}. This summary uses only the data entered ` +
    `into this demo.`;
}

// ---------- SENSORS ----------

function renderSensors() {
  const sensorMap = new Map();

  readings.forEach((reading) => {
    if (!sensorMap.has(reading.sensorId)) {
      sensorMap.set(reading.sensorId, {
        sensorId: reading.sensorId,
        location: reading.location,
        count: 0,
        latestDate: reading.date,
        latestAqi: Number(reading.aqi)
      });
    }

    const sensor = sensorMap.get(reading.sensorId);
    sensor.count++;

    if (new Date(reading.date) > new Date(sensor.latestDate)) {
      sensor.latestDate = reading.date;
      sensor.latestAqi = Number(reading.aqi);
      sensor.location = reading.location;
    }
  });

  const sensors = [...sensorMap.values()];

  $("sensorCards").innerHTML = sensors.map((sensor) => `
    <article class="sensor-card">
      <div class="sensor-icon">⌖</div>
      <h4>${escapeHTML(sensor.sensorId)}</h4>
      <p>Location: ${escapeHTML(sensor.location)}</p>
      <p>Saved readings: <strong>${sensor.count}</strong></p>
      <p>Latest AQI: <strong>${sensor.latestAqi}</strong></p>
      <p>Latest record: ${escapeHTML(formatDate(sensor.latestDate))}</p>
      ${statusBadge(sensor.latestAqi)}
    </article>
  `).join("");

  $("sensorsEmpty").classList.toggle("hidden", sensors.length > 0);
}

// ---------- AQI CHARTS ----------

function drawCharts() {
  drawAqiChart("aqiChart");
  drawAqiChart("historyChart");
}

function drawAqiChart(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;

  const emptyElement = canvasId === "aqiChart"
    ? $("chartEmpty")
    : $("historyEmpty");

  const context = canvas.getContext("2d");
  const width = Math.max(canvas.clientWidth, 280);
  const height = canvasId === "aqiChart" ? 240 : 270;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.height = height + "px";

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const records = [...readings]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-12);

  if (!records.length) {
    if (emptyElement) emptyElement.classList.remove("hidden");
    return;
  }

  if (emptyElement) emptyElement.classList.add("hidden");

  const padding = { left: 42, right: 15, top: 20, bottom: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    100,
    Math.ceil(Math.max(...records.map((item) => Number(item.aqi))) / 50) * 50
  );

  context.font = "10px Inter, Arial";
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (let step = 0; step <= 4; step++) {
    const value = (maxValue / 4) * step;
    const y = padding.top + plotHeight - (value / maxValue) * plotHeight;

    context.strokeStyle = "#e8efeb";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    context.fillStyle = "#87968e";
    context.fillText(String(Math.round(value)), padding.left - 8, y);
  }

  const points = records.map((record, index) => ({
    x: records.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (records.length - 1)) * plotWidth,
    y: padding.top + plotHeight -
      (Number(record.aqi) / maxValue) * plotHeight,
    record
  }));

  context.beginPath();
  context.moveTo(points[0].x, padding.top + plotHeight);

  points.forEach((point) => context.lineTo(point.x, point.y));

  context.lineTo(
    points[points.length - 1].x,
    padding.top + plotHeight
  );

  context.closePath();
  context.fillStyle = "rgba(21, 150, 106, 0.10)";
  context.fill();

  context.beginPath();

  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });

  context.strokeStyle = "#15966a";
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.stroke();

  points.forEach((point, index) => {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle = "#15966a";
    context.fill();

    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();

    if (
      records.length <= 6 ||
      index === 0 ||
      index === points.length - 1 ||
      index % 2 === 0
    ) {
      const date = new Date(point.record.date);
      const label = Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString([], {
            month: "short",
            day: "numeric"
          });

      context.fillStyle = "#87968e";
      context.font = "9px Inter, Arial";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(label, point.x, padding.top + plotHeight + 12);
    }
  });
}

window.addEventListener("resize", () => {
  if (!$("dashboardPage").classList.contains("hidden")) {
    drawCharts();
  }
});

// ---------- CSV EXPORT ----------

function exportCsv() {
  if (!readings.length) {
    alert("There are no readings to export yet.");
    return;
  }

  const headers = [
    "Reading ID",
    "Sensor ID",
    "Location",
    "AQI",
    "PM2.5",
    "PM10",
    "Temperature Celsius",
    "Humidity Percent",
    "Date and Time"
  ];

  const rows = sortedReadings().map((reading) => [
    reading.id,
    reading.sensorId,
    reading.location,
    reading.aqi,
    reading.pm25,
    reading.pm10,
    reading.temperature,
    reading.humidity,
    reading.date
  ]);

  const csvCell = (value) =>
    '"' + String(value ?? "").replace(/"/g, '""') + '"';

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
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

$("exportCsvBtn").addEventListener("click", exportCsv);
$("historyExportBtn").addEventListener("click", exportCsv);

// ---------- RENDER EVERYTHING ----------

function renderAll() {
  renderOverview();
  renderReadingsTable();
  renderHistory();
  renderSensors();
  drawCharts();
}
