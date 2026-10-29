
(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const STORE = "airmetric_frontend_v1";
  const USERS = "airmetric_demo_accounts_v1";
  let role = "user", authMode = "signin", currentUser = null, currentView = "overview";
  let chart = null, toastTimer = null;

  const seed = {
    stations: [
      {id:"ST-101",name:"Banjara Hills",city:"Hyderabad",aqi:42,pm25:12,pm10:24,co:0.4,no2:11,so2:5,o3:28,status:"Active",updated:"10 min ago"},
      {id:"ST-102",name:"HITEC City",city:"Hyderabad",aqi:58,pm25:18,pm10:37,co:0.6,no2:17,so2:7,o3:34,status:"Active",updated:"18 min ago"},
      {id:"ST-103",name:"Secunderabad",city:"Hyderabad",aqi:76,pm25:25,pm10:48,co:0.8,no2:23,so2:9,o3:41,status:"Active",updated:"26 min ago"},
      {id:"ST-104",name:"Gachibowli",city:"Hyderabad",aqi:35,pm25:9,pm10:19,co:0.3,no2:8,so2:4,o3:22,status:"Active",updated:"8 min ago"},
      {id:"ST-105",name:"Kukatpally",city:"Hyderabad",aqi:91,pm25:32,pm10:58,co:1.1,no2:29,so2:12,o3:47,status:"Maintenance",updated:"1 hr ago"}
    ],
    alerts: [
      {id:"AL-01",title:"Moderate air quality in Secunderabad",description:"AQI is 76. Sensitive individuals may wish to reduce prolonged outdoor exertion.",severity:"Moderate",time:"Today · 10:42 AM",resolved:false},
      {id:"AL-02",title:"Station maintenance scheduled",description:"Kukatpally monitoring station is marked for maintenance. Its latest reading may be older.",severity:"Notice",time:"Today · 9:15 AM",resolved:false},
      {id:"AL-03",title:"Cleaner readings in Gachibowli",description:"The illustrative AQI reading is currently in the Good range.",severity:"Good",time:"Today · 8:30 AM",resolved:false}
    ],
    readings: []
  };

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && Array.isArray(saved.stations)) return saved;
    } catch (_) {}
    seed.readings = Array.from({length:14}, (_,i) => ({
      date: new Date(Date.now()-(13-i)*86400000).toLocaleDateString("en-IN",{day:"numeric",month:"short"}),
      aqi: [48,45,53,41,38,44,51,47,56,49,43,46,39,42][i]
    }));
    localStorage.setItem(STORE, JSON.stringify(seed));
    return JSON.parse(JSON.stringify(seed));
  }
  let db = loadData();
  function saveData(){ localStorage.setItem(STORE,JSON.stringify(db)); }
  function esc(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function toast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2700);}
  function avgAQI(){return db.stations.length?Math.round(db.stations.reduce((s,x)=>s+Number(x.aqi||0),0)/db.stations.length):0;}
  function category(aqi){if(aqi<=50)return ["Good","good"];if(aqi<=100)return ["Moderate","moderate"];if(aqi<=150)return ["Unhealthy for sensitive groups","moderate"];if(aqi<=200)return ["Unhealthy","unhealthy"];if(aqi<=300)return ["Very unhealthy","unhealthy"];return ["Hazardous","unhealthy"];}
  function categoryText(aqi){return category(aqi)[0];}
  function iconFor(view){return ({overview:"Overview",stations:"Monitoring stations",trends:"Trends & history",alerts:"Air alerts",guide:"Pollutant guide",manage:"Manage records",people:"User directory"})[view]||"Overview";}

  // Frontend-only role selector and local demo account handling.
  $$(".role-tab").forEach(b=>b.addEventListener("click",()=>{
    role=b.dataset.role;
    $$(".role-tab").forEach(x=>x.classList.toggle("selected",x===b));
    $("#auth-note").textContent=role==="admin"?"Demo admin mode. This is not a protected administrator account.":"Demo mode: accounts are stored only in this browser.";
    $("#auth-submit").innerHTML=authMode==="signup"?"Create demo account <span>↗</span>":"Sign in <span>↗</span>";
  }));
  function setAuthMode(mode){
    authMode=mode;const signup=mode==="signup";
    $("#signin-tab").classList.toggle("active",!signup);$("#signup-tab").classList.toggle("active",signup);
    $("#name-wrap").classList.toggle("hidden",!signup);$("#full-name").required=signup;
    $("#auth-title").textContent=signup?"Create your AirMetric account.":"A clearer view starts here.";
    $("#auth-description").textContent=signup?"Set up your local demo profile to get started.":"Sign in to explore your air-quality dashboard.";
    $("#auth-submit").innerHTML=signup?"Create demo account <span>↗</span>":"Sign in <span>↗</span>";
    $("#auth-bottom-copy").innerHTML=signup?'Already have an account? <button id="inline-signin" type="button">Sign in</button>':'New to AirMetric? <button id="inline-signup" type="button">Create an account</button>';
    $("#inline-signup")?.addEventListener("click",()=>setAuthMode("signup"));
    $("#inline-signin")?.addEventListener("click",()=>setAuthMode("signin"));
  }
  $("#signin-tab").addEventListener("click",()=>setAuthMode("signin"));
  $("#signup-tab").addEventListener("click",()=>setAuthMode("signup"));
  $("#inline-signup").addEventListener("click",()=>setAuthMode("signup"));
  $("#toggle-password").addEventListener("click",()=>{const p=$("#password");p.type=p.type==="password"?"text":"password";$("#toggle-password").textContent=p.type==="password"?"Show":"Hide";});

  $("#auth-form").addEventListener("submit",e=>{
    e.preventDefault();
    const email=$("#email").value.trim().toLowerCase(),password=$("#password").value,name=$("#full-name").value.trim();
    if(!email||password.length<4){toast("Enter a valid email and a password with at least 4 characters.");return;}
    let accounts=[];try{accounts=JSON.parse(localStorage.getItem(USERS)||"[]");}catch(_){}
    if(authMode==="signup"){
      if(!name){toast("Please enter your name.");return;}
      if(accounts.some(a=>a.email===email&&a.role===role)){toast("A demo account already exists for this role.");return;}
      accounts.push({email,password,name,role,created:new Date().toISOString()});
      localStorage.setItem(USERS,JSON.stringify(accounts));
      toast("Demo profile created.");
    } else if(accounts.length && accounts.some(a=>a.email===email&&a.role===role)){
      const account=accounts.find(a=>a.email===email&&a.role===role);
      if(account.password!==password){toast("Password does not match this local demo account.");return;}
    }
    const saved=accounts.find(a=>a.email===email&&a.role===role);
    currentUser={email,name:saved?.name||name||email.split("@")[0],role};
    sessionStorage.setItem("airmetric_demo_session",JSON.stringify(currentUser));
    enterApp();
  });

  function enterApp(){
    $("#auth-screen").classList.add("hidden");$("#app").classList.remove("hidden");
    $("#profile-name").textContent=currentUser.name;$("#profile-role").textContent=currentUser.role+" demo account";
    $("#avatar").textContent=(currentUser.name[0]||"A").toUpperCase();
    $$(".admin-only").forEach(el=>el.classList.toggle("hidden",currentUser.role!=="admin"));
    $("#today-date").textContent=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
    render(currentView="overview");
  }
  $("#logout").addEventListener("click",()=>{currentUser=null;sessionStorage.removeItem("airmetric_demo_session");$("#app").classList.add("hidden");$("#auth-screen").classList.remove("hidden");$("#password").value="";setAuthMode("signin");toast("Signed out of the demo.");});
  try{const s=JSON.parse(sessionStorage.getItem("airmetric_demo_session"));if(s&&s.role){currentUser=s;enterApp();}}catch(_){}

  $("#navigation").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)goView(b.dataset.view);});
  document.addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b&&!b.closest("#navigation"))goView(b.dataset.view);});
  function goView(view){if(["manage","people"].includes(view)&&currentUser?.role!=="admin"){toast("Admin demo role required.");return;}currentView=view;$$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("#page-title").textContent=iconFor(view);$("#sidebar").classList.remove("open");render(view);}
  $("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#refresh").addEventListener("click",()=>{db=loadData();render(currentView);toast("Demo dashboard refreshed.");});

  function heading(title,desc,actions=""){return `<div class="page-heading"><div><span class="eyebrow">${currentUser?.role==="admin"?"ADMIN WORKSPACE":"AIR QUALITY OVERVIEW"}</span><h1>${title}</h1><p>${desc}</p></div><div class="heading-actions">${actions}</div></div>`;}
  function btn(label,action,cls="primary"){return `<button class="btn ${cls}" data-action="${action}" type="button">${label}</button>`;}
  function metric(label,value,unit,foot,icon,trend="↗"){
    return `<article class="card metric-card"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}<small> ${unit||""}</small></div><div class="metric-foot"><span class="trend-up">${trend}</span>${foot}</div></article>`;
  }
  function chartCard(title,subtitle,canvasId,select=false){return `<article class="card"><div class="card-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${select?'<select id="trend-range" class="chart-select"><option value="7">7 days</option><option value="14" selected>14 days</option></select>':'<span class="pill">● Illustrative</span>'}</div><div class="chart-wrap"><canvas id="${canvasId}"></canvas></div></article>`;}
  function stationRows(limit=4){return db.stations.slice(0,limit).map(s=>`<div class="station-row"><span class="station-pin">⌖</span><div class="station-info"><b>${esc(s.name)}</b><span>${esc(s.city)} · ${esc(s.updated||"Recently updated")}</span></div><div class="station-reading"><b>${s.aqi}</b><span class="status-badge ${category(s.aqi)[1]}">${categoryText(s.aqi)}</span></div></div>`).join("")||'<div class="empty-state">No stations yet.</div>';}
  function alertsList(limit=3){return db.alerts.filter(a=>!a.resolved).slice(0,limit).map(a=>`<div class="alert-item"><span class="alert-symbol ${a.severity==="Good"?"good":""}">${a.severity==="Good"?"✓":"!"}</span><div class="alert-text"><b>${esc(a.title)}</b><p>${esc(a.description)}</p><time>${esc(a.time)}</time></div></div>`).join("")||'<div class="empty-state">No active alerts. You’re all caught up.</div>';}
  function pollutantCards(s){
    const vals=[["PM2.5",s.pm25,"µg/m³",35],["PM10",s.pm10,"µg/m³",100],["CO",s.co,"mg/m³",4],["NO₂",s.no2,"ppb",53],["SO₂",s.so2,"ppb",35],["O₃",s.o3,"ppb",70]];
    return vals.map(([n,v,u,max])=>`<article class="card pollutant-card"><div class="pollutant-head"><span class="pollutant-code">${n}</span><span class="pollutant-unit">${u}</span></div><div class="pollutant-value">${v??"—"} <span class="pollutant-unit">${u}</span></div><div class="pollutant-status">${Number(v)<=max?"Within illustrative target":"Elevated reading"}</div><div class="mini-bar"><span style="width:${Math.min(100,Number(v||0)/max*100)}%"></span></div></article>`).join("");
  }
  function renderOverview(){
    const avg=avgAQI(),good=db.stations.filter(s=>s.aqi<=50).length,active=db.stations.filter(s=>s.status==="Active").length;
    const mainStation=[...db.stations].sort((a,b)=>a.aqi-b.aqi)[0]||{aqi:0};
    $("#content").innerHTML=heading(currentUser?.role==="admin"?"Good afternoon, Admin.":"Good to see you again.",currentUser?.role==="admin"?"Your monitoring workspace at a glance. Manage station records and keep the dataset up to date.":"Here’s a clearer picture of the air around your monitored locations.",currentUser?.role==="admin"?btn("+ Add station","add-station"):'<span class="pill">◉ Frontend preview</span>')+
      `<div class="grid metric-grid">${metric("Average AQI",avg,"AQI","Across monitored stations","◉")}${metric("Monitoring stations",db.stations.length,"stations","Locations in this workspace","⌖")}${metric("Good air locations",good,"of "+db.stations.length,"AQI at or below 50","✳")}${metric("Active stations",active,"online","Illustrative station status","⌁")}</div>
      <div class="grid aqi-layout">
        ${chartCard("Air quality over time","A 14-day view of the average air quality index.","aqi-chart")}
        <article class="card"><div class="card-head"><div><h2>Current air quality</h2><p>Average across your demo stations</p></div><span class="pill">● Sample</span></div><div class="aqi-score"><div class="aqi-ring" style="background:conic-gradient(var(--accent) ${Math.min(100,avg/300*100)}%,#e6f2ef 0)"><div><b>${avg}</b><span>US AQI</span></div></div><div class="aqi-summary"><h3>${categoryText(avg)}</h3><p>${avg<=50?"Air quality looks good in this illustrative dataset.":avg<=100?"Sensitive individuals may wish to reduce prolonged outdoor exertion.":"Consider checking official local guidance before outdoor activity."}</p></div></div><div class="scale"><span style="background:#52b788"></span><span style="background:#f2c14e"></span><span style="background:#ed9654"></span><span style="background:#d96c6c"></span><span style="background:#956ab4"></span><span style="background:#7e4358"></span></div><div class="scale-labels"><span>Good</span><span>Moderate</span><span>Unhealthy</span><span>Hazardous</span></div><p class="section-subtitle">Best illustrative reading: ${esc(mainStation.name||"No station")} (${mainStation.aqi} AQI).</p></article>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="card-head"><div><h2>Pollutant snapshot</h2><p>Latest illustrative readings from ${esc(mainStation.name||"your selected station")}</p></div><button class="small-action" data-view="trends">View history ↗</button></div><div class="grid pollutant-grid">${pollutantCards(mainStation)}</div></div>
      <div class="grid bottom-grid"><article class="card"><div class="card-head"><div><h2>Monitoring stations</h2><p>Compare locations at a glance</p></div><button class="small-action" data-view="stations">View all ↗</button></div><div class="station-list">${stationRows()}</div></article><article class="card"><div class="card-head"><div><h2>Latest alerts</h2><p>Updates from the monitoring workspace</p></div><button class="small-action" data-view="alerts">View all ↗</button></div>${alertsList()}</article></div>`;
    drawChart("aqi-chart",db.readings.map(r=>r.date),db.readings.map(r=>r.aqi),"AQI");
  }
  function drawChart(id,labels,values,label="AQI"){
    const canvas=$("#"+id);if(!canvas||!window.Chart)return;if(chart){chart.destroy();chart=null;}
    chart=new Chart(canvas,{type:"line",data:{labels,datasets:[{label,data:values,borderColor:"#258F91",backgroundColor:"rgba(37,143,145,.12)",fill:true,tension:.38,borderWidth:2.5,pointRadius:3,pointHoverRadius:5,pointBackgroundColor:"#258F91"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#174B4B",padding:11,displayColors:false}},scales:{x:{grid:{display:false},ticks:{color:"#748E8C",font:{size:9},maxTicksLimit:7}},y:{beginAtZero:true,grid:{color:"#edf3f1"},ticks:{color:"#748E8C",font:{size:9}}}}}});
  }
  function renderStations(){
    const admin=currentUser.role==="admin";
    $("#content").innerHTML=heading("Monitoring stations","Explore AQI readings by location and inspect individual pollutant levels.",admin?btn("+ Add station","add-station"):"")+
    `<div class="toolbar"><input id="station-search" placeholder="Search by station or city…" aria-label="Search stations"><select id="station-filter"><option value="all">All statuses</option><option>Active</option><option>Maintenance</option></select><select id="aqi-filter"><option value="all">All AQI levels</option><option value="good">Good (0–50)</option><option value="moderate">Moderate (51–100)</option><option value="high">Above 100</option></select></div><div class="card table-card"><div class="table-scroll"><table><thead><tr><th>Station</th><th>Location</th><th>AQI</th><th>PM2.5</th><th>PM10</th><th>Status</th><th>Updated</th>${admin?"<th>Actions</th>":""}</tr></thead><tbody id="station-table"></tbody></table></div></div>`;
    fillStationTable();
    ["station-search","station-filter","aqi-filter"].forEach(id=>$("#"+id).addEventListener("input",fillStationTable));
  }
  function fillStationTable(){
    const search=($("#station-search")?.value||"").toLowerCase(),status=$("#station-filter")?.value||"all",aqi=$("#aqi-filter")?.value||"all",admin=currentUser?.role==="admin";
    const rows=db.stations.filter(s=>(s.name+" "+s.city).toLowerCase().includes(search)&&(status==="all"||s.status===status)&&(aqi==="all"||(aqi==="good"&&s.aqi<=50)||(aqi==="moderate"&&s.aqi>50&&s.aqi<=100)||(aqi==="high"&&s.aqi>100)));
    $("#station-table").innerHTML=rows.map(s=>`<tr><td><span class="table-main">${esc(s.name)}</span><span class="table-sub">${esc(s.id)}</span></td><td>${esc(s.city)}</td><td><b>${s.aqi}</b> <span class="status-badge ${category(s.aqi)[1]}">${categoryText(s.aqi)}</span></td><td>${s.pm25} µg/m³</td><td>${s.pm10} µg/m³</td><td><span class="status-badge ${s.status==="Active"?"":"moderate"}">${esc(s.status)}</span></td><td>${esc(s.updated||"—")}</td>${admin?`<td><div class="row-actions"><button class="small-action" data-action="edit-station" data-id="${esc(s.id)}">Edit</button><button class="small-action delete" data-action="delete-station" data-id="${esc(s.id)}">Delete</button></div></td>`:""}</tr>`).join("")||`<tr><td colspan="${admin?8:7}"><div class="empty-state"><b>No stations found</b>Try changing your search or filters.</div></td></tr>`;
  }
  function renderTrends(){
    const first=db.stations[0]||{name:"No station",aqi:0};
    $("#content").innerHTML=heading("Trends & history","Explore historical patterns in this browser's illustrative dataset.")+
      `<div class="grid aqi-layout">${chartCard("AQI history","Daily average index","history-chart",true)}<article class="card"><div class="card-head"><div><h2>Reading summary</h2><p>Current station comparison</p></div></div><div class="station-list">${stationRows(6)}</div></article></div>
      <div class="card"><div class="card-head"><div><h2>Historical records</h2><p>Daily sample readings saved in this browser</p></div><button class="small-action" data-action="export-csv">Export CSV ↓</button></div><div class="table-scroll"><table><thead><tr><th>Date</th><th>Average AQI</th><th>Category</th><th>Interpretation</th></tr></thead><tbody>${db.readings.slice().reverse().map(r=>`<tr><td>${esc(r.date)}</td><td><b>${r.aqi}</b></td><td><span class="status-badge ${category(r.aqi)[1]}">${categoryText(r.aqi)}</span></td><td>${r.aqi<=50?"Good illustrative air quality":r.aqi<=100?"Moderate illustrative air quality":"Elevated illustrative reading"}</td></tr>`).join("")}</tbody></table></div></div>`;
    const range=$("#trend-range");
    const update=()=>{const n=Number(range?.value||14),rs=db.readings.slice(-n);drawChart("history-chart",rs.map(x=>x.date),rs.map(x=>x.aqi));};
    range?.addEventListener("change",update);update();
  }
  function renderAlerts(){
    $("#content").innerHTML=heading("Air alerts","Read the latest notices and illustrative air-quality guidance.")+
      `<div class="insight-banner"><div><h2>Stay informed, not alarmed.</h2><p>These are demo alerts generated from the sample dataset. A production version can deliver verified notifications from a connected monitoring source.</p></div><span class="pill">DEMO NOTIFICATIONS</span></div>
      <div class="card"><div class="card-head"><div><h2>Notifications</h2><p id="alert-subtitle">${db.alerts.filter(a=>!a.resolved).length} active notices</p></div><button class="small-action" data-action="clear-alerts">Mark all read</button></div>
      ${db.alerts.map(a=>`<div class="alert-item"><span class="alert-symbol ${a.severity==="Good"?"good":""}">${a.severity==="Good"?"✓":"!"}</span><div class="alert-text"><b>${esc(a.title)}</b><p>${esc(a.description)}</p><time>${esc(a.time)} · ${esc(a.severity)}</time></div><button class="small-action" data-action="toggle-alert" data-id="${esc(a.id)}">${a.resolved?"Restore":"Mark read"}</button></div>`).join("")||'<div class="empty-state">No alerts yet.</div>'}</div>`;
  }
  const guide=[
    ["PM2.5","Fine particles","Tiny airborne particles that can penetrate deep into the lungs. Common sources include combustion, traffic and smoke.","Reduce exposure to smoke and check local guidance during elevated readings."],
    ["PM10","Coarse particles","Inhalable particles such as dust, pollen and construction debris.","Avoid dusty areas when readings are elevated; consider a well-fitted mask if advised."],
    ["CO","Carbon monoxide","A colourless, odourless gas from incomplete combustion. High concentrations can be dangerous.","Never ignore a CO alarm. Leave the area and contact local emergency services if exposure is suspected."],
    ["NO₂","Nitrogen dioxide","A reactive gas associated with traffic, combustion and some industrial activity.","Reduce time near heavy traffic when pollution is elevated."],
    ["SO₂","Sulfur dioxide","A gas primarily associated with burning sulfur-containing fuels and some industrial processes.","People with asthma may be more sensitive to elevated sulfur dioxide."],
    ["O₃","Ground-level ozone","A pollutant formed when sunlight drives reactions between other pollutants.","On high-ozone days, consider less strenuous outdoor activity during peak periods."]
  ];
  function renderGuide(){
    $("#content").innerHTML=heading("Pollutant guide","A practical introduction to the pollutants displayed in your AirMetric dashboard.")+
      `<div class="insight-banner"><div><h2>Numbers need context.</h2><p>A pollutant reading is only one part of the picture. Units, averaging periods, local standards and sensor quality all matter. Use official local advisories for health decisions.</p></div><span class="pill">LEARN THE BASICS</span></div><div class="grid guide-grid">${guide.map(g=>`<article class="card guide-card"><span class="guide-symbol">${g[0].slice(0,2)}</span><h3>${g[0]} · ${g[1]}</h3><p>${g[2]}</p><div class="recommendation"><i>↗</i><span>${g[3]}</span></div></article>`).join("")}</div>`;
  }
  function renderManage(){
    $("#content").innerHTML=heading("Manage records","Create, edit or remove monitoring stations and review all sample records.",btn("+ Add station","add-station"))+
      `<div class="grid metric-grid">${metric("Total stations",db.stations.length,"records","Saved in browser storage","⌖")}${metric("Active stations",db.stations.filter(s=>s.status==="Active").length,"online","Demo status","✓")}${metric("Alert records",db.alerts.length,"alerts","Notifications in workspace","♧")}${metric("Data mode","Local","only","Not connected to a backend","▤")}</div>
      <div class="toolbar"><input id="manage-search" placeholder="Search records by name, city or ID…"><button class="btn secondary" data-action="export-csv">Export CSV ↓</button></div>
      <div class="card table-card"><div class="table-scroll"><table><thead><tr><th>Station</th><th>ID</th><th>City</th><th>AQI</th><th>PM2.5</th><th>PM10</th><th>Status</th><th>Actions</th></tr></thead><tbody id="manage-table"></tbody></table></div></div>`;
    fillManageTable();$("#manage-search").addEventListener("input",fillManageTable);
  }
  function fillManageTable(){
    const q=($("#manage-search")?.value||"").toLowerCase();
    const rows=db.stations.filter(s=>(s.name+" "+s.city+" "+s.id).toLowerCase().includes(q));
    $("#manage-table").innerHTML=rows.map(s=>`<tr><td class="table-main">${esc(s.name)}</td><td>${esc(s.id)}</td><td>${esc(s.city)}</td><td>${s.aqi}</td><td>${s.pm25}</td><td>${s.pm10}</td><td><span class="status-badge ${s.status==="Active"?"":"moderate"}">${esc(s.status)}</span></td><td><div class="row-actions"><button class="small-action" data-action="edit-station" data-id="${esc(s.id)}">Edit</button><button class="small-action delete" data-action="delete-station" data-id="${esc(s.id)}">Delete</button></div></td></tr>`).join("")||'<tr><td colspan="8"><div class="empty-state">No matching records.</div></td></tr>';
  }
  function renderPeople(){
    let accounts=[];try{accounts=JSON.parse(localStorage.getItem(USERS)||"[]");}catch(_){}
    $("#content").innerHTML=heading("User directory","Local demo profiles created in this browser. Passwords are stored as demo data and are not secure.")+
      `<div class="card table-card"><div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Demo role</th><th>Created</th><th>Actions</th></tr></thead><tbody>${accounts.map((a,i)=>`<tr><td class="table-main">${esc(a.name)}</td><td>${esc(a.email)}</td><td><span class="status-badge">${esc(a.role)}</span></td><td>${a.created?new Date(a.created).toLocaleDateString():"—"}</td><td><button class="small-action delete" data-action="delete-user" data-index="${i}">Delete</button></td></tr>`).join("")||'<tr><td colspan="5"><div class="empty-state"><b>No demo accounts yet</b>Create an account from the login screen to test this view.</div></td></tr>'}</tbody></table></div></div>`;
  }
  function render(view){
    if(!currentUser)return;
    if(chart){chart.destroy();chart=null;}
    const map={overview:renderOverview,stations:renderStations,trends:renderTrends,alerts:renderAlerts,guide:renderGuide,manage:renderManage,people:renderPeople};
    (map[view]||renderOverview)();
    $("#alert-count").textContent=db.alerts.filter(a=>!a.resolved).length;
  }

  // Station create/update modal.
  function openRecord(id=null){
    if(currentUser?.role!=="admin"){toast("Switch to the Admin demo role to manage records.");return;}
    const s=db.stations.find(x=>x.id===id);
    $("#dialog-title").textContent=s?"Edit monitoring station":"Add monitoring station";
    $("#record-id").value=s?.id||"";
    $("#record-fields").innerHTML=`
      <label>Station name<input name="name" required maxlength="70" value="${esc(s?.name||"")}" placeholder="e.g. Jubilee Hills"></label>
      <label>City<input name="city" required maxlength="70" value="${esc(s?.city||"Hyderabad")}" placeholder="City"></label>
      <label>AQI (0–500)<input name="aqi" type="number" min="0" max="500" required value="${s?.aqi??42}"></label>
      <label>PM2.5 (µg/m³)<input name="pm25" type="number" min="0" step="0.1" required value="${s?.pm25??12}"></label>
      <label>PM10 (µg/m³)<input name="pm10" type="number" min="0" step="0.1" required value="${s?.pm10??24}"></label>
      <label>CO (mg/m³)<input name="co" type="number" min="0" step="0.1" required value="${s?.co??0.4}"></label>
      <label>NO₂ (ppb)<input name="no2" type="number" min="0" step="0.1" required value="${s?.no2??11}"></label>
      <label>SO₂ (ppb)<input name="so2" type="number" min="0" step="0.1" required value="${s?.so2??5}"></label>
      <label>O₃ (ppb)<input name="o3" type="number" min="0" step="0.1" required value="${s?.o3??28}"></label>
      <label>Status<select name="status"><option ${s?.status==="Active"||!s?"selected":""}>Active</option><option ${s?.status==="Maintenance"?"selected":""}>Maintenance</option></select></label>`;
    $("#record-dialog").showModal();
  }
  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>$("#record-dialog").close()));
  $("#record-form").addEventListener("submit",e=>{
    e.preventDefault();if(currentUser?.role!=="admin")return;
    const f=new FormData(e.currentTarget),id=$("#record-id").value;
    const record={id:id||"ST-"+Math.floor(100+Math.random()*900),name:String(f.get("name")).trim(),city:String(f.get("city")).trim(),aqi:Number(f.get("aqi")),pm25:Number(f.get("pm25")),pm10:Number(f.get("pm10")),co:Number(f.get("co")),no2:Number(f.get("no2")),so2:Number(f.get("so2")),o3:Number(f.get("o3")),status:String(f.get("status")),updated:"Just now"};
    if(id){db.stations=db.stations.map(s=>s.id===id?record:s);toast("Station record updated.");}
    else{db.stations.unshift(record);toast("New station added.");}
    saveData();$("#record-dialog").close();render(currentView);
  });

  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-action]");if(!b)return;
    const action=b.dataset.action,id=b.dataset.id;
    if(action==="add-station")openRecord();
    if(action==="edit-station")openRecord(id);
    if(action==="delete-station"){
      if(currentUser?.role!=="admin")return toast("Admin demo role required.");
      const station=db.stations.find(s=>s.id===id);if(!station)return;
      if(confirm(`Delete "${station.name}" from this browser's demo records?`)){db.stations=db.stations.filter(s=>s.id!==id);saveData();render(currentView);toast("Station deleted.");}
    }
    if(action==="toggle-alert"){
      const a=db.alerts.find(x=>x.id===id);if(a){a.resolved=!a.resolved;saveData();render(currentView);toast(a.resolved?"Alert marked as read.":"Alert restored.");}
    }
    if(action==="clear-alerts"){db.alerts.forEach(a=>a.resolved=true);saveData();render(currentView);toast("All alerts marked as read.");}
    if(action==="export-csv")exportCSV();
    if(action==="delete-user"){
      if(currentUser?.role!=="admin")return;
      let accounts=[];try{accounts=JSON.parse(localStorage.getItem(USERS)||"[]");}catch(_){}
      const a=accounts[Number(b.dataset.index)];if(a&&confirm(`Delete demo profile ${a.email}?`)){accounts.splice(Number(b.dataset.index),1);localStorage.setItem(USERS,JSON.stringify(accounts));render("people");toast("Demo profile deleted.");}
    }
  });
  function exportCSV(){
    const rows=[["Station ID","Station","City","AQI","PM2.5","PM10","CO","NO2","SO2","O3","Status"],...db.stations.map(s=>[s.id,s.name,s.city,s.aqi,s.pm25,s.pm10,s.co,s.no2,s.so2,s.o3,s.status])];
    const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="airmetric-stations.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("CSV export downloaded.");
  }
  $("#year").textContent=new Date().getFullYear();
  $("#today-date").textContent=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
})();
