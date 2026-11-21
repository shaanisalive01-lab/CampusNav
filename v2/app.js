/* CampusNav v2 — single-page app. Reuses ../campusData.js and ../timetableData.js. */
(() => {
  "use strict";

  /* ================= utilities ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = n => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("campusnav-v2-" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("campusnav-v2-" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };
  const prefs = Object.assign({ theme: "system", accent: "blue", motion: "on", role: "student" }, store.get("prefs", {}));
  const ROLES = {
    student: { name: "Student", about: "Browse, navigate, RSVP, join clubs", icon: "users", manage: "" },
    cr: { name: "Class Rep", about: "Change a class's room or time and notify everyone", icon: "edit", manage: "My class" },
    club: { name: "Club Admin", about: "Publish club events to the whole campus", icon: "plus", manage: "Club events" },
    admin: { name: "Campus Admin", about: "Broadcast notices and see campus activity", icon: "shield", manage: "Campus" }
  };
  if (!ROLES[prefs.role]) prefs.role = "student";

  /* Same localStorage keys as the original CR / club-admin pages, so data is shared. */
  const raw = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };
  const OVERRIDES_KEY = "campusnav-timetable-overrides", CLUB_EVENTS_KEY = "campusnav-club-events", NOTIF_KEY = "campusnav-v2-notifs";
  const rsvps = new Set(store.get("rsvps", []));
  const joined = new Set(store.get("joined", []));

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    $("#toasts").append(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ---- clock (supports ?now=Mon@10:30 to demo any time of the week) ---- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let clockOffset = 0;
  (() => {
    const m = /^(\w{3})\w*@(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get("now") || "");
    if (!m) return;
    const di = DAYS.findIndex(d => d.toLowerCase().startsWith(m[1].toLowerCase()));
    if (di < 0) return;
    const t = new Date(); t.setDate(t.getDate() - t.getDay() + di); t.setHours(+m[2], +m[3], 0, 0);
    clockOffset = t - Date.now();
  })();
  const now = () => new Date(Date.now() + clockOffset);
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmtMin = m => { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0"); return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`; };
  const fmtDate = d => fmtMin(d.getHours() * 60 + d.getMinutes());
  const fmtDur = s => s < 90 ? `${Math.max(1, Math.round(s))} sec` : `${Math.round(s / 60)} min`;
  function fmtCountdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const p = n => String(n).padStart(2, "0");
    return d ? `${d}d ${h}h ${p(m)}m` : h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  }

  /* ================= campus graph & routing ================= */
  const LEVEL1 = new Set(["first-floor-stairs", "first-floor-corridor", "first-floor-left-corridor", "first-floor-right-corridor", "a201", "a204"]);
  const floorOf = id => LEVEL1.has(id) ? 1 : 0;
  const ROAD = new Set(["main-gate", "main-road-bottom", "block-a", "left-road-junction", "left-road-mid", "library-entrance", "library", "right-road-junction", "right-road-mid", "cafeteria-entrance", "cafeteria"]);
  const LABELS = {
    "main-road-bottom": "the main road", "left-road-junction": "the left junction", "left-road-mid": "the left road",
    "library-entrance": "the Library entrance", "right-road-junction": "the right junction", "right-road-mid": "the right road",
    "cafeteria-entrance": "the Cafeteria entrance", "block-a-left-entry": "the west door", "block-a-right-entry": "the east door",
    "first-floor-stairs": "Level 1 landing", "first-floor-corridor": "the Level 1 corridor",
    "first-floor-left-corridor": "the west corridor", "first-floor-right-corridor": "the east corridor"
  };
  const LABEL_POS = { "block-a": [14, 4, "start"], "stairs-a": [-14, 4, "end"], "first-floor-stairs": [14, 4, "start"], "a201": [0, 22, "middle"] };
  const label = id => campusLocations[id]?.name || LABELS[id] || id;
  const isNamed = id => !!campusLocations[id] && id !== "first-floor";

  /* Build an undirected adjacency map. The source data has a Library<->Cafeteria edge
     that has no road on the map, so it is dropped (it let routes teleport across campus). */
  const adj = {};
  const addEdge = (a, b, w) => { (adj[a] ||= {})[b] = Math.min(w, adj[a]?.[b] ?? Infinity); };
  for (const [a, nb] of Object.entries(campusGraph)) for (const [b, w] of Object.entries(nb)) {
    if ((a === "library" && b === "cafeteria") || (a === "cafeteria" && b === "library")) continue;
    addEdge(a, b, w); addEdge(b, a, w);
  }
  const isStairEdge = (a, b) => floorOf(a) !== floorOf(b);
  const STAIR_PENALTY = 20;        // seconds
  const WALK_SPEED = 1.3;          // metres per second

  class MinHeap {
    constructor() { this.a = []; }
    push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
    get size() { return this.a.length; }
  }

  function route(from, to, { stepFree = false } = {}) {
    if (!adj[from] || !adj[to]) return null;
    const cost = (a, b) => adj[a][b] + (isStairEdge(a, b) ? STAIR_PENALTY * WALK_SPEED : 0);
    const dist = { [from]: 0 }, prev = {}, heap = new MinHeap(); heap.push(0, from);
    while (heap.size) {
      const [d, u] = heap.pop();
      if (d > dist[u]) continue;
      if (u === to) break;
      for (const v in adj[u]) {
        if (stepFree && isStairEdge(u, v)) continue;
        const nd = d + cost(u, v);
        if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; heap.push(nd, v); }
      }
    }
    if (!(to in dist)) return null;
    const path = [to]; while (path[0] !== from) path.unshift(prev[path[0]]);
    let metres = 0, levels = 0;
    for (let i = 1; i < path.length; i++) { metres += adj[path[i - 1]][path[i]]; if (isStairEdge(path[i - 1], path[i])) levels++; }
    return { path, metres, levels, seconds: metres / WALK_SPEED + levels * STAIR_PENALTY };
  }
  const walkSeconds = (a, b) => route(a, b)?.seconds ?? 0;

  function buildSteps(path) {
    const P = id => mapCoordinates[id];
    const hd = (a, b) => Math.atan2(P(b).y - P(a).y, P(b).x - P(a).x);
    const dirName = r => ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"][Math.round(((r * 180 / Math.PI) + 360) % 360 / 45) % 8];
    const steps = []; let start = 0, acc = 0, prevHeading = null;
    for (let i = 1; i < path.length; i++) {
      acc += adj[path[i - 1]][path[i]];
      const last = i === path.length - 1;
      const floorChange = floorOf(path[i - 1]) !== floorOf(path[i]);
      const nextFloorChange = !last && floorOf(path[i]) !== floorOf(path[i + 1]);
      const turn = !last && Math.abs(norm(hd(path[i], path[i + 1]) - hd(path[i - 1], path[i]))) > 0.5;
      if (!(last || isNamed(path[i]) || floorChange || nextFloorChange || turn)) continue;
      const a = path[start], b = path[i];
      if (floorChange) {
        const up = floorOf(b) > floorOf(a);
        steps.push({ kind: "stairs", text: `Take the stairs ${up ? "up to Level 1" : "down to Ground"}`, sub: `${label(a)} → ${label(b)}`, m: acc, from: start, to: i });
      } else {
        const h = hd(path[start], path[start + 1]);
        let kind = "up", text;
        if (prevHeading === null) text = `Head ${dirName(h)} toward ${label(b)}`;
        else {
          const d = norm(h - prevHeading);
          if (Math.abs(d) < 0.4) text = `Continue toward ${label(b)}`;
          else if (Math.abs(d) > 2.5) { kind = "left"; text = `Turn around toward ${label(b)}`; }
          else { kind = d > 0 ? "right" : "left"; text = `${Math.abs(d) < 0.9 ? "Bear" : "Turn"} ${kind} toward ${label(b)}`; }
        }
        if (last) kind = kind === "up" ? "flag" : kind;
        steps.push({ kind, text: last ? text.replace(/ toward .*/, ` — arrive at ${label(b)}`) : text, sub: last ? "Destination" : "", m: acc, from: start, to: i });
        prevHeading = hd(path[i - 1], path[i]);
      }
      start = i; acc = 0;
    }
    return steps;
    function norm(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  }

  /* ================= domain data ================= */
  const EVENTS = [
    { id: "e1", title: "Robotics Club Meeting", cat: "Technical", day: 0, start: "15:30", end: "17:00", loc: "block-a", about: "Weekly build session — bring your sensor kits." },
    { id: "e2", title: "CAD Design Workshop", cat: "Technical", day: 1, start: "11:00", end: "13:00", loc: "a204", about: "Hands-on parametric modelling for first years." },
    { id: "e3", title: "Freshers Meetup", cat: "Social", day: "Friday", start: "18:00", end: "20:00", loc: "main-gate", about: "Meet your batch, grab snacks, find your club." },
    { id: "e4", title: "Physics Lab Session", cat: "Academic", day: "Monday", start: "14:00", end: "16:00", loc: "a105", about: "Optics experiment — lab coats required." },
    { id: "e5", title: "Motorsport Discussion", cat: "Social", day: "Wednesday", start: "16:30", end: "18:00", loc: "library", about: "Race recap and the F1 team's next build." },
    { id: "e6", title: "Student Hangout", cat: "Social", day: "Saturday", start: "17:00", end: "19:00", loc: "cafeteria", about: "Open mic, board games and chai." }
  ];
  const CLUBS = [
    { id: "c1", name: "Robotics Club", tag: "Technical", members: 42, loc: "block-a", about: "Build, program and compete with autonomous robots." },
    { id: "c2", name: "Engineering Maths Study Group", tag: "Academic", members: 18, loc: "library", about: "Weekly problem-solving sessions before every test." },
    { id: "c3", name: "CAD & Design", tag: "Technical", members: 27, loc: "a204", about: "SolidWorks and Fusion 360 projects, from sketch to print." },
    { id: "c4", name: "F1 & Motorsport", tag: "Social", members: 31, loc: "library", about: "Race-weekend watch parties and a formula-student build." },
    { id: "c5", name: "SIH & Innovation", tag: "Technical", members: 24, loc: "block-a", about: "Team up for hackathons and Smart India Hackathon." },
    { id: "c6", name: "Campus Gaming", tag: "Social", members: 36, loc: "cafeteria", about: "Friendly tournaments and LAN nights." },
    { id: "c7", name: "Photography & Media", tag: "Creative", members: 21, loc: "main-gate", about: "Photo walks, editing workshops and event coverage." },
    { id: "c8", name: "Entrepreneurship Hub", tag: "Creative", members: 19, loc: "block-a", about: "Pitch practice, mentors and startup weekends." }
  ];
  const PLACES = [
    { name: "Library", cat: "Study", icon: "book", loc: "library", about: "Quiet floors, group rooms and past papers." },
    { name: "Cafeteria", cat: "Food", icon: "cup", loc: "cafeteria", about: "Hot meals, snacks and the best filter coffee." },
    { name: "Physics Lab", cat: "Facilities", icon: "flask", loc: "a105", about: "Room 105 — ground floor laboratory." },
    { name: "Block A", cat: "Facilities", icon: "building", loc: "block-a", about: "The main academic block with two levels." },
    { name: "Campus Café (nearby)", cat: "Nearby", icon: "cup", about: "Off campus · 4 min walk from the main gate." },
    { name: "Restaurants (nearby)", cat: "Nearby", icon: "cup", about: "Off campus · food street, 6 min walk." }
  ];

  /** Seeded events + events published by club admins (original club-admin.html format). */
  function allEvents() {
    const published = raw.get(CLUB_EVENTS_KEY, []).filter(e => e && e.date && e.time).map(e => {
      const [h, m] = e.time.split(":").map(Number), end = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      return { id: "ce" + e.id, title: e.name, cat: "Club", date: e.date, start: e.time, end, loc: adj[e.location] ? e.location : "main-gate", about: e.description || e.club || "Club event", club: e.club, custom: true };
    }).filter(e => { const d = eventDate(e); return d >= new Date(now().getTime() - 2 * 3600e3); });
    return [...EVENTS, ...published];
  }

  /** Next calendar occurrence of an event given a weekday name or an offset from today. */
  function eventDate(ev) {
    if (ev.date) { const [y, mo, da] = ev.date.split("-").map(Number), [h, mi] = ev.start.split(":").map(Number); return new Date(y, mo - 1, da, h, mi); }
    const n = now(), d = new Date(n); const [h, m] = ev.start.split(":").map(Number);
    const target = typeof ev.day === "number" ? (n.getDay() + ev.day) % 7 : DAYS.indexOf(ev.day);
    d.setHours(h, m, 0, 0);
    if (typeof ev.day === "number") d.setDate(d.getDate() + ev.day);
    else { d.setDate(d.getDate() + ((target - n.getDay() + 7) % 7)); if (d < n) d.setDate(d.getDate() + 7); }
    return d;
  }
  const relDay = d => { const n = now(), a = new Date(n).setHours(0, 0, 0, 0), b = new Date(d).setHours(0, 0, 0, 0), k = Math.round((b - a) / 864e5); return k === 0 ? "Today" : k === 1 ? "Tomorrow" : DAYS[d.getDay()]; };

  /** All class occurrences from now until a week ahead, sorted. */
  function upcomingClasses() {
    const n = now(), out = [];
    for (let o = 0; o <= 7; o++) {
      const day = new Date(n); day.setDate(day.getDate() + o);
      for (const c of timetable.filter(c => c.day === DAYS[day.getDay()])) {
        const s = new Date(day); s.setHours(0, toMin(c.startTime), 0, 0);
        const e = new Date(day); e.setHours(0, toMin(c.endTime), 0, 0);
        if (e > n) out.push({ c, s, e, live: s <= n });
      }
    }
    return out.sort((a, b) => a.s - b.s);
  }

  /* ================= router ================= */
  const BASE_VIEWS = [
    ["home", "Home", "home"], ["map", "Map", "map"], ["timetable", "Timetable", "cal"],
    ["events", "Events", "ticket"], ["clubs", "Clubs", "users"], ["explore", "Explore", "compass"]
  ];
  const viewsFor = () => prefs.role === "student" ? BASE_VIEWS
    : [...BASE_VIEWS.slice(0, 4), ["manage", ROLES[prefs.role].manage, ROLES[prefs.role].icon], ...BASE_VIEWS.slice(4)];
  let current = { name: "home", params: new URLSearchParams() };
  const renderers = {};

  function parseHash() {
    const [path, q] = (location.hash.slice(1) || "/home").split("?");
    const name = path.replace(/^\//, "");
    return { name: renderers[name] ? name : "home", params: new URLSearchParams(q || "") };
  }
  function go(name, params = {}) {
    const q = new URLSearchParams(params).toString();
    location.hash = `/${name}${q ? "?" + q : ""}`;
  }
  function renderNav() {
    const btn = (v, cls = "nav-btn") => `<a class="${cls}" href="#/${v[0]}" ${current.name === v[0] ? 'aria-current="page"' : ""}>${icon(v[2])}${v[1]}</a>`;
    const vs = viewsFor();
    $("#railNav").innerHTML = vs.map(v => btn(v)).join("");
    $("#tabbar").innerHTML = vs.filter(v => v[0] !== "explore" && !(prefs.role !== "student" && v[0] === "clubs")).map(v => btn(v)).join("");
  }
  function render() {
    teardown?.(); teardown = null; $("#view").repaint = null;
    current = parseHash();
    const title = viewsFor().find(v => v[0] === current.name)?.[1] || "Home";
    $("#viewTitle").innerHTML = esc(title) + (prefs.role !== "student" ? ` <span class="role-chip">${ROLES[prefs.role].name}</span>` : ""); document.title = `${title} · CampusNav`;
    renderNav();
    const view = $("#view"); view.replaceChildren(); view.style.animation = "none"; void view.offsetWidth; view.style.animation = "";
    teardown = renderers[current.name](view, current.params) || null;
    scrollTo(0, 0);
  }
  let teardown = null;

  /* ================= HOME ================= */
  renderers.home = view => {
    const n = now(), hr = n.getHours();
    const greet = hr < 5 ? "Burning the midnight oil" : hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    const todays = timetable.filter(c => c.day === DAYS[n.getDay()]).sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    const nextEvents = allEvents().map(e => ({ e, d: eventDate(e) })).sort((a, b) => a.d - b.d).slice(0, 3);
    view.innerHTML = `
      <div class="hello"><h2>${greet} 👋</h2><p class="muted">${n.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })} · ${todays.length ? `${todays.length} class${todays.length > 1 ? "es" : ""} today` : "No classes today"}</p></div>
      <div class="grid g-home">
        <section class="card now-card col-8" id="nowCard" aria-label="Next class"></section>
        <section class="card col-4"><h2>Quick actions</h2><div class="quick">
          <button data-go="map:to=library">${icon("book")}Library</button>
          <button data-go="map:to=cafeteria">${icon("cup")}Cafeteria</button>
          <button data-go="timetable">${icon("cal")}Week view</button>
          <button data-act="palette">${icon("search")}Search</button></div></section>
        <section class="card col-4"><h2>Today</h2><div class="timeline" id="todayTl"></div></section>
        <section class="card col-4"><h2>This week</h2><div class="grid" style="grid-template-columns:1fr 1fr;gap:18px">
          <div class="stat"><b>${timetable.length}</b><span>Classes scheduled</span></div>
          <div class="stat"><b>${(timetable.reduce((s, c) => s + toMin(c.endTime) - toMin(c.startTime), 0) / 60).toFixed(0)}h</b><span>In lectures & labs</span></div>
          <div class="stat"><b>${rsvps.size}</b><span>Events going</span></div>
          <div class="stat"><b>${joined.size}</b><span>Clubs joined</span></div></div></section>
        <section class="card col-4"><h2>Coming up <a class="more" href="#/events">All events</a></h2><div class="timeline">
          ${nextEvents.map(({ e, d }) => `<div class="tl-item"><span class="t">${relDay(d)}</span><span class="dot"></span><div><b>${esc(e.title)}</b><small>${fmtDate(d)} · ${esc(label(e.loc))}</small></div><span></span></div>`).join("")}</div></section>
      </div>`;
    const tl = $("#todayTl");
    const refresh = () => {
      const t = now(), m = t.getHours() * 60 + t.getMinutes();
      tl.innerHTML = todays.length ? todays.map(c => {
        const live = m >= toMin(c.startTime) && m < toMin(c.endTime), done = m >= toMin(c.endTime);
        return `<div class="tl-item ${live ? "live" : ""} ${done ? "done" : ""}"><span class="t mono">${fmtMin(toMin(c.startTime))}</span><span class="dot"></span><div><b>${esc(c.subject)}</b><small>${esc(label(c.location))}</small></div>${live ? '<span class="chip accent">Live</span>' : ""}</div>`;
      }).join("") : `<div class="empty">Nothing scheduled — enjoy the day.</div>`;
      paintNow();
    };
    function paintNow() {
      const card = $("#nowCard"); if (!card) return;
      const t = now(), up = upcomingClasses()[0];
      if (!up) { card.innerHTML = `<div class="label">Schedule</div><h3>No classes scheduled</h3><p class="now-meta">Your timetable is empty.</p>`; return; }
      const { c, s, e, live } = up, walk = walkSeconds("main-gate", c.location);
      const leaveAt = new Date(s - walk * 1000 - 3 * 60000), leaveIn = leaveAt - t;
      const pct = live ? clamp((t - s) / (e - s) * 100, 0, 100) : 0;
      const when = live ? "" : `${relDay(s)} · `;
      card.innerHTML = `<div class="deco"></div>
        <div class="label"><span class="pulse"></span>${live ? "In session now" : "Up next"}</div>
        <h3>${esc(c.subject)}</h3>
        <div class="now-meta"><span>${when}${fmtDate(s)} – ${fmtDate(e)}</span><span>${esc(campusLocations[c.location]?.building || "Campus")} · ${esc(label(c.location))}</span></div>
        <div class="count mono">${fmtCountdown(live ? e - t : s - t)}<small>${live ? "remaining" : "until start"}</small></div>
        ${live ? `<div class="bar" role="progressbar" aria-valuenow="${pct | 0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>` : ""}
        <p class="now-meta" style="margin-top:12px">${live ? "" : leaveIn > 0 && leaveIn < 864e5 ? `Leave the gate by ${fmtDate(leaveAt)} (${fmtDur(walk)} walk).` : `${fmtDur(walk)} walk from the main gate.`}</p>
        <div class="row wrap" style="margin-top:16px"><button class="btn" data-go="map:to=${esc(c.location)}">${icon("pin")}Navigate</button><button class="btn outline" data-go="timetable">View week</button></div>`;
    }
    refresh();
    const id = setInterval(() => { paintNow(); if (now().getSeconds() === 0) refresh(); }, 1000);
    return () => clearInterval(id);
  };

  /* ================= MAP ================= */
  const mapState = { from: "main-gate", to: "", stepFree: false, floor: 0 };

  renderers.map = (view, params) => {
    const nodes = Object.keys(adj).filter(isNamed).sort((a, b) => label(a).localeCompare(label(b)));
    const urlTo = params.get("to"), urlFrom = params.get("from");
    const resolve = q => { if (!q) return ""; if (adj[q]) return q; const l = q.toLowerCase(); return nodes.find(id => label(id).toLowerCase() === l) || nodes.find(id => label(id).toLowerCase().includes(l)) || ""; };
    if (urlFrom) mapState.from = resolve(urlFrom) || mapState.from;
    if (urlTo) { mapState.to = resolve(urlTo); if (!mapState.to) toast(`Couldn't find “${urlTo}”`); }
    const opts = sel => nodes.map(id => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(label(id))}${floorOf(id) ? " · Level 1" : ""}</option>`).join("");

    view.innerHTML = `<div class="map-layout">
      <div class="panel">
        <div class="card"><div class="route-fields">
          <div class="stack">
            <div class="field"><label for="selFrom">From</label><select id="selFrom">${opts(mapState.from)}</select></div>
            <div class="field"><label for="selTo">To</label><select id="selTo"><option value="">Choose destination…</option>${opts(mapState.to)}</select></div>
          </div>
          <button class="icon-btn" id="btnSwap" aria-label="Swap start and destination" title="Swap">${icon("swap")}</button></div>
          <label class="switch" style="margin-top:14px"><input type="checkbox" id="chkFree" ${mapState.stepFree ? "checked" : ""}>Step-free route (avoid stairs)</label></div>
        <div id="routeOut"></div>
      </div>
      <div class="map-wrap" id="mapWrap">
        <svg class="map" id="svgMap" viewBox="0 0 800 520" role="img" aria-label="Campus map. Use the controls to zoom and pan."></svg>
        <div class="map-ctl tl"><div class="seg-control" role="group" aria-label="Floor"><button data-floor="0" aria-pressed="true">Ground</button><button data-floor="1" aria-pressed="false">Level 1</button></div></div>
        <div class="map-ctl tr"><button class="icon-btn" id="zIn" aria-label="Zoom in">${icon("plus")}</button><button class="icon-btn" id="zOut" aria-label="Zoom out">${icon("minus")}</button><button class="icon-btn" id="zFit" aria-label="Fit route">${icon("fit")}</button></div>
        <div class="map-ctl bl"><div class="legend"><span><i style="background:var(--good)"></i>Start</span><span><i style="background:var(--accent)"></i>Destination</span><span><i style="background:var(--road)"></i>Road</span></div></div>
      </div></div>`;

    const svg = $("#svgMap"), wrap = $("#mapWrap"), P = id => mapCoordinates[id];
    const line = (a, b, cls) => `<line class="${cls}" x1="${P(a).x}" y1="${P(a).y}" x2="${P(b).x}" y2="${P(b).y}"/>`;
    let roads = "", mids = "", halls0 = "", halls1 = "", seen = new Set();
    for (const a in adj) for (const b in adj[a]) {
      const k = [a, b].sort().join("|"); if (seen.has(k) || !P(a) || !P(b)) continue; seen.add(k);
      if (isStairEdge(a, b)) continue;
      if (ROAD.has(a) && ROAD.has(b)) { roads += line(a, b, "road"); mids += line(a, b, "road-mid"); }
      else if (floorOf(a)) halls1 += line(a, b, "road-hall"); else halls0 += line(a, b, "road-hall");
    }
    const pins = ids => ids.filter(id => P(id) && isNamed(id)).map(id => {
      const p = P(id), [dx, dy, anchor] = LABEL_POS[id] || [0, 22, "middle"];
      return `<g class="pin" data-id="${id}" tabindex="0" role="button" aria-label="${esc(label(id))}"><circle cx="${p.x}" cy="${p.y}" r="6.5"/><text class="node-label" x="${p.x + dx}" y="${p.y + dy}" text-anchor="${anchor}">${esc(label(id))}</text></g>`;
    }).join("");
    const ground = Object.keys(adj).filter(id => !floorOf(id)), level1 = Object.keys(adj).filter(id => floorOf(id));
    svg.innerHTML = `<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="var(--building-edge)" opacity=".5"/></pattern></defs>
      <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#dots)"/>
      <g id="vp">
        <g class="floor-layer" id="layer0">
          <rect class="bldg" x="236" y="316" width="328" height="70" rx="12"/><text class="bldg-label" x="250" y="334">Block A · Ground</text>
          <rect class="bldg" x="84" y="210" width="92" height="66" rx="12"/><text class="bldg-label" x="96" y="228">Library</text>
          <rect class="bldg" x="624" y="210" width="92" height="66" rx="12"/><text class="bldg-label" x="636" y="228">Cafeteria</text>
          ${roads}${mids}${halls0}${pins(ground)}
        </g>
        <g class="floor-layer" id="layer1">
          <rect class="bldg" x="296" y="192" width="208" height="102" rx="12"/><text class="bldg-label" x="310" y="210">Block A · Level 1</text>
          ${halls1}${pins(level1)}
        </g>
        <g id="stairsLink"><line x1="${P("stairs-a").x}" y1="${P("stairs-a").y}" x2="${P("first-floor-stairs").x}" y2="${P("first-floor-stairs").y}" stroke="var(--faint)" stroke-width="3" stroke-dasharray="3 5" stroke-linecap="round"/></g>
        <g id="routeLayer"></g><g id="walkerLayer"></g>
      </g>`;
    /* hall style: add into CSS via inline attribute-free class */
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `.road-hall{stroke:var(--building-edge);stroke-width:7;stroke-linecap:round}`;
    svg.prepend(style);

    /* ---- pan / zoom ---- */
    const vp = $("#vp"), view2 = { k: 1, x: 0, y: 0 }, MIN = 0.7, MAX = 5;
    const apply = () => { vp.setAttribute("transform", `translate(${view2.x} ${view2.y}) scale(${view2.k})`); svg.style.setProperty("--k", view2.k); };
    const toUser = (cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    function zoomAt(ux, uy, f) { const k2 = clamp(view2.k * f, MIN, MAX), r = k2 / view2.k; view2.x = ux - (ux - view2.x) * r; view2.y = uy - (uy - view2.y) * r; view2.k = k2; apply(); }
    let anim = 0;
    function flyTo(t) {
      cancelAnimationFrame(anim); const s = { ...view2 }, t0 = performance.now(), dur = prefs.motion === "off" ? 1 : 520;
      const step = ts => { const p = clamp((ts - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3); view2.k = s.k + (t.k - s.k) * e; view2.x = s.x + (t.x - s.x) * e; view2.y = s.y + (t.y - s.y) * e; apply(); if (p < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    }
    function frame(ids, pad = 90) {
      const pts = ids.map(P).filter(Boolean); if (!pts.length) return { k: 1, x: 0, y: 0 };
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y), w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
      const k = clamp(Math.min(800 / w, 520 / h), 1, 2.6), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      return { k, x: 400 - k * cx, y: 260 - k * cy };
    }
    const pointers = new Map(); let moved = false, pinch = 0;
    wrap.addEventListener("pointerdown", e => { if (e.target.closest("button, .map-ctl")) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; cancelAnimationFrame(anim); pinch = 0; });
    const onMove = e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      const ctm = svg.getScreenCTM(), dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (pointers.size === 1) { if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; view2.x += dx / ctm.a; view2.y += dy / ctm.a; apply(); }
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); moved = true;
        if (pinch) { const c = toUser((a.x + b.x) / 2, (a.y + b.y) / 2); zoomAt(c.x, c.y, d / pinch); } pinch = d;
      }
    };
    const onUp = e => { pointers.delete(e.pointerId); pinch = 0; };
    addEventListener("pointermove", onMove); addEventListener("pointerup", onUp); addEventListener("pointercancel", onUp);
    wrap.addEventListener("click", e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    wrap.addEventListener("wheel", e => { e.preventDefault(); const u = toUser(e.clientX, e.clientY); zoomAt(u.x, u.y, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    wrap.addEventListener("dblclick", e => { const u = toUser(e.clientX, e.clientY); zoomAt(u.x, u.y, 1.6); });
    $("#zIn").onclick = () => zoomAt(400, 260, 1.3);
    $("#zOut").onclick = () => zoomAt(400, 260, 1 / 1.3);
    $("#zFit").onclick = () => flyTo(result ? frame(result.path) : { k: 1, x: 0, y: 0 });

    /* ---- floors ---- */
    function setFloor(f, quiet) {
      mapState.floor = f;
      $("#layer0").classList.toggle("dim", f === 1); $("#layer1").classList.toggle("dim", f === 0);
      $$("[data-floor]", wrap).forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.floor === f)));
      if (!quiet) drawRoute();
    }
    wrap.addEventListener("click", e => { const b = e.target.closest("[data-floor]"); if (b) setFloor(+b.dataset.floor); });

    /* ---- routing UI ---- */
    let result = null, steps = [], activeStep = -1, walkRAF = 0;
    function drawRoute() {
      const layer = $("#routeLayer"); layer.innerHTML = ""; $("#walkerLayer").innerHTML = "";
      $$(".pin", svg).forEach(p => p.classList.toggle("is-from", p.dataset.id === mapState.from && !!result));
      $$(".pin", svg).forEach(p => p.classList.toggle("is-to", p.dataset.id === mapState.to));
      if (!result) return;
      const path = result.path, total = result.metres || 1; let acc = 0, html = "";
      const focus = steps[activeStep];
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], stairs = isStairEdge(a, b), f = floorOf(a);
        const off = !stairs && f !== mapState.floor, inFocus = focus && i - 1 >= focus.from && i - 1 < focus.to;
        html += `<line class="seg ${stairs ? "stairs" : ""} ${off ? "off" : ""} ${inFocus ? "focus" : ""}" pathLength="1" style="animation-delay:${Math.round(acc / total * 700)}ms" x1="${P(a).x}" y1="${P(a).y}" x2="${P(b).x}" y2="${P(b).y}"/>`;
        acc += adj[a][b];
      }
      layer.innerHTML = html;
    }
    function updateRoute(fit = true) {
      cancelAnimationFrame(walkRAF);
      activeStep = -1; result = null; steps = [];
      const out = $("#routeOut"); const { from, to } = mapState;
      if (!to) { out.innerHTML = `<div class="card empty">${icon("pin")}<p style="margin-top:8px">Pick a destination, or tap a place on the map.</p></div>`; drawRoute(); if (fit) flyTo({ k: 1, x: 0, y: 0 }); return; }
      if (from === to) { out.innerHTML = `<div class="card empty"><b>You're already here.</b><p>Start and destination are the same place.</p></div>`; drawRoute(); return; }
      result = route(from, to, { stepFree: mapState.stepFree });
      if (!result) {
        out.innerHTML = `<div class="card"><span class="chip warn">No route</span><p style="margin-top:10px">${mapState.stepFree && route(from, to) ? "There's no step-free way to reach this place — Level 1 is only reachable by stairs. Turn off “Step-free” to see the stairs route." : "These two places aren't connected yet."}</p></div>`;
        drawRoute(); return;
      }
      steps = buildSteps(result.path);
      const arrive = new Date(now().getTime() + result.seconds * 1000);
      const ico = { up: "up", left: "left", right: "right", stairs: "stairs", flag: "flag" };
      out.innerHTML = `<div class="card"><div class="summary">
          <div><b class="mono">${fmtDur(result.seconds)}</b><span>WALK</span></div>
          <div><b class="mono">${Math.round(result.metres)} m</b><span>DISTANCE</span></div>
          <div><b class="mono">${fmtDate(arrive)}</b><span>ARRIVE</span></div></div>
          ${result.levels ? `<p class="muted" style="margin-top:12px;font-size:13px">${icon("stairs")} Includes a level change via stairs.</p>` : ""}
          <div class="row" style="margin-top:14px"><button class="btn primary" id="btnPlay">${icon("play")}Preview walk</button><button class="btn" id="btnClear">Clear</button></div></div>
        <div class="card"><h2>Directions</h2><ol class="steps">${steps.map((s, i) => `<li><button data-step="${i}"><span class="step-ico">${icon(ico[s.kind] || "up")}</span><span>${esc(s.text)}<br><small>${esc(s.sub)}</small></span><small class="mono">${Math.round(s.m)} m</small></button></li>`).join("")}</ol></div>`;
      const startFloor = floorOf(result.path[0]);
      setFloor(startFloor, true); setFloor(startFloor);
      if (fit) flyTo(frame(result.path));
    }
    const sync = () => { $("#selFrom").value = mapState.from; $("#selTo").value = mapState.to; };
    $("#selFrom").onchange = e => { mapState.from = e.target.value; updateRoute(); };
    $("#selTo").onchange = e => { mapState.to = e.target.value; updateRoute(); };
    $("#chkFree").onchange = e => { mapState.stepFree = e.target.checked; updateRoute(); };
    $("#btnSwap").onclick = () => { if (!mapState.to) return; [mapState.from, mapState.to] = [mapState.to, mapState.from]; sync(); updateRoute(); };
    svg.addEventListener("click", e => { const p = e.target.closest(".pin"); if (!p) return; mapState[e.shiftKey ? "from" : "to"] = p.dataset.id; sync(); updateRoute(); });
    svg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const p = e.target.closest(".pin"); if (p) { e.preventDefault(); p.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: e.shiftKey })); } } });
    $("#routeOut").addEventListener("click", e => {
      const sb = e.target.closest("[data-step]");
      if (sb) {
        activeStep = +sb.dataset.step; $$("[data-step]").forEach(b => b.removeAttribute("aria-current")); sb.setAttribute("aria-current", "step");
        const s = steps[activeStep], ids = result.path.slice(s.from, s.to + 1), f = floorOf(result.path[s.to]);
        if (floorOf(result.path[s.from]) === f && f !== mapState.floor) setFloor(f, true);
        drawRoute(); flyTo(frame(ids, 120)); return;
      }
      if (e.target.closest("#btnClear")) { mapState.to = ""; sync(); updateRoute(); }
      if (e.target.closest("#btnPlay")) playWalk();
    });
    function playWalk() {
      cancelAnimationFrame(walkRAF);
      const pts = result.path.map(id => ({ id, ...P(id) })), seg = [];
      let len = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); len += d; }
      const dur = prefs.motion === "off" ? 300 : clamp(len * 14, 2500, 9000), t0 = performance.now();
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("r", 8); dot.setAttribute("class", "walker");
      $("#walkerLayer").replaceChildren(dot);
      const tick = ts => {
        const p = clamp((ts - t0) / dur, 0, 1); let d = p * len, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const t = seg[i] ? d / seg[i] : 1, a = pts[i], b = pts[i + 1];
        dot.setAttribute("cx", a.x + (b.x - a.x) * t); dot.setAttribute("cy", a.y + (b.y - a.y) * t);
        const f = floorOf(t < .5 ? a.id : b.id); if (f !== mapState.floor && !isStairEdge(a.id, b.id)) setFloor(f);
        if (p < 1) walkRAF = requestAnimationFrame(tick); else toast(`Arrived at ${label(mapState.to)}`);
      };
      walkRAF = requestAnimationFrame(tick);
    }
    setFloor(0, true); updateRoute(!!mapState.to);
    return () => { cancelAnimationFrame(anim); cancelAnimationFrame(walkRAF); removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp); removeEventListener("pointercancel", onUp); };
  };

  /* ================= TIMETABLE ================= */
  renderers.timetable = view => {
    const week = DAYS.slice(1, 7), H0 = 8, H1 = 18, n = now();
    const today = DAYS[n.getDay()], nm = n.getHours() * 60 + n.getMinutes();
    const cols = week.map(d => {
      const items = timetable.filter(c => c.day === d).map(c => {
        const s = toMin(c.startTime), e = toMin(c.endTime), live = d === today && nm >= s && nm < e;
        return `<button class="block ${live ? "live" : ""}" style="top:${s - H0 * 60}px;height:${e - s - 3}px" data-go="map:to=${esc(c.location)}" title="Navigate to ${esc(label(c.location))}"><b>${esc(c.subject)}</b>${esc(label(c.location))}<br><span class="mono">${fmtMin(s)}</span></button>`;
      }).join("");
      const lines = Array.from({ length: H1 - H0 }, (_, i) => `<div class="hl" style="top:${i * 60}px"></div>`).join("");
      const nowline = d === today && nm >= H0 * 60 && nm < H1 * 60 ? `<div class="nowline" style="top:${nm - H0 * 60}px"></div>` : "";
      return `<div class="col ${d === today ? "today" : ""}" style="height:${(H1 - H0) * 60}px">${lines}${items}${nowline}</div>`;
    }).join("");
    view.innerHTML = `<div class="row wrap" style="margin-bottom:16px;justify-content:space-between"><p class="muted">Tap any class to navigate to its room. Class reps' edits from the CR page are applied automatically.</p><a class="btn sm" href="../cr.html">Open CR editor</a></div>
      <div class="week"><div class="head"></div>${week.map(d => `<div class="head ${d === today ? "today" : ""}">${d.slice(0, 3)}<small>${timetable.filter(c => c.day === d).length} classes</small></div>`).join("")}
      <div class="hours">${Array.from({ length: H1 - H0 }, (_, i) => `<div class="mono">${fmtMin((H0 + i) * 60).replace(":00", "")}</div>`).join("")}</div>${cols}</div>`;
    const id = setInterval(() => { if (now().getSeconds() === 0) render(); }, 1000);
    return () => clearInterval(id);
  };

  /* ================= EVENTS / CLUBS / EXPLORE ================= */
  function listView({ view, items, cats, searchKey, card, placeholder }) {
    let cat = "All", q = "";
    view.innerHTML = `<div class="toolbar"><div class="field"><label class="sr" for="lq">Search</label><input id="lq" type="search" placeholder="${esc(placeholder)}"></div>
      <div class="seg-control" role="group" aria-label="Category">${["All", ...cats].map(c => `<button aria-pressed="${c === "All"}" data-cat="${c}">${c}</button>`).join("")}</div></div><div class="cards" id="cards"></div>`;
    const paint = () => {
      const list = items().filter(i => (cat === "All" || i.cat === cat || i.tag === cat) && searchKey(i).toLowerCase().includes(q));
      $("#cards").innerHTML = list.length ? list.map(card).join("") : `<div class="card empty" style="grid-column:1/-1">Nothing matches “${esc(q)}”.</div>`;
    };
    $("#lq").oninput = e => { q = e.target.value.trim().toLowerCase(); paint(); };
    view.addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; cat = b.dataset.cat; $$("[data-cat]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); paint(); });
    view.repaint = paint; paint();
  }

  renderers.events = view => {
    listView({
      view, cats: ["Technical", "Social", "Academic", "Club"], placeholder: "Search events…",
      items: () => allEvents().map(e => ({ ...e, when: eventDate(e) })).sort((a, b) => a.when - b.when),
      searchKey: e => `${e.title} ${e.cat} ${label(e.loc)}`,
      card: e => `<article class="card item"><div class="row"><span class="chip accent">${e.cat}</span><span class="chip ${rsvps.has(e.id) ? "good" : ""}">${rsvps.has(e.id) ? "Going" : relDay(e.when)}</span></div>
        <h3>${esc(e.title)}</h3><p>${esc(e.about)}</p>
        <div class="meta"><span>${icon("clock")}${relDay(e.when)}, ${fmtDate(e.when)} – ${fmtMin(toMin(e.end))}</span><span>${icon("pin")}${esc(label(e.loc))}</span></div>
        <div class="actions"><button class="btn sm ${rsvps.has(e.id) ? "" : "primary"}" data-rsvp="${e.id}">${rsvps.has(e.id) ? "Cancel RSVP" : "I'm going"}</button><button class="btn sm" data-go="map:to=${esc(e.loc)}">${icon("pin")}Navigate</button><button class="btn sm ghost" data-ics="${e.id}" aria-label="Add to calendar">${icon("download")}.ics</button></div></article>`
    });
  };

  renderers.clubs = view => {
    listView({
      view, cats: ["Technical", "Academic", "Social", "Creative"], placeholder: "Search clubs…",
      items: () => CLUBS, searchKey: c => `${c.name} ${c.tag} ${c.about}`,
      card: c => `<article class="card item"><div class="row"><div class="avatar">${esc(c.name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase())}</div><div><h3>${esc(c.name)}</h3><span class="chip">${c.tag}</span></div></div>
        <p>${esc(c.about)}</p><div class="meta"><span>${icon("users")}${c.members + (joined.has(c.id) ? 1 : 0)} members</span><span>${icon("pin")}Meets at ${esc(label(c.loc))}</span></div>
        <div class="actions"><button class="btn sm ${joined.has(c.id) ? "" : "primary"}" data-join="${c.id}">${joined.has(c.id) ? "Leave club" : "Join club"}</button><button class="btn sm" data-go="map:to=${esc(c.loc)}">${icon("pin")}Navigate</button></div></article>`
    });
  };

  renderers.explore = view => {
    listView({
      view, cats: ["Study", "Food", "Facilities", "Nearby"], placeholder: "Search places…",
      items: () => PLACES, searchKey: p => `${p.name} ${p.cat} ${p.about}`,
      card: p => `<article class="card item"><div class="row"><div class="avatar">${icon(p.icon)}</div><div><h3>${esc(p.name)}</h3><span class="chip">${p.cat}</span></div></div><p>${esc(p.about)}</p>
        <div class="actions">${p.loc ? `<button class="btn sm primary" data-go="map:to=${esc(p.loc)}">${icon("pin")}Navigate · ${fmtDur(walkSeconds("main-gate", p.loc))}</button>` : `<span class="chip">Not on campus map</span>`}</div></article>`
    });
  };

  function downloadICS(ev) {
    const d = eventDate(ev), pad = n => String(n).padStart(2, "0"), end = new Date(d); end.setHours(0, toMin(ev.end), 0, 0);
    const f = t => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CampusNav//EN", "BEGIN:VEVENT", `UID:${ev.id}@campusnav`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(d)}`, `DTEND:${f(end)}`, `SUMMARY:${ev.title}`, `LOCATION:${label(ev.loc)}`, `DESCRIPTION:${ev.about}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), download: `${ev.title.replace(/\W+/g, "-")}.ics` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ================= notifications ================= */
  const notifs = () => raw.get(NOTIF_KEY, []);
  function pushNotif(type, title, body) {
    const list = [{ id: Date.now(), ts: Date.now(), type, title, body, read: false }, ...notifs()].slice(0, 40);
    raw.set(NOTIF_KEY, list); paintBell();
  }
  function paintBell() {
    const n = notifs().filter(x => !x.read).length, b = $("#bellBadge");
    b.hidden = !n; b.textContent = n > 9 ? "9+" : n;
  }
  const NOTIF_ICON = { class: "edit", event: "ticket", notice: "shield" };
  function openNotifs() {
    const list = notifs();
    $("#notifBody").innerHTML = `<h2>Notifications</h2><div class="notif-list">${list.length ? list.map(x => `<div class="notif ${x.read ? "" : "unread"}"><span class="step-ico">${icon(NOTIF_ICON[x.type] || "bell")}</span><div><b>${esc(x.title)}</b><br>${esc(x.body)}<br><small>${new Date(x.ts).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</small></div></div>`).join("") : `<div class="empty">You're all caught up.<br><small>Class changes, new events and campus notices show up here.</small></div>`}</div>
      <div class="row" style="justify-content:flex-end">${list.length ? '<button class="btn" id="clearNotifs">Clear all</button>' : ""}<button class="btn primary" id="closeNotifs">Done</button></div>`;
    raw.set(NOTIF_KEY, list.map(x => ({ ...x, read: true }))); paintBell();
    $("#notifs").showModal();
  }
  $("#bellBtn").onclick = openNotifs;
  $("#notifs").addEventListener("click", e => {
    if (e.target.id === "clearNotifs") { raw.set(NOTIF_KEY, []); openNotifs(); }
    if (e.target.id === "closeNotifs" || e.target === $("#notifs")) $("#notifs").close();
  });

  /* ================= MANAGE (role dashboards) ================= */
  const roomOptions = sel => Object.keys(adj).filter(isNamed).sort((a, b) => label(a).localeCompare(label(b))).map(id => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(label(id))}</option>`).join("");
  const demoNote = `<p class="muted" style="font-size:13px;margin-top:4px">Demo mode: changes are saved on this device only. A live version would sign users in and sync through a server so every student sees updates instantly.</p>`;

  renderers.manage = view => {
    if (prefs.role === "student") { go("home"); return; }
    ({ cr: manageCR, club: manageClub, admin: manageAdmin })[prefs.role](view);
  };

  function manageCR(view) {
    const selId = store.get("crClass", timetable[0]?.id);
    view.innerHTML = `<div class="manage"><section class="card"><h2>${icon("edit")} Update a class</h2><form class="form" id="crForm">
        <div class="field"><label for="crClass">Class</label><select id="crClass">${timetable.map(c => `<option value="${c.id}" ${c.id === selId ? "selected" : ""}>${c.day.slice(0, 3)} · ${esc(c.subject)}</option>`).join("")}</select></div>
        <div class="field"><label for="crRoom">Room</label><select id="crRoom"></select></div>
        <div class="two"><div class="field"><label for="crStart">Starts</label><input type="time" id="crStart" required></div><div class="field"><label for="crEnd">Ends</label><input type="time" id="crEnd" required></div></div>
        <div class="diff" id="crDiff"></div>
        <div class="row wrap"><button class="btn primary" type="submit">${icon("bell")}Publish &amp; notify students</button><button class="btn" type="button" id="crReset">Reset to original</button></div></form></section>
      <section class="card"><h2>What students will see</h2><div id="crPreview"></div>${demoNote}</section></div>`;
    const cls = () => timetable.find(c => c.id === $("#crClass").value), orig = () => baseTimetable.find(c => c.id === $("#crClass").value);
    function load() { const c = cls(); store.set("crClass", c.id); $("#crRoom").innerHTML = roomOptions(c.location); $("#crStart").value = c.startTime; $("#crEnd").value = c.endTime; preview(); }
    function preview() {
      const c = cls(), o = orig(), loc = $("#crRoom").value, s = $("#crStart").value, e = $("#crEnd").value;
      const changed = loc !== o.location || s !== o.startTime || e !== o.endTime;
      $("#crDiff").innerHTML = changed ? `<span class="chip warn">Differs from original</span><s>${esc(label(o.location))} · ${fmtMin(toMin(o.startTime))}</s> → <b>${esc(label(loc))} · ${s ? fmtMin(toMin(s)) : "—"}</b>` : `<span class="chip">Matches the original timetable</span>`;
      $("#crPreview").innerHTML = `<div class="notif unread"><span class="step-ico">${icon("edit")}</span><div><b>${esc(c.subject)} updated</b><br>${esc(c.day)} · ${s ? fmtMin(toMin(s)) : "—"} – ${e ? fmtMin(toMin(e)) : "—"} · ${esc(label(loc))}<br><small>from your Class Rep</small></div></div><button class="btn sm" style="margin-top:12px" data-go="map:to=${esc(loc)}">${icon("pin")}Students tap here to navigate</button>`;
    }
    $("#crClass").onchange = load; ["crRoom", "crStart", "crEnd"].forEach(id => $("#" + id).oninput = preview);
    $("#crForm").onsubmit = ev => {
      ev.preventDefault(); const c = cls(), s = $("#crStart").value, e = $("#crEnd").value;
      if (toMin(e) <= toMin(s)) { toast("End time must be after the start time"); return; }
      const patch = { location: $("#crRoom").value, startTime: s, endTime: e }, ov = raw.get(OVERRIDES_KEY, {});
      ov[c.id] = patch; raw.set(OVERRIDES_KEY, ov); Object.assign(c, patch);
      pushNotif("class", `${c.subject} updated`, `${c.day} · ${fmtMin(toMin(s))} – ${fmtMin(toMin(e))} · ${label(patch.location)}`);
      toast("Published — students notified"); preview();
    };
    $("#crReset").onclick = () => {
      const c = cls(), ov = raw.get(OVERRIDES_KEY, {}); delete ov[c.id]; raw.set(OVERRIDES_KEY, ov);
      Object.assign(c, orig()); pushNotif("class", `${c.subject} restored`, "Back to the original timetable."); toast("Reset to original"); load();
    };
    load();
  }

  function manageClub(view) {
    const today = new Date(now().getTime() - now().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const mine = () => raw.get(CLUB_EVENTS_KEY, []);
    view.innerHTML = `<div class="manage"><section class="card"><h2>${icon("ticket")} Publish an event</h2><form class="form" id="clubForm">
        <div class="field"><label for="ceClub">Club</label><select id="ceClub">${CLUBS.map(c => `<option>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="ceName">Event name</label><input type="text" id="ceName" required maxlength="60" placeholder="e.g. Line-follower workshop"></div>
        <div class="two"><div class="field"><label for="ceDate">Date</label><input type="date" id="ceDate" min="${today}" value="${today}" required></div><div class="field"><label for="ceTime">Time</label><input type="time" id="ceTime" value="16:00" required></div></div>
        <div class="field"><label for="ceLoc">Location</label><select id="ceLoc">${roomOptions("block-a")}</select></div>
        <div class="field"><label for="ceDesc">Description</label><textarea id="ceDesc" maxlength="200" placeholder="What should students bring or expect?"></textarea></div>
        <button class="btn primary" type="submit">${icon("bell")}Publish to campus</button></form></section>
      <section class="card"><h2>Your published events</h2><div id="ceList"></div>${demoNote}</section></div>`;
    const paint = () => {
      const list = mine();
      $("#ceList").innerHTML = list.length ? list.map(e => `<div class="notif" style="margin-bottom:8px"><span class="step-ico">${icon("ticket")}</span><div><b>${esc(e.name)}</b><br><small>${esc(e.club || "")} · ${esc(e.date)} ${esc(e.time)} · ${esc(label(e.location))}</small><br><button class="btn sm ghost" data-del="${e.id}" style="margin-top:6px;padding:0">${icon("trash")}Remove</button></div></div>`).join("") : `<div class="empty">Nothing published yet.<br><small>Events you publish appear in everyone's Events tab.</small></div>`;
    };
    $("#clubForm").onsubmit = ev => {
      ev.preventDefault();
      const e = { id: Date.now(), name: $("#ceName").value.trim(), date: $("#ceDate").value, time: $("#ceTime").value, location: $("#ceLoc").value, description: $("#ceDesc").value.trim(), club: $("#ceClub").value };
      if (!e.name) return;
      raw.set(CLUB_EVENTS_KEY, [...mine(), e]); pushNotif("event", `New event: ${e.name}`, `${e.club} · ${e.date} ${fmtMin(toMin(e.time))} · ${label(e.location)}`);
      $("#ceName").value = ""; $("#ceDesc").value = ""; toast("Event published to campus"); paint();
    };
    $("#ceList").onclick = ev => { const b = ev.target.closest("[data-del]"); if (!b) return; raw.set(CLUB_EVENTS_KEY, mine().filter(e => String(e.id) !== b.dataset.del)); paint(); toast("Event removed"); };
    paint();
  }

  function manageAdmin(view) {
    const changed = Object.keys(raw.get(OVERRIDES_KEY, {})).length, published = raw.get(CLUB_EVENTS_KEY, []).length, log = notifs();
    view.innerHTML = `<div class="grid stats-grid">
        ${[["Classes", timetable.length, "on the timetable"], ["Changed by CRs", changed, "overrides active"], ["Club events", published, "published by clubs"], ["Notifications", log.length, "sent so far"]].map(([a, b, c]) => `<div class="card stat"><span>${a}</span><b>${b}</b><span style="font-weight:400">${c}</span></div>`).join("")}</div>
      <div class="manage" style="margin-top:16px"><section class="card"><h2>${icon("shield")} Broadcast a notice</h2><form class="form" id="noticeForm">
        <div class="field"><label for="nTitle">Title</label><input type="text" id="nTitle" required maxlength="60" placeholder="e.g. Library closes early on Friday"></div>
        <div class="field"><label for="nBody">Message</label><textarea id="nBody" required maxlength="240"></textarea></div>
        <button class="btn primary" type="submit">${icon("bell")}Send to all students</button></form>${demoNote}</section>
      <section class="card"><h2>Recent activity</h2><div class="notif-list">${log.length ? log.slice(0, 8).map(x => `<div class="notif"><span class="step-ico">${icon(NOTIF_ICON[x.type] || "bell")}</span><div><b>${esc(x.title)}</b><br><small>${esc(x.body)}</small></div></div>`).join("") : `<div class="empty">No activity yet. Switch role to CR or Club Admin and publish something.</div>`}</div></section></div>`;
    $("#noticeForm").onsubmit = ev => { ev.preventDefault(); pushNotif("notice", $("#nTitle").value.trim(), $("#nBody").value.trim()); toast("Notice sent"); render(); };
  }

  /* ================= global interactions ================= */
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-go]");
    if (g) { const [name, q] = g.dataset.go.split(":"); go(name, Object.fromEntries(new URLSearchParams(q || ""))); return; }
    if (e.target.closest("[data-act=palette]")) { openPalette(); return; }
    const r = e.target.closest("[data-rsvp]");
    if (r) { const id = r.dataset.rsvp; rsvps.has(id) ? rsvps.delete(id) : rsvps.add(id); store.set("rsvps", [...rsvps]); toast(rsvps.has(id) ? "You're going — see you there" : "RSVP cancelled"); $("#view").repaint?.(); return; }
    const j = e.target.closest("[data-join]");
    if (j) { const id = j.dataset.join; joined.has(id) ? joined.delete(id) : joined.add(id); store.set("joined", [...joined]); toast(joined.has(id) ? "Welcome to the club" : "You left the club"); $("#view").repaint?.(); return; }
    const c = e.target.closest("[data-ics]");
    if (c) { downloadICS(allEvents().find(x => x.id === c.dataset.ics)); toast("Calendar file downloaded"); }
  });
  addEventListener("hashchange", render);

  /* ---- theme & settings ---- */
  const mq = matchMedia("(prefers-color-scheme: dark)");
  function applyPrefs() {
    const dark = prefs.theme === "dark" || (prefs.theme === "system" && mq.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.accent = prefs.accent;
    document.documentElement.dataset.motion = prefs.motion;
    $("#themeBtn").innerHTML = icon(dark ? "sun" : "moon");
    store.set("prefs", prefs);
  }
  mq.addEventListener?.("change", () => prefs.theme === "system" && applyPrefs());
  $("#themeBtn").onclick = () => { const dark = document.documentElement.dataset.theme === "dark"; prefs.theme = dark ? "light" : "dark"; applyPrefs(); };

  let deferredInstall = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
  function installHTML() {
    if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) return `<div class="install"><b>${icon("check")} Installed</b>You're running CampusNav as an app.</div>`;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return `<div class="install"><b>Install CampusNav</b>${deferredInstall ? `<button class="btn primary" id="installBtn">Add to home screen</button>` : ios ? "On iPhone: tap the Share button, then “Add to Home Screen”." : "Android/Chrome: open the ⋮ menu and choose “Install app”. (Works over https.)"}</div>`;
  }
  const ACCENTS = { blue: "#2563eb", violet: "#7c3aed", emerald: "#0f8f61", orange: "#d9560b", rose: "#d6336c" };
  function openSettings() {
    $("#settingsBody").innerHTML = `<h2>Settings</h2>
      <div class="field"><label>Demo role — see the app as…</label><div class="role-grid">${Object.entries(ROLES).map(([k, r]) => `<button aria-pressed="${prefs.role === k}" data-role-set="${k}"><b>${r.name}</b><small>${r.about}</small></button>`).join("")}</div></div>
      ${installHTML()}
      <div class="field"><label>Theme</label><div class="seg-control" role="radiogroup">${["system", "light", "dark"].map(t => `<button role="radio" aria-checked="${prefs.theme === t}" data-theme-set="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div></div>
      <div class="field"><label>Accent colour</label><div class="swatches">${Object.entries(ACCENTS).map(([k, c]) => `<button style="background:${c}" aria-label="${k}" aria-pressed="${prefs.accent === k}" data-accent-set="${k}"></button>`).join("")}</div></div>
      <label class="switch"><input type="checkbox" id="motionChk" ${prefs.motion === "off" ? "" : "checked"}>Animations</label>
      <p class="muted" style="font-size:13px">Shortcuts: <kbd>Ctrl</kbd>+<kbd>K</kbd> search · <kbd>g</kbd> then <kbd>h</kbd> <kbd>m</kbd> <kbd>t</kbd> <kbd>e</kbd> <kbd>c</kbd> to jump · <kbd>t</kbd> toggle theme.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="closeSettings">Done</button></div>`;
    $("#settings").showModal();
  }
  $("#openSettings").onclick = openSettings;
  $("#settings").addEventListener("click", e => {
    const rs = e.target.closest("[data-role-set]");
    if (rs) { prefs.role = rs.dataset.roleSet; applyPrefs(); renderNav(); if (current.name === "manage") render(); openSettings(); toast(`Now viewing as ${ROLES[prefs.role].name}`); return; }
    if (e.target.id === "installBtn" && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return; }
    const t = e.target.closest("[data-theme-set]"), a = e.target.closest("[data-accent-set]");
    if (t) prefs.theme = t.dataset.themeSet; if (a) prefs.accent = a.dataset.accentSet;
    if (e.target.id === "motionChk") prefs.motion = e.target.checked ? "on" : "off";
    if (t || a || e.target.id === "motionChk") { applyPrefs(); if (!e.target.id) openSettings(); }
    if (e.target.id === "closeSettings" || e.target === $("#settings")) $("#settings").close();
  });

  /* ---- command palette ---- */
  const pal = $("#palette"), palInput = $("#palInput"), palList = $("#palList");
  let palItems = [], palSel = 0;
  function score(q, text) {
    q = q.toLowerCase(); text = text.toLowerCase(); if (!q) return 1;
    if (text.startsWith(q)) return 100; const i = text.indexOf(q); if (i >= 0) return 80 - Math.min(i, 30);
    let ti = 0; for (const ch of q) { ti = text.indexOf(ch, ti); if (ti < 0) return 0; ti++; } return 20;
  }
  function commands() {
    const list = [];
    viewsFor().forEach(v => list.push({ g: "Go to", t: v[1], ic: v[2], run: () => go(v[0]) }));
    list.push({ g: "Actions", t: "Toggle dark mode", ic: "moon", run: () => $("#themeBtn").click() }, { g: "Actions", t: "Open settings", ic: "gear", run: openSettings });
    Object.keys(adj).filter(isNamed).forEach(id => list.push({ g: "Places", t: label(id), s: floorOf(id) ? "Level 1" : (campusLocations[id].type || ""), ic: "pin", run: () => go("map", { to: id }) }));
    timetable.forEach(c => list.push({ g: "Classes", t: c.subject, s: `${c.day.slice(0, 3)} ${fmtMin(toMin(c.startTime))}`, ic: "cal", run: () => go("map", { to: c.location }) }));
    allEvents().forEach(ev => list.push({ g: "Events", t: ev.title, s: ev.cat, ic: "ticket", run: () => go("events") }));
    CLUBS.forEach(c => list.push({ g: "Clubs", t: c.name, s: c.tag, ic: "users", run: () => go("clubs") }));
    return list;
  }
  function paintPal() {
    const q = palInput.value.trim(), all = commands();
    palItems = all.map(i => ({ i, s: score(q, i.t + " " + (i.s || "")) })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 40).map(x => x.i);
    palSel = 0; let g = "";
    palList.innerHTML = palItems.map((i, k) => `${i.g !== g ? `<li class="pal-group" role="presentation">${g = i.g}</li>` : ""}<li class="pal-item" role="option" id="po${k}" data-k="${k}" aria-selected="${k === 0}">${icon(i.ic)}<span>${esc(i.t)}</span><small>${esc(i.s || "")}</small></li>`).join("") || `<li class="empty">No results for “${esc(q)}”</li>`;
  }
  function selPal(k) {
    if (!palItems.length) return; palSel = (k + palItems.length) % palItems.length;
    $$(".pal-item", palList).forEach(el => el.setAttribute("aria-selected", String(+el.dataset.k === palSel)));
    const el = $(`#po${palSel}`); el.scrollIntoView({ block: "nearest" }); palInput.setAttribute("aria-activedescendant", el.id);
  }
  function openPalette() { if (!pal.open) pal.showModal(); palInput.value = ""; paintPal(); palInput.focus(); }
  const runPal = k => { const it = palItems[k]; if (!it) return; pal.close(); it.run(); };
  palInput.addEventListener("input", paintPal);
  palInput.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); selPal(palSel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selPal(palSel - 1); }
    else if (e.key === "Enter") { e.preventDefault(); runPal(palSel); }
  });
  palList.addEventListener("click", e => { const li = e.target.closest(".pal-item"); if (li) runPal(+li.dataset.k); });
  pal.addEventListener("click", e => { if (e.target === pal) pal.close(); });
  $("#openPalette").onclick = openPalette;

  /* ---- keyboard shortcuts ---- */
  let chord = 0;
  addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.open ? pal.close() : openPalette(); return; }
    if (e.target.closest("input, select, textarea, dialog") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); openPalette(); return; }
    if (e.key === "t" && !chord) { $("#themeBtn").click(); return; }
    if (e.key === "g") { chord = Date.now(); return; }
    if (chord && Date.now() - chord < 1200) {
      const m = { h: "home", m: "map", t: "timetable", e: "events", c: "clubs", x: "explore", a: prefs.role !== "student" ? "manage" : null }[e.key];
      if (m) go(m); chord = 0;
    }
  });

  /* ---- header clock ---- */
  const tickClock = () => { const n = now(); $("#clockChip").textContent = `${DAYS[n.getDay()].slice(0, 3)} ${fmtDate(n)}`; };
  setInterval(tickClock, 1000);

  applyPrefs(); tickClock(); paintBell(); render();
})();
