// Builds each person's weekly plan from their questionnaire: how many days a week (1–7), how they like
// the week laid out (full body or split), session length, and focus areas. Week A and Week B stay two
// different weeks. Also builds the at-home workout from the gear they have at home.
// Pure: no DOM, no storage. Plans are recomputed from the profile, so retaking the questionnaire updates them.
import { PLAN, DAYS } from "./plan.js";
import { BUILTIN } from "./library.js";
import { fitCost, patternOf, muscleOf } from "./tailor.js";
import { ALL_EX } from "./plan.js";

export const STYLES = {
  auto: ["Let us decide", "We'll pick the best layout for how many days you train"],
  full: ["Full body every time", "Every workout hits your whole body"],
  split: ["Split by body part", "Each day focuses on certain muscles"]
};
export const HOME_GEAR = { dumbbells: "Dumbbells", barbell: "Barbell and plates", bench: "A weight bench", band: "Resistance bands", mat: "A mat or some open floor" };
const CAP = { 30: 4, 45: 5, 60: 6, 90: 8 };
const cap = prof => CAP[prof.sessionLen] || 6;

const ids = (w, d) => PLAN[w][d].ex.map(e => e.id);
const pools = w => ({ push: ids(w, "Mon"), pull: ids(w, "Tue"), legs: ids(w, "Wed"), core: ids(w, "Thu") });
const other = w => (w === "A" ? "B" : "A");
const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
const uniq = a => [...new Set(a)];
// Extra attention: which pool serves each focus area.
const FOCUS_POOL = { chest: "push", shoulders: "push", arms: "pull", back: "pull", core: "core", glutes: "legs", legs: "legs", calves: "core", full: "legs" };

// Whether this person gets a built plan (otherwise: the original four days, Monday–Thursday keys).
export function usesProgram(prof) {
  if (!prof?.onboardedAt) return false;
  const n = +prof.daysPerWeek || 4;
  return !(n === 4 && (prof.planStyle || "auto") !== "full");
}
export function styleFor(prof) {
  const n = +prof.daysPerWeek || 4, s = prof.planStyle || "auto";
  if (n === 1) return "full";
  if (s !== "auto") return s;
  return n <= 3 ? "full" : "split";
}

function fullBody(w, i, prof) {
  const P = pools(w), focus = (prof.focus || []).map(f => FOCUS_POOL[f]).filter(Boolean);
  const order = [pick(P.legs, i), pick(P.push, i), pick(P.pull, i), pick(P.core, i), pick(P.legs, i + 3), i % 2 ? pick(P.pull, i + 2) : pick(P.push, i + 2), pick(P.core, i + 3), pick(P.legs, i + 5)];
  const extra = focus.map((k, j) => pick(P[k], i + 1 + j));
  const list = uniq([...order.slice(0, 4), ...extra, ...order.slice(4)]);
  return { title: "Full body", ex: list.slice(0, cap(prof)) };
}
const day = (title, list, prof) => ({ title, ex: uniq(list).slice(0, cap(prof)) });

function splitWeek(w, n, prof) {
  const P = pools(w), O = pools(other(w));
  if (n === 2) return [day("Upper body", [P.push[0], P.pull[0], P.push[2], P.pull[1], P.push[1], P.pull[2], P.push[4], P.pull[5]], prof),
    day("Lower body, Core", [P.legs[0], P.legs[2], P.core[0], P.legs[1], P.core[1], P.legs[3], P.core[2], P.legs[4]], prof)];
  if (n === 3) return [day(PLAN[w].Mon.title, P.push, prof), day(PLAN[w].Tue.title, P.pull, prof), day("Legs, Glutes, Core", [P.legs[0], P.legs[1], P.legs[2], P.core[0], P.legs[3], P.core[1], P.legs[4], P.core[2]], prof)];
  const four = DAYS.map(d => day(PLAN[w][d].title, ids(w, d), prof));
  if (n === 4) return four;
  if (n === 5) return [...four, fullBody(w, 2, prof)];
  const six = [day(PLAN[w].Mon.title, P.push, prof), day(PLAN[w].Tue.title, P.pull, prof), day("Legs, Glutes, Core", [...P.legs.slice(0, 4), P.core[0], P.core[1]], prof),
    day(PLAN[w].Mon.title, O.push, prof), day(PLAN[w].Tue.title, O.pull, prof), day("Legs, Glutes, Core", [...O.legs.slice(0, 4), O.core[0], O.core[1]], prof)];
  if (n === 6) return six;
  return [...six, day("Light, Core, Mobility", [P.core[0], P.core[1], O.core[0], P.core[2]], { ...prof, sessionLen: 30 })];
}

// The week's days for one week: [{ key: "D1", title, ex: [exercise ids] }]. null = the original plan.
export function buildWeek(prof, w) {
  if (!usesProgram(prof)) return null;
  const n = Math.min(7, Math.max(1, +prof.daysPerWeek || 4));
  const days = styleFor(prof) === "full" ? Array.from({ length: n }, (_, i) => fullBody(w, i, prof)) : splitWeek(w, n, prof);
  return days.map((d, i) => ({ key: `D${i + 1}`, ...d }));
}

// ---------------------------------------------------------------- home workouts
// Slots in order of importance; each takes the best-fitting move not used yet.
const SLOTS = [
  m => ["squat", "lunge"].includes(m.pattern) && m.focus.includes("legs"),
  m => m.pattern === "push" && m.focus[0] === "chest",
  m => (m.pattern === "pull" || m.focus[0] === "back"),
  m => m.focus[0] === "core",
  m => m.pattern === "hinge" && m.focus.includes("glutes"),
  m => m.focus[0] === "shoulders" || m.focus[0] === "arms",
  m => m.focus[0] === "core",
  m => m.pattern === "power" || m.focus[0] === "calves"
];
export function homeMoves(prof, lib = BUILTIN) {
  const gear = new Set(prof.homeGear || []);
  const benchOk = m => gear.has("bench") || !(m.bench || m.position === "lying" || /bench/i.test(m.how || ""));
  return lib.filter(m => m.equip === "bodyweight" || (m.equip === "band" && gear.has("band")) ||
    (m.equip === "dumbbell" && gear.has("dumbbells") && benchOk(m)) || (m.equip === "barbell" && gear.has("barbell") && benchOk(m)));
}
// Fit score for a home move: lower is better. Prefers the person's own equipment, eases beginners in.
function homeScored(prof, lib) {
  const gear = new Set(prof.homeGear || []), hasKit = ["dumbbells", "band", "barbell"].some(g => gear.has(g));
  return homeMoves(prof, lib).map(m => ({ m, c: fitCost(m, prof) })).filter(x => x.c < 10)
    .map(x => ({ ...x, s: x.c + (hasKit && x.m.equip === "bodyweight" ? 1.5 : 0) + (prof.experience === "new" && x.m.difficulty >= 2 ? 3 : 0) }));
}
const FAMILY = { squat: ["squat", "lunge"], lunge: ["lunge", "squat"], hinge: ["hinge"], push: ["push"], pull: ["pull", "isolation"], core: ["core", "rotation"], rotation: ["rotation", "core"], carry: ["carry", "core"], isolation: ["isolation"] };
// The home version of a gym day: each exercise swapped for the best home move that works the same muscles
// (same main muscle, same kind of movement when possible). Keeps the day's focus; same length or close.
export function homeVersion(prof, exList, lib = BUILTIN) {
  const pool = homeScored(prof, lib), used = new Set(), out = [];
  for (const ex of exList) {
    const focus = (ex.lib?.focus || ex.focus || [])[0]; if (!focus) continue;
    const pat = ex.lib?.pattern || (ALL_EX[ex.id] ? patternOf(ALL_EX[ex.id]) : null);
    const fam = FAMILY[pat] || null;
    const mus = muscleOf(ex.n || ex.lib?.name || "");
    const cands = pool.filter(x => !used.has(x.m.id) && (x.m.focus || []).includes(focus))
      .map(x => ({ ...x, t: x.s + (fam && !fam.includes(x.m.pattern) ? 4 : 0) + ((x.m.focus || [])[0] === focus ? 0 : 1) + (mus && muscleOf(x.m.name) !== mus ? 4 : 0) }))
      .sort((a, b) => a.t - b.t || a.m.id.localeCompare(b.m.id));
    if (cands.length) { used.add(cands[0].m.id); out.push(`lib-${cands[0].m.id}`); }
  }
  return out;
}

// ---------------------------------------------------------------- bonus days
export const BONUS_FOCUS = {
  full: ["Full body", ["legs", "glutes", "chest", "back", "core", "shoulders"]],
  upper: ["Upper body", ["chest", "back", "shoulders", "arms"]],
  lower: ["Lower body", ["legs", "glutes", "calves"]],
  core: ["Core", ["core"]],
  chest: ["Chest", ["chest"]], back: ["Back", ["back"]], shoulders: ["Shoulders", ["shoulders"]], arms: ["Arms", ["arms"]],
  glutes: ["Glutes", ["glutes"]], legs: ["Legs", ["legs"]]
};
const RELATED = { arms: ["chest", "back"], shoulders: ["chest", "back"], chest: ["shoulders"], back: ["shoulders"], calves: ["legs"] };
// A bonus workout for the chosen focus, at the gym (plan exercises) or at home (their home gear).
export function buildBonus(prof, focus, where, week = "A", lib = BUILTIN) {
  const [title, areas] = BONUS_FOCUS[focus] || BONUS_FOCUS.full;
  const n = Math.max(3, Math.min(cap(prof), 6));
  const out = [];
  if (where === "home") {
    const pool = homeScored(prof, lib).sort((a, b) => a.s - b.s || a.m.id.localeCompare(b.m.id));
    const fill = list => { for (let round = 0; out.length < n && round < 4; round++) for (const a of list) {
      if (out.length >= n) break;
      const hit = pool.find(x => (x.m.focus || [])[0] === a && !out.includes(`lib-${x.m.id}`)) || pool.find(x => (x.m.focus || []).includes(a) && !out.includes(`lib-${x.m.id}`));
      if (hit) out.push(`lib-${hit.m.id}`);
    } };
    fill(areas);
    // Little home gear for this area (say, arms with no weights): round it out with moves that also work it.
    if (out.length < 3) fill(RELATED[focus] || []);
  } else {
    const order = [week, week === "A" ? "B" : "A"].flatMap(w => DAYS.flatMap(d => PLAN[w][d].ex));
    for (let round = 0; out.length < n && round < 6; round++) for (const a of areas) {
      if (out.length >= n) break;
      const hit = order.filter(e => e.focus[0] === a && !out.includes(e.id))[round % 2] || order.find(e => e.focus.includes(a) && !out.includes(e.id));
      if (hit) out.push(hit.id);
    }
  }
  return { title: `Bonus: ${title}`, ex: [...new Set(out)] };
}

export function buildHome(prof, w, lib = BUILTIN) {
  const moves = homeScored(prof, lib);
  const used = new Set(), out = [];
  const n = Math.max(4, Math.min(cap(prof), 7));
  for (const slot of SLOTS) {
    if (out.length >= n) break;
    const opts = moves.filter(x => slot(x.m) && !used.has(x.m.id)).sort((a, b) => a.s - b.s || a.m.id.localeCompare(b.m.id));
    if (!opts.length) continue;
    const choice = w === "B" && opts[1] && opts[1].s <= opts[0].s + 1.5 ? opts[1] : opts[0];
    used.add(choice.m.id); out.push(`lib-${choice.m.id}`);
  }
  return { key: "Home", title: "Home workout", ex: out };
}
