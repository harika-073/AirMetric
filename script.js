/* ============ CONFIG ============
   DEMO = true  -> uses in-browser sample data (preview only, NOT MySQL)
   DEMO = false -> calls your PHP backend (api/*.php) which talks to MySQL
================================== */
const DEMO = true, API_BASE = 'api';
const $ = (s, e = document) => e.querySelector(s);
const cat = a => a <= 50 ? ['Good', 'g'] : a <= 100 ? ['Moderate', 'y'] : a <= 150 ? ['Unhealthy (Sensitive)', 'o'] : ['Unhealthy', 'r'];
const badge = a => `<span class="pill ${cat(a)[1]}">${a} · ${cat(a)[0]}</span>`;
const fmt = d => d.toISOString().slice(0, 16).replace('T', ' ');
const ALERT_AQI = 150; // threshold (backend reads this from config)

/* ---------- demo "database" (illustrative data) ---------- */
const db = { users: [{ u: 'admin', p: 'Admin@123', role: 'admin' }, { u: 'user', p: 'User@123', role: 'user' }], sensors: [], readings: [], alerts: [], id: { sensors: 1, readings: 1, alerts: 1 } };
(function seed() {
  const names = [['Central Park', 12.97, 77.59], ['Industrial Zone', 13.01, 77.55], ['Railway Station', 12.99, 77.57], ['University Campus', 12.93, 77.61], ['Riverside', 12.95, 77.52]];
  names.forEach((n, i) => db.sensors.push({ sensor_id: db.id.sensors++, sensor_name: 'AW-' + (100 + i), location: n[0], latitude: n[1], longitude: n[2], status: i === 4 ? 'inactive' : 'active' }));
  let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  db.sensors.forEach((x, i) => { for (let d = 13; d >= 0; d--) { const t = new Date(Date.now() - d * 864e5); const pm25 = Math.round(20 + i * 18 + rnd() * 40); addReading({ sensor_id: x.sensor_id, recorded_at: fmt(t), pm25, pm10: Math.round(pm25 * 1.6), co2: Math.round(400 + rnd() * 300), aqi: Math.round(pm25 * 1.9) }); } });
})();
function addReading(b) {
  const r = { reading_id: db.id.readings++, ...b };
  db.readings.push(r);
  if (r.aqi > ALERT_AQI) db.alerts.push({ alert_id: db.id.alerts++, reading_id: r.reading_id, sensor_id: r.sensor_id, level: r.aqi > 200 ? 'critical' : 'warning', message: `AQI ${r.aqi} exceeded threshold ${ALERT_AQI}`, status: 'open', created_at: r.recorded_at });
}
function demo(m, res, id, body) {
  const key = { sensors: 'sensor_id', readings: 'reading_id', alerts: 'alert_id' }[res], t = db[res];
  const sName = i => (db.sensors.find(s => s.sensor_id == i) || {}).sensor_name;
  if (res === 'auth') {
    if (body.action === 'register') { if (db.users.find(u => u.u === body.username)) throw Error('Username already taken'); db.users.push({ u: body.username, e: body.email, p: body.password, role: 'user' }); return { ok: 1 }; }
    const u = db.users.find(u => (u.u === body.username || u.e === body.username) && u.p === body.password && u.role === body.role);
    if (!u) throw Error('Invalid username, password or role'); return { username: u.u, role: u.role };
  }
  if (res === 'reports') {
    const rs = db.readings.map(r => ({ ...r, loc: db.sensors.find(s => s.sensor_id == r.sensor_id).location }));
    const grp = (f) => rs.reduce((o, r) => ((o[f(r)] = o[f(r)] || []).push(r), o), {}), avg = (a, k) => Math.round(a.reduce((s, r) => s + r[k], 0) / a.length);
    return {
      maxByLocation: Object.entries(grp(r => r.loc)).map(([location, a]) => ({ location, max_aqi: Math.max(...a.map(r => r.aqi)) })).sort((a, b) => b.max_aqi - a.max_aqi),
      dailyAvg: Object.entries(grp(r => r.recorded_at.slice(0, 10))).map(([day, a]) => ({ day, avg_aqi: avg(a, 'aqi') })).sort((a, b) => b.day.localeCompare(a.day)),
      bySensor: db.sensors.map(s => { const a = rs.filter(r => r.sensor_id == s.sensor_id); return { sensor_name: s.sensor_name, readings: a.length, avg_pm25: avg(a, 'pm25'), avg_pm10: avg(a, 'pm10'), avg_co2: avg(a, 'co2'), avg_aqi: avg(a, 'aqi') } })
    };
  }
  if (m === 'GET') return t.map(x => ({ ...x, sensor_name: sName(x.sensor_id) }));
  if (m === 'POST') { if (res === 'readings') addReading(body); else t.push({ [key]: db.id[res]++, ...body }); return { ok: 1 }; }
  if (m === 'PUT') { Object.assign(t.find(x => x[key] == id), body); return { ok: 1 }; }
  if (m === 'DELETE') { db[res] = t.filter(x => x[key] != id); if (res === 'sensors') { db.readings = db.readings.filter(r => r.sensor_id != id); db.alerts = db.alerts.filter(a => a.sensor_id != id) } return { ok: 1 }; }
}
async function api(m, res, id, body) {
  if (DEMO) return demo(m, res, id, body);
  const r = await fetch(`${API_BASE}/${res}.php${id ? '?id=' + id : ''}`, { method: m, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json(); if (!r.ok) throw Error(j.error || 'Request failed'); return j;
}

/* ---------- state + helpers ---------- */
let S = { user: null, sensors: [], readings: [], alerts: [] }, charts = [];
const admin = () => S.user && S.user.role === 'admin';
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200) };
async function load() { [S.sensors, S.readings, S.alerts] = await Promise.all(['sensors', 'readings', 'alerts'].map(r => api('GET', r))); S.readings.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)) }
const table = (id, heads, rows) => `<div class="card wrap"><table id="${id}"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${heads.length}" class="mut">No records</td></tr>`}</tbody></table></div>`;
window.filt = id => { const q = ($('#q')?.value || '').toLowerCase(), s = $('#sf')?.value || ''; document.querySelectorAll(`#${id} tbody tr`).forEach(r => r.hidden = !(r.textContent.toLowerCase().includes(q) && (!s || r.dataset.s === s))) };
const acts = (res, id) => admin() ? `<td><button class="btn sm" onclick="edit('${res}',${id})">Edit</button> <button class="btn sm red" onclick="del('${res}',${id})">Delete</button></td>` : '';

/* ---------- generic add/edit modal ---------- */
const F = {
  sensors: () => [['sensor_name', 'Sensor name'], ['location', 'Location'], ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number'], ['status', 'Status', 'select', ['active', 'inactive', 'maintenance']]],
  readings: () => [['sensor_id', 'Sensor', 'select', S.sensors.map(s => [s.sensor_id, s.sensor_name + ' – ' + s.location])], ['recorded_at', 'Recorded at (YYYY-MM-DD HH:MM)'], ['pm25', 'PM2.5 (µg/m³)', 'number'], ['pm10', 'PM10 (µg/m³)', 'number'], ['co2', 'CO₂ (ppm)', 'number'], ['aqi', 'AQI', 'number']]
};
window.edit = (res, id) => {
  const row = id ? S[res].find(x => x[res === 'sensors' ? 'sensor_id' : 'reading_id'] == id) : (res === 'readings' ? { recorded_at: fmt(new Date()) } : {});
  $('#mt').textContent = (id ? 'Edit ' : 'Add ') + res.slice(0, -1);
  $('#mf').innerHTML = F[res]().map(([n, l, t, o]) => `<label>${l}${t === 'select' ? `<select name="${n}">${o.map(x => { const [v, tx] = Array.isArray(x) ? x : [x, x]; return `<option value="${v}" ${row[n] == v ? 'selected' : ''}>${tx}</option>` }).join('')}</select>` : `<input name="${n}" type="${t || 'text'}" step="any" value="${row[n] ?? ''}" required>`}</label>`).join('') + '<button class="btn">Save</button> <button type="button" class="btn ghost" onclick="$(\'#modal\').hidden=true" style="margin-top:8px">Cancel</button>';
  $('#mf').onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); F[res]().forEach(([n, , t]) => { if (t === 'number') b[n] = +b[n] }); b.sensor_id && (b.sensor_id = +b.sensor_id);
    try { await api(id ? 'PUT' : 'POST', res, id, b); $('#modal').hidden = true; toast('Saved'); go(cur) } catch (x) { toast(x.message) } };
  $('#modal').hidden = false;
};
window.del = async (res, id) => { if (!confirm('Delete this record?')) return; try { await api('DELETE', res, id); toast('Deleted'); go(cur) } catch (x) { toast(x.message) } };
window.resolve = async id => { await api('PUT', 'alerts', id, { status: 'resolved' }); go(cur) };

/* ---------- views ---------- */
const V = {};
V.dashboard = () => {
  const latest = S.readings[0], open = S.alerts.filter(a => a.status === 'open').length;
  const lastBy = S.sensors.map(s => S.readings.find(r => r.sensor_id == s.sensor_id)).filter(Boolean);
  return `<div class="grid">
   <div class="card stat"><span>Total sensors</span><b>${S.sensors.length}</b></div>
   <div class="card stat"><span>Active sensors</span><b style="color:var(--g)">${S.sensors.filter(s => s.status === 'active').length}</b></div>
   <div class="card stat"><span>Latest AQI</span><b>${latest ? badge(latest.aqi) : '—'}</b></div>
   <div class="card stat"><span>Open alerts</span><b style="color:var(--r)">${open}</b></div>
   <div class="card stat"><span>Total alerts</span><b>${S.alerts.length}</b></div></div>
   <h3>Latest reading per sensor</h3>${table('t0', ['Sensor', 'Location', 'Time', 'PM2.5', 'PM10', 'CO₂', 'AQI'], lastBy.map(r => `<tr><td>${r.sensor_name}</td><td>${S.sensors.find(s => s.sensor_id == r.sensor_id).location}</td><td>${r.recorded_at}</td><td>${r.pm25}</td><td>${r.pm10}</td><td>${r.co2}</td><td>${badge(r.aqi)}</td></tr>`).join(''))}`;
};
V.sensors = () => `<div class="bar"><input id="q" placeholder="Search sensors…" oninput="filt('t1')"><select id="sf" onchange="filt('t1')"><option value="">All status</option><option>active</option><option>inactive</option><option>maintenance</option></select>${admin() ? '<button class="btn" onclick="edit(\'sensors\')">+ Add sensor</button>' : ''}</div>` +
  table('t1', ['ID', 'Name', 'Location', 'Lat', 'Long', 'Status', admin() ? 'Actions' : ''], S.sensors.map(s => `<tr data-s="${s.status}"><td>${s.sensor_id}</td><td>${s.sensor_name}</td><td>${s.location}</td><td>${s.latitude}</td><td>${s.longitude}</td><td><span class="pill ${s.status === 'active' ? 'g' : s.status === 'inactive' ? 'r' : 'y'}">${s.status}</span></td>${acts('sensors', s.sensor_id)}</tr>`).join(''));
V.readings = () => `<div class="bar"><input id="q" placeholder="Search…" oninput="rfilt()"><select id="sf" onchange="rfilt()"><option value="">All sensors</option>${S.sensors.map(s => `<option>${s.sensor_name}</option>`).join('')}</select><input type="date" id="d1" onchange="rfilt()" title="From"><input type="date" id="d2" onchange="rfilt()" title="To">${admin() ? '<button class="btn" onclick="edit(\'readings\')">+ Add reading</button>' : ''}</div>` +
  table('t2', ['ID', 'Sensor', 'Recorded at', 'PM2.5', 'PM10', 'CO₂', 'AQI', admin() ? 'Actions' : ''], S.readings.map(r => `<tr data-s="${r.sensor_name}" data-d="${r.recorded_at.slice(0, 10)}"><td>${r.reading_id}</td><td>${r.sensor_name}</td><td>${r.recorded_at}</td><td>${r.pm25}</td><td>${r.pm10}</td><td>${r.co2}</td><td>${badge(r.aqi)}</td>${acts('readings', r.reading_id)}</tr>`).join(''));
window.rfilt = () => { const q = $('#q').value.toLowerCase(), s = $('#sf').value, a = $('#d1').value, b = $('#d2').value; document.querySelectorAll('#t2 tbody tr').forEach(r => { const d = r.dataset.d; r.hidden = !(r.textContent.toLowerCase().includes(q) && (!s || r.dataset.s === s) && (!a || d >= a) && (!b || d <= b)) }) };
V.charts = () => `<div class="bar"><select id="cs" onchange="drawCharts()"><option value="">All sensors (daily average)</option>${S.sensors.map(s => `<option value="${s.sensor_id}">${s.sensor_name} – ${s.location}</option>`).join('')}</select></div>
  <div class="two"><div class="card"><h3>AQI trend</h3><canvas id="c1"></canvas></div><div class="card"><h3>Pollutant comparison by sensor</h3><canvas id="c2"></canvas></div></div>`;
window.drawCharts = () => {
  charts.forEach(c => c.destroy()); charts = []; const cs = getComputedStyle(document.documentElement); Chart.defaults.color = cs.getPropertyValue('--mut').trim(); Chart.defaults.borderColor = cs.getPropertyValue('--line').trim();
  const sid = $('#cs').value, rs = S.readings.filter(r => !sid || r.sensor_id == sid).slice().reverse(), byDay = {};
  rs.forEach(r => (byDay[r.recorded_at.slice(0, 10)] = byDay[r.recorded_at.slice(0, 10)] || []).push(r.aqi));
  const labels = Object.keys(byDay), data = labels.map(d => Math.round(byDay[d].reduce((a, b) => a + b) / byDay[d].length));
  charts.push(new Chart($('#c1'), { type: 'line', data: { labels, datasets: [{ label: 'AQI', data, borderColor: '#3b82f6', backgroundColor: '#3b82f633', fill: true, tension: .3, pointBackgroundColor: data.map(v => ({ g: '#22c55e', y: '#eab308', o: '#f97316', r: '#ef4444' })[cat(v)[1]]) }] } }));
  const avg = (k, s) => { const a = S.readings.filter(r => r.sensor_id == s.sensor_id); return a.length ? Math.round(a.reduce((x, r) => x + r[k], 0) / a.length) : 0 };
  charts.push(new Chart($('#c2'), { type: 'bar', data: { labels: S.sensors.map(s => s.sensor_name), datasets: [{ label: 'PM2.5', data: S.sensors.map(s => avg('pm25', s)), backgroundColor: '#ef4444' }, { label: 'PM10', data: S.sensors.map(s => avg('pm10', s)), backgroundColor: '#f97316' }, { label: 'CO₂ (ppm, right axis)', data: S.sensors.map(s => avg('co2', s)), backgroundColor: '#22c55e', yAxisID: 'y1' }] }, options: { scales: { y1: { position: 'right', grid: { drawOnChartArea: false } } } } }));
};
V.reports = async () => {
  const r = await api('GET', 'reports');
  return `<div class="two"><div><h3>Highest AQI by location</h3>${table('r1', ['Location', 'Max AQI'], r.maxByLocation.map(x => `<tr><td>${x.location}</td><td>${badge(x.max_aqi)}</td></tr>`).join(''))}</div>
  <div><h3>Daily average AQI</h3>${table('r2', ['Day', 'Avg AQI'], r.dailyAvg.slice(0, 10).map(x => `<tr><td>${x.day}</td><td>${badge(x.avg_aqi)}</td></tr>`).join(''))}</div></div>
  <h3>Sensor-wise readings</h3>${table('r3', ['Sensor', 'Readings', 'Avg PM2.5', 'Avg PM10', 'Avg CO₂', 'Avg AQI'], r.bySensor.map(x => `<tr><td>${x.sensor_name}</td><td>${x.readings}</td><td>${x.avg_pm25}</td><td>${x.avg_pm10}</td><td>${x.avg_co2}</td><td>${badge(x.avg_aqi)}</td></tr>`).join(''))}`;
};
V.alerts = () => table('t4', ['ID', 'Sensor', 'Level', 'Message', 'Time', 'Status', admin() ? 'Action' : ''], S.alerts.slice().reverse().map(a => `<tr><td>${a.alert_id}</td><td>${S.sensors.find(s => s.sensor_id == a.sensor_id)?.sensor_name}</td><td><span class="pill ${a.level === 'critical' ? 'r' : 'o'}">${a.level}</span></td><td>${a.message}</td><td>${a.created_at}</td><td>${a.status}</td>${admin() ? `<td>${a.status === 'open' ? `<button class="btn sm" onclick="resolve(${a.alert_id})">Resolve</button>` : '✔'}</td>` : ''}</tr>`).join(''));
V.docs = () => `<div class="card"><h3>ER diagram (preview)</h3><div class="er">
  <div><b>users</b><br>🔑 user_id<br>username, email, password_hash, role, created_at</div>
  <div><b>sensors</b><br>🔑 sensor_id<br>sensor_name, location, latitude, longitude, status</div>
  <div><b>readings</b><br>🔑 reading_id<br>🔗 sensor_id → sensors<br>recorded_at, pm25, pm10, co2, aqi</div>
  <div><b>alerts</b><br>🔑 alert_id<br>🔗 reading_id → readings<br>🔗 sensor_id → sensors<br>level, message, status, created_at</div></div>
  <p class="mut" style="margin-top:12px">sensors 1 — N readings · readings 1 — 0..1 alerts · sensors 1 — N alerts. Functional dependencies, 3NF, SQL and transaction notes will be added once the backend and db.sql are done.</p></div>`;
const TITLES = { dashboard: 'Dashboard', sensors: 'Sensors', readings: 'Historical Readings', charts: 'Charts', reports: 'Reports', alerts: 'Pollution Alerts', docs: 'Project Documentation' };

/* ---------- router ---------- */
let cur = 'dashboard';
async function go(v) {
  cur = v; try { await load() } catch (x) { return toast(x.message) }
  charts.forEach(c => c.destroy()); charts = [];
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#title').textContent = TITLES[v]; $('#view').innerHTML = await V[v](); if (v === 'charts') drawCharts();
  $('#side').classList.remove('open');
}
document.querySelectorAll('.nav a').forEach(a => a.onclick = () => go(a.dataset.v));
$('#burger').onclick = () => $('#side').classList.toggle('open');

/* ---------- auth ---------- */
let role = 'user', reg = false;
function authUI() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.r === role));
  $('#lf').hidden = reg; $('#rf').hidden = !reg; $('#lbt').textContent = 'Login as ' + role; $('#err').textContent = '';
  $('#sw').innerHTML = role === 'admin' ? 'Admin accounts are created by the system owner.' : reg ? 'Have an account? <a id="tg">Login</a>' : 'New here? <a id="tg">Register</a>';
  const t = $('#tg'); if (t) t.onclick = () => { reg = !reg; authUI() };
  $('#hint').textContent = DEMO ? 'Demo preview only (not MySQL): ' + (role === 'admin' ? 'admin / Admin@123' : 'user / User@123') : '';
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { role = b.dataset.r; reg = false; authUI() });
$('#lf').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { S.user = await api('POST', 'auth', null, { action: 'login', role, username: f.get('u'), password: f.get('p') }); try { sessionStorage.setItem('aw', JSON.stringify(S.user)); $('#rm').checked ? localStorage.setItem('awu', f.get('u')) : localStorage.removeItem('awu') } catch { } start() } catch (x) { $('#err').textContent = x.message } };
$('#rf').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await api('POST', 'auth', null, { action: 'register', username: f.get('u'), email: f.get('e'), password: f.get('p') }); reg = false; authUI(); toast('Registered! Please login.') } catch (x) { $('#err').textContent = x.message } };
$('#logout').onclick = async () => { try { sessionStorage.removeItem('aw'); if (!DEMO) await api('POST', 'auth', null, { action: 'logout' }) } catch { } location.reload() };
function start() { $('#auth').hidden = true; $('#app').hidden = false; $('#who').textContent = S.user.username + ' · ' + S.user.role; $('#who').className = 'pill ' + (admin() ? 'o' : 'g'); go('dashboard') }
authUI(); try { const u = sessionStorage.getItem('aw'); if (u) { S.user = JSON.parse(u); start() } } catch { }

/* ---------- theme toggle, password eye, remember me, forgot password ---------- */
function theme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('awt', t) } catch { } document.querySelectorAll('.moon').forEach(b => b.textContent = t === 'dark' ? '☀️' : '🌙'); if ($('#c1')) drawCharts() }
document.querySelectorAll('.moon').forEach(b => b.onclick = () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
let saved = 'light'; try { saved = localStorage.getItem('awt') || 'light' } catch { } theme(saved);
$('#eye').onclick = () => { const p = $('#pw'); p.type = p.type === 'password' ? 'text' : 'password' };
$('#fp').onclick = () => toast('Ask your admin to reset your password (email reset comes with the backend)');
try { const v = localStorage.getItem('awu'); if (v) $('#lf [name=u]').value = v } catch { }
