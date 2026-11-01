// The health conditions form: in onboarding (its own step) and in Settings. Everything it collects stays on this
// phone (js/health.js). Its actions all start with "hf", which usage counting skips (views/usage.js).
import { $, esc, listText, render, state, toast } from "../app.js";
import * as H from "../health.js";
import * as C from "../conditions.js";
import * as XS from "../exsearch.js";
import { drawOnboarding } from "./questionnaire.js";
import { openSettings } from "./settings.js";

export const blankHealth = () => ({ conditions: [], answers: {}, symptoms: [], fn: {}, q: "" });
export const healthDraft = rec => ({ ...blankHealth(), ...(rec ? JSON.parse(JSON.stringify(rec)) : {}), q: "" });
const ITEMS = C.CONDITIONS.map(c => ({ id: c.id, name: c.name, tags: c.tags }));
const uid = () => state.auth?.user?.uid || "";

export const PRIVACY_LINE = "Kept only on this phone. It's never sent to GymBunnies.fit, your crew, or anyone else, and it isn't in backups. Using another phone? Add it there too.";

const seg = (k, cur, opts, label) => `<div class="seg hf-seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" role="radio" data-act="hfAns" data-k="${esc(k)}" data-v="${v}" aria-checked="${cur === v}">${esc(l)}</button>`).join("")}</div>`;

export function healthFormHtml(d) {
  const q = d.q.trim();
  const shown = (q ? XS.searchExercises(q, ITEMS, 8).map(r => ({ ...r.item, via: r.via })) : ITEMS).filter(c => !d.conditions.includes(c.id));
  const picked = d.conditions.map(C.conditionById).filter(Boolean);
  const eff = C.effectsOf(d);
  return `<div class="hf">
    <p class="small hf-lock"><span aria-hidden="true">🔒</span> ${esc(PRIVACY_LINE)}</p>
    <label class="field">Search conditions<input type="text" id="hf-q" data-act="hfQ" value="${esc(d.q)}" placeholder="MS, lupus, fibro, arthritis…" autocomplete="off" aria-describedby="hf-count"></label>
    <p id="hf-count" class="small muted" role="status" aria-live="polite">${q ? `${shown.length} match${shown.length === 1 ? "" : "es"}` : ""}</p>
    ${shown.length ? `<div class="pick-list hf-results">${shown.map(c => `<button type="button" class="list-btn" data-act="hfAdd" data-id="${c.id}"><b>${esc(c.name)}</b>${c.via ? `<span class="small muted">Also called ${esc(c.via)}</span>` : ""}</button>`).join("")}</div>`
      : q ? `<p class="small">Not on the list yet. Pick the symptoms that fit you below, and the plan adjusts to those.</p>` : ""}
    ${picked.map(c => `<section class="card hf-cond" aria-labelledby="hf-${c.id}">
      <div class="between"><h3 class="h3" id="hf-${c.id}" tabindex="-1">${esc(c.name)}</h3><button type="button" class="btn small" data-act="hfDel" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">Remove</button></div>
      ${c.followUps.map(f => `<div class="field"><span>${esc(f.q)}</span>${seg(`${c.id}.${f.id}`, d.answers[`${c.id}.${f.id}`] || "", f.options, f.q)}</div>`).join("")}
      ${c.clearance ? `<p class="small hf-note">${esc(c.clearance)}</p>` : ""}
    </section>`).join("")}
    <section class="card"><h3 class="h3">What you can do right now</h3>
      <div class="field"><span>What do you use to get around?</span>${seg("fn.aid", d.fn.aid || "", [["none", "Nothing"], ["cane", "A cane"], ["walker", "A walker"], ["wheelchair", "A wheelchair"]], "What do you use to get around?")}</div>
      <div class="field"><span>Can you get down to the floor and back up?</span>${seg("fn.floor", d.fn.floor || "", [["yes", "Yes"], ["no", "Not easily"]], "Can you get down to the floor and back up?")}</div>
      <div class="field"><span>Does activity make you feel much worse a day or two later, beyond normal soreness?</span>${seg("fn.pem", d.fn.pem || "", [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]], "Does activity make you worse a day or two later?")}</div>
    </section>
    <div class="field"><span>Anything else that changes day to day? (optional)</span><div class="focus-chips" role="group" aria-label="Symptoms">${C.SYMPTOMS.map(s => `<button type="button" data-act="hfSym" data-v="${s}" aria-pressed="${d.symptoms.includes(s)}">${esc(C.SUPPORTS[s])}</button>`).join("")}</div></div>
    ${eff.clearance.length ? `<div class="banner hf-clear"><b>Before you start:</b> ${eff.clearance.map(esc).join(" ")}</div>` : ""}
    ${picked.length || d.symptoms.length ? `<p class="small muted">${esc(summary(eff))}</p>` : ""}
  </div>`;
}
// One plain sentence: what the app will do with these answers.
export function summary(eff) {
  const bits = [];
  if (eff.supports.has("energy")) bits.push("a quick energy check before each workout");
  if (eff.progression === "pace") bits.push("no automatic weight or time increases");
  if (eff.supports.has("heat")) bits.push("tips for staying cool");
  if (eff.supports.has("sun")) bits.push("a reminder to train out of the sun");
  if (eff.limits.size) bits.push("safer versions of some exercises");
  if (eff.seated) bits.push("seated versions of exercises where they exist");
  if (eff.maxSets) bits.push(`up to ${eff.maxSets} sets of each move`);
  if (eff.balance) bits.push("a short balance practice");
  if (eff.supports.has("stretch")) bits.push("a daily stretch reminder");
  if (eff.minutes) bits.push(`a weekly goal of ${eff.minutes} active minutes`);
  return bits.length ? `The app will add ${listText(bits)}.` : "";
}
// "Why this plan": the rules and the sources behind them.
export function whyHtml(eff) {
  if (!eff?.conditions.length) return "";
  return eff.conditions.map(c => `<details class="more"><summary>${esc(c.name)}</summary><div class="panel">
    <p class="small"><b>How the plan moves:</b> ${esc(C.PROGRESSION[c.progression] || "")}</p>
    <ul class="small">${c.plan.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <ul class="small">${c.tips.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <p class="small"><b>Sources:</b> ${c.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join("; ")}.</p>
  </div></details>`).join("") + `<p class="small muted">General guidance from the published guidelines above, not medical advice. Your own doctor or physical therapist knows you best.</p>`;
}

// ---------------------------------------------------------------- the Settings editor
export function openHealthEdit() { state.overlay = "health"; state.hForm = healthDraft(H.load(uid(), state.user)); drawHealthEdit(); }
function drawHealthEdit(keep) {
  const top = $("#overlay .overlay")?.scrollTop || 0;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="hf-title"><div class="inner">
    <div class="between"><h2 class="h2" id="hf-title" tabindex="-1">Health conditions</h2><button class="btn small" data-act="closeOverlay">Cancel</button></div>
    ${healthFormHtml(state.hForm)}
    <div class="ob-nav"><span></span><button class="btn primary" data-act="hfSave">Save on this phone</button></div>
  </div></div>`;
  if (keep) $("#overlay .overlay").scrollTop = top; else $("#hf-title")?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- events
const draft = () => (state.overlay === "onboard" ? state.ob?.a.health : state.overlay === "health" ? state.hForm : null);
function redraw() { if (state.overlay === "onboard") drawOnboarding(true); else drawHealthEdit(true); }
const refocus = sel => setTimeout(() => $(sel)?.focus({ preventScroll: true }), 0);

export function onHealthClick(act, el) {
  if (act === "hfSave") { const rec = { ...state.hForm }; delete rec.q; H.save(uid(), state.user, rec); state.hForm = null; toast("Saved on this phone only."); render(); openSettings(); return true; }
  if (act === "hfRemoveAll") {
    if (state.confirmDel !== "health") { state.confirmDel = "health"; openSettings(); return true; }
    state.confirmDel = null; H.clear(uid(), state.user); toast("Removed from this phone."); render(); openSettings(); return true;
  }
  const d = draft(); if (!d) return false;
  if (act === "hfAdd") { if (!d.conditions.includes(el.dataset.id)) d.conditions.push(el.dataset.id); d.q = ""; redraw(); refocus(`#hf-${el.dataset.id}`); return true; }
  if (act === "hfDel") {
    const id = el.dataset.id; d.conditions = d.conditions.filter(x => x !== id);
    for (const k of Object.keys(d.answers)) if (k.startsWith(`${id}.`)) delete d.answers[k];
    redraw(); refocus("#hf-q"); return true;
  }
  if (act === "hfAns") {
    const k = el.dataset.k, v = el.dataset.v;
    if (k.startsWith("fn.")) d.fn[k.slice(3)] = v; else d.answers[k] = v;
    redraw(); refocus(`[data-act="hfAns"][data-k="${CSS.escape(k)}"][data-v="${v}"]`); return true;
  }
  if (act === "hfSym") { const v = el.dataset.v; d.symptoms = d.symptoms.includes(v) ? d.symptoms.filter(x => x !== v) : [...d.symptoms, v]; redraw(); refocus(`[data-act="hfSym"][data-v="${v}"]`); return true; }
  return false;
}
export function onHealthInput(el) {
  if (el.dataset.act !== "hfQ") return false;
  const d = draft(); if (!d) return false;
  d.q = el.value; const pos = el.selectionStart; redraw();
  const q = $("#hf-q"); if (q) { q.focus({ preventScroll: true }); q.setSelectionRange(pos, pos); }
  return true;
}
