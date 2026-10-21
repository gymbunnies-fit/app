// Bring in your history (Settings): read a Strong or Hevy export, check how its exercises match the app's,
// then save each workout day as an imported record. Imported workouts count for history, "last time" and
// records, but not for plan days, the week review, or points.
import { $, P, esc, render, state, toast } from "../app.js";
import * as I from "../importer.js";
import * as S from "../stats.js";
import * as A from "../a11y.js";
import { removeMany, saveMany } from "../firebase.js";
import { openSettings } from "./settings.js";

const mine = u => state.data.sessions.filter(s => s.user === u && s.imported);
// Dates that already have a workout logged in the app: those days from the file are left out.
const takenDates = u => new Set(state.data.sessions.filter(s => s.user === u && !s.imported && ((s.exercises || []).some(e => e.sets?.length) || s.markedDone)).map(s => s.date));

// ---------------------------------------------------------------- the card in Settings
export function importCard() {
  const u = state.user, have = mine(u);
  const from = [...new Set(have.map(s => s.importedFrom).filter(Boolean))].join(" and ");
  const confirm = state.confirmDel === "imp:all";
  return `<section class="card" id="imp-card" aria-labelledby="imp-h"><h3 class="h3" id="imp-h">Bring in your history</h3>
    <p class="small">Coming from Strong or Hevy? Export your workouts as a CSV file in that app, then pick the file here. Your past weights show up as "Last time" and in Progress.</p>
    <p class="small muted">In either app, look in Settings for exporting your data, and pick the workouts CSV.</p>
    <div class="row"><label class="btn">Choose a CSV file<input type="file" accept=".csv,text/csv,text/plain" data-act="impFile" class="visually-hidden"></label></div>
    ${have.length ? `<p class="small">${have.length} workout ${have.length === 1 ? "day" : "days"} brought in${from ? ` from ${esc(from)}` : ""}, ${S.fmtDate(have.map(s => s.date).sort()[0])} to ${S.fmtDate(have.map(s => s.date).sort().pop())}.</p>
      <button type="button" class="btn small danger" data-act="impRemove">${confirm ? `Tap again to remove all ${have.length}` : "Remove imported workouts"}</button>` : ""}
  </section>`;
}

// ---------------------------------------------------------------- reading the file
export function readFile(file) {
  file.text().then(text => {
    const parsed = I.parseCSV(text);
    const det = I.detect(parsed.header);
    state.imp = { name: file.name, parsed, format: det.format, fileUnit: det.unit, unit: det.unit || "lb" };
    if (det.format) build();
    state.overlay = "import"; draw(true);
  }).catch(() => toast("That file couldn't be read."));
}
function build() {
  const im = state.imp, u = state.user;
  const r = I.toWorkouts(im.parsed, im.unit);
  const taken = takenDates(u);
  im.workouts = r.workouts.filter(w => !taken.has(w.date));
  im.clash = r.workouts.length - im.workouts.length;
  im.skipped = r.skipped;
  const keep = im.picks || {};
  im.list = I.exerciseList(im.workouts);
  im.picks = Object.fromEntries(im.list.map(x => [x.name, x.name in keep ? keep[x.name] : x.pick]));
}

// ---------------------------------------------------------------- the review screen
function draw(focusTitle) {
  const im = state.imp; if (!im) return;
  const u = state.user, name = P(u).name;
  let body;
  if (!im.format) {
    body = `<section class="card"><p>This file doesn't look like a Strong or Hevy export. In the other app, export your workouts as CSV and choose that file.</p>
      <p class="small muted">File: ${esc(im.name)}</p></section>`;
  } else if (!im.workouts.length) {
    body = `<section class="card"><p>No workouts to bring in from this file${im.clash ? `. Every day in it already has a workout logged here, so nothing would change` : ""}.</p></section>`;
  } else {
    const dates = im.workouts.map(w => w.date).sort();
    const days = new Set(dates).size;
    const sure = im.list.filter(x => im.picks[x.name]).length;
    const sk = im.skipped;
    const notes = [
      sk.warmups ? `${sk.warmups} warm-up ${sk.warmups === 1 ? "set" : "sets"} left out` : "",
      sk.cardio ? `${sk.cardio} cardio ${sk.cardio === 1 ? "entry" : "entries"} left out (log cardio on the Workout tab)` : "",
      im.clash ? `${im.clash} ${im.clash === 1 ? "workout" : "workouts"} on days you already logged here left out` : "",
      sk.badDate ? `${sk.badDate} ${sk.badDate === 1 ? "row" : "rows"} with a date the app couldn't read left out` : "",
    ].filter(Boolean);
    const rows = im.list.map((x, i) => `<li class="imp-row"><label class="field" for="imp-m-${i}"><span><b>${esc(x.name)}</b> <span class="small muted">· ${x.count} ${x.count === 1 ? "workout" : "workouts"}</span></span>
      <select id="imp-m-${i}" data-act="impPick" data-n="${esc(x.name)}">
        <option value="" ${!im.picks[x.name] ? "selected" : ""}>Keep as "${esc(x.name)}"</option>
        ${x.cands.map(c => `<option value="${esc(c.name)}" ${im.picks[x.name] === c.name ? "selected" : ""}>Same as ${esc(c.name)}</option>`).join("")}
      </select></label></li>`).join("");
    body = `<section class="card">
        <p><b>${im.workouts.length} ${im.workouts.length === 1 ? "workout" : "workouts"}</b> from ${esc(im.format)}${days !== im.workouts.length ? ` (${days} days)` : ""}, ${S.fmtDate(dates[0])} to ${S.fmtDate(dates.at(-1))}. They'll be added to ${esc(name)}'s history.</p>
        ${notes.length ? `<ul class="small muted">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${im.fileUnit ? `<p class="small muted">Weights are in ${im.fileUnit === "kg" ? "kilograms, so they're changed to pounds" : "pounds"}.</p>`
          : `<fieldset class="field imp-unit"><legend>The weights in this file are in</legend><div class="seg" role="group">${[["lb", "Pounds"], ["kg", "Kilograms"]].map(([v, l]) => `<button type="button" data-act="impUnit" data-v="${v}" aria-pressed="${im.unit === v}">${l}</button>`).join("")}</div>
            <p class="small muted">Use the unit you had set in ${esc(im.format)}. Kilograms are changed to pounds.</p></fieldset>`}
      </section>
      <section class="card" aria-labelledby="imp-ex-h"><h3 class="h3" id="imp-ex-h">Match the exercises</h3>
        <p class="small"><span id="imp-sure">${sure} of ${im.list.length}</span> matched to exercises the app knows, so their history shows up on your plan. Check the matches. Anything you keep as is still gets its own history.</p>
        <ul class="imp-list">${rows}</ul></section>
      <button type="button" class="btn primary block" data-act="impGo">Bring in ${im.workouts.length} ${im.workouts.length === 1 ? "workout" : "workouts"}</button>`;
  }
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="imp-t"><div class="inner">
    <div class="between"><h2 class="h2" id="imp-t" tabindex="-1">Bring in your history</h2><button type="button" class="btn small" data-act="impBack">Cancel</button></div>
    ${body}</div></div>`;
  if (focusTitle) $("#imp-t")?.focus({ preventScroll: true });
}

// One record per day: two workouts on the same day become one.
export function sessionsFrom(u, workouts, picks, format) {
  const byDate = new Map();
  for (const wo of workouts) {
    const ex = I.entriesFor(wo, picks);
    const cur = byDate.get(wo.date);
    if (!cur) { byDate.set(wo.date, { id: `${u}_${wo.date}_imp`, user: u, date: wo.date, week: "", day: "Imported", imported: true, importedFrom: format, title: wo.title, ex, exercises: [], ...(wo.minutes ? { minutes: wo.minutes } : {}) }); continue; }
    const base = Object.keys(cur.ex).length;
    for (const [id, e] of Object.entries(ex)) { if (cur.ex[id]) cur.ex[id].sets.push(...e.sets); else cur.ex[id] = { ...e, order: base + e.order }; }
    if (wo.title && !cur.title.includes(wo.title)) cur.title = cur.title ? `${cur.title} + ${wo.title}` : wo.title;
    if (wo.minutes) cur.minutes = (cur.minutes || 0) + wo.minutes;
  }
  return [...byDate.values()];
}

function go() {
  const im = state.imp, u = state.user;
  const docs = sessionsFrom(u, im.workouts, im.picks, im.format);
  state.imp = null;
  saveMany("sessions", docs).catch(err => { console.error(err); toast("Some workouts didn't save. Check your connection and try again."); });
  toast(`Brought in ${docs.length} workout ${docs.length === 1 ? "day" : "days"} from ${im.format}.`);
  A.announce(`Brought in ${docs.length} workout days.`);
  // Give the new records a moment to arrive so the card can count them.
  setTimeout(backToSettings, 300);
}
function backToSettings() {
  openSettings(); render();
  setTimeout(() => { const h = $("#imp-h"), box = $("#overlay .overlay"); if (h && box) box.scrollTop = Math.max(0, h.closest("section").offsetTop - 12); h?.setAttribute("tabindex", "-1"); h?.focus({ preventScroll: true }); }, 60);
}

// A workout brought in from another app, read-only.
function show(id) {
  const s = state.data.sessions.find(x => x.id === id); if (!s) return;
  state.overlay = "impShow";
  const ex = (s.exercises || []).filter(e => e.sets?.length);
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="imps-t"><div class="inner">
    <div class="between"><h2 class="h2" id="imps-t" tabindex="-1">${S.fmtDate(s.date)}</h2><button type="button" class="btn small" data-act="closeOverlay">Close</button></div>
    <section class="card"><p class="small muted">Brought in from ${esc(s.importedFrom || "another app")}${s.title ? `: ${esc(s.title)}` : ""}${s.minutes ? ` · ${s.minutes} min` : ""}.</p>
      <ul class="imp-show">${ex.map(e => `<li><b>${esc(e.name)}</b>${e.from ? ` <span class="small muted">(was "${esc(e.from)}")</span>` : ""}<div class="small">${esc(S.describeSets(e.kind, e.db, e.sets))}</div></li>`).join("")}</ul></section></div></div>`;
  $("#imps-t")?.focus({ preventScroll: true });
}

function sureLine() {
  const im = state.imp, el = $("#imp-sure"); if (!im || !el) return;
  el.textContent = `${im.list.filter(x => im.picks[x.name]).length} of ${im.list.length}`;
}

// ---------------------------------------------------------------- events (called from app.js)
export function onImpClick(act, el) {
  switch (act) {
    case "impBack": state.imp = null; backToSettings(); return true;
    case "impUnit": state.imp.unit = el.dataset.v; build(); draw(); $(`[data-act=impUnit][data-v="${el.dataset.v}"]`)?.focus(); return true;
    case "impGo": go(); return true;
    case "impOpen": show(el.dataset.id); return true;
    case "impRemove": {
      if (state.confirmDel !== "imp:all") { state.confirmDel = "imp:all"; openSettings(); $("[data-act=impRemove]")?.focus(); return true; }
      state.confirmDel = null; const ids = mine(state.user).map(s => s.id);
      removeMany("sessions", ids).catch(err => { console.error(err); toast("Couldn't remove them. Try again."); });
      toast(`Removed ${ids.length} imported workout ${ids.length === 1 ? "day" : "days"}.`); setTimeout(backToSettings, 300); return true;
    }
  }
  return false;
}
export function onImpChange(el) {
  if (el.dataset.act === "impFile") { if (el.files?.[0]) readFile(el.files[0]); el.value = ""; return true; }
  if (el.dataset.act === "impPick" && state.imp) { state.imp.picks[el.dataset.n] = el.value; sureLine(); A.announce(el.value ? `Matched to ${el.value}` : "Kept as is"); return true; }
  return false;
}
