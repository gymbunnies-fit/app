// Anonymous usage counts. Counts only: no names, emails, or workout details leave the crew. See firestore.rules (daily, usage, people).
import { APP_VERSION, P, TODAY, profileIds, state, store } from "../app.js";
import { bump, markPerson, markSeen } from "../firebase.js";

// ---------------------------------------------------------------- anonymous usage stats
// Counts only: no names, emails, or workout details leave the crew. See firestore.rules (daily, usage).
const ADMINS = ["mathew.lovell@gmail.com"];
const isAdmin = () => ADMINS.includes((state.auth?.user?.email || "").toLowerCase());
async function anonId(text) {
  try { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gymbunnies:${text}`)); return [...new Uint8Array(h)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join(""); }
  catch { return null; }
}
function track(fields) { if (state.auth?.user && state.auth.crewId) bump(TODAY(), fields); }
let seenBusy = false, seenTried = 0;
// Once a day per account and per person: which days they opened the app, plus a coarse plan summary.
async function trackSeen() {
  const uid = state.auth?.user?.uid; if (!uid || !state.auth.crewId || !state.user || !state.flags.profiles || seenBusy) return;
  const today = TODAY(), akey = `gb-seen2-${uid}`, pkey = `gb-pseen-${uid}-${state.user}`;
  const needA = store.get(akey, "") !== today, needP = store.get(pkey, "") !== today;
  if (!needA && !needP) return;
  if (Date.now() - seenTried < 60000) return; // a refused write is retried at most once a minute
  seenTried = Date.now(); seenBusy = true;
  try {
    const acct = await anonId(uid), crew = await anonId(state.auth.crewId); if (!acct) return;
    // Only remember "counted today" once the server has it, so a refused or offline write is tried again later.
    if (needA) { await markSeen(acct, today, { v: APP_VERSION, crew, people: profileIds().length }); store.set(akey, today); }
    if (needP) {
      const pid = await anonId(`${uid}|${state.user}`), p = P(state.user);
      await markPerson(pid, today, { acct, v: APP_VERSION, crew, days: p.onboardedAt ? +p.daysPerWeek || 4 : 4, style: p.planStyle || "auto",
        len: +p.sessionLen || 60, goals: (p.goals || []).slice(0, 8), exp: p.experience || "", home: (p.homeGear || []).length > 0, tailored: (p.tailorList || []).length });
      store.set(pkey, today);
    }
  } catch { /* try again later */
  } finally { seenBusy = false; }
}
// What gets used: every tap (by action name only, never the value), each tab opened, and minutes with the app on screen.
// Counted on the phone and sent as one write every minute or so, and when the app goes to the background.
const evBuf = {}; let evTimer = null, visStart = document.visibilityState === "visible" ? Date.now() : 0;
function ev(name, n = 1) {
  if (!state.auth?.user || !state.auth.crewId) return;
  const k = String(name).replace(/[^A-Za-z0-9_]/g, "_").slice(0, 40); if (!k) return;
  evBuf[k] = (evBuf[k] || 0) + n;
  if (!evTimer) evTimer = setTimeout(flushEv, 60000);
}
function flushEv(final) {
  clearTimeout(evTimer); evTimer = null;
  if (final && visStart) { const sec = Math.round((Date.now() - visStart) / 1000); visStart = 0; if (sec > 0 && sec < 4 * 3600) evBuf.appSeconds = (evBuf.appSeconds || 0) + sec; }
  const keys = Object.keys(evBuf); if (!keys.length || !state.auth?.crewId) return;
  bump(TODAY(), { ev: { ...evBuf } }); for (const k of keys) delete evBuf[k];
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushEv(true); else visStart = Date.now(); });
addEventListener("pagehide", () => flushEv(true));

export { ev, isAdmin, track, trackSeen };
