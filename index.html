
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#f4faf6">
  <title>AirMetric | Environmental Intelligence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>

  <!-- LOGIN: dashboard remains hidden until sign-in succeeds -->
  <section id="loginScreen" class="login-screen">
    <div class="login-art">
      <div class="art-orb orb-one"></div>
      <div class="art-orb orb-two"></div>

      <a href="#" class="brand brand-large">
        <span class="brand-mark">A</span><span>AirMetric</span>
      </a>

      <div class="login-message">
        <span class="eyebrow"><span class="live-dot"></span> ENVIRONMENTAL INTELLIGENCE</span>
        <h1>Measure today.<br><em>Protect tomorrow.</em></h1>
        <p>Monitor air quality, understand pollutant trends, and turn environmental data into better decisions.</p>
        <div class="login-highlights">
          <span>✳ Environmental monitoring</span>
          <span>⌁ Insightful reporting</span>
          <span>◉ Pollution alerts</span>
        </div>
      </div>

      <div class="login-art-footer">
        <span>ENVIRONMENTAL DATA PLATFORM</span>
        <span>BUILT FOR BETTER AIR</span>
      </div>
    </div>

    <div class="login-side">
      <div class="login-card">
        <div class="mobile-brand brand">
          <span class="brand-mark">A</span><span>AirMetric</span>
        </div>
        <span class="eyebrow">WELCOME BACK</span>
        <h2>Sign in to your workspace</h2>
        <p class="muted">Enter your account credentials to continue.</p>

        <form id="loginForm">
          <label for="loginRole">Account type</label>
          <select id="loginRole" required>
            <option value="user">Standard user</option>
            <option value="admin">Administrator</option>
          </select>

          <label for="email">Email address</label>
          <input id="email" type="email" placeholder="you@example.com" autocomplete="username" required>

          <label for="password">Password</label>
          <div class="password-wrap">
            <input id="password" type="password" placeholder="Enter your password" autocomplete="current-password" required>
            <button type="button" id="togglePassword" class="password-toggle">Show</button>
          </div>

          <p id="loginError" class="form-error" role="alert"></p>
          <button class="btn btn-primary login-submit" type="submit">
            Sign in <span>↗</span>
          </button>
        </form>

        <div class="login-note">
          <span>⌑</span>
          <p><strong>Protected workspace</strong><br>Your account will be verified by the authentication backend once connected.</p>
        </div>
        <p class="login-foot">AirMetric · Environmental Monitoring DBMS</p>
      </div>
    </div>
  </section>

  <!-- APPLICATION -->
  <div id="app" class="app-shell hidden">
    <aside id="sidebar" class="sidebar">
      <a href="#" class="brand sidebar-brand" data-page="overview">
        <span class="brand-mark">A</span><span>AirMetric</span>
      </a>

      <div class="workspace-label">WORKSPACE</div>
      <nav class="main-nav">
        <button class="nav-item active" data-page="overview"><span>◫</span> Overview</button>
        <button class="nav-item" data-page="readings"><span>⌁</span> Air readings</button>
        <button class="nav-item" data-page="stations"><span>⌖</span> Monitoring stations</button>
        <button class="nav-item" data-page="reports"><span>▤</span> Reports & analytics</button>
        <button class="nav-item" data-page="alerts">
          <span>♧</span> Pollution alerts <span id="alertBadge" class="nav-count">0</span>
        </button>

        <div class="workspace-label admin-label admin-only hidden">ADMINISTRATION</div>
        <button class="nav-item admin-only hidden" data-page="users"><span>♙</span> User management</button>
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-status">
          <span class="live-dot"></span>
          <div><strong>Workspace active</strong><small>Environmental monitoring</small></div>
        </div>
        <button id="themeToggle" class="theme-toggle"><span>☼</span> Switch appearance</button>
        <div class="profile-row">
          <div id="profileAvatar" class="avatar">U</div>
          <div class="profile-info">
            <strong id="profileName">AirMetric User</strong>
            <small id="profileRole">Standard user</small>
          </div>
          <button id="logoutBtn" class="icon-button" title="Sign out" aria-label="Sign out">⇥</button>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <button id="menuToggle" class="icon-button menu-toggle" aria-label="Open menu">☰</button>
          <div class="breadcrumb">Workspace <span>/</span> <strong id="breadcrumbPage">Overview</strong></div>
        </div>
        <div class="topbar-right">
          <span id="currentDate" class="date-label"></span>
          <div class="topbar-avatar">A</div>
        </div>
      </header>

      <!-- OVERVIEW -->
      <section id="page-overview" class="page-section active">
        <div class="page-heading">
          <div>
            <span class="eyebrow">ENVIRONMENTAL OVERVIEW</span>
            <h1>Air quality at a glance</h1>
            <p id="welcomeText" class="muted">Your environmental monitoring workspace.</p>
          </div>
          <button class="btn btn-primary admin-only hidden" data-action="add-reading">＋ Add reading</button>
        </div>

        <div class="hero-grid">
          <article class="aqi-card panel">
            <div class="card-topline">
              <div><span class="eyebrow">AVERAGE RECORDED AQI</span><h2>Air Quality Index</h2></div>
              <div class="metric-icon mint">⌁</div>
            </div>
            <div class="aqi-main">
              <div>
                <div id="aqiValue" class="aqi-number">—</div>
                <span id="aqiStatus" class="status-pill status-neutral">No data</span>
              </div>
              <div class="aqi-graphic">
                <div class="aqi-ring"><span>◌</span></div>
                <div class="ring-caption">AIR<br>QUALITY</div>
              </div>
            </div>
            <div class="meter"><span id="aqiMeter"></span></div>
            <div id="aqiDescription" class="card-footnote">No readings recorded yet</div>
          </article>

          <article class="metric-card panel">
            <div class="metric-card-head"><span>Latest PM2.5</span><span class="metric-icon blue">◌</span></div>
            <div class="metric-value"><strong id="pm25Value">—</strong><small>µg/m³</small></div>
            <p>Fine particulate matter</p><div class="metric-line"><span></span></div>
          </article>

          <article class="metric-card panel">
            <div class="metric-card-head"><span>Latest PM10</span><span class="metric-icon violet">◍</span></div>
            <div class="metric-value"><strong id="pm10Value">—</strong><small>µg/m³</small></div>
            <p>Coarse particulate matter</p><div class="metric-line blue-line"><span></span></div>
          </article>

          <article class="metric-card panel">
            <div class="metric-card-head"><span>Latest CO</span><span class="metric-icon amber">◎</span></div>
            <div class="metric-value"><strong id="coValue">—</strong><small>mg/m³</small></div>
            <p>Carbon monoxide</p><div class="metric-line violet-line"><span></span></div>
          </article>
        </div>

        <div class="section-title-row">
          <div><h2>Pollutant trends</h2><p>Measurements saved in this workspace</p></div>
          <select id="chartRange" class="compact-select">
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        <div class="dashboard-grid">
          <article class="panel chart-panel">
            <div class="panel-heading">
              <div><h3>Concentration over time</h3><p>PM2.5, PM10 and NO₂</p></div>
              <span class="subtle-tag">Recorded values</span>
            </div>
            <div class="chart-wrap"><canvas id="trendChart"></canvas></div>
            <div class="chart-legend">
              <span><i class="legend-dot mint-dot"></i>PM2.5</span>
              <span><i class="legend-dot blue-dot"></i>PM10</span>
              <span><i class="legend-dot violet-dot"></i>NO₂</span>
            </div>
          </article>

          <article class="panel distribution-panel">
            <div class="panel-heading"><div><h3>Reading distribution</h3><p>Records grouped by AQI status</p></div></div>
            <div id="distributionList" class="distribution-list"></div>
            <div class="distribution-note">Status is based on the AQI entered with each reading.</div>
          </article>
        </div>

        <div class="dashboard-grid lower-grid">
          <article class="panel table-panel">
            <div class="panel-heading">
              <div><h3>Recent readings</h3><p>Latest saved measurements</p></div>
              <button class="text-button" data-page="readings">View all ↗</button>
            </div>
            <div class="table-scroll">
              <table><thead><tr><th>Station / pollutant</th><th>Value</th><th>Status</th><th>Recorded</th></tr></thead><tbody id="recentReadingsBody"></tbody></table>
            </div>
          </article>

          <article class="panel stations-panel">
            <div class="panel-heading">
              <div><h3>Monitoring stations</h3><p>Monitored locations</p></div>
              <span class="station-count" id="stationCount">0</span>
            </div>
            <div id="stationPreview"></div>
            <button class="btn btn-secondary full-width" data-page="stations">Explore stations <span>→</span></button>
          </article>
        </div>
      </section>

      <!-- READINGS -->
      <section id="page-readings" class="page-section">
        <div class="page-heading">
          <div><span class="eyebrow">DATA MANAGEMENT</span><h1>Air readings</h1><p class="muted">Record, review, and maintain pollutant measurements.</p></div>
          <button class="btn btn-primary admin-only hidden" data-action="add-reading">＋ Add reading</button>
        </div>
        <div class="toolbar panel">
          <div class="search-wrap"><span>⌕</span><input id="readingSearch" type="search" placeholder="Search station, pollutant, or record..."></div>
          <select id="pollutantFilter">
            <option value="">All pollutants</option><option>PM2.5</option><option>PM10</option><option>CO</option><option>NO2</option><option>SO2</option><option>O3</option>
          </select>
          <select id="statusFilter">
            <option value="">All statuses</option><option>Good</option><option>Moderate</option><option>Poor</option><option>Unhealthy</option>
          </select>
          <button class="btn btn-secondary" id="exportReadings">↓ Export CSV</button>
        </div>
        <div class="panel table-panel">
          <div class="panel-heading"><div><h3>Measurement records</h3><p id="readingCount">0 records</p></div></div>
          <div class="table-scroll">
            <table><thead><tr><th>Record / station</th><th>Pollutant</th><th>Value</th><th>AQI</th><th>Status</th><th>Recorded at</th><th>Actions</th></tr></thead><tbody id="readingsBody"></tbody></table>
          </div>
          <div id="readingsEmpty" class="empty-state hidden">No readings match your filters.</div>
        </div>
      </section>

      <!-- STATIONS -->
      <section id="page-stations" class="page-section">
        <div class="page-heading">
          <div><span class="eyebrow">LOCATION NETWORK</span><h1>Monitoring stations</h1><p class="muted">Manage locations where environmental readings are recorded.</p></div>
          <button class="btn btn-primary admin-only hidden" data-action="add-station">＋ Add station</button>
        </div>
        <div class="station-summary-grid">
          <div class="panel summary-mini"><span class="metric-icon mint">⌖</span><div><strong id="stationTotal">0</strong><small>Total stations</small></div></div>
          <div class="panel summary-mini"><span class="metric-icon blue">⌁</span><div><strong id="activeStationTotal">0</strong><small>Active stations</small></div></div>
          <div class="panel summary-mini"><span class="metric-icon violet">▤</span><div><strong id="stationReadingsTotal">0</strong><small>Linked readings</small></div></div>
        </div>
        <div id="stationsGrid" class="stations-grid"></div>
      </section>

      <!-- REPORTS -->
      <section id="page-reports" class="page-section">
        <div class="page-heading">
          <div><span class="eyebrow">INSIGHTS & EXPORTS</span><h1>Reports & analytics</h1><p class="muted">Create, download, and manage your report history.</p></div>
          <button class="btn btn-primary" id="createReportBtn">＋ Create report</button>
        </div>
        <div class="report-kpis">
          <div class="panel report-kpi"><span class="metric-icon mint">▤</span><div><strong id="reportTotal">0</strong><small>Saved reports</small></div></div>
          <div class="panel report-kpi"><span class="metric-icon blue">⌁</span><div><strong id="reportReadingsTotal">0</strong><small>Readings available</small></div></div>
          <div class="panel report-kpi"><span class="metric-icon amber">♧</span><div><strong id="reportAlertTotal">0</strong><small>Active alerts</small></div></div>
        </div>
        <div class="panel table-panel">
          <div class="panel-heading">
            <div><h3>Report library</h3><p>Generated report records for this workspace</p></div>
            <button id="exportAllData" class="btn btn-secondary">↓ Export readings CSV</button>
          </div>
          <div class="table-scroll">
            <table><thead><tr><th>Report</th><th>Type</th><th>Period</th><th>Created</th><th>Records</th><th>Actions</th></tr></thead><tbody id="reportsBody"></tbody></table>
          </div>
          <div id="reportsEmpty" class="empty-state hidden">No reports created yet. Select “Create report” to add one.</div>
        </div>
        <div class="panel report-tip">
          <div class="tip-icon">✦</div>
          <div><h3>About your reports</h3><p>Each report stores a title, report type, date range, creation time, and snapshot count. Export readings to analyse them in spreadsheet software.</p></div>
        </div>
      </section>

      <!-- ALERTS -->
      <section id="page-alerts" class="page-section">
        <div class="page-heading">
          <div><span class="eyebrow">ENVIRONMENTAL WATCH</span><h1>Pollution alerts</h1><p class="muted">Create alerts, review pollution events, and resolve items.</p></div>
          <button class="btn btn-primary" id="createAlertBtn">＋ New alert</button>
        </div>
        <div class="alert-summary-grid">
          <div class="panel summary-mini"><span class="metric-icon amber">♧</span><div><strong id="activeAlertsTotal">0</strong><small>Active alerts</small></div></div>
          <div class="panel summary-mini"><span class="metric-icon mint">✓</span><div><strong id="resolvedAlertsTotal">0</strong><small>Resolved alerts</small></div></div>
          <div class="panel summary-mini"><span class="metric-icon violet">⌁</span><div><strong id="highAlertsTotal">0</strong><small>High priority active</small></div></div>
        </div>
        <div class="toolbar panel">
          <div class="search-wrap"><span>⌕</span><input id="alertSearch" type="search" placeholder="Search alert or station..."></div>
          <select id="alertStatusFilter"><option value="">All statuses</option><option value="Active">Active</option><option value="Resolved">Resolved</option></select>
          <select id="alertPriorityFilter"><option value="">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
        </div>
        <div id="alertsList" class="alerts-list"></div>
      </section>

      <!-- USERS -->
      <section id="page-users" class="page-section">
        <div class="page-heading">
          <div><span class="eyebrow">ACCESS CONTROL</span><h1>User management</h1><p class="muted">Manage preview accounts in this browser. Secure account controls come with the backend.</p></div>
          <button id="addUserBtn" class="btn btn-primary">＋ Add user</button>
        </div>
        <div class="panel table-panel">
          <div class="panel-heading"><div><h3>Workspace accounts</h3><p>Accounts stored in this browser preview</p></div></div>
          <div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody id="usersBody"></tbody></table></div>
        </div>
      </section>

      <footer class="app-footer">
        <span>© <span id="year"></span> AirMetric</span>
        <span>Environmental Monitoring · Frontend preview</span>
      </footer>
    </main>
  </div>

  <!-- REUSABLE MODAL -->
  <div id="modalBackdrop" class="modal-backdrop hidden">
    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-header">
        <div><span class="eyebrow">AIRMETRIC WORKSPACE</span><h2 id="modalTitle">Create record</h2></div>
        <button id="closeModal" class="icon-button" aria-label="Close dialog">×</button>
      </div>
      <form id="modalForm">
        <div id="modalFields" class="modal-fields"></div>
        <p id="modalError" class="form-error"></p>
        <div class="modal-actions">
          <button type="button" id="cancelModal" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveModal">Save record <span>↗</span></button>
        </div>
      </form>
    </div>
  </div>

  <div id="toastRegion" class="toast-region" aria-live="polite"></div>
  <script src="script.js"></script>
</body>
</html>
