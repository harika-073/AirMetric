// ============================================
// AIRWATCH - LOGIN, READINGS, HISTORY, SENSORS
// Frontend demo: browser localStorage
// ============================================

const ADMIN_EMAIL = "admin@airwatch.com";
const ADMIN_PASSWORD = "Admin@123";

const USERS_KEY = "airwatch_registered_users_v2";
const READINGS_KEY = "airwatch_readings_v2";
const SENSORS_KEY = "airwatch_sensors_v2";
const SESSION_KEY = "airwatch_session_v2";

const $ = (id) => document.getElementById(id);

let users = loadArray(USERS_KEY);
let readings = loadArray(READINGS_KEY);
let sensors = loadArray(SENSORS_KEY);

let signupMode = false;
let currentAccount = null;

const sectionNames = {
  overview: "Dashboard Overview",
  readings: "Sensor Readings",
  history: "Historical Analysis",
  sensors: "Sensors"
};

function loadArray(key) {
  try {
    const result = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

function saveArray(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
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

// ============================================
// LOGIN AND USER REGISTRATION
// ============================================

$("toggleSignup").addEventListener("click", () => {
  signupMode = !signupMode;

  $("authTitle").textContent = signupMode
    ? "Create Account"
    : "Welcome Back";

  $("authDescription").textContent = signupMode
    ? "Create a user account to access AirWatch."
    : "Login to open your dashboard.";

  $("loginForm").querySelector('button[type="submit"]').textContent =
    signupMode ? "Create Account" : "Login";

  $("toggleSignup").textContent = signupMode
    ? "Already registered? Login"
    : "New user? Create an account";

  $("authRole").value = "user";
  $("authRole").disabled = signupMode;
  $("loginError").textContent = "";
});

$("authRole").addEventListener("change", () => {
  $("loginError").textContent = "";
});

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  const role = $("authRole").value;

  $("loginError").textContent = "";

  // Admin has fixed demo credentials.
  if (role === "admin") {
    if (signupMode) {
      $("loginError").textContent =
        "Admin accounts cannot be registered here.";
      return;
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      currentAccount = {
        email: ADMIN_EMAIL,
        role: "admin"
      };

      openDashboard();
    } else {
      $("loginError").textContent =
        "Invalid admin email or password.";
    }

    return;
  }

  // User registration.
  if (signupMode) {
    if (password.length < 6) {
      $("loginError").textContent =
        "Please use a password with at least 6 characters.";
      return;
    }

    if (email === ADMIN_EMAIL) {
      $("loginError").textContent =
        "This email is reserved for the admin account.";
      return;
    }

    if (users.some((user) => user.email === email)) {
      $("loginError").textContent =
        "An account with this email already exists. Please log in.";
      return;
    }

    const newUser = {
      id: createId(),
      email,
      password
    };

    users.push(newUser);

    try {
      saveArray(USERS_KEY, users);
    } catch {
      users.pop();
      $("loginError").textContent =
        "Could not save your account in this browser.";
      return;
    }

    currentAccount = {
      email: newUser.email,
      role: "user"
    };

    openDashboard();
    return;
  }

  // User login.
  const matchedUser = users.find(
    (user) => user.email === email && user.password === password
  );

  if (!matchedUser) {
    $("loginError").textContent =
      "Account not found or password is incorrect. Create an account first.";
    return;
  }

  currentAccount = {
    email: matchedUser.email,
    role: "user"
  };

  openDashboard();
});

function openDashboard() {
  $("loginPage").classList.add("hidden");
  $("dashboardPage").classList.remove("hidden");

  $("currentUser").textContent = currentAccount.email;
  $("roleBadge").textContent = currentAccount.role.toUpperCase();

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentAccount));
  } catch {
    // The dashboard can still run for this page session.
  }

  renderAll();
  showSection("overview");
}

function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

    if (!saved || !saved.email || !saved.role) return;

    if (
      saved.role === "admin" &&
      saved.email === ADMIN_EMAIL
    ) {
      currentAccount = saved;
      openDashboard();
      return;
    }

    const userExists = users.some((user) =>
      user.email === saved.email
    );

    if (saved.role === "user" && userExists) {
      currentAccount = saved;
      openDashboard();
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  currentAccount = null;

  $("dashboardPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
  $("password").value = "";
  $("loginError").textContent = "";

  signupMode = false;
  $("authTitle").textContent = "Welcome Back";
  $("authDescription").textContent = "Login to open your dashboard.";
  $("loginForm").querySelector('button[type="submit"]').textContent = "Login";
  $("toggleSignup").textContent = "New user? Create an account";
  $("authRole").disabled = false;
  $("authRole").value = "user";
});

// ============================================
// NAVIGATION
// ============================================

function showSection(name) {
  if (!Object.prototype.hasOwnProperty.call(sectionNames, name)) return;

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

// ============================================
// AQI CLASSIFICATION
// ============================================

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

// ============================================
// DATE INPUTS
// ============================================

function setCurrentDate(inputId) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  $(inputId).value = now.toISOString().slice(0, 16);
}

[
  "readingDate",
  "historyDate",
  "sensorReadingDate"
].forEach(setCurrentDate);

// ============================================
// SHARED READING VALIDATION AND SAVING
// ============================================

function saveNewReading(data, messageId, formId) {
  const sensorId = data.sensorId.trim();
  const location = data.location.trim();
  const aqi = Number(data.aqi);
  const pm25 = Number(data.pm25);
  const pm10 = Number(data.pm10);
  const temperature = Number(data.temperature);
  const humidity = Number(data.humidity);
  const date = new Date(data.date);

  const message = $(messageId);

  if (!sensorId || !location) {
    message.textContent = "Sensor ID and location are required.";
    return false;
  }

  if (
    !Number.isFinite(aqi) || aqi < 0 || aqi > 500 ||
    !Number.isFinite(pm25) || pm25 < 0 ||
    !Number.isFinite(pm10) || pm10 < 0 ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(humidity) || humidity < 0 || humidity > 100 ||
    Number.isNaN(date.getTime())
  ) {
    message.textContent = "Please enter valid sensor values.";
    return false;
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

  const previousReadings = readings;
  const previousSensors = sensors;

  readings = [...readings, reading];

  // Add sensor automatically if it has not been registered.
  if (!sensors.some((sensor) => sensor.sensorId === sensorId)) {
    sensors = [
      ...sensors,
      {
        id: createId(),
        sensorId,
        location,
        createdAt: new Date().toISOString()
      }
    ];
  }

  try {
    saveArray(READINGS_KEY, readings);
    saveArray(SENSORS_KEY, sensors);
  } catch {
    readings = previousReadings;
    sensors = previousSensors;

    try {
      saveArray(READINGS_KEY, readings);
      saveArray(SENSORS_KEY, sensors);
    } catch {
      // Browser storage may be unavailable.
    }

    message.textContent =
      "Could not save this reading. Check browser storage.";
    return false;
  }

  $(formId).reset();

  const dateInput = $(formId).querySelector('input[type="datetime-local"]');
  if (dateInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.value = now.toISOString().slice(0, 16);
  }

  message.textContent = "Reading added successfully!";
  renderAll();

  window.setTimeout(() => {
    message.textContent = "";
  }, 3500);

  return true;
}

// Reading form on the Sensor Readings page.
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

// Reading form on the Historical Analysis page.
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

// Reading form on the Sensors page.
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

// ============================================
// REGISTER SENSOR
// ============================================

$("sensorForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const sensorId = $("newSensorId").value.trim();
  const location = $("newSensorLocation").value.trim();

  if (!sensorId || !location) {
    $("sensorMessage").textContent =
      "Please enter the sensor ID and location.";
    return;
  }

  if (sensors.some((sensor) =>
    sensor.sensorId.toLowerCase() === sensorId.toLowerCase()
  )) {
    $("sensorMessage").textContent =
      "A sensor with this ID already exists.";
    return;
  }

  const previousSensors = sensors;

  sensors = [
    ...sensors,
    {
      id: createId(),
      sensorId,
      location,
      createdAt: new Date().toISOString()
    }
  ];

  try {
    saveArray(SENSORS_KEY, sensors);
  } catch {
    sensors = previousSensors;
    $("sensorMessage").textContent =
      "Could not save this sensor in browser storage.";
    return;
  }

  $("sensorForm").reset();
  $("sensorMessage").textContent = "Sensor registered successfully!";
  renderSensors();

  window.setTimeout(() => {
    $("sensorMessage").textContent = "";
  }, 3500);
});

// ============================================
// SEARCH AND DELETE READINGS
// ============================================

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

  const reading = readings.find((item) => item.id === button.dataset.delete);
  if (!reading) return;

  if (!confirm(`Delete the reading from ${reading.location}?`)) return;

  const previous = readings;
  readings = readings.filter((item) => item.id !== reading.id);

  try {
    saveArray(READINGS_KEY, readings);
  } catch {
    readings = previous;
    alert("Could not delete the record.");
    return;
  }

  renderAll();
});

// ============================================
// OVERVIEW
// ============================================

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

    const status = getAqiStatus(Number(latest.aqi));
    $("aqiStatus").textContent = status.label;
    $("aqiStatus").className = "status-badge " + status.className;
  }

  const recent = sortedReadings().slice(0, 5);

  $("recentTableBody").innerHTML = recent.map((reading) => `
    <tr>
      <td>${escapeHTML(formatDate(reading.date))}</td>
      <td>${escapeHTML(reading.sensorId)}</td>
      <td>${escapeHTML(reading.location)}</td>
      <td><strong>${Number(reading.aqi)}</strong></td>
      <td>${statusBadge(reading.aqi)}</td>
    </tr>
  `).join("");

  $("recentEmpty").classList.toggle("hidden", recent.length > 0);
}

// ============================================
// HISTORICAL ANALYSIS
// ============================================

function renderHistory() {
  const values = readings.map((reading) => Number(reading.aqi));

  if (!values.length) {
    $("averageAqi").textContent = "--";
    $("highestAqi").textContent = "--";
    $("lowestAqi").textContent = "--";
    $("historySummary").textContent = "No data available yet.";
    $("historyTableBody").innerHTML = "";
    $("historyEmpty").classList.remove("hidden");
    return;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  $("averageAqi").textContent = average.toFixed(1);
  $("highestAqi").textContent = highest;
  $("lowestAqi").textContent = lowest;

  $("historySummary").textContent =
    `${readings.length} readings are available. ` +
    `Average AQI: ${average.toFixed(1)} (${getAqiStatus(average).label}). ` +
    `Highest AQI: ${highest}. Lowest AQI: ${lowest}.`;

  $("historyTableBody").innerHTML = sortedReadings().map((reading) => `
    <tr>
      <td>${escapeHTML(formatDate(reading.date))}</td>
      <td>${escapeHTML(reading.sensorId)}</td>
      <td>${escapeHTML(reading.location)}</td>
      <td>${Number(reading.aqi)}</td>
      <td>${statusBadge(reading.aqi)}</td>
    </tr>
  `).join("");

  $("historyEmpty").classList.add("hidden");
}

// ============================================
// SENSORS
// ============================================

function renderSensors() {
  // Include sensors that already have readings.
  const sensorMap = new Map();

  sensors.forEach((sensor) => {
    sensorMap.set(sensor.sensorId, {
      ...sensor,
      count: 0,
      latestAqi: null,
      latestDate: null
    });
  });

  readings.forEach((reading) => {
    if (!sensorMap.has(reading.sensorId)) {
      sensorMap.set(reading.sensorId, {
        id: createId(),
        sensorId: reading.sensorId,
        location: reading.location,
        createdAt: reading.date,
        count: 0,
        latestAqi: null,
        latestDate: null
      });
    }

    const sensor = sensorMap.get(reading.sensorId);
    sensor.count++;

    if (
      !sensor.latestDate ||
      new Date(reading.date) > new Date(sensor.latestDate)
    ) {
      sensor.latestDate = reading.date;
      sensor.latestAqi = Number(reading.aqi);
      sensor.location = reading.location;
    }
  });

  const list = [...sensorMap.values()];

  $("sensorCards").innerHTML = list.map((sensor) => `
    <article class="sensor-card">
      <div class="sensor-icon">⌖</div>
      <h4>${escapeHTML(sensor.sensorId)}</h4>
      <p>Location: ${escapeHTML(sensor.location)}</p>
      <p>Readings: <strong>${sensor.count}</strong></p>
      <p>Latest AQI: <strong>${sensor.latestAqi ?? "--"}</strong></p>
      <p>Last recorded: ${sensor.latestDate
        ? escapeHTML(formatDate(sensor.latestDate))
        : "No readings yet"}</p>
      ${sensor.latestAqi !== null ? statusBadge(sensor.latestAqi) : ""}
    </article>
  `).join("");

  $("sensorsEmpty").classList.toggle("hidden", list.length > 0);
}

// ============================================
// AQI CHARTS
// ============================================

function drawCharts() {
  drawAqiChart("aqiChart");
  drawAqiChart("historyChart");
}

function drawAqiChart(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;

  const emptyId = canvasId === "aqiChart"
    ? "chartEmpty"
    : "historyEmpty";

  const emptyElement = $(emptyId);
  const context = canvas.getContext("2d");
  const width = Math.max(canvas.clientWidth, 280);
  const height = 240;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = height + "px";

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const records = [...readings]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-12);

  if (!records.length) {
    if (canvasId === "aqiChart") {
      emptyElement.classList.remove("hidden");
    } else if (!readings.length) {
      emptyElement.classList.remove("hidden");
    }
    return;
  }

  emptyElement.classList.add("hidden");

  const padding = { left: 42, right: 15, top: 20, bottom: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    100,
    Math.ceil(Math.max(...records.map((record) => Number(record.aqi))) / 50) * 50
  );

  context.font = "10px Arial";
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (let step = 0; step <= 4; step++) {
    const value = maxValue * step / 4;
    const y = padding.top + plotHeight - value / maxValue * plotHeight;

    context.strokeStyle = "#e8efeb";
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
      : padding.left + index / (records.length - 1) * plotWidth,
    y: padding.top + plotHeight -
      Number(record.aqi) / maxValue * plotHeight,
    record
  }));

  context.beginPath();
  context.moveTo(points[0].x, padding.top + plotHeight);
  points.forEach((point) => context.lineTo(point.x, point.y));
  context.lineTo(points[points.length - 1].x, padding.top + plotHeight);
  context.closePath();
  context.fillStyle = "rgba(21,150,106,0.10)";
  context.fill();

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });

  context.strokeStyle = "#15966a";
  context.lineWidth = 2.5;
  context.stroke();

  points.forEach((point, index) => {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle = "#15966a";
    context.fill();

    const date = new Date(point.record.date);
    const label = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString([], { month: "short", day: "numeric" });

    if (
      records.length <= 6 ||
      index === 0 ||
      index === points.length - 1 ||
      index % 2 === 0
    ) {
      context.fillStyle = "#87968e";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.font = "9px Arial";
      context.fillText(label, point.x, padding.top + plotHeight + 12);
    }
  });
}

window.addEventListener("resize", () => {
  if (!$("dashboardPage").classList.contains("hidden")) drawCharts();
});

// ============================================
// CSV EXPORT
// ============================================

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

// ============================================
// REFRESH ALL SECTIONS
// ============================================

function renderAll() {
  renderOverview();
  renderReadingsTable();
  renderHistory();
  renderSensors();
  drawCharts();
}

restoreSession();
