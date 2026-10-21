// "Log it after": the whole workout on one screen, for when you train first and log later.
// Every exercise starts filled in with last time's weights and reps (or the plan's), so most days you only
// change what was different, untick what you skipped, and save once. The workout clock isn't used.
import { $, LD, LU, TODAY, dayName, dayTitle, defOf, esc, getDraft, logAfter, sessionFor, state, toast, todaysList } from "../app.js";
import * as S from "../stats.js";
import * as A from "../a11y.js";

// Exercises on today's list that haven't been saved yet.
export function afterItems(u, date) {
  const s = sessionFor(u, date);
  return todaysList(u, date).filter(x => !s?.exercises?.some(e => e.id === x.ex.id && e.sets?.length)).map(({ ex, added }) => {
    const d = getDraft(u, date, ex, null);
    return { ex, added, on: true, variant: d.variant, sets: d.sets.map(x => ({ w: x.w ?? 0, r: x.r ?? 0, d: x.d || 2, ...(x.side ? { side: x.side } : {}) })) };
  });
}

export function openAfter() {
  const u = LU(), date = LD();
  state.after = { u, date, items: afterItems(u, date), minutes: "" };
  if (!state.after.items.length) { toast("Everything on this day is already saved."); return; }
  state.overlay = "after"; draw(true);
}

function setRows(it, i) {
  const def = defOf(it.ex, it.variant), un = S.unitLabel(def.kind, def.db);
  return it.sets.map((s, si) => {
    const n = s.side ? Math.floor(si / 2) + 1 : si + 1, side = s.side === "L" ? " left" : s.side === "R" ? " right" : "";
    const nm = `${def.name}, set ${n}${side}`;
    return `<div class="aft-set"><span class="aft-n">Set ${n}${side}</span>
      ${un.w ? `<label class="aft-f"><input type="number" inputmode="decimal" step="any" min="0" data-aft="w" data-i="${i}" data-s="${si}" value="${esc(s.w)}" aria-label="${esc(nm)} weight, ${un.w === "lb each" ? "pounds each" : un.w === "lb assist" ? "pounds of assist" : "pounds"}" ${it.on ? "" : "disabled"}><span aria-hidden="true">${esc(un.w)}</span></label>` : ""}
      <label class="aft-f"><input type="number" inputmode="numeric" step="any" min="0" data-aft="r" data-i="${i}" data-s="${si}" value="${esc(s.r)}" aria-label="${esc(nm)} ${un.r === "sec" ? "seconds" : un.r}" ${it.on ? "" : "disabled"}><span aria-hidden="true">${esc(un.r)}</span></label></div>`;
  }).join("");
}

function draw(focusTitle) {
  const a = state.after; if (!a) return;
  const { week, day } = state.sel;
  const n = a.items.filter(x => x.on).length;
  const cards = a.items.map((it, i) => {
    const def = defOf(it.ex, it.variant);
    const sided = it.sets.some(s => s.side);
    return `<fieldset class="card aft-ex${it.on ? "" : " off"}" data-i="${i}">
      <legend class="aft-legend"><label class="check"><input type="checkbox" data-aft="on" data-i="${i}" ${it.on ? "checked" : ""}><span><b>${esc(def.name)}</b></span></label></legend>
      ${it.on ? `${setRows(it, i)}
      <div class="row"><button type="button" class="btn small" data-act="aftAdd" data-i="${i}" aria-label="Add a set to ${esc(def.name)}">+ Set</button>
        <button type="button" class="btn small" data-act="aftDel" data-i="${i}" aria-label="Remove the last set of ${esc(def.name)}" ${it.sets.length > (sided ? 2 : 1) ? "" : "disabled"}>− Set</button></div>`
        : `<p class="small muted">Skipped. Tick it if you did it.</p>`}
    </fieldset>`;
  }).join("");
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="aft-t"><div class="inner">
    <div class="between"><h2 class="h2" id="aft-t" tabindex="-1">Log it after</h2><button type="button" class="btn small" data-act="closeOverlay">Cancel</button></div>
    <p class="small"><b>Week ${esc(week)} ${esc(dayName(day))}: ${esc(dayTitle(a.u, week, day))}</b>${a.date !== TODAY() ? ` · ${S.fmtDate(a.date)}` : ""}</p>
    <p class="small muted">Each exercise starts with what you did last time. Change anything that was different, untick what you skipped, then save once.</p>
    ${cards}
    <section class="card"><label class="field">About how long did it take? (optional)<span class="aft-min"><input type="number" inputmode="numeric" min="0" max="300" step="1" data-aft="min" value="${esc(a.minutes)}" aria-label="About how long the workout took, in minutes"><span aria-hidden="true">min</span></span></label>
      <p class="small muted">Leave it empty if you're not sure. It's only used for your time-in-the-gym numbers.</p></section>
    <button type="button" class="btn primary block" data-act="aftSave" id="aft-save">Save workout (${n} ${n === 1 ? "exercise" : "exercises"})</button>
  </div></div>`;
  if (focusTitle) $("#aft-t")?.focus({ preventScroll: true });
}
const saveLabel = () => { const n = state.after.items.filter(x => x.on).length; const b = $("#aft-save"); if (b) b.textContent = `Save workout (${n} ${n === 1 ? "exercise" : "exercises"})`; };

// ---------------------------------------------------------------- events (called from app.js)
export function onAfterClick(act, el) {
  const a = state.after;
  switch (act) {
    case "aftOpen": openAfter(); return true;
    case "aftAdd": case "aftDel": {
      if (!a) return true; const it = a.items[+el.dataset.i]; const sided = it.sets.some(s => s.side);
      if (act === "aftAdd") { const last = it.sets.slice(sided ? -2 : -1); it.sets.push(...(last.length ? last : [{ w: 0, r: 0, d: 2 }]).map(s => ({ ...s }))); }
      else if (it.sets.length > (sided ? 2 : 1)) it.sets.splice(sided ? -2 : -1);
      draw(); $(`[data-act="${act}"][data-i="${el.dataset.i}"]`)?.focus({ preventScroll: true });
      A.announce(`${it.sets.filter(s => s.side !== "R").length} sets`); return true;
    }
    case "aftSave": {
      if (!a) return true;
      // Point at the first box that needs filling in.
      for (const [i, it] of a.items.entries()) {
        if (!it.on) continue;
        const def = defOf(it.ex, it.variant), needW = def.kind === "load" || def.kind === "carry";
        const bad = it.sets.findIndex(x => (+x.r > 0 || +x.w > 0) && needW && !(+x.w > 0));
        const none = !it.sets.some(x => +x.r > 0 || +x.w > 0);
        if (bad >= 0 || none) {
          const msg = none ? `${def.name}: fill in at least one set, or untick it if you skipped it.` : `${def.name}: set ${it.sets[bad].side ? Math.floor(bad / 2) + 1 : bad + 1} needs a weight.`;
          toast(msg); A.announce(msg, true);
          const inp = $(`[data-aft="${none ? "r" : "w"}"][data-i="${i}"][data-s="${none ? 0 : bad}"]`);
          if (inp) { const box = inp.closest(".overlay"); if (box) box.scrollTop += inp.getBoundingClientRect().top - box.clientHeight / 2; inp.focus({ preventScroll: true }); inp.select?.(); }
          return true;
        }
      }
      const err = logAfter(a.u, a.date, a.items, a.minutes);
      if (err) { toast(err); A.announce(err, true); return true; }
      state.after = null; return true;
    }
  }
  return false;
}
export function onAfterInput(el) {
  const f = el.dataset?.aft, a = state.after; if (!f || !a) return false;
  if (f === "min") { a.minutes = el.value; return true; }
  const it = a.items[+el.dataset.i]; if (!it) return true;
  if (f === "on") { it.on = el.checked; draw(); $(`[data-aft="on"][data-i="${el.dataset.i}"]`)?.focus({ preventScroll: true }); saveLabel(); return true; }
  const si = +el.dataset.s, s = it.sets[si]; if (!s) return true;
  s[f] = el.value; s[`t${f}`] = true;
  // Fill down: the sets below take the same number until they're changed themselves.
  for (let j = si + 1; j < it.sets.length; j++) {
    if (it.sets[j][`t${f}`]) continue;
    it.sets[j][f] = el.value;
    const inp = $(`[data-aft="${f}"][data-i="${el.dataset.i}"][data-s="${j}"]`); if (inp) inp.value = el.value;
  }
  return true;
}
