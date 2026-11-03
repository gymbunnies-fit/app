// The health card on the Workout tab, the dose rules, and "Share my plan". Everything here reads and writes only
// this phone's storage (js/health.js) and never writes to the database. Its actions start with "hDay", which the
// tap counter skips. Nothing it builds (including "Share my plan") leaves the phone unless the person prints it.
import { $, LU, P, TODAY, esc, render, state, toast } from "../app.js";
import * as H from "../health.js";
import * as C from "../conditions.js";
import * as S from "../stats.js";

const uid = () => state.auth?.user?.uid || "";
const effOf = u => (uid() ? H.effects(uid(), u) : null);

// ---------------------------------------------------------------- dose and "did it settle?"
// The last finished workout before `date` (within a week), for the settle check.
function lastWorkout(u, date) {
  const from = S.addDays(date, -7);
  return state.data.sessions.filter(s => s.user === u && s.finishedAt && s.date < date && s.date >= from).map(s => s.date).sort().at(-1) || null;
}
// Symptoms didn't settle after the last workout: today starts lighter.
export function unsettled(u, date = TODAY()) {
  if (!effOf(u)) return false;
  const d = lastWorkout(u, date); return !!d && H.log(uid(), u).settle[d] === "no";
}
// Today's energy level after the settle check: an unsettled last workout means at least a light day.
export function dayLevel(u, date = TODAY()) {
  const e = effOf(u); if (!e) return null;
  const lvl = H.energy(uid(), u, date);
  if (unsettled(u, date) && (!lvl || lvl === "good" || lvl === "soso")) return "low";
  return lvl;
}
// Most sets a move gets today, from the guideline dose ([start, most] in js/conditions.js). The person moves up one set at
// a time with "Ready for one more set", which the guidelines tie to the reps feeling easy, not to a date. A light day goes
// back to the starting sets. ACSM's 2-4 sets is the ceiling when no guideline gives one.
export function doseCap(u, lightDay = false) {
  const e = effOf(u); if (!e) return null;
  if (lightDay) return e.sets ? e.sets[0] : 1;
  if (!e.sets) return null;
  return Math.min(e.sets[1] ?? 4, e.sets[0] + (H.log(uid(), u).more || 0));
}
const doseTop = e => (e.sets ? e.sets[1] ?? 4 : null);

// ---------------------------------------------------------------- weekly minutes (150 a week for most guidelines)
export function weekMinutes(u, today = TODAY()) {
  const mon = S.mondayOf(today); let m = 0;
  for (const s of state.data.sessions) {
    if (s.user !== u || s.date < mon || s.date > today) continue;
    const dur = S.workoutDuration(s); const cardio = s.cardio?.done ? +s.cardio.minutes || 0 : 0;
    m += dur ? Math.round(dur / 6e4) : cardio;
  }
  for (const a of state.data.activities) {
    if (a.user !== u || a.date < mon || a.date > today) continue;
    if (a.type === "Bike commute") m += Math.round((+a.miles || 0) * 6); // 10 mph, the top of "bicycling, to work" in the Compendium of Physical Activities
    else if (a.type !== "Stretch" && +a.minutes > 0) m += Math.round(+a.minutes);
  }
  return m;
}
function minutesRing(done, goal) {
  const r = 31, c = 2 * Math.PI * r, pct = Math.min(1, goal ? done / goal : 0);
  return `<div class="pring" role="img" aria-label="${done} of ${goal} active minutes this week"><svg class="ring-svg" viewBox="0 0 72 72" aria-hidden="true"><circle class="bg" cx="36" cy="36" r="${r}"/><circle class="fg" cx="36" cy="36" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg><span class="ring-n big-num" aria-hidden="true">${done}</span></div>`;
}
// Flare days count as rest days in your own streak, so a flare never breaks it. Only on this phone.
export const flareDays = u => (effOf(u) ? [...H.lightDays(uid(), u)].filter(d => H.energy(uid(), u, d) === "flare") : []);

// ---------------------------------------------------------------- the Workout tab card
export function healthCard(u, date) {
  const e = effOf(u); if (!e || date !== TODAY()) return "";
  const lvl = H.energy(uid(), u, date), L = H.log(uid(), u);
  const ask = `<div class="seg" role="group" aria-label="Energy today">${Object.entries(C.ENERGY).map(([k, x]) => `<button type="button" data-act="hEnergy" data-v="${k}" aria-pressed="${lvl === k}">${esc(x.label)}</button>`).join("")}</div>`;
  const said = lvl === "flare" ? C.FLARE[e.flare || "pause"] : C.ENERGY[lvl]?.text || "";
  const tips = [
    e.supports.has("heat") ? "Keep cool: a cool room or a fan, cold water during the workout, and cardio at a cooler time of day. If a symptom flares with heat, it settles as you cool down." : "",
    e.supports.has("sun") ? "Train indoors, or early or late in the day, out of strong sun." : "",
    e.progression === "pace" ? "Stop while you still feel OK. The app won't raise weights or time for you." : "",
    e.seated ? "Curls, raises and dumbbell presses can all be done sitting on a bench or chair." : "",
    ...C.supportTips(e)
  ].filter(Boolean);
  const cap = doseCap(u), top = doseTop(e);
  const last = lastWorkout(u, date), settleQ = last && !L.settle[last];
  const parts = [];
  // 1. Did it settle?
  if (settleQ) parts.push(`<div class="field hf-settle"><span>After your workout on ${esc(S.fmtDate(last))}, did any symptoms it stirred up settle within a day?</span>
    <div class="seg" role="group" aria-label="Did symptoms settle?"><button type="button" data-act="hDaySettle" data-d="${last}" data-v="yes">Yes, they settled</button><button type="button" data-act="hDaySettle" data-d="${last}" data-v="no">No, not yet</button></div></div>`);
  else if (unsettled(u, date)) parts.push(`<p class="small">Last workout's symptoms hadn't settled, so today starts as a light day.</p>`);
  // 2. Energy
  parts.push(lvl ? (said ? `<p>${esc(said)}</p>` : "") + (lvl !== "good" ? `<p class="small muted">Exercises you haven't started yet are set up for today.</p>` : "") + (lvl === "flare" ? `<p class="small muted">Today counts as a rest day in your streak.</p><button class="btn small" data-act="goView" data-v="stretch">Gentle stretching instead</button>` : "") : ask);
  if (cap) parts.push(`<div class="hf-dose"><p class="small">${cap} set${cap === 1 ? "" : "s"} of each move for now${top && top !== cap ? `; your guidelines go up to ${top}` : ""}. Add a set once the reps feel easy.</p>${top && cap < top ? `<button type="button" class="btn small" data-act="hDayMore">Ready for one more set</button>` : ""}${(H.log(uid(), u).more || 0) > 0 ? `<button type="button" class="btn small" data-act="hDayLess">One set less</button>` : ""}</div>`);
  // 3. Weekly minutes
  if (e.minutes) { const m = weekMinutes(u, date); parts.push(`<div class="hf-week">${minutesRing(m, e.minutes)}<div><b>${m} of ${e.minutes} minutes</b><div class="small muted">active this week: workouts, cardio and activities${m >= e.minutes ? ". Goal met." : "."}</div></div></div>`); }
  // 4. Balance practice
  if (e.balance) {
    const lv = Math.max(0, Math.min(C.BALANCE_LEVELS.length - 1, L.bal || 0)), [bn, bt] = C.BALANCE_LEVELS[lv], done = !!L.balDays[date];
    const mon = S.mondayOf(date), wk = Object.keys(L.balDays).filter(d => d >= mon && d <= date).length;
    parts.push(`<section class="hf-block" aria-labelledby="hf-bal-t"><h3 class="h3" id="hf-bal-t">Balance practice <span class="small muted">step ${lv + 1} of ${C.BALANCE_LEVELS.length}: ${esc(bn)}</span></h3>
      <p class="small">${esc(bt)} Move to the next step when you can hold it steady.</p>
      <p class="small muted">${wk} of ${C.BALANCE_PER_WEEK} times this week.</p>
      <div class="row"><button type="button" class="btn small ${done ? "" : "primary"}" data-act="hDayBal" data-v="done" aria-pressed="${done}">${done ? "Done today ✓" : "Done today"}</button>
      ${lv > 0 ? `<button type="button" class="btn small" data-act="hDayBal" data-v="down">Easier step</button>` : ""}${lv < C.BALANCE_LEVELS.length - 1 ? `<button type="button" class="btn small" data-act="hDayBal" data-v="up">Next step</button>` : ""}</div></section>`);
  }
  // 5. Daily stretch
  if (e.supports.has("stretch")) {
    const done = !!L.stretch[date] || state.data.activities.some(a => a.user === u && a.date === date && a.type === "Stretch");
    parts.push(`<section class="hf-block" aria-labelledby="hf-str-t"><h3 class="h3" id="hf-str-t">Daily stretch</h3>
      ${done ? `<p class="small">Done today ✓</p>` : `<p class="small">Hold each stretch 10–30 seconds (30–60 if you're older), to about a minute per muscle in all. Daily works best.</p><div class="row"><button type="button" class="btn small primary" data-act="goView" data-v="stretch">Stretch now</button><button type="button" class="btn small" data-act="hDayStretch">I already stretched</button></div>`}</section>`);
  }
  if (tips.length) parts.push(`<ul class="small hf-tips">${tips.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`);
  if (e.stop.length) parts.push(`<details class="more hf-stop"><summary>Stop and get help if…</summary><ul class="small">${e.stop.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`);
  return `<section class="card hf-today" aria-labelledby="hf-today-t">
    <div class="between"><h2 class="h3" id="hf-today-t">${lvl ? `Energy today: ${esc(C.ENERGY[lvl].label)}` : "How's your energy today?"}</h2>${lvl ? `<button type="button" class="btn small" data-act="hEnergy" data-v="">Change</button>` : ""}</div>
    ${parts.join("")}
    <p class="small muted"><span aria-hidden="true">🔒</span> Only on this phone.</p>
  </section>`;
}

// ---------------------------------------------------------------- "Share my plan": a printable page made on this phone
export function shareHtml(u) {
  const e = effOf(u); if (!e) return "";
  const list = (h, xs) => (xs.length ? `<h3 class="h3">${esc(h)}</h3><ul>${xs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  const sup = [...e.supports].filter(s => s !== "energy").map(s => C.SUPPORTS[s]);
  return `<div class="hf-print">
    <h2 class="h2">${P(u).name ? `${esc(P(u).name)}'s` : "My"} exercise plan</h2>
    <p class="small">From GymBunnies.fit, ${esc(S.fmtDate(TODAY()))}. Made from published exercise guidelines, not by a clinician. Please check it fits me.</p>
    ${list("Conditions", e.conditions.map(c => c.name))}
    ${list("What I've said changes for me", sup)}
    ${list("Before I start", e.clearance)}
    <h3 class="h3">How the plan works</h3><ul>
      <li>${esc(C.PROGRESSION[e.progression || "build"])}</li>
      ${e.sets ? `<li>Sets: start with ${e.sets[0]} of each move${doseTop(e) !== e.sets[0] ? ` and build to ${doseTop(e)} as the reps get easy` : ""}${e.setsFrom.length ? ` (${esc(e.setsFrom.join(", "))} guidelines)` : " (ACSM)"}.</li>` : ""}
      ${e.limits.has("noLegs") ? "<li>No leg exercises: upper-body and core moves take their place.</li>" : ""}${e.limits.has("noArms") ? "<li>No arm exercises: leg and hip moves take their place.</li>" : ""}
      <li>Flare-ups: ${esc(C.FLARE[e.flare || "pause"])}</li>
      ${e.minutes ? `<li>Weekly goal: ${e.minutes} active minutes.</li>` : ""}
      ${e.limits.size ? `<li>Exercises are swapped for safer versions where needed.</li>` : ""}
    </ul>
    ${list("The plan", e.plan)}
    ${list("Tips", [...e.tips, ...C.supportTips(e)])}
    ${list("Stop and get help if", e.stop)}
    <h3 class="h3">Sources</h3><ul class="small">${[...new Map([...e.conditions.flatMap(c => c.sources), ...C.GENERAL_SOURCES].map(s => [s.url, s])).values()].map(s => `<li>${esc(s.t)}: ${esc(s.url)}</li>`).join("")}</ul>
  </div>`;
}
export function openHealthShare() {
  const u = LU(); if (!effOf(u)) return;
  state.overlay = "hshare";
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="hs-title"><div class="inner">
    <div class="between no-print"><h2 class="h2" id="hs-title" tabindex="-1">Share my plan</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <p class="small no-print"><span aria-hidden="true">🔒</span> This page is made on your phone. Nothing is sent anywhere. Print it, or save it as a PDF from the print screen, to show your doctor or physical therapist.</p>
    <button class="btn primary no-print" data-act="hDayPrint">Print or save as PDF</button>
    ${shareHtml(u)}
  </div></div>`;
  $("#hs-title")?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- events (all local)
export function onHealthDayClick(act, el) {
  const u = LU(), id = uid(), v = el.dataset.v, today = TODAY();
  if (!id || !effOf(u)) return true;
  switch (act) {
    case "hDaySettle": H.setLog(id, u, l => { l.settle[el.dataset.d] = v; }); toast(v === "no" ? "Got it. Today starts as a light day." : "Good. Carry on as planned."); render(); break;
    case "hDayBal": H.setLog(id, u, l => {
      if (v === "done") { if (l.balDays[today]) delete l.balDays[today]; else l.balDays[today] = 1; }
      if (v === "up") l.bal = Math.min(C.BALANCE_LEVELS.length - 1, (l.bal || 0) + 1);
      if (v === "down") l.bal = Math.max(0, (l.bal || 0) - 1);
    }); render(); break;
    case "hDayStretch": H.setLog(id, u, l => { l.stretch[today] = 1; }); render(); break;
    case "hDayMore": H.setLog(id, u, l => { l.more = (l.more || 0) + 1; }); toast("One more set from now on. Exercises you haven't started are updated."); render(); break;
    case "hDayLess": H.setLog(id, u, l => { l.more = Math.max(0, (l.more || 0) - 1); }); render(); break;
    case "hDayShare": openHealthShare(); break;
    case "hDayPrint": window.print(); break;
    default: return false;
  }
  return true;
}
