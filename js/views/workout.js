// The Workout tab: today's plan and logging in one place.
import { DIFF, LD, LU, P, PROFILES, TODAY, VARIANT_NOTE, autoSel, baseDay, bonusPickFor, bonusPicker, cardioProgram, conflicts, cycleStart, dayName, dayStatus, dayTitle, daysFor, defOf, deloadActive, deloadOf, deloadSuggestion, editKey, esc, funAt, funHeader, getDraft, gymSet, isHome, libItem, listText, nextPlanDay, other, otherSlotOn, personToggle, planEditBox, reminders, ring, riskBlock, seg, sessionFor, slotDate, slotKey, srFor, state, store, supersetIdeas, todaysList, vLabel, variantOf, warmupCard, workoutBar, yt, ytStretch } from "../app.js";
import * as A from "../a11y.js";
import * as PG from "../program.js";
import * as S from "../stats.js";
import * as T from "../timer.js";
import { reviewState, weekReview } from "./review.js";
import { icon } from "../icons.js";
import { JOINTS, PLAN_MACHINES } from "../library.js";
import { CARDIO_MACHINES, PAIN_AREAS, STRETCH } from "../plan.js";
import { safetyFor } from "../safety.js";

// ---------------------------------------------------------------- TODAY (plan + logging in one place)
function viewToday() {
  const u = LU(), p = P(u), date = LD();
  const { week, day } = state.sel;
  const ci = S.cycleInfo(TODAY(), cycleStart());
  const s = sessionFor(u, date);
  const list = todaysList(u, date);
  const done = list.filter(x => s?.exercises?.some(e => e.id === x.ex.id)).length;
  state.nextUpId = list.find(x => !s?.exercises?.some(e => e.id === x.ex.id))?.ex.id || null;
  const notToday = date !== TODAY();
  const rem = notToday ? [] : reminders(u);
  const dl = deloadActive(u, date); const dlSug = notToday ? null : deloadSuggestion(u);
  const partner = other(u);
  const rv = day !== "Bonus" && !state.showDay && !state.logDate ? reviewState(u, week) : null;
  const weekRow = `<div class="week-row"><span class="eyebrow">${ci.week === week ? "This week" : "Week " + week} · ${S.fmtDate(slotDate(week, "Mon"))} to ${S.fmtDate(S.addDays(slotDate(week, "Mon"), 6))}</span>${seg("selWeek", week, [["A", "Week A"], ["B", "Week B"]], "Week")}</div>`;
  if (rv) return `
  ${state.partner ? `<section class="card"><span class="eyebrow">Partner mode · logging for</span>${personToggle("logUser", u)}</section>` : ""}
  <section class="today-top">${weekRow}</section>
  ${weekReview(u, week, rv)}`;
  const backToReview = (state.showDay || day === "Bonus") && !state.logDate && reviewState(u, week) ? `<button class="btn small rv-back" data-act="reviewBack">${icon("chevron", 16, { stroke: 2 })} Week ${week} review</button>` : "";
  return `
  ${backToReview}
  ${state.partner ? `<section class="card"><span class="eyebrow">Partner mode · logging for</span>${personToggle("logUser", u)}</section>` : ""}
  ${state.logDate ? `<div class="banner">Logging for ${S.fmtDate(date)}. <button class="btn small" data-act="backToToday">Back to today</button></div>` : notToday ? `<div class="banner">Week ${esc(week)} ${esc(dayName(day))} was logged on ${S.fmtDate(date)}.</div>` : ""}
  ${rem.length && !focusOn() ? `<section class="reminders" aria-labelledby="rem-title"><h2 class="rem-title" id="rem-title">${icon("pulse", 16, { stroke: 2 })}${rem.every(r => r.id === "weigh" || r.id === "measure") ? "Set your starting point" : "Reminders"}</h2>${rem.map(r => `<div class="rem"><p>${esc(r.text)}</p><button class="btn pill" data-act="goView" data-v="${r.view}">Open</button><button class="icon-btn round ghost" data-act="dismissRem" data-v="${r.id}" aria-label="Dismiss until tomorrow: ${esc(r.text)}">${icon("x", 18, { stroke: 2 })}</button></div>`).join("")}</section>` : ""}
  ${(() => { const any = s && ((s.exercises || []).some(e => e.sets?.length) || s.markedDone);
    if (s?.markedDone && !(s.exercises || []).some(e => e.sets?.length)) return `<div class="banner">Marked done. No sets were logged for this day. <button class="btn small" data-act="unmarkDone">Undo</button></div>`;
    const weekOver = S.addDays(slotDate(week, "Mon"), 6) < TODAY();
    if (!any && weekOver && dayStatus(u, week, day).state === "missed") return `<div class="banner">${dayName(day)} was missed the week of ${S.fmtDate(slotDate(week, "Mon"))}. If you did it but didn't log it, <button class="btn small" data-act="markDone">Mark it done</button></div>`;
    const pick = autoSel();
    if (pick.complete && pick.week === week && ci.week === week) {
      if (state.showDay) return "";
      return `<div class="banner">That's the last one this week. Tap <b>Finish workout</b> when you're done to see your week in review.</div>`;
    }
    return ""; })()}
  ${dl ? `<div class="banner"><b>Lighter week</b> until ${S.fmtDate(deloadOf(u).to)}: about 60% of your usual weights and one less set. <button class="btn small" data-act="endDeload">End it early</button></div>` : dlSug ? `<div class="banner">${esc(dlSug)} <button class="btn small" data-act="startDeload">Start a lighter week</button></div>` : ""}
  <section class="today-top" aria-labelledby="today-title">
    ${weekRow}
    <div class="chips day-tiles" role="group" aria-label="Day" style="--cols:${Math.min(4, daysFor(u, week).length)}">${(() => { const nx = nextPlanDay(); return daysFor(u, week).map(d => { const ds = dayStatus(u, week, d); const next = ci.week === week && !nx.complete && nx.day === d && ds.state !== "done";
      const note = ds.state === "done" ? `✓ ${S.fmtDate(ds.date)}` : ds.state === "missed" ? "Missed" : next ? "Up next" : "";
      const sr = ds.state === "done" ? `done ${S.fmtDate(ds.date)}` : ds.state === "missed" ? "missed" : next ? "up next" : "not done yet";
      return `<button data-act="selDay" data-v="${d}" aria-pressed="${d === day}" class="${ds.state}${next ? " next" : ""}" aria-label="${dayName(d)}, ${esc(dayTitle(u, week, d))}, ${sr}"><span class="d" aria-hidden="true">${dayName(d)}</span><span class="m" aria-hidden="true">${esc(dayTitle(u, week, d).split(",")[0])}</span>${note ? `<span class="today-dot" aria-hidden="true">${note}</span>` : ""}</button>`; }).join(""); })()}</div>
    ${day === "Bonus" ? `<p class="small muted home-note">Bonus day: ${esc(PG.BONUS_FOCUS[bonusPickFor(u, week).focus]?.[0] || "")}, ${bonusPickFor(u, week).where === "home" ? "at home" : "at the gym"}. It counts toward your week. Tap a day above to get back to your plan. <button class="btn small" data-act="bonusOpen">Change it</button></p>${state.bonusPicker ? bonusPicker(u) : ""}`
      : `<button type="button" class="btn block home-pick" data-act="homeToggle" aria-pressed="${isHome(u, date)}">${icon("gym", 20)}<span>${isHome(u, date) ? `Doing ${esc(dayName(day))} at home. Switch back to the gym version` : `No gym today? Do ${esc(dayName(day))} at home`}</span></button>
    ${isHome(u, date) ? `<p class="small muted home-note">Same muscles as ${esc(dayName(day))}, using what you have at home${(P(u).homeGear || []).length ? ` (${esc(listText((P(u).homeGear || []).map(g => (PG.HOME_GEAR[g] || g).toLowerCase())))})` : ": just your body weight"}. It counts as ${esc(dayName(day))}. Change your home gear in Settings → Your plan.</p>` : ""}`}
    <div class="ring-row"><div class="today-title"><span class="eyebrow">Week ${week} · ${dayName(day)}${day !== "Bonus" && isHome(u, date) ? " · At home" : ""}</span><h2 class="h2" id="today-title">${esc(dayTitle(u, week, day))}</h2></div>${funAt("medium") ? ring(done, list.length) : `<span class="small muted">${done} of ${list.length} done</span>`}</div>
    ${funHeader(u)}
    ${workoutBar(u, date, s)}
    <details class="more row-disclosure"><summary>${esc(p.name)}'s focus, notes, and date${icon("chevron", 20, { stroke: 2 })}</summary><div class="panel"><p>${esc(p.focusNote)}</p><ul class="small">${(p.notes || []).map(n => `<li>${esc(n)}</li>`).join("")}</ul>
      <label class="field">Logging date<input type="date" data-act="logDate" value="${date}"></label>
      ${s ? `<div class="field"><span id="move-lbl">This workout is saved as Week ${esc(week)} ${esc(dayName(day))}. Move it to:</span><div class="row" role="group" aria-labelledby="move-lbl">${["A", "B"].flatMap(w => daysFor(LU(), w).map(d => [w, d])).filter(([w, d]) => w !== week || d !== day).map(([w, d]) => `<button type="button" class="btn small" data-act="moveWorkout" data-v="${w}${d}">Week ${w} ${dayName(d)}</button>`).join("")}</div></div>` : ""}</div></details>
    <div class="row"><button class="btn small" data-act="planEdit" aria-pressed="${!!state.planEdit}">${state.planEdit ? "Done editing plan" : "Edit this day's plan"}</button>
      ${funAt("medium") && partner !== u ? `<button class="btn small" data-act="hi5">🙌 High-five ${esc(P(partner).name)}</button>` : ""}</div>
    ${state.planEdit ? planEditBox(u, week, day) : ""}
  </section>
  ${focusOn() ? focusSteps(u, date, s, list) : `
  ${A.get().focusMode && state.focusAll ? `<button class="btn block" data-act="focusBack">Back to one step at a time</button>` : ""}
  ${warmupCard(u, date, s, list)}
  ${cardioCard(u, date, s)}
  ${supersetIdeas(u, date, list, s)}
  ${list.length > 1 ? `<div class="ex-all row"><span class="small muted">${done} of ${list.length} exercises done</span><button class="btn small" data-act="exAll" data-v="1">Open all</button><button class="btn small" data-act="exAll" data-v="0">Close all</button></div>` : ""}
  ${list.map(({ ex, added }, i) => exerciseCard(u, date, ex, added, s, i, list.length)).join("")}
  <button class="btn block add-ex" data-act="openPicker">+ Add an exercise</button>
  ${checkinCard(u, date, s)}`}
  ${s?.startedAt && !s.finishedAt ? `<button class="btn primary block" data-act="finishWorkout">Finish workout</button>` : ""}`;
}

// Focus mode: one step on screen at a time, with Back / Next. Saving a step moves on to the next unfinished one.
const focusSaved = () => { if (focusOn()) { state.focusAfter = state.focusIdx ?? -1; state.focusStep = null; } };
const focusOn = () => A.get().focusMode && !state.focusAll && !state.planEdit;
function focusSteps(u, date, s, list) {
  const steps = [
    { name: "Warm-up", chip: "W", done: !!s?.warmup, html: () => warmupCard(u, date, s, list) },
    { name: "Cardio", chip: "C", done: !!(s?.cardio?.done || s?.cardio?.skipped), html: () => cardioCard(u, date, s) },
    ...list.map(({ ex, added }, i) => ({ name: `Exercise ${i + 1}: ${defOf(ex, variantOf(u, ex)).name}`, chip: String(i + 1), ex: i + 1, done: !!s?.exercises?.some(e => e.id === ex.id), html: () => exerciseCard(u, date, ex, added, s, i, list.length, { forceOpen: true }) })),
    { name: "Check-in", chip: "✎", done: !!s?.checkin, html: () => checkinCard(u, date, s) }
  ];
  // After saving a step, go to the next unfinished step after it (then wrap around to any skipped ones).
  const after = state.focusAfter ?? -1;
  const nextUp = steps.findIndex((x, j) => j > after && !x.done);
  const auto = nextUp >= 0 ? nextUp : Math.max(0, steps.findIndex(x => !x.done));
  let i = state.focusStep ?? auto; if (i >= steps.length) i = steps.length - 1;
  if (state.focusStep == null && state.focusAfter != null) { state.focusStep = i; state.focusAfter = null; }
  state.focusIdx = i; state.focusCount = steps.length;
  const left = steps.filter(x => !x.done).length;
  return `<section class="card focus-head" aria-label="One step at a time">
      <div class="between"><span class="eyebrow">${steps[i].ex ? `Exercise ${steps[i].ex} of ${list.length}` : steps[i].name} · step ${i + 1} of ${steps.length}</span><button class="btn small" data-act="focusAll">Show everything</button></div>
      <ol class="focus-steps">${steps.map((x, j) => `<li class="${x.done ? "done" : ""} ${j === i ? "now" : ""}"><button type="button" data-act="focusGo" data-n="${j}" aria-current="${j === i ? "step" : "false"}" aria-label="${esc(x.name)}${x.done ? ", done" : ""}">${esc(x.chip)}</button></li>`).join("")}</ol>
      <p class="small muted">${left ? `${left} step${left === 1 ? "" : "s"} left today.` : "Everything's done today."}</p>
    </section>
    ${steps[i].html()}
    <div class="focus-nav"><button class="btn" data-act="focusGo" data-n="${i - 1}" ${i === 0 ? "disabled" : ""}>← Back</button><button class="btn primary" data-act="focusGo" data-n="${i + 1}" ${i >= steps.length - 1 ? "disabled" : ""}>Next →</button></div>
    ${i >= 2 && i < steps.length - 1 ? `<button class="btn block add-ex" data-act="openPicker">+ Add an exercise</button>` : ""}`;
}
// Number circle on each exercise: the number, or a check when every set is checked off / the exercise is saved.
function exNum(idx, count, done) {
  if (!count) return "";
  return `<span class="ex-num ${done ? "filled" : ""}" aria-hidden="true">${done ? icon("check", 18) : idx + 1}</span><span class="visually-hidden">Exercise ${idx + 1} of ${count}${done ? ", all sets done" : ""}: </span>`;
}
// "3 × 10–12" drawn as big numbers, read as "3 sets of 10–12".
function schemeHtml(target) {
  const m = /^\s*(\d+)\s*×\s*(.+)$/.exec(target || "");
  if (!m) return target ? `<span class="ex-scheme">${esc(target)}</span>` : "";
  const rest = m[2].trim(); const said = /^[\d–-]+$/.test(rest) ? `${rest} reps` : rest;
  return `<span class="ex-scheme" role="text" aria-label="${m[1]} sets of ${esc(said)}"><span class="big-num" aria-hidden="true">${m[1]}</span><span class="x" aria-hidden="true">×</span><span class="big-num" aria-hidden="true">${esc(rest.replace(/ (per leg|per side|sec|steps|total)$/, ""))}</span>${/ (per leg|per side|sec|steps|total)$/.test(rest) ? `<span class="unit" aria-hidden="true">${esc(rest.match(/ (per leg|per side|sec|steps|total)$/)[1])}</span>` : ""}</span>`;
}
// Collapsible tiles: the next exercise you haven't done opens by itself; tap any header to open or close it.
// Your taps are remembered on this phone for the day. A tile with sets checked off or a timer running stays open.
const openKey = (u, date) => `twp-open-${u}-${date}-${slotKey()}`;
function isOpen(u, date, id, d, force) {
  if (force || state.planEdit) return true;
  const choice = store.get(openKey(u, date), {})[id];
  if (choice !== undefined) return choice;
  if (d.sets.some(x => x.done) || T.isActive(`set:${u}|${date}|${id}|${d.sets.findIndex(x => !x.done)}`)) return true;
  return id === state.nextUpId;
}
// "At our gym": one tap switches this exercise to one of our purple machines (logged separately, like any library pick).
function ourMachines(ex, v) {
  const ids = (PLAN_MACHINES[ex.id] || []).map(libItem).filter(Boolean);
  if (!ids.length) return "";
  const cur = String(v).startsWith("lib:") ? v.slice(4) : "";
  return `<div class="our-machines"><span class="small muted" id="om-${ex.id}">At our gym:</span><div class="row" role="group" aria-labelledby="om-${ex.id}">${ids.map(m => `<button type="button" class="btn small" data-act="useMachine" data-id="${esc(m.id)}" aria-pressed="${cur === m.id}">${esc(m.name)}</button>`).join("")}${cur && ids.some(m => m.id === cur) ? `<button type="button" class="btn small" data-act="variant" data-v="std">Back to plan</button>` : ""}</div></div>`;
}
function exerciseCard(u, date, ex, added, s, idx = 0, count = 0, cardOpts = {}) {
  const logged = s?.exercises?.find(e => e.id === ex.id);
  const ek = editKey(u, date, ex.id);
  if (logged && !state.editing.has(ek)) {
    const def = S.defFor(ex.id, logged.variant || "std", logged);
    return `<article class="card ex done-card" id="ex-${ex.id}">
      <div class="head"><h3 class="name">${count ? `<span class="ex-num filled" aria-hidden="true">${icon("check", 18)}</span>` : `<span class="tick" aria-hidden="true">✓</span>`}<span class="visually-hidden">Done${count ? `, exercise ${idx + 1} of ${count}` : ""}: </span>${esc(logged.name || def.name)}${logged.variant && logged.variant !== "std" ? `<span class="tag new">${vLabel(logged.variant)}</span>` : ""}${added ? `<span class="tag orig">Added</span>` : ""}</h3><button class="btn small" data-act="editEx" data-ex="${ex.id}" aria-label="Edit ${esc(logged.name || def.name)}">Edit</button></div>
      <div class="last"><b>${esc(S.setsText(logged))}</b></div>
    </article>`;
  }
  const d = getDraft(u, date, ex, logged);
  const v = d.variant;
  const lib = String(v).startsWith("lib:") ? libItem(v.slice(4)) : null;
  const def = defOf(ex, v);
  const opts = [["std", "Standard"]]; if (ex.h) opts.push(["hard", "Harder"]); if (ex.swap) opts.push(["swap", "Alternative"]);
  if (!ex.custom) opts.push(["lib", "Library"]);
  const why = lib ? (lib.how || lib.notes || `From your gym library. Same target: ${ex.sr}.`) : v === "hard" && ex.h ? ex.h.how : v === "swap" && ex.swap ? ex.swap.how : ex.why;
  const last = S.lastTime(state.data.sessions, u, ex.id, v);
  const sug = ex.custom ? null : S.suggestion(state.data.sessions, u, ex.id, v);
  const pu = other(u), pLast = state.partner ? S.lastTime(state.data.sessions, pu, ex.id, ex.custom ? "std" : variantOf(pu, ex)) : null;
  const entry = { kind: def.kind, db: def.db };
  const target = srFor(u, ex, def);
  const safety = lib || ex.lib || safetyFor(ex, v);
  const sore = safety ? conflicts(safety, u) : { high: [], some: [] };
  const smith = /smith/i.test(def.name) ? (gymSet().smithBar ? `Smith bar: ${gymSet().smithBar} lb. Log it the same way every time (with or without the bar).` : "Smith bar weight isn't set yet. Add it in Settings → Our gym once you check.") : "";
  const tags = `${ex.custom || lib ? "" : ex.lib ? `<span class="tag orig">Library</span>` : `<span class="tag ${ex.tag}">${ex.tag === "orig" ? "Original" : "New"}</span>`}${added ? `<span class="tag orig">Added</span>` : ""}`;
  const open = isOpen(u, date, ex.id, d, cardOpts.forceOpen);
  const checked = d.sets.filter(x => x.done).length;
  const allDone = d.sets.length > 0 && d.sets.every(x => x.done);
  const tmr = T.isActive(`set:${u}|${date}|${ex.id}|${d.sets.findIndex(x => !x.done)}`);
  const lastLine = `${checked ? `<b>${checked} of ${d.sets.length} ${d.sets.some(x => x.side) ? "sides" : "sets"} checked</b> · ` : ""}${tmr ? "<b>Timer running</b> · " : ""}${last ? `Last time: ${esc(S.describeSets(last.kind, last.db, last.sets))}` : "No history yet"}${!open && sore.high.length ? ` · <span class="warn-text">Hard on your ${esc(listText(sore.high.map(j => (JOINTS[j] || j).toLowerCase())))} today</span>` : ""}`;
  const head = `<div class="head ex-head"><h3 class="name"><button type="button" class="ex-toggle" data-act="toggleEx" aria-expanded="${open}" aria-controls="exb-${ex.id}">${exNum(idx, count, allDone)}<span class="ex-main"><span class="ex-name">${esc(def.name)}</span>${tags ? `<span class="ex-tags">${tags}</span>` : ""}</span>${schemeHtml(target)}<span class="ex-last">${lastLine}</span></button></h3></div>`;
  if (!open) return `<article class="card ex collapsed ${allDone ? "all-done" : ""}" id="ex-${ex.id}" data-ex="${ex.id}">${head}</article>`;
  return `<article class="card ex open ${allDone ? "all-done" : ""}" id="ex-${ex.id}" data-ex="${ex.id}">
    ${head}<div class="ex-body" id="exb-${ex.id}">
    ${sore.high.length ? `<div class="pill hold">Hard on your ${esc(listText(sore.high.map(j => (JOINTS[j] || j).toLowerCase())))} today. Consider the Alternative or Library version.</div>` : sore.some.length ? `<div class="small warn-text">Some load on your ${esc(listText(sore.some.map(j => (JOINTS[j] || j).toLowerCase())))} today.</div>` : ""}
    ${opts.length > 1 ? seg("variant", String(v).startsWith("lib:") ? "lib" : v, opts, "Version") + `<p class="v-note small"><b>${esc(vLabel(v))}:</b> ${esc(VARIANT_NOTE[String(v).startsWith("lib:") ? "lib" : v] || "")}</p>` : ""}
    ${(() => { const t = P(u).tailor?.[ex.id]; return t && t.v === v ? `<p class="tailor-note small"><span aria-hidden="true">✨</span> Picked for you: ${esc(t.why)}.</p>` : ""; })()}
    ${why ? `<div class="why">${esc(why)}</div>` : ""}
    ${lib ? `<div class="row"><a class="video" href="${yt(lib.name)}" target="_blank" rel="noopener">Watch form videos</a><button class="btn small" data-act="libSwap">Change machine</button></div>` : ""}
    ${lib?.tip ? `<div class="small muted"><b>Setup:</b> ${esc(lib.tip)}</div>` : ""}
    ${ourMachines(ex, v)}
    ${ex.notes?.[u] ? `<div class="note">${esc(ex.notes[u])}</div>` : ""}
    ${smith ? `<div class="small muted">${esc(smith)}</div>` : ""}
    ${last ? `<div class="last small muted">Last time was ${S.fmtDate(last.date)}.</div>` : ""}
    ${state.partner ? `<div class="last">${esc(PROFILES[pu].name)}: ${pLast ? `<b>${esc(S.describeSets(pLast.kind, pLast.db, pLast.sets))}</b>` : "no history yet"}</div>` : ""}
    ${sug ? `<div class="pill ${sug.type}">${esc(sug.text)}</div>` : ""}
    ${d.fresh ? `<div class="pill hold fresh-note">First time: set the weight and reps you actually did.</div>` : ""}
    <div class="sets">${d.sets.map((x, i) => setRow(entry, x, i)).join("")}</div>
    ${def.kind === "time" ? setTimer(u, date, ex.id, d.sets) : ""}
    <div class="row"><button class="btn small" data-act="addSet">+ Add set</button><button class="btn small" data-act="timer">Rest timer</button>${A.get().readAloud && A.canSpeak() ? `<button class="btn small" data-act="readEx" aria-label="Read ${esc(def.name)} aloud">🔊 Read aloud</button>` : ""}
      ${logged ? `<button class="btn small" data-act="cancelEdit">Cancel</button><button class="btn small danger" data-act="deleteEx">${state.confirmDel === ek ? "Confirm delete" : "Delete"}</button>` : added ? `<button class="btn small danger" data-act="dropExtra">Remove</button>` : ""}</div>
    <button class="btn primary block ${d.sets.length && d.sets.every(x => x.done) ? "ready" : ""}" data-act="saveEx">${logged ? "Save changes" : "Save exercise"}</button>
    ${state.planEdit && !added ? `<div class="plan-tools"><span class="small muted">Plan for Week ${state.sel.week} ${dayName(state.sel.day)}</span>
      <div class="row"><button class="btn small" data-act="planMove" data-v="-1" ${idx === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button class="btn small" data-act="planMove" data-v="1" ${idx >= count - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
      <label class="field" style="flex:1;min-width:120px">Target<input type="text" data-act="planSr" value="${esc(target)}"></label>
      <button class="btn small danger" data-act="planRemove">Remove</button></div></div>` : ""}
    ${ex.custom ? "" : `<details class="more"><summary>How-to, video, risks, and stretches</summary>${exPanel(ex, safety, v, lib, why)}</details>`}
  </div></article>`;
}

// Only the version picked at the top of the tile: its how-to, video, and risks. Then the stretches.
function exPanel(ex, safety, v, lib, why) {
  const pick = lib ? { n: lib.name, how: lib.how, q: lib.name }
    : v === "hard" && ex.h ? { n: ex.h.n, how: ex.h.how, q: ex.h.q }
    : v === "swap" && ex.swap ? { n: ex.swap.n, how: ex.swap.how, q: ex.swap.q }
    : { n: ex.n, how: ex.setup, q: ex.q };
  const showHow = pick.how && pick.how !== why;
  return `<div class="panel">
    <div><h4>How to do it · ${esc(pick.n)}</h4>${showHow ? `<p>${esc(pick.how)}</p>` : ""}<a class="video" href="${yt(pick.q)}" target="_blank" rel="noopener">Watch form videos</a></div>
    ${safety ? riskBlock(safety) : ""}
    ${ex.v && !lib && v !== "swap" ? `<details class="more sub"><summary>Other lunge types to rotate in</summary><div class="panel">${ex.v.map(x => `<div class="stretch"><b>${esc(x.n)}</b><p>${esc(x.h)}</p><a href="${yt(x.q)}" target="_blank" rel="noopener">Video</a></div>`).join("")}</div></details>` : ""}
    <div><h4>Stretches between sets</h4><div class="panel">${ex.s.map(stretchBox).join("")}</div></div>
  </div>`;
}
function stretchBox(k) {
  const s = STRETCH[k];
  const each = /per side/.test(s.t) ? "Hold · each side" : /each way/.test(s.t) ? "Hold · each way" : "Hold";
  return `<div class="stretch"><b>${esc(s.n)}<span>${esc(s.t)}</span></b><p>${esc(s.h)}</p>
    ${s.f ? `<dl class="stretch-notes"><dt>Feel it</dt><dd>${esc(s.f)}</dd><dt>What it does</dt><dd>${esc(s.g)}</dd></dl>` : ""}
    ${s.sec ? T.html(`st:${k}`, s.sec, each) : ""}
    <div class="row"><a href="${ytStretch(s.n)}" target="_blank" rel="noopener">See it done</a>${A.get().readAloud && A.canSpeak() ? `<button type="button" class="btn small" data-act="readStretch" data-v="${k}" aria-label="Read ${esc(s.n)} aloud">🔊 Read aloud</button>` : ""}</div></div>`;
}
// Timed exercises (planks, holds, jump rope): the timer runs the next set that isn't checked off, and checks it when time's up.
function setTimer(u, date, id, sets) {
  const si = sets.findIndex(x => !x.done);
  if (si < 0) return `<div class="tmr-note small muted">All sets checked off. Save it when you're ready.</div>`;
  const sec = +sets[si].r || 30;
  return T.html(`set:${u}|${date}|${id}|${si}`, sec, `Set ${si + 1} of ${sets.length}`, `.set[data-s="${si}"] input[data-f="r"]`);
}
function setRow(e, s, si) {
  const u = S.unitLabel(e.kind, e.db);
  const rStep = e.kind === "time" || e.kind === "carry" ? 5 : 1;
  // One-arm and one-leg moves: rows come in Left/Right pairs that share a set number.
  const n = s.side ? Math.floor(si / 2) + 1 : si + 1;
  const side = s.side === "L" ? "left" : s.side === "R" ? "right" : "";
  const nm = `Set ${n}${side ? ` ${side}` : ""}`;
  return `<div class="set ${u.w ? "" : "noweight"} ${s.done ? "is-done" : ""} ${s.side ? `sided side-${s.side}` : ""}" data-s="${si}">
    <span class="set-n big-num" aria-hidden="true">${n}${s.side ? `<small class="side-tag">${s.side === "L" ? "Left" : "Right"}</small>` : ""}</span>
    ${u.w ? stepper("w", s.w, u.w, 1, `${nm} weight`) : ""}
    ${stepper("r", s.r, u.r, rStep, `${nm} ${u.r === "sec" ? "seconds" : u.r}`)}
    ${s.side === "R" ? `<span class="set-del" aria-hidden="true"></span>` : `<button type="button" class="set-del icon-btn round ghost" data-act="delSet" aria-label="Remove set ${n}${s.side ? ", both sides" : ""}">${icon("x", 18, { stroke: 2 })}</button>`}
    <div class="diff" role="group" aria-label="How ${nm.toLowerCase()} felt">${[1, 2, 3].map(d => `<button type="button" data-act="diff" data-d="${d}" aria-pressed="${(s.d || 2) === d}">${DIFF[d]}</button>`).join("")}</div>
    <button type="button" class="setcheck" role="checkbox" aria-checked="${!!s.done}" data-act="setDone" aria-label="${nm} done">${s.done ? icon("check", 22) : ""}</button>
  </div>`;
}
function stepper(f, val, label, step, name = label) {
  const unit = label === "lb each" ? "pounds each" : label === "lb" ? "pounds" : label === "lb assist" ? "pounds of assist" : label === "sec" ? "seconds" : label;
  return `<div class="sw sw-${f}"><div class="stepper"><button type="button" data-act="step" data-f="${f}" data-by="${-step}" aria-label="${esc(name)} down">−</button><input type="number" inputmode="decimal" step="any" data-f="${f}" value="${esc(val)}" aria-label="${esc(name)}, ${esc(unit)}"><button type="button" data-act="step" data-f="${f}" data-by="${step}" aria-label="${esc(name)} up">+</button></div><div class="stepper-label" aria-hidden="true">${esc(label)}</div></div>`;
}

// Cardio: its own save.
function cardioCard(u, date, s) {
  const { week, day } = state.sel; const cp = cardioProgram(u).plan(week, baseDay(u, week, day));
  const ek = editKey(u, date, "cardio");
  const commute = s || !otherSlotOn(u, date) ? state.data.activities.find(a => a.id === `${u}-${date}-commute`) : null;
  if ((s?.cardio?.done || s?.cardio?.skipped) && !state.editing.has(ek)) {
    const c = s.cardio;
    return `<section class="card cardio-card done-card"><div class="head"><h3 class="name"><span class="tick" aria-hidden="true">✓</span><span class="visually-hidden">Done: </span>Cardio</h3><button class="btn small" data-act="editCardio">Log</button></div>
      <div class="last"><b>${c.skipped ? "Skipped: biked to work" : `${esc(c.type)}, ${c.minutes || 0} min${c.miles ? `, ${c.miles} mi` : ""}${c.avgHr ? `, avg HR ${c.avgHr}` : ""}${c.hiit ? ", intervals" : ""}`}</b>${commute ? ` · Bike commute ${commute.miles} mi` : ""}</div></section>`;
  }
  const c = store.get(`twp-c-${u}-${date}-${slotKey()}`, null) || { type: s?.cardio?.type || cp.type, minutes: s?.cardio?.minutes ?? 25, miles: s?.cardio?.miles ?? "", avgHr: s?.cardio?.avgHr ?? "", hiit: s?.cardio?.hiit ?? !!cp.hiit, commute: !!commute, commuteMiles: commute?.miles ?? PROFILES[u].commute.miles };
  const partner = state.partner ? cardioProgram(other(u)).plan(week, baseDay(other(u), week, day)) : null;
  const machines = [cp.type, ...Object.keys(CARDIO_MACHINES).filter(m => m !== cp.type), ...cardioProgram(u).options.filter(o => !(o in CARDIO_MACHINES) && o !== cp.type)];
  const pick = machines.includes(c.type) ? c.type : cp.type;
  return `<section class="card cardio-card" id="cardio-form">
    <div class="between"><h3 class="h3">Cardio · ${esc(pick)}</h3>${cp.hiit ? `<span class="tag new">Intervals</span>` : ""}</div>
    <label class="field cardio-pick">Machine<select data-cf="type">${machines.map(o => `<option value="${esc(o)}" ${o === pick ? "selected" : ""}>${esc(o)}${o === cp.type ? " (recommended)" : ""}</option>`).join("")}</select></label>
    <p>${esc(cp.text)}</p>
    ${pick !== cp.type ? `<p class="small cardio-swap"><b>On the ${esc(pick.toLowerCase())}:</b> ${esc(CARDIO_MACHINES[pick] || CARDIO_MACHINES.Other)} Same time${cp.hiit ? " and the same easy and hard rounds" : ""} as planned.</p>` : `<p class="small muted">Recommended for today. Pick a different machine above if it's taken or you'd rather.</p>`}
    ${partner ? `<p class="small muted"><b>${esc(PROFILES[other(u)].name)}:</b> ${esc(partner.type)}. ${esc(partner.text)}</p>` : ""}
    <details class="more" ${state.editing.has(ek) ? "open" : ""}><summary>Log cardio</summary><div class="panel">
      <div class="grid2">
        <label class="field">Minutes<input type="number" inputmode="numeric" data-cf="minutes" value="${esc(c.minutes)}"></label>
        <label class="field">Distance (miles)<input type="number" inputmode="decimal" step="any" data-cf="miles" value="${esc(c.miles)}" placeholder="optional"></label>
        <label class="field">Average heart rate<input type="number" inputmode="numeric" data-cf="avgHr" value="${esc(c.avgHr)}" placeholder="optional"></label>
      </div>
      <label class="check"><input type="checkbox" data-cf="hiit" ${c.hiit ? "checked" : ""}><span>Intervals (HIIT)</span></label>
      ${PROFILES[u].commute.enabled ? `<label class="check"><input type="checkbox" data-cf="commute" ${c.commute ? "checked" : ""}><span>I biked to work today</span></label>
        <label class="field">Round-trip commute miles<input type="number" inputmode="decimal" step="any" data-cf="commuteMiles" value="${esc(c.commuteMiles)}"></label>` : ""}
      <button class="btn primary block" data-act="saveCardio">Save cardio</button>
      ${PROFILES[u].commute.enabled ? `<button class="btn block" data-act="skipCardio">Biked to work, skipping gym cardio</button>` : ""}
    </div></details>
  </section>`;
}

// Pain, sleep, energy, soreness, notes: its own save, any time.
function checkinCard(u, date, s) {
  const ek = editKey(u, date, "checkin");
  const saved = s && (s.checkin || s.pain);
  if (saved && !state.editing.has(ek)) {
    const pain = PROFILES[u].pain.map(a => `${PAIN_AREAS[a]} ${s.pain?.[a] ?? 0}`).join(" · ");
    const r = s.recovery || {};
    return `<section class="card done-card"><div class="head"><h3 class="name"><span class="tick" aria-hidden="true">✓</span><span class="visually-hidden">Done: </span>Check-in</h3><button class="btn small" data-act="editCheckin">Log</button></div>
      <div class="last">Pain: ${esc(pain)}</div><div class="last">Sleep ${r.sleep || "–"} · Energy ${r.energy || "–"} · Soreness ${r.soreness || "–"}</div>${s.notes ? `<div class="last">${esc(s.notes)}</div>` : ""}</section>`;
  }
  const k = store.get(`twp-k-${u}-${date}-${slotKey()}`, null) || { pain: { ...Object.fromEntries(PROFILES[u].pain.map(a => [a, 0])), ...(s?.pain || {}) }, recovery: { sleep: 0, energy: 0, soreness: 0, ...(s?.recovery || {}) }, notes: s?.notes || "" };
  const row = (key, l, lo, hi) => `<div class="field"><span>${l} <span class="small">(1 ${lo} · 5 ${hi})</span></span><div class="scale" role="group" aria-label="${l}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-act="scale" data-k="${key}" data-n="${n}" aria-pressed="${+k.recovery[key] === n}">${n}</button>`).join("")}</div></div>`;
  return `<section class="card" id="checkin-form"><h3 class="h3">Check-in: pain &amp; how you feel</h3>
    <p class="small muted">0 is nothing, 10 is stop-everything. Log zeros too, so healing shows on the chart.</p>
    ${PROFILES[u].pain.map(a => `<div class="pain-row"><span>${PAIN_AREAS[a]}</span><input type="range" min="0" max="10" step="1" data-kf="pain.${a}" value="${+k.pain[a] || 0}" aria-label="${PAIN_AREAS[a]} pain"><span class="mono" data-out="pain.${a}">${+k.pain[a] || 0}</span></div>`).join("")}
    ${row("sleep", "Sleep last night", "awful", "great")}${row("energy", "Energy", "drained", "strong")}${row("soreness", "Soreness", "none", "very")}
    <label class="field">Notes<textarea data-kf="notes" placeholder="Anything worth remembering: new machine, felt off, a win.">${esc(k.notes)}</textarea></label>
    <button class="btn primary block" data-act="saveCheckin">Save check-in</button>
  </section>`;
}

export { focusSaved, openKey, stretchBox, viewToday };
