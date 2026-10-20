// Muscles for the body map, and which ones each exercise works. Pure: no DOM, testable in Node.
// An exercise is matched by its name, so library machines and hand-added moves work too.
import { setCount, userSessions } from "./stats.js";

export const MUSCLES = {
  chest:      { n: "Chest", about: "The pecs, across the front of the ribcage. They push your arms forward and across your body." },
  frontDelts: { n: "Front shoulders", about: "The front of the deltoid. Lifts your arm forward and overhead, and helps every press." },
  sideDelts:  { n: "Side shoulders", about: "The outer deltoid. Lifts your arm out to the side and gives the shoulders their width." },
  rearDelts:  { n: "Rear shoulders", about: "The back of the deltoid. Pulls your arm back and keeps the shoulders from rounding forward." },
  traps:      { n: "Traps", about: "The kite-shaped muscle from your neck to mid-back. Shrugs, steadies and pulls the shoulder blades." },
  upperBack:  { n: "Upper back", about: "The muscles on and between your shoulder blades. They squeeze the blades together in rows and hold your posture." },
  lats:       { n: "Lats", about: "The big wing-shaped muscles down your sides. They pull your arms down and back, and give the back its V." },
  lowerBack:  { n: "Lower back", about: "The two columns of muscle beside your spine. They keep you upright and protect the spine when you bend." },
  biceps:     { n: "Biceps", about: "The front of the upper arm, from shoulder to elbow. Bends the elbow and turns the palm up." },
  triceps:    { n: "Triceps", about: "The back of the upper arm. Straightens the elbow, and makes up about two-thirds of upper-arm size." },
  forearms:   { n: "Forearms", about: "Between elbow and wrist. Grip, wrist strength, and steady hands under heavy weights." },
  abs:        { n: "Abs", about: "Down the front of the belly. They curl the spine and brace your middle." },
  obliques:   { n: "Obliques", about: "Along the sides of your waist. They twist and side-bend, and stop you tipping when you carry weight." },
  glutes:     { n: "Glutes", about: "The main muscle of the butt. Drives your hips forward when you stand, climb and thrust." },
  outerHips:  { n: "Outer hips", about: "The glute medius, on the upper outer hip. Keeps your knees and pelvis steady and shapes the side of the hip." },
  adductors:  { n: "Inner thighs", about: "The adductors. They pull your legs together and steady the knee in squats and lunges." },
  quads:      { n: "Quads", about: "The front of the thigh. They straighten the knee in squats, leg press, lunges and stairs." },
  hamstrings: { n: "Hamstrings", about: "The back of the thigh. They bend the knee and help the glutes straighten the hip." },
  calves:     { n: "Calves", about: "The back of the lower leg. They raise you onto your toes and push off when you walk." }
};

// Groups for the "Groups" colouring. Colours differ in lightness as well as hue.
export const GROUPS = [
  ["Chest", "#e5605f", ["chest"]],
  ["Shoulders", "#f2a24a", ["frontDelts", "sideDelts", "rearDelts"]],
  ["Back", "#2f9e93", ["traps", "upperBack", "lats", "lowerBack"]],
  ["Arms", "#5f84e6", ["biceps", "triceps", "forearms"]],
  ["Core", "#e8cc45", ["abs", "obliques"]],
  ["Hips", "#a874d9", ["glutes", "outerHips"]],
  ["Legs", "#6dbb5b", ["adductors", "quads", "hamstrings", "calves"]]
];
export const groupOf = id => GROUPS.find(g => g[2].includes(id));

const R = (re, main, ...also) => ({ re, main, also });
// First match wins, so the more specific names come first.
const RULES = [
  R(/leg curl/i, "hamstrings"),
  R(/leg extension|wall sit/i, "quads"),
  R(/calf|jump rope/i, "calves"),
  R(/abductor|abduction|clamshell|fire hydrant/i, "outerHips", "glutes"),
  R(/adductor|adduction/i, "adductors"),
  R(/hip thrust|glute bridge|kickback/i, "glutes", "hamstrings"),
  R(/romanian|rdl|good morning/i, "hamstrings", "glutes", "lowerBack"),
  R(/deadlift/i, "glutes", "hamstrings", "quads", "lowerBack", "adductors", "forearms"),
  R(/split squat|bulgarian|lunge|step-up/i, "quads", "glutes", "adductors"),
  R(/squat|leg press/i, "quads", "glutes", "adductors"),
  R(/back extension|lower back|superman/i, "lowerBack", "glutes", "hamstrings"),
  R(/sit-up|crunch|knee raise|leg raise|v-up|dead bug|plank|hollow|ab /i, "abs", "obliques"),
  R(/pallof|woodchop|rotation|russian twist|side bend/i, "obliques", "abs"),
  R(/suitcase/i, "obliques", "forearms", "traps", "abs"),
  R(/farmer|carry/i, "forearms", "traps", "abs", "obliques"),
  R(/shrug/i, "traps"),
  R(/curl/i, "biceps", "forearms"),
  R(/pushdown|tricep|skull/i, "triceps"),
  R(/dip/i, "triceps", "chest", "frontDelts"),
  R(/lateral raise/i, "sideDelts", "traps"),
  R(/front raise/i, "frontDelts"),
  R(/reverse pec|rear delt|face pull/i, "rearDelts", "upperBack", "traps"),
  R(/straight-arm|pullover/i, "lats"),
  R(/pulldown|pull-up|chin-up/i, "lats", "biceps", "upperBack", "rearDelts"),
  R(/row/i, "upperBack", "lats", "rearDelts", "biceps", "forearms"),
  R(/shoulder press|overhead press|arnold|military/i, "frontDelts", "sideDelts", "triceps", "traps"),
  R(/fly|crossover|pec deck/i, "chest", "frontDelts"),
  R(/push-up|chest press|bench press|incline|decline/i, "chest", "frontDelts", "triceps")
];
// When a name doesn't match, fall back to the exercise's focus area.
const FOCUS_MUSCLE = { chest: "chest", shoulders: "sideDelts", arms: "biceps", back: "lats", core: "abs", glutes: "glutes", legs: "quads", calves: "calves" };
export function musclesOf(name, focus = []) {
  const r = RULES.find(x => x.re.test(String(name || "")));
  if (r) return { main: r.main, also: r.also };
  const m = (focus || []).map(f => FOCUS_MUSCLE[f]).filter(Boolean);
  return m.length ? { main: m[0], also: [...new Set(m.slice(1))].filter(x => x !== m[0]) } : null;
}

// Sets per muscle: aimed at it (main) and helping (also), planned for the cycle and logged so far.
// planned: [{ name, focus, sets }]. Left/right pairs count as one set.
export function muscleReport(planned, sessions, user, from, to) {
  const out = Object.fromEntries(Object.keys(MUSCLES).map(k => [k, { planMain: 0, planAlso: 0, didMain: 0, didAlso: 0, planned: [], logged: [] }]));
  const add = (list, n) => { if (!list.includes(n)) list.push(n); };
  for (const p of planned) {
    const m = musclesOf(p.name, p.focus); if (!m) continue;
    out[m.main].planMain += p.sets; add(out[m.main].planned, p.name);
    for (const a of m.also) out[a].planAlso += p.sets;
  }
  for (const s of userSessions(sessions, user)) {
    if ((from && s.date < from) || (to && s.date > to)) continue;
    for (const e of s.exercises || []) {
      if (e.skipped || !e.sets?.length) continue;
      const m = musclesOf(e.name, e.focus); if (!m) continue;
      const n = setCount(e.sets);
      out[m.main].didMain += n; add(out[m.main].logged, e.name);
      for (const a of m.also) out[a].didAlso += n;
    }
  }
  return out;
}
// One number per muscle for colouring: helping sets count as half.
export const effort = x => x.didMain + x.didAlso / 2;
export const level = e => (e <= 0 ? 0 : e < 4 ? 1 : e < 8 ? 2 : 3);

// Body shape: separate choices, described by how they look. Stored on the person's own account only.
export const SHAPE = [
  ["chest", "Chest", [["Flat", 0], ["Some", 9], ["Fuller", 15]]],
  ["shoulders", "Shoulders", [["Narrower", 36], ["Middle", 40], ["Broader", 45]]],
  ["waist", "Waist", [["Narrower", 24], ["Middle", 28], ["Fuller", 35]]],
  ["hips", "Hips", [["Narrower", 31], ["Middle", 35], ["Wider", 41]]],
  ["build", "Build", [["Leaner", 0.9], ["Middle", 1], ["Larger", 1.16]]]
];
export const DEFAULT_SHAPE = { chest: 0, shoulders: 40, waist: 28, hips: 35, build: 1 };
// Keep only known values, so a bad stored value can't break the drawing.
export function cleanShape(s) {
  const out = { ...DEFAULT_SHAPE };
  for (const [key, , opts] of SHAPE) if (s && opts.some(o => o[1] === s[key])) out[key] = s[key];
  return out;
}
