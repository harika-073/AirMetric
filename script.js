
const $ = id => document.getElementById(id);

const dateOffset = (days, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString().slice(0, 16);
};

let nextSensorId = 5;
let nextReadingId = 9;

let sensors = [
  { id: 1, name: "Campus Central", location: "College Campus", lat: 16.30, lon: 80.45, status: "Active" },
  { id: 2, name: "City Monitor", location: "City Center", lat: 16.31, lon: 80.44, status: "Active" },
  { id: 3, name: "Industrial Watch", location: "Industrial Area", lat: 16.34, lon: 80.48, status: "Maintenance" },
  { id: 4, name: "Green Park Sensor", location: "Green Park", lat: 16.29, lon: 80.43, status: "Inactive" }
];

let readings = [
  { id: 1, sensorId: 1, date: dateOffset(6, 8), pm25: 24, pm10: 41, co2: 420, aqi: 65 },
  { id: 2, sensorId: 2, date: dateOffset(5, 9), pm25: 42, pm10: 70, co2: 450, aqi: 105 },
  { id: 3, sensorId: 3, date: dateOffset(4, 10), pm25: 71, pm10: 120, co2: 520, aqi: 165 },
  { id: 4, sensorId: 1, date: dateOffset(3, 11), pm25: 29, pm10: 48, co2: 430, aqi: 78 },
  { id: 5, sensorId: 2, date: dateOffset(2, 12), pm25: 52, pm10: 90, co2: 470, aqi: 125 },
  { id: 6, sensorId: 3, date: dateOffset(1, 13), pm25: 85, pm10: 145, co2: 580, aqi: 210 },
  { id: 7, sensorId: 1, date: dateOffset(0, 9), pm25: 20, pm10: 36, co2: 410, aqi: 52 },
  { id: 8, sensorId: 2, date: dateOffset(0, 11), pm25: 45, pm10: 77, co2: 460, aqi: 115 }
];

let resolvedAlerts = new Set();
let aqiChart = null;
let pollutionChart = null;
let toastTimer;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function sensorById(id) {
  return sensors.find(s => s.id === Number(id));
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

function badge(text, kind) {
  return `<span class="badge badge-${kind.toLowerCase()}">${esc(text)}</span>`;
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));

  $(page)?.classList.add("active");
  document.querySelector(`.nav[data-page="${page}"]`)?.classList.add("active");

  const titles = {
    dashboard: "Air Quality Dashboard",
    sensors: "Sensor Management",
    readings: "Historical Readings",
    alerts: "Pollution Alerts",
    reports: "Reports & Analytics",
    docs: "DBMS Documentation"
  };

  $("page-title").textContent = titles[page] || "AirWatch";
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

function getAlerts() {
  return readings
    .filter(r => r.aqi > 150)
    .map(r => ({
      id: r.id,
      readingId: r.id,
      sensorId: r.sensorId,
      aqi: r.aqi,
      date: r.date,
      severity: r.aqi > 200 ? "Severe" : "High",
      status: resolvedAlerts.has(r.id) ? "Resolved" : "Open"
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderDashboard() {
  $("total-sensors").textContent = sensors.length;
  $("active-sensors").textContent = sensors.filter(s => s.status === "Active").length;

  const latest = [...readings].sort((a, b) => new Date(b.date) - new Date(a.date));
  const mostRecent = latest[0];

  $("latest-aqi").textContent = mostRecent ? mostRecent.aqi : "--";
  $("aqi-status").textContent = mostRecent
    ? aqiCategory(mostRecent.aqi)[0]
    : "No readings";

  $("open-alerts").textContent = getAlerts().filter(a => a.status === "Open").length;

  $("latest-table").innerHTML = latest.slice(0, 6).map(r => `
    <tr>
      <td>${esc(sensorName(r.sensorId))}</td>
      <td>${esc(sensorById(r.sensorId)?.location || "Unknown")}</td>
      <td>${badge(`${r.aqi} · ${aqiCategory(r.aqi)[0]}`, aqiCategory(r.aqi)[1])}</td>
      <td>${r.pm25}</td>
      <td>${r.pm10}</td>
      <td>${esc(fmtDate(r.date))}</td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="empty">No readings found.</td></tr>`;

  renderCharts(latest);
}

function renderCharts(latest) {
  const history = [...latest].sort((a, b) => new Date(a.date) - new Date(b.date));

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#b9c9df", boxWidth: 12, usePointStyle: true }
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
      labels: history.map(r => new Date(r.date).toLocaleDateString()),
      datasets: [{
        label: "AQI",
        data: history.map(r => r.aqi),
        borderColor: "#39d9a0",
        backgroundColor: "rgba(57,217,160,.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 4
      }]
    },
    options: chartDefaults
  });

  const selected = history.slice(-8);
  if (pollutionChart) pollutionChart.destroy();

  pollutionChart = new Chart($("pollutionChart"), {
    type: "bar",
    data: {
      labels: selected.map(r => sensorName(r.sensorId).slice(0, 12)),
      datasets: [
        { label: "PM2.5", data: selected.map(r => r.pm25), backgroundColor: "#58a6ff" },
        { label: "PM10", data: selected.map(r => r.pm10), backgroundColor: "#f5ca58" },
        { label: "CO₂", data: selected.map(r => r.co2), backgroundColor: "#ff9c52" }
      ]
    },
    options: chartDefaults
  });
}

function renderSensorOptions() {
  const options = sensors.map(s =>
    `<option value="${s.id}">${esc(s.name)} — ${esc(s.location)}</option>`
  ).join("");

  const filter = $("reading-sensor-filter");
  const previous = filter.value;
  filter.innerHTML = `<option value="">All sensors</option>${options}`;
  if ([...filter.options].some(o => o.value === previous)) filter.value = previous;

  const formSelect = $("reading-sensor");
  const formPrevious = formSelect.value;
  formSelect.innerHTML = options;
  if ([...formSelect.options].some(o => o.value === formPrevious)) {
    formSelect.value = formPrevious;
  }
}

function renderSensors() {
  const query = $("sensor-search").value.trim().toLowerCase();
  const status = $("sensor-status-filter").value;

  const filtered = sensors.filter(s =>
    `${s.name} ${s.location} ${s.id}`.toLowerCase().includes(query) &&
    (!status || s.status === status)
  );

  $("sensors-table").innerHTML = filtered.map(s => `
    <tr>
      <td>#${s.id}</td>
      <td>${esc(s.name)}</td>
      <td>${esc(s.location)}</td>
      <td>${badge(s.status, s.status.toLowerCase())}</td>
      <td><div class="table-actions">
        <button class="mini-btn" data-edit-sensor="${s.id}">Edit</button>
        <button class="mini-btn delete" data-delete-sensor="${s.id}">Delete</button>
      </div></td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="empty">No sensors match your search.</td></tr>`;
}

$("sensor-search").addEventListener("input", renderSensors);
$("sensor-status-filter").addEventListener("change", renderSensors);

$("add-sensor").addEventListener("click", () => {
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

  const id = Number($("sensor-id").value);
  const item = {
    name: $("sensor-name").value.trim(),
    location: $("sensor-location").value.trim(),
    lat: Number($("sensor-lat").value),
    lon: Number($("sensor-lon").value),
    status: $("sensor-status").value
  };

  if (!item.name || !item.location ||
      !Number.isFinite(item.lat) || !Number.isFinite(item.lon) ||
      item.lat < -90 || item.lat > 90 ||
      item.lon < -180 || item.lon > 180) {
    showToast("Enter valid sensor details.");
    return;
  }

  if (id) {
    const existing = sensorById(id);
    if (existing) Object.assign(existing, item);
    showToast("Sensor updated in this demo.");
  } else {
    sensors.push({ id: nextSensorId++, ...item });
    showToast("Sensor added in this demo.");
  }

  $("sensor-form-panel").hidden = true;
  renderAll();
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
    if (!confirm("Delete this sensor and its readings from the demo?")) return;

    sensors = sensors.filter(s => s.id !== id);
    const removedReadingIds = readings.filter(r => r.sensorId === id).map(r => r.id);
    readings = readings.filter(r => r.sensorId !== id);
    removedReadingIds.forEach(id => resolvedAlerts.delete(id));

    renderAll();
    showToast("Sensor and related demo readings deleted.");
  }
});

function getFilteredReadings() {
  const sensorId = $("reading-sensor-filter").value;
  const from = $("date-from").value;
  const to = $("date-to").value;

  return [...readings]
    .filter(r => !sensorId || r.sensorId === Number(sensorId))
    .filter(r => !from || r.date.slice(0, 10) >= from)
    .filter(r => !to || r.date.slice(0, 10) <= to)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderReadings() {
  const filtered = getFilteredReadings();

  $("record-count").textContent = filtered.length;
  $("avg-aqi").textContent = filtered.length
    ? Math.round(filtered.reduce((sum, r) => sum + r.aqi, 0) / filtered.length)
    : "--";
  $("max-aqi").textContent = filtered.length
    ? Math.max(...filtered.map(r => r.aqi))
    : "--";

  $("readings-table").innerHTML = filtered.map(r => `
    <tr>
      <td>#${r.id}</td>
      <td>${esc(sensorName(r.sensorId))}</td>
      <td>${esc(fmtDate(r.date))}</td>
      <td>${r.pm25}</td>
      <td>${r.pm10}</td>
      <td>${r.co2}</td>
      <td>${badge(`${r.aqi} · ${aqiCategory(r.aqi)[0]}`, aqiCategory(r.aqi)[1])}</td>
      <td><div class="table-actions">
        <button class="mini-btn" data-edit-reading="${r.id}">Edit</button>
        <button class="mini-btn delete" data-delete-reading="${r.id}">Delete</button>
      </div></td>
    </tr>
  `).join("") || `<tr><td colspan="8" class="empty">No readings match these filters.</td></tr>`;
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

  if (!sensorById(item.sensorId) || !date || !Number.isFinite(new Date(date).getTime()) ||
      ![item.pm25, item.pm10, item.co2, item.aqi].every(Number.isFinite) ||
      item.pm25 < 0 || item.pm10 < 0 || item.co2 < 0 ||
      item.aqi < 0 || item.aqi > 500) {
    showToast("Check the sensor, date, and measurement values.");
    return;
  }

  if (id) {
    const existing = readings.find(r => r.id === id);
    if (existing) Object.assign(existing, item);
    resolvedAlerts.delete(id);
    showToast("Reading updated in this demo.");
  } else {
    readings.push({ id: nextReadingId++, ...item });
    showToast("Reading added in this demo.");
  }

  $("reading-form-panel").hidden = true;
  renderAll();
});

$("readings-table").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-reading]");
  const del = event.target.closest("[data-delete-reading]");

  if (edit) {
    const r = readings.find(item => item.id === Number(edit.dataset.editReading));
    if (!r) return;

    $("reading-id").value = r.id;
    $("reading-sensor").value = String(r.sensorId);
    $("reading-date").value = r.date;
    $("reading-pm25").value = r.pm25;
    $("reading-pm10").value = r.pm10;
    $("reading-co2").value = r.co2;
    $("reading-aqi").value = r.aqi;
    $("reading-form-title").textContent = "Edit Reading";
    $("reading-form-panel").hidden = false;
    $("reading-form-panel").scrollIntoView({ behavior: "smooth" });
  }

  if (del) {
    const id = Number(del.dataset.deleteReading);
    if (!confirm("Delete this demo reading?")) return;

    readings = readings.filter(r => r.id !== id);
    resolvedAlerts.delete(id);
    renderAll();
    showToast("Reading deleted from this demo.");
  }
});

function renderAlerts() {
  const alerts = getAlerts();
  $("total-alerts").textContent = alerts.length;
  $("unresolved-alerts").textContent = alerts.filter(a => a.status === "Open").length;

  $("alerts-table").innerHTML = alerts.map(a => `
    <tr>
      <td>#${a.id}</td>
      <td>${esc(sensorName(a.sensorId))}</td>
      <td>${esc(sensorById(a.sensorId)?.location || "Unknown")}</td>
      <td>${a.aqi}</td>
      <td>${badge(a.severity, "severe")}</td>
      <td>${esc(fmtDate(a.date))}</td>
      <td>${badge(a.status, a.status.toLowerCase())}</td>
      <td>${a.status === "Open"
        ? `<button class="mini-btn" data-resolve="${a.id}">Resolve</button>`
        : `<button class="mini-btn" data-reopen="${a.id}">Reopen</button>`}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="8" class="empty">No alerts. AQI alerts are generated above 150.</td></tr>`;
}

$("alerts-table").addEventListener("click", event => {
  const resolve = event.target.closest("[data-resolve]");
  const reopen = event.target.closest("[data-reopen]");

  if (resolve) {
    resolvedAlerts.add(Number(resolve.dataset.resolve));
    showToast("Alert resolved in this demo.");
  }
  if (reopen) {
    resolvedAlerts.delete(Number(reopen.dataset.reopen));
    showToast("Alert reopened in this demo.");
  }
  renderAll();
});

function renderReports() {
  $("total-readings").textContent = readings.length;
  $("overall-average").textContent = readings.length
    ? (readings.reduce((sum, r) => sum + r.aqi, 0) / readings.length).toFixed(1)
    : "--";

  const locations = sensors.map(s => {
    const items = readings.filter(r => r.sensorId === s.id);
    return {
      location: s.location,
      sensorCount: 1,
      count: items.length,
      highest: items.length ? Math.max(...items.map(r => r.aqi)) : null,
      average: items.length
        ? (items.reduce((sum, r) => sum + r.aqi, 0) / items.length).toFixed(1)
        : null
    };
  });

  const populated = locations.filter(x => x.highest !== null);
  const worst = populated.sort((a, b) => b.highest - a.highest)[0];
  $("worst-location").textContent = worst ? worst.location : "--";

  $("location-report").innerHTML = locations.map(l => `
    <tr><td>${esc(l.location)}</td><td>${l.sensorCount}</td><td>${l.count}</td>
    <td>${l.highest ?? "--"}</td><td>${l.average ?? "--"}</td></tr>
  `).join("") || `<tr><td colspan="5" class="empty">No locations available.</td></tr>`;

  const days = {};
  readings.forEach(r => {
    const day = r.date.slice(0, 10);
    if (!days[day]) days[day] = [];
    days[day].push(r.aqi);
  });

  $("daily-report").innerHTML = Object.keys(days).sort().reverse().map(day => {
    const values = days[day];
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return `<tr><td>${esc(day)}</td><td>${values.length}</td><td>${avg.toFixed(1)}</td></tr>`;
  }).join("") || `<tr><td colspan="3" class="empty">No readings available.</td></tr>`;
}

function exportCSV() {
  const rows = [
    ["Reading ID", "Sensor", "Location", "Recorded At", "PM2.5", "PM10", "CO2 ppm", "AQI"],
    ...getFilteredReadings().map(r => [
      r.id, sensorName(r.sensorId),
      sensorById(r.sensorId)?.location || "",
      r.date, r.pm25, r.pm10, r.co2, r.aqi
    ])
  ];

  const csv = rows.map(row => row.map(value => {
    let s = String(value ?? "");
    // Prevent spreadsheet formula injection in exported text fields.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "airwatch-readings.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("CSV export created.");
}

$("export-csv").addEventListener("click", exportCSV);

function renderAll() {
  renderSensorOptions();
  renderDashboard();
  renderSensors();
  renderReadings();
  renderAlerts();
  renderReports();
}

renderAll();
