// The Stretch tab: short routines, not tied to days or the cycle.
import { $, P, TODAY, aches, dayName, esc, listText, nextPlanDay, planDay, render, resolveEx, state, store, toast } from "../app.js";
import * as A from "../a11y.js";
import * as S from "../stats.js";
import * as ST from "../stretch.js";
import * as T from "../timer.js";
import { track } from "./usage.js";
import { save } from "../firebase.js";
import { icon, play } from "../icons.js";
import { JOINTS } from "../library.js";
import { PAIN_AREAS } from "../plan.js";

// ---------------------------------------------------------------- stretch tab
// Short stretching routines, not tied to days or the cycle. Logged as "Stretch" activities: they never count
// as a workout, a plan day, or a bonus day.
function strState() { if (!state.str) state.str = { minutes: store.get("twp-str-min", 10), pick: null, areas: [], run: null, finished: null }; return state.str; }
const strProf = u => ({ injuries: P(u).injuries || [], limits: P(u).limits || [] });
// The muscles from today's logged workout, or else the next plan day.
function strTodayAreas(u) {
  const t = TODAY();
  let focus = state.data.sessions.filter(s => s.user === u && s.date === t).flatMap(s => s.exercises || []).filter(e => e.sets?.length).map(e => resolveEx(e.id, e)?.focus?.[0]).filter(Boolean);
  let label = "Cools down what you trained today.";
  if (!focus.length && nextPlanDay().complete) {
    const last = state.data.sessions.filter(x => x.user === u && (x.exercises || []).some(e => e.sets?.length)).sort((a, b) => b.date.localeCompare(a.date))[0];
    focus = (last?.exercises || []).map(e => resolveEx(e.id, e)?.focus?.[0]).filter(Boolean);
    if (focus.length) label = "Cools down your last workout.";
  }
  if (!focus.length) {
    const n = nextPlanDay(), pd = planDay(u, n.week, n.day);
    focus = pd.ex.map(e => e.focus?.[0]).filter(Boolean);
    label = `For ${dayName(n.day)} (${pd.title.split(",")[0].toLowerCase()}), before or after.`;
  }
  return { areas: [...new Set(focus.flatMap(f => ST.FROM_FOCUS[f] || []))], label };
}
// Sore spots: marked sore in the exercise library, a pain score of 2+ in the latest check-in, or an injury from the questionnaire.
function strSoreAreas(u) {
  const last = state.data.sessions.filter(s => s.user === u && s.pain).sort((a, b) => b.date.localeCompare(a.date))[0];
  const spots = [...new Set([...aches(u), ...Object.entries(last?.pain || {}).filter(([, v]) => +v >= 2).map(([k]) => k), ...(P(u).injuries || [])])];
  return { spots, areas: [...new Set(spots.flatMap(k => ST.FROM_PAIN[k] || []))] };
}
const strLog = u => state.data.activities.filter(a => a.user === u && a.type === "Stretch");
function strStats(u) {
  const log = strLog(u), mon = S.mondayOf(TODAY());
  const minutes = Math.round(log.filter(a => a.date >= mon).reduce((n, a) => n + (+a.minutes || 0), 0));
  const days = new Set(log.map(a => a.date)); let streak = 0, d = days.has(TODAY()) ? TODAY() : S.addDays(TODAY(), -1);
  while (days.has(d)) { streak++; d = S.addDays(d, -1); }
  return { minutes, streak, total: log.length };
}
function strRoutine(u) {
  const st = strState(); const id = st.pick;
  const areas = id === "today" ? strTodayAreas(u).areas : id === "sore" ? strSoreAreas(u).areas : id === "area" ? st.areas : [];
  return ST.buildRoutine(id, { minutes: st.minutes, areas, prof: strProf(u) });
}
function viewStretch() {
  const u = state.user, st = strState();
  if (st.run) return viewStretchRun(u);
  if (st.finished) return `<section class="card str-done" aria-labelledby="sd-h"><h2 class="h2" id="sd-h" tabindex="-1">Nice stretching.</h2>
    <p>${st.finished.minutes} minute${st.finished.minutes === 1 ? "" : "s"} of ${esc(st.finished.title.toLowerCase())}.</p>
    <div class="field"><span id="sd-f">How do you feel?</span><div class="seg" role="group" aria-labelledby="sd-f">${[["tight", "Still tight"], ["okay", "Okay"], ["loose", "Loose"]].map(([k, l]) => `<button type="button" data-act="strFeel" data-v="${k}" aria-pressed="${st.finished.feel === k}">${l}</button>`).join("")}</div></div>
    <button class="btn primary block" data-act="strHome">Done</button></section>`;
  const seg3 = `<div class="field"><span id="str-len">How long?</span><div class="seg" role="group" aria-labelledby="str-len">${[5, 10, 15].map(m => `<button type="button" data-act="strMin" data-v="${m}" aria-pressed="${st.minutes === m}">${m} min</button>`).join("")}</div></div>`;
  if (st.pick) {
    const r = strRoutine(u), R = ST.ROUTINES[st.pick];
    const sore = st.pick === "sore" ? strSoreAreas(u) : null;
    return `<section aria-labelledby="sp-h"><button type="button" class="btn small" data-act="strBack">${icon("chevron", 16, { stroke: 2 })}<span>All routines</span></button>
      <h2 class="h2" id="sp-h" tabindex="-1" style="margin-top:12px">${esc(r.title)}</h2>
      <p class="muted">${esc(R.blurb)}${sore ? (sore.spots.length ? ` Built around: ${esc(listText(sore.spots.map(k => (PAIN_AREAS[k] || JOINTS[k] || k).toLowerCase())))}.` : " Nothing's marked sore, so this is a gentle full-body stretch. Mark sore spots in your daily check-in.") : ""}</p>
      ${st.pick === "area" ? `<div class="field"><span id="sa-l">Which areas?</span><div class="focus-chips ob-chips" role="group" aria-labelledby="sa-l">${Object.entries(ST.AREAS).map(([k, l]) => `<button type="button" data-act="strArea" data-v="${k}" aria-pressed="${st.areas.includes(k)}">${esc(l)}</button>`).join("")}</div></div>` : ""}
      ${seg3}
      ${r.items.length ? `<p class="small"><b>${r.items.length} stretches · about ${Math.max(1, Math.round(r.seconds / 60))} min</b></p>
      <ol class="str-list">${r.items.map((o, i) => { const s = ST.BY_KEY[o.key]; return `<li class="card str-item"><div class="str-n big-num" aria-hidden="true">${i + 1}</div><div class="str-b"><b>${esc(s.n)}</b><div class="small str-dose">${esc(ST.doseText(s, o.rounds, o.hold))}</div><div class="small muted">Feel it: ${esc(s.feel)}</div>
        <details class="more sub"><summary>How to do it</summary><div class="panel small"><p>${esc(s.how)}</p><p><b>What it does:</b> ${esc(s.does)}</p></div></details></div></li>`; }).join("")}</ol>
      <button class="btn primary block" data-act="strStart">${play()}<span>Start guided</span></button>
      <p class="small muted">Ease in until you feel mild tension, never pain. Breathe slowly and don't bounce. The timer runs each hold and beeps when it's time to switch.</p>`
      : `<p>${st.pick === "area" ? "Pick at least one area above." : "No stretches fit your limits for this routine. Try another one."}</p>`}
    </section>`;
  }
  const s = strStats(u), today = strTodayAreas(u), sore = strSoreAreas(u);
  const card = (id, sub, extra = "") => `<button type="button" class="card routine ${extra}" data-act="strPick" data-v="${id}"><b>${esc(ST.ROUTINES[id].title)}</b><span class="small muted">${esc(sub || ST.ROUTINES[id].blurb)}</span></button>`;
  return `<section aria-labelledby="str-h"><h2 class="h2" id="str-h">Stretch</h2>
    <div class="stats"><div class="stat"><div class="v">${s.minutes}</div><div class="l">Minutes this week</div></div><div class="stat"><div class="v">${s.streak}</div><div class="l">Day streak</div></div></div>
    ${seg3}
    <div class="routines">${card("today", today.label, "featured")}${card("morning")}${card("desk")}${card("bedtime")}${card("sore", sore.spots.length ? `Built around your ${listText(sore.spots.map(k => (PAIN_AREAS[k] || JOINTS[k] || k).toLowerCase()))}.` : "")}${card("full")}${card("area")}</div>
    <p class="small muted">Stretching is tracked on its own. It doesn't count as a workout or a bonus day.</p></section>`;
}
function viewStretchRun(u) {
  const run = strState().run, step = run.steps[run.i], s = ST.BY_KEY[step.key], nextStep = run.steps.slice(run.i + 1).find(x => x.item !== step.item);
  const label = `${s.n}${step.side ? ", " + step.side.toLowerCase() : ""}`;
  return `<section class="str-run" aria-labelledby="sr-h">
    <div class="between"><span class="eyebrow">Stretch ${step.item + 1} of ${run.count}</span><button class="btn small" data-act="strEnd">End</button></div>
    <div class="ob-progress" role="progressbar" aria-label="Routine progress" aria-valuemin="0" aria-valuemax="${run.steps.length}" aria-valuenow="${run.i}"><i style="width:${(run.i / run.steps.length) * 100}%"></i></div>
    <h2 class="h2" id="sr-h" tabindex="-1">${esc(s.n)}</h2>
    <p class="str-side"><b>${esc([step.side, step.rounds > 1 ? `Round ${step.round} of ${step.rounds}` : "", step.cue].filter(Boolean).join(" · "))}</b></p>
    ${T.html("stretch", step.seconds, label)}
    <p>${esc(s.how)}</p><p class="small"><b>Feel it:</b> ${esc(s.feel)}</p>
    <div class="row"><button class="btn" data-act="strPrev" ${run.i ? "" : "disabled"}>Back</button><button class="btn" data-act="strNext">Skip</button></div>
    ${nextStep ? `<p class="small muted">Up next: ${esc(ST.BY_KEY[nextStep.key].n)}</p>` : `<p class="small muted">Last one.</p>`}
  </section>`;
}
// Starts the current step's timer and says what it is (spoken when spoken cues are on).
function strGo() {
  const run = strState().run; if (!run) return;
  const step = run.steps[run.i], s = ST.BY_KEY[step.key];
  if (state.view === "stretch") render();
  const say = `${s.n}${step.side ? ", " + step.side : ""}. ${step.cue}.`;
  A.announce(say); A.speak(say);
  T.start("stretch", step.seconds, `${s.n}${step.side ? ", " + step.side.toLowerCase() : ""}`);
}
function strFinish(early = false) {
  const st = strState(), run = st.run; if (!run) return;
  T.stop("stretch"); st.run = null;
  const secs = run.steps.slice(0, run.i).reduce((n, x) => n + x.seconds, 0) + (early ? 0 : 0);
  const minutes = Math.max(1, Math.round(secs / 60));
  if (secs >= 45) {
    track({ stretches: 1 });
    const id = `${state.user}-${TODAY()}-stretch-${Date.now()}`;
    save("activities", id, { user: state.user, date: TODAY(), type: "Stretch", minutes, routine: st.pick, title: run.title });
    st.finished = { id, minutes, title: run.title, feel: null };
  } else { st.finished = null; toast("Stretch ended. Too short to log."); }
  render(); $("#sd-h")?.focus();
}
document.addEventListener("twp-timer-done", e => {
  if (e.detail.key !== "stretch") return;
  const run = strState().run; if (!run) return;
  setTimeout(() => { if (strState().run !== run) return; run.i++; if (run.i >= run.steps.length) strFinish(); else strGo(); }, 1700); // after the end beeps
});

export { strFinish, strGo, strRoutine, strState, viewStretch };
