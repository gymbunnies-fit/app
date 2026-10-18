// The Body tab: measurements over time.
import { PROFILES, TODAY, esc, personToggle, state } from "../app.js";
import * as S from "../stats.js";

// ---------------------------------------------------------------- BODY
function viewBody() {
  const u = state.viewUser; const rows = state.data.body.filter(b => b.user === u).sort((a, b) => (a.date < b.date ? 1 : -1));
  const fields = Object.entries(S.BODY_FIELDS);
  const summary = fields.map(([f, m]) => {
    const xs = rows.filter(r => r[f] != null && r[f] !== "").reverse(); if (!xs.length) return "";
    const first = +xs[0][f], last = +xs[xs.length - 1][f], ch = +(last - first).toFixed(1);
    return `<div class="stat"><div class="v">${last}${m.unit ? ` <span class="small">${m.unit}</span>` : ""}</div><div class="l">${esc(m.label)}${xs.length > 1 ? ` · <span class="${S.trendClass(f, ch)}">${ch > 0 ? "+" : ""}${ch} since ${S.fmtDate(xs[0].date)}</span>` : ""}</div></div>`;
  }).join("");
  const charted = fields.filter(([f]) => rows.some(r => r[f] != null && r[f] !== ""));
  if (!charted.find(([f]) => f === state.bodyField) && charted.length) state.bodyField = charted[0][0];
  return `<section class="card"><div class="between"><h2 class="h2">Body</h2>${personToggle()}</div>
    ${summary ? `<div class="stats">${summary}</div>` : `<p class="muted">No entries yet. Add a first one below, as your "before".</p>`}</section>
    ${bodyForm(u)}
    ${charted.length ? `<section class="card"><label class="field">Chart<select data-act="bodyField">${charted.map(([f, m]) => `<option value="${f}" ${f === state.bodyField ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label><div class="chart-box"><canvas id="chart-body"></canvas></div></section>` : ""}
    ${rows.length ? `<section class="card"><h3 class="h3">Entries</h3>${rows.map(r => `<div class="list-item"><div><b>${S.fmtDate(r.date)}</b><div class="small muted">${fields.filter(([f]) => r[f] != null && r[f] !== "").map(([f, m]) => `${esc(m.label)} ${r[f]}${m.unit ? " " + m.unit : ""}`).join(" · ")}</div></div><button class="btn small danger" data-act="delBody" data-id="${r.id}">${state.confirmDel === r.id ? "Confirm" : "Delete"}</button></div>`).join("")}</section>` : ""}`;
}
function bodyForm(u) {
  const fields = Object.entries(S.BODY_FIELDS);
  return `<section class="card" id="body-form"><h3 class="h3">New entry for ${esc(PROFILES[u].name)}</h3>
    <label class="field">Date<input type="date" id="body-date" value="${TODAY()}"></label>
    <div class="grid2">${fields.map(([f, m]) => `<label class="field">${esc(m.label)}${m.unit ? ` (${m.unit})` : ""}<input type="number" inputmode="decimal" step="any" data-bf="${f}"></label>`).join("")}</div>
    <details class="more"><summary>How to measure</summary><div class="panel small">
      <p><b>Weight:</b> morning, after the bathroom, before eating. Weigh a few times a week; the app smooths it into a trend.</p>
      <p><b>Waist:</b> tape level around your belly button, relaxed, after breathing out.</p>
      <p><b>Hips / glutes:</b> around the widest part of your butt, feet together.</p>
      <p><b>Chest:</b> around the fullest part, arms relaxed at your sides.</p>
      <p><b>Thigh and upper arm:</b> the widest part, same side every time.</p>
      <p>Measure every two weeks, same time of day. Fill in only what you measured.</p></div></details>
    <button class="btn primary" data-act="saveBody">Save entry</button></section>`;
}

export { viewBody };
