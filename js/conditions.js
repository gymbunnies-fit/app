// Health conditions: researched profiles that shape a plan. Pure data and rules: no DOM, no storage, no network.
// What someone picks is kept only on their phone (js/health.js); this file just describes the conditions.
// Each profile follows an accredited guideline; anything that is our own default (not a research number) says so.

// Supports: the switches a condition (or a symptom someone picks) turns on.
export const SUPPORTS = {
  energy: "Daily energy check",
  heat: "Heat makes symptoms worse",
  sun: "Sun makes symptoms worse",
  stretch: "Stiff or tight muscles",
  balance: "Balance is shaky",
  grip: "Numb, weak or painful hands",
  footDrop: "My foot drags or catches",
  numbFeet: "Numb feet",
  pace: "Activity makes me worse a day or two later",
  spine: "Protect my spine from bending and twisting",
  joints: "Painful or swollen joints"
};
// Symptoms anyone can pick, with or without a condition.
export const SYMPTOMS = ["heat", "energy", "stretch", "grip", "numbFeet", "footDrop", "sun", "pace"];
// What each support asks the plan builder to avoid (keys from js/tailor.js LIMITS).
export const SUPPORT_LIMITS = {
  balance: ["balance"], grip: ["grip"], footDrop: ["balance", "noImpact"], numbFeet: ["noImpact", "balance"],
  pace: ["noImpact"], spine: ["noSpineFlex", "noImpact"], joints: ["noImpact"]
};
// How flares are handled. pause: rest or keep it very light; cutback: do a bit less but keep moving; pace: stop and rest.
export const FLARE = {
  pause: "Rest, or keep it very light today: gentle stretching or a short easy walk. New or worse symptoms lasting more than a day are worth a call to your doctor or nurse. When you're ready, come back with fewer sets and shorter cardio and build back up.",
  cutback: "Cut back a little today instead of stopping: fewer sets, lighter weights, shorter cardio. Keeping some movement going usually helps more than full rest.",
  pace: "Rest today. Skip the plan, and stay well inside your energy. Pushing through tends to make the next few days worse."
};
// How the plan moves forward. build: add time and sets first, then weight. pace: never raise anything automatically.
export const PROGRESSION = { build: "Builds up gradually: more time and sets first, then weight.", pace: "Never raises the load on its own. You decide, and only on good days.", gentle: "Starts very small and builds slowly." };

const yn = (id, q, yes, no = {}) => ({ id, q, options: [["yes", "Yes"], ["no", "No"]], effects: { yes, no } });
const S_ = (t, url) => ({ t, url });

export const CONDITIONS = [
  {
    id: "ms", name: "Multiple sclerosis (MS)", tags: ["MS", "multiple sclerosis", "RRMS", "relapsing remitting MS", "SPMS", "PPMS", "progressive MS"],
    supports: ["energy", "stretch"], progression: "build", flare: "pause",
    followUps: [
      yn("heat", "Does heat (warm rooms, hot weather, a hard workout) bring your symptoms back for a while?", { supports: ["heat"] }),
      yn("balance", "Is your balance shaky?", { supports: ["balance"] }),
      yn("hands", "Are your hands numb, weak or clumsy?", { supports: ["grip"] }),
      yn("foot", "Does a foot drag or catch when you walk?", { supports: ["footDrop"] })
    ],
    plan: ["Strength 2–3 days a week with a rest day between, 1–3 sets of 8–15 reps.", "Cardio 2–3 days a week, building from 10 to 30 minutes at a pace you can talk through.", "Daily stretching for stiff muscles. Balance practice next to something sturdy."],
    tips: ["Train when your energy is best, often in the morning.", "If a symptom stirred up by exercise hasn't settled within about 30 minutes, go lighter next time.", "Judge effort by feel. Heart rate can be off with MS."],
    sources: [S_("Kalb et al. 2020, National MS Society recommendations", "https://doi.org/10.1177/1352458520915629"), S_("Kim et al. 2019, exercise guidelines for MS", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6586489/"), S_("MS Trust: heat sensitivity", "https://mstrust.org.uk/node/870"), S_("MS Australia: exercise and MS", "https://msaustralia.org.au/publication/exercise-and-ms")]
  },
  {
    id: "fibro", name: "Fibromyalgia", tags: ["fibro", "fibromyalgia", "FM", "FMS", "fibromyalgia syndrome"],
    supports: ["energy", "stretch"], progression: "gentle", flare: "cutback",
    followUps: [yn("start", "Have you been mostly inactive lately?", { startSmall: true })],
    plan: ["Low-impact cardio like walking, a bike or water exercise, plus light strength work.", "Start very small, even 3 to 5 minutes, and add a little at a time.", "Gentle stretching before and after."],
    tips: ["Pain can rise a little when you start. Doing it gently and regularly usually brings it down.", "During a flare, cut back slightly instead of stopping."],
    sources: [S_("Macfarlane et al. 2016, EULAR fibromyalgia recommendations", "https://doi.org/10.1136/annrheumdis-2016-209724"), S_("Kaiser Permanente: exercise and fibromyalgia", "https://healthy.kaiserpermanente.org/health-wellness/health-encyclopedia/he.Exercise-and-Fibromyalgia.hw195866")]
  },
  {
    id: "lupus", name: "Lupus (SLE)", tags: ["lupus", "SLE", "systemic lupus erythematosus", "lupus erythematosus"],
    supports: ["energy"], progression: "build", flare: "pause",
    followUps: [
      yn("sun", "Does sunlight make your symptoms worse?", { supports: ["sun"] }),
      yn("joints", "Are some joints painful or swollen right now?", { supports: ["joints"] }),
      yn("organs", "Has lupus affected your heart or lungs?", { clearance: true })
    ],
    plan: ["Moderate cardio and strength work, tailored to how you feel.", "Low-impact choices when joints are sore."],
    tips: ["If sun sets you off, exercise indoors or early or late in the day."],
    sources: [S_("Parodis et al. 2024, EULAR non-drug management of lupus", "https://ard.bmj.com/content/83/6/720.abstract"), S_("Blaess et al. 2024, exercise recommendations for lupus", "https://rmdopen.bmj.com/content/rmdopen/10/2/e004171.full.pdf")]
  },
  {
    id: "mecfs", name: "ME/CFS (chronic fatigue syndrome)", tags: ["ME/CFS", "CFS", "ME", "chronic fatigue syndrome", "myalgic encephalomyelitis", "SEID"],
    supports: ["energy", "pace"], progression: "pace", flare: "pace", clearance: "Talk with the doctor or team who looks after your ME/CFS before adding exercise.",
    followUps: [],
    plan: ["No fixed step-by-step increases. Short, gentle sessions that stay well inside your energy.", "Stop while you still feel OK.", "Rest days whenever you need them."],
    tips: ["The app never raises weights or time on its own for you.", "A day or two after activity is when a crash shows. Use the energy check to steer."],
    sources: [S_("NICE NG206, ME/CFS guideline (2021)", "https://www.nice.org.uk/guidance/ng206")]
  },
  {
    id: "longcovid", name: "Long COVID", tags: ["long COVID", "post-COVID", "post COVID condition", "PASC", "long haul COVID", "long hauler"],
    supports: ["energy"], progression: "build", flare: "cutback",
    followUps: [
      yn("pem", "Does activity make you feel much worse a day or two later?", { supports: ["pace"], progression: "pace", flare: "pace" }),
      yn("heart", "Do you get chest pain, a racing heart, or breathlessness that's unusual for you?", { clearance: true })
    ],
    plan: ["If activity doesn't make you worse later: gentle cardio and strength, building slowly.", "If it does: pace instead. No fixed increases, stay well inside your energy."],
    tips: ["Answer the follow-up questions honestly. They decide whether the plan builds up or paces."],
    sources: [S_("NICE NG206, ME/CFS guideline (2021)", "https://www.nice.org.uk/guidance/ng206"), S_("ACSM preparticipation screening (Riebe 2015)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7059860/")]
  },
  {
    id: "osteo", name: "Osteoporosis or osteopenia", tags: ["osteoporosis", "osteopenia", "low bone density", "thin bones", "brittle bones"],
    supports: ["spine"], progression: "build", flare: "cutback",
    followUps: [
      yn("fracture", "Have you broken a bone in your spine, or broken bones from small falls?", { supports: ["balance"], noJump: true }),
      yn("falls", "Have you fallen in the past year?", { supports: ["balance"] })
    ],
    plan: ["Strength work twice a week for all the big muscles, 8–12 reps.", "Balance practice most days.", "Bend at your hips and knees, not your spine."],
    tips: ["Avoid fast, repeated, weighted or all-the-way bending and twisting of your spine.", "Avoid lifting weights up from the floor.", "After a spine fracture, keep impact to about brisk walking."],
    sources: [S_("Osteoporosis Canada: Too Fit To Fracture", "https://osteoporosis.ca/too-fit-to-fracture/"), S_("Brooke-Wavell et al. 2022, UK consensus on exercise for osteoporosis", "https://pubmed.ncbi.nlm.nih.gov/35577538/")]
  },
  {
    id: "ra", name: "Rheumatoid arthritis", tags: ["RA", "rheumatoid arthritis", "rheumatoid", "inflammatory arthritis", "spondyloarthritis", "ankylosing spondylitis", "psoriatic arthritis"],
    supports: ["energy", "joints"], progression: "build", flare: "cutback",
    followUps: [yn("hands", "Are your hands or wrists painful?", { supports: ["grip"], injuries: ["wrists"] })],
    plan: ["The usual adult guidelines apply, tailored to your joints: cardio most days and strength twice a week.", "Low-impact choices when joints are sore."],
    tips: ["On a flare day, keep moving gently but go easy on hot, swollen joints."],
    sources: [S_("Rausch Osthoff et al. 2018, EULAR physical activity in arthritis", "https://doi.org/10.1136/annrheumdis-2018-213585"), S_("EULAR 2025 update", "https://doi.org/10.1016/j.ard.2026.03.006")]
  },
  {
    id: "oa", name: "Osteoarthritis", tags: ["OA", "osteoarthritis", "arthritis", "knee arthritis", "hip arthritis", "degenerative joint disease", "wear and tear arthritis"],
    supports: ["joints"], progression: "build", flare: "cutback",
    followUps: [
      yn("knees", "Is it in your knees?", { injuries: ["knees"] }),
      yn("hips", "Is it in your hips?", { injuries: ["hips"] }),
      yn("hands", "Is it in your hands?", { supports: ["grip"] })
    ],
    plan: ["The usual adult guidelines apply: cardio most days and strength twice a week, low impact.", "Strong muscles around a sore joint take load off it."],
    tips: ["Some ache while exercising is common. If a joint is worse the next day, go lighter next time."],
    sources: [S_("Rausch Osthoff et al. 2018, EULAR physical activity in arthritis", "https://doi.org/10.1136/annrheumdis-2018-213585"), S_("EULAR 2025 update", "https://doi.org/10.1016/j.ard.2026.03.006")]
  },
  {
    id: "t2d", name: "Type 2 diabetes", tags: ["type 2 diabetes", "T2D", "diabetes", "diabetic", "type II diabetes", "adult onset diabetes"],
    supports: [], progression: "build", flare: "cutback",
    clearance: "If you aren't exercising regularly yet, check with your doctor before starting, then begin light to moderate.",
    followUps: [
      yn("insulin", "Do you take insulin, or a pill that can cause low blood sugar (like glipizide or glyburide)?", { tip: "Carry fast sugar (juice, glucose tabs) when you exercise, and check your blood sugar before and after, as your doctor advised." }),
      yn("feet", "Are your feet numb or tingly?", { supports: ["numbFeet"], tip: "Check your feet every day for blisters or sores, and wear well-fitting shoes." }),
      yn("eyes", "Do you have diabetes-related eye problems?", { clearance: true, tip: "Ask your eye doctor before heavy lifting or holding your breath while straining." })
    ],
    plan: ["Cardio most days (150 minutes a week) and strength 2–3 days a week.", "Break up long sitting with short movement breaks."],
    tips: ["Strength training helps blood sugar a lot. Heavier work can help more once you're used to it."],
    sources: [S_("Kanaley et al. 2022, ACSM consensus on type 2 diabetes", "https://doi.org/10.1249/MSS.0000000000002800"), S_("ACSM preparticipation screening (Riebe 2015)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7059860/")]
  }
];
export const conditionById = id => CONDITIONS.find(c => c.id === id) || null;

// Everything a person's choices add up to. rec: { conditions: [ids], answers: { "<cond>.<q>": "yes"|"no" }, symptoms: [], fn: {} }.
// When conditions disagree, the safest rule wins: pace beats gentle beats build; pace beats pause beats cutback.
export function effectsOf(rec) {
  const out = { supports: new Set(), limits: new Set(), injuries: new Set(), progression: null, flare: null, clearance: [], tips: [], plan: [], conditions: [], startSmall: false };
  if (!rec) return out;
  const prog = ["build", "gentle", "pace"], flare = ["cutback", "pause", "pace"];
  const pick = (cur, v, order) => (v && (!cur || order.indexOf(v) > order.indexOf(cur)) ? v : cur);
  for (const id of rec.conditions || []) {
    const c = conditionById(id); if (!c) continue;
    out.conditions.push(c);
    c.supports.forEach(s => out.supports.add(s));
    out.progression = pick(out.progression, c.progression, prog); out.flare = pick(out.flare, c.flare, flare);
    if (c.clearance) out.clearance.push(c.clearance);
    out.tips.push(...c.tips); out.plan.push(...c.plan);
    for (const f of c.followUps) {
      const e = f.effects[(rec.answers || {})[`${id}.${f.id}`]]; if (!e) continue;
      (e.supports || []).forEach(s => out.supports.add(s));
      (e.injuries || []).forEach(a => out.injuries.add(a));
      out.progression = pick(out.progression, e.progression, prog); out.flare = pick(out.flare, e.flare, flare);
      if (e.clearance) out.clearance.push(`${c.name}: check with your doctor before starting, and before anything strenuous.`);
      if (e.tip) out.tips.push(e.tip);
      if (e.noJump) out.limits.add("noImpact");
      if (e.startSmall) out.startSmall = true;
    }
  }
  (rec.symptoms || []).forEach(s => { if (SUPPORTS[s]) out.supports.add(s); });
  const fn = rec.fn || {};
  if (fn.pem === "yes") { out.supports.add("pace"); out.progression = "pace"; out.flare = pick(out.flare, "pace", flare); }
  if (fn.aid === "cane" || fn.aid === "walker") out.supports.add("balance");
  if (fn.aid === "wheelchair") out.seated = true;
  if (fn.floor === "no") out.limits.add("noFloor");
  if (out.supports.has("pace")) out.progression = "pace";
  if (out.supports.size || out.conditions.length) out.supports.add("energy");
  for (const s of out.supports) (SUPPORT_LIMITS[s] || []).forEach(l => out.limits.add(l));
  out.clearance = [...new Set(out.clearance)]; out.tips = [...new Set(out.tips)];
  return out;
}
// The energy check: what a day's answer changes. Numbers are GymBunnies.fit defaults, not research figures.
export const ENERGY = {
  good: { label: "Good", sets: 0, weight: 1, text: "" },
  soso: { label: "So-so", sets: -1, weight: 1, text: "One less set of each move today, same weights. Keep cardio easy." },
  low: { label: "Low", sets: -2, weight: 0.8, text: "Light day: at most two sets of each, about 80% of your usual weights, short easy cardio. Skip anything that doesn't feel right." },
  flare: { label: "Flare-up", sets: -9, weight: 0.6, text: "" }
};
