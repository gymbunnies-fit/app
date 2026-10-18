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
let people;
try { [daily, usage, people] = await Promise.all([all("daily"), all("usage"), all("people")]); }
catch (e) { console.log(`::error::Reading Firestore failed: ${String(e.message).slice(0, 400).replace(/\n/g, " ")}`); process.exit(1); }
const COUNTERS = ["workouts", "home", "bonus", "exercises", "sets", "stretches", "onboarded", "feedback", "shares"];
const START = "2026-10-16"; // tracking began with v37
const days = [];
for (let i = 89; i >= 0; i--) {
  const date = back(i); if (date < START) continue; const d = daily.find(x => x.id === date) || {};
  const active = usage.filter(u => (u.seen || []).includes(date)).length;
  const newAcc = usage.filter(u => (u.seen || []).length && [...u.seen].sort()[0] === date).length;
  const ppl = people.filter(u => (u.seen || []).includes(date)).length;
  days.push({ date, active, people: ppl, new: newAcc, appMinutes: Math.round(((d.ev || {}).appSeconds || 0) / 60), ...Object.fromEntries(COUNTERS.map(k => [k, d[k] || 0])) });
}
const activeSince = (n, list = usage) => list.filter(u => (u.seen || []).some(s => s >= back(n - 1))).length;
const tally = (list, f) => { const m = {}; for (const u of list) for (const k of [].concat(f(u) ?? [])) if (k !== "" && k != null) m[k] = (m[k] || 0) + 1; return m; };
const totals = Object.fromEntries(COUNTERS.map(k => [k, daily.reduce((n, d) => n + (d[k] || 0), 0)]));
const out = {
  generated: new Date().toISOString(), today,
  accounts: usage.length, crews: new Set(usage.map(u => u.crew).filter(Boolean)).size,
  activeToday: activeSince(1), active7: activeSince(7), active30: activeSince(30),
  people: people.length, peopleToday: activeSince(1, people), people7: activeSince(7, people), people30: activeSince(30, people),
  appMinutes7: days.slice(-7).reduce((n, d) => n + d.appMinutes, 0),
  totals, days,
  plans: (src => ({
    daysPerWeek: tally(src, u => u.days), style: tally(src, u => u.style), sessionLen: tally(src, u => u.len),
    goals: tally(src, u => u.goals), experience: tally(src, u => u.exp), homeGear: tally(src, u => (u.home ? "yes" : "no")),
    tailored: tally(src, u => (u.tailored ? "yes" : "no")), version: tally(src, u => u.v)
  }))(people.length ? people : usage)
};
writeFileSync("stats.json", JSON.stringify(out, null, 1));
// Every tab and tap, with plain names where we have them.
const LABELS = {
  app_open: "Opened the app", appSeconds: null,
  v_today: "Workout tab", v_progress: "Progress tab", v_body: "Body tab", v_crew: "Crew tab", v_stretch: "Stretch tab", v_gym: "Exercise library", v_settings: "Settings",
  t_saveEx: "Saved an exercise", t_setDone: "Ticked off a set", t_step: "Tapped + or −", t_diff: "Rated a set (Easy/Right/Hard)", t_addSet: "Added a set", t_delSet: "Removed a set",
  t_toggleEx: "Opened or closed an exercise", t_exAll: "Open all / Close all", t_variant: "Switched exercise version", t_openPicker: "Opened Add an exercise", t_pickEx: "Added an exercise",
  t_finishWorkout: "Finished a workout", t_startWorkout: "Started a workout", t_showSummary: "Viewed a workout summary", t_markDone: "Marked a day done",
  t_warmupDone: "Finished a warm-up", t_saveCardio: "Logged cardio", t_skipCardio: "Skipped cardio", t_saveCheckin: "Saved a check-in", t_homeToggle: "Switched to/from at home",
  t_selDay: "Picked a day", t_selWeek: "Switched Week A/B", t_reviewDay: "Opened a day from the week review", t_reviewBack: "Back to week review",
  t_bonusGo: "Started a bonus day", t_bonusSet: "Changed bonus focus or place", t_bonusLog: "Logged bonus cardio", t_reviewStretch: "Recover stretch from review",
  t_timer: "Started a timer", tStart: "Started a timer", t_tStart: "Started a timer", t_tAdj: "Changed a timer by 15 sec", t_tMode: "Changed timer sound", t_tStop: "Stopped a timer", t_timerAdd: "Added a timer", t_timerSet: "Set a timer",
  t_strPick: "Picked a stretch routine", t_strStart: "Started a stretch routine", t_strNext: "Next stretch", t_strEnd: "Ended a stretch routine", t_strMin: "Changed stretch length", t_strFeel: "Rated a stretch",
  t_readEx: "Read an exercise how-to", t_readStretch: "Read a stretch how-to", t_useMachine: "Picked a machine",
  t_hi5: "Sent a high-five", t_hi5to: "Sent a high-five", t_goCrew: "Went to Crew", t_setShare: "Changed what they share",
  t_planEdit: "Edited a day's plan", t_planRemove: "Removed an exercise from plan", t_planMove: "Reordered the plan", t_planReset: "Reset a day's plan",
  t_libQuick: "Library quick add", t_libPlan: "Added library exercise to plan", t_libNew: "Created a custom exercise", t_libF: "Filtered the library", t_openLib: "Opened the library from Settings",
  t_saveBody: "Logged a body measurement", t_progTab: "Switched Progress view", t_repTab: "Switched report view", t_copySummary: "Copied a summary", t_export: "Exported data",
  t_obNext: "Questionnaire: next", t_obFinish: "Finished the questionnaire", t_obRetake: "Retook the questionnaire", t_newProfile: "Added a person", t_tailorOff: "Switched to standard plan",
  t_openA11y: "Opened accessibility", t_a11ySet: "Changed an accessibility option", t_a11yPreset: "Used an accessibility preset", t_setTheme: "Changed theme", t_setText: "Changed text size",
  t_setVoice: "Changed app personality", t_setFun: "Changed fun level", t_shareApp: "Shared the app", t_shareInvite: "Sent a crew invite", t_copyCode: "Copied invite code",
  t_fbOpen: "Opened feedback", t_fbSend: "Sent feedback", t_updateApp: "Tapped Update app", t_pickUser: "Switched person", t_editProfile: "Edited profile", t_closeOverlay: "Closed a panel",
  t_startDeload: "Started a lighter week", t_endDeload: "Ended a lighter week", t_dismissRem: "Dismissed a reminder", t_goView: "Opened a reminder", t_authSignOut: "Signed out"
};
const nice = k => LABELS[k] || (k.startsWith("v_") ? `Screen: ${k.slice(2)}` : k.startsWith("c_") ? `Changed: ${k.slice(2)}` : `Tapped: ${k.replace(/^t_/, "")}`);
const evTot = {}, ev7 = {};
for (const d of daily) for (const [k, n] of Object.entries(d.ev || {})) { if (k === "appSeconds") continue; evTot[k] = (evTot[k] || 0) + n; if (d.id >= back(6)) ev7[k] = (ev7[k] || 0) + n; }
const events = Object.keys(evTot).map(k => ({ key: k, label: nice(k), kind: k.startsWith("v_") || k === "app_open" ? "Screens" : "Actions", last7: ev7[k] || 0, total: evTot[k] }))
  .sort((a, b) => b.total - a.total);

// The same numbers as row tables, for the dashboard.
// eslint-disable-next-line no-unused-vars
const { days: _d, plans: _p, totals: _t, ...head } = out;
writeFileSync("summary.json", JSON.stringify([{ ...head, ...Object.fromEntries(Object.entries(totals).map(([k, n]) => [`total_${k}`, n])) }]));
writeFileSync("daily.json", JSON.stringify(days));
writeFileSync("events.json", JSON.stringify(events));
const QUESTION = { daysPerWeek: "Days a week", style: "Plan layout", sessionLen: "Session length", goals: "Goals", experience: "Experience", homeGear: "Has home gear", tailored: "Plan adjusted for them", version: "App version" };
const LABEL = { goals: k => GOALS[k], experience: k => EXPERIENCE[k]?.[0], style: k => STYLES[k]?.[0], sessionLen: k => SESSION_LEN[k],
  daysPerWeek: k => `${k} day${k === "1" ? "" : "s"}`, homeGear: k => (k === "yes" ? "Yes" : "No"), tailored: k => (k === "yes" ? "Yes" : "No"), version: k => `v${k}` };
writeFileSync("plans.json", JSON.stringify(Object.entries(out.plans).flatMap(([q, m]) => Object.entries(m).map(([k, people]) => ({ question: QUESTION[q] || q, answer: LABEL[q]?.(String(k)) || String(k), people })))));
console.log(`people ${out.people}, accounts ${out.accounts}, active7 ${out.active7}, workouts ${totals.workouts}`);
