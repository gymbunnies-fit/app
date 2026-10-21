// Gym equipment: the catalog people equip their gyms from, ready-made starting points (presets), and which
// equipment each exercise needs. Pure: no DOM, no storage, testable in Node.
// A gym = { id, name, preset, items: [equipment ids], details: { dbMax, dbStep, machineStep, cableStep, smithBar } }.

export const EQUIP_CATS = [
  ["free", "Free weights"], ["bench", "Benches, racks and stations"], ["cable", "Cables"],
  ["machine", "Machines"], ["plate", "Plate-loaded and lever machines"], ["cardio", "Cardio"], ["acc", "Small gear"]
];

// id, name, category, other names people search for
const E = (id, n, cat, aka = "") => ({ id, n, cat, aka });
export const EQUIPMENT = [
  // free weights
  E("dumbbells", "Dumbbells", "free", "db dumbbell rack"),
  E("adj-dumbbells", "Adjustable dumbbells", "free", "bowflex powerblock selecttech"),
  E("kettlebells", "Kettlebells", "free", "kb kettle bell"),
  E("barbell", "Barbell and plates", "free", "olympic bar plates weights"),
  E("ez-bar", "EZ curl bar", "free", "ez bar curl bar cambered"),
  E("fixed-barbells", "Fixed-weight barbells", "free", "preloaded barbells pre-loaded straight bars"),
  E("trap-bar", "Trap bar", "free", "hex bar"),
  E("medicine-ball", "Medicine ball", "free", "med ball wall ball"),
  E("slam-ball", "Slam ball", "free", ""),
  E("sandbag", "Sandbag", "free", ""),
  E("weight-plates", "Loose weight plates", "free", "plates bumper plates"),
  E("weighted-vest", "Weighted vest", "free", "vest"),
  // benches, racks, stations
  E("flat-bench", "Flat bench", "bench", "bench"),
  E("adjustable-bench", "Adjustable bench", "bench", "incline bench fid bench adjustable incline"),
  E("decline-bench", "Decline bench", "bench", "decline sit-up bench ab bench"),
  E("preacher-bench", "Preacher curl bench", "bench", "scott bench"),
  E("smith", "Smith machine", "bench", "smith rack guided bar"),
  E("power-rack", "Power rack or squat rack", "bench", "squat rack cage half rack"),
  E("squat-stand", "Squat stands", "bench", ""),
  E("landmine", "Landmine", "bench", "barbell corner t-bar post"),
  E("pullup-bar", "Pull-up bar", "bench", "chin-up bar"),
  E("dip-station", "Dip station", "bench", "dip bars parallel bars"),
  E("captains-chair", "Captain's chair", "bench", "vertical knee raise vkr power tower roman chair knee raise"),
  E("back-ext-bench", "Back extension bench", "bench", "45 degree hyperextension roman chair hyper"),
  E("ghd", "Glute-ham developer", "bench", "ghd glute ham raise"),
  E("plyo-box", "Plyo box or step", "bench", "box jump step-up box"),
  E("step-platform", "Aerobic step", "bench", "step"),
  E("suspension", "Suspension trainer", "bench", "trx straps"),
  E("rings", "Gymnastic rings", "bench", ""),
  E("hip-thrust-bench", "Hip thrust bench", "bench", "glute bench thruster bench"),
  E("ab-bench", "Sit-up bench", "bench", "ab bench decline crunch"),
  E("reverse-hyper", "Reverse hyper", "bench", "reverse hyperextension"),
  E("nordic-bench", "Nordic curl bench", "bench", "nordic hamstring"),
  E("parallettes", "Parallettes", "bench", "push-up handles"),
  E("rig", "Rig or wall bars", "bench", "crossfit rig monkey bars"),
  // cables
  E("cable-single", "Single cable column", "cable", "cable pulley adjustable pulley cable station"),
  E("cable-dual", "Dual cable machine", "cable", "functional trainer dual adjustable pulley freemotion"),
  E("cable-crossover", "Cable crossover", "cable", "crossover station cable tower"),
  E("lat-pulldown", "Lat pulldown", "cable", "pulldown pull-down lat machine"),
  E("cable-row", "Seated cable row", "cable", "low row cable row station"),
  // selectorized machines
  E("chest-press-machine", "Chest press machine", "machine", "seated chest press"),
  E("incline-press-machine", "Incline press machine", "machine", "incline chest press"),
  E("shoulder-press-machine", "Shoulder press machine", "machine", "overhead press machine"),
  E("pec-deck", "Pec deck / rear delt fly", "machine", "pec fly pectoral fly butterfly reverse fly rear delt"),
  E("seated-row-machine", "Seated row machine", "machine", "row machine"),
  E("chest-supported-row", "Chest-supported row machine", "machine", "t-bar row chest supported"),
  E("assist-machine", "Assisted pull-up and dip machine", "machine", "assisted chin dip assist gravitron"),
  E("biceps-machine", "Biceps curl machine", "machine", "arm curl machine preacher curl machine"),
  E("triceps-machine", "Triceps extension machine", "machine", "tricep extension"),
  E("dip-machine", "Seated dip / triceps press machine", "machine", "triceps press seated dip"),
  E("lateral-raise-machine", "Lateral raise machine", "machine", "side raise delt machine"),
  E("ab-crunch-machine", "Ab crunch machine", "machine", "abdominal crunch"),
  E("rotary-torso", "Rotary torso machine", "machine", "torso rotation twist machine oblique"),
  E("back-ext-machine", "Lower back machine", "machine", "back extension machine"),
  E("leg-press", "Leg press machine", "machine", "seated leg press"),
  E("leg-extension", "Leg extension machine", "machine", "quad extension"),
  E("leg-curl-seated", "Seated leg curl", "machine", "hamstring curl"),
  E("leg-curl-lying", "Lying leg curl", "machine", "prone leg curl hamstring curl"),
  E("hip-abductor", "Hip abductor machine", "machine", "outer thigh abduction"),
  E("hip-adductor", "Hip adductor machine", "machine", "inner thigh adduction"),
  E("glute-machine", "Glute kickback or glute drive machine", "machine", "hip thrust machine glute drive kickback"),
  E("multi-hip", "Multi-hip machine", "machine", "hip flexion extension"),
  E("leg-curl-standing", "Standing leg curl", "machine", "kneeling leg curl"),
  E("shrug-machine", "Shrug machine", "machine", "trap machine"),
  E("chest-fly-cable-machine", "Cable fly machine", "machine", "dual pulley fly"),
  E("horizontal-leg-press", "Horizontal leg press", "machine", "seated leg press"),
  E("pullover-machine", "Pullover machine", "machine", "nautilus pullover"),
  E("dip-chin-combo", "Dip and chin tower", "machine", "power tower combo"),
  E("calf-machine", "Standing calf raise machine", "machine", "calf extension calf raise"),
  E("seated-calf", "Seated calf raise machine", "machine", "seated calf"),
  E("hack-squat", "Hack squat", "machine", "hack squat machine"),
  E("pendulum-squat", "Pendulum squat", "machine", ""),
  E("belt-squat", "Belt squat", "machine", ""),
  // plate-loaded and lever (including Hammer Strength MTS)
  E("plate-chest-press", "Plate-loaded chest press", "plate", "hammer strength iso-lateral chest press"),
  E("plate-incline", "Plate-loaded incline press", "plate", "hammer strength incline"),
  E("plate-shoulder", "Plate-loaded shoulder press", "plate", "hammer strength shoulder press"),
  E("plate-row", "Plate-loaded row", "plate", "hammer strength row iso-lateral row high row low row"),
  E("plate-pulldown", "Plate-loaded pulldown", "plate", "hammer strength front pulldown"),
  E("plate-leg-press", "Plate-loaded 45° leg press", "plate", "45 degree leg press sled"),
  E("t-bar-row", "T-bar row", "plate", "tbar"),
  E("plate-decline", "Plate-loaded decline press", "plate", "hammer strength decline"),
  E("plate-high-row", "Plate-loaded high row", "plate", "hammer strength high row"),
  E("plate-low-row", "Plate-loaded low row", "plate", "hammer strength low row"),
  E("plate-hack", "Plate-loaded hack squat", "plate", "hack squat sled"),
  E("plate-v-squat", "V-squat", "plate", "v squat"),
  E("plate-hip-thrust", "Plate-loaded hip thrust", "plate", "glute drive plate"),
  E("plate-calf", "Plate-loaded calf raise", "plate", ""),
  E("plate-biceps", "Plate-loaded biceps curl", "plate", "lever curl"),
  E("mts-chest-press", "MTS chest press", "plate", "hammer strength mts purple"),
  E("mts-incline", "MTS incline press", "plate", "hammer strength mts purple"),
  E("mts-shoulder-press", "MTS shoulder press", "plate", "hammer strength mts purple"),
  E("mts-row", "MTS row", "plate", "hammer strength mts purple"),
  E("mts-pulldown", "MTS front pulldown", "plate", "hammer strength mts purple"),
  E("mts-ab-crunch", "MTS ab crunch", "plate", "hammer strength mts purple"),
  // cardio
  E("treadmill", "Treadmill", "cardio", "running walking"),
  E("bike", "Upright bike", "cardio", "exercise bike stationary"),
  E("recumbent-bike", "Recumbent bike", "cardio", ""),
  E("spin-bike", "Spin bike", "cardio", "indoor cycle peloton"),
  E("elliptical", "Elliptical", "cardio", "cross trainer"),
  E("arc-trainer", "Arc trainer", "cardio", "cybex arc"),
  E("rower", "Rowing machine", "cardio", "erg concept2"),
  E("stair-climber", "Stair climber", "cardio", "stairmaster stepmill"),
  E("air-bike", "Air bike", "cardio", "assault bike echo bike fan bike"),
  E("ski-erg", "Ski erg", "cardio", ""),
  E("curved-treadmill", "Curved treadmill", "cardio", "woodway assault runner"),
  E("arm-bike", "Arm bike", "cardio", "upper body ergometer ube"),
  E("vertical-climber", "Vertical climber", "cardio", "versaclimber"),
  // small gear
  E("bands", "Resistance bands", "acc", "loop bands tube bands"),
  E("mini-bands", "Mini bands", "acc", "booty bands hip bands"),
  E("stability-ball", "Stability ball", "acc", "swiss ball exercise ball physio ball"),
  E("ab-wheel", "Ab wheel", "acc", "ab roller"),
  E("jump-rope", "Jump rope", "acc", "skipping rope"),
  E("foam-roller", "Foam roller", "acc", ""),
  E("mats", "Mats or open floor", "acc", "yoga mat stretching area turf"),
  E("sled", "Sled", "acc", "prowler"),
  E("battle-ropes", "Battle ropes", "acc", ""),
  E("dip-belt", "Dip belt", "acc", "weight belt chain"),
  E("bosu", "Balance trainer", "acc", "bosu half ball balance board"),
  E("agility-ladder", "Agility ladder", "acc", "speed ladder"),
  E("cones-hurdles", "Cones and hurdles", "acc", "plyo hurdles"),
  E("sliders", "Sliders", "acc", "gliding discs"),
  E("ankle-weights", "Ankle weights", "acc", ""),
  E("lifting-straps", "Lifting straps", "acc", "wrist wraps straps"),
  E("massage-gun", "Massage gun", "acc", "theragun percussion")
];
export const EQUIP_BY_ID = Object.fromEntries(EQUIPMENT.map(e => [e.id, e]));

// Search the catalog by name or any other name people use for it.
export function searchEquipment(q) {
  const t = String(q || "").toLowerCase().trim();
  if (!t) return EQUIPMENT;
  const words = t.split(/\s+/);
  return EQUIPMENT.filter(e => { const hay = `${e.n} ${e.aka} ${e.id.replace(/-/g, " ")}`.toLowerCase(); return words.every(w => hay.includes(w)); });
}

// ---------------------------------------------------------------- presets (starting points; people edit from here)
const CARDIO_STD = ["treadmill", "bike", "recumbent-bike", "elliptical", "stair-climber", "rower"];
const SELECTORIZED = ["chest-press-machine", "incline-press-machine", "shoulder-press-machine", "pec-deck", "seated-row-machine", "assist-machine",
  "biceps-machine", "triceps-machine", "dip-machine", "ab-crunch-machine", "rotary-torso", "back-ext-machine", "leg-press", "leg-extension",
  "leg-curl-seated", "leg-curl-lying", "hip-abductor", "hip-adductor", "calf-machine", "seated-calf"];
export const PRESETS = {
  typical: { name: "Typical big gym", note: "Free weights, racks, cables, a full row of machines and cardio.",
    items: ["dumbbells", "kettlebells", "barbell", "ez-bar", "fixed-barbells", "medicine-ball", "flat-bench", "adjustable-bench", "decline-bench", "preacher-bench",
      "smith", "power-rack", "landmine", "pullup-bar", "dip-station", "captains-chair", "back-ext-bench", "plyo-box", "cable-dual", "cable-crossover", "lat-pulldown",
      "cable-row", ...SELECTORIZED, "glute-machine", "hack-squat", "plate-chest-press", "plate-row", "plate-leg-press", "t-bar-row", ...CARDIO_STD, "air-bike",
      "bands", "stability-ball", "ab-wheel", "foam-roller", "mats", "jump-rope"],
    details: { dbMax: 100, dbStep: 5, machineStep: 5, cableStep: 5 } },
  pf: { name: "Planet Fitness-style", note: "Typical for the chain, but every location differs. Check yours.",
    items: ["dumbbells", "kettlebells", "flat-bench", "adjustable-bench", "decline-bench", "smith", "pullup-bar", "captains-chair", "back-ext-bench", "plyo-box",
      "cable-crossover", "cable-dual", "lat-pulldown", "cable-row", "chest-press-machine", "incline-press-machine", "shoulder-press-machine", "pec-deck", "seated-row-machine",
      "assist-machine", "biceps-machine", "triceps-machine", "dip-machine", "ab-crunch-machine", "rotary-torso", "back-ext-machine", "leg-press", "leg-extension",
      "leg-curl-seated", "hip-abductor", "hip-adductor", "calf-machine", "seated-calf", "mts-chest-press", "mts-incline", "mts-shoulder-press", "mts-row", "mts-pulldown",
      "mts-ab-crunch", "treadmill", "bike", "recumbent-bike", "elliptical", "arc-trainer", "stair-climber", "stability-ball", "mats"],
    details: { dbMax: 60, dbStep: 5, machineStep: 5, cableStep: 5 } },
  anytime: { name: "Anytime Fitness-style", note: "Smaller 24-hour gym. Typical for the chain, but every location differs.",
    items: ["dumbbells", "kettlebells", "barbell", "ez-bar", "medicine-ball", "flat-bench", "adjustable-bench", "smith", "power-rack", "pullup-bar", "dip-station",
      "captains-chair", "back-ext-bench", "plyo-box", "cable-dual", "lat-pulldown", "cable-row", "chest-press-machine", "shoulder-press-machine", "pec-deck",
      "seated-row-machine", "leg-press", "leg-extension", "leg-curl-seated", "hip-abductor", "hip-adductor", "treadmill", "bike", "elliptical", "rower",
      "bands", "stability-ball", "ab-wheel", "suspension", "foam-roller", "mats"],
    details: { dbMax: 80, dbStep: 5, machineStep: 5, cableStep: 5 } },
  hotel: { name: "Hotel gym", note: "A few dumbbells, a bench and cardio.",
    items: ["dumbbells", "adjustable-bench", "stability-ball", "mats", "treadmill", "bike", "elliptical"], details: { dbMax: 50, dbStep: 5, machineStep: 5, cableStep: 5 } },
  homeDb: { name: "Home: dumbbells and a bench", note: "Adjustable dumbbells or a small set, a bench and some floor.",
    items: ["dumbbells", "adjustable-bench", "bands", "mats"], details: { dbMax: 50, dbStep: 5, machineStep: 5, cableStep: 5 } },
  bodyweight: { name: "Bodyweight only", note: "No equipment: just you and some floor.", items: ["mats"], details: { dbMax: 0, dbStep: 5, machineStep: 5, cableStep: 5 } },
  empty: { name: "Start empty", note: "Add each piece yourself.", items: [], details: { dbMax: 50, dbStep: 5, machineStep: 5, cableStep: 5 } }
};
export const DEFAULT_PRESET = "typical";
// The gym the app assumes until someone sets one up.
export const DEFAULT_GYM = { id: "preset:typical", name: PRESETS.typical.name, preset: "typical", items: PRESETS.typical.items, details: PRESETS.typical.details, virtual: true };
export const DETAIL_DEFAULTS = { dbMax: 50, dbStep: 2.5, machineStep: 2.5, cableStep: 2.5, smithBar: "" };

// ---------------------------------------------------------------- what each exercise needs
// A list of options; the exercise works at a gym that has everything in ANY one option. [] = needs nothing.
const ANY_BENCH = [["flat-bench"], ["adjustable-bench"], ["plyo-box"]];
const CABLE = [["cable-single"], ["cable-dual"], ["cable-crossover"]];
const withEach = (opts, extra) => opts.flatMap(o => extra.map(x => [...o, ...x]));
const R = (re, need) => ({ re, need });
const RULES = [
  R(/^band |\bband\b/i, [["bands"], ["mini-bands"]]),
  R(/smith/i, [["smith"]]),
  R(/jump rope/i, [["jump-rope"]]),
  R(/bodyweight dips/i, [["dip-station"], ["assist-machine"]]),
  R(/incline forearm plank|incline push-up|decline push-ups/i, ANY_BENCH),
  R(/lying knee raise|^dead bug|bird dog|v-ups|bicycle crunch|^sit-ups$|plank$|^forearm plank|side plank|superman|wall sit|jump squats|^glute bridge|single-leg glute bridge|bodyweight|sit-to-stand|knee march|jacks|^push-ups$|^push-up$|wall push-up|^reverse lunge$|walking lunges|static split squat|y-t raise|standing calf raise$/i, []),
  R(/captain'?s chair/i, [["captains-chair"], ["pullup-bar"], ["dip-station"]]),
  R(/leg press/i, [["leg-press"], ["plate-leg-press"]]),
  R(/leg extension/i, [["leg-extension"]]),
  R(/lying leg curl/i, [["leg-curl-lying"]]),
  R(/leg curl/i, [["leg-curl-seated"], ["leg-curl-lying"]]),
  R(/cable hip ab|cable hip ad/i, CABLE),
  R(/abductor/i, [["hip-abductor"]]),
  R(/adductor/i, [["hip-adductor"]]),
  R(/lower back machine|back extension machine/i, [["back-ext-machine"]]),
  R(/back extension/i, [["back-ext-bench"], ["ghd"]]),
  R(/negative pull-ups|chin-ups/i, [["pullup-bar"], ["assist-machine"]]),
  R(/assist/i, [["assist-machine"]]),
  R(/torso rotation|rotary torso/i, [["rotary-torso"]]),
  R(/mts ab/i, [["mts-ab-crunch"]]),
  R(/abdominal crunch|ab crunch/i, [["ab-crunch-machine"], ["mts-ab-crunch"]]),
  R(/seated calf/i, [["seated-calf"]]),
  R(/calf extension/i, [["calf-machine"], ["leg-press"]]),
  R(/pec fly|pectoral fly|pec deck|reverse pec deck|rear deltoid fly/i, [["pec-deck"]]),
  R(/mts chest/i, [["mts-chest-press"]]),
  R(/mts incline/i, [["mts-incline"]]),
  R(/mts shoulder/i, [["mts-shoulder-press"]]),
  R(/mts row/i, [["mts-row"]]),
  R(/mts .*pulldown/i, [["mts-pulldown"]]),
  R(/lat pulldown|front pulldown|^pulldown/i, [["lat-pulldown"], ["mts-pulldown"], ["plate-pulldown"]]),
  R(/single-arm cable pulldown|straight-arm cable pulldown/i, CABLE.concat([["lat-pulldown"]])),
  R(/seated cable row/i, [["cable-row"], ["cable-single"], ["cable-dual"]]),
  R(/cable|face pull|pallof|pushdown|crossover/i, CABLE.concat([["lat-pulldown"]])),
  R(/chest-supported row$/i, [["chest-supported-row"], ["t-bar-row"], ["plate-row"], ["dumbbells", "adjustable-bench"]]),
  R(/seated row/i, [["seated-row-machine"], ["mts-row"], ["plate-row"], ["cable-row"]]),
  R(/^row$|^mts row/i, [["mts-row"]]),
  R(/incline machine press|incline press machine/i, [["incline-press-machine"], ["mts-incline"], ["plate-incline"]]),
  R(/machine chest press|^chest press/i, [["chest-press-machine"], ["mts-chest-press"], ["plate-chest-press"]]),
  R(/machine shoulder press|^shoulder press$/i, [["shoulder-press-machine"], ["mts-shoulder-press"], ["plate-shoulder"]]),
  R(/machine tricep extension|^triceps extension$/i, [["triceps-machine"]]),
  R(/^triceps press$/i, [["dip-machine"], ["assist-machine"]]),
  R(/^arm curl$|^biceps curl$|biceps curl machine/i, [["biceps-machine"]]),
  R(/barbell bench|barbell hip thrust/i, withEach([["barbell"]], ANY_BENCH.slice(0, 2))),
  R(/barbell back squat|barbell overhead press/i, [["barbell", "power-rack"], ["barbell", "squat-stand"]]),
  R(/barbell/i, [["barbell"]]),
  R(/farmer|suitcase carry/i, [["dumbbells"], ["kettlebells"], ["trap-bar"]])
];
// Dumbbell moves that also need a bench (or, for incline work, an adjustable one).
const NEEDS_INCLINE = /incline (dumbbell|chest|curl)|incline press|chest-supported (dumbbell|rear)/i;
const NEEDS_BENCH = /bench press|dumbbell fly|squeeze press|pullover|skull|close-grip dumbbell press|hip thrust|step-up|bulgarian|seated dumbbell|concentration|arnold|goblet box squat|one-arm dumbbell row|renegade/i;
const DB_GEAR = [["dumbbells"], ["adj-dumbbells"]];

// What an exercise needs. def: { name, db, equip, kind, bench }.
export function needsFor(def = {}) {
  const name = String(def.name || def.n || "");
  const rule = RULES.find(r => r.re.test(name));
  if (rule) return rule.need;
  const dumbbell = def.db || def.equip === "dumbbell" || /dumbbell|goblet|hammer curl|lateral raise|front raise|weighted russian twist|weighted dead bug|^concentration|^shrug/i.test(name);
  if (dumbbell) {
    if (NEEDS_INCLINE.test(name)) return withEach(DB_GEAR, [["adjustable-bench"]]);
    if (NEEDS_BENCH.test(name) || def.bench) return withEach(DB_GEAR, ANY_BENCH);
    return DB_GEAR;
  }
  if (def.equip === "bodyweight" || def.kind === "bw" || def.kind === "time") return [];
  return []; // unknown (say, a machine someone added by hand): assume it's there
}
export const canDoNeeds = (items, needs) => !needs.length || needs.some(opt => opt.every(id => items.has(id)));
export const canDo = (gym, def) => !gym || canDoNeeds(new Set(gym.items || []), needsFor(def));
// The first option a gym is missing the least of, for "this gym doesn't list X".
export function missingFor(gym, def) {
  const items = new Set(gym?.items || []); const needs = needsFor(def);
  if (canDoNeeds(items, needs)) return [];
  const best = needs.map(o => o.filter(id => !items.has(id))).sort((a, b) => a.length - b.length)[0] || [];
  return best.map(id => EQUIP_BY_ID[id]?.n || id);
}
export const gymDetails = gym => ({ ...DETAIL_DEFAULTS, ...(gym?.details || {}) });

// Add to a set of equipment whatever each exercise is missing (its first option), so all of them are doable.
export function coverAll(items, defs) {
  const have = new Set(items);
  for (const d of defs) { const n = needsFor(d); if (!canDoNeeds(have, n)) n[0].forEach(id => have.add(id)); }
  return [...have];
}

// A new gym from a preset, or a copy of another gym.
export function newGym(id, name, presetKey, from) {
  const p = PRESETS[presetKey] || PRESETS[DEFAULT_PRESET];
  const base = from ? { items: [...(from.items || [])], details: { ...(from.details || {}) }, preset: from.preset || "copy" } : { items: [...p.items], details: { ...DETAIL_DEFAULTS, ...p.details }, preset: presetKey };
  return { id, name: name || (from ? `${from.name} (copy)` : p.name), ...base, createdAt: Date.now() };
}
