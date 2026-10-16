// Stretching: the stretch library and short routines built from it. Stretches are done as holds
// ("Hold 30 sec · each side"), slow breaths, or slow reps, not sets and reps with weight.
// Routines aren't tied to days or the cycle: pick one for how you feel, at 5, 10, or 15 minutes.
// Pure: no DOM, no storage.

// S(key, name, areas, position, dose, how, feel, does, opts)
// areas: where it stretches. position: standing | seated | floor. dose: [kind, amount, sides]:
//   kind "hold" = seconds, "breaths" = slow breaths, "reps" = slow controlled reps; sides = true for each side.
// opts.caution: injured areas that should skip it. opts.calm: good for winding down. opts.wake: good for mornings.
const S = (key, n, areas, pos, [kind, amount, sides], how, feel, does, o = {}) =>
  ({ key, n, areas, pos, kind, amount, sides: !!sides, how, feel, does, caution: o.caution || [], calm: !!o.calm, wake: !!o.wake });

export const STRETCHES = [
  // neck and shoulders
  S("neck-side", "Neck Side Stretch", ["neck"], "seated", ["hold", 20, true], "Sit or stand tall. Drop one ear toward that shoulder and let the other shoulder relax down.", "Side of your neck, down to the top of your shoulder.", "Eases neck tension from screens, driving, and shrugging.", { calm: true }),
  S("chin-tuck", "Chin Tuck", ["neck"], "seated", ["reps", 8, false], "Sit tall and gently slide your chin straight back, making a double chin. Hold a breath, then relax.", "Back of your neck and base of your skull.", "Counters forward head posture.", { wake: true }),
  S("shoulder-rolls", "Shoulder Rolls", ["shoulders", "neck"], "standing", ["reps", 10, false], "Roll your shoulders up, back, and down in big slow circles.", "Tops of your shoulders and upper back.", "Loosens the shoulders and gets blood moving.", { wake: true }),
  S("arm-circles", "Arm Circles", ["shoulders"], "standing", ["reps", 10, false], "Arms out to the sides. Small circles forward, growing bigger, then backward.", "Around your shoulder joints.", "Warms up the shoulders through their full range.", { wake: true, caution: ["shoulders"] }),
  S("crossbody", "Cross-Body Shoulder", ["shoulders"], "standing", ["hold", 25, true], "Pull one arm across your chest with the other hand, holding just above the elbow.", "Back of your shoulder.", "Loosens the back of the shoulder after pressing and pulling."),
  S("doorway-chest", "Doorway Chest Stretch", ["chest", "shoulders"], "standing", ["hold", 30, true], "Forearm on a doorframe at shoulder height. Step through gently until you feel the front of your chest open.", "Front of your chest and shoulder.", "Opens up a tight chest from sitting and pressing.", { caution: ["shoulders"] }),
  S("triceps", "Overhead Triceps", ["arms", "shoulders"], "standing", ["hold", 20, true], "Reach one hand down your upper back and gently press that elbow with the other hand.", "Back of your upper arm.", "Stretches the triceps and the side of your back.", { caution: ["shoulders"] }),
  S("wrist", "Wrist and Forearm", ["wrists", "arms"], "standing", ["hold", 15, true], "Arm straight, palm up, gently pull your fingers back. Then flip your palm down and pull the back of your hand toward you.", "Inside and outside of your forearm.", "Relief for typing, gripping, and phone use."),
  S("thread-needle", "Thread the Needle", ["shoulders", "back"], "floor", ["hold", 25, true], "On hands and knees, slide one arm under your body along the floor, resting that shoulder and cheek down.", "Between your shoulder blades and the back of your shoulder.", "Gentle upper-back twist that releases the shoulders.", { calm: true, caution: ["knees"] }),
  // back and core
  S("cat-cow", "Cat-Cow", ["back", "lowerBack"], "floor", ["reps", 8, false], "On hands and knees. Breathe in as you let your belly drop and look up; breathe out as you round your back toward the ceiling.", "All along your spine.", "Wakes up a stiff back, one segment at a time.", { wake: true, calm: true, caution: ["wrists"] }),
  S("childs-pose", "Child's Pose", ["back", "lowerBack", "hips"], "floor", ["breaths", 6, false], "Knees wide, big toes together, sit back toward your heels and walk your hands forward. Rest your forehead down.", "Low back, hips, and along your sides.", "A calming rest position that lengthens the back.", { calm: true, caution: ["knees"] }),
  S("standing-side", "Standing Side Reach", ["back", "core"], "standing", ["hold", 20, true], "Reach one arm overhead and lean gently to the other side, hips steady.", "Along the side of your body, ribs to hip.", "Opens up the sides and the big back muscles.", { wake: true }),
  S("seated-twist", "Seated Twist", ["back", "lowerBack"], "seated", ["hold", 20, true], "Sit tall on a chair. Turn your chest to one side, one hand on the backrest, without forcing it.", "Middle and lower back.", "Restores rotation for a back that sits all day."),
  S("supine-twist", "Lying Twist", ["lowerBack", "back", "hips"], "floor", ["hold", 30, true], "Lie on your back, pull one knee across your body toward the floor, and let your arms rest out wide.", "Low back, side of your hip, and chest.", "Releases low-back tension; great before sleep.", { calm: true }),
  S("knees-chest", "Knees to Chest", ["lowerBack", "glutes"], "floor", ["breaths", 6, false], "Lie on your back and hug both knees gently toward your chest. Rock side to side if it feels good.", "Low back and the tops of your glutes.", "Takes pressure off the low back.", { calm: true }),
  S("sphinx", "Sphinx", ["lowerBack", "core"], "floor", ["breaths", 5, false], "Lie face down, prop yourself on your forearms, and let your low back relax.", "Low back and the front of your stomach.", "A gentle back bend that counters sitting.", { caution: ["lowerBack"] }),
  S("back-arch", "Standing Back Extension", ["lowerBack", "core"], "standing", ["reps", 5, false], "Hands on your hips, squeeze your glutes, and gently lean back a small amount. Come back to tall.", "Low back and the front of your hips.", "Undoes the slump of sitting.", { wake: true, caution: ["lowerBack"] }),
  // hips and glutes
  S("hip-flexor", "Standing Hip Flexor", ["hips"], "standing", ["hold", 25, true], "Staggered stance. Tuck your hips under, squeeze the back leg's glute, and shift slightly forward.", "Front of the back hip.", "Loosens hips that sit all day, which helps the low back."),
  S("kneeling-hip", "Kneeling Hip Flexor", ["hips", "legs"], "floor", ["hold", 30, true], "One knee down on a pillow, other foot forward. Tuck your hips and shift forward until the front of the back hip stretches.", "Front of the hip on the kneeling side.", "A deeper hip opener for tight hips.", { caution: ["knees"] }),
  S("fig4-seated", "Seated Figure-4", ["glutes", "hips"], "seated", ["hold", 30, true], "Sit on a chair, cross one ankle over the other knee, sit tall, and lean forward slightly.", "Deep in the glute of the crossed leg.", "Releases the glutes and outer hip.", { caution: ["knees"] }),
  S("fig4-lying", "Lying Figure-4", ["glutes", "hips"], "floor", ["hold", 30, true], "On your back, cross one ankle over the other knee and pull the bottom leg in toward you.", "Deep in the glute of the crossed leg.", "Same as the seated version, more relaxed.", { calm: true, caution: ["knees"] }),
  S("butterfly", "Butterfly", ["hips", "legs"], "floor", ["hold", 30, false], "Sit with the soles of your feet together, knees out. Sit tall and let your knees drop.", "Inner thighs and groin.", "Opens the inner thighs and hips.", { calm: true, caution: ["knees"] }),
  S("side-lean", "Wide-Stance Side Lean", ["legs", "hips"], "standing", ["hold", 20, true], "Feet wide, shift your weight over one bent knee and keep the other leg straight.", "Inner thigh of the straight leg.", "Stretches the inner thighs standing up."),
  S("worlds-greatest", "Lunge with a Reach", ["hips", "back", "legs"], "standing", ["reps", 5, true], "Step into a long lunge, both hands down inside your front foot, then reach that same arm up to the ceiling. Return and repeat.", "Hip flexor, hamstring, and upper back all at once.", "A full-body mover that wakes everything up.", { wake: true, caution: ["knees"] }),
  // legs
  S("quad", "Standing Quad", ["legs"], "standing", ["hold", 25, true], "Hold a wall for balance and pull one heel toward your butt, knees side by side.", "Front of the thigh.", "Loosens the quads after squats and walking.", { caution: ["knees"] }),
  S("hamstring-stand", "Standing Hamstring", ["legs", "lowerBack"], "standing", ["hold", 25, true], "Heel on a low step, that leg straight. Stand tall and hinge forward from your hips until you feel the back of the leg.", "Back of the thigh, behind the knee.", "Lengthens tight hamstrings that pull on the low back."),
  S("hamstring-lying", "Lying Hamstring with a Towel", ["legs"], "floor", ["hold", 30, true], "On your back, loop a towel around one foot and raise that straight leg until you feel a stretch.", "Back of the thigh.", "A supported hamstring stretch that's easy on the back.", { calm: true }),
  S("ragdoll", "Ragdoll Forward Fold", ["legs", "lowerBack", "back"], "standing", ["breaths", 5, false], "Feet hip-width, knees soft, fold forward and hold opposite elbows. Let your head hang heavy. Roll up slowly.", "Hamstrings and the whole back.", "Releases the spine and hamstrings together.", { caution: ["lowerBack"] }),
  S("calf-wall", "Wall Calf Stretch", ["calves", "ankles"], "standing", ["hold", 25, true], "Hands on a wall, one foot back with the heel down and that knee straight. Lean in gently.", "Calf of the back leg.", "Loosens calves and Achilles after walking and running."),
  S("ankle-circles", "Ankle Circles", ["ankles", "calves"], "seated", ["reps", 10, true], "Sit and slowly circle one foot, then the other way. Switch feet.", "Around the ankle.", "Keeps ankles and feet moving; good care for a healing foot.", { calm: true }),
  // whole body / calm
  S("down-dog", "Downward Dog", ["calves", "legs", "shoulders", "back"], "floor", ["breaths", 5, false], "From hands and knees, lift your hips up and back into an upside-down V. Bend your knees as much as you need.", "Calves, hamstrings, and shoulders.", "Stretches the whole back side of the body.", { caution: ["wrists", "shoulders"] }),
  S("legs-wall", "Legs Up the Wall", ["legs", "lowerBack"], "floor", ["breaths", 10, false], "Lie on your back with your hips near a wall and your legs resting up the wall. Arms relaxed.", "Gentle stretch along the backs of the legs.", "Calms the body down; a classic before sleep.", { calm: true }),
  S("box-breath", "Box Breathing", ["neck", "back"], "seated", ["breaths", 6, false], "Sit comfortably. Breathe in for 4, hold for 4, out for 4, hold for 4.", "Your whole body settling.", "Slows your heart rate and calms the mind.", { calm: true })
];
export const BY_KEY = Object.fromEntries(STRETCHES.map(s => [s.key, s]));

export const AREAS = { neck: "Neck", shoulders: "Shoulders", chest: "Chest", arms: "Arms", wrists: "Wrists", back: "Upper back", lowerBack: "Lower back", core: "Core", hips: "Hips", glutes: "Glutes", legs: "Legs", calves: "Calves", ankles: "Ankles and feet" };
// Workout focus areas and sore spots → the areas to stretch.
export const FROM_FOCUS = { chest: ["chest", "shoulders"], shoulders: ["shoulders", "chest"], arms: ["arms", "wrists"], back: ["back", "lowerBack"], core: ["core", "lowerBack"], glutes: ["glutes", "hips"], legs: ["legs", "hips"], calves: ["calves", "ankles"], full: ["hips", "back", "legs"], cardio: ["calves", "legs"] };
export const FROM_PAIN = { foot: ["calves", "ankles"], knees: ["legs", "hips"], shoulders: ["shoulders", "chest"], lowerBack: ["lowerBack", "hips", "glutes"], neck: ["neck", "shoulders"], elbows: ["arms", "wrists"], wrists: ["wrists", "arms"], hips: ["hips", "glutes"], ankles: ["ankles", "calves"] };

export const ROUTINES = {
  today: { title: "For today's workout", blurb: "Cools down the muscles you trained.", pick: "areas" },
  morning: { title: "Morning wake-up", blurb: "Standing and seated moves to get loose.", areas: ["neck", "shoulders", "back", "hips", "legs", "calves"], where: ["standing", "seated"], prefer: "wake" },
  desk: { title: "Desk day: back and hips", blurb: "Undo a day of sitting or standing at work.", areas: ["neck", "chest", "back", "lowerBack", "hips", "legs"], where: ["standing", "seated"] },
  bedtime: { title: "Bedtime wind-down", blurb: "Slow, mostly on the floor, breath-led.", areas: ["back", "lowerBack", "hips", "glutes", "legs", "neck"], where: ["floor", "seated"], prefer: "calm", hold: 1.5 },
  sore: { title: "Sore spots", blurb: "Gentle stretches around what's bugging you.", pick: "sore", gentle: true },
  full: { title: "Full body", blurb: "Head to toe, a bit of everything.", areas: ["neck", "shoulders", "chest", "back", "lowerBack", "hips", "glutes", "legs", "calves"] },
  area: { title: "Pick an area", blurb: "Focus on one part of your body.", pick: "choose" }
};

// Seconds a stretch takes, including the 3-second countdown before each hold and a short reset.
export function doseSeconds(st, rounds = 1, holdScale = 1) {
  const per = st.kind === "hold" ? Math.round(st.amount * holdScale) : st.kind === "breaths" ? st.amount * 5 : st.amount * 4;
  return (per + 5) * (st.sides ? 2 : 1) * rounds;
}
export function doseText(st, rounds = 1, holdScale = 1) {
  const base = st.kind === "hold" ? `Hold ${Math.round(st.amount * holdScale)} sec` : st.kind === "breaths" ? `${st.amount} slow breaths` : `${st.amount} slow reps`;
  return [base, st.sides ? "each side" : "", rounds > 1 ? `${rounds} rounds` : ""].filter(Boolean).join(" · ");
}

// Build a routine: [{ key, rounds, hold }] filling about `minutes`, covering the areas in order.
// prof: injuries and limits (noFloor) from the questionnaire. areas: for "today", "sore", and "area" routines.
export function buildRoutine(id, { minutes = 10, areas = [], prof = {} } = {}) {
  const R = ROUTINES[id] || ROUTINES.full;
  const want = (R.pick ? areas : R.areas) || [];
  const list = want.length ? want : ROUTINES.full.areas;
  const hurt = new Set((prof.injuries || []).concat(prof.pain || []).map(a => (a === "foot" ? "ankles" : a)));
  const noFloor = (prof.limits || []).includes("noFloor");
  const holdScale = R.hold || 1;
  const ok = st => (!R.where || R.where.includes(st.pos)) && !(noFloor && st.pos === "floor") && !st.caution.some(c => hurt.has(c)) && !(R.gentle && st.caution.length);
  const budget = minutes * 60, out = [];
  let used = 0;
  const score = st => (R.prefer && st[R.prefer] ? -2 : 0) + (st.pos === "floor" && id !== "bedtime" ? 1 : 0);
  // Go around the areas, taking the best stretch for each that isn't used yet, until time runs out.
  for (let round = 0; round < 6 && used < budget; round++) {
    let added = false;
    for (const a of list) {
      const st = STRETCHES.filter(s => ok(s) && s.areas.includes(a) && !out.some(o => o.key === s.key))
        .sort((x, y) => score(x) - score(y) || x.areas.indexOf(a) - y.areas.indexOf(a))[0];
      if (!st) continue;
      const t = doseSeconds(st, 1, holdScale);
      if (used + t > budget + 30) continue;
      out.push({ key: st.key, rounds: 1, hold: holdScale }); used += t; added = true;
    }
    if (!added) break;
  }
  // Short list but time left over (say, one sore spot): do the holds twice.
  for (const o of out) { if (used >= budget - 30) break; const st = BY_KEY[o.key]; if (st.kind === "hold") { used += doseSeconds(st, 1, o.hold); o.rounds = 2; } }
  // Wind-down routines end with the calmest moves; everything else starts standing and ends lower.
  const rank = { standing: 0, seated: 1, floor: 2 };
  out.sort((x, y) => rank[BY_KEY[x.key].pos] - rank[BY_KEY[y.key].pos] || (BY_KEY[x.key].calm - BY_KEY[y.key].calm));
  if (id === "bedtime") out.sort((x, y) => (x.key === "box-breath") - (y.key === "box-breath")); // finish on the breathing
  return { title: R.title, items: out, seconds: out.reduce((n, o) => n + doseSeconds(BY_KEY[o.key], o.rounds, o.hold), 0) };
}

// Guided steps: one timed hold per side per round, with the label to show and say.
export function steps(items) {
  const out = [];
  items.forEach((o, i) => {
    const st = BY_KEY[o.key]; const per = st.kind === "hold" ? Math.round(st.amount * (o.hold || 1)) : st.kind === "breaths" ? st.amount * 5 : st.amount * 4;
    for (let r = 1; r <= (o.rounds || 1); r++) for (const side of st.sides ? ["Left side", "Right side"] : [""]) {
      out.push({ item: i, key: o.key, seconds: per, side, round: r, rounds: o.rounds || 1,
        cue: st.kind === "hold" ? "Hold" : st.kind === "breaths" ? `${st.amount} slow breaths` : `${st.amount} slow reps` });
    }
  });
  return out;
}
