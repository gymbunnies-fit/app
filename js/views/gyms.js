// My Gyms (Settings): each person's gyms and the crew's shared gyms, a gym's equipment, and its details.
// Personal gyms are saved to the person's own account record; shared gyms live in the crew's data.
import { $, allGyms, crewGyms, esc, gymById, newGymId, saveMyGyms, state, toast, updateGym, render } from "../app.js";
import * as Q from "../equipment.js";
import * as A from "../a11y.js";
import { save, remove } from "../firebase.js";
import { openSettings } from "./settings.js";

const isMine = g => g && (!g.crew || g.owner === state.auth.user?.uid);
const where = g => (g.crew ? "Shared with the crew" : "Only you");

// ---------------------------------------------------------------- the card in Settings
export function myGymsCard() {
  const gyms = allGyms(), def = state.defaultGym || gyms[0]?.id;
  const rows = gyms.map(g => `<li class="gym-row">
      <div><b>${esc(g.name)}</b>${g.id === def ? ` <span class="tag new">Default</span>` : ""}
        <div class="small muted">${esc(where(g))} · ${(g.items || []).length} pieces of equipment</div></div>
      <button type="button" class="btn small" data-act="gymEdit" data-id="${esc(g.id)}" aria-label="Edit ${esc(g.name)}">Edit</button></li>`).join("");
  return `<section class="card" id="my-gyms" aria-labelledby="mg-h"><h3 class="h3" id="mg-h" tabindex="-1">My Gyms</h3>
    <p class="small muted">The app only suggests exercises your gym can do, and steps weights by its real increments. Pick today's gym at the top of the Workout tab.</p>
    ${gyms.length ? `<ul class="gym-list">${rows}</ul>` : `<p class="small">No gym set up yet. Until you add one, the app assumes a typical big gym.</p>`}
    <button type="button" class="btn" data-act="gymAdd">+ Add a gym</button>
  </section>`;
}

// ---------------------------------------------------------------- add a gym
function drawAdd() {
  const gyms = allGyms();
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ga-h"><div class="inner">
    <div class="between"><h2 class="h2" id="ga-h" tabindex="-1">Add a gym</h2><button class="btn small" data-act="gymBack">Back</button></div>
    <section class="card"><label class="field">Name<input type="text" id="ga-name" placeholder="Gym near work" maxlength="60" autocomplete="off"></label>
      <p class="small muted">Then pick a starting point. You can add or remove any equipment after.</p></section>
    <section class="card" aria-labelledby="ga-p"><h3 class="h3" id="ga-p">Start from</h3><div class="gym-presets">
      ${Object.entries(Q.PRESETS).map(([k, p]) => `<button type="button" class="gym-preset" data-act="gymCreate" data-preset="${k}"><b>${esc(p.name)}</b><span class="small muted">${esc(p.note)}</span></button>`).join("")}
    </div></section>
    ${gyms.length ? `<section class="card" aria-labelledby="ga-c"><h3 class="h3" id="ga-c">Or copy one of your gyms</h3><div class="gym-presets">
      ${gyms.map(g => `<button type="button" class="gym-preset" data-act="gymCreate" data-copy="${esc(g.id)}"><b>${esc(g.name)}</b><span class="small muted">${(g.items || []).length} pieces of equipment</span></button>`).join("")}
    </div></section>` : ""}
  </div></div>`;
  $("#ga-h")?.focus();
}
function createGym(el) {
  const name = ($("#ga-name")?.value || "").trim();
  const from = el.dataset.copy ? gymById(el.dataset.copy) : null;
  const g = Q.newGym(newGymId(), name, el.dataset.preset, from);
  state.myGyms = [...state.myGyms, g];
  if (!state.defaultGym && !crewGyms().length) state.defaultGym = g.id;
  saveMyGyms();
  toast(`${g.name} added. Check the equipment matches yours.`);
  openGymEditor(g.id);
}

// ---------------------------------------------------------------- edit a gym
export function openGymEditor(id) { state.overlay = "gym"; state.gymEdit = id; state.gymQ = ""; drawEditor(true); }
function drawEditor(focusTitle) {
  const g = gymById(state.gymEdit); if (!g) { openSettings(); return; }
  const have = new Set(g.items || []), d = Q.gymDetails(g), mine = isMine(g);
  const num = (k, label, step = "any") => `<label class="field">${label}<input type="number" inputmode="decimal" min="0" step="${step}" data-gymd="${k}" value="${esc(d[k] ?? "")}"></label>`;
  const stepSel = (k, label) => `<label class="field">${label}<select data-gymd="${k}">${[1, 2.5, 5, 10].map(v => `<option value="${v}" ${+d[k] === v ? "selected" : ""}>${v} lb</option>`).join("")}</select></label>`;
  const groups = Q.EQUIP_CATS.map(([cat, label]) => {
    const items = Q.EQUIPMENT.filter(e => e.cat === cat); const n = items.filter(e => have.has(e.id)).length;
    return `<details class="gym-cat" data-cat="${cat}"><summary><span>${esc(label)}</span><span class="small muted" data-count="${cat}">${n} of ${items.length}</span></summary>
      <div class="gym-items">${items.map(e => `<label class="check gym-item" data-hay="${esc(`${e.n} ${e.aka}`.toLowerCase())}"><input type="checkbox" data-act="gymItem" data-id="${e.id}" ${have.has(e.id) ? "checked" : ""}><span>${esc(e.n)}</span></label>`).join("")}</div></details>`;
  }).join("");
  const isDef = (state.defaultGym || allGyms()[0]?.id) === g.id;
  const confirm = state.confirmDel === `gym:${g.id}`;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ge-h"><div class="inner">
    <div class="between"><h2 class="h2" id="ge-h" tabindex="-1">${esc(g.name)}</h2><button class="btn small" data-act="gymBack">Done</button></div>
    <section class="card">
      <label class="field">Name<input type="text" data-act="gymName" value="${esc(g.name)}" maxlength="60"></label>
      <p class="small muted">${esc(where(g))}${g.crew && !mine ? ". Anyone in the crew can update its equipment." : "."}</p>
      <div class="row">
        ${isDef ? `<span class="tag new">Your default</span>` : `<button type="button" class="btn small" data-act="gymDefault">Make it my default</button>`}
        ${!g.crew ? `<button type="button" class="btn small" data-act="gymShare">Share with my crew</button>` : mine ? `<button type="button" class="btn small" data-act="gymUnshare">Stop sharing (keep it for me)</button>` : ""}
      </div>
    </section>
    <section class="card" aria-labelledby="ge-eq"><h3 class="h3" id="ge-eq">Equipment</h3>
      <p class="small muted"><span id="ge-count">${have.size}</span> pieces checked. Check everything this gym has.</p>
      <label class="field">Search<input type="search" id="ge-q" data-act="gymQ" placeholder="Leg press, cable, kettlebell…" autocomplete="off" value="${esc(state.gymQ)}"></label>
      <p class="small muted" id="ge-none" hidden>Nothing in the catalog matches. Check the spelling, or try another name for it.</p>
      ${groups}
    </section>
    <section class="card" aria-labelledby="ge-d"><h3 class="h3" id="ge-d">Details</h3>
      <div class="grid2">
        ${num("dbMax", "Heaviest dumbbell (lb)", "2.5")}
        ${num("smithBar", "Smith bar weight (lb)")}
        ${stepSel("dbStep", "Dumbbell steps")}
        ${stepSel("machineStep", "Machine steps")}
        ${stepSel("cableStep", "Cable steps")}
      </div>
      <p class="small muted">The + and − buttons on your sets move by these steps.</p>
    </section>
    ${mine ? `<section class="card"><button type="button" class="btn small danger" data-act="gymDelete">${confirm ? `Tap again to delete ${esc(g.name)}` : "Delete this gym"}</button>
      <p class="small muted">Workouts you logged here stay. They just won't be linked to a gym.</p></section>` : ""}
  </div></div>`;
  filterItems();
  if (focusTitle) $("#ge-h")?.focus();
}
// Show only matching equipment while searching; open the groups that have matches.
function filterItems() {
  const q = (state.gymQ || "").toLowerCase().trim(); const words = q.split(/\s+/).filter(Boolean); let any = 0;
  document.querySelectorAll(".gym-cat").forEach(cat => {
    let n = 0;
    cat.querySelectorAll(".gym-item").forEach(l => { const ok = !words.length || words.every(w => l.dataset.hay.includes(w)); l.hidden = !ok; if (ok) n++; });
    cat.hidden = !n; if (words.length) cat.open = n > 0; any += n;
  });
  const none = $("#ge-none"); if (none) none.hidden = any > 0;
}
function countLine(g) {
  const have = new Set(g.items || []);
  const c = $("#ge-count"); if (c) c.textContent = have.size;
  Q.EQUIP_CATS.forEach(([cat]) => { const el = document.querySelector(`[data-count="${cat}"]`); if (el) { const items = Q.EQUIPMENT.filter(e => e.cat === cat); el.textContent = `${items.filter(e => have.has(e.id)).length} of ${items.length}`; } });
}

// ---------------------------------------------------------------- events (called from app.js)
export function onGymClick(act, el) {
  const g = gymById(state.gymEdit);
  switch (act) {
    case "gymAdd": state.overlay = "gym"; drawAdd(); return true;
    case "gymCreate": createGym(el); return true;
    case "gymEdit": openGymEditor(el.dataset.id); return true;
    case "gymBack": state.gymEdit = null; state.confirmDel = null; openSettings(); setTimeout(() => { const h = $("#mg-h"), box = $("#overlay .overlay"); if (h && box) box.scrollTop = Math.max(0, h.closest("section").offsetTop - 12); h?.focus({ preventScroll: true }); }, 60); render(); return true;
    case "gymDefault": state.defaultGym = g.id; saveMyGyms(); toast(`${g.name} is your default gym.`); drawEditor(); return true;
    case "gymShare": {
      const { crew, ...rest } = g; void crew;
      save("gyms", g.id, { ...rest, owner: state.auth.user?.uid || "", sharedAt: Date.now() });
      state.myGyms = state.myGyms.filter(x => x.id !== g.id); saveMyGyms();
      toast(`${g.name} is shared with your crew.`); setTimeout(drawEditor, 300); return true;
    }
    case "gymUnshare": {
      const { crew, owner, sharedAt, ...rest } = g; void crew; void owner; void sharedAt;
      state.myGyms = [...state.myGyms, { ...rest }]; saveMyGyms(); remove("gyms", g.id);
      toast(`${g.name} is only yours now.`); setTimeout(drawEditor, 300); return true;
    }
    case "gymDelete": {
      if (state.confirmDel !== `gym:${g.id}`) { state.confirmDel = `gym:${g.id}`; drawEditor(); $("[data-act=gymDelete]")?.focus(); return true; }
      state.confirmDel = null;
      if (g.crew) remove("gyms", g.id); else state.myGyms = state.myGyms.filter(x => x.id !== g.id);
      if (state.defaultGym === g.id) state.defaultGym = null;
      saveMyGyms(); toast(`${g.name} deleted.`); state.gymEdit = null; openSettings(); render(); return true;
    }
  }
  return false;
}
export function onGymChange(el) {
  const g = gymById(state.gymEdit); if (!g) return false;
  if (el.dataset.act === "gymItem") {
    const have = new Set(g.items || []); if (el.checked) have.add(el.dataset.id); else have.delete(el.dataset.id);
    updateGym(g.id, { items: [...have] }); countLine({ items: [...have] });
    A.announce(`${Q.EQUIP_BY_ID[el.dataset.id]?.n || "Item"} ${el.checked ? "added" : "removed"}`); render(); return true;
  }
  if (el.dataset.act === "gymName") { const n = el.value.trim(); if (n) { updateGym(g.id, { name: n }); $("#ge-h").textContent = n; render(); } return true; }
  if (el.dataset.gymd) {
    const k = el.dataset.gymd, v = el.value === "" ? "" : +el.value;
    updateGym(g.id, { details: { ...Q.gymDetails(g), [k]: v } }); return true;
  }
  return false;
}
export function onGymInput(el) {
  if (el.dataset.act !== "gymQ") return false;
  state.gymQ = el.value; filterItems(); return true;
}
