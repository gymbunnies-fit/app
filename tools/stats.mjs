// Builds stats.json from the anonymous counters in Firestore (daily/*, usage/*), which anyone can read.
// Run by .github/workflows/stats.yml; the result is committed to the "stats" branch for the dashboard.
import { writeFileSync } from "node:fs";
import { GOALS, EXPERIENCE, SESSION_LEN } from "../js/tailor.js";
import { STYLES } from "../js/program.js";
const KEY = "AIzaSyC1RgJvqEyg8-HvVvNmQrSQkUnpPIkIG5k";
const BASE = "https://firestore.googleapis.com/v1/projects/gymbunnies-fit/databases/(default)/documents";

function val(v) {
  if (!v) return null;
  if ("integerValue" in v) return +v.integerValue;
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)]));
  return null;
}
async function all(coll) {
  const out = []; let page = "";
  do {
    const r = await fetch(`${BASE}/${coll}?pageSize=300&key=${KEY}${page ? `&pageToken=${page}` : ""}`);
    if (!r.ok) throw new Error(`${coll}: ${r.status} ${await r.text()}`);
    const j = await r.json();
    for (const d of j.documents || []) out.push({ id: d.name.split("/").pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, val(x)])) });
    page = j.nextPageToken || "";
  } while (page);
  return out;
}

const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const now = new Date(Date.now() - 4 * 3600e3); // Eastern-ish, so "today" matches Atlanta
const today = ymd(now);
const back = n => ymd(new Date(now.getTime() - n * 864e5));

let daily, usage;
try { [daily, usage] = await Promise.all([all("daily"), all("usage")]); }
catch (e) { console.log(`::error::Reading Firestore failed: ${String(e.message).slice(0, 400).replace(/\n/g, " ")}`); process.exit(1); }
const COUNTERS = ["workouts", "home", "bonus", "exercises", "sets", "stretches", "onboarded", "feedback", "shares"];
const START = "2026-10-16"; // tracking began with v37
const days = [];
for (let i = 89; i >= 0; i--) {
  const date = back(i); if (date < START) continue; const d = daily.find(x => x.id === date) || {};
  const active = usage.filter(u => (u.seen || []).includes(date)).length;
  const newAcc = usage.filter(u => (u.seen || []).length && [...u.seen].sort()[0] === date).length;
  days.push({ date, active, new: newAcc, ...Object.fromEntries(COUNTERS.map(k => [k, d[k] || 0])) });
}
const activeSince = n => usage.filter(u => (u.seen || []).some(s => s >= back(n - 1))).length;
const tally = (list, f) => { const m = {}; for (const u of list) for (const k of [].concat(f(u) ?? [])) if (k !== "" && k != null) m[k] = (m[k] || 0) + 1; return m; };
const totals = Object.fromEntries(COUNTERS.map(k => [k, daily.reduce((n, d) => n + (d[k] || 0), 0)]));
const out = {
  generated: new Date().toISOString(), today,
  accounts: usage.length, crews: new Set(usage.map(u => u.crew).filter(Boolean)).size,
  activeToday: activeSince(1), active7: activeSince(7), active30: activeSince(30),
  totals, days,
  plans: {
    daysPerWeek: tally(usage, u => u.days), style: tally(usage, u => u.style), sessionLen: tally(usage, u => u.len),
    goals: tally(usage, u => u.goals), experience: tally(usage, u => u.exp), homeGear: tally(usage, u => (u.home ? "yes" : "no")),
    tailored: tally(usage, u => (u.tailored ? "yes" : "no")), version: tally(usage, u => u.v)
  }
};
writeFileSync("stats.json", JSON.stringify(out, null, 1));
// The same numbers as row tables, for the dashboard.
const { days: _d, plans: _p, totals: _t, ...head } = out;
writeFileSync("summary.json", JSON.stringify([{ ...head, ...Object.fromEntries(Object.entries(totals).map(([k, n]) => [`total_${k}`, n])) }]));
writeFileSync("daily.json", JSON.stringify(days));
const QUESTION = { daysPerWeek: "Days a week", style: "Plan layout", sessionLen: "Session length", goals: "Goals", experience: "Experience", homeGear: "Has home gear", tailored: "Plan adjusted for them", version: "App version" };
const LABEL = { goals: k => GOALS[k], experience: k => EXPERIENCE[k]?.[0], style: k => STYLES[k]?.[0], sessionLen: k => SESSION_LEN[k],
  daysPerWeek: k => `${k} day${k === "1" ? "" : "s"}`, homeGear: k => (k === "yes" ? "Yes" : "No"), tailored: k => (k === "yes" ? "Yes" : "No"), version: k => `v${k}` };
writeFileSync("plans.json", JSON.stringify(Object.entries(out.plans).flatMap(([q, m]) => Object.entries(m).map(([k, people]) => ({ question: QUESTION[q] || q, answer: LABEL[q]?.(String(k)) || String(k), people })))));
console.log(`accounts ${out.accounts}, active7 ${out.active7}, workouts ${totals.workouts}`);
