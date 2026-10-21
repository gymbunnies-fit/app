// Bringing workout history in from other apps (Strong and Hevy CSV exports).
// No app state here: parse the file, group sets into workouts, and match exercise names to the app's own moves.
import { ALL_EX } from "./plan.js";
import { BUILTIN } from "./library.js";

// ---------------------------------------------------------------- CSV
// Handles quoted fields, doubled quotes, newlines inside quotes, and comma or semicolon separators.
export function parseCSV(text) {
  text = String(text || "").replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const clean = rows.filter(r => r.some(x => x.trim() !== ""));
  if (!clean.length) return { header: [], rows: [] };
  const header = clean[0].map(h => h.trim());
  return { header, rows: clean.slice(1).map(r => Object.fromEntries(header.map((h, i) => [keyOf(h), (r[i] ?? "").trim()]))) };
}
// "Weight (kg)" → "weightkg", "exercise_title" → "exercisetitle"
const keyOf = h => h.toLowerCase().replace(/[^a-z0-9]/g, "");

// ---------------------------------------------------------------- dates
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const p2 = n => String(n).padStart(2, "0");
// The clock time as written (these exports use the phone's local time). Returns { date: "YYYY-MM-DD", ms } or null.
export function parseWhen(s) {
  s = String(s || "").trim(); let m, y, mo, d, h = 0, mi = 0, pm = null;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s))) [, y, mo, d, h = 0, mi = 0] = m;
  else if ((m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? ?(?:(\d{1,2}):(\d{2}))?/.exec(s))) { [, d, mo, y, h = 0, mi = 0] = m; mo = MONTHS[mo.toLowerCase()]; }
  else if ((m = /^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4}),? ?(?:(\d{1,2}):(\d{2}))?/.exec(s))) { [, mo, d, y, h = 0, mi = 0] = m; mo = MONTHS[mo.toLowerCase()]; }
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),? ?(?:(\d{1,2}):(\d{2}))?/.exec(s))) [, mo, d, y, h = 0, mi = 0] = m;
  else return null;
  if (/pm\b/i.test(s)) pm = true; else if (/am\b/i.test(s)) pm = false;
  h = +h; if (pm === true && h < 12) h += 12; if (pm === false && h === 12) h = 0;
  if (!mo || +mo > 12 || +d > 31 || +y < 1990) return null;
  return { date: `${y}-${p2(mo)}-${p2(d)}`, ms: new Date(+y, +mo - 1, +d, h, +mi).getTime() };
}
// "1h 5m", "45m", "1:05:00", or plain seconds → minutes
export function parseMinutes(s) {
  s = String(s || "").trim(); if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(+s / 60);
  let m;
  if ((m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(s))) return m[3] !== undefined ? +m[1] * 60 + +m[2] : +m[1];
  const h = /(\d+)\s*h/.exec(s), mi = /(\d+)\s*m(?!s)/.exec(s);
  return h || mi ? (h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0) : null;
}

// ---------------------------------------------------------------- workouts
const num = v => { const n = parseFloat(String(v || "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const KG = 2.20462;
const roundLb = w => Math.round(w * 2) / 2;
// RPE (1–10) to the app's three-step "how it felt": easy, good, hard.
const feltOf = rpe => { const r = num(rpe); return !r ? 2 : r >= 9 ? 3 : r <= 6 ? 1 : 2; };

// Which app made the file, and what unit its weights are in ("kg", "lb", or null when the file doesn't say).
export function detect(header) {
  const k = new Set(header.map(keyOf));
  const format = k.has("exercisetitle") ? "Hevy" : k.has("exercisename") ? "Strong" : null;
  const unit = k.has("weightkg") ? "kg" : k.has("weightlbs") || k.has("weightlb") ? "lb" : null;
  return { format, unit };
}

// Rows → workouts. unit: what the plain "Weight" column means when the file doesn't say ("lb" or "kg").
export function toWorkouts(parsed, unit = "lb") {
  const { format, unit: fileUnit } = detect(parsed.header);
  const out = new Map(); const skipped = { warmups: 0, cardio: 0, empty: 0, badDate: 0 };
  for (const r of parsed.rows) {
    const H = format === "Hevy";
    const name = (H ? r.exercisetitle : r.exercisename) || "";
    const order = String(H ? r.settype : r.setorder || "").toLowerCase();
    if (!name || /rest timer/.test(order)) continue;
    // Strong marks warm-ups "W"; Hevy says "warmup" (or 2 in its number codes). Strong's 1, 2, 3… are just set numbers.
    if (H ? order === "warmup" || order === "2" : order === "w") { skipped.warmups++; continue; }
    const when = parseWhen(H ? r.starttime : r.date); if (!when) { skipped.badDate++; continue; }
    const kg = r.weightkg !== undefined && r.weightkg !== "" ? num(r.weightkg) : null;
    const lb = r.weightlbs !== undefined && r.weightlbs !== "" ? num(r.weightlbs) : r.weightlb !== undefined && r.weightlb !== "" ? num(r.weightlb) : null;
    const plain = r.weight !== undefined && r.weight !== "" ? num(r.weight) : null;
    const w = roundLb(kg !== null ? kg * KG : lb !== null ? lb : plain !== null ? (unit === "kg" ? plain * KG : plain) : 0);
    const reps = num(r.reps), secs = num(H ? r.durationseconds : r.seconds);
    const dist = num(r.distance || r.distancekm || r.distancemiles || r.distancemeters);
    if (!reps && !w && !secs) { if (dist) skipped.cardio++; else skipped.empty++; continue; }
    if (!reps && !w && secs && dist) { skipped.cardio++; continue; }
    const key = H ? `${r.starttime}|${r.title}` : `${r.workout || ""}|${r.date}|${r.workoutname}`;
    let wo = out.get(key);
    if (!wo) {
      const end = H ? parseWhen(r.endtime) : null;
      const minutes = H ? (end && end.ms > when.ms ? Math.round((end.ms - when.ms) / 60000) : null) : parseMinutes(r.durationsec !== undefined ? r.durationsec : r.duration);
      wo = { date: when.date, ms: when.ms, title: (H ? r.title : r.workoutname) || "", minutes: minutes && minutes > 0 && minutes < 600 ? minutes : null, exercises: [] };
      out.set(key, wo);
    }
    let ex = wo.exercises.find(e => e.name === name);
    if (!ex) { ex = { name, sets: [] }; wo.exercises.push(ex); }
    ex.sets.push(secs && !reps ? { w, r: Math.round(secs), d: feltOf(r.rpe), timed: true } : { w, r: Math.round(reps), d: feltOf(r.rpe) });
  }
  const workouts = [...out.values()].filter(w => w.exercises.length).sort((a, b) => a.ms - b.ms);
  for (const wo of workouts) for (const e of wo.exercises) e.kind = kindOf(e);
  return { format, fileUnit, workouts, skipped };
}
function kindOf(e) {
  if (/assist/i.test(e.name)) return "assist";
  const timed = e.sets.every(s => s.timed), weighted = e.sets.some(s => s.w > 0);
  if (timed) return weighted ? "carry" : "time";
  return weighted ? "load" : "bw";
}

// ---------------------------------------------------------------- matching names to the app's moves
const EQUIP = new Set(["barbell", "dumbbell", "machine", "cable", "smith", "band", "kettlebell", "bodyweight", "ez", "trap", "lever", "plate", "weighted"]);
const IGNORE = new Set(["the", "a", "with", "on", "of", "and", "straight", "bar", "rope", "handle", "attachment", "loaded", "selectorized", "station"]);
const SYN = { db: "dumbbell", dumbell: "dumbbell", bb: "barbell", kb: "kettlebell", pulldown: "pulldown", pushdown: "pushdown", pullup: "pull up", pushup: "push up", situp: "sit up", chinup: "chin up", biceps: "bicep", triceps: "tricep", tricep: "tricep", flye: "fly", flyes: "fly", flies: "fly", rdl: "romanian deadlift", ohp: "overhead press", lat: "lat", lats: "lat", abdominal: "ab", abs: "ab", crunches: "crunch", raises: "raise", curls: "curl", rows: "row", extensions: "extension", pec: "chest", pectoral: "chest", deck: "fly", seated: "seated", "1": "one", single: "one", unilateral: "one" };
function tokens(name) {
  const words = String(name).toLowerCase().replace(/[()\-/,&]/g, " ").replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean)
    .flatMap(w => (SYN[w] || (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).split(" "));
  const core = new Set(), equip = new Set();
  for (const w of words) { if (IGNORE.has(w)) continue; (EQUIP.has(w) ? equip : core).add(w); }
  if (core.has("one") && (core.has("arm") || core.has("leg"))) { /* keep */ }
  return { core, equip };
}
let catalog = null;
// Every move the app knows: plan exercises (each version) and the built-in library.
export function moveCatalog() {
  if (catalog) return catalog;
  const seen = new Map();
  const add = (name, variant, kind, db, src) => { const k = name.toLowerCase(); if (!seen.has(k)) seen.set(k, { name, variant, kind, db: !!db, src, ...tokens(name) }); };
  for (const ex of Object.values(ALL_EX)) { add(ex.n, "std", ex.kind, ex.db, "plan"); if (ex.h) add(ex.h.n, "std", ex.h.kind || ex.kind, ex.h.db, "plan"); if (ex.swap) add(ex.swap.n, "std", ex.swap.kind || ex.kind, ex.swap.db, "plan"); }
  for (const b of BUILTIN) add(b.name, `lib:${b.id}`, b.kind, b.db, "library");
  catalog = [...seen.values()];
  return catalog;
}
const overlap = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
// Best matches for a name from another app, best first. A match is "sure" when the movement words are the same
// and the equipment doesn't disagree.
export function matchMove(name) {
  const t = tokens(name);
  const scored = moveCatalog().map(m => {
    const inter = overlap(t.core, m.core), uni = new Set([...t.core, ...m.core]).size;
    const coreJ = uni ? inter / uni : 0;
    const eqClash = t.equip.size && m.equip.size && !overlap(t.equip, m.equip);
    const eqSame = t.equip.size && m.equip.size && overlap(t.equip, m.equip);
    const score = coreJ - (eqClash ? 0.5 : 0) + (eqSame ? 0.05 : 0) + (m.src === "plan" ? 0.01 : 0);
    return { ...m, score, sure: coreJ === 1 && !eqClash };
  }).filter(m => m.score >= 0.4).sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map(({ core, equip, ...m }) => m);
}

// Summary for the preview: distinct exercises with how many workouts each appears in, and the suggested match.
export function exerciseList(workouts) {
  const m = new Map();
  for (const wo of workouts) for (const e of wo.exercises) { const x = m.get(e.name) || { name: e.name, count: 0 }; x.count++; m.set(e.name, x); }
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map(x => {
    const cands = matchMove(x.name);
    return { ...x, cands, pick: cands[0]?.sure ? cands[0].name : "" };
  });
}

export const slugOf = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
// One workout → exercise entries the app stores. picks: { originalName: appName or "" to keep it as is }.
export function entriesFor(wo, picks) {
  const byName = new Map(moveCatalog().map(m => [m.name, m]));
  const ex = {};
  wo.exercises.forEach((e, i) => {
    const target = picks[e.name] ? byName.get(picks[e.name]) : null;
    const name = target ? target.name : e.name;
    const variant = target ? target.variant : "std";
    const id = `imp:${slugOf(name)}`;
    let kind = e.kind;
    if (target?.kind === "assist") kind = "assist";
    const db = target ? target.db : /dumbbell/i.test(e.name);
    const sets = e.sets.map(({ timed, ...s }) => ({ ...s }));
    if (ex[id]) ex[id].sets.push(...sets);
    else ex[id] = { id, name, variant, kind, db, sets, order: i, ...(name !== e.name ? { from: e.name } : {}) };
  });
  return ex;
}
