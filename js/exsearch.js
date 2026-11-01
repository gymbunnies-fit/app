// Exercise search: suggestions as you type, other names ("tags") for the same move, and details filled in
// for a brand-new exercise. Pure: no DOM, testable in Node.
import { muscleMatch, focusFromName } from "./muscles.js";

// Other names people use for the built-in library moves. Someone typing one of these lands on the built-in.
// Names people add themselves are saved on the library entry as `tags`.
export const ALIASES = {
  "db-bench-press": ["DB bench", "dumbbell chest press", "flat dumbbell press"],
  "db-incline-press": ["incline DB press", "incline dumbbell bench press", "incline chest press dumbbell"],
  "db-fly": ["dumbbell flye", "chest fly dumbbell", "flat fly"],
  "db-squeeze-press": ["crush press", "hex press"],
  "db-seated-press": ["seated DB shoulder press", "seated military press dumbbell"],
  "db-standing-press": ["standing shoulder press", "dumbbell military press", "DB overhead press", "dumbbell OHP"],
  "db-lateral-raise": ["side raise", "side lateral raise", "dumbbell lateral raise", "lat raise", "shoulder raise"],
  "db-front-raise": ["dumbbell front raise", "front delt raise"],
  "db-rear-delt-raise": ["rear delt fly", "reverse fly", "bent-over reverse fly", "rear lateral raise"],
  "db-shrug": ["shoulder shrug", "trap shrug"],
  "db-curl": ["bicep curl", "biceps curl dumbbell", "DB curl", "arm curl dumbbell"],
  "db-hammer-curl": ["neutral grip curl", "DB hammer curl"],
  "db-incline-curl": ["incline bicep curl", "incline curl"],
  "db-concentration-curl": ["seated concentration curl"],
  "db-oh-tri-ext": ["overhead tricep extension", "french press", "dumbbell tricep extension", "overhead extension"],
  "db-skull-crusher": ["skullcrusher", "lying tricep extension", "lying triceps extension"],
  "db-close-press": ["close grip press", "dumbbell tricep press", "neutral grip bench press"],
  "db-kickback": ["tricep kickback", "dumbbell kickback"],
  "db-one-arm-row": ["single arm row", "one arm row", "single arm dumbbell row", "DB row", "dumbbell row"],
  "db-chest-supported-row": ["incline row", "seal row dumbbell", "chest supported row"],
  "db-bent-row": ["bent over row dumbbell", "two arm dumbbell row"],
  "db-renegade-row": ["plank row"],
  "db-goblet-squat": ["goblet", "dumbbell front squat"],
  "db-goblet-box-squat": ["box squat", "goblet squat to box"],
  "db-sumo-squat": ["plie squat", "wide stance squat", "sumo squat"],
  "db-split-squat": ["static lunge", "split squat"],
  "db-bulgarian": ["rear foot elevated split squat", "RFESS", "bulgarian squat", "BSS"],
  "db-reverse-lunge": ["backward lunge", "rear lunge"],
  "db-forward-lunge": ["front lunge", "dumbbell lunge"],
  "db-walking-lunge": ["walking lunges", "lunge walk"],
  "db-lateral-lunge": ["side lunge"],
  "db-curtsy-lunge": ["curtsey lunge", "crossover lunge"],
  "db-step-up": ["box step up", "bench step up"],
  "db-rdl": ["DB RDL", "dumbbell stiff leg deadlift", "romanian deadlift", "RDL"],
  "db-sl-rdl": ["single leg deadlift", "one leg RDL", "SLDL", "single leg RDL"],
  "db-sumo-deadlift": ["sumo deadlift"],
  "db-hip-thrust": ["hip thrusts dumbbell"],
  "db-glute-bridge": ["weighted glute bridge", "hip raise dumbbell"],
  "db-sl-hip-thrust": ["single leg hip thrust", "one leg hip thrust"],
  "db-calf-raise": ["standing dumbbell calf raise"],
  "db-farmer-carry": ["farmers walk", "farmer's walk", "farmers carry", "loaded carry"],
  "db-suitcase-carry": ["one arm carry", "single arm farmer carry"],
  "db-russian-twist": ["russian twist", "seated twist"],
  "db-side-bend": ["oblique side bend"],
  "db-woodchop": ["wood chop", "woodchopper"],
  "db-situp": ["weighted sit up"],
  "db-swing": ["dumbbell swing", "kettlebell swing", "KB swing"],
  "db-clean-press": ["clean and press"],
  "m-chest-press": ["seated chest press", "chest press machine", "machine press"],
  "m-pec-fly": ["pec deck", "pec fly", "chest fly machine", "butterfly machine", "machine fly"],
  "m-shoulder-press": ["shoulder press machine", "machine shoulder press", "overhead press machine"],
  "m-rear-delt": ["reverse pec deck", "rear delt machine", "reverse fly machine", "rear delt fly machine"],
  "m-lat-pulldown": ["lat pull down", "pulldown", "wide grip pulldown", "lat pulldown machine"],
  "m-seated-row": ["cable row", "seated cable row", "low row", "row machine"],
  "m-assist": ["assisted pull up", "assisted chin up", "assisted dip", "assisted pull-up machine", "gravitron"],
  "m-back-ext": ["hyperextension", "back extension", "lower back machine", "roman chair"],
  "m-arm-curl": ["preacher curl machine", "arm curl machine", "machine curl"],
  "m-biceps-curl": ["bicep curl machine", "biceps machine"],
  "m-triceps-ext": ["tricep extension machine", "triceps machine"],
  "m-triceps-press": ["seated dip machine", "tricep dip machine", "dip machine"],
  "m-rotary-torso": ["torso rotation", "oblique twist machine", "rotary torso machine"],
  "m-ab-crunch": ["ab crunch machine", "crunch machine", "abdominal machine"],
  "m-leg-press": ["leg press machine", "seated leg press"],
  "m-leg-curl": ["hamstring curl", "leg curl", "seated hamstring curl", "leg curl machine"],
  "m-leg-ext": ["quad extension", "leg extensions", "knee extension machine"],
  "m-calf": ["calf press", "calf extension machine", "seated calf press"],
  "bw-squat": ["air squat", "body weight squat", "squat"],
  "bw-sit-stand": ["chair squat", "sit to stand", "chair stand"],
  "bw-wall-sit": ["wall squat"],
  "bw-glute-bridge": ["bridge", "hip bridge", "hip raise"],
  "bw-wall-pushup": ["wall press up"],
  "bw-incline-pushup": ["incline press up", "bench push up"],
  "bw-pushup": ["press up", "pushup"],
  "bw-yt-raise": ["Y raise", "T raise", "YT raise"],
  "bw-superman": ["superman", "supermans"],
  "bw-plank": ["plank", "front plank", "elbow plank"],
  "bw-side-plank": ["side bridge"],
  "bw-bird-dog": ["quadruped arm leg raise"],
  "bw-knee-march": ["standing march", "high knee march"],
  "bw-calf-raise": ["calf raise", "heel raise"],
  "bw-jumping-jack": ["star jumps", "jumping jacks"],
  "band-row": ["resistance band row"],
  "band-pull-apart": ["pull apart"],
  "band-pushdown": ["band tricep pushdown"],
  "band-pallof": ["pallof press", "anti rotation press"],
  "bb-back-squat": ["back squat", "barbell squat", "BB squat"],
  "bb-deadlift": ["deadlift", "conventional deadlift", "BB deadlift"],
  "bb-rdl": ["barbell RDL", "stiff leg deadlift", "SLDL barbell"],
  "bb-row": ["barbell row", "bent over row", "BB row", "pendlay row"],
  "bb-ohp": ["military press", "OHP", "barbell shoulder press", "standing press", "overhead press"],
  "bb-curl": ["straight bar curl", "BB curl", "EZ bar curl", "barbell bicep curl"],
  "bb-bench": ["bench press", "bench", "flat bench", "BB bench", "barbell chest press"],
  "bb-hip-thrust": ["hip thrust", "barbell glute bridge"]
};

// ---------------------------------------------------------------- matching
const SAME = { db: "dumbbell", dbs: "dumbbell", dumbbells: "dumbbell", bb: "barbell", kb: "kettlebell", ext: "extension",
  biceps: "bicep", triceps: "tricep", tri: "tricep", bi: "bicep", flye: "fly", flyes: "fly", flies: "fly", pushup: "push up", pullup: "pull up",
  chinup: "chin up", situp: "sit up", stepup: "step up", pulldown: "pull down", skullcrusher: "skull crusher", hamstring: "hamstring",
  "w/": "with", lats: "lat", delts: "delt", glutes: "glute", quads: "quad", calves: "calf", abs: "ab" };
const SKIP = new Set(["the", "a", "an", "with", "and", "on", "of", "to", "machine"]);
const unplural = t => (t.length > 4 && /(ss|sh|ch|x)es$/.test(t) ? t.slice(0, -2) : t.length > 3 && /[^s]s$/.test(t) ? t.slice(0, -1) : t);
export function norm(s) {
  return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim()
    .split(" ").filter(Boolean).map(t => SAME[t] || SAME[unplural(t)] || unplural(t)).join(" ").split(" ").filter(Boolean).join(" ");
}
const toks = s => norm(s).split(" ").filter(Boolean);
const keyToks = s => toks(s).filter(t => !SKIP.has(t));
function dist(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const typoOk = (q, t) => (q.length >= 8 ? dist(q, t) <= 2 : q.length >= 4 ? dist(q, t) <= 1 : false);
// 0–100: how well a typed search matches one name.
export function matchScore(query, text) {
  const qn = norm(query), tn = norm(text); if (!qn || !tn) return 0;
  if (qn === tn) return 100;
  const sameSet = (a, b) => a.length >= 2 && a.length === b.length && a.every(x => b.includes(x));
  if (sameSet(keyToks(query), keyToks(text))) return 95;
  if (tn.startsWith(qn)) return 85;
  const q = toks(query), t = toks(text);
  const last = q.length - 1; // the last word may still be half typed
  const hit = (x, i) => t.some(y => y === x || (i === last && y.startsWith(x)) || (x.length >= 3 && y.startsWith(x)));
  if (q.every(hit)) return 70 - Math.min(10, t.length - q.length);
  if (q.every((x, i) => hit(x, i) || t.some(y => typoOk(x, y)))) return 45;
  return 0;
}
// Items: { id, name, tags?: [] }. Returns [{ item, score, via }] best first; `via` is the other name that matched.
export function searchExercises(query, items, limit = 12) {
  if (!norm(query)) return [];
  const out = [];
  for (const item of items) {
    let best = matchScore(query, item.name), via = "";
    for (const tag of item.tags || []) { const s = matchScore(query, tag) - 3; if (s > best) { best = s; via = tag; } }
    if (best > 0) out.push({ item, score: best, via });
  }
  return out.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length || a.item.name.localeCompare(b.item.name)).slice(0, limit);
}
// The same exercise under another name? Only strong matches: the same words in any order, a known other name,
// or a small typo. Used to ask "Did you mean …?" before adding something new.
export function sameExercise(name, items) {
  const r = searchExercises(name, items, 1)[0];
  return r && r.score >= 92 ? r : null;
}
export const allNames = item => [item.name, ...(item.tags || [])];
export function hasName(item, name) { const n = norm(name); return allNames(item).some(x => norm(x) === n); }

// ---------------------------------------------------------------- details for a brand-new exercise
export function guessEquip(n) {
  const s = n.toLowerCase();
  if (/band/.test(s)) return "band";
  if (/smith|barbell|\bbb\b|ez bar|ez-bar/.test(s)) return "barbell";
  if (/kettlebell|\bkb\b/.test(s)) return "other";
  if (/cable|rope|pulley|face pull|pallof|woodchop|pulldown|pull-down/.test(s)) return "cable";
  if (/dumbbell|\bdb\b|goblet|farmer|suitcase/.test(s)) return "dumbbell";
  if (/machine|press|curl|extension|abductor|adductor|row|leg press|pec|deck|captain/.test(s)) return "machine";
  if (/treadmill|bike|elliptical|rower|stair/.test(s)) return "cardio";
  return "bodyweight";
}
export function guessPattern(n) {
  const s = n.toLowerCase();
  if (/carry|walk\b|farmer/.test(s)) return "carry";
  if (/pallof|woodchop|twist|rotation|rotary/.test(s)) return "rotation";
  if (/plank|crunch|sit-?up|dead bug|bird dog|hollow|leg raise|knee raise|ab /.test(s)) return "core";
  if (/lunge|split squat|bulgarian|step-?up/.test(s)) return "lunge";
  if (/squat|leg press|sit-to-stand/.test(s)) return "squat";
  if (/deadlift|rdl|good morning|hip thrust|bridge|swing|back extension|hyperextension/.test(s)) return "hinge";
  if (/curl|extension|raise|fly|flye|crossover|kickback|shrug|pushdown|abduct|adduct|calf/.test(s)) return "isolation";
  if (/row|pulldown|pull-?down|pull-?up|chin-?up|face pull|pull-apart/.test(s)) return "pull";
  if (/press|push-?up|dip/.test(s)) return "push";
  if (/clean|snatch|thruster|jump/.test(s)) return "power";
  return "";
}
export function guessKind(n) {
  const s = n.toLowerCase();
  if (/plank|hold|wall sit|hang\b|dead hang/.test(s)) return "time";
  if (/carry|farmer|suitcase/.test(s)) return "carry";
  if (/assist/.test(s)) return "assist";
  if (/push-?up|pull-?up|chin-?up|sit-?up|crunch|burpee|jumping jack|mountain climber|bodyweight|air squat|bird dog|dead bug/.test(s) && !/machine|cable|weighted|dumbbell/.test(s)) return "bw";
  return "load";
}
// Everything a library entry needs, from the name alone. Joints, risks, difficulty and the like come from the
// closest library exercise (same muscles, same movement, same equipment), so safety info is never blank.
export function fillDetails(name, library = [], picked = {}) {
  const equip = picked.equip || guessEquip(name), pattern = guessPattern(name), kind = picked.kind || guessKind(name);
  const focus = picked.focus?.length ? picked.focus : focusFromName(name);
  const db = picked.db ?? (equip === "dumbbell");
  const uni = /single|one-arm|one arm|one-leg|one leg|unilateral|bulgarian|lunge|split squat|step-?up|suitcase/i.test(name);
  const best = library.map(m => ({ m, s: muscleMatch(name, focus, m.name, m.focus) * 2 + (pattern && m.pattern === pattern ? 3 : 0) + (m.equip === equip ? 2 : 0) }))
    .filter(x => x.s >= 6).sort((a, b) => b.s - a.s || a.m.name.localeCompare(b.m.name))[0]?.m;
  return {
    name, focus, equip, pattern, kind, db, unilateral: uni,
    difficulty: best?.difficulty || 1, effort: best?.effort || 2, impact: best?.impact || 0, position: best?.position || "",
    joints: { ...(best?.joints || {}) }, risks: (best?.risks || []).map(r => ({ ...r })), sr: kind === "time" ? "3 × 30 sec" : best?.sr || "3 × 10",
    how: "", notes: "", auto: true, basedOn: best?.name || ""
  };
}
