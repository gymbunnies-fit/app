// GymBunnies.fit — app shell, views and events.
import { PROFILES as SEEDS, PLAN, STRETCH, CARDIO, DAYS, DAY_NAMES, ALL_EX, FOCUS, PAIN_AREAS, variantDef, exDef } from "./plan.js";
import * as F from "./fun.js";
import * as T from "./timer.js";
import * as A from "./a11y.js";
import * as PG from "./program.js";
import * as ST from "./stretch.js";
import { icon, play } from "./icons.js";
import * as S from "./stats.js";
import * as Q from "./equipment.js";
import { BUILTIN, GYM, PLAN_MACHINES, EQUIP, PATTERN, JOINTS, POSITION, LEVEL, PLAN_PATTERN, STRETCH_BY_FOCUS, normalizeLib } from "./library.js";
import { connect, save, remove, patch, dropField, signOutAndClear, importAll, COLLECTIONS, watchAuth, signInGoogle, signInEmail, createEmailAccount, resetPassword, addGoogle, addPassword, currentInfo,
  getUserDoc, setUserDoc, createCrew, joinCrew, watchCrew, updateMember, removeMember, renameCrew, newInviteCode,
  sendFeedback, watchFeedback, answerFeedback } from "./firebase.js";
import { viewBody } from "./views/body.js";
import { SHARE_LABEL, viewCrew } from "./views/crew.js";
import { drawA11y, drawFeedback, fbNotify, openA11y, openFeedback } from "./views/feedback.js";
import { afterRender, cssVar, destroyCharts, viewProgress } from "./views/progress.js";
import { OB_STEPS, drawOnboarding, finishOnboarding, openOnboarding, shareLink } from "./views/questionnaire.js";
import { deleteMyAccount, openSettings } from "./views/settings.js";
import { onGymChange, onGymClick, onGymInput } from "./views/gyms.js";
import { strFinish, strGo, strRoutine, strState, viewStretch } from "./views/stretch.js";
import { ev, isAdmin, track, trackSeen } from "./views/usage.js";
import { focusSaved, openKey, stretchBox, viewToday } from "./views/workout.js";

// ---------------------------------------------------------------- helpers
// Shown at the bottom of Settings so you can tell whether a phone has the latest update. Bump with sw.js VERSION.
const APP_VERSION = "59";
// The app's name lives here only (plus app-v41.webmanifest and the <title> tags in index.html, which can't read JS).
const APP_NAME = "GymBunnies.fit";
const $ = (s, r = document) => r.querySelector(s);
// "a", "a and b", "a, b, and c" (Oxford comma)
const listText = (xs, word = "and") => xs.length < 3 ? xs.join(` ${word} `) : `${xs.slice(0, -1).join(", ")}, ${word} ${xs[xs.length - 1]}`;
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const TODAY = () => S.ymd(new Date());
// ---------------------------------------------------------------- profiles (built-in Mat & Benny + anyone set up in the app)
const PROFILE_DEFAULTS = { focus: [], focusNote: "", defaultVariant: "std", pain: ["knees", "shoulders", "lowerBack"], commute: { enabled: false, miles: 0 }, start: {}, notes: [],
  cardio: "steady", theme: "bunny", accent: "", textSize: "m", avatar: "", voice: "hype", fun: "medium", sound: true, color: "#2f6b5e" };
const SEED_EXTRA = { mat: { cardio: "steady", color: "#2f6b5e", avatar: "🐺" }, benny: { cardio: "intervals", color: "#4b5d8a", avatar: "🦊" } };
let profMemo = { src: null, map: {} };
function P(id) {
  if (profMemo.src !== state.data.profiles) profMemo = { src: state.data.profiles, map: {} };
  if (profMemo.map[id]) return profMemo.map[id];
  const saved = state.data.profiles.find(p => p.id === id) || {};
  const p = { ...PROFILE_DEFAULTS, ...(SEEDS[id] || {}), ...(SEED_EXTRA[id] || {}), ...saved, id };
  if (!p.name) p.name = id;
  p.tailor = Object.fromEntries((p.tailorList || []).map(t => [t.id, t]));
  return (profMemo.map[id] = p);
}
const PROFILES = new Proxy({}, { get: (_, id) => P(id) });
// Mat and Benny are built in, but only show up in a crew that actually has their data (so new crews start empty).
let idsMemo = { refs: [], ids: [] };
function profileIds() {
  const d = state.data; const refs = [d.profiles, d.sessions, d.body, d.activities, state.auth?.members];
  if (refs.every((r, i) => r === idsMemo.refs[i])) return idsMemo.ids;
  const used = new Set([...d.sessions, ...d.body, ...d.activities].map(x => x.user).concat((state.auth?.members || []).map(m => m.profileId)));
  const ids = [...new Set([...Object.keys(SEEDS).filter(id => used.has(id)), ...d.profiles.map(p => p.id)])]
    .filter(id => !d.profiles.find(p => p.id === id && p.archived));
  idsMemo = { refs, ids };
  return ids;
}
const other = u => { const pid = state.partnerId && state.partnerId !== u ? state.partnerId : null; return pid || profileIds().find(id => id !== u) || u; };
S.setProfileSource(P);
const cardioProgram = u => CARDIO[P(u).cardio === "intervals" ? "benny" : "mat"];
const yt = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q + " proper form") + A.ytParams();
const ytStretch = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q + " stretch how to") + A.ytParams();
const DIFF = ["", "Easy", "Right", "Hard"];
const VARIANT_LABEL = { std: "Standard", hard: "Harder", swap: "Alternative" };
// One line under the version buttons, explaining the one that's picked.
const VARIANT_NOTE = { std: "The plan's main exercise.", hard: "A tougher version of the same move.", swap: "Use this if the machine is taken or the move bothers you.", lib: "Any exercise or machine at our gym that works the same muscles. Tap Change machine to pick another." };
const vLabel = v => (String(v).startsWith("lib:") ? "Library" : VARIANT_LABEL[v] || v);
const GROUPS = ["chest", "shoulders", "arms", "back", "core", "glutes", "legs", "calves", "cardio"];
const KIND_LABEL = { load: "Weight × reps", bw: "Reps only", time: "Time (seconds)", carry: "Weight × steps", assist: "Assist weight × reps" };
// Library = built-in list + what's saved in the database (same id: saved version wins; hidden: removed).
let libMemo = { src: null, list: [] };
function allLibrary() {
  if (libMemo.src === state.data.library) return libMemo.list;
  const saved = new Map(state.data.library.map(d => [d.id, d]));
  const out = [];
  for (const b of BUILTIN) { const o = saved.get(b.id); saved.delete(b.id); if (o?.hidden) continue; out.push(o ? { ...b, ...o, builtin: true, edited: true } : b); }
  for (const d of saved.values()) if (!d.hidden) out.push({ ...normalizeLib(d), builtin: false });
  libMemo = { src: state.data.library, list: out };
  return out;
}
const libItem = id => allLibrary().find(x => x.id === id);
const hiddenBuiltins = () => state.data.library.filter(d => d.hidden && BUILTIN.some(b => b.id === d.id));
const aches = u => state.data.settings.find(x => x.id === `aches_${u}`)?.areas || [];
// Which of a person's sore areas an exercise loads: high (2) or some (1).
function conflicts(m, u) {
  const a = aches(u); const j = m.joints || {};
  return { high: a.filter(x => j[x] === 2), some: a.filter(x => j[x] === 1) };
}
const dots = (n, max = 3) => "●".repeat(n) + "○".repeat(Math.max(0, max - n));
// A library entry dressed as a workout exercise.
function libEx(m) {
  return { id: `lib-${m.id}`, n: m.name, sr: m.sr || "3 × 10", tag: "lib", focus: m.focus || [], kind: m.kind || "load", db: !!m.db,
    why: m.how || m.notes || "", setup: m.how || m.notes || "", s: (STRETCH_BY_FOCUS[(m.focus || [])[0]] || []).slice(0, 2), swap: null,
    q: m.name, h: null, v: null, notes: {}, lib: m, custom: false };
}
function resolveEx(id, entry) {
  if (id.startsWith("lib-")) { const m = libItem(id.slice(4)); if (m) return libEx(m); }
  return exDef(id, entry);
}
// ---------------------------------------------------------------- each person's days
// Mat and Benny (and anyone who trains 4 days, split) use the original plan: Monday–Thursday keys, shown as Day 1–4.
// Everyone else gets a plan built from their questionnaire (program.js): keys D1…D7. "Bonus" is an extra day they build.
// Any plan day can be done at home: same day, same muscles, exercises swapped for their home gear (session.atHome).
const progMemo = new WeakMap();
function progOf(u) {
  const p = P(u); let m = progMemo.get(p);
  if (!m) { m = { A: PG.buildWeek(p, "A"), B: PG.buildWeek(p, "B"), homeA: PG.buildHome(p, "A"), homeB: PG.buildHome(p, "B") }; progMemo.set(p, m); }
  return m;
}
const curWeek = () => state.sel?.week || S.cycleInfo(TODAY(), cycleStart()).week;
function daysFor(u, week = curWeek()) { const w = progOf(u)[week]; return w ? w.map(d => d.key) : DAYS; }
function planDay(u, week, day) {
  const m = progOf(u);
  if (day === "Home") { const h = week === "B" ? m.homeB : m.homeA; return { title: h.title, ex: h.ex.map(id => resolveEx(id, {})).filter(Boolean) }; }
  if (day === "Bonus") { const b = bonusPickFor(u, week); const w = PG.buildBonus(P(u), b.focus, b.where, week); return { title: w.title, ex: w.ex.map(id => resolveEx(id, {})).filter(Boolean) }; }
  const d = m[week]?.find(x => x.key === day);
  if (d) return { title: d.title, ex: d.ex.map(id => resolveEx(id, {})).filter(Boolean) };
  return PLAN[week][day] || PLAN[week].Mon;
}
const dayName = day => (day === "Home" ? "Home workout" : day === "Bonus" ? "Bonus day" : DAY_NAMES[day] || (/^D\d$/.test(day || "") ? `Day ${day.slice(1)}` : day || ""));
// Doing a plan day at home: chosen on this phone (state.homeMode) or saved on the workout (atHome).
const homeKey = (u, date, sel = state.sel) => `${u}|${date}|${slotKey(sel)}`;
function isHome(u, date, sel = state.sel) {
  if (!sel || sel.day === "Bonus") return sel?.day === "Bonus" && bonusPickFor(u, sel.week).where === "home";
  const k = homeKey(u, date, sel); if (k in state.homeMode) return state.homeMode[k];
  return !!sessionFor(u, date, sel)?.atHome;
}
// A bonus day's focus and place: what was picked on this phone today, else what the saved bonus workout used.
function bonusPickFor(u, week) {
  if (state.bonusPick && state.bonusPick.u === u) return state.bonusPick;
  const s = sessionFor(u, BASE_DATE(), { week, day: "Bonus" });
  return { u, focus: s?.bonusFocus || "full", where: s?.bonusWhere || "gym" };
}
function bonusPicker(u) {
  const d = state.bonusDraft || { focus: "full", where: "gym" };
  return `<section class="card bonus-picker" id="bonus-picker" aria-labelledby="bp-h"><h3 class="h3" id="bp-h" tabindex="-1">Where do you want to focus?</h3>
    <div class="focus-chips ob-chips" role="group" aria-labelledby="bp-h">${Object.entries(PG.BONUS_FOCUS).map(([k, [l]]) => `<button type="button" data-act="bonusSet" data-k="focus" data-v="${k}" aria-pressed="${d.focus === k}">${esc(l)}</button>`).join("")}</div>
    <div class="field"><span id="bp-w">Where are you working out?</span><div class="seg" role="group" aria-labelledby="bp-w">${[["gym", "At the gym"], ["home", "At home"]].map(([k, l]) => `<button type="button" data-act="bonusSet" data-k="where" data-v="${k}" aria-pressed="${d.where === k}">${l}</button>`).join("")}</div></div>
    <button class="btn primary block" data-act="bonusGo">Build my bonus workout</button></section>`;
}
// The original plan day a built day is closest to (for warm-ups and the interval-cardio schedule).
function baseDay(u, week, day) {
  if (DAYS.includes(day)) return day;
  const t = planDay(u, week, day).title || "";
  return /chest|upper|push/i.test(t) ? "Mon" : /back|pull/i.test(t) ? "Tue" : /leg|glute|lower/i.test(t) ? "Wed" : /core|recovery/i.test(t) ? "Thu" : "Mon";
}
// Per-person plan changes: settings doc plan_<user> = { days: { "A-Mon": { add: [ids], remove: [ids] } } }
const planEdits = u => state.data.settings.find(x => x.id === `plan_${u}`)?.days || {};
function editPlan(users, weeks, day, fn) {
  for (const u of users) {
    const days = JSON.parse(JSON.stringify(planEdits(u)));
    for (const w of weeks) { const k = `${w}-${day}`; days[k] = { add: [], remove: [], order: [], sr: {}, title: "", ...(days[k] || {}) }; fn(days[k]); }
    save("settings", `plan_${u}`, { days });
  }
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

let toastTimer;
// What the app says: the theme's voice when it has one and Theme voice is on, otherwise the person's Personality.
const voiceSkin = () => (A.get().themeVoice && F.hasThemeVoice(document.body.dataset.skin) ? document.body.dataset.skin : null);
const sayV = (key, vars = {}, u = state.user) => F.say(P(u).voice, key, vars, voiceSkin());
// A toast in the theme's voice, read to screen readers in plain words.
const toastV = (key, vars = {}, u = state.user) => toast(sayV(key, vars, u), voiceSkin() ? F.plain(key, vars) : null);
// Messages stay up as long as the person chose in Accessibility (or until tapped).
function toast(msg, spoken = null) {
  let t = $(".toast");
  if (!t) { t = document.createElement("button"); t.type = "button"; t.className = "toast"; t.setAttribute("role", "status"); t.addEventListener("click", () => t.remove()); document.body.appendChild(t); }
  t.innerHTML = spoken ? `<span aria-hidden="true">${esc(msg)}</span><span class="visually-hidden">${esc(spoken)}</span><span class="toast-x" aria-hidden="true">✕</span><span class="visually-hidden">. Tap to dismiss.</span>` : `${esc(msg)}<span class="toast-x" aria-hidden="true">✕</span><span class="visually-hidden">. Tap to dismiss.</span>`;
  const secs = A.get().toastTime;
  clearTimeout(toastTimer); if (secs) toastTimer = setTimeout(() => t.remove(), secs * 1000);
}

// ---------------------------------------------------------------- state
const state = {
  fb: [], fbMode: null, fbDraft: null,
  bmSel: null, bmMode: store.get("twp-bm-mode", "effort"), bmShapeOpen: false, bodyShape: {},
  myGyms: [], defaultGym: null, gymPick: {}, gymEdit: null, gymQ: "",
  user: store.get("twp-user", null),
  partner: store.get("twp-partner", false),
  view: store.get("twp-view", "today"),
  logUser: null, logDate: null, viewUser: null, sel: null, userTouchedSel: false, homeMode: {}, bonusPicker: false, bonusDraft: null, bonusPick: null,
  variants: store.get("twp-variants", {}),
  editing: new Set(),
  data: { sessions: [], body: [], activities: [], settings: [], library: [], profiles: [], pings: [], gyms: [] }, libF: { q: "", equip: "all", focus: "all", pattern: "all", difficulty: "all", effort: "all", impact: "all", sort: "name", hideSore: "yes", ...store.get("twp-libf", {}) }, libEdit: null, libSwapFor: null, addPlan: null, planEdit: false,
  flags: {}, error: null, raw: {},
  progTab: "lifts", progEx: null, bodyField: "weight",
  repTab: "cycle", repCycle: null, cmpA: null, cmpB: null,
  confirmDel: null, timer: null, overlay: null, pickerQ: "",
  charts: []
};
state.partnerId = store.get("twp-partner-id", null);
if (state.view === "report") { state.view = "progress"; state.progTab = "report"; }
if (!["today", "progress", "body", "crew", "gym", "stretch"].includes(state.view)) state.view = "today";
Object.keys(localStorage).filter(k => k.startsWith("twp-draft-")).forEach(k => store.del(k)); // old whole-workout drafts

const cycleStart = () => state.data.settings.find(s => s.id === "app")?.cycleStart || "2026-09-28";
const LU = () => state.logUser || state.user;
// The day you're logging for (today unless you picked another date).
const BASE_DATE = () => state.logDate || TODAY();
// On the Workout tab, the date of the workout you're looking at: if this week/day was already logged in this
// cycle, that day's date; otherwise the logging date. Keeps each week's workouts separate.
const LD = () => (state.sel ? sessionFor(LU(), BASE_DATE())?.date : null) || BASE_DATE();

// Open on the first plan day in this cycle that isn't done yet (A Mon → B Thu), whatever today's date is.
// Only when all eight are done does it fall back to the calendar.
// The calendar date each plan day lands on in the current cycle (Week A Mon = the cycle start).
function slotDate(week, day) {
  const cyc = S.cycleInfo(BASE_DATE(), cycleStart());
  if (day === "Home") return BASE_DATE();
  return S.addDays(cyc.start, (week === "B" ? 7 : 0) + Math.max(0, daysFor(LU(), week).indexOf(day)));
}
// The next plan day to do, ignoring a home workout (which never stands in for a plan day).
function nextPlanDay() { const wk = S.cycleInfo(TODAY(), cycleStart()).week; return S.pickDay(state.data.sessions.filter(x => x.day !== "Home" && x.day !== "Bonus"), LU(), TODAY(), cycleStart(), daysFor(LU(), wk)); }
function autoSel() { const wk = S.cycleInfo(TODAY(), cycleStart()).week; return S.pickDay(state.data.sessions, LU(), TODAY(), cycleStart(), daysFor(LU(), wk)); }
// Weekly goal from the questionnaire (3 if they haven't taken it), and days with a bonus session logged.
const paceOf = u => +P(u).daysPerWeek || 3;
const bonusDates = u => state.data.activities.filter(a => a.user === u && /^Bonus/.test(a.type || "")).map(a => a.date);
// A plan day this week: done (with the date you did it), missed (the week ended without it), or open.
function dayStatus(u, week, day) {
  const cyc = S.cycleInfo(BASE_DATE(), cycleStart());
  const hit = state.data.sessions.filter(x => x.user === u && x.week === week && x.day === day && x.date >= cyc.start && x.date <= cyc.end)
    .find(x => (x.exercises || []).some(e => e.sets?.length) || x.markedDone);
  if (hit) return { state: "done", date: hit.date };
  if (S.addDays(slotDate(week, "Mon"), 6) >= TODAY()) return { state: "open" };
  // The week is over. If they hit their weekly goal, the rest weren't "missed", just extras they skipped.
  const doneCount = daysFor(u, week).filter(d => d !== day && state.data.sessions.some(x => x.user === u && x.week === week && x.day === d && x.date >= cyc.start && x.date <= cyc.end && ((x.exercises || []).some(e => e.sets?.length) || x.markedDone))).length;
  return { state: doneCount >= Math.min(daysFor(u, week).length, paceOf(u)) ? "skipped" : "missed" };
}
const variantOf = (u, ex) => repeatedV(u, ex) || state.variants[`${u}:${ex.id}`] || tailoredV(u, ex) || (P(u).defaultVariant === "hard" && ex.h ? "hard" : "std");
// The same version or machine picked the last two times this exercise was logged: open on it.
function repeatedV(u, ex) {
  if (ex.custom) return null;
  const h = S.exHistory(state.data.sessions, u, ex.id); if (h.length < 2) return null;
  const a = h[h.length - 1].variant || "std", b = h[h.length - 2].variant || "std";
  if (a !== b || !validV(ex, a)) return null;
  return a;
}
const validV = (ex, v) => !((v === "hard" && !ex.h) || (v === "swap" && !ex.swap) || (String(v).startsWith("lib:") && !libItem(String(v).slice(4))));
// The version the questionnaire picked for this person, if it still exists.
function tailoredV(u, ex) {
  const t = P(u).tailor?.[ex.id]; if (!t) return null;
  if ((t.v === "hard" && !ex.h) || (t.v === "swap" && !ex.swap) || (String(t.v).startsWith("lib:") && !libItem(t.v.slice(4)))) return null;
  return t.v;
}

// ---------------------------------------------------------------- sessions: one document per person per plan day
// Each workout belongs to a plan slot (Week A Monday, Week B Tuesday, ...) within a two-week cycle.
// Week A's Monday and Week B's Tuesday stay separate even if both are logged on the same date.
// Older records used the id "<person>_<date>"; new ones add the slot. Both are found the same way.
const slotKey = (sel = state.sel) => (sel ? `${sel.week}${sel.day}` : "");
const sid = (u, date, sel = state.sel) => `${u}_${date}_${slotKey(sel)}`;
function sessionFor(u, date, sel = state.sel) {
  if (!sel) return state.data.sessions.find(s => s.user === u && s.date === date) || null;
  const cyc = S.cycleInfo(date, cycleStart());
  const hits = state.data.sessions.filter(s => s.user === u && s.week === sel.week && s.day === sel.day && s.date >= cyc.start && s.date <= cyc.end && ((sel.day !== "Home" && sel.day !== "Bonus") || s.date === date));
  return hits.find(s => s.date === date) || hits.sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
}
// Something else (another week/day) was logged on this date: used so today's bike commute doesn't show on other days.
const otherSlotOn = (u, date) => state.data.sessions.some(s => s.user === u && s.date === date && (s.week !== state.sel?.week || s.day !== state.sel?.day));

// Only the changed fields are sent, so a partner logging on another phone can't wipe out what you saved.
function writeSession(u, date, fields) {
  const cur = sessionFor(u, date);
  if (cur) { patch("sessions", cur.id, fields); return; }
  const extra = state.sel.day === "Bonus" ? (({ focus, where }) => ({ bonusFocus: focus, bonusWhere: where }))(bonusPickFor(u, state.sel.week)) : isHome(u, date) ? { atHome: true } : {};
  if (!extra.atHome && extra.bonusWhere !== "home") { const g = currentGym(u, date); if (!g.virtual) Object.assign(extra, { gym: g.id, gymName: g.name }); }
  if (fields.ex || fields.cardio?.done) track({ workouts: 1, home: extra.atHome || extra.bonusWhere === "home" ? 1 : 0, bonus: state.sel.day === "Bonus" ? 1 : 0 });
  patch("sessions", sid(u, date), { user: u, date, week: state.sel.week, day: state.sel.day, ...extra, ...fields });
}
// Exercises are stored as a map keyed by exercise id (ex.<id>); older records used an array. Readers get one sorted array.
function normalizeSession(s) {
  if (!s.ex) return s;
  const map = Object.fromEntries(Object.entries(s.ex).filter(([, v]) => v));
  const legacy = (s.exercises || []).filter(e => !map[e.id]);
  const all = [...legacy, ...Object.values(map)].sort((a, b) => (a.order ?? 500) - (b.order ?? 500));
  return { ...s, exercises: all };
}

// Which plan day a workout really is, judged by the exercises in it (plan ids start with the day, like "a-mon-").
// The date doesn't matter: Week A Monday done on a Friday is still Week A Monday. Earlier versions labeled a
// workout with whatever day was on screen when it was first saved; this puts those under the right day.
const SLOT_RE = /^([ab])-(mon|tue|wed|thu)-/;
function inferredSlot(s) {
  const votes = {};
  for (const e of s.exercises || []) { const m = SLOT_RE.exec(e.id || ""); if (m && e.sets?.length) { const k = `${m[1].toUpperCase()}|${m[2][0].toUpperCase()}${m[2].slice(1)}`; votes[k] = (votes[k] || 0) + 1; } }
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;
  const [week, day] = best[0].split("|");
  return { week, day };
}
let relabeling = false;
function relabel() {
  if (relabeling || state.flags.sessions?.fromCache) return;
  relabeling = true;
  // A record holding exercises from two plan days (from the early date-only version) is split so each day gets its own.
  // Only the original plan's days are relabeled; built plans and home workouts reuse exercises across days.
  // Only records from before the slot-based version (Oct 8, 2026) are ever fixed up. Anything newer is left exactly as
  // logged, so an exercise added from another day's plan (say, Week B's adductor on a Week A day) stays where it was done.
  const CUTOFF = "2026-10-08";
  const legacySlot = s => s.date < CUTOFF && DAYS.includes(s.day) && !PG.usesProgram(P(s.user));
  // Undo the earlier mistake: put exercises that were split out of a newer workout back where they were logged.
  for (const s of [...state.data.sessions]) {
    if (!s.splitFrom || s.date < CUTOFF) continue;
    const home = state.data.sessions.find(x => x.id === s.splitFrom);
    if (!home) continue;
    const ex = Object.fromEntries((s.exercises || []).filter(e => e.sets?.length).map(e => [e.id, e]));
    if (Object.keys(ex).length) patch("sessions", home.id, { ex });
    remove("sessions", s.id);
  }
  for (const s of [...state.data.sessions]) {
    if (s.moved || !legacySlot(s)) continue;
    const bySlot = {};
    for (const e of s.exercises || []) { const m = SLOT_RE.exec(e.id || ""); if (m && e.sets?.length) (bySlot[`${m[1].toUpperCase()}|${m[2][0].toUpperCase()}${m[2].slice(1)}`] ||= []).push(e); }
    const slots = Object.keys(bySlot); if (slots.length < 2) continue;
    const main = slots.sort((a, b) => bySlot[b].length - bySlot[a].length)[0];
    for (const k of slots) {
      if (k === main) continue;
      const [week, day] = k.split("|");
      const exists = state.data.sessions.find(x => x.user === s.user && x.week === week && x.day === day && S.cycleInfo(x.date, cycleStart()).index === S.cycleInfo(s.date, cycleStart()).index && x !== s);
      const ex = Object.fromEntries(bySlot[k].map(e => [e.id, e]));
      if (exists) patch("sessions", exists.id, { ex }); else patch("sessions", `${s.user}_${s.date}_${week}${day}`, { user: s.user, date: s.date, week, day, ex, splitFrom: s.id });
      // Take them out of the original record (newer records keep exercises in a map, older ones in a list).
      if (s.ex) for (const e of bySlot[k]) { if (s.ex[e.id]) dropField("sessions", s.id, ["ex", e.id]); }
      const ids = new Set(bySlot[k].map(e => e.id));
      if ((s.exercises || []).some(e => ids.has(e.id) && !(s.ex && s.ex[e.id]))) patch("sessions", s.id, { exercises: (s.exercises || []).filter(e => !ids.has(e.id) && !(s.ex && s.ex[e.id])) });
    }
  }
  for (const s of state.data.sessions) {
    const r = inferredSlot(s);
    if (r && !s.moved && legacySlot(s) && (r.week !== s.week || r.day !== s.day)) { s.week = r.week; s.day = r.day; patch("sessions", s.id, { week: r.week, day: r.day }); }
  }
  relabeling = false;
}

// Tonight's first version saved a new document per save. Fold any duplicates into one per person per day.
let merging = false;
function consolidate() {
  if (merging || state.flags.sessions?.fromCache) return;
  const groups = {};
  for (const s of state.data.sessions) (groups[`${s.user}|${s.date}|${s.week}|${s.day}`] ||= []).push(s);
  for (const docs of Object.values(groups)) {
    const { user, date } = docs[0];
    if (docs.length === 1) continue;
    const keep = docs.find(d => d.id === `${user}_${date}`)?.id || sid(user, date, { week: docs[0].week, day: docs[0].day });
    merging = true;
    docs.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    const ex = new Map();
    for (const d of docs) for (const e of d.exercises || []) if (!e.skipped && e.sets?.length) ex.set(`${e.id}|${e.variant || "std"}`, e);
    const latest = (f) => docs.map(d => d[f]).filter(v => v && (typeof v !== "object" || Object.keys(v).length)).pop();
    const cardio = docs.map(d => d.cardio).filter(c => c?.done).pop() || null;
    const notes = [...new Set(docs.map(d => d.notes).filter(Boolean))].join(" ");
    const exMap = {}; [...ex.values()].forEach((e, i) => { exMap[e.id] = { ...e, order: e.order ?? i }; });
    const merged = { user, date, week: docs[0].week, day: docs[0].day, exercises: [], ex: exMap, cardio, pain: latest("pain") || null, recovery: latest("recovery") || null, notes };
    if (merged.pain || merged.recovery || notes) merged.checkin = true;
    // Merge rather than overwrite, in case the other phone saved something to this day a moment ago.
    patch("sessions", keep, merged);
    for (const d of docs) if (d.id !== keep) remove("sessions", d.id);
  }
  merging = false;
}

// ---------------------------------------------------------------- per-exercise drafts (kept on this phone until saved)
const dKey = (u, date, id) => `twp-x-${u}-${date}-${slotKey()}-${id}`;
const editKey = (u, date, id) => `${u}|${date}|${slotKey()}|${id}`;

function prefillSets(u, def, id, v, date = LD()) {
  const light = deloadActive(u, date) ? x => ({ ...x, sets: lightSets(x.sets, def.db) }) : x => x;
  const last = S.lastTime(state.data.sessions.filter(s => !deloadActive(u, s.date) || s.date === date), u, id, v);
  const { sets, min, max } = S.parseRange(def.sr || "3 × 10");
  if (last && last.sets?.length) {
    // Last time's weights and reps, but today's number of sets (the same move can have 2 sets one day, 3 another).
    const prev = S.withSides(last.sets, false).map(s => ({ w: s.w || 0, r: s.r || 0, d: 2 }));
    const n = last.id === id ? prev.length : sets || prev.length;
    return light({ sets: Array.from({ length: n }, (_, i) => ({ ...(prev[i] || prev[prev.length - 1]) })), fresh: false });
  }
  const start = (P(u).start || {})[v === "std" ? id : `${id}:${v}`] ?? 0;
  const r = def.kind === "time" ? (min || 30) : (max || min || 10);
  return light({ sets: Array.from({ length: sets || 3 }, () => ({ w: start, r, d: 2 })), fresh: true });
}
function getDraft(u, date, ex, logged) {
  const k = dKey(u, date, ex.id); const d = store.get(k, null);
  if (d) return sided(ex, d);
  if (logged) return { variant: logged.variant || "std", sets: logged.sets.map(s => ({ ...s, done: true })), fresh: false };
  let v = ex.custom ? "std" : variantOf(u, ex); let standIn = null;
  // Today's gym doesn't have what this version needs: start on the closest version or machine it does have.
  if (!ex.custom && !isHome(u, date)) {
    const g = currentGym(u, date);
    if (!Q.canDo(g, defOf(ex, v))) { const alt = gymAlternative(ex, v, g, u); if (alt) { standIn = { from: defOf(ex, v).name, gym: g.name }; v = alt; } }
  }
  const def = defOf(ex, v);
  const p = prefillSets(u, { sr: srFor(u, ex, def), kind: def.kind, db: def.db }, ex.id, v, date);
  return sided(ex, { variant: v, ...p, ...(standIn ? { standIn } : {}) });
}
// The closest thing today's gym can do: the plan's other version, then a matching machine, then the library
// exercise that works the same muscles the same way, and only then the harder version.
function gymAlternative(ex, v, g, u = LU()) {
  const ok = c => Q.canDo(g, defOf(ex, c));
  const first = ["std", "swap"].filter(x => x !== v && validV(ex, x)).concat((PLAN_MACHINES[ex.id] || []).filter(id => libItem(id)).map(id => `lib:${id}`)).find(ok);
  if (first) return first;
  const pattern = PLAN_PATTERN[ex.id] || "", focus = ex.focus || [];
  const best = allLibrary().filter(m => Q.canDo(g, m) && !conflicts(m, u).high.length && !m.home)
    .map(m => ({ m, score: (pattern && m.pattern === pattern ? 3 : 0) + (m.focus || []).filter(f => focus.includes(f)).length * 2 + (!!m.db === !!defOf(ex, v).db ? 1 : 0) }))
    .filter(x => x.score >= 4).sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name))[0];
  if (best) return `lib:${best.m.id}`;
  return ["hard"].find(x => x !== v && validV(ex, x) && ok(x)) || null;
}
// One-arm and one-leg moves log a Left and a Right row for each set.
function sided(ex, d) { return { ...d, sets: S.withSides(d.sets || [], S.isSided(defOf(ex, d.variant).name)) }; }
const putDraft = (u, date, id, d) => store.set(dKey(u, date, id), d);

// Extra exercises added for a day but not saved yet.
const xKey = (u, date) => `twp-extra-${u}-${date}-${slotKey()}`;
const getExtras = (u, date) => store.get(xKey(u, date), []);

function todaysList(u, date) {
  const { week, day } = state.sel;
  const s = sessionFor(u, date);
  const edits = dayEdits(u, week, day);
  let base = planDay(u, week, day).ex;
  if (day !== "Bonus" && isHome(u, date)) base = PG.homeVersion(P(u), base).map(id => resolveEx(id, {})).filter(Boolean);
  const list = base.filter(ex => !edits.remove.includes(ex.id)).map(ex => ({ ex, added: false }));
  for (const id of edits.add) { const ex = resolveEx(id, {}); if (ex && !ex.custom) list.push({ ex, added: false, planned: true }); }
  if (edits.order?.length) list.sort((a, b) => { const ia = edits.order.indexOf(a.ex.id), ib = edits.order.indexOf(b.ex.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
  const ids = new Set(list.map(x => x.ex.id));
  for (const e of s?.exercises || []) if (!ids.has(e.id)) { ids.add(e.id); list.push({ ex: resolveEx(e.id, e), added: true }); }
  for (const e of getExtras(u, date)) if (!ids.has(e.id)) { ids.add(e.id); list.push({ ex: resolveEx(e.id, e), added: true }); }
  return list;
}

// ---------------------------------------------------------------- render
function render() {
  const main = $("#main");
  destroyCharts();
  if (!state.auth?.ready || !state.auth.user || !state.auth.crewId) {
    applyAppearance(); $("#tabs").classList.add("hidden"); $("#who").classList.add("hidden"); $("#gear").classList.add("hidden"); $("#sync").classList.add("hidden");
    main.innerHTML = !state.auth?.ready ? `<p class="muted">Loading…</p>` : !state.auth.user ? viewSignIn() : viewCrewSetup();
    document.title = APP_NAME; A.restoreFocus(main);
    return;
  }
  if (state.user && state.flags.profiles && !profileIds().includes(state.user)) state.user = null;
  trackSeen();
  applyAppearance();
  if (!state.user) {
    $("#tabs").classList.add("hidden"); $("#who").classList.add("hidden");
    main.innerHTML = `<section class="pick">${logoHtml("small")}<h2>Who's training?</h2>
      <div class="pick-people">${profileIds().map(id => `<button class="btn person" data-act="pickUser" data-u="${id}">${avatarHtml(id, true)}<span>${esc(P(id).name)}</span></button>`).join("")}</div>
      <button class="btn" data-act="newProfile">+ New person</button>
      <p class="muted small">You can switch any time from the name button at the top.</p>
      <button class="btn small" data-act="openA11y"><span aria-hidden="true">♿</span> Accessibility options</button></section>`;
    return;
  }
  if (profileIds().length < 2) state.partner = false;
  if (!state.partner) state.logUser = state.user;
  $("#tabs").classList.remove("hidden"); $("#gear").classList.remove("hidden"); $("#sync").classList.remove("hidden");
  const who = $("#who"); who.classList.remove("hidden"); who.innerHTML = avatarHtml(state.user, false, true) + `<span class="who-name">${esc(P(state.user).name)}${state.partner ? " + " + esc(P(other(state.user)).name) : ""}</span>`; updateSync();
  document.querySelectorAll("#tabs button").forEach(b => { if (b.dataset.view === state.view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  // Pick the day to open on. Until workouts have loaded (and unless you've tapped a day), keep re-picking.
  // Switched to someone with different days (say, from a 4-day plan to a 2-day one): start them on their own day.
  if (state.sel && state.sel.day !== "Home" && state.sel.day !== "Bonus" && !daysFor(LU(), state.sel.week).includes(state.sel.day)) { state.sel = null; state.userTouchedSel = false; }
  if (!state.sel || (!state.selSettled && !state.userTouchedSel)) {
    // Logging a past date: open that date's workout. Otherwise the plan day for today's date.
    const s = state.logDate ? sessionFor(LU(), BASE_DATE(), null) : null;
    state.sel = s && s.week && s.day ? { week: s.week, day: s.day } : autoSel();
    if (state.flags.sessions && !state.flags.sessions.fromCache) state.selSettled = true;
  }
  if (!state.viewUser || !profileIds().includes(state.viewUser) || !canSee(state.viewUser)) state.viewUser = state.user;
  const banner = state.error ? `<div class="banner" role="alert">${esc(state.error)}</div>` : "";
  const views = { today: viewToday, progress: viewProgress, body: viewBody, crew: viewCrew, gym: viewGym, stretch: viewStretch };
  main.innerHTML = banner + views[state.view]();
  afterRender();
  document.title = APP_NAME; // the page name stays the brand, so shared links read "GymBunnies.fit"
  A.restoreFocus(main);
}
const VIEW_NAMES = { today: "Workout", progress: "Progress", body: "Body", crew: "Crew", gym: "Exercise library", stretch: "Stretch" };

// How much of someone's progress the rest of the crew sees: all | trained | none. You always see your own.
const shareOf = id => P(id).share || "all";
const canSee = id => id === state.user || shareOf(id) === "all";
function personToggle(act = "viewUser", cur = state.viewUser) {
  const ids = act === "viewUser" ? profileIds().filter(canSee) : profileIds();
  if (act === "viewUser" && ids.length < 2) return "";
  return `<div class="seg" role="group" aria-label="Person">${ids.map(u => `<button data-act="${act}" data-u="${u}" aria-pressed="${cur === u}">${avatarHtml(u)}${esc(P(u).name)}</button>`).join("")}</div>`;
}
function seg(act, current, opts, label, extra = "") {
  return `<div class="seg" role="group" aria-label="${esc(label || act)}">${opts.map(([v, l]) => `<button data-act="${act}" data-v="${v}" ${extra} aria-pressed="${current === v}">${esc(l)}</button>`).join("")}</div>`;
}

// ---------------------------------------------------------------- add-an-exercise picker
function openPicker() { state.overlay = "picker"; state.pickerQ = ""; drawPicker(); }
function drawPicker() {
  const u = LU(), date = LD(); const q = state.pickerQ.toLowerCase();
  const onList = new Set(todaysList(u, date).map(x => x.ex.id));
  const customs = new Map();
  for (const s of state.data.sessions) for (const e of s.exercises || []) if (e.id.startsWith("custom-")) customs.set(e.id, e);
  const match = n => !q || n.toLowerCase().includes(q);
  const item = (id, name, meta) => `<button class="list-btn" data-act="pickEx" data-id="${id}"><b>${esc(name)}</b><span class="small muted">${esc(meta)}</span></button>`;
  const libList = allLibrary().filter(m => !onList.has(`lib-${m.id}`) && match(m.name)).sort((a, b) => a.name.localeCompare(b.name)).map(m => `<button class="list-btn" data-act="pickLib" data-id="${esc(m.id)}"><b>${esc(m.name)}</b><span class="small muted">${esc([EQUIP[m.equip], (m.focus || []).map(f => FOCUS[f]).join(", ")].filter(Boolean).join(" · "))}</span></button>`).join("");
  const cust = [...customs.values()].filter(e => !onList.has(e.id) && match(e.name)).map(e => item(e.id, e.name, "Your exercise")).join("");
  const plan = Object.values(ALL_EX).filter(e => !onList.has(e.id) && match(e.n)).map(e => item(e.id, e.n, `Week ${e.week} ${dayName(e.day)} · ${e.sr}`)).join("");
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Add an exercise"><div class="inner">
    <div class="between"><h2 class="h2">Add an exercise</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <label class="field">Search<input type="text" id="picker-q" data-act="pickerQ" value="${esc(state.pickerQ)}" placeholder="Hip adductor, row, curl…" autocomplete="off"></label>
    <section class="card"><h3 class="h3">Something new</h3>
      <label class="field">Name<input type="text" id="cx-name" placeholder="Hip Adductor Machine"></label>
      <div class="grid2"><label class="field">What you track<select id="cx-kind"><option value="load">Weight × reps</option><option value="bw">Reps only</option><option value="time">Time (seconds)</option><option value="carry">Weight × steps</option><option value="assist">Assist weight × reps</option></select></label>
      <label class="check" style="align-self:end"><input type="checkbox" id="cx-db"><span>Dumbbells (weight per hand)</span></label></div>
      <div class="field"><span>What it works (so it shows up as a swap)</span><div class="focus-chips" id="cx-focus">${GROUPS.map(g => `<button type="button" data-act="libFocus" data-v="${g}" aria-pressed="false">${FOCUS[g]}</button>`).join("")}</div></div>
      <label class="check"><input type="checkbox" id="cx-lib" checked><span>Save it to the exercise library too</span></label>
      <button class="btn primary" data-act="addCustom">Add to today</button></section>
    ${libList ? `<section class="card"><h3 class="h3">From the gym library</h3><div class="pick-list">${libList}</div></section>` : ""}
    ${cust ? `<section class="card"><h3 class="h3">Ones you've added before</h3><div class="pick-list">${cust}</div></section>` : ""}
    <section class="card"><h3 class="h3">From the plan</h3><div class="pick-list">${plan || `<p class="muted small">No matches.</p>`}</div></section>
  </div></div>`;
}
function addExtra(entry) {
  const u = LU(), date = LD(); const xs = getExtras(u, date);
  if (!xs.find(x => x.id === entry.id)) xs.push(entry);
  store.set(xKey(u, date), xs); closeOverlay(); render();
  setTimeout(() => scrollInto(document.getElementById(`ex-${entry.id}`), "center", true), 50);
}

// ---------------------------------------------------------------- definitions incl. library swaps
function defOf(ex, v) {
  if (ex.lib && !String(v).startsWith("lib:")) return { name: ex.n, sr: ex.sr, kind: ex.kind, db: ex.db, focus: ex.focus, q: ex.q };
  if (ex.custom) return { name: ex.n, sr: ex.sr, kind: ex.kind, db: ex.db, focus: ex.focus?.length ? ex.focus : undefined };
  if (String(v).startsWith("lib:")) {
    const m = libItem(v.slice(4));
    return { name: m?.name || "Library exercise", sr: ex.sr, kind: m?.kind || ex.kind, db: !!m?.db, q: m?.name || ex.q, focus: m?.focus };
  }
  return variantDef(ex, v);
}
function guessEquip(n) {
  const s = n.toLowerCase();
  if (/smith|barbell/.test(s)) return "barbell";
  if (/cable|rope|pulley|face pull|pallof|woodchop|pulldown/.test(s)) return "cable";
  if (/dumbbell|goblet|farmer|suitcase/.test(s)) return "dumbbell";
  if (/machine|press|curl|extension|abductor|adductor|row|leg press|pec|deck|captain/.test(s)) return "machine";
  if (/treadmill|bike|elliptical|rower|stair/.test(s)) return "cardio";
  return "bodyweight";
}

// ---------------------------------------------------------------- library swap picker
function openLibSwap(id) { state.overlay = "libswap"; state.libSwapFor = { u: LU(), date: LD(), id }; state.libSwapAll = false; drawLibSwap(); }
function drawLibSwap() {
  const { u, date, id } = state.libSwapFor; const ex = todaysList(u, date).find(x => x.ex.id === id)?.ex; if (!ex) return;
  const pattern = PLAN_PATTERN[ex.id] || ex.lib?.pattern || "";
  const scored = allLibrary().filter(m => `lib-${m.id}` !== ex.id).map(m => {
    const overlap = (m.focus || []).filter(f => ex.focus.includes(f)).length;
    return { m, score: (pattern && m.pattern === pattern ? 3 : 0) + overlap * 2 + ((m.focus2 || []).some(f => ex.focus.includes(f)) ? 1 : 0), same: pattern && m.pattern === pattern, overlap };
  }).filter(x => x.overlap > 0 || x.same).filter(x => isHome(u, date) || Q.canDo(currentGym(u, date), x.m)).sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));
  const ok = scored.filter(x => !conflicts(x.m, u).high.length);
  const sore = scored.filter(x => conflicts(x.m, u).high.length);
  const btn = ({ m, same }) => {
    const c = conflicts(m, u);
    return `<button class="list-btn" data-act="pickLibSwap" data-id="${esc(m.id)}"><b>${esc(m.name)}</b>
      <span class="small muted">${esc([EQUIP[m.equip], (m.focus || []).map(f => FOCUS[f]).join(", "), same ? `same movement (${PATTERN[m.pattern]})` : ""].filter(Boolean).join(" · "))}</span>
      <span class="small muted">Difficulty ${dots(m.difficulty)} · Effort ${dots(m.effort)} · Impact ${LEVEL.impact[m.impact || 0]}</span>
      ${c.high.length ? `<span class="small bad">Hard on your ${esc(listText(c.high.map(j => JOINTS[j].toLowerCase())))}</span>` : c.some.length ? `<span class="small warn-text">Some load on your ${esc(listText(c.some.map(j => JOINTS[j].toLowerCase())))}</span>` : ""}</button>`;
  };
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Pick from the library"><div class="inner">
    <div class="between"><h2 class="h2">Pick from the library</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <p class="muted">Instead of <b>${esc(ex.n)}</b>${pattern ? ` (${esc(PATTERN[pattern].toLowerCase())})` : ""}, which works ${esc(listText(ex.focus.filter(f => FOCUS[f]).map(f => FOCUS[f].toLowerCase())))}. Same target: ${esc(ex.sr)}. Best matches first.</p>
    ${aches(u).length ? `<p class="small">Sore today: ${esc(aches(u).map(j => JOINTS[j]).join(", "))}. Change this in the exercise library (Settings).</p>` : ""}
    <section class="card"><div class="pick-list">${ok.length ? ok.map(btn).join("") : `<p class="muted small">No matches in the library yet.</p>`}</div></section>
    ${sore.length ? `<section class="card"><h3 class="h3">Hard on your sore areas</h3><div class="pick-list">${sore.map(btn).join("")}</div></section>` : ""}
  </div></div>`;
}

function riskBlock(m) {
  const j = Object.entries(m.joints || {}).filter(([, v]) => v);
  if (!j.length && !m.risks?.length && !m.heavy && !m.tip) return "";
  return `<div class="risk"><h4>Joints and injury risks</h4>
    ${j.length ? `<div class="joint-chips">${j.map(([k, v]) => `<span class="jchip ${v === 2 ? "high" : ""}">${esc(JOINTS[k])}: ${v === 2 ? "high load" : "some load"}</span>`).join("")}</div>` : ""}
    ${m.risks?.length ? `<ul class="risks">${m.risks.map(r => `<li><b>${esc(r.risk)}.</b> ${esc(r.avoid || "")}</li>`).join("")}</ul>` : ""}
    ${m.heavy ? `<p class="small"><b>If the dumbbells run out (about ${Q.gymDetails(currentGym()).dbMax || 50} lb at ${esc(currentGym().name)}):</b> ${esc(m.heavy)}</p>` : ""}
    ${m.tip ? `<p class="small"><b>Setting up the machine:</b> ${esc(m.tip)}</p>` : ""}
    ${m.mts ? `<p class="small"><b>MTS:</b> each arm moves on its own. Press or pull with both, or one side at a time to even out a weaker side.</p>` : ""}
    <p class="small muted">General guidance, not medical advice. Sharp or lasting pain is worth a doctor or physical therapist visit.</p></div>`;
}

// ---------------------------------------------------------------- GYM LIBRARY
function viewGym() {
  const F = state.libF; const u = state.viewUser;
  const all = allLibrary();
  const sore = aches(u);
  let list = all.filter(m =>
    (F.equip === "all" || m.equip === F.equip) &&
    (F.focus === "all" || (m.focus || []).includes(F.focus) || (m.focus2 || []).includes(F.focus)) &&
    (F.pattern === "all" || m.pattern === F.pattern) &&
    (F.difficulty === "all" || String(m.difficulty) === F.difficulty) &&
    (F.effort === "all" || String(m.effort) === F.effort) &&
    (F.impact === "all" || (m.impact || 0) <= +F.impact) &&
    (!F.q || m.name.toLowerCase().includes(F.q.toLowerCase())));
  const hiddenBySore = F.hideSore === "yes" ? list.filter(m => conflicts(m, u).high.length) : [];
  list = list.filter(m => !hiddenBySore.includes(m));
  // Only what today's gym has, unless "Everything" is picked.
  const gymNow = currentGym(); const where = F.where || "gym";
  const notHere = list.filter(m => !Q.canDo(gymNow, m)).length;
  if (where === "gym") list = list.filter(m => Q.canDo(gymNow, m));
  const sorts = {
    name: (a, b) => a.name.localeCompare(b.name),
    easy: (a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name),
    hard: (a, b) => b.difficulty - a.difficulty || a.name.localeCompare(b.name),
    light: (a, b) => a.effort - b.effort || a.name.localeCompare(b.name),
    heavy: (a, b) => b.effort - a.effort || a.name.localeCompare(b.name),
    impact: (a, b) => (a.impact || 0) - (b.impact || 0) || a.name.localeCompare(b.name)
  };
  list.sort(sorts[F.sort] || sorts.name);
  const equipCounts = Object.fromEntries(Object.keys(EQUIP).map(k => [k, all.filter(m => m.equip === k).length]));
  const sel = (k, label, opts) => `<label class="field">${label}<select data-act="libSel" data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(F[k]) === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  const chips = (k, opts) => `<div class="focus-chips">${opts.map(([v, l]) => `<button type="button" data-act="libF" data-k="${k}" data-v="${v}" aria-pressed="${F[k] === v}">${esc(l)}</button>`).join("")}</div>`;
  const editing = state.libEdit ? (state.libEdit === "new" ? {} : libItem(state.libEdit)) : null;
  const ap = state.addPlan;
  const hidden = hiddenBuiltins();
  const quick = Object.values(ALL_EX).filter(e => /machine|cable|smith|pulldown|pec|deck|press \(|leg press|captain|row machine|torso/i.test(e.n) && !all.some(m => m.name.toLowerCase() === e.n.toLowerCase()));
  const seen = new Set(); const quickU = quick.filter(e => !seen.has(e.n) && seen.add(e.n));
  return `<div class="row"><button type="button" class="btn small" data-act="libDone">${icon("chevron", 16, { stroke: 2 })}<span>Back to your workout</span></button></div><section class="card">
    <div class="between"><h2 class="h2">Exercise library</h2>${personToggle()}</div>
    <p class="small muted">${all.length} exercises. ${esc(gymNow.name)}${Q.gymDetails(gymNow).dbMax ? ` dumbbells go to about ${Q.gymDetails(gymNow).dbMax} lb` : " has no dumbbells listed"}. Swaps and "Add an exercise" pull from here.</p>
    <div class="field"><span>Where</span>${chips("where", [["gym", `At ${gymNow.name}`], ["all", "Everything"]])}</div>
    ${where === "gym" && notHere ? `<p class="small muted">${notHere} more need equipment ${esc(gymNow.name)} doesn't list. Pick Everything to see them.</p>` : ""}
    ${ap ? `<div class="banner">Adding to ${ap.who === "both" ? "both plans" : esc(PROFILES[ap.who].name) + "'s plan"}: tap <b>Add to plan</b> on any exercise. <button class="btn small" data-act="apCancel">Cancel</button></div>` : ""}
    <label class="field">Search<input type="text" id="lib-q" data-act="libQ" value="${esc(F.q)}" placeholder="Row, lunge, press…" autocomplete="off"></label>
    <div class="field"><span>Equipment</span>${chips("equip", [["all", `All ${all.length}`], ...Object.entries(EQUIP).filter(([k]) => equipCounts[k]).map(([k, l]) => [k, `${l} ${equipCounts[k]}`])])}</div>
    <div class="field"><span>Focus</span>${chips("focus", [["all", "All"], ...GROUPS.map(g => [g, FOCUS[g]])])}</div>
    <details class="more"><summary>More filters and sorting</summary><div class="panel"><div class="grid2">
      ${sel("pattern", "Movement", [["all", "Any"], ...Object.entries(PATTERN)])}
      ${sel("difficulty", "Difficulty", [["all", "Any"], ["1", "Beginner"], ["2", "Intermediate"], ["3", "Advanced"]])}
      ${sel("effort", "Effort", [["all", "Any"], ["1", "Light"], ["2", "Moderate"], ["3", "Hard"]])}
      ${sel("impact", "Impact", [["all", "Any"], ["0", "None only"], ["1", "Low or none"]])}
      ${sel("sort", "Sort by", [["name", "Name"], ["easy", "Easiest first"], ["hard", "Hardest first"], ["light", "Least effort"], ["heavy", "Most effort"], ["impact", "Lowest impact"]])}
    </div></div></details>
    <div class="field"><span>${esc(PROFILES[u].name)}'s sore spots today</span><div class="focus-chips">${Object.entries(JOINTS).map(([k, l]) => `<button type="button" class="ache" data-act="ache" data-v="${k}" aria-pressed="${sore.includes(k)}">${esc(l)}</button>`).join("")}</div></div>
    ${sore.length ? `<label class="field">Exercises that load sore spots heavily<select data-act="libSel" data-k="hideSore"><option value="yes" ${F.hideSore === "yes" ? "selected" : ""}>Hide them</option><option value="no" ${F.hideSore !== "yes" ? "selected" : ""}>Show them with a warning</option></select></label>` : ""}
    <div class="between"><span class="small muted mono">Showing ${list.length}${hiddenBySore.length ? ` · ${hiddenBySore.length} hidden for sore spots` : ""}</span><button class="btn small" data-act="libNew">+ New exercise or machine</button></div>
  </section>
  ${editing ? libForm(editing) : ""}
  ${list.map(m => libCard(m, u)).join("") || `<section class="card"><p class="muted">Nothing matches these filters.</p></section>`}
  ${quickU.length ? `<section class="card"><details class="more"><summary>Quick add machines from our plan (${quickU.length})</summary><div class="panel"><p class="small muted">For when you're ready to add the real machines. One tap adds it with the plan's focus areas; edit it afterwards to fill in joints and risks.</p><div class="pick-list">${quickU.map(e => `<button class="list-btn" data-act="libQuick" data-id="${e.id}"><b>${esc(e.n)}</b><span class="small muted">${esc(e.focus.filter(x => GROUPS.includes(x)).map(x => FOCUS[x]).join(", "))}</span></button>`).join("")}</div></div></details></section>` : ""}
  ${hidden.length ? `<section class="card"><h3 class="h3">Hidden exercises</h3>${hidden.map(d => { const b = BUILTIN.find(x => x.id === d.id); return `<div class="list-item"><span>${esc(b.name)}</span><button class="btn small" data-act="libRestore" data-id="${esc(d.id)}">Restore</button></div>`; }).join("")}</section>` : ""}`;
}
function libCard(m, u) {
  const c = conflicts(m, u);
  return `<article class="card lib-card">
    <div class="head"><h3 class="name">${esc(m.name)}</h3><span class="sr">${esc(m.sr || "")}</span></div>
    <div class="small muted">${esc([EQUIP[m.equip], PATTERN[m.pattern], POSITION[m.position], m.unilateral ? "One side at a time" : ""].filter(Boolean).join(" · "))}</div>
    <div class="small"><b>${esc((m.focus || []).map(f => FOCUS[f]).join(", "))}</b>${m.focus2?.length ? `<span class="muted"> · also ${esc(m.focus2.map(f => FOCUS[f].toLowerCase()).join(", "))}</span>` : ""}</div>
    <div class="meters small"><span>Difficulty <b class="mono">${dots(m.difficulty)}</b></span><span>Effort <b class="mono">${dots(m.effort)}</b></span><span>Impact <b>${LEVEL.impact[m.impact || 0]}</b></span></div>
    ${c.high.length ? `<div class="pill hold">Hard on your ${esc(listText(c.high.map(j => JOINTS[j].toLowerCase())))} today.</div>` : c.some.length ? `<div class="small warn-text">Some load on your ${esc(listText(c.some.map(j => JOINTS[j].toLowerCase())))}.</div>` : ""}
    <details class="more"><summary>How to, risks &amp; video</summary><div class="panel">
      ${m.how ? `<p>${esc(m.how)}</p>` : ""}
      <a class="video" href="${yt(m.name)}" target="_blank" rel="noopener">Watch form videos</a>
      ${riskBlock(m)}
    </div></details>
    <div class="row"><button class="btn small" data-act="libToday" data-id="${esc(m.id)}">Add to today</button><button class="btn small" data-act="libPlan" data-id="${esc(m.id)}">Add to plan</button><button class="btn small" data-act="libEdit" data-id="${esc(m.id)}">Edit</button></div>
  </article>`;
}
function libForm(m) {
  const isNew = !m.id; const j = m.joints || {};
  const focus = m.focus || [];
  const opt = (obj, cur) => Object.entries(obj).map(([k, l]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${esc(l)}</option>`).join("");
  const lvl = (name, arr, cur, start = 1) => `<select id="lib-${name}">${arr.map((l, i) => i >= start ? `<option value="${i}" ${+cur === i ? "selected" : ""}>${esc(l)}</option>` : "").join("")}</select>`;
  const risksText = (m.risks || []).map(r => `${r.area ? (JOINTS[r.area] || r.area) + ": " : ""}${r.risk}${r.avoid ? " — " + r.avoid : ""}`).join("\n");
  return `<section class="card" id="lib-form"><h3 class="h3">${isNew ? "New exercise or machine" : `Edit ${esc(m.name)}`}</h3>
    <label class="field">Name<input type="text" id="lib-name" value="${esc(m.name || "")}" placeholder="Hip Adductor Machine"></label>
    <div class="field"><span>Main focus (pick all that apply)</span><div class="focus-chips" id="lib-focus">${GROUPS.map(g => `<button type="button" data-act="libFocus" data-v="${g}" aria-pressed="${focus.includes(g)}">${FOCUS[g]}</button>`).join("")}</div></div>
    <div class="grid2">
      <label class="field">Equipment<select id="lib-equip">${opt(EQUIP, m.equip || "machine")}</select></label>
      <label class="field">Movement<select id="lib-pattern"><option value="">Not set</option>${opt(PATTERN, m.pattern)}</select></label>
      <label class="field">Position<select id="lib-position"><option value="">Not set</option>${opt(POSITION, m.position)}</select></label>
      <label class="field">What you track<select id="lib-kind">${opt(KIND_LABEL, m.kind || "load")}</select></label>
      <label class="field">Difficulty${lvl("difficulty", LEVEL.difficulty, m.difficulty || 1)}</label>
      <label class="field">Effort${lvl("effort", LEVEL.effort, m.effort || 2)}</label>
      <label class="field">Impact${lvl("impact", LEVEL.impact, m.impact || 0, 0)}</label>
      <label class="field">Sets × reps<input type="text" id="lib-sr" value="${esc(m.sr || "3 × 10")}"></label>
    </div>
    <label class="check"><input type="checkbox" id="lib-db" ${m.db ? "checked" : ""}><span>Dumbbells (weight per hand)</span></label>
    <label class="check"><input type="checkbox" id="lib-uni" ${m.unilateral ? "checked" : ""}><span>One side at a time</span></label>
    <div class="field"><span>Joint load</span><div class="grid2">${Object.entries(JOINTS).map(([k, l]) => `<label class="field">${esc(l)}<select data-joint="${k}"><option value="0">None</option><option value="1" ${j[k] === 1 ? "selected" : ""}>Some</option><option value="2" ${j[k] === 2 ? "selected" : ""}>High</option></select></label>`).join("")}</div></div>
    <label class="field">How to do it<textarea id="lib-how" placeholder="Seat setting, grip, the movement…">${esc(m.how || m.notes || "")}</textarea></label>
    <label class="field">Injury risks, one per line (Area: what can go wrong — how to avoid it)<textarea id="lib-risks" placeholder="Knees: pain from locking out — stop just short of straight">${esc(risksText)}</textarea></label>
    <div class="row"><button class="btn primary" data-act="libSave">${isNew ? "Add to library" : "Save changes"}</button><button class="btn" data-act="libCancel">Cancel</button>
      ${isNew ? "" : `<button class="btn danger" data-act="libDelete" data-id="${esc(m.id)}">${state.confirmDel === m.id ? "Tap again to confirm" : m.builtin ? "Hide" : "Delete"}</button>`}</div>
  </section>`;
}
function saveLibrary() {
  const name = $("#lib-name").value.trim(); if (!name) { toast("Give it a name first."); return; }
  const focus = [...document.querySelectorAll("#lib-focus [aria-pressed=true]")].map(b => b.dataset.v);
  if (!focus.length) { toast("Pick at least one focus area, so it can show up as an option in Library."); return; }
  const joints = {}; document.querySelectorAll("[data-joint]").forEach(sel => { if (+sel.value) joints[sel.dataset.joint] = +sel.value; });
  const areaByLabel = Object.fromEntries(Object.entries(JOINTS).map(([k, l]) => [l.toLowerCase(), k]));
  const risks = $("#lib-risks").value.split("\n").map(x => x.trim()).filter(Boolean).map(line => {
    const m = line.match(/^([^:]{2,20}):\s*(.*)$/); let area = "", rest = line;
    if (m && areaByLabel[m[1].toLowerCase()]) { area = areaByLabel[m[1].toLowerCase()]; rest = m[2]; }
    const [risk, avoid = ""] = rest.split(/\s+—\s+|\s+-\s+/);
    return { area, risk: risk.replace(/\.$/, ""), avoid };
  });
  const id = state.libEdit !== "new" ? state.libEdit : slug(name);
  save("library", id, {
    name, focus, equip: $("#lib-equip").value, pattern: $("#lib-pattern").value, position: $("#lib-position").value, kind: $("#lib-kind").value,
    difficulty: +$("#lib-difficulty").value, effort: +$("#lib-effort").value, impact: +$("#lib-impact").value, sr: $("#lib-sr").value.trim() || "3 × 10",
    db: $("#lib-db").checked, unilateral: $("#lib-uni").checked, joints, how: $("#lib-how").value.trim(), risks
  });
  toast(state.libEdit !== "new" ? "Saved." : `Added ${name}.`); state.libEdit = null; render();
}

// ---------------------------------------------------------------- plan editing
function planEditBox(u, week, day) {
  const edits = dayEdits(u, week, day);
  const removed = edits.remove.map(id => ALL_EX[id]).filter(Boolean);
  return `<div class="banner">Editing ${esc(P(u).name)}'s plan for Week ${week} ${dayName(day)}. Move, retarget, or remove exercises on each card below.</div>
    <label class="field">Day name<input type="text" data-act="planTitle" value="${esc(dayTitle(u, week, day))}"></label>
    ${removed.length ? `<div class="field"><span>Removed from this day</span>${removed.map(e => `<div class="list-item"><span>${esc(e.n)}</span><button class="btn small" data-act="planRestore" data-id="${e.id}">Put back</button></div>`).join("")}</div>` : ""}
    <div class="row"><button class="btn small" data-act="planFromLib">+ Add from the library</button>
      ${other(u) !== u ? `<button class="btn small" data-act="planCopy">Copy this day to ${esc(P(other(u)).name)}</button>` : ""}
      <button class="btn small danger" data-act="planClear">${state.confirmDel === "planClear" ? "Tap again to clear" : "Clear this day"}</button>
      <button class="btn small" data-act="planReset">${state.confirmDel === "planReset" ? "Tap again to reset" : "Reset to original"}</button></div>`;
}
function openAddPlan(libId) {
  const pre = state.addPlan || {};
  state.addPlan = { libId, who: pre.who || state.viewUser, week: pre.week || state.sel?.week || "A", day: pre.day || state.sel?.day || "Mon" };
  state.overlay = "addplan"; drawAddPlan();
}
function drawAddPlan() {
  const a = state.addPlan; const m = libItem(a.libId);
  const segA = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-act="apSet" data-k="${k}" data-v="${v}" aria-pressed="${a[k] === v}">${esc(l)}</button>`).join("")}</div>`;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Add to plan"><div class="inner">
    <div class="between"><h2 class="h2">Add to plan</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <p><b>${esc(m.name)}</b> · ${esc(m.sr)}</p>
    <div class="field"><span>Whose plan</span>${segA("who", [...profileIds().map(id => [id, P(id).name]), ...(profileIds().length > 1 ? [["both", profileIds().length > 2 ? "Me + partner" : "Both"]] : [])])}</div>
    <div class="field"><span>Week</span>${segA("week", [["A", "Week A"], ["B", "Week B"], ["AB", "Both weeks"]])}</div>
    <div class="field"><span>Day</span><div class="chips">${daysFor(a.who === "both" ? LU() : a.who, "A").map(d => `<button data-act="apSet" data-k="day" data-v="${d}" aria-pressed="${a.day === d}">${dayName(d)}<small>${esc(planDay(a.who === "both" ? LU() : a.who, "A", d).title.split(",")[0])}</small></button>`).join("")}</div></div>
    <button class="btn primary block" data-act="apSave">Add to plan</button>
  </div></div>`;
}
function saveAddPlan() {
  const a = state.addPlan; const id = `lib-${a.libId}`;
  const users = a.who === "both" ? [state.user, other(state.user)] : [a.who]; const weeks = a.week === "AB" ? ["A", "B"] : [a.week];
  editPlan(users, weeks, a.day, d => { if (!d.add.includes(id)) d.add.push(id); });
  toast(`Added to ${a.who === "both" ? "both plans" : esc(PROFILES[a.who].name) + "'s plan"}: ${a.week === "AB" ? "Weeks A and B" : "Week " + a.week} ${dayName(a.day)}.`);
  state.addPlan = null; closeOverlay(); render();
}

// ---------------------------------------------------------------- appearance
const THEMES = {
  bunny: { name: "Bunny", desc: "Charcoal and hot pink, with a playful streak.", sw: ["#211f1f", "#fb40ad", "#f7f1f3"], voice: true },
  lanai: { name: "The Lanai", desc: "Miami, 1985. Wicker, peach, seafoam and cheesecake.", sw: ["#fbf1e4", "#1f6f66", "#a33f33"], voice: true },
  floor: { name: "Gym Floor", desc: "The original. Follows light/dark.", sw: ["#eceee9", "#2f6b5e", "#b5532f"] },
  synthwave: { name: "Synthwave", desc: "Neon night drive.", sw: ["#1b0633", "#ff3fd8", "#3ff6ff"] },
  iron: { name: "Iron & Chalk", desc: "Rubber floor, plate colors.", sw: ["#18191b", "#d9412f", "#e3b23c"] },
  arcade: { name: "Arcade", desc: "Chunky pixels, high score.", sw: ["#0a0a12", "#ffd400", "#39ff88"] },
  clean: { name: "Clean Light", desc: "Calm and bright.", sw: ["#f5f6f8", "#3563e9", "#e0662e"] }
};
const AVATARS = ["🐺", "🦊", "🐻", "🦁", "🐯", "🦍", "🐂", "🦅", "🐉", "🦈", "🐙", "🦄", "🔥", "⚡", "💪", "🏋️", "🚲", "🌙", "⭐", "🎧"];
const FUN_LEVELS = { light: "Light: record celebrations and badges", medium: "Medium: plus streaks, progress ring, finish screen, and high-fives", full: "Full: plus points, levels, and a weekly leaderboard" };
const funAt = (lvl, u = state.user) => ({ light: 1, medium: 2, full: 3 })[P(u).fun || "medium"] >= ({ light: 1, medium: 2, full: 3 })[lvl];

function applyAppearance() {
  const p = state.user ? P(state.user) : null; const b = document.body;
  b.dataset.skin = p?.theme && THEMES[p.theme] ? p.theme : "bunny";
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const acc = p ? (p.accent || (b.dataset.skin === "floor" ? (dark ? `color-mix(in srgb, ${p.color} 55%, #ffffff)` : p.color) : "")) : "";
  if (acc) b.style.setProperty("--accent", acc); else b.style.removeProperty("--accent");
  A.load(p ? { ...(p.textSize && !p.a11y?.textSize ? { textSize: p.textSize } : {}), ...(p.a11y || {}) } : null, state.user || null); A.apply();
  const bg = getComputedStyle(b).getPropertyValue("--bg").trim();
  // Light or dark page, so the logo with the right text color shows.
  const probe = document.createElement("i"); probe.style.color = "var(--bg)"; b.appendChild(probe);
  const [r, g, bl] = (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number); probe.remove();
  b.dataset.tone = (0.299 * r + 0.587 * g + 0.114 * bl) > 140 ? "light" : "dark";
  document.querySelector("meta[name=theme-color]")?.setAttribute("content", bg.startsWith("#") ? bg : "#12181a");
}
function avatarHtml(id, big, dot) {
  const p = P(id);
  return `<span class="av ${big ? "big" : ""}" data-p="${esc(id)}" style="--c:${esc(p.color)}" aria-hidden="true">${esc(p.avatar || (p.name || "?")[0].toUpperCase())}${dot ? `<i class="online"></i>` : ""}</span>`;
}
function saveProfile(id, fields) {
  const exists = state.data.profiles.some(p => p.id === id);
  const base = exists ? {} : (({ id: _i, updatedAt: _u, ...rest }) => rest)(P(id));
  patch("profiles", id, { ...base, ...fields });
  profMemo = { src: null, map: {} };
}
function celebrate(kind, text, spoken = null) {
  const p = P(state.user);
  if (text) toast(text, spoken);
  const skin = document.body.dataset.skin;
  const colors = skin === "lanai" ? ["#f4b393", "#9fd3c7", "#a33f33", "#1f6f66"]
    : skin === "bunny" ? ["#fb40ad", "#f7f1f3", "#8ad1c2", "#b7a6ff"]
    : [cssVar("--accent"), cssVar("--plate"), cssVar("--good"), cssVar("--warn")].filter(Boolean);
  if (A.get().calm) return;
  if (kind === "pr" || kind === "badge" || kind === "level" || (kind === "finish" && funAt("medium"))) { if (!A.reduceMotion()) F.confetti(colors); if (p.sound) F.fanfare(); A.buzz([60, 40, 120]); }
  else if (p.sound && kind !== "quiet") F.chime();
}

// ---------------------------------------------------------------- gym settings, weight steps, lighter weeks
const gymSet = () => state.data.settings.find(x => x.id === "gym") || {};

// ---------------------------------------------------------------- gyms
// Crew gyms live in the crew's data (everyone in the crew sees and uses them). Personal gyms live on the
// person's own account record (users/{uid}), which only they can read. "preset:<key>" = a ready-made gym
// used until someone sets one up.
const crewGyms = () => (state.data.gyms || []).filter(g => !g.archived).map(g => ({ ...g, crew: true }));
const allGyms = () => [...crewGyms(), ...(state.myGyms || []).map(g => ({ ...g, crew: false }))].sort((a, b) => a.name.localeCompare(b.name));
function gymById(id) {
  if (!id) return null;
  if (String(id).startsWith("preset:")) { const k = id.slice(7); const p = Q.PRESETS[k]; return p ? { id, name: p.name, preset: k, items: p.items, details: p.details, virtual: true } : null; }
  return allGyms().find(g => g.id === id) || null;
}
const gymPickKey = (date = LD()) => date;
// Where today's workout happens: what the saved workout says, else what was picked today, else your default, else the first gym.
function currentGym(u = LU(), date = LD()) {
  const s = sessionFor(u, date);
  return gymById(s?.gym) || gymById(state.gymPick[gymPickKey(date)]) || gymById(state.defaultGym) || allGyms()[0] || Q.DEFAULT_GYM;
}
function saveMyGyms() {
  const uid = state.auth.user?.uid; if (!uid) return;
  store.set(`twp-gyms-${uid}`, { list: state.myGyms, def: state.defaultGym });
  setUserDoc(uid, { gyms: state.myGyms, defaultGym: state.defaultGym || null }).catch(() => toast("Couldn't save your gyms. They're kept on this phone for now."));
}
// Change one gym wherever it lives.
function updateGym(id, fields) {
  const crew = crewGyms().find(g => g.id === id);
  if (crew) { patch("gyms", id, fields); return; }
  state.myGyms = state.myGyms.map(g => g.id === id ? { ...g, ...fields } : g); saveMyGyms();
}
const newGymId = () => `gym-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
// Mat and Benny's gym: everything the app listed for Planet Fitness Kirkwood, plus whatever any version of
// any plan exercise needs, so the plan stays exactly as it was. Made once, for the crew they train in.
let gymMigrated = false;
function migrateGym() {
  if (gymMigrated) return;
  const f = state.flags; if (!f.sessions || !f.gyms || !f.settings || f.sessions.fromCache || f.gyms.fromCache || f.settings.fromCache) return;
  gymMigrated = true;
  if ((state.data.gyms || []).length) return;
  if (!state.data.sessions.some(s => s.user === "mat" || s.user === "benny")) return;
  const defs = Object.values(ALL_EX).flatMap(ex => ["std", "hard", "swap"].filter(v => !((v === "hard" && !ex.h) || (v === "swap" && !ex.swap))).map(v => variantDef(ex, v)));
  const items = Q.coverAll(Q.PRESETS.pf.items, [...defs, ...BUILTIN.filter(b => b.equip === "machine")]);
  save("gyms", "pf-kirkwood", { name: GYM.name, preset: "pf", items, owner: state.auth.user?.uid || "", createdAt: Date.now(),
    details: { ...Q.DETAIL_DEFAULTS, dbMax: GYM.maxDumbbell, dbStep: 2.5, machineStep: 2.5, cableStep: 2.5, smithBar: gymSet().smithBar ?? "" } });
}
// Weight steps come from today's gym: its dumbbell, cable and machine steps (hold the button to keep going).
function stepFor(db, kind, w, dir, name = "") {
  if (kind === "assist") return 5;
  const g = Q.gymDetails(currentGym());
  if (/cable|pulldown|face pull|pallof|pushdown|crossover/i.test(name)) return +g.cableStep || 2.5;
  if (db) return +g.dbStep || 2.5;
  return +g.machineStep || 2.5;
}
const roundTo = (w, step) => Math.max(0, Math.round(w / step) * step);
const deloadOf = u => state.data.settings.find(x => x.id === `deload_${u}`) || null;
const deloadActive = (u, date) => { const d = deloadOf(u); return !!(d && d.from && date >= d.from && date <= d.to); };
function deloadSuggestion(u) {
  if (deloadActive(u, TODAY())) return null;
  const ss = S.userSessions(state.data.sessions, u).filter(s => (s.exercises || []).some(e => e.sets?.length));
  if (!ss.length) return null;
  const since = deloadOf(u)?.to || ss[0].date;
  const weeks = Math.floor(S.daysBetween(since, TODAY()) / 7);
  if (weeks >= 6) return `It's been ${weeks} weeks of steady training. A lighter week now helps your joints recover and keeps progress coming.`;
  const recent = ss.filter(s => s.date >= S.addDays(TODAY(), -14)).flatMap(s => (s.exercises || []).flatMap(e => e.sets || []));
  if (recent.length >= 30 && recent.filter(x => x.d === 3).length / recent.length >= .45) return "Almost half your sets in the last two weeks felt hard. A lighter week could help you bounce back stronger.";
  return null;
}
function lightSets(sets, db) {
  return sets.slice(0, Math.max(2, sets.length - 1)).map(s => ({ ...s, w: roundTo((+s.w || 0) * .6, db ? 2.5 : 5) }));
}

// ---------------------------------------------------------------- warm-ups
const WARMUPS = {
  Mon: ["Arm circles, 10 each direction", "Cable or band pull-aparts, 15", "Incline push-ups against a bench, 10", "Shoulder rolls, 10"],
  Tue: ["Arm circles, 10 each direction", "Light straight-arm cable pulldown, 15", "Shoulder rolls, 10", "Light lat pulldown, 12"],
  Wed: ["Bodyweight squats to a bench, 10", "Glute bridges on the floor, 12", "Leg swings, 10 each leg (hold something)", "Bodyweight reverse lunges, 6 each leg"],
  Thu: ["Standing knee hugs, 8 each leg", "Bodyweight squats to a bench, 10", "Standing side bends, 10 each side", "Dead bug, 5 each side"]
};
function warmupCard(u, date, s, list) {
  if (s?.warmup && !state.editing.has(editKey(u, date, "warmup"))) return `<section class="card done-card"><div class="head"><h3 class="name"><span class="tick" aria-hidden="true">✓</span><span class="visually-hidden">Done: </span>Warm-up</h3><button class="btn small" data-act="undoWarmup">Undo</button></div></section>`;
  const first = list.find(x => (x.ex.kind === "load") && !s?.exercises?.some(e => e.id === x.ex.id));
  let ramp = "";
  if (first) {
    const d = getDraft(u, date, first.ex, null); const def = defOf(first.ex, d.variant);
    const top = Math.max(0, ...d.sets.map(x => +x.w || 0));
    if (top > 0) ramp = `<li><b>Ramp-up sets for ${esc(def.name)}:</b> 10 reps at about ${roundTo(top * .5, def.db ? 2.5 : 5)} lb${def.db ? " each" : ""}, then 5 reps at about ${roundTo(top * .75, def.db ? 2.5 : 5)} lb${def.db ? " each" : ""}.</li>`;
  }
  return `<section class="card"><details class="more" ${s?.warmup ? "" : "open"}><summary>Warm-up · 8 minutes</summary><div class="panel">
    <ul class="warmup small"><li><b>5 minutes easy</b> on the bike or elliptical, until you're slightly warm.</li>${(WARMUPS[baseDay(LU(), state.sel.week, state.sel.day)] || WARMUPS.Mon).map(m => `<li>${esc(m)}</li>`).join("")}${ramp}</ul>
    <button class="btn primary block" data-act="warmupDone">Warm-up done</button></div></details></section>`;
}

// ---------------------------------------------------------------- start / finish
let elapsedTick;
function workoutBar(u, date, s) {
  clearInterval(elapsedTick);
  if (date !== TODAY() && !s?.startedAt) return "";
  if (!s?.startedAt) return `<button class="btn primary block start-btn" data-act="startWorkout">${play(18)}Start workout</button>`;
  if (!s.finishedAt) {
    elapsedTick = setInterval(() => { const el = $("#elapsed"); if (el) el.textContent = fmtDur(Date.now() - s.startedAt); else clearInterval(elapsedTick); }, 1000);
    return `<div class="timerbar"><span>Workout time <b class="mono" id="elapsed">${fmtDur(Date.now() - s.startedAt)}</b></span><button class="btn small primary" data-act="finishWorkout">Finish workout</button></div>`;
  }
  const dur = S.workoutDuration(s);
  return `<div class="timerbar"><span>${dur ? `Finished in <b class="mono">${fmtDur(dur)}</b>` : "<b>Finished</b>"}</span><button class="btn small" data-act="showSummary">Summary</button></div>`;
}
const fmtDur = ms => { const t = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`; };
function summaryFor(u, date) {
  const s = sessionFor(u, date); if (!s) return null;
  const ex = (s.exercises || []).filter(e => !e.skipped && e.sets?.length);
  const vol = Math.round(ex.reduce((t, e) => t + F.volumeOf(e), 0));
  const prs = F.prEvents(state.data.sessions, u).filter(p => p.date === date);
  const pts = F.points(state.data.sessions, state.data.activities, u, date, date);
  return { s, ex, sets: ex.reduce((t, e) => t + e.sets.length, 0), vol, prs, pts, dur: S.workoutDuration(s) };
}
function openSummary(u, date) {
  const r = summaryFor(u, date); if (!r) return;
  state.overlay = "summary";
  const fw = F.funWeight(r.vol);
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Workout summary"><div class="inner">
    <div class="between"><span class="eyebrow">${esc(P(u).name)} · ${S.fmtDate(date)}</span><button class="btn small" data-act="closeOverlay">Close</button></div>
    <div class="finish-hero">${avatarHtml(u, true)}<h2 class="h2">${esc(sayV("finish"))}</h2>
      ${r.dur ? `<div class="big mono">${fmtDur(r.dur)}</div><div class="muted small">workout time</div>` : ""}</div>
    <div class="stats">
      <div class="stat"><div class="v">${r.ex.length}</div><div class="l">Exercises</div></div>
      <div class="stat"><div class="v">${r.sets}</div><div class="l">Sets</div></div>
      <div class="stat"><div class="v">${r.vol.toLocaleString()}</div><div class="l">lb moved${fw ? ` · ${esc(fw)}` : ""}</div></div>
      ${r.s.cardio?.done ? `<div class="stat"><div class="v">${r.s.cardio.minutes || 0}</div><div class="l">Cardio minutes</div></div>` : ""}
      ${funAt("full") ? `<div class="stat"><div class="v">+${r.pts}</div><div class="l">Points today</div></div>` : ""}
    </div>
    ${r.prs.length ? `<section class="card"><h3 class="h3">New personal bests</h3><ul>${r.prs.map(p => `<li>${esc(p.name)}</li>`).join("")}</ul></section>` : ""}
    <section class="card"><h3 class="h3">What you did</h3>${r.ex.map(e => `<div class="list-item"><span>${esc(e.name)}</span><span class="small muted mono">${esc(S.describeSets(e.kind, e.db, e.sets))}</span></div>`).join("")}</section>
  </div></div>`;
}

// ---------------------------------------------------------------- supersets
function supersetIdeas(u, date, list, s) {
  const pending = list.filter(x => !s?.exercises?.some(e => e.id === x.ex.id) && x.ex.kind !== "time");
  const upper = ["chest", "shoulders", "arms", "back"], lower = ["legs", "glutes", "calves"];
  const zone = ex => ex.focus.some(f => lower.includes(f)) ? "lower" : ex.focus.some(f => upper.includes(f)) ? "upper" : "core";
  const pairs = []; const used = new Set();
  for (let i = 0; i < pending.length; i++) for (let j = i + 1; j < pending.length; j++) {
    const a = pending[i].ex, b = pending[j].ex;
    if (used.has(a.id) || used.has(b.id)) continue;
    if (a.focus.some(f => b.focus.includes(f))) continue;
    if (guessEquip(a.n) === guessEquip(b.n) && guessEquip(a.n) === "machine" && a.n === b.n) continue;
    const score = (zone(a) !== zone(b) ? 2 : 0) + (guessEquip(a.n) !== guessEquip(b.n) ? 1 : 0);
    if (score >= 1) { pairs.push([a, b, score]); used.add(a.id); used.add(b.id); }
  }
  if (!pairs.length) return "";
  pairs.sort((x, y) => y[2] - x[2]);
  return `<section class="card"><details class="more"><summary>Superset ideas (${Math.min(3, pairs.length)})</summary><div class="panel">
    <p class="small muted">Do these back to back, then rest. They work different muscles and use different equipment, so you lose less time waiting on machines.</p>
    ${pairs.slice(0, 3).map(([a, b]) => `<div class="stretch"><b>${esc(a.n)} + ${esc(b.n)}</b></div>`).join("")}</div></details></section>`;
}

// ---------------------------------------------------------------- reminders
function reminders(u) {
  const out = []; const t = TODAY();
  const lastOf = f => state.data.body.filter(b => b.user === u && b[f] != null && b[f] !== "").map(b => b.date).sort().pop();
  const lw = lastOf("weight"); if (!lw || S.daysBetween(lw, t) >= 7) out.push({ id: "weigh", text: lw ? `Weigh-in: last one was ${S.fmtDate(lw)}.` : "Add a first weigh-in on the Body tab as your starting point.", view: "body" });
  const lm = lastOf("waist"); if (!lm || S.daysBetween(lm, t) >= 14) out.push({ id: "measure", text: lm ? `Measurements are due (every two weeks; last ${S.fmtDate(lm)}).` : "Take your first measurements on the Body tab.", view: "body" });
  if (P(u).cardio === "intervals") { const lh = lastOf("restingHr"); if (!lh || S.daysBetween(lh, t) >= 7) out.push({ id: "hr", text: "Log your resting heart rate this week (first thing in the morning).", view: "body" }); }
  if (!allGyms().length) out.push({ id: "gym", text: "Set up your gym so the app only suggests equipment you have.", view: "mygyms" });
  const ci = S.cycleInfo(t, cycleStart()); const left = S.daysBetween(t, ci.end);
  if (left <= 3) out.push({ id: "report", text: `This cycle ends ${S.fmtDate(ci.end)}. Check the cycle report and paste it to Claude for adjustments.`, view: "report" });
  const dismissed = store.get(`twp-rem-${u}-${t}`, []);
  return out.filter(r => !dismissed.includes(r.id));
}

// ---------------------------------------------------------------- achievements (badges, levels, high-fives)
let achieveTimer;
function checkAchievements() {
  clearTimeout(achieveTimer);
  achieveTimer = setTimeout(() => {
    const u = state.user; if (!u || state.flags.sessions?.fromCache) return;
    const got = F.earnedBadges(state.data.sessions, state.data.body, state.data.activities, u, TODAY());
    const key = `twp-badges-${u}`; const seen = store.get(key, null);
    store.set(key, [...got]);
    if (seen) for (const b of F.BADGES) if (got.has(b.id) && !seen.includes(b.id)) { celebrate("badge", `${b.icon} ${sayV("badge", { name: b.name }, u)}`, F.plain("badge", { name: b.name })); break; }
    if (funAt("full")) {
      const lvl = F.level(F.points(state.data.sessions, state.data.activities, u)).i; const lk = `twp-level-${u}`; const prev = store.get(lk, null);
      store.set(lk, lvl); if (prev != null && lvl > prev) celebrate("level", sayV("level", { name: F.LEVELS[lvl] }, u), F.plain("level", { name: F.LEVELS[lvl] }));
    }
  }, 600);
}
function handlePings() {
  const u = state.user; if (!u) return;
  const p = state.data.pings.find(x => x.id === `to_${u}`); if (!p) return;
  // First run on this phone: still show a high-five from the last 12 hours.
  const key = `twp-hi5-${u}`; const seen = store.get(key, Date.now() - 12 * 3600e3);
  store.set(key, Math.max(p.at, seen));
  if (p.at > seen && funAt("medium")) {
    const el = document.createElement("div"); el.className = "hi5-burst"; el.textContent = "🙌"; document.body.appendChild(el); setTimeout(() => el.remove(), 1400);
    toastV("hi5got", { name: P(p.from)?.name || "Your partner" }, u); if (P(u).sound) F.chime(); navigator.vibrate?.([80, 60, 80]);
  }
}
function funHeader(u) {
  if (!funAt("medium", u) && !funAt("light", u)) return "";
  const parts = [];
  if (funAt("medium")) {
    const st = F.streaks(state.data.sessions, u, TODAY(), paceOf(u), bonusDates(u));
    parts.push(`<div class="stat-tile"><div class="st-top">${icon("flame", 18, { stroke: 2 })}<span class="big-num">${st.current}</span><span class="st-unit">week${st.current === 1 ? "" : "s"}</span></div><div class="st-sub">streak · ${st.thisWeek} of ${st.need}+ this week</div></div>`);
  }
  if (funAt("full")) {
    const all = F.points(state.data.sessions, state.data.activities, u); const lv = F.level(all);
    const wk = F.points(state.data.sessions, state.data.activities, u, S.mondayOf(TODAY()), TODAY());
    const pct = lv.next ? Math.round(lv.into / lv.next * 100) : 100;
    parts.push(`<div class="stat-tile"><div class="st-level">Level ${lv.i + 1} · ${esc(lv.name)}</div><div class="level-bar" role="progressbar" aria-label="Progress to the next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div style="width:${pct}%"></div></div><div class="st-sub">${wk} pts this week</div></div>`);
  }
  return parts.length ? `<div class="stat-tiles">${parts.join("")}</div>` : "";
}
function ring(done, total) {
  const r = 31, c = 2 * Math.PI * r, pct = total ? done / total : 0;
  return `<div class="pring" role="img" aria-label="${done} of ${total} exercises done"><svg class="ring-svg" viewBox="0 0 72 72" aria-hidden="true"><circle class="bg" cx="36" cy="36" r="${r}"/><circle class="fg" cx="36" cy="36" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg><span class="ring-n big-num" aria-hidden="true">${done}/${total}</span></div>`;
}

// ---------------------------------------------------------------- plan builder helpers
const dayEdits = (u, week, day) => ({ add: [], remove: [], order: [], sr: {}, title: "", ...(planEdits(u)[`${week}-${day}`] || {}) });
const dayTitle = (u, week, day) => dayEdits(u, week, day).title || planDay(u, week, day).title;
const srFor = (u, ex, def) => dayEdits(u, state.sel.week, state.sel.day).sr[ex.id] || def.sr;
// Every exercise in someone's two-week plan, with its sets, for the body-area report.
function cyclePlan(u) {
  const out = [];
  for (const week of ["A", "B"]) for (const day of daysFor(u, week)) {
    const ed = dayEdits(u, week, day);
    const list = planDay(u, week, day).ex.filter(ex => !ed.remove.includes(ex.id));
    for (const id of ed.add) { const ex = resolveEx(id, {}); if (ex) list.push(ex); }
    for (const ex of list) {
      const v = ex.custom ? "std" : variantOf(u, ex); const def = defOf(ex, v);
      out.push({ name: def.name, focus: def.focus?.length ? def.focus : ex.focus || [], sets: S.parseRange(ed.sr[ex.id] || def.sr || ex.sr).sets, week, day });
    }
  }
  return out;
}

// ---------------------------------------------------------------- profile setup (the interview)
function openProfileForm(id) {
  state.overlay = "profile";
  const p = id ? P(id) : { ...PROFILE_DEFAULTS, name: "", color: ["#2f6b5e", "#4b5d8a", "#b5532f", "#8a5a9c", "#2e7d4f", "#9a6b12"][profileIds().length % 6] };
  state.profForm = { id, avatar: p.avatar || "", focus: [...(p.focus || [])], pain: [...(p.pain || [])], defaultVariant: p.defaultVariant || "std", cardio: p.cardio || "steady" };
  drawProfileForm(p);
}
function drawProfileForm(p) {
  const f = state.profForm;
  const chipSet = (key, opts) => `<div class="focus-chips">${opts.map(([v, l]) => `<button type="button" data-act="pfToggle" data-k="${key}" data-v="${v}" aria-pressed="${f[key].includes(v)}">${esc(l)}</button>`).join("")}</div>`;
  const one = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-act="pfOne" data-k="${key}" data-v="${v}" aria-pressed="${f[key] === v}">${esc(l)}</button>`).join("")}</div>`;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Profile"><div class="inner">
    <div class="between"><h2 class="h2">${f.id ? `Edit ${esc(p.name)}` : "New person"}</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <section class="card"><label class="field">Name<input type="text" id="pf-name" value="${esc(p.name || "")}" placeholder="First name"></label>
      <div class="field"><span>Avatar</span><div class="avatars"><button type="button" data-act="pfAvatar" data-v="" aria-pressed="${!f.avatar}">${esc((p.name || "A")[0].toUpperCase())}</button>${AVATARS.map(a => `<button type="button" data-act="pfAvatar" data-v="${a}" aria-pressed="${f.avatar === a}">${a}</button>`).join("")}</div></div>
      <label class="field">Color<input type="color" id="pf-color" value="${esc(p.color || "#2f6b5e")}"></label></section>
    <section class="card"><h3 class="h3">Goals</h3>
      <label class="field">What do you want out of training?<textarea id="pf-goals" placeholder="Lose fat around the middle, get stronger, better cardio…">${esc(p.focusNote || "")}</textarea></label>
      <div class="field"><span>Focus areas</span>${chipSet("focus", [...GROUPS.filter(g => g !== "cardio").map(g => [g, FOCUS[g]]), ["full", "Full body"], ["cardio", "Cardio fitness"]])}</div></section>
    <section class="card"><h3 class="h3">Aches and injuries</h3>
      <p class="small muted">Areas to track in the daily pain check. You can mark what's sore on any given day in the exercise library (Settings).</p>
      ${chipSet("pain", Object.entries(PAIN_AREAS))}</section>
    <section class="card"><h3 class="h3">Training style</h3>
      <div class="field"><span>Default exercise version</span>${one("defaultVariant", [["std", "Standard"], ["hard", "Harder"]])}</div>
      <div class="field"><span>Gym cardio</span>${one("cardio", [["steady", "Steady (bike, elliptical, walking)"], ["intervals", "Steady + 2 interval days a week"]])}</div>
      <label class="check"><input type="checkbox" id="pf-commute" ${p.commute?.enabled ? "checked" : ""}><span>I bike to work</span></label>
      <label class="field">Round-trip commute miles<input type="number" inputmode="decimal" step="any" id="pf-miles" value="${esc(p.commute?.miles || "")}"></label>
      <label class="field">Notes to yourself, one per line<textarea id="pf-notes" placeholder="Squat to a bench while knees heal">${esc((p.notes || []).join("\n"))}</textarea></label></section>
    <button class="btn primary block" data-act="pfSave">${f.id ? "Save" : "Create profile"}</button>
    ${f.id && !SEEDS[f.id] ? `<button class="btn danger" data-act="pfArchive">${state.confirmDel === "pf" ? "Tap again to remove" : "Remove this person"}</button>` : ""}
  </div></div>`;
}
function saveProfileForm() {
  const f = state.profForm; const name = $("#pf-name").value.trim(); if (!name) { toast("Add a name first."); return; }
  let id = f.id; if (!id) { id = slug(name) || "person"; let n = 2; while (profileIds().includes(id)) id = `${slug(name)}-${n++}`; }
  saveProfile(id, {
    name, avatar: f.avatar, color: $("#pf-color").value, focusNote: $("#pf-goals").value.trim(), focus: f.focus, pain: f.pain.length ? f.pain : ["knees", "shoulders", "lowerBack"],
    defaultVariant: f.defaultVariant, cardio: f.cardio, commute: { enabled: $("#pf-commute").checked, miles: +$("#pf-miles").value || 0 },
    notes: $("#pf-notes").value.split("\n").map(x => x.trim()).filter(Boolean)
  });
  if (!f.id && !state.user) { state.user = id; state.viewUser = id; store.set("twp-user", id); }
  toast(f.id ? "Saved." : `Welcome, ${name}!`); closeOverlay(); render();
}

// ---------------------------------------------------------------- accessibility options
function setA11y(patch) {
  A.set(patch);
  if (state.user && state.auth?.crewId) saveProfile(state.user, { a11y: A.get(), textSize: A.get().textSize });
  applyAppearance(); render(); if (state.overlay === "a11y") drawA11y();
}
const a11yOn = () => { const a = A.get(); return Object.keys(A.DEFAULTS).filter(k => a[k] !== A.DEFAULTS[k]).length; };
// ---------------------------------------------------------------- overlays: rest timer & settings
// The rest timer uses the same engine as every other timer (js/timer.js): 3-2-1-go, then 5 beeps.
function openTimer(exId) {
  const ex = ALL_EX[exId] || resolveEx(exId, {});
  state.overlay = "timer";
  state.timer = { ex, total: store.get("twp-rest", 90) };
  drawTimer();
}
function drawTimer() {
  const t = state.timer; if (!t) return;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Rest timer"><div class="inner">
    <div class="between"><span class="eyebrow">Rest · ${esc(t.ex?.n || "")}</span><button class="btn small" data-act="closeOverlay">Close</button></div>
    <div class="rest-tmr">${T.html("rest", t.total)}</div>
    <div class="row" style="justify-content:center">${[60, 90, 120].map(n => `<button class="btn small" data-act="timerSet" data-n="${n}" aria-pressed="${t.total === n}">${n}s</button>`).join("")}
      <button class="btn small" data-act="timerAdd" data-n="-15">−15</button><button class="btn small" data-act="timerAdd" data-n="15">+15</button></div>
    ${t.ex?.s?.length ? `<h3 class="h3">Stretch while you wait</h3>${t.ex.s.map(stretchBox).join("")}` : ""}
  </div></div>`;
}
function closeOverlay() { T.stop("rest"); state.timer = null; state.overlay = null; $("#overlay").innerHTML = ""; }

function exportData() {
  const data = { app: "gymbunnies.fit", exportedAt: new Date().toISOString(), ...state.data };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `gymbunnies-fit-backup-${TODAY()}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------------------------------------------------------------- saving
function cardFor(el) {
  const card = el.closest("[data-ex]"); if (!card) return null;
  const u = LU(), date = LD(), id = card.dataset.ex;
  const item = todaysList(u, date).find(x => x.ex.id === id); if (!item) return null;
  const s = sessionFor(u, date); const logged = s?.exercises?.find(e => e.id === id);
  const d = getDraft(u, date, item.ex, logged);
  const setEl = el.closest("[data-s]");
  return { u, date, id, ex: item.ex, added: item.added, logged, d, si: setEl ? +setEl.dataset.s : null, card };
}
function saveExercise(c) {
  const v = c.d.variant;
  const def = defOf(c.ex, v);
  const sets = c.d.sets.map(s => ({ w: +s.w || 0, r: +s.r || 0, d: +s.d || 2, ...(s.side ? { side: s.side } : {}) })).filter(s => s.r > 0 || s.w > 0);
  if (!sets.length) { toast("Add at least one set first."); return; }
  if (def.kind === "load" || def.kind === "carry") { const i = sets.findIndex(s => !s.w); if (i >= 0) { toast(`Set ${i + 1} has no weight. Fill it in or remove that set.`); return; } }
  const entry = { id: c.id, variant: v, name: def.name, kind: def.kind, db: !!def.db, sets, ...(c.added ? { added: true } : {}), ...(def.focus ? { focus: def.focus } : {}) };
  const s = sessionFor(c.u, c.date);
  const prev = S.personalBest(state.data.sessions.filter(x => x.date < c.date), c.u, c.id, v);
  const isPR = prev && S.betterThan(def.kind, S.bestScore(def.kind, sets), prev.score);
  const planOrder = todaysList(c.u, c.date).map(x => x.ex.id);
  entry.order = planOrder.indexOf(c.id) >= 0 ? planOrder.indexOf(c.id) : 100 + planOrder.length;
  writeSession(c.u, c.date, { ex: { [c.id]: entry }, ...(!s?.startedAt && c.date === TODAY() ? { startedAt: Date.now() } : {}) });
  if (!s?.ex?.[c.id]) track({ exercises: 1, sets: sets.length });
  store.del(dKey(c.u, c.date, c.id));
  store.set(xKey(c.u, c.date), getExtras(c.u, c.date).filter(x => x.id !== c.id));
  state.editing.delete(editKey(c.u, c.date, c.id));
  const sk = voiceSkin();
  if (isPR) celebrate("pr", sayV("pr", { name: def.name }, c.u), sk ? F.plain("pr", { name: def.name }) : null);
  else celebrate("save", sayV("saveEx", { name: def.name }, c.u), sk ? F.plain("saveEx", { name: def.name }) : null);
}
function saveCardio(skip) {
  const u = LU(), date = LD(); const form = $("#cardio-form");
  const val = k => form.querySelector(`[data-cf="${k}"]`);
  const c = skip ? { skipped: "commute", done: false, type: "", minutes: 0, miles: null, avgHr: null, hiit: false } : {
    done: true, skipped: null, type: val("type").value, minutes: +val("minutes").value || 0,
    miles: val("miles").value === "" ? null : +val("miles").value, avgHr: val("avgHr").value === "" ? null : +val("avgHr").value, hiit: val("hiit").checked
  };
  writeSession(u, date, { cardio: c });
  if (PROFILES[u].commute.enabled) {
    const cid = `${u}-${date}-commute`; const on = skip || val("commute")?.checked;
    if (on) save("activities", cid, { user: u, date, type: "Bike commute", miles: +(val("commuteMiles")?.value || PROFILES[u].commute.miles) || 0 });
    else if (state.data.activities.find(a => a.id === cid)) remove("activities", cid);
  }
  store.del(`twp-c-${u}-${date}-${slotKey()}`); state.editing.delete(editKey(u, date, "cardio"));
  toast(skip ? "Logged your bike commute." : "Saved cardio.");
}
function saveCheckin() {
  const u = LU(), date = LD(); const k = store.get(`twp-k-${u}-${date}-${slotKey()}`, null);
  const form = $("#checkin-form");
  const pain = {}; form.querySelectorAll("[data-kf^='pain.']").forEach(i => { pain[i.dataset.kf.slice(5)] = +i.value || 0; });
  const recovery = k?.recovery || sessionFor(u, date)?.recovery || { sleep: 0, energy: 0, soreness: 0 };
  writeSession(u, date, { pain, recovery, notes: form.querySelector("[data-kf=notes]").value, checkin: true });
  store.del(`twp-k-${u}-${date}-${slotKey()}`); state.editing.delete(editKey(u, date, "checkin"));
  toast("Saved check-in.");
}
function checkinDraft() {
  const u = LU(), date = LD(); const s = sessionFor(u, date);
  return store.get(`twp-k-${u}-${date}-${slotKey()}`, null) || { pain: { ...(s?.pain || {}) }, recovery: { sleep: 0, energy: 0, soreness: 0, ...(s?.recovery || {}) }, notes: s?.notes || "" };
}

// Changing a set also changes the sets after it that had the same value, so set 1 fills the rest.
function setValue(c, f, val, typingIn) {
  const old = c.d.sets[c.si][f];
  c.d.sets.forEach((s, j) => {
    if (j === c.si || (j > c.si && s[f] === old)) {
      s[f] = val;
      const input = c.card.querySelector(`.set[data-s="${j}"] input[data-f="${f}"]`);
      if (input && input !== typingIn) input.value = val;
    }
  });
  c.d.fresh = false; putDraft(c.u, c.date, c.id, c.d);
  c.card.querySelector(".fresh-note")?.remove();
  T.syncCard(c.card);
}

// ---------------------------------------------------------------- events
// Only the content area scrolls (the header and tab bar are fixed in the layout), so "back to top" scrolls it.
// The saved card folds up, so everything under it slides up and the page seemed to jump to the bottom.
// Keep the saved card where it was (or at the top, if you'd scrolled past its start).
function anchorOf(id) {
  const main = $("#main"); const el = document.getElementById(id); if (!main || !el) return () => {};
  const top0 = Math.max(8, el.getBoundingClientRect().top - main.getBoundingClientRect().top);
  return () => {
    const now = document.getElementById(id); if (!now || focusOnNow()) return;
    main.scrollTop += (now.getBoundingClientRect().top - main.getBoundingClientRect().top) - top0;
  };
}
const focusOnNow = () => !!document.querySelector("#main .focus-head");
// Scroll only the scrolling box (the middle of the app, or a pop-up). scrollIntoView also scrolls the page
// itself, and on iPhone that slides the whole app up under the status bar, hiding the header.
function scrollInto(el, block = "nearest", smooth = false) {
  if (!el) return;
  const box = el.closest(".overlay") || $("#main"); if (!box) return;
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
  let d = 0;
  if (block === "start") d = r.top - b.top - 8;
  else if (block === "center") d = r.top - b.top - (b.height - r.height) / 2;
  else if (r.top < b.top + 8) d = r.top - b.top - 8;
  else if (r.bottom > b.bottom - 8) d = Math.min(r.bottom - b.bottom + 8, r.top - b.top - 8);
  if (Math.abs(d) > 1) box.scrollTo({ top: box.scrollTop + d, behavior: smooth && !A.reduceMotion() ? "smooth" : "auto" });
}
function toTop() { $("#main")?.scrollTo(0, 0); window.scrollTo(0, 0); }
function go(view) {
  if (view === "report") { view = "progress"; state.progTab = "report"; }
  if (view !== state.view) ev(`v_${view}`);
  state.view = view; state.confirmDel = null; store.set("twp-view", view); render(); toTop();
  const h = $("#main h2, #main h1, #main h3"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  A.announce(`${VIEW_NAMES[view]} tab`);
}

// − / + on a set: one tap = one step. Press and hold to keep going.
function stepOnce(el) {
  const c = cardFor(el); if (!c || c.si == null) return; const f = el.dataset.f; const old = +c.d.sets[c.si][f] || 0; const dir = Math.sign(+el.dataset.by);
  const def = defOf(c.ex, c.d.variant); const by = f === "w" ? stepFor(def.db, def.kind, old, dir, def.name) * dir : +el.dataset.by;
  setValue(c, f, Math.max(0, +(old + by).toFixed(2)));
}
let holdT = null, holdI = null, holdFired = false;
const holdStop = () => { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = null; };
document.addEventListener("pointerdown", e => {
  const el = e.target.closest('[data-act="step"]'); if (!el) return;
  holdStop(); holdFired = false;
  holdT = setTimeout(() => { holdFired = true; stepOnce(el); holdI = setInterval(() => (el.isConnected ? stepOnce(el) : holdStop()), 250); }, 500);
});
for (const t of ["pointerup", "pointercancel", "blur"]) window.addEventListener(t, holdStop, true);
document.addEventListener("visibilitychange", holdStop);
document.addEventListener("contextmenu", e => { if (e.target.closest?.('[data-act="step"]')) e.preventDefault(); });
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act; const v = el.dataset.v;
  ev(`t_${act}`);
  if (act.startsWith("gym") && onGymClick(act, el)) return;
  switch (act) {
    case "newProfile": openOnboarding(null); break;
    case "obRetake": openOnboarding(state.user); break;
    case "obNext": if (state.ob.step < OB_STEPS.length - 1) { state.ob.step++; drawOnboarding(); } break;
    case "obBack": if (state.ob.step > 0) { state.ob.step--; drawOnboarding(); } break;
    case "obPick": { const k = el.dataset.k; state.ob.a[k] = /^(days|sessionLen)$/.test(k) ? +el.dataset.v : el.dataset.v; drawOnboarding(); break; }
    case "obToggle": { const k = el.dataset.k, arr = state.ob.a[k], i = arr.indexOf(el.dataset.v);
      if (i >= 0) arr.splice(i, 1); else if (!(k === "goals" && arr.length >= 3)) arr.push(el.dataset.v); else { toast("Pick up to three."); break; }
      drawOnboarding(); $(`#overlay [data-act=obToggle][data-k="${k}"][data-v="${el.dataset.v}"]`)?.focus(); break; }
    case "obNone": state.ob.a[el.dataset.k] = []; drawOnboarding(); break;
    case "obFinish": finishOnboarding(); break;
    case "strMin": strState().minutes = +v; store.set("twp-str-min", +v); render(); break;
    case "strPick": { const st = strState(); st.pick = v; if (v === "area" && !st.areas.length) st.areas = ["hips", "lowerBack"]; render(); toTop(); $("#sp-h")?.focus(); break; }
    case "strBack": strState().pick = null; render(); toTop(); break;
    case "strArea": { const a = strState().areas, i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v); render(); $(`[data-act=strArea][data-v="${v}"]`)?.focus(); break; }
    case "strStart": {
      const r = strRoutine(state.user); if (!r.items.length) break;
      F.unlockAudio?.(); strState().finished = null;
      strState().run = { title: r.title, steps: ST.steps(r.items), i: 0, count: r.items.length };
      toTop(); strGo(); $("#sr-h")?.focus(); break;
    }
    case "strNext": { const run = strState().run; if (!run) break; T.stop("stretch"); run.i++; if (run.i >= run.steps.length) strFinish(); else strGo(); break; }
    case "strPrev": { const run = strState().run; if (!run || !run.i) break; T.stop("stretch"); run.i--; strGo(); break; }
    case "strEnd": strFinish(true); break;
    case "strFeel": { const f = strState().finished; if (f) { f.feel = v; patch("activities", f.id, { feel: v }); render(); } break; }
    case "strHome": strState().finished = null; strState().pick = null; render(); toTop(); break;
    case "libDone": go("today"); break;
    case "openLib": closeOverlay(); go("gym"); break;
    case "homeToggle": {
      const u = LU(), date = LD(), k = homeKey(u, date), on = !isHome(u, date);
      state.homeMode[k] = on; const cur = sessionFor(u, date); if (cur) patch("sessions", cur.id, { atHome: on });
      toast(on ? `Home version of ${dayName(state.sel.day)}. Same muscles, your home gear.` : "Back to the gym version."); render(); break;
    }
    case "bonusOpen": state.bonusPicker = !state.bonusPicker; if (!state.bonusDraft) state.bonusDraft = { focus: "full", where: "gym" }; render(); $("#bonus-picker h3")?.focus(); break;
    case "bonusSet": state.bonusDraft[el.dataset.k] = el.dataset.v; render(); $(`#bonus-picker [data-act=bonusSet][data-k="${el.dataset.k}"][data-v="${el.dataset.v}"]`)?.focus(); break;
    case "bonusGo": {
      state.bonusPick = { u: LU(), ...state.bonusDraft }; state.bonusPicker = false;
      state.sel = { week: S.cycleInfo(TODAY(), cycleStart()).week, day: "Bonus" }; state.userTouchedSel = true; state.logDate = null;
      const cur = sessionFor(LU(), TODAY()); if (cur) patch("sessions", cur.id, { bonusFocus: state.bonusPick.focus, bonusWhere: state.bonusPick.where });
      render(); toTop(); toast(`Bonus day: ${PG.BONUS_FOCUS[state.bonusPick.focus][0]}, ${state.bonusPick.where === "home" ? "at home" : "at the gym"}.`); break;
    }
    case "bonusLog": save("activities", `${LU()}-${TODAY()}-bonus`, { user: LU(), date: TODAY(), type: "Bonus session" }); toast("Bonus session logged. Superhuman."); render(); break;
    case "tailorOff": saveProfile(state.user, { tailorList: [] }); toast("Back to the standard plan. Retake the questionnaire any time."); openSettings(); break;
    case "editProfile": openProfileForm(state.user); break;
    case "pfToggle": { const f = state.profForm[el.dataset.k]; const i = f.indexOf(el.dataset.v); i >= 0 ? f.splice(i, 1) : f.push(el.dataset.v); el.setAttribute("aria-pressed", i < 0); break; }
    case "pfOne": state.profForm[el.dataset.k] = el.dataset.v; el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === el)); break;
    case "pfAvatar": state.profForm.avatar = el.dataset.v; el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === el)); break;
    case "pfSave": saveProfileForm(); break;
    case "pfArchive": { if (state.confirmDel !== "pf") { state.confirmDel = "pf"; drawProfileForm(P(state.profForm.id)); break; } state.confirmDel = null; saveProfile(state.profForm.id, { archived: true }); if (state.user === state.profForm.id) { state.user = null; store.del("twp-user"); } closeOverlay(); render(); break; }
    case "pickPartner": state.partnerId = v; store.set("twp-partner-id", v); openSettings(); render(); break;
    case "setTheme": saveProfile(state.user, { theme: v }); setTimeout(() => { applyAppearance(); openSettings(); render(); }, 60); break;
    case "resetAccent": saveProfile(state.user, { accent: "" }); setTimeout(() => { applyAppearance(); openSettings(); render(); }, 60); break;
    case "setText": setA11y({ textSize: v }); openSettings(); break;
    case "openA11y": openA11y(); break;
    case "delAcct": state.delAcct = { step: 1 }; openSettings(); ($("#da-pw") || $("[data-act=delAcctGo]"))?.focus(); break;
    case "delAcctCancel": state.delAcct = null; openSettings(); $("[data-act=delAcct]")?.focus(); break;
    case "delAcctGo": deleteMyAccount(); break;
    case "fbOpen": openFeedback("send"); break;
    case "fbInbox": openFeedback("inbox"); break;
    case "fbBack": openSettings(); break;
    case "fbKind": state.fbDraft = { ...state.fbDraft, text: $("#fb-text")?.value ?? state.fbDraft?.text ?? "", kind: v }; drawFeedback(); break;
    case "fbSend": {
      const text = ($("#fb-text")?.value || "").trim(); if (!text) { toast("Type your message first."); $("#fb-text")?.focus(); break; }
      const kind = state.fbDraft?.kind || "idea";
      sendFeedback({ uid: state.auth.user.uid, name: String(P(state.user)?.name || state.auth.user.name || "").slice(0, 80), crew: String(state.auth.crew?.name || "").slice(0, 120), kind, text, status: "new", at: Date.now(), v: APP_VERSION })
        .then(() => { track({ feedback: 1 }); state.fbDraft = { kind, text: "" }; toast("Sent. Thank you!"); drawFeedback(); }, e => toast(`Couldn't send: ${e.message}`));
      break; }
    case "fbStatus": answerFeedback(el.dataset.id, { status: v }).catch(e => toast(e.message)); break;
    case "fbReply": { const id = el.dataset.id; const reply = ($(`#fbr-${id}`)?.value || "").trim();
      answerFeedback(id, { reply, replyAt: Date.now(), ...((state.fb || []).find(f => f.id === id)?.status === "new" ? { status: "seen" } : {}) }).then(() => toast("Reply saved."), e => toast(e.message)); break; }
    case "updateApp": closeOverlay(); checkForUpdate(true); break;
    case "a11ySet": { const k = el.dataset.k; const cur = A.DEFAULTS[k]; setA11y({ [k]: typeof cur === "number" ? +v : v }); A.announce(`${el.textContent} selected`); break; }
    case "a11yPreset": setA11y(A.applyPreset(v)); A.announce(`${A.PRESETS[v].label} options turned on`); toast(`${A.PRESETS[v].label} options are on.`); break;
    case "a11yReset": A.reset(); setA11y({}); A.announce("Accessibility options reset"); break;
    case "a11yTestSpeak": A.readAloud("3. 2. 1. Go. This is how timers will sound."); break;
    case "a11yTestFlash": A.flash("GO", true); break;
    case "setVoice": saveProfile(state.user, { voice: v }); setTimeout(openSettings, 60); toast(F.say(v, "saveEx", { name: "Sample" })); break;
    case "setFun": saveProfile(state.user, { fun: v }); setTimeout(() => { openSettings(); render(); }, 60); break;
    case "goView": if (v === "mygyms") { openSettings(); setTimeout(() => scrollInto($("#my-gyms"), "start"), 60); } else go(v); break;
    case "dismissRem": { const k = `twp-rem-${LU()}-${TODAY()}`; store.set(k, [...store.get(k, []), v]); render(); break; }
    case "startDeload": save("settings", `deload_${LU()}`, { from: TODAY(), to: S.addDays(TODAY(), 6) }); toast("Lighter week on. New exercises you open will be pre-filled lighter."); break;
    case "endDeload": save("settings", `deload_${LU()}`, { from: deloadOf(LU()).from, to: S.addDays(TODAY(), -1) }); toast("Lighter week ended."); break;
    case "warmupDone": focusSaved(); writeSession(LU(), LD(), { warmup: true, ...(!sessionFor(LU(), LD())?.startedAt && LD() === TODAY() ? { startedAt: Date.now() } : {}) }); celebrate("quiet", F.say(P(state.user).voice, "saveEx", { name: "Warm-up" })); render(); break;
    case "undoWarmup": writeSession(LU(), LD(), { warmup: false }); render(); break;
    case "startWorkout": F.unlockAudio(); writeSession(LU(), LD(), { startedAt: Date.now() }); toastV("start", { title: dayTitle(LU(), state.sel.week, state.sel.day).split(",")[0].toLowerCase() + " day" }); render(); break;
    case "finishWorkout": { writeSession(LU(), LD(), { finishedAt: Date.now() }); const u = LU(), d = LD(); setTimeout(() => { openSummary(u, d); celebrate("finish"); }, 120); break; }
    case "showSummary": openSummary(LU(), LD()); break;
    case "hi5": { const to = other(LU()); save("pings", `to_${to}`, { from: LU(), to, at: Date.now() }); const b = document.createElement("div"); b.className = "hi5-burst"; b.textContent = "🙌"; document.body.appendChild(b); setTimeout(() => b.remove(), 1400); toastV("hi5sent", { name: P(to).name }); break; }
    case "calMonth": state.calMonth = v; render(); break;
    case "planMove": {
      const c = cardFor(el); const { week, day } = state.sel;
      const ids = todaysList(c.u, c.date).filter(x => !x.added).map(x => x.ex.id); const i = ids.indexOf(c.id), j = i + +v;
      if (i < 0 || j < 0 || j >= ids.length) break; [ids[i], ids[j]] = [ids[j], ids[i]];
      editPlan([c.u], [week], day, d => { d.order = ids; }); break;
    }
    case "planClear": {
      if (state.confirmDel !== "planClear") { state.confirmDel = "planClear"; render(); break; }
      state.confirmDel = null; const { week, day } = state.sel; const u = LU();
      editPlan([u], [week], day, d => { d.remove = planDay(u, week, day).ex.map(e => e.id); d.add = []; d.order = []; }); toast("Day cleared. Add exercises from the library."); break;
    }
    case "planReset": {
      if (state.confirmDel !== "planReset") { state.confirmDel = "planReset"; render(); break; }
      state.confirmDel = null; const { week, day } = state.sel;
      editPlan([LU()], [week], day, d => { Object.assign(d, { add: [], remove: [], order: [], sr: {}, title: "" }); }); toast("Back to the original plan for this day."); break;
    }
    case "planCopy": { const { week, day } = state.sel; const src = dayEdits(LU(), week, day); const to = other(LU()); editPlan([to], [week], day, d => { Object.assign(d, JSON.parse(JSON.stringify(src))); }); toast(`Copied to ${esc(P(to).name)}'s plan.`); break; }
    case "authGoogle": busy(() => signInGoogle()); break;
    case "authMode": state.auth.mode = state.auth.mode === "create" ? "signin" : "create"; state.auth.error = ""; render(); break;
    case "authReset": { const em = $("#au-email")?.value.trim(); if (!em) { state.auth.error = "Type your email above first, then tap Forgot password."; render(); break; }
      busy(async () => { await resetPassword(em); state.auth.notice = `Password reset email sent to ${em}. Check your spam folder too.`; }); break; }
    case "authResetMe": resetPassword(state.auth.user.email).then(() => toast("Password reset email sent."), e => toast(e.message)); break;
    case "authSignOut": {
      Object.keys(localStorage).filter(k => k.startsWith("twp-")).forEach(k => store.del(k));
      closeOverlay(); stopAll(); state.user = null;
      signOutAndClear().finally(() => location.reload()); break;
    }
    case "crewJoin": { const code = $("#crew-code").value; const u = state.auth.user; busy(async () => { const id = await joinCrew(code, { uid: u.uid, name: u.name || u.email.split("@")[0], email: u.email }); startCrew(id); }); break; }
    case "crewCreate": { const name = $("#crew-name").value.trim() || "Our crew"; const u = state.auth.user; busy(async () => { const r = await createCrew(name, { uid: u.uid, name: u.name || u.email.split("@")[0], email: u.email, profileId: state.user || "" }); startCrew(r.id); patch("settings", "app", { cycleStart: S.mondayOf(TODAY()) }); }); break; }
    case "shareApp": track({ shares: 1 }); shareLink("GymBunnies.fit", "Check out GymBunnies.fit, the workout app we made."); break;
    case "shareInvite": { track({ shares: 1 }); const c = state.auth.crew?.code || ""; shareLink("Join my crew on GymBunnies.fit", `Join my crew on GymBunnies.fit! Sign in, then enter this invite code: ${c}`); break; }
    case "copyCode": { const c = state.auth.crew?.code || ""; navigator.clipboard?.writeText(c).then(() => toast("Invite code copied."), () => toast(c)); break; }
    case "newCode": newInviteCode(state.auth.crewId, state.auth.crew?.code).then(c => { toast(`New code: ${c}. The old one no longer works.`); openSettings(); }, e => toast(e.message)); break;
    case "crewRemove": { const uid = el.dataset.v; if (state.confirmDel !== uid) { state.confirmDel = uid; openSettings(); break; } state.confirmDel = null; removeMember(state.auth.crewId, uid).then(() => { toast("Removed from the crew."); openSettings(); }, e => toast(e.message)); break; }
    case "linkGoogle": addGoogle().then(() => { state.auth.user = currentInfo(); toast("Google sign-in added."); openSettings(); }, e => toast(e.message)); break;
    case "linkPassword": { const pw = $("#link-pw").value; if (pw.length < 6) { toast("Use at least 6 characters."); break; } addPassword(pw).then(() => { state.auth.user = currentInfo(); toast("Password added."); openSettings(); }, e => toast(e.message)); break; }
    case "pickUser": if (state.auth.crewId && state.auth.user && (!me()?.profileId || me()?.profileId !== el.dataset.u) && !state.partner) updateMember(state.auth.crewId, state.auth.user.uid, { profileId: el.dataset.u }).catch(() => {});
      state.user = el.dataset.u; state.viewUser = state.user; state.logUser = state.user; state.sel = null; store.set("twp-user", state.user); if (state.overlay) closeOverlay(); render(); break;
    case "logUser": state.logUser = el.dataset.u; render(); break;
    case "selWeek": state.sel.week = v; state.userTouchedSel = true; state.showDay = false; render(); break;
    case "reviewDay": {
      const wk = state.sel.week;
      if (v === "Bonus") { const dt = el.dataset.date || TODAY(); state.sel = { week: wk, day: "Bonus" }; state.logDate = dt === TODAY() ? null : dt; if (dt !== TODAY()) state.bonusPick = null; }
      else state.sel = { week: wk, day: v };
      state.showDay = true; state.userTouchedSel = true; render(); toTop(); $("#today-title")?.focus(); break; }
    case "reviewBack": state.showDay = false; state.logDate = null; if (state.sel.day === "Bonus") state.sel = { ...state.sel, day: daysFor(LU(), state.sel.week).at(-1) }; render(); toTop(); $("#rv-h")?.focus(); break;
    case "reviewStretch": { const st = strState(); st.pick = "today"; st.minutes = 15; go("stretch"); break; }
    case "selDay": state.sel.day = v; state.userTouchedSel = true; render(); break;
    case "backToToday": state.logDate = null; state.sel = null; state.userTouchedSel = false; render(); break;
    case "variant": {
      const c = cardFor(el);
      if (v === "lib") { openLibSwap(c.id); break; }
      if (v !== "swap") { state.variants[`${c.u}:${c.id}`] = v; store.set("twp-variants", state.variants); }
      const def = defOf(c.ex, v); const p = prefillSets(c.u, { sr: def.sr, kind: def.kind }, c.id, v);
      putDraft(c.u, c.date, c.id, { variant: v, ...p }); render(); break;
    }
    case "useLastV": {
      // "Use that again": switch this card to the version or machine used last time.
      const c = cardFor(el); if (!validV(c.ex, v)) break;
      const def = defOf(c.ex, v); const p = prefillSets(c.u, { sr: def.sr, kind: def.kind, db: def.db }, c.id, v);
      putDraft(c.u, c.date, c.id, { variant: v, ...p }); render(); break;
    }
    case "timer": { const c = cardFor(el); openTimer(c ? c.id : el.dataset.ex); break; }
    case "step": if (holdFired) { holdFired = false; break; } stepOnce(el); break;
    case "diff": {
      const c = cardFor(el); c.d.sets[c.si].d = +el.dataset.d; c.d.fresh = false; putDraft(c.u, c.date, c.id, c.d);
      el.parentElement.querySelectorAll("[data-d]").forEach(b => b.setAttribute("aria-pressed", b === el)); c.card.querySelector(".fresh-note")?.remove(); break;
    }
    case "focusGo": { const n = +el.dataset.n; if (n >= 0 && n < (state.focusCount || 99)) { state.focusStep = n; render(); toTop(); const h = $("#main .focus-head + * .name, #main .focus-head + * summary, #main .focus-head + * h3"); h?.setAttribute("tabindex", "-1"); h?.focus({ preventScroll: true }); A.announce(`Step ${n + 1}`); } break; }
    case "focusAll": state.focusAll = true; render(); break;
    case "markDone": writeSession(LU(), slotDate(state.sel.week, state.sel.day), { markedDone: true }); toast(`Week ${state.sel.week} ${dayName(state.sel.day)} marked done.`); render(); break;
    case "unmarkDone": { const s = sessionFor(LU(), LD()); if (s) patch("sessions", s.id, { markedDone: false }); render(); break; }
    case "moveWorkout": {
      const s = sessionFor(LU(), LD()); if (!s) break;
      const week = v[0], day = v.slice(1);
      const clash = state.data.sessions.find(x => x !== s && x.user === s.user && x.week === week && x.day === day && S.cycleInfo(x.date, cycleStart()).index === S.cycleInfo(s.date, cycleStart()).index && (x.exercises || []).some(e => e.sets?.length));
      if (clash) { toast(`Week ${week} ${dayName(day)} already has a workout this cycle (${S.fmtDate(clash.date)}). Move that one first.`); break; }
      s.week = week; s.day = day; patch("sessions", s.id, { week, day, moved: true });
      state.sel = { week, day }; state.userTouchedSel = true; render();
      toast(`Moved to Week ${week} ${dayName(day)}.`); A.announce(`Workout moved to Week ${week} ${dayName(day)}`); break;
    }
    case "setShare": saveProfile(state.user, { share: v }); A.announce(`Sharing set to ${SHARE_LABEL[v]}`); setTimeout(render, 60); break;
    case "goCrew": closeOverlay(); go("crew"); break;
    case "hi5to": { const to = el.dataset.u; save("pings", `to_${to}`, { from: state.user, to, at: Date.now() }); toastV("hi5sent", { name: P(to).name }); A.buzz(40); break; }
    case "toggleEx": {
      const card = el.closest("[data-ex]"); const u = LU(), date = LD(); const k = openKey(u, date);
      const m = store.get(k, {}); const opening = el.getAttribute("aria-expanded") !== "true"; m[card.dataset.ex] = opening; store.set(k, m);
      render(); A.announce(opening ? "Opened" : "Closed");
      if (opening) scrollInto($(`#ex-${CSS.escape(card.dataset.ex)}`), "nearest", true);
      break;
    }
    case "exAll": {
      const u = LU(), date = LD(); const m = {}; todaysList(u, date).forEach(x => { m[x.ex.id] = v === "1"; }); store.set(openKey(u, date), m);
      render(); A.announce(v === "1" ? "All exercises opened" : "All exercises closed"); break;
    }
    case "focusBack": state.focusAll = false; state.focusStep = null; render(); break;
    case "readEx": {
      const c = cardFor(el); const v = c.d.variant; const def = defOf(c.ex, v);
      const how = v === "hard" && c.ex.h ? c.ex.h.how : v === "swap" && c.ex.swap ? c.ex.swap.how : [c.ex.why, c.ex.setup].filter(Boolean).join(" ");
      A.readAloud(`${def.name}. ${srFor(c.u, c.ex, def) || ""}. ${how}`.replace(/×/g, " by ").replace(/–/g, " to ")); break;
    }
    case "readStretch": { const st = STRETCH[v]; if (st) A.readAloud(`${st.n}. ${st.t}. ${st.h} Where you should feel it: ${st.f} What it does: ${st.g}`.replace(/–/g, " to ")); break; }
    case "setDone": {
      const c = cardFor(el); const set = c.d.sets[c.si]; set.done = !set.done; putDraft(c.u, c.date, c.id, c.d);
      if (set.done) { A.buzz(30); A.announce(`Set ${c.si + 1} checked off. ${c.d.sets.filter(x => x.done).length} of ${c.d.sets.length} done.`); } else A.announce(`Set ${c.si + 1} unchecked.`);
      if (set.done && A.get().autoRest && defOf(c.ex, c.d.variant).kind !== "time" && c.d.sets.some(x => !x.done)) { openTimer(c.id); T.start("rest", state.timer.total, "Rest"); }
      if (defOf(c.ex, c.d.variant).kind === "time") { T.stop(`set:${c.u}|${c.date}|${c.id}|${c.si}`); render(); break; }
      el.setAttribute("aria-checked", set.done); el.innerHTML = set.done ? icon("check", 22) : ""; el.closest(".set").classList.toggle("is-done", set.done);
      { const all = c.d.sets.every(x => x.done); c.card.classList.toggle("all-done", all); const n = c.card.querySelector(".ex-num"); if (n) { n.classList.toggle("filled", all); n.innerHTML = all ? icon("check", 18) : String(todaysList(c.u, c.date).findIndex(x => x.ex.id === c.id) + 1); } }
      c.card.querySelector("[data-act=saveEx]")?.classList.toggle("ready", c.d.sets.every(x => x.done)); break;
    }
    case "delSet": { const c = cardFor(el); const side = c.d.sets[c.si]?.side; c.d.sets.splice(side === "R" ? c.si - 1 : c.si, side ? 2 : 1); putDraft(c.u, c.date, c.id, c.d); render(); break; }
    case "addSet": {
      const c = cardFor(el); const L = c.d.sets.length; const last = c.d.sets[L - 1] || { w: 0, r: 10 };
      if (last.side) c.d.sets.push({ ...(c.d.sets[L - 2] || last), d: 2, done: false, side: "L" }, { ...last, d: 2, done: false, side: "R" });
      else c.d.sets.push({ ...last, d: 2, done: false });
      putDraft(c.u, c.date, c.id, c.d); render(); break;
    }
    case "saveEx": {
      const c = cardFor(el); const keep = anchorOf(`ex-${c.id}`);
      saveExercise(c); { const k = openKey(c.u, c.date); const m = store.get(k, {}); delete m[c.id]; store.set(k, m); } focusSaved(); render(); keep(); break;
    }
    case "editEx": { const u = LU(), date = LD(); state.editing.add(editKey(u, date, el.dataset.ex)); const k = openKey(u, date); store.set(k, { ...store.get(k, {}), [el.dataset.ex]: true }); render(); break; }
    case "cancelEdit": { const c = cardFor(el); store.del(dKey(c.u, c.date, c.id)); state.editing.delete(editKey(c.u, c.date, c.id)); render(); break; }
    case "deleteEx": {
      const c = cardFor(el); const k = editKey(c.u, c.date, c.id);
      if (state.confirmDel !== k) { state.confirmDel = k; render(); break; }
      state.confirmDel = null; const s = sessionFor(c.u, c.date);
      if (s?.ex?.[c.id]) dropField("sessions", s.id, ["ex", c.id]);
      const raw = state.raw.sessions?.find(x => x.id === s?.id);
      if (raw?.exercises?.some(x => x.id === c.id)) patch("sessions", s.id, { exercises: raw.exercises.filter(x => x.id !== c.id) });
      store.del(dKey(c.u, c.date, c.id)); state.editing.delete(k); toast("Removed."); render(); break;
    }
    case "dropExtra": { const c = cardFor(el); store.set(xKey(c.u, c.date), getExtras(c.u, c.date).filter(x => x.id !== c.id)); store.del(dKey(c.u, c.date, c.id)); render(); break; }
    case "openPicker": openPicker(); break;
    case "libSwap": { const c = cardFor(el); openLibSwap(c.id); break; }
    case "libShowAll": state.libSwapAll = true; drawLibSwap(); break;
    case "useMachine": {
      const c = cardFor(el); const vv = `lib:${el.dataset.id}`; const def = defOf(c.ex, vv);
      putDraft(c.u, c.date, c.id, { variant: vv, ...prefillSets(c.u, { sr: def.sr, kind: def.kind }, c.id, vv) }); render(); A.announce(`Switched to ${def.name}`); break;
    }
    case "pickLibSwap": {
      const { u, date, id } = state.libSwapFor; const item = todaysList(u, date).find(x => x.ex.id === id); if (!item) break;
      const v = `lib:${el.dataset.id}`; const def = defOf(item.ex, v);
      putDraft(u, date, id, { variant: v, ...prefillSets(u, { sr: def.sr, kind: def.kind }, id, v) });
      closeOverlay(); render(); setTimeout(() => scrollInto(document.getElementById(`ex-${id}`), "center"), 50); break;
    }
    case "libF": { state.libF[el.dataset.k] = el.dataset.v; store.set("twp-libf", state.libF); render(); break; }
    case "libFocus": el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true"); break;
    case "ache": {
      const u = state.viewUser; const a = new Set(aches(u)); a.has(el.dataset.v) ? a.delete(el.dataset.v) : a.add(el.dataset.v);
      save("settings", `aches_${u}`, { areas: [...a] }); break;
    }
    case "libNew": state.libEdit = "new"; render(); setTimeout(() => scrollInto($("#lib-form"), "start"), 30); break;
    case "libSave": saveLibrary(); break;
    case "libEdit": state.libEdit = el.dataset.id; render(); setTimeout(() => scrollInto($("#lib-form"), "start"), 30); break;
    case "libCancel": state.libEdit = null; render(); break;
    case "libDelete": {
      const id = el.dataset.id; const m = libItem(id);
      if (state.confirmDel !== id) { state.confirmDel = id; render(); break; }
      state.confirmDel = null; state.libEdit = null;
      if (m?.builtin) save("library", id, { hidden: true }); else remove("library", id);
      toast(m?.builtin ? "Hidden. Restore it from the bottom of the exercise library." : "Deleted."); break;
    }
    case "libRestore": remove("library", el.dataset.id); toast("Restored."); break;
    case "libQuick": { const ex = ALL_EX[el.dataset.id]; save("library", slug(ex.n), { name: ex.n, focus: ex.focus.filter(f => GROUPS.includes(f)), equip: guessEquip(ex.n), pattern: PLAN_PATTERN[ex.id] || "", kind: ex.kind, db: ex.db, sr: ex.sr, how: ex.setup, notes: "" }); toast(`Added ${ex.n}.`); break; }
    case "libToday": { const m = libItem(el.dataset.id); addExtra({ id: `lib-${m.id}`, name: m.name, kind: m.kind || "load", db: !!m.db, focus: m.focus || [] }); state.view = "today"; store.set("twp-view", "today"); render(); break; }
    case "libPlan": openAddPlan(el.dataset.id); break;
    case "apSet": state.addPlan[el.dataset.k] = el.dataset.v; drawAddPlan(); break;
    case "apSave": saveAddPlan(); break;
    case "apCancel": state.addPlan = null; render(); break;
    case "planEdit": state.planEdit = !state.planEdit; render(); break;
    case "planRemove": {
      const c = cardFor(el); const { week, day } = state.sel;
      editPlan([c.u], [week], day, d => { if (c.id.startsWith("lib-") && d.add.includes(c.id)) d.add = d.add.filter(x => x !== c.id); else if (!d.remove.includes(c.id)) d.remove.push(c.id); });
      toast(`Removed from ${esc(PROFILES[c.u].name)}'s plan.`); break;
    }
    case "planRestore": { const { week, day } = state.sel; editPlan([LU()], [week], day, d => { d.remove = d.remove.filter(x => x !== el.dataset.id); }); break; }
    case "planFromLib": state.addPlan = { who: LU(), week: state.sel.week, day: state.sel.day }; go("gym"); toast("Tap Add to plan on any exercise."); break;
    case "pickLib": { const m = libItem(el.dataset.id); if (m) addExtra({ id: `lib-${m.id}`, name: m.name, kind: m.kind || "load", db: !!m.db, focus: m.focus || [] }); break; }
    case "pickEx": { const ex = ALL_EX[el.dataset.id]; if (ex) addExtra({ id: ex.id, name: ex.n, kind: ex.kind, db: ex.db }); else { const found = state.data.sessions.flatMap(s => s.exercises || []).find(x => x.id === el.dataset.id); if (found) addExtra({ id: found.id, name: found.name, kind: found.kind, db: !!found.db }); } break; }
    case "addCustom": {
      const name = $("#cx-name").value.trim(); if (!name) { toast("Give it a name first."); break; }
      const kind = $("#cx-kind").value, db = $("#cx-db").checked;
      if ($("#cx-lib").checked) {
        const focus = [...document.querySelectorAll("#cx-focus [aria-pressed=true]")].map(b => b.dataset.v);
        save("library", slug(name), { name, focus, equip: guessEquip(name), pattern: "", kind, db, notes: "", sr: "3 × 10" });
        addExtra({ id: `lib-${slug(name)}`, name, kind, db, focus });
      } else addExtra({ id: `custom-${slug(name)}`, name, kind, db });
      break;
    }
    case "saveCardio": saveCardio(false); focusSaved(); render(); break;
    case "skipCardio": saveCardio(true); focusSaved(); render(); break;
    case "editCardio": state.editing.add(editKey(LU(), LD(), "cardio")); render(); break;
    case "editCheckin": state.editing.add(editKey(LU(), LD(), "checkin")); render(); break;
    case "scale": {
      const k = checkinDraft(); k.recovery[el.dataset.k] = +el.dataset.n; store.set(`twp-k-${LU()}-${LD()}-${slotKey()}`, k);
      el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === el)); break;
    }
    case "saveCheckin": saveCheckin(); focusSaved(); render(); break;
    case "viewUser": state.viewUser = el.dataset.u; state.confirmDel = null; render(); break;
    case "progTab": state.progTab = v; render(); break;
    case "bmPick": state.bmSel = v; render(); if (el.tagName === "path") scrollInto(document.querySelector(".bm-sel"), "nearest", true); break;
    case "bmMode": state.bmMode = v; store.set("twp-bm-mode", v); render(); break;
    case "bmShapeToggle": state.bmShapeOpen = !el.parentElement.open; break;
    case "bmShape": {
      // Saved to this person's own account record (only they can read it), never to the crew's data.
      const [key, val] = v.split(":"); const u = state.viewUser; const uid = state.auth.user?.uid;
      state.bodyShape = { ...state.bodyShape, [u]: { ...(state.bodyShape[u] || {}), [key]: +val } };
      if (uid) { store.set(`twp-shape-${uid}`, state.bodyShape); setUserDoc(uid, { bodyShape: state.bodyShape }).catch(() => toast("Couldn't save your body shape. It's kept on this phone for now.")); }
      render(); break;
    }
    case "repTab": state.repTab = v; render(); break;
    case "openDay": {
      const s = state.data.sessions.find(x => x.id === el.dataset.id); if (!s) break;
      if (s.user !== state.user) { state.partner = true; store.set("twp-partner", true); }
      state.logUser = s.user; state.logDate = s.date === TODAY() ? null : s.date; state.sel = { week: s.week, day: s.day }; state.userTouchedSel = true;
      go("today"); break;
    }
    case "delSession": {
      if (state.confirmDel !== el.dataset.id) { state.confirmDel = el.dataset.id; render(); break; }
      remove("sessions", el.dataset.id); state.confirmDel = null; toast("Workout deleted."); break;
    }
    case "delBody": {
      if (state.confirmDel !== el.dataset.id) { state.confirmDel = el.dataset.id; render(); break; }
      remove("body", el.dataset.id); state.confirmDel = null; toast("Entry deleted."); break;
    }
    case "saveBody": {
      const form = $("#body-form"); const entry = { user: state.viewUser, date: $("#body-date").value || TODAY() };
      let any = false; form.querySelectorAll("[data-bf]").forEach(i => { if (i.value !== "") { entry[i.dataset.bf] = +i.value; any = true; } });
      if (!any) { toast("Fill in at least one measurement."); break; }
      save("body", `${entry.user}_${entry.date}_${Date.now().toString(36)}`, entry); toast("Entry saved."); render(); break;
    }
    case "copySummary": {
      const text = $("#summary").textContent;
      const fallback = () => { const r = document.createRange(); r.selectNodeContents($("#summary")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Selected. Copy it from the menu."); };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast("Copied. Paste it into a chat with Claude."), fallback); else fallback();
      break;
    }
    case "closeOverlay": closeOverlay(); render(); break;
    case "timerSet": { const t = state.timer; t.total = +el.dataset.n; store.set("twp-rest", t.total); const on = T.isActive("rest"); drawTimer(); if (on) T.start("rest", t.total); break; }
    case "timerAdd": { const t = state.timer; const n = +el.dataset.n; if (!T.adjust("rest", n)) { t.total = Math.max(15, t.total + n); drawTimer(); } break; }
    case "export": exportData(); break;
  }
});

// −15 / +15 on a timed set's timer: changes that set's seconds (and the sets after it that matched).
// Questionnaire text boxes and checkboxes save into the answers as you type.
for (const evt of ["input", "change"]) document.addEventListener(evt, e => {
  const k = e.target.dataset?.ob; if (!k || !state.ob) return;
  state.ob.a[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  if (k === "name") { const b = $("#overlay [data-act=obNext]"); if (b) b.disabled = !e.target.value.trim(); }
});
document.addEventListener("twp-timer-adj", e => {
  const { key, by, el } = e.detail; if (!key.startsWith("set:")) return;
  const si = +key.split("|")[3]; const setEl = el.closest("[data-ex]")?.querySelector(`.set[data-s="${si}"]`); if (!setEl) return;
  const c = cardFor(setEl); if (!c || !c.d.sets[si]) return;
  setValue(c, "r", Math.max(5, (+c.d.sets[si].r || 0) + by));
  A.announce(`${c.d.sets[si].r} seconds`);
});
document.addEventListener("twp-timer-done", e => {
  const key = e.detail.key; if (!key.startsWith("set:")) return;
  const [u, date, id, si] = key.slice(4).split("|");
  const item = todaysList(u, date).find(x => x.ex.id === id); if (!item) return;
  const s = sessionFor(u, date); const d = getDraft(u, date, item.ex, s?.exercises?.find(x => x.id === id));
  if (!d.sets[+si]) return;
  d.sets[+si].done = true; putDraft(u, date, id, d);
  setTimeout(render, 1600); // after the end beeps, move the timer on to the next set
});
A.watchOverlay($("#overlay"), [$("header.top"), $("#main"), $("#tabs"), $(".skip")].filter(Boolean), () => {
  const b = $("#overlay [data-act=closeOverlay]"); if (b) b.click(); else closeOverlay();
});
// Keep the tab bar pinned to the bottom on iPhone: hide it while the keyboard is up, then put it back and
// nudge the page so Safari re-measures where "bottom" is.
// Fields that bring up the keyboard. Dropdowns don't: their picker closes as soon as you choose.
const isTyping = el => el && el.matches?.("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]), textarea, [contenteditable]");
let kbT = null;
document.addEventListener("focusin", e => { if (isTyping(e.target)) { clearTimeout(kbT); document.body.classList.add("kb-open"); } });
document.addEventListener("focusout", () => {
  clearTimeout(kbT);
  kbT = setTimeout(() => { if (isTyping(document.activeElement)) return; document.body.classList.remove("kb-open"); repin(); }, 120);
});
// The page itself never scrolls (only the middle does), so after the keyboard closes, snap it back to the top.
function repin() {
  const reset = () => { if (window.scrollY) window.scrollTo(0, 0); if (document.documentElement.scrollTop) document.documentElement.scrollTop = 0; if (document.body.scrollTop) document.body.scrollTop = 0; };
  reset(); requestAnimationFrame(reset);
}
// If anything still shifts the app's frame (the page, html or body: they never scroll), put it back.
// Element scroll events don't bubble, so listen in the capture phase.
document.addEventListener("scroll", e => {
  const t = e.target;
  if ((t === document || t === document.documentElement || t === document.body) && !isTyping(document.activeElement)) repin();
}, { capture: true, passive: true });
window.visualViewport?.addEventListener("resize", () => { if (!isTyping(document.activeElement)) { document.body.classList.remove("kb-open"); repin(); } });
document.getElementById("tabs").addEventListener("click", e => { const b = e.target.closest("button[data-view]"); if (b) go(b.dataset.view); });
document.getElementById("who").addEventListener("click", openSettings);
document.getElementById("gear").addEventListener("click", openSettings);

document.addEventListener("input", e => {
  if (onGymInput(e.target)) return;
  const el = e.target;
  if (el.dataset.f === "w" || el.dataset.f === "r") {
    const c = cardFor(el); if (!c) return;
    setValue(c, el.dataset.f, el.value === "" ? "" : +el.value, el);
  } else if (el.dataset.cf) {
    const form = $("#cardio-form"); const d = {};
    form.querySelectorAll("[data-cf]").forEach(i => { d[i.dataset.cf] = i.type === "checkbox" ? i.checked : i.value; });
    store.set(`twp-c-${LU()}-${LD()}-${slotKey()}`, d);
    if (el.dataset.cf === "type") { render(); $("#cardio-form [data-cf=type]")?.focus({ preventScroll: true }); }
  } else if (el.dataset.kf) {
    const k = checkinDraft(); const f = el.dataset.kf;
    if (f === "notes") k.notes = el.value; else { k.pain[f.slice(5)] = +el.value; const out = document.querySelector(`[data-out="${f}"]`); if (out) out.textContent = el.value; }
    store.set(`twp-k-${LU()}-${LD()}-${slotKey()}`, k);
  } else if (el.dataset.act === "libQ") {
    state.libF.q = el.value; store.set("twp-libf", state.libF); const pos = el.selectionStart; render();
    const q = $("#lib-q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
  } else if (el.dataset.act === "pickerQ") {
    state.pickerQ = el.value; const pos = el.selectionStart; drawPicker();
    const q = $("#picker-q"); q.focus(); q.setSelectionRange(pos, pos);
  }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "email-form") return;
  e.preventDefault();
  const email = $("#au-email").value, pw = $("#au-pw").value; state.auth.email = email;
  if (state.auth.mode === "create") busy(() => createEmailAccount(email, pw, $("#au-name")?.value.trim()));
  else busy(() => signInEmail(email, pw));
});
document.addEventListener("change", e => {
  const el = e.target; const act = el.dataset.act;
  if (act || el.dataset.a11y || el.dataset.gym) ev(`c_${act || (el.dataset.a11y ? `a11y_${el.dataset.a11y}` : "gym")}`);
  if ((act || el.dataset.gymd) && onGymChange(el)) return;
  if (act === "progEx") { state.progEx = el.value; render(); }
  if (act === "pickGym") {
    const u = LU(), date = LD(), k = homeKey(u, date), cur = sessionFor(u, date);
    if (el.value === "add") { el.value = isHome(u, date) ? "home" : currentGym(u, date).id; openSettings(); setTimeout(() => scrollInto($("#my-gyms"), "start"), 60); return; }
    if (el.value === "home") { state.homeMode[k] = true; if (cur) patch("sessions", cur.id, { atHome: true }); toast(`Home version of ${dayName(state.sel.day)}. Same muscles, your home gear.`); }
    else {
      state.homeMode[k] = false; state.gymPick[gymPickKey(date)] = el.value; const g = gymById(el.value);
      if (cur) patch("sessions", cur.id, { atHome: false, ...(g && !g.virtual ? { gym: g.id, gymName: g.name } : {}) });
      toast(`Training at ${g ? g.name : "the gym"}.`);
    }
    render(); $("#gym-pick")?.focus();
  }
  if (act === "setAccent") { saveProfile(state.user, { accent: el.value }); setTimeout(() => { applyAppearance(); render(); }, 60); }
  if (act === "setSound") saveProfile(state.user, { sound: el.checked });
  if (el.dataset.a11y) { setA11y({ [el.dataset.a11y]: el.checked }); A.announce(`${el.closest("label")?.querySelector("b")?.textContent || "Option"} ${el.checked ? "on" : "off"}`); }
  if (el.dataset.gym) { const g = { ...gymSet() }; delete g.id; delete g.updatedAt; g[el.dataset.gym] = el.value === "" ? "" : +el.value; save("settings", "gym", g); }
  if (act === "crewRename" && el.value.trim()) renameCrew(state.auth.crewId, el.value.trim()).then(() => toast("Crew renamed."));
  if (act === "planTitle") { const { week, day } = state.sel; editPlan([LU()], [week], day, d => { d.title = el.value.trim(); }); }
  if (act === "planSr") { const c = cardFor(el); const { week, day } = state.sel; editPlan([c.u], [week], day, d => { d.sr[c.id] = el.value.trim(); }); store.del(dKey(c.u, c.date, c.id)); }
  if (act === "libSel") { state.libF[el.dataset.k] = el.value; store.set("twp-libf", state.libF); render(); }
  if (act === "bodyField") { state.bodyField = el.value; render(); }
  if (act === "repCycle") { state.repCycle = +el.value; render(); }
  if (act === "cmpA") { state.cmpA = el.value; render(); }
  if (act === "cmpB") { state.cmpB = el.value; render(); }
  if (act === "logDate" && el.value) { state.logDate = el.value === TODAY() ? null : el.value; state.sel = null; state.userTouchedSel = false; render(); }
  if (act === "partner") { state.partner = el.checked; store.set("twp-partner", state.partner); if (!state.partner) state.logUser = state.user; render(); }
  if (act === "cycleStart" && el.value) { save("settings", "app", { cycleStart: S.mondayOf(el.value) }); state.sel = null; toast("Cycle start updated for both of you."); closeOverlay(); render(); }
  if (act === "import" && el.files?.[0]) {
    el.files[0].text().then(t => importAll(JSON.parse(t))).then(n => toast(`Restored ${n} items.`)).catch(() => toast("That file couldn't be read as a backup."));
  }
});

// ---------------------------------------------------------------- data + sync status
function updateSync() {
  const el = $("#sync"); const f = Object.values(state.flags);
  let cls = "", text = "Synced";
  if (state.error) { cls = "error"; text = "Problem"; }
  else if (!navigator.onLine) { cls = "offline"; text = "Offline"; }
  else if (f.some(x => x.pending)) { cls = "pending"; text = "Syncing"; }
  else if (f.length < COLLECTIONS.length || f.some(x => x.fromCache)) { cls = "pending"; text = "Connecting"; }
  el.className = "sync visually-hidden " + cls; el.textContent = `Sync: ${text}`;
  // The sync state shows as the small dot on your avatar; screen readers get the words.
  const w = $("#who"); if (w) { w.dataset.sync = cls || "ok"; w.setAttribute("aria-label", `${P(state.user)?.name || ""}, ${text.toLowerCase()}. Switch person`); }
}
addEventListener("online", updateSync); addEventListener("offline", updateSync);

let renderQueued = false;
function onData(name, docs, fromCache, pending) {
  state.raw[name] = docs;
  state.data[name] = name === "sessions" ? docs.map(normalizeSession) : docs; state.flags[name] = { fromCache, pending };
  if ((name === "settings" || name === "sessions") && !state.userTouchedSel) state.sel = null;
  if (name === "sessions") { relabel(); consolidate(); }
  if (name === "pings") handlePings();
  if (["sessions", "gyms", "settings"].includes(name)) migrateGym();
  if (["sessions", "body", "activities"].includes(name)) checkAchievements();
  updateSync();
  // Firestore reports each save twice (sent, then confirmed) and the crew's other phone saves too. If nothing
  // you can see changed, don't redraw: a redraw under your finger is what made taps on − / + go missing.
  const sig = JSON.stringify(docs), prev = dataSigs[name];
  dataSigs[name] = { sig, fromCache };
  if (prev && prev.sig === sig && prev.fromCache === fromCache) return;
  dataRender();
}
const dataSigs = {};
// Hold data-driven redraws while a finger is on the screen and for a moment after, so a tap always lands
// on the button you pressed. Your own taps still redraw straight away.
let touchDown = false, touchAt = 0, dataT = null;
document.addEventListener("pointerdown", () => { touchDown = true; touchAt = Date.now(); }, true);
for (const t of ["pointerup", "pointercancel"]) document.addEventListener(t, () => { touchDown = false; touchAt = Date.now(); }, true);
function dataRender() {
  clearTimeout(dataT);
  const busyNow = state.overlay || document.activeElement?.matches?.("input, textarea, select");
  if (busyNow) return;
  const wait = touchDown ? 400 : 700 - (Date.now() - touchAt);
  if (wait > 0) { dataT = setTimeout(dataRender, wait); return; }
  if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); }
}
function onStatus(status) { state.error = status.state === "error" ? status.message : null; updateSync(); if (state.error) render(); }

// ---------------------------------------------------------------- sign-in & crews
state.auth = { ready: false, user: null, crewId: null, crew: null, members: [], error: "", busy: false, mode: "signin" };
let stopData = null, stopCrew = null, stopFb = null;
const me = () => state.auth.members.find(m => m.uid === state.auth.user?.uid);
const isOwner = () => state.auth.crew?.owner === state.auth.user?.uid;

function resetData() { for (const k of Object.keys(state.data)) state.data[k] = []; state.raw = {}; state.flags = {}; profMemo = { src: null, map: {} }; libMemo = { src: null, list: [] }; }
function startCrew(id) {
  if (state.auth.crewId === id && stopData) return;
  stopData?.(); stopCrew?.(); resetData();
  state.auth.crewId = id; store.set(`twp-crew-${state.auth.user.uid}`, id);
  ev("app_open");
  stopData = connect(id, onData, onStatus);
  stopFb?.(); stopFb = watchFeedback(state.auth.user.uid, isAdmin(), list => { state.fb = list; fbNotify(list); drawFeedback(); });
  stopCrew = watchCrew(id, crew => {
    if (!crew) {
      // Removed from the crew, or the crew is gone: go back to the join screen.
      stopAll(); store.del(`twp-crew-${state.auth.user.uid}`); setUserDoc(state.auth.user.uid, { crewId: null }).catch(() => {});
      state.auth.error = "You're no longer in that crew. Join another with an invite code, or start your own."; render(); return;
    }
    state.auth.crew = crew; render();
  }, members => {
    state.auth.members = members;
    const m = members.find(x => x.uid === state.auth.user?.uid);
    if (m?.profileId && !state.user) { state.user = m.profileId; state.viewUser = m.profileId; store.set("twp-user", m.profileId); }
    render();
  });
}
function stopAll() { stopData?.(); stopCrew?.(); stopFb?.(); stopData = stopCrew = stopFb = null; state.fb = []; resetData(); Object.assign(state.auth, { crewId: null, crew: null, members: [] }); }

watchAuth(async (u, err) => {
  if (err) state.auth.error = err;
  state.auth.user = u;
  if (!u) { stopAll(); state.auth.ready = true; render(); return; }
  let crewId = store.get(`twp-crew-${u.uid}`, null);
  state.bodyShape = store.get(`twp-shape-${u.uid}`, {}) || {};
  ({ list: state.myGyms, def: state.defaultGym } = store.get(`twp-gyms-${u.uid}`, { list: [], def: null }));
  try {
    const d = await getUserDoc(u.uid); if (d?.crewId) crewId = d.crewId;
    if (d?.bodyShape && typeof d.bodyShape === "object") { state.bodyShape = d.bodyShape; store.set(`twp-shape-${u.uid}`, d.bodyShape); }
    if (d && (Array.isArray(d.gyms) || d.defaultGym !== undefined)) { state.myGyms = Array.isArray(d.gyms) ? d.gyms : []; state.defaultGym = d.defaultGym || null; store.set(`twp-gyms-${u.uid}`, { list: state.myGyms, def: state.defaultGym }); }
  } catch (e) { state.auth.error = e.message; }
  if (crewId) startCrew(crewId);
  state.auth.ready = true; render();
});

async function busy(fn) {
  state.auth.busy = true; state.auth.error = ""; render();
  try { await fn(); } catch (e) { state.auth.error = e.message || String(e); }
  state.auth.busy = false; render();
}

function viewSignIn() {
  const a = state.auth; const create = a.mode === "create";
  return `<section class="signin">
    <button class="btn small a11y-entry" data-act="openA11y"><span aria-hidden="true">♿</span> Accessibility</button>
    ${logoHtml()}<h2 class="visually-hidden">${esc(APP_NAME)}</h2>
    <p class="muted">Sign in to see your crew's workouts on any phone.</p>
    ${a.error ? `<div class="banner" role="alert">${esc(a.error)}</div>` : ""}
    ${a.notice ? `<div class="reminders">${esc(a.notice)}</div>` : ""}
    <button class="btn block google" data-act="authGoogle" ${a.busy ? "disabled" : ""}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1.1 2.5-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8C3.8 20.5 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2C1.4 8.6 1 10.3 1 12s.4 3.4 1 4.9l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.6 1 3.8 3.5 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z"/></svg>Continue with Google</button>
    <div class="or"><span>or use email</span></div>
    <form class="card" id="email-form" style="text-align:left">
      ${create ? `<label class="field">Your name<input type="text" id="au-name" autocomplete="name"></label>` : ""}
      <label class="field">Email<input type="email" id="au-email" autocomplete="email" value="${esc(a.email || "")}"></label>
      <label class="field">Password<input type="password" id="au-pw" autocomplete="${create ? "new-password" : "current-password"}" minlength="6"></label>
      <button class="btn primary block" type="submit" ${a.busy ? "disabled" : ""}>${create ? "Create account" : "Sign in"}</button>
      <div class="row" style="justify-content:space-between">
        <button class="btn small" type="button" data-act="authMode">${create ? "I already have an account" : "Create an account"}</button>
        ${create ? "" : `<button class="btn small" type="button" data-act="authReset">Forgot password?</button>`}
      </div>
    </form>
    <details class="more" style="text-align:left"><summary>Forgot which email you used?</summary><div class="panel small">
      <p>Try Continue with Google first. If that's not it, ask someone in your crew: Settings → Crew lists everyone's sign-in email.</p></div></details>
    <p class="small muted signin-legal">No ads, and we never sell your data. <a href="privacy.html">Privacy</a></p>
  </section>`;
}
function logoHtml(size = "") {
  // The primary logo: the version for dark backgrounds on dark themes, and for light backgrounds on light ones.
  return `<div class="brand-logo ${size}"><img class="on-dark" src="icons/logo-primary-dark.svg" alt="${APP_NAME}"><img class="on-light" src="icons/logo-primary-light.svg" alt="${APP_NAME}"></div>`;
}
function viewCrewSetup() {
  const a = state.auth;
  return `<section class="signin">
    <h2>Join your crew</h2>
    <p class="muted">Signed in as <span class="acct-email">${esc(a.user.email)}</span>. A crew is a private group of training partners who share a gym library and can see each other's progress.</p>
    ${a.error ? `<div class="banner" role="alert">${esc(a.error)}</div>` : ""}
    <section class="card" style="text-align:left"><h3 class="h3">Have an invite code?</h3>
      <label class="field">Invite code<input type="text" id="crew-code" autocapitalize="characters" maxlength="6" placeholder="ABC123" style="font-family:var(--mono);letter-spacing:.2em;text-transform:uppercase"></label>
      <button class="btn primary block" data-act="crewJoin" ${a.busy ? "disabled" : ""}>Join crew</button></section>
    <section class="card" style="text-align:left"><h3 class="h3">Start a new crew</h3>
      <label class="field">Crew name<input type="text" id="crew-name" placeholder="Your crew's name"></label>
      <button class="btn block" data-act="crewCreate" ${a.busy ? "disabled" : ""}>Create crew</button></section>
    <button class="btn small" data-act="authSignOut">Sign out</button>
  </section>`;
}
function crewSettings() {
  return `<section class="card"><h3 class="h3">Crew</h3><p class="small">Invite code, members, and everyone's progress are on the Crew tab.</p><button class="btn small" data-act="goCrew">Open the Crew tab</button></section>${accountCard()}`;
}
function crewCard() {
  const a = state.auth; const owner = isOwner();
  return `<section class="card"><h3 class="h3">Crew members and invite code</h3>
    ${owner ? `<label class="field">Crew name<input type="text" data-act="crewRename" value="${esc(a.crew?.name || "")}"></label>` : `<p><b>${esc(a.crew?.name || "")}</b></p>`}
    <div class="field"><span>Invite code (share it with new members)</span>
      <div class="row"><b class="mono" style="font-size:1.5rem;letter-spacing:.2em" id="invite-code">${esc(a.crew?.code || "")}</b><button class="btn small" data-act="copyCode">Copy</button><button class="btn small primary" data-act="shareInvite">Send invite</button>${owner ? `<button class="btn small" data-act="newCode">New code</button>` : ""}</div></div>
    <div class="field"><span>Members and their sign-in emails</span>
      ${a.members.map(m => `<div class="list-item"><div>${m.profileId ? avatarHtml(m.profileId) : ""}<b>${esc(m.name || "Member")}</b>${m.role === "owner" ? ` <span class="tag orig">Owner</span>` : ""}<div class="small muted">${esc(m.email)}${m.profileId ? ` · profile: ${esc(P(m.profileId).name)}` : " · no profile picked yet"}</div></div>
        ${owner && m.uid !== a.user.uid ? `<button class="btn small danger" data-act="crewRemove" data-v="${esc(m.uid)}">${state.confirmDel === m.uid ? "Confirm" : "Remove"}</button>` : ""}</div>`).join("")}</div>
  </section>`;
}
function accountCard() {
  const a = state.auth;
  return `<section class="card"><h3 class="h3">Account</h3>
    <p class="small">Signed in as <b class="acct-email">${esc(a.user.email)}</b> with ${listText(a.user.providers.map(p => p === "google.com" ? "Google" : p === "password" ? "email + password" : p))}.</p>
    ${a.user.providers.includes("google.com") ? "" : `<button class="btn small" data-act="linkGoogle">Also sign in with Google</button>`}
    ${a.user.providers.includes("password") ? `<button class="btn small" data-act="authResetMe">Change password (sends an email)</button>` : `<div class="row" style="align-items:end"><label class="field" style="flex:1">Add a password<input type="password" id="link-pw" minlength="6" autocomplete="new-password"></label><button class="btn small" data-act="linkPassword">Add</button></div><p class="small muted">Then you can sign in with ${esc(a.user.email)} and this password if Google sign-in gives you trouble.</p>`}
    <button class="btn small danger" data-act="authSignOut">Sign out</button>
  </section>`;
}

render();
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(() => {});
  // When a new version installs, reload once so both phones run the same code.
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !state.overlay) location.reload(); });
}
// ---------------------------------------------------------------- updates
// Every time the app opens (or comes back to the front), ask the server which version is live.
// If it's newer than this copy, throw the old copy away and reload. No buttons needed.
const SHELL_FILES = ["./", "index.html", "css/styles.css", "js/app.js", "js/plan.js", "js/stats.js", "js/firebase.js", "js/library.js", "js/fun.js", "js/safety.js", "js/timer.js", "js/a11y.js", "js/icons.js", "js/tailor.js", "js/program.js", "js/stretch.js", "js/anatomy.js", "js/equipment.js", "js/muscles.js", "js/views/areas.js", "js/views/bodymap.js", "js/views/body.js", "js/views/crew.js", "js/views/feedback.js", "js/views/gyms.js", "js/views/progress.js", "js/views/questionnaire.js", "js/views/review.js", "js/views/settings.js", "js/views/stretch.js", "js/views/usage.js", "js/views/workout.js", "app-v41.webmanifest", "sw.js"];
async function liveVersion() {
  try { const r = await fetch(`sw.js?check=${Date.now()}`, { cache: "no-store" }); const m = /VERSION = "twp-v(\d+)"/.exec(await r.text()); return m ? m[1] : null; } catch { return null; }
}
async function forceUpdate(show = true) {
  if (show) toast("Updating to the latest version…");
  try {
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) || []) await r.unregister();
    for (const k of (await caches?.keys?.()) || []) await caches.delete(k);
    // Refresh the browser's own copy of every file too, so nothing old sneaks back in.
    await Promise.all(SHELL_FILES.map(f => fetch(f, { cache: "reload" }).catch(() => {})));
  } catch { /* best effort */ }
  try { sessionStorage.setItem("twp-updated-from", APP_VERSION); } catch { /* ignore */ }
  location.replace(location.pathname + "?v=" + Date.now());
}
async function checkForUpdate(manual = false) {
  const live = await liveVersion();
  if (!live) { if (manual) toast("Couldn't reach the server. Check your connection and try again."); return; }
  if (+live > +APP_VERSION) {
    let tried = null; try { tried = sessionStorage.getItem("twp-tried-" + live); sessionStorage.setItem("twp-tried-" + live, "1"); } catch { /* ignore */ }
    if (!tried || manual) forceUpdate(true);
  } else if (manual) {
    forceUpdate(false); // already current: still refresh everything, as asked
  }
}
setTimeout(() => checkForUpdate(false), 1500);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(false); });
try { const from = sessionStorage.getItem("twp-updated-from"); if (from) { sessionStorage.removeItem("twp-updated-from"); setTimeout(() => toast(from === APP_VERSION ? `Up to date: version ${APP_VERSION}.` : `Updated to version ${APP_VERSION}.`), 800); } } catch { /* ignore */ }

// Shared with the screens in js/views/.
export { $, APP_VERSION, allGyms, crewGyms, currentGym, gymById, newGymId, saveMyGyms, updateGym, AVATARS, DIFF, FUN_LEVELS, GROUPS, LD, LU, P, PROFILES, PROFILE_DEFAULTS, THEMES, TODAY, VARIANT_NOTE, a11yOn, aches, autoSel, avatarHtml, baseDay, bonusDates, bonusPickFor, bonusPicker, canSee, cardioProgram, closeOverlay, conflicts, crewCard, crewSettings, cyclePlan, cycleStart, dayEdits, dayName, dayStatus, dayTitle, daysFor, defOf, deloadActive, deloadOf, deloadSuggestion, editKey, esc, funAt, funHeader, getDraft, gymSet, isHome, libItem, listText, nextPlanDay, other, otherSlotOn, paceOf, personToggle, planDay, planEditBox, profileIds, reminders, render, resolveEx, ring, riskBlock, saveProfile, seg, sessionFor, shareOf, slotDate, slotKey, slug, srFor, state, stopAll, store, supersetIdeas, toast, todaysList, vLabel, variantOf, warmupCard, workoutBar, yt, ytStretch };
