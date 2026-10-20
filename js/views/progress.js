// The Progress tab: calendar, badges, points, report and charts.
import { DIFF, P, PROFILES, TODAY, avatarHtml, bonusDates, cycleStart, dayName, esc, funAt, listText, paceOf, personToggle, profileIds, seg, state } from "../app.js";
import * as A from "../a11y.js";
import * as F from "../fun.js";
import * as S from "../stats.js";
import { ALL_EX, FOCUS, PAIN_AREAS, PLAN } from "../plan.js";
import { areaCard } from "./areas.js";

// ---------------------------------------------------------------- calendar & badges & points
function progCalendar() {
  const ids = profileIds(); const m = state.calMonth || TODAY().slice(0, 7);
  const [y, mo] = m.split("-").map(Number); const first = new Date(y, mo - 1, 1);
  const start = S.addDays(S.ymd(first), -((first.getDay() + 6) % 7));
  const byDate = {}; for (const s of state.data.sessions) if ((s.exercises || []).some(e => e.sets?.length)) (byDate[s.date] ||= new Set()).add(s.user);
  const commute = new Set(state.data.activities.filter(a => a.type === "Bike commute").map(a => `${a.user}|${a.date}`));
  const cells = Array.from({ length: 42 }, (_, i) => S.addDays(start, i));
  const prev = S.ymd(new Date(y, mo - 2, 1)).slice(0, 7), next = S.ymd(new Date(y, mo, 1)).slice(0, 7);
  return `<section class="card">
    <div class="between"><button class="btn small" data-act="calMonth" data-v="${prev}">‹</button><h3 class="h3">${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3><button class="btn small" data-act="calMonth" data-v="${next}">›</button></div>
    <div class="cal">${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => `<div class="dow" aria-hidden="true">${d[0]}</div>`).join("")}
      ${cells.map(d => { const who = ids.filter(id => byDate[d]?.has(id)); const bike = ids.filter(id => commute.has(`${id}|${d}`));
        const said = `${S.fmtDate(d)}${d === TODAY() ? ", today" : ""}: ${who.length ? listText(who.map(id => P(id).name)) + " worked out" : "no workouts"}${bike.length ? ", bike commute" : ""}.`;
        return `<div class="d ${d.slice(0, 7) !== m ? "out" : ""} ${d === TODAY() ? "today" : ""}"><span aria-hidden="true">${+d.slice(8)}</span><span class="visually-hidden">${esc(said)}</span><div class="dots" aria-hidden="true">${who.map(id => `<i style="background:${esc(P(id).color)}" data-i="${esc((P(id).name || "?")[0].toUpperCase())}"></i>`).join("")}${bike.length ? `<i class="bike">🚲</i>` : ""}</div></div>`; }).join("")}</div>
    <div class="row small" aria-hidden="true">${ids.map(id => `<span><i class="cal-key" style="background:${esc(P(id).color)}" data-i="${esc((P(id).name || "?")[0].toUpperCase())}"></i> ${esc(P(id).name)}</span>`).join("")}</div>
  </section>
  <section class="card"><h3 class="h3">Streaks</h3><p class="small muted">A streak week has 3 or more workouts.</p>
    ${ids.map(id => { const st = F.streaks(state.data.sessions, id, TODAY(), paceOf(id), bonusDates(id)); return `<div class="list-item"><span>${avatarHtml(id)}${esc(P(id).name)}</span><span class="small mono">🔥 ${st.current} now · best ${st.longest} · ${st.days} workouts</span></div>`; }).join("")}</section>`;
}
function progBadges() {
  const u = state.viewUser; const got = F.earnedBadges(state.data.sessions, state.data.body, state.data.activities, u, TODAY());
  return `<section class="card"><h3 class="h3">${esc(P(u).name)}'s badges · ${got.size}/${F.BADGES.length}</h3>
    <div class="badges">${F.BADGES.map(b => `<div class="badge ${got.has(b.id) ? "" : "locked"}"><span class="i">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join("")}</div></section>`;
}
function progPoints() {
  const ids = profileIds(); const mon = S.mondayOf(TODAY());
  const rows = ids.map(id => ({ id, wk: F.points(state.data.sessions, state.data.activities, id, mon, TODAY()), all: F.points(state.data.sessions, state.data.activities, id) })).sort((a, b) => b.wk - a.wk);
  return `<section class="card"><h3 class="h3">This week's leaderboard</h3>
    <p class="small muted">Points: 10 per exercise, 15 cardio, 10 bike commute, 5 warm-up, 5 check-in, 20 finished workout, 25 personal best. Resets Monday.</p>
    ${rows.map((r, i) => { const lv = F.level(r.all); return `<div class="list-item"><span>${["🥇", "🥈", "🥉"][i] || ""} ${avatarHtml(r.id)}${esc(P(r.id).name)}<div class="small muted">Level ${lv.i + 1} · ${esc(lv.name)} · ${r.all} total</div></span><b class="mono">${r.wk}</b></div>`; }).join("")}</section>`;
}

// ---------------------------------------------------------------- PROGRESS
function viewProgress() {
  const tab = state.progTab;
  const tabs = [["lifts", "Lifts"], ["focus", "Focus"], ["cardio", "Cardio"], ["pain", "Pain"], ["calendar", "Calendar"], ["badges", "Badges"], ...(funAt("full") ? [["points", "Points"]] : []), ["history", "History"], ["report", "Cycle report"]];
  const fns = { lifts: progLifts, focus: progFocus, cardio: progCardio, pain: progPain, calendar: progCalendar, badges: progBadges, points: progPoints, history: progHistory, report: progReport };
  const body = (fns[tab] || progLifts)();
  return `<section class="card"><div class="between"><h2 class="h2">Progress</h2>${personToggle()}</div>
    ${seg("progTab", tab, tabs, "Section")}</section>${body}`;
}
function loggedKeys(u) {
  const out = new Map();
  for (const s of S.userSessions(state.data.sessions, u)) for (const e of s.exercises || []) if (!e.skipped && e.sets?.length) out.set(`${e.id}|${e.variant || "std"}`, e.name);
  return out;
}
const displayScore = (kind, sets) => kind === "load" ? Math.round(S.bestScore(kind, sets)) : kind === "carry" ? Math.max(...sets.map(s => s.w || 0)) : S.bestScore(kind, sets);
const scoreLabel = kind => ({ load: "Estimated max (lb)", carry: "Heaviest carry (lb)", assist: "Assist used (lb, lower is better)", time: "Longest hold (sec)", bw: "Most reps in a set" })[kind];

function progLifts() {
  const u = state.viewUser; const logged = loggedKeys(u);
  if (!state.progEx || !(logged.has(state.progEx) || ALL_EX[state.progEx.split("|")[0]])) state.progEx = logged.keys().next().value || `${PLAN.A.Mon.ex[0].id}|std`;
  const [id, v] = state.progEx.split("|");
  const h = S.exHistory(state.data.sessions, u, id, v);
  const def = S.defFor(id, v, h[h.length - 1]);
  const loggedOpts = [...logged.entries()].map(([k, n]) => `<option value="${esc(k)}" ${k === state.progEx ? "selected" : ""}>${esc(n)}${k.endsWith("|hard") ? " (harder)" : k.endsWith("|swap") ? " (swap)" : k.includes("|lib:") ? " (library swap)" : ""}</option>`).join("");
  const planOpts = Object.values(ALL_EX).filter(e => !logged.has(`${e.id}|std`)).map(e => `<option value="${e.id}|std" ${`${e.id}|std` === state.progEx ? "selected" : ""}>${esc(e.n)} · ${e.week} ${dayName(e.day)}</option>`).join("");
  const sug = ALL_EX[id] ? S.suggestion(state.data.sessions, u, id, v) : null;
  let tiles = "", table = "";
  if (h.length) {
    const pb = S.personalBest(state.data.sessions, u, id, v);
    const first = h[0], last = h[h.length - 1];
    const f = displayScore(first.kind, first.sets), l = displayScore(last.kind, last.sets);
    const pct = f ? Math.round(((def.kind === "assist" ? f - l : l - f) / Math.abs(f)) * 100) : null;
    tiles = `<div class="stats">
      <div class="stat"><div class="v">${esc(S.topSetText(pb.kind, pb.db, pb.sets))}</div><div class="l">Best (${S.fmtDate(pb.date)})</div></div>
      <div class="stat"><div class="v">${esc(S.topSetText(last.kind, last.db, last.sets))}</div><div class="l">Latest</div></div>
      <div class="stat"><div class="v">${h.length}</div><div class="l">Times logged</div></div>
      <div class="stat"><div class="v ${pct > 0 ? "good" : pct < 0 ? "bad" : ""}">${pct == null || h.length < 2 ? "—" : (pct > 0 ? "+" : "") + pct + "%"}</div><div class="l">Since first log</div></div></div>`;
    table = `<div class="scroll"><table class="t"><thead><tr><th>Date</th><th>Sets</th><th>Felt</th></tr></thead><tbody>${h.slice().reverse().slice(0, 15).map(e => `<tr><td class="num">${S.fmtDate(e.date)}</td><td>${esc(S.describeSets(e.kind, e.db, e.sets))}</td><td class="num">${e.sets.map(s => DIFF[s.d || 2][0]).join(" ")}</td></tr>`).join("")}</tbody></table></div>`;
  }
  return `<section class="card">
    <label class="field">Exercise<select data-act="progEx">${loggedOpts ? `<optgroup label="Logged">${loggedOpts}</optgroup>` : ""}<optgroup label="Not logged yet">${planOpts}</optgroup></select></label>
    ${sug ? `<div class="pill ${sug.type}">${esc(sug.text)}</div>` : ""}
    ${h.length ? `${tiles}<div class="chart-box"><canvas id="chart-lift"></canvas></div>${table}` : `<p class="muted">No logs for this exercise yet.</p>`}
  </section>`;
}
function progFocus() {
  const u = state.viewUser; const weeks = S.setsByFocus(state.data.sessions, u);
  const keys = Object.keys(weeks).sort().slice(-8);
  const thisWk = weeks[S.mondayOf(TODAY())] || {};
  const groups = ["chest", "shoulders", "arms", "back", "core", "glutes", "legs", "calves"];
  const focus = PROFILES[u].focus;
  return `${areaCard(u, TODAY())}<section class="card"><h3 class="h3">Sets per focus area, per week</h3>
    <p class="small muted">Counts sets marked Right or Hard. For muscle growth, about 10–20 hard sets per muscle group per week is a common target.</p>
    ${keys.length ? `<div class="chart-box"><canvas id="chart-focus"></canvas></div>` : `<p class="muted">Log a workout to see this.</p>`}
    <table class="t"><thead><tr><th>This week</th><th>Sets</th></tr></thead><tbody>${groups.map(g => `<tr><td>${FOCUS[g]}${focus.includes(g) ? ` <span class="tag new">Focus</span>` : ""}</td><td class="num">${thisWk[g] || 0}</td></tr>`).join("")}</tbody></table>
  </section>`;
}
function progCardio() {
  const u = state.viewUser; const t = TODAY();
  const wk = S.cardioTotals(state.data.sessions, state.data.activities, u, S.addDays(t, -6), t);
  const hr = state.data.body.filter(b => b.user === u && b.restingHr).length;
  return `<section class="card"><h3 class="h3">Last 7 days</h3><div class="stats">
    <div class="stat"><div class="v">${wk.gymMinutes}</div><div class="l">Gym cardio minutes</div></div>
    <div class="stat"><div class="v">${wk.hiit}</div><div class="l">Interval sessions</div></div>
    ${PROFILES[u].commute.enabled || wk.commuteDays ? `<div class="stat"><div class="v">${wk.commuteMiles}</div><div class="l">Commute miles (${wk.commuteDays} days)</div></div>` : ""}
    </div></section>
    <section class="card"><h3 class="h3">Weekly cardio</h3><div class="chart-box"><canvas id="chart-cardio"></canvas></div></section>
    <section class="card"><h3 class="h3">Resting heart rate</h3>${hr ? `<div class="chart-box"><canvas id="chart-hr"></canvas></div>` : `<p class="muted small">Add resting heart rate on the Body tab. Take it first thing in the morning, before getting up. A lower number over months means your heart is getting fitter.</p>`}</section>`;
}
function progPain() {
  const u = state.viewUser; const ss = S.userSessions(state.data.sessions, u).filter(s => s.pain);
  return `<section class="card"><h3 class="h3">Pain over time</h3>${ss.length ? `<div class="chart-box"><canvas id="chart-pain"></canvas></div>` : `<p class="muted">Check-ins show up here.</p>`}
    <p class="small muted">A line trending down means healing. A spike after a certain day points at the exercise to change. The cycle report lists which exercises you did on high-pain days.</p></section>`;
}
function progHistory() {
  const u = state.viewUser; const ss = S.userSessions(state.data.sessions, u).reverse();
  if (!ss.length) return `<section class="card"><p class="muted">No workouts logged yet.</p></section>`;
  return `<section class="card">${ss.slice(0, 60).map(s => {
    const n = (s.exercises || []).filter(e => !e.skipped && e.sets?.length).length;
    return `<div class="list-item"><div><b>${S.fmtDate(s.date)}</b> · Week ${esc(s.week)} ${esc(dayName(s.day))}<div class="small muted">${n} exercises${s.cardio?.done ? ` · ${esc(s.cardio.type)} ${s.cardio.minutes || 0} min` : ""}</div></div>
      <div class="row"><button class="btn small" data-act="openDay" data-id="${s.id}">Open</button><button class="btn small danger" data-act="delSession" data-id="${s.id}">${state.confirmDel === s.id ? "Confirm" : "Delete"}</button></div></div>`;
  }).join("")}</section>`;
}

// ---------------------------------------------------------------- REPORT
// The cycle report now lives under Progress.
function progReport() {
  return `<section class="card">${seg("repTab", state.repTab, [["cycle", "Cycle report"], ["compare", "Before & after"]], "Report type")}</section>
    ${state.repTab === "cycle" ? repCycle() : repCompare()}`;
}
function cycleList() {
  const cs = cycleStart(); const cur = S.cycleInfo(TODAY(), cs);
  const dates = [...state.data.sessions, ...state.data.body].map(x => x.date).filter(Boolean).sort();
  const firstIdx = dates.length ? Math.min(S.cycleInfo(dates[0], cs).index, cur.index) : cur.index;
  const out = []; for (let i = cur.index; i >= firstIdx; i--) { const start = S.addDays(S.mondayOf(cs), i * 14); out.push({ index: i, start, end: S.addDays(start, 13) }); }
  return out;
}
function repCycle() {
  const u = state.viewUser; const list = cycleList();
  const c = list.find(x => x.index === state.repCycle) || list[0]; state.repCycle = c.index;
  const r = S.cycleReport({ sessions: state.data.sessions, body: state.data.body, activities: state.data.activities, user: u, start: c.start, end: c.end, today: TODAY() });
  const li = (arr, fn) => arr.length ? `<ul>${arr.map(fn).join("")}</ul>` : `<p class="muted small">None.</p>`;
  const tot = r.diff[1] + r.diff[2] + r.diff[3];
  const inProgress = TODAY() < c.end;
  return `<section class="card report">
    <label class="field">Cycle<select data-act="repCycle">${list.map(x => `<option value="${x.index}" ${x.index === c.index ? "selected" : ""}>${S.fmtDate(x.start)} – ${S.fmtDate(x.end)}${x.index === list[0].index ? " (current)" : ""}</option>`).join("")}</select></label>
    <div class="stats">
      <div class="stat"><div class="v">${r.sessions}/${inProgress ? r.soFar : r.planned}</div><div class="l">${inProgress ? `Workout days so far (${r.planned} in cycle)` : "Workout days"}</div></div>
      <div class="stat"><div class="v">${r.cardio.gymMinutes}</div><div class="l">Cardio minutes</div></div>
      <div class="stat"><div class="v">${r.cardio.hiit}</div><div class="l">Interval sessions</div></div>
      ${r.cardio.commuteDays ? `<div class="stat"><div class="v">${r.cardio.commuteMiles}</div><div class="l">Commute miles</div></div>` : ""}
    </div>
    <h3 class="good">Went up</h3>${li(r.up, x => `<li><b>${esc(x.name)}</b>: best before ${esc(x.before)}, now ${esc(x.sets)}</li>`)}
    <h3>Stalled</h3>${li(r.stalled, x => `<li><b>${esc(x.name)}</b>: best before ${esc(x.before)}, latest ${esc(x.sets)}</li>`)}
    ${r.newEx.length ? `<h3>First time logged</h3>${li(r.newEx, x => `<li><b>${esc(x.name)}</b>: ${esc(x.sets)}</li>`)}` : ""}
    <h3 class="bad">What hurt</h3>
    <table class="t"><thead><tr><th>Area</th><th>Average</th><th>Worst</th></tr></thead><tbody>${Object.entries(r.pain).map(([a, v]) => `<tr><td>${PAIN_AREAS[a]}</td><td class="num">${v ? v.avg : "—"}</td><td class="num">${v ? v.max : "—"}</td></tr>`).join("")}</tbody></table>
    ${r.painDays.length ? `<p class="small">Days with pain 4 or higher:</p>${li(r.painDays, d => `<li>${S.fmtDate(d.date)}: ${esc(d.areas.join(", "))}<div class="small muted">${esc(d.exercises.join(", "))}</div></li>`)}` : ""}
    ${Object.keys(r.bodyChange).length ? `<h3>Body changes</h3>${li(Object.entries(r.bodyChange), ([f, v]) => `<li>${esc(S.BODY_FIELDS[f].label)}: ${v.from} → ${v.to} ${S.BODY_FIELDS[f].unit} (<span class="${S.trendClass(f, v.change)}">${v.change > 0 ? "+" : ""}${v.change}</span>)</li>`)}` : ""}
    ${tot ? `<h3>How sets felt</h3><p class="small">${Math.round(r.diff[1] / tot * 100)}% easy · ${Math.round(r.diff[2] / tot * 100)}% just right · ${Math.round(r.diff[3] / tot * 100)}% hard</p>` : ""}
    <h3>Summary to paste to Claude</h3>
    <p class="small muted">Includes every set of every workout in the cycle.</p>
    <pre class="summary" id="summary" tabindex="0" role="region" aria-label="Summary text">${esc(S.reportText(r))}</pre>
    <button class="btn primary" data-act="copySummary">Copy summary</button>
  </section>`;
}
function repCompare() {
  const u = state.viewUser;
  const dates = [...state.data.sessions, ...state.data.body].filter(x => x.user === u).map(x => x.date).sort();
  const a = state.cmpA || dates[0] || TODAY(), b = state.cmpB || TODAY();
  const c = S.compare({ sessions: state.data.sessions, body: state.data.body, activities: state.data.activities, user: u, a, b });
  return `<section class="card">
    <div class="grid2"><label class="field">Before<input type="date" data-act="cmpA" value="${a}"></label><label class="field">After<input type="date" data-act="cmpB" value="${b}"></label></div>
    <p class="small muted">${c.between} workouts between these dates${c.cardio.gymMinutes ? ` · ${c.cardio.gymMinutes} cardio minutes` : ""}${c.cardio.commuteMiles ? ` · ${c.cardio.commuteMiles} commute miles` : ""}.</p>
    <h3 class="h3">Body</h3>
    ${c.bodyRows.length ? `<div class="scroll"><table class="t"><thead><tr><th></th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${c.bodyRows.map(r => `<tr><td>${esc(r.label)}</td><td class="num">${r.a ? r.a.value : "—"}</td><td class="num">${r.b ? r.b.value : "—"}</td><td class="num ${S.trendClass(r.f, r.change)}">${r.change == null ? "—" : (r.change > 0 ? "+" : "") + r.change + " " + r.unit}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">No body entries yet.</p>`}
    <h3 class="h3">Lifts (best set up to each date)</h3>
    ${c.lifts.length ? `<div class="scroll"><table class="t"><thead><tr><th>Exercise</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${c.lifts.map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.a)}</td><td>${esc(l.b)}</td><td class="num ${l.pct > 0 ? "good" : l.pct < 0 ? "bad" : ""}">${l.pct == null ? "new" : (l.pct > 0 ? "+" : "") + l.pct + "%"}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">No lifts logged yet.</p>`}
  </section>`;
}

// ---------------------------------------------------------------- charts
function destroyCharts() { state.charts.forEach(c => c.destroy()); state.charts = []; }
const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
function chart(id, config) {
  const el = document.getElementById(id); if (!el) return;
  if (!window.Chart) { el.parentElement.innerHTML = `<p class="muted small">Charts need an internet connection the first time the app loads.</p>`; return; }
  Chart.defaults.color = cssVar("--muted"); Chart.defaults.borderColor = cssVar("--line"); Chart.defaults.font.family = cssVar("--body");
  config.options = { animation: A.reduceMotion() ? false : undefined, responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { labels: { boxWidth: 12 } } }, ...config.options };
  state.charts.push(new Chart(el, config));
  A.chartTable(el, config, el.closest("section")?.querySelector("h2, h3")?.textContent?.trim());
}
const PALETTE = () => [cssVar("--mat"), cssVar("--benny"), cssVar("--plate"), cssVar("--warn"), cssVar("--good"), "#8a5a9c", "#4f8fb8", cssVar("--muted")];
const line = (label, data, color, extra = {}) => ({ label, data, borderColor: color, backgroundColor: color, tension: .25, pointRadius: 3, spanGaps: true, ...extra });

function afterRender() {
  const u = state.viewUser;
  if (state.view === "progress") {
    if (state.progTab === "lifts" && state.progEx) {
      const [id, v] = state.progEx.split("|");
      const h = S.exHistory(state.data.sessions, u, id, v); if (!h.length) return;
      const kind = h[h.length - 1].kind;
      const ds = [line(scoreLabel(kind), h.map(e => displayScore(e.kind, e.sets)), cssVar("--accent"))];
      if (kind === "load") ds.push(line("Top weight (lb)", h.map(e => Math.max(...e.sets.map(s => s.w || 0))), cssVar("--plate"), { borderDash: [5, 4] }));
      chart("chart-lift", { type: "line", data: { labels: h.map(e => S.fmtDate(e.date)), datasets: ds }, options: { scales: { y: { reverse: kind === "assist" } } } });
    }
    if (state.progTab === "focus") {
      const weeks = S.setsByFocus(state.data.sessions, u); const keys = Object.keys(weeks).sort().slice(-8);
      const groups = ["chest", "shoulders", "arms", "back", "core", "glutes", "legs", "calves"]; const pal = PALETTE();
      chart("chart-focus", { type: "bar", data: { labels: keys.map(k => S.fmtDate(k)), datasets: groups.map((g, i) => ({ label: FOCUS[g], data: keys.map(k => weeks[k][g] || 0), backgroundColor: pal[i % pal.length] })) }, options: { scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: "Sets" } } } } });
    }
    if (state.progTab === "cardio") {
      const t = TODAY(); const wks = Array.from({ length: 8 }, (_, i) => S.addDays(S.mondayOf(t), -7 * (7 - i)));
      const tots = wks.map(w => S.cardioTotals(state.data.sessions, state.data.activities, u, w, S.addDays(w, 6)));
      const ds = [{ type: "bar", label: "Gym cardio (min)", data: tots.map(x => x.gymMinutes), backgroundColor: cssVar("--plate"), yAxisID: "y" }];
      if (tots.some(x => x.commuteMiles)) ds.push({ type: "line", label: "Commute miles", data: tots.map(x => x.commuteMiles), borderColor: cssVar("--accent"), backgroundColor: cssVar("--accent"), yAxisID: "y1", tension: .25 });
      chart("chart-cardio", { type: "bar", data: { labels: wks.map(w => S.fmtDate(w)), datasets: ds }, options: { scales: { y: { beginAtZero: true, title: { display: true, text: "Minutes" } }, y1: { display: ds.length > 1, position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "Miles" } } } } });
      const hr = state.data.body.filter(b => b.user === u && b.restingHr).sort((a, b) => (a.date < b.date ? -1 : 1));
      if (hr.length) chart("chart-hr", { type: "line", data: { labels: hr.map(b => S.fmtDate(b.date)), datasets: [line("Resting heart rate (bpm)", hr.map(b => +b.restingHr), cssVar("--accent"))] } });
    }
    if (state.progTab === "pain") {
      const ss = S.userSessions(state.data.sessions, u).filter(s => s.pain); const pal = PALETTE();
      chart("chart-pain", { type: "line", data: { labels: ss.map(s => S.fmtDate(s.date)), datasets: PROFILES[u].pain.map((a, i) => line(PAIN_AREAS[a], ss.map(s => s.pain[a] ?? null), pal[(i + 2) % pal.length])) }, options: { scales: { y: { min: 0, max: 10 } } } });
    }
  }
  if (state.view === "body") {
    const f = state.bodyField; const xs = state.data.body.filter(b => b.user === u && b[f] != null && b[f] !== "").sort((a, b) => (a.date < b.date ? -1 : 1));
    if (xs.length) {
      const vals = xs.map(b => +b[f]); const ds = [line(S.BODY_FIELDS[f].label, vals, cssVar("--accent"))];
      if (f === "weight" && xs.length > 2) ds.push(line("Trend (7-entry average)", S.movingAvg(vals), cssVar("--plate"), { pointRadius: 0, borderDash: [5, 4] }));
      chart("chart-body", { type: "line", data: { labels: xs.map(b => S.fmtDate(b.date)), datasets: ds } });
    }
  }
}

export { afterRender, cssVar, destroyCharts, viewProgress };
