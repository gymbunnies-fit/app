// Week in review: the look back shown once a week is finished, and the bonus-day suggestion.
import { P, TODAY, bonusDates, dayEdits, dayName, dayStatus, dayTitle, daysFor, esc, libItem, listText, planDay, resolveEx, slotDate, state } from "../app.js";
import * as F from "../fun.js";
import * as PG from "../program.js";
import * as S from "../stats.js";
import * as TL from "../tailor.js";
import { icon } from "../icons.js";
import { ALL_EX } from "../plan.js";
import { areaCard } from "./areas.js";

// ---------------------------------------------------------------- week review
// Once a week is finished (or over), the Workout screen shows a look back instead of the last day.
const sessDone = x => (x.exercises || []).some(e => e.sets?.length) || x.markedDone;
const minsText = m => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m} min`);
const sessMinutes = x => { const d = S.workoutDuration(x); return d ? Math.round(d / 60000) : 0; };
function weekRange(week) { const from = slotDate(week, "Mon"); return { from, to: S.addDays(from, 6) }; }
function weekSessionsOf(u, from, to) { return state.data.sessions.filter(x => x.user === u && !x.imported && x.date >= from && x.date <= to && sessDone(x)); }
// Should this week show its review? Past weeks always; this week once every day is done and nothing from today is still in progress.
function reviewState(u, week) {
  const { from, to } = weekRange(week);
  if (from > TODAY()) return null;
  const days = daysFor(u, week), st = days.map(d => dayStatus(u, week, d));
  const allDone = st.every(x => x.state === "done");
  const over = to < TODAY();
  const live = state.data.sessions.some(x => x.user === u && x.date === TODAY() && x.week === week && x.day !== "Bonus" && x.startedAt && !x.finishedAt && x.date >= from && x.date <= to);
  if (!(over || (allDone && !live))) return null;
  return { from, to, days, st, allDone, over, current: !over };
}
// What changed for one exercise compared with the last time before this week.
function growthOf(u, e, before) {
  const hist = S.exHistory(state.data.sessions, u, e.id, e.variant || "std").filter(h => h.date < before);
  const prev = hist.at(-1); if (!prev) return { first: true };
  const best = S.personalBest(state.data.sessions, u, e.id, e.variant || "std", S.addDays(before, -1));
  const score = S.bestScore(e.kind, e.sets), pr = best && S.betterThan(e.kind, score, best.score);
  const top = sets => (sets || []).reduce((a, b) => ((b.w || 0) > (a.w || 0) || ((b.w || 0) === (a.w || 0) && (b.r || 0) > (a.r || 0)) ? b : a), { w: 0, r: 0 });
  const u2 = S.unitLabel(e.kind, e.db);
  const a = top(prev.sets), b = top(e.sets);
  let text = null, size = 0;
  if (e.kind === "assist") { const lo = x => Math.min(...(x || []).map(s => s.w || 0)); const x0 = lo(prev.sets), x1 = lo(e.sets); if (x1 < x0) { text = `${x0} → ${x1} lb assist`; size = (x0 - x1) / Math.max(1, x0); } }
  else if (u2.w) {
    if (b.w > a.w) { text = `${a.w} → ${b.w} ${u2.w}`; size = (b.w - a.w) / Math.max(1, a.w); }
    else if (b.w === a.w && b.r > a.r) { text = `${b.w} ${u2.w}: ${a.r} → ${b.r} ${u2.r}`; size = (b.r - a.r) / Math.max(1, a.r) / 2; }
  } else if (b.r > a.r) { text = `${a.r} → ${b.r} ${u2.r}`; size = (b.r - a.r) / Math.max(1, a.r); }
  return { text, size, pr };
}
// A bonus focus to suggest: what got the least work this week, nudged toward what they asked for.
function bonusSuggest(u, sessions) {
  const sets = {};
  for (const x of sessions) for (const e of x.exercises || []) for (const f of (ALL_EX[e.id]?.focus || e.focus || libItem(e.id)?.focus || [])) sets[f] = (sets[f] || 0) + (e.sets || []).length;
  const want = new Set(P(u).focus || []);
  const keys = Object.keys(PG.BONUS_FOCUS).filter(k => k !== "full" && k !== "upper" && k !== "lower");
  const score = k => { const areas = PG.BONUS_FOCUS[k][1]; return areas.reduce((n, a) => n + (sets[a] || 0), 0) / areas.length - (areas.some(a => want.has(a)) ? 6 : 0); };
  const key = keys.sort((a, b) => score(a) - score(b))[0] || "full";
  const areas = PG.BONUS_FOCUS[key][1], name = PG.BONUS_FOCUS[key][0].toLowerCase();
  const total = areas.reduce((n, a) => n + (sets[a] || 0), 0);
  const why = areas.some(a => want.has(a)) && total > 0 ? `You asked for extra attention on ${name}.` : total === 0 ? `You didn't train ${name} this week.` : `Your week was light on ${name}.`;
  return { key, why };
}
function weekReview(u, week, rv) {
  const { from, to, days, st } = rv;
  const all = weekSessionsOf(u, from, to);
  const plan = all.filter(x => x.day !== "Bonus" && x.day !== "Home");
  const extra = all.filter(x => x.day === "Bonus" || x.day === "Home");
  const ex = all.flatMap(x => (x.exercises || []).filter(e => !e.skipped && e.sets?.length));
  const doneN = st.filter(x => x.state === "done").length, n = days.length;
  const sets = ex.reduce((t, e) => t + e.sets.length, 0);
  const lbs = Math.round(ex.reduce((t, e) => t + F.volumeOf(e), 0));
  const mins = all.reduce((t, x) => t + sessMinutes(x), 0);
  const cardio = all.reduce((t, x) => t + (x.cardio?.done ? +x.cardio.minutes || 0 : 0), 0);
  // Growth: each exercise's best this week against the last time before the week.
  const seen = new Map();
  for (const e of ex) { const k = `${e.id}|${e.variant || "std"}`; const cur = seen.get(k); if (!cur || S.betterThan(e.kind, S.bestScore(e.kind, e.sets), S.bestScore(cur.kind, cur.sets))) seen.set(k, e); }
  const grown = [...seen.values()].map(e => ({ e, g: growthOf(u, e, from) }));
  const ups = grown.filter(x => x.g.text).sort((a, b) => b.g.size - a.g.size);
  const prs = grown.filter(x => x.g.pr).length, firsts = grown.filter(x => x.g.first).length;
  // Against the same week last cycle.
  const prevAll = weekSessionsOf(u, S.addDays(from, -14), S.addDays(to, -14));
  const prevLbs = Math.round(prevAll.flatMap(x => x.exercises || []).reduce((t, e) => t + F.volumeOf(e), 0));
  const prevSets = prevAll.flatMap(x => x.exercises || []).reduce((t, e) => t + (e.sets || []).length, 0);
  let headline;
  if (!all.length) headline = "Nothing was logged this week.";
  else if (!prevAll.length) headline = `Your first Week ${week} on the books. These numbers are your starting line.`;
  else if (prevLbs > 0 && lbs !== prevLbs) { const pct = Math.round((lbs - prevLbs) / prevLbs * 100); headline = lbs > prevLbs ? `You moved ${(lbs - prevLbs).toLocaleString()} lb more than your last Week ${week} (${pct > 0 ? "+" : ""}${pct}%).` : `You moved ${(prevLbs - lbs).toLocaleString()} lb less than your last Week ${week}. Lighter weeks happen; consistency is what counts.`; }
  else headline = sets > prevSets ? `${sets - prevSets} more sets than your last Week ${week}.` : `Steady with your last Week ${week}.`;
  // Worth noting: effort ratings, skipped exercises, missed days.
  const notes = [];
  for (const e of ex) {
    const hard = e.sets.filter(x => x.d === 3).length, easy = e.sets.filter(x => x.d === 1).length;
    if (hard >= 2) notes.push(`${e.name}: ${hard} sets felt Hard. Stay at this weight next time.`);
    else if (easy === e.sets.length && e.sets.length >= 2 && ["load", "carry"].includes(e.kind)) notes.push(`${e.name} felt Easy on every set. Try a little more next time.`);
  }
  for (const x of plan) {
    const ed = dayEdits(u, x.week, x.day);
    let base = planDay(u, x.week, x.day).ex.map(q => q.id);
    if (x.atHome) base = PG.homeVersion(P(u), base);
    const planned = [...base.filter(id => !ed.remove.includes(id)), ...ed.add];
    const logged = new Set((x.exercises || []).map(e => e.id));
    const miss = planned.filter(id => !logged.has(id)).map(id => resolveEx(id, {})?.n).filter(Boolean);
    if (miss.length && !x.markedDone) notes.push(`${dayName(x.day)}: skipped ${listText(miss.slice(0, 3))}${miss.length > 3 ? ` and ${miss.length - 3} more` : ""}.`);
  }
  st.forEach((x, i) => { if (x.state === "missed") notes.push(`${dayName(days[i])} (${dayTitle(u, week, days[i]).split(",")[0]}) was missed.`); });
  // Bonus tile: only for the week you're in.
  let bonus = "";
  if (rv.current && n < 7) {
    const sug = bonusSuggest(u, all);
    if (!state.bonusDraft || state.bonusDraft.week !== from) state.bonusDraft = { focus: sug.key, where: "gym", week: from };
    const d = state.bonusDraft;
    const used = extra.filter(x => x.day === "Bonus").length + bonusDates(u).filter(x => x >= from && x <= to).length;
    const left = Math.max(0, 7 - n - used);
    const todayBonus = all.find(x => x.day === "Bonus" && x.date === TODAY());
    const len = TL.SESSION_LEN[P(u).sessionLen] || "About an hour";
    bonus = `<section class="card bonus-tile" id="bonus-picker" aria-labelledby="bt-h"><h3 class="h3" id="bt-h" tabindex="-1">Bonus day</h3>
      ${todayBonus ? `<p>You did a bonus workout today. Nice work.</p><button class="btn block" data-act="reviewDay" data-v="Bonus">Open today's bonus workout</button>` : `
      <p><b>Suggested: ${esc(PG.BONUS_FOCUS[sug.key][0])}.</b> ${esc(sug.why)} Pick something else if you'd rather.</p>
      <div class="focus-chips ob-chips" role="group" aria-labelledby="bt-h">${Object.entries(PG.BONUS_FOCUS).map(([k, [l]]) => `<button type="button" data-act="bonusSet" data-k="focus" data-v="${k}" aria-pressed="${d.focus === k}">${esc(l)}${k === sug.key ? " ★" : ""}</button>`).join("")}</div>
      <div class="field"><span id="bt-w">Where?</span><div class="seg" role="group" aria-labelledby="bt-w">${[["gym", "At the gym"], ["home", "At home"]].map(([k, l]) => `<button type="button" data-act="bonusSet" data-k="where" data-v="${k}" aria-pressed="${d.where === k}">${l}</button>`).join("")}</div></div>
      <p class="small muted">${esc(len)} · ${left ? `${left} bonus day${left === 1 ? "" : "s"} left this week` : "You've used every day this week. Superhero."}</p>
      <button class="btn primary block" data-act="bonusGo">Start bonus day</button>`}
      <div class="row bonus-alt"><button class="btn small" data-act="reviewStretch">Or recover: 15-minute stretch</button>${bonusDates(u).includes(TODAY()) ? `<span class="small">Bonus cardio logged today.</span>` : `<button class="btn small" data-act="bonusLog">Just log some cardio</button>`}</div></section>`;
  }
  const nextWeek = week === "A" ? "B" : "A";
  const dayCard = (d, i) => {
    const x = st[i], sess = plan.find(q => q.day === d);
    const title = dayTitle(u, week, d).split(",")[0];
    if (x.state !== "done" || !sess) return `<li class="rv-day ${x.state}"><span class="rv-d">${dayName(d)} · ${esc(title)}</span><span class="small muted">${x.state === "missed" ? "Missed" : x.state === "skipped" ? "Not needed: you hit your goal" : "Not done"}</span></li>`;
    const exs = (sess.exercises || []).filter(e => e.sets?.length);
    const prN = exs.filter(e => growthOf(u, e, from).pr).length, m = sessMinutes(sess);
    return `<li><button type="button" class="rv-day done" data-act="reviewDay" data-v="${d}"><span class="rv-d">${dayName(d)} · ${esc(title)}${sess.atHome ? " · at home" : ""}</span><span class="small muted">${S.fmtDate(sess.date)}${m ? ` · ${minsText(m)}` : ""} · ${exs.length} exercise${exs.length === 1 ? "" : "s"} · ${exs.reduce((t, e) => t + e.sets.length, 0)} sets${prN ? ` · ${prN} new best${prN === 1 ? "" : "s"}` : ""}</span>${icon("chevron", 18, { stroke: 2 })}</button></li>`;
  };
  return `<section class="week-review" aria-labelledby="rv-h">
    <div class="rv-head">
      <h2 class="h2" id="rv-h" tabindex="-1">${rv.allDone ? `Week ${week}, done.` : `Week ${week} recap`}</h2>
      <p>${rv.allDone ? `All ${n === 1 ? "of this week's workout" : `${n} days`} done.` : `${doneN} of ${n} days done.`}${rv.current ? ` Week ${nextWeek} starts Monday with Day 1.` : ""}</p></div>
    <section class="card rv-growth" aria-labelledby="rv-g"><h3 class="h3" id="rv-g">How you grew</h3>
      <p class="rv-headline">${esc(headline)}</p>
      ${ups.length ? `<ul class="rv-ups">${ups.slice(0, 6).map(({ e, g }) => `<li><b>${esc(e.name)}</b><span>${esc(g.text)}</span>${g.pr ? `<span class="tag new">New best</span>` : ""}</li>`).join("")}</ul>${ups.length > 6 ? `<p class="small muted">And ${ups.length - 6} more went up.</p>` : ""}`
        : all.length ? `<p class="small muted">No jumps this week, and that's normal. Strength comes in steps, and showing up is the part that builds it.</p>` : ""}
      ${firsts ? `<p class="small muted">${firsts} exercise${firsts === 1 ? " was" : "s were"} new to you this week. Next time you'll see how they grow.</p>` : ""}
    </section>
    <div class="stats rv-stats">
      <div class="stat"><div class="v">${doneN}/${n}${extra.length ? ` +${extra.length}` : ""}</div><div class="l">Workouts${extra.length ? " (+ bonus)" : ""}</div></div>
      ${mins ? `<div class="stat"><div class="v">${minsText(mins)}</div><div class="l">Time training</div></div>` : ""}
      <div class="stat"><div class="v">${sets}</div><div class="l">Sets</div></div>
      <div class="stat"><div class="v">${lbs.toLocaleString()}</div><div class="l">Pounds moved</div></div>
      <div class="stat"><div class="v">${prs}</div><div class="l">New personal bests</div></div>
      ${cardio ? `<div class="stat"><div class="v">${cardio}</div><div class="l">Cardio minutes</div></div>` : ""}
    </div>
    <section class="card" aria-labelledby="rv-days"><h3 class="h3" id="rv-days">Day by day</h3>
      <ul class="rv-days">${days.map(dayCard).join("")}${extra.map(x => `<li><button type="button" class="rv-day done" data-act="reviewDay" data-v="Bonus" data-date="${esc(x.date)}"><span class="rv-d">Bonus · ${esc(PG.BONUS_FOCUS[x.bonusFocus]?.[0] || dayName(x.day))}</span><span class="small muted">${S.fmtDate(x.date)} · ${(x.exercises || []).filter(e => e.sets?.length).length} exercises</span>${icon("chevron", 18, { stroke: 2 })}</button></li>`).join("")}</ul>
      <p class="small muted">Tap a day to see or change what you logged.</p></section>
    ${areaCard(u, from, { id: "rv" })}
    ${notes.length ? `<section class="card" aria-labelledby="rv-n"><h3 class="h3" id="rv-n">Worth noting</h3><ul class="rv-notes">${notes.slice(0, 5).map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
    ${bonus}
  </section>`;
}

export { bonusSuggest, growthOf, reviewState, weekReview };
