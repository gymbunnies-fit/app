// Tailors the plan to one person from their onboarding answers.
// For every plan exercise it weighs the plan version, the alternative, the harder version, and library
// exercises for the same muscles, and picks the one that best fits their injuries, limits, and experience.
// Pure: no DOM, no storage. The result is saved on the profile as `tailor` ({ exId: { v, why } }).
import { ALL_EX, PAIN_AREAS } from "./plan.js";
import { BUILTIN, PLAN_MACHINES } from "./library.js";
import { safetyFor } from "./safety.js";

export const GOALS = {
  fat: "Lose body fat", muscle: "Build muscle", strength: "Get stronger", endurance: "Better cardio and stamina",
  tone: "Tone up", pain: "Move without pain", energy: "More energy, feel better", sport: "Train for a sport or event"
};
export const EXPERIENCE = {
  new: ["Brand new", "Never really trained, or it's been years"],
  some: ["Some experience", "On and off, less than a year"],
  regular: ["Regular", "Training steadily for 1–3 years"],
  veteran: ["Veteran", "3+ years, comfortable with most lifts"]
};
export const LIMITS = {
  noFloor: "Getting down on the floor is hard",
  noImpact: "No jumping or high impact",
  noOverhead: "Pressing or reaching overhead hurts",
  noSpine: "Avoid heavy loads on my back",
  grip: "Weak or painful grip",
  balance: "Balance is shaky"
};
export const SESSION_LEN = { 30: "About 30 min", 45: "About 45 min", 60: "About an hour", 90: "As long as it takes" };

const FLOOR = /plank|dead bug|bird dog|floor|lying knee|glute bridge|crunch|sit-up|mountain climber/i;
const IMPACT = /jump|hop|skip|burpee|box jump|bound/i;
const OVERHEAD = /shoulder press|overhead|pull-up|pullup|chin-up|dip\b|military|arnold/i;
const GRIP = /carry|farmer|suitcase|dead hang|hang\b/i;
const BALANCE = /lunge|split squat|single-leg|step-up|bulgarian|walking/i;

const FLOOR_TEXT = /lie flat|lie on your back|on your back|on the floor|on all fours|face ?down on the floor/i;
function facts(c) {
  const name = c.name;
  return {
    joints: c.joints || {},
    floor: c.position ? c.position === "floor" : FLOOR.test(name) || FLOOR_TEXT.test(c.text || ""),
    impact: c.impact != null ? c.impact >= 1 : IMPACT.test(name),
    overhead: OVERHEAD.test(name) || ((c.focus || [])[0] === "shoulders" && c.pattern === "push"),
    grip: GRIP.test(name),
    balance: c.unilateral != null ? (c.unilateral && /standing|lunge|split|step/i.test(name + (c.position || ""))) || BALANCE.test(name) : BALANCE.test(name),
    difficulty: c.difficulty || 0
  };
}

// How badly a candidate fits this person. Lower is better. Reasons explain the biggest costs.
function cost(c, prof) {
  const f = facts(c); let n = 0; const why = [];
  for (const a of prof.injuries || []) {
    const load = f.joints[a] || 0;
    if (load >= 2) { n += 10; why.push(a); } else if (load === 1) { n += 3; why.push(a); }
  }
  const L = new Set(prof.limits || []);
  if (L.has("noFloor") && f.floor) { n += 20; why.push("noFloor"); }
  if (L.has("noImpact") && f.impact) { n += 20; why.push("noImpact"); }
  if (L.has("noOverhead") && f.overhead) { n += 15; why.push("noOverhead"); }
  if (L.has("noSpine") && (f.joints.lowerBack || 0) >= 2) { n += 10; why.push("noSpine"); }
  if (L.has("grip") && f.grip) { n += 10; why.push("grip"); }
  if (L.has("balance") && f.balance) { n += 10; why.push("balance"); }
  if (prof.experience === "new" && f.difficulty >= 3) n += 5;
  return { n, why };
}

const AREA_WORD = a => (PAIN_AREAS[a] || a).toLowerCase();
const LIMIT_WHY = { noFloor: "no floor work", noImpact: "no jumping", noOverhead: "nothing overhead", noSpine: "less load on your back", grip: "easier on your grip", balance: "more stable" };
function reason(fixed) {
  const areas = fixed.filter(x => PAIN_AREAS[x]).map(AREA_WORD);
  const lims = fixed.filter(x => LIMIT_WHY[x]).map(x => LIMIT_WHY[x]);
  const parts = [];
  if (areas.length) parts.push(`easier on your ${areas.length > 1 ? areas.slice(0, -1).join(", ") + " and " + areas.at(-1) : areas[0]}`);
  parts.push(...lims);
  const s = parts.join(", ");
  return s ? s[0].toUpperCase() + s.slice(1) : "A better fit for you";
}

// Library exercises that work the same main muscle as the plan exercise, as possible stand-ins.
// The movement pattern of a plan exercise (a squat stays a squat when we swap it, so the day keeps its purpose).
const PATTERN_BY_NAME = [[/squat|leg press/i, "squat"], [/lunge|split|step-up/i, "lunge"], [/deadlift|rdl|hip thrust|bridge|back extension|good morning/i, "hinge"],
  [/carry/i, "carry"], [/rotation|woodchop|pallof/i, "rotation"], [/plank|dead bug|knee raise|crunch|leg raise|hold/i, "core"],
  [/leg curl|leg extension|abduct|adduct|calf|lateral raise|curl|extension|fly|face pull|rear delt|reverse pec|pullover|pushdown/i, "isolation"],
  [/row|pulldown|pull-up|chin/i, "pull"], [/press|push|dip/i, "push"]];
export function patternOf(ex) {
  const fromLib = safetyFor(ex, "swap")?.pattern || safetyFor(ex, "hard")?.pattern;
  if (fromLib) return fromLib;
  const hit = PATTERN_BY_NAME.find(([re]) => re.test(ex.n)); return hit ? hit[1] : null;
}
// For isolation moves, keep the same muscle (a triceps move stays a triceps move).
const MUSCLE = [[/tricep|pushdown|skull|kickback/i, "tri"], [/leg curl|hamstring/i, "ham"], [/leg extension/i, "quad"], [/calf/i, "calf"], [/abduct/i, "abd"], [/adduct/i, "add"],
  [/face pull|rear delt|reverse pec/i, "rear"], [/lateral raise/i, "delt"], [/fly|crossover|pec deck/i, "pec"], [/pullover|straight-arm/i, "lat"], [/curl/i, "bi"]];
const muscleOf = n => (MUSCLE.find(([re]) => re.test(n)) || [])[1] || null;
const FAMILY = { squat: ["squat", "lunge"], lunge: ["lunge", "squat"] };
function libraryFor(ex, lib, pattern) {
  const main = (ex.focus || [])[0]; if (!main) return [];
  const ok = pattern ? FAMILY[pattern] || [pattern] : null;
  const grp = k => (k === "bw" ? "load" : k || "load"); // bodyweight and loaded reps are interchangeable; timed holds and carries aren't
  const mus = pattern === "isolation" ? muscleOf(ex.n) : null;
  return lib.filter(b => b.focus?.[0] === main && b.equip !== "cardio" && b.equip !== "band" && grp(b.kind) === grp(ex.kind) && b.name !== ex.n && (!ok || ok.includes(b.pattern)) && (!mus || muscleOf(b.name) === mus));
}

export function tailorPlan(prof, { lib = BUILTIN, exercises = Object.values(ALL_EX) } = {}) {
  const out = {};
  prof = { ...prof, injuries: [...new Set((prof.injuries || []).map(a => (a === "foot" ? "ankles" : a)))] }; // the library files feet under ankles
  const exp = prof.experience || "some";
  const wantsHarder = exp === "veteran" || (exp === "regular" && prof.intensity === "push");
  // Don't put the same exercise in a day twice ("Dumbbell Lateral Raise" and "Lateral Raise" count as the same).
  const key = n => String(n).toLowerCase().replace(/\b(dumbbell|db|machine|cable|smith|seated|standing|the)\b/g, "").replace(/[^a-z]+/g, " ").trim().replace(/s$/, "");
  const dayNames = {}; for (const ex of exercises) (dayNames[`${ex.week}${ex.day}`] ||= new Set()).add(key(ex.n));
  for (const ex of exercises) {
    const taken = dayNames[`${ex.week}${ex.day}`] || new Set();
    const cands = [];
    const add = (v, c, bias) => { if (c) cands.push({ v, c, bias }); };
    const std = safetyFor(ex, "std");
    add("std", { name: ex.n, text: `${ex.setup || ""} ${ex.how || ""}`, focus: ex.focus, pattern: patternOf(ex), ...(std || {}) }, 0);
    if (ex.swap) add("swap", { name: ex.swap.n, text: ex.swap.how || "", ...(safetyFor(ex, "swap") || {}) }, 1);
    if (ex.h) add("hard", { name: ex.h.n, text: ex.h.how || "", ...(safetyFor(ex, "hard") || {}) }, wantsHarder ? -2 : 4);
    const same = new Set(PLAN_MACHINES[ex.id] || []);
    for (const b of lib) if (taken.has(key(b.name))) same.add(b.id);
    for (const b of libraryFor(ex, lib, patternOf(ex))) if (!same.has(b.id)) add(`lib:${b.id}`, b, 3);
    const score = list => list.map(x => ({ ...x, ...cost(x.c, prof) })).map(x => ({ ...x, total: x.n + x.bias }));
    let scored = score(cands);
    const base = scored[0];
    let best = scored.slice().sort((a, b) => a.total - b.total)[0];
    // Still breaking a hard limit (floor, impact, overhead)? Look wider: any library move for the same muscles.
    if (best.why.some(w => ["noFloor", "noImpact", "noOverhead"].includes(w))) {
      const more = libraryFor(ex, lib, null).filter(b => !same.has(b.id) && !cands.some(c => c.v === `lib:${b.id}`)).map(b => ({ v: `lib:${b.id}`, c: b, bias: 5 }));
      scored = [...scored, ...score(more)];
      best = scored.slice().sort((a, b) => a.total - b.total)[0];
    }
    if (!best || best.v === "std") continue;
    // Only switch away from the plan when it actually avoids a problem, or for experience (harder, no new problems).
    if (best.v === "hard" && base.n - best.n < 3) { if (wantsHarder && best.n <= base.n) out[ex.id] = { v: "hard", why: "Tougher version for your experience" }; continue; }
    if (base.n - best.n >= 3) {
      const bj = facts(base.c).joints, nj = facts(best.c).joints;
      const fixed = [...(prof.injuries || []).filter(a => (nj[a] || 0) < (bj[a] || 0)), ...base.why.filter(w => LIMIT_WHY[w] && !best.why.includes(w))];
      out[ex.id] = { v: best.v, why: reason(fixed) };
      taken.add(key(best.c.name || ""));
    }
  }
  return out;
}

// One-line summary for the end of the questionnaire.
export function tailorSummary(tailor) {
  const list = Object.entries(tailor);
  const gentler = list.filter(([, t]) => t.v !== "hard").length, harder = list.filter(([, t]) => t.v === "hard").length;
  return { gentler, harder, total: list.length };
}

// How badly one library exercise fits a person (0 = no problems). Used to pick home-workout moves.
export function fitCost(item, prof) {
  const p = { ...prof, injuries: [...new Set((prof.injuries || []).map(a => (a === "foot" ? "ankles" : a)))] };
  return cost(item, p).n;
}
