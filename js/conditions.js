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
  joints: "Painful or swollen joints",
  seated: "I exercise seated",
  recumbent: "Dizzy or faint when I'm upright",
  breath: "Don't hold my breath while lifting",
  endRange: "Loose or unstable joints",
  secure: "Seizures",
  cold: "Cold air sets off my breathing",
  bathroom: "I need a bathroom close by",
  skin: "My skin breaks down easily",
  glucose: "Blood sugar swings with exercise",
  fistula: "Dialysis fistula or graft in my arm"
};
// Symptoms anyone can pick, with or without a condition.
export const SYMPTOMS = ["heat", "energy", "stretch", "grip", "numbFeet", "footDrop", "sun", "pace", "recumbent", "breath", "endRange", "cold", "bathroom"];
// What each support asks the plan builder to avoid (keys from js/tailor.js LIMITS).
export const SUPPORT_LIMITS = {
  balance: ["balance"], grip: ["grip"], footDrop: ["balance", "noImpact"], numbFeet: ["noImpact", "balance"],
  pace: ["noImpact"], spine: ["noSpineFlex", "noImpact"], joints: ["noImpact"],
  seated: ["seated", "noFloor"], recumbent: ["seated", "noFloor"], endRange: ["noEndRange", "noImpact"], secure: ["secureLoad"]
};
// A short, practical tip for each support, shown on the Workout tab.
export const SUPPORT_TIPS = {
  breath: "Breathe out as you push or pull. Don't hold your breath while straining.",
  cold: "In cold, dry air, cover your mouth and nose with a scarf, or train indoors.",
  bathroom: "Pick workouts and routes with a bathroom close by. Short sets with breaks are fine.",
  skin: "Check your skin after exercise for red spots that don't fade, blisters or sores.",
  glucose: "Check your blood sugar before and after, and keep fast sugar with you.",
  fistula: "Use your fistula arm, but no weight, band or pressure on it.",
  secure: "Choose machines over free weights held over your face or head, and train with someone nearby.",
  recumbent: "Cardio seated or lying back: a recumbent bike, rowing machine or swimming. Get up slowly.",
  seated: "Seated cardio: an arm bike, hand cycling, seated marches, or pushing your chair.",
  endRange: "Stay mid-range: don't lock joints or sink into the deepest part of a stretch."
};
// Balance practice: the four CDC STEADI stances, then Otago's one-leg stand without support. Hold each for 10 seconds
// (STEADI and Otago); move up when you can hold it steady. Otago: 3 times a week, more if you like.
export const BALANCE_LEVELS = [
  ["Feet side by side", "Stand with your feet side by side, next to a counter. Hold for 10 seconds without moving your feet."],
  ["Half step", "Put the instep of one foot against the big toe of the other. Hold for 10 seconds, then switch feet."],
  ["Heel to toe", "One foot right in front of the other, heel touching toe. Hold for 10 seconds, then switch feet."],
  ["One leg, holding on", "Stand on one leg with a hand on the counter. Hold for 10 seconds, then the other leg."],
  ["One leg, no hands", "Stand on one leg next to the counter without holding on. Work up to 30 seconds each leg."]
];
export const BALANCE_PER_WEEK = 3; // Otago Exercise Programme
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
    supports: ["energy", "stretch"], sets: [1, 3], progression: "build", flare: "pause",
    followUps: [
      yn("heat", "Does heat (warm rooms, hot weather, a hard workout) bring your symptoms back for a while?", { supports: ["heat"] }),
      yn("balance", "Is your balance shaky?", { supports: ["balance"] }),
      yn("hands", "Are your hands numb, weak or clumsy?", { supports: ["grip"] }),
      yn("foot", "Does a foot drag or catch when you walk?", { supports: ["footDrop"] })
    ],
    plan: ["Strength 2–3 days a week with a rest day between, 1–3 sets of 8–15 reps.", "Cardio 2–3 days a week, building from 10 to 30 minutes at a pace you can talk through.", "Daily stretching for stiff muscles. Balance practice next to something sturdy."],
    tips: ["Train when your energy is best, often in the morning.", "Heat-related symptoms usually settle within an hour of cooling down. If one lasts more than 24 hours, call your MS team.", "Judge effort by feel. Heart rate can be off with MS."],
    sources: [S_("Kalb et al. 2020, National MS Society recommendations", "https://doi.org/10.1177/1352458520915629"), S_("Kim et al. 2019, exercise guidelines for MS", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6586489/"), S_("MS Trust: heat sensitivity", "https://mstrust.org.uk/node/870"), S_("MS Australia: exercise and MS", "https://msaustralia.org.au/publication/exercise-and-ms")]
  },
  {
    id: "fibro", name: "Fibromyalgia", tags: ["fibro", "fibromyalgia", "FM", "FMS", "fibromyalgia syndrome"],
    supports: ["energy", "stretch"], progression: "gentle", flare: "cutback",
    followUps: [yn("start", "Have you been mostly inactive lately?", { startSmall: true })],
    plan: ["Low-impact cardio like walking, a bike or water exercise, plus light strength work.", "Start very small and add a little at a time.", "Gentle stretching before and after."],
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
    supports: ["spine"], sets: [1, 3], progression: "build", flare: "cutback",
    followUps: [
      yn("fracture", "Have you broken a bone in your spine, or broken bones from small falls?", { supports: ["balance"], noJump: true }),
      yn("falls", "Have you fallen in the past year?", { supports: ["balance"] })
    ],
    plan: ["Strength work twice a week for all the big muscles, 8–12 reps. Start with 1 set and build to 2 or 3.", "Balance practice every day, 15–20 minutes.", "Bend at your hips and knees, not your spine."],
    tips: ["Avoid fast, repeated, weighted or all-the-way bending and twisting of your spine.", "Avoid lifting weights up from the floor.", "After a spine fracture, keep impact to about brisk walking."],
    sources: [S_("Osteoporosis Canada: Too Fit To Fracture", "https://osteoporosis.ca/wp-content/uploads/2014-07-25-Are-you-too-fit-to-fracture-for-patients.pdf"), S_("Giangregorio et al. 2014, Too Fit To Fracture recommendations", "https://pubmed.ncbi.nlm.nih.gov/24281053/"), S_("Brooke-Wavell et al. 2022, UK consensus on exercise for osteoporosis", "https://pubmed.ncbi.nlm.nih.gov/35577538/")]
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
    supports: [], sets: [1, 3], progression: "build", flare: "cutback",
    clearance: "If you aren't exercising regularly yet, check with your doctor before starting, then begin light to moderate.",
    followUps: [
      yn("insulin", "Do you take insulin, or a pill that can cause low blood sugar (like glipizide or glyburide)?", { tip: "Carry fast sugar (juice, glucose tabs) when you exercise, and check your blood sugar before and after, as your doctor advised." }),
      yn("feet", "Are your feet numb or tingly?", { supports: ["numbFeet"], tip: "Check your feet every day for blisters or sores, and wear well-fitting shoes." }),
      yn("eyes", "Do you have diabetes-related eye problems?", { clearance: true, tip: "Ask your eye doctor before heavy lifting or holding your breath while straining." })
    ],
    plan: ["Cardio most days (150 minutes a week) and strength 2–3 days a week: 1–3 sets of 10–15 reps, moving to 8–10 heavier reps later.", "Break up long sitting with short movement breaks."],
    tips: ["Strength training helps blood sugar a lot. Heavier work can help more once you're used to it."],
    sources: [S_("Kanaley et al. 2022, ACSM consensus on type 2 diabetes", "https://doi.org/10.1249/MSS.0000000000002800"), S_("Colberg et al. 2016, ADA position statement on exercise", "https://doi.org/10.2337/dc16-1728"), S_("ACSM preparticipation screening (Riebe 2015)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7059860/")]
  },
  {
    id: "htn", name: "High blood pressure (hypertension)", tags: ["high blood pressure", "hypertension", "HBP", "HTN", "elevated blood pressure", "blood pressure"],
    supports: ["breath"], sets: [1, 3], progression: "build", flare: "cutback",
    followUps: [
      yn("control", "Is your blood pressure under control right now?", {}, { clearance: "Blood pressure not under control: check with your doctor before starting. Don't exercise when your resting blood pressure is 200/110 or higher." }),
      yn("beta", "Do you take a beta blocker (like metoprolol or atenolol)?", { tip: "Beta blockers keep your heart rate low, so judge effort by feel: you can talk, but not sing." })
    ],
    plan: ["Cardio most days, 30 minutes or more at a moderate pace (about 150 minutes a week).", "Strength 2–3 days a week at a moderate weight, 8–12 reps. One set works; 2–3 sets may work better.", "Steady holds like a wall sit or a hand grip are another option, 2–3 times a week."],
    tips: ["Cool down slowly. Stopping suddenly can make you dizzy."],
    stop: ["Chest pain or pressure", "A severe headache", "Dizziness or blurred vision"],
    sources: [S_("Pescatello et al. 2015, exercise for hypertension", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4589552"), S_("NCHPAD: hypertension (ACSM resting limit 200/110)", "https://www.nchpad.org/77/584/Hypertension"), S_("Sharman et al. 2019, ESSA position statement on hypertension", "https://doi.org/10.1038/s41371-019-0266-z")]
  },
  {
    id: "t1d", name: "Type 1 diabetes", tags: ["type 1 diabetes", "T1D", "T1DM", "juvenile diabetes", "insulin dependent diabetes", "diabetes type 1", "LADA"],
    supports: ["glucose"], sets: [1, 3], progression: "build", flare: "cutback",
    followUps: [
      yn("lows", "Do you often go low during or after exercise?", { tip: "Plan it with your diabetes team: less insulin beforehand or a small snack can help. Lows can show up hours later, even overnight." }),
      yn("feet", "Are your feet numb or tingly?", { supports: ["numbFeet", "skin"] }),
      yn("eyes", "Do you have diabetes-related eye problems?", { clearance: true, supports: ["breath"] })
    ],
    plan: ["Cardio most days (about 150 minutes a week) and strength 2–3 days a week.", "Check your blood sugar before, during longer sessions, and after."],
    tips: ["For cardio up to an hour, a starting blood sugar around 7–10 mmol/L (126–180 mg/dL) is a common target. Your diabetes team can set yours.", "If your ketones are 1.5 mmol/L or higher, don't exercise until they're sorted.", "Lifting and hard intervals can push blood sugar up for a while. Steady cardio tends to bring it down.", "Carry fast sugar and diabetes ID."],
    stop: ["Shaky, sweaty, confused or weak (a low): stop and treat it"],
    sources: [S_("Riddell et al. 2017, consensus on exercise in type 1 diabetes", "https://doi.org/10.1016/S2213-8587(17)30014-1"), S_("Colberg et al. 2016, ADA position statement on exercise", "https://doi.org/10.2337/dc16-1728")]
  },
  {
    id: "pots", name: "POTS (postural tachycardia)", tags: ["POTS", "postural orthostatic tachycardia syndrome", "postural tachycardia", "dysautonomia", "orthostatic intolerance", "orthostatic tachycardia"],
    supports: ["energy"], sets: [3, 3], progression: "gentle", flare: "cutback",
    followUps: [
      yn("upright", "Do you get dizzy or faint when you stand for a while?", { supports: ["recumbent"] }),
      yn("months", "Have you done 3 months or more of seated or lying-back cardio?", { tip: "Next step: an upright bike, then upright cardio, adding a little at a time." }, { supports: ["recumbent"], tip: "Start with seated or lying-back cardio only: a recumbent bike, rowing machine or swimming." })
    ],
    plan: ["Cardio seated or lying back for the first few months, starting with a few minutes and adding a little each week.", "Seated strength 2 times a week: leg press, leg curl, leg extension, calf raise, chest press, seated row.", "Move to upright exercise slowly, over months."],
    tips: ["Drink water before and during. Ask your doctor about salt.", "It often feels harder at first and gets easier with training.", "Cool down slowly. Sit or lie down with your legs up if you feel faint."],
    stop: ["Feeling faint: sit or lie down with your legs up"],
    sources: [S_("CHOP Modified Dallas POTS exercise program", "https://www.dysautonomiainternational.org/pdf/CHOP_Modified_Dallas_POTS_Exercise_Program.pdf"), S_("Dysautonomia International: exercise", "https://www.dysautonomiainternational.org/page.php?ID=43")]
  },
  {
    id: "pd", name: "Parkinson's disease", tags: ["Parkinson's", "Parkinsons", "PD", "parkinsonism", "parkinson disease"],
    supports: ["energy", "stretch"], sets: [1, 3], progression: "build", flare: "cutback", balance: true,
    followUps: [
      yn("falls", "Have you fallen, or nearly fallen, in the past year?", { supports: ["balance"] }),
      yn("freeze", "Do your feet ever freeze or get stuck?", { supports: ["balance"], tip: "If you freeze, stop, shift your weight, and step to a beat or over a line on the floor." })
    ],
    plan: ["Cardio 3 days a week, 30 minutes or more, hard enough to breathe harder.", "Strength 2–3 days a week, not on back-to-back days, 10–15 reps. Start with 1 set and build to 3.", "Balance, agility and doing-two-things-at-once practice 2–3 days a week, daily if you can.", "Stretching 2–3 days a week, daily is best."],
    tips: ["Exercise when your medicine is working well (your \"on\" times).", "Big, deliberate movements help. Think big on every rep."],
    sources: [S_("Parkinson's Foundation and ACSM exercise recommendations", "https://www.parkinson.org/blog/awareness/exercise-recommendations"), S_("Parkinson's Foundation exercise guidelines", "https://www.parkinson.org/sites/default/files/Exercise-Guidelines.pdf"), S_("Exercise is Medicine: Parkinson's (start with 1 set, build to 3)", "https://eloncdn.blob.core.windows.net/eu3/sites/969/2019/11/EIM_Rx-for-Health_Parkinsons-Disease.pdf")]
  },
  {
    id: "sci", name: "Spinal cord injury", tags: ["SCI", "spinal cord injury", "paraplegia", "paraplegic", "tetraplegia", "quadriplegia", "spinal injury"],
    supports: ["seated", "skin"], sets: [3, 3], progression: "build", flare: "cutback", minutes: 40,
    followUps: [
      yn("high", "Is your injury at T6 or higher?", { clearance: "Spinal cord injury at T6 or above: know the signs of autonomic dysreflexia (pounding headache, flushing or sweating above the injury) and empty your bladder before exercise.", stop: ["Pounding headache, flushing or sweating above your injury: stop, sit upright, and check bladder, bowel, skin and clothing"] }),
      yn("legs", "Can you move your legs against resistance?", {}, { limits: ["noLegs"] })
    ],
    plan: ["For fitness: 20 minutes or more of moderate to hard cardio, 2 times a week.", "Strength 2 times a week: 3 sets of 8–10 reps for each muscle group you can use.", "For heart and metabolic health: 30 minutes of cardio, 3 times a week."],
    tips: ["Balance pushing with pulling (rows, pulldowns) to protect your shoulders.", "You may not sweat below your injury, so keep cool and drink water."],
    sources: [S_("Martin Ginis et al. 2018, exercise guidelines for adults with SCI", "https://doi.org/10.1038/s41393-017-0017-3")]
  },
  {
    id: "cancer", name: "Cancer (during or after treatment)", tags: ["cancer", "cancer survivor", "chemotherapy", "chemo", "radiation therapy", "oncology", "breast cancer", "prostate cancer", "colon cancer", "lymphoma", "leukemia"],
    supports: ["energy"], sets: [2, 2], progression: "gentle", flare: "cutback", minutes: 90,
    followUps: [
      yn("treat", "Are you in treatment now (chemo, radiation, or recent surgery)?", { clearance: "During cancer treatment: check with your care team before starting, especially after surgery or if your blood counts are low.", startSmall: true }),
      yn("lymph", "Do you have, or are you at risk of, lymphedema (swelling in an arm or leg)?", { tip: "Strength training doesn't make lymphedema worse when you build up gradually. Start light and add weight slowly." }),
      yn("bone", "Has cancer spread to your bones?", { clearance: "If cancer has spread to your bones: ask your care team which movements and weights are safe before lifting.", supports: ["spine"] }),
      yn("nerves", "Do you have numbness or tingling from treatment?", { supports: ["numbFeet", "grip"] })
    ],
    plan: ["Cardio 3 times a week, 30 minutes at a moderate pace.", "Strength 2 times a week: 2 sets of 8–15 reps for the big muscles.", "Any activity helps. On hard days, a short walk counts."],
    tips: ["Fatigue is common. The energy check lightens the day when you need it."],
    sources: [S_("Campbell et al. 2019, ACSM exercise guidelines for cancer survivors", "https://doi.org/10.1249/MSS.0000000000002116"), S_("ACSM cancer exercise guidelines (infographic)", "https://www.acsm.org/docs/default-source/files-for-resource-library/exercise-guidelines-cancer-infographic.pdf")]
  },
  {
    id: "preg", name: "Pregnancy or postpartum", tags: ["pregnant", "pregnancy", "postpartum", "post partum", "after birth", "new mom", "prenatal", "antenatal", "expecting"],
    supports: ["energy"], progression: "build", flare: "cutback",
    clearance: "Check with your doctor or midwife before starting or continuing exercise in pregnancy, and after giving birth.",
    followUps: [
      { id: "stage", q: "Where are you now?", options: [["early", "Pregnant, under 20 weeks"], ["late", "Pregnant, 20 weeks or more"], ["post", "Had a baby this past year"]],
        effects: { early: {}, late: { limits: ["noSupine", "noImpact"], supports: ["balance"] }, post: { startSmall: true, tip: "Come back gradually, as your doctor or midwife advises. Pelvic floor exercises can start early; build back to jumping and running slowly." } } },
      yn("limit", "Have you been told to limit activity this pregnancy?", { clearance: "You've been told to limit activity: follow your doctor's or midwife's advice before using this plan.", progression: "pace" })
    ],
    plan: ["About 150 minutes a week of moderate activity, spread across the week.", "Strength training with moderate weights is fine for most pregnancies.", "Pelvic floor exercises most days."],
    tips: ["After about 20 weeks, avoid lying flat on your back for long.", "Skip contact sports, anything with a high chance of falling, and exercising in heat and humidity.", "Drink plenty, and stop if you overheat."],
    stop: ["Bleeding or fluid leaking", "Regular painful contractions", "Dizziness, chest pain or a headache", "Breathless before you start", "Calf pain or swelling", "The baby moving less"],
    sources: [S_("ACOG Committee Opinion 804, exercise in pregnancy and postpartum (2020)", "https://pubmed.ncbi.nlm.nih.gov/33481513/")]
  },
  {
    id: "stroke", name: "Stroke", tags: ["stroke", "CVA", "cerebrovascular accident", "TIA", "mini stroke", "hemiparesis", "hemiplegia", "post-stroke"],
    supports: ["energy"], sets: [1, 3], progression: "build", flare: "cutback", balance: true, minutes: 60,
    clearance: "After a stroke, talk with your doctor before starting harder exercise.",
    followUps: [
      yn("side", "Is one side of your body weaker?", { supports: ["balance", "grip"], tip: "Work both sides, at the weaker side's pace." }),
      yn("chair", "Do you use a wheelchair most of the time?", { supports: ["seated"] }),
      yn("falls", "Have you fallen in the past year?", { supports: ["balance"] })
    ],
    plan: ["Cardio 3–5 days a week, 20–60 minutes at a light to moderate pace. Several 10-minute bouts count.", "Strength 2–3 days a week: 1–3 sets of 10–15 reps.", "Stretching and balance practice 2–3 days a week."],
    tips: ["Tiredness after a stroke is common. Use the energy check."],
    stop: ["Face drooping, arm weakness or slurred speech: call 911"],
    sources: [S_("Billinger et al. 2014, AHA/ASA physical activity after stroke", "https://doi.org/10.1161/STR.0000000000000022"), S_("Stroke physical activity recommendations (table)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6124986/table/table2-1559827616633683")]
  },
  {
    id: "heart", name: "Heart disease or heart failure", tags: ["heart disease", "coronary artery disease", "CAD", "heart attack", "MI", "heart failure", "CHF", "angina", "cardiac", "stent", "bypass", "CABG", "atrial fibrillation", "AFib"],
    supports: ["breath", "energy"], sets: [1, 1], progression: "gentle", flare: "cutback",
    clearance: "Heart conditions: get your doctor's OK before starting. A cardiac rehab program is the best place to begin.",
    followUps: [
      yn("rehab", "Have you finished cardiac rehab?", {}, { tip: "Ask your doctor about cardiac rehab. It's supervised and the best first step." }),
      yn("hf", "Do you have heart failure?", { tip: "Weigh yourself each morning. A gain of 2 to 3 lb in a day or 5 lb in a week is worth a call to your doctor before exercising." }),
      yn("beta", "Do you take a beta blocker?", { tip: "Beta blockers keep your heart rate low, so judge effort by feel." })
    ],
    plan: ["Cardio most days at a fairly light to somewhat hard effort: you can talk in full sentences.", "Strength 2 days a week to start: 1 set of 10–15 reps at a light weight, 8–10 exercises.", "A 15-minute warm-up and a 10-minute cool-down."],
    tips: [],
    stop: ["Chest pain, pressure or tightness: stop. If it doesn't ease with rest, call 911", "Unusual shortness of breath", "Dizziness or light-headedness", "A racing or irregular heartbeat", "Unusual tiredness"],
    sources: [S_("Williams et al. 2007, AHA: resistance exercise in heart disease", "https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.107.185214"), S_("Royal Free London NHS: cardiac rehab exercise (warm-up and cool-down)", "https://www.royalfree.nhs.uk/patients-and-visitors/patient-information-leaflets/cardiac-rehabilitation-exercise-programme"), S_("MedlinePlus: heart failure, fluids and weight", "https://medlineplus.gov/ency/patientinstructions/000112.htm"), S_("PCNA: exercise program for people with heart disease", "https://pcna.net/wp-content/uploads/2018/12/12e_exercise_program_for_individuals_with_heart_disease.pdf"), S_("Cambridge University Hospitals: cardiac rehab home exercise", "https://www.cuh.nhs.uk/patient-information/cardiac-rehabilitation-home-exercise-guidelines/")]
  },
  {
    id: "copd", name: "COPD or other lung disease", tags: ["COPD", "chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis", "lung disease", "pulmonary fibrosis", "ILD"],
    supports: ["energy", "breath"], progression: "build", flare: "cutback",
    followUps: [
      yn("oxygen", "Do you use oxygen?", { clearance: "If you use oxygen, ask your team about using it during exercise and what level to keep it at." }),
      yn("rehab", "Have you done pulmonary rehab?", {}, { tip: "Ask your doctor about pulmonary rehab. It's the best-studied way to start." })
    ],
    plan: ["Cardio 3–5 days a week. If you can't keep going for long, do intervals: short bursts with rests between.", "Strength 2–3 days a week, especially your legs.", "Short of breath is OK. Panicky is not. Aim for somewhat hard."],
    tips: ["Pursed-lip breathing: in through your nose, out slowly through pursed lips.", "Use your reliever inhaler before exercise if your doctor prescribed it that way."],
    stop: ["Chest pain", "Much more breathless than usual, or lips turning blue", "Dizziness"],
    sources: [S_("Gloeckl et al. 2013, exercise training in COPD (ERS)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC9487382/")]
  },
  {
    id: "ckd", name: "Kidney disease (CKD or dialysis)", tags: ["CKD", "chronic kidney disease", "kidney disease", "renal disease", "dialysis", "hemodialysis", "kidney failure", "ESRD", "kidney transplant"],
    supports: ["energy", "breath"], sets: [1, 2], progression: "gentle", flare: "cutback",
    followUps: [
      yn("fistula", "Do you have a fistula or graft in your arm for dialysis?", { supports: ["fistula"] }),
      yn("dialysis", "Are you on dialysis?", { tip: "Exercise on non-dialysis days, or during dialysis if your unit offers it, not right after a session." })
    ],
    plan: ["Work up to about 150 minutes a week of moderate activity, as you can.", "Start with 3–5 minute bouts and add a little at a time.", "Strength 2–3 days a week: 1–2 sets of 10–15 reps."],
    tips: [],
    sources: [S_("Italian Society of Nephrology consensus on exercise in CKD (2024)", "https://doi.org/10.1007/s40620-024-02049-9"), S_("Exercise is Medicine: being active with CKD", "https://acsm.org/wp-content/uploads/EIM_Being-Active-When-You-Have-Chronic-Kidney-Disease_Flyer_English.pdf")]
  },
  {
    id: "asthma", name: "Asthma", tags: ["asthma", "exercise-induced asthma", "EIB", "exercise-induced bronchoconstriction", "reactive airway", "wheezing"],
    supports: ["cold"], progression: "build", flare: "cutback",
    followUps: [yn("eib", "Does exercise set off your asthma?", { tip: "Warm up with intervals: a few short bursts with rests. Use your reliever about 15 minutes before exercise if your doctor prescribed it that way." })],
    plan: ["The usual adult guidelines apply: cardio most days, strength twice a week.", "An interval-style warm-up helps prevent symptoms."],
    tips: ["Skip outdoor workouts on high pollution or pollen days.", "Keep your reliever inhaler with you."],
    stop: ["Wheezing or a tight chest that your reliever doesn't fix: get help"],
    sources: [S_("Parsons et al. 2013, ATS guideline on exercise-induced bronchoconstriction", "https://www.thoracic.org/statements/resources/allergy-asthma/exercise-induced-bronchoconstriction.pdf")]
  },
  {
    id: "lbp", name: "Chronic low back pain", tags: ["back pain", "low back pain", "lower back pain", "LBP", "sciatica", "herniated disc", "slipped disc", "bulging disc", "degenerative disc", "lumbar"],
    supports: [], progression: "build", flare: "cutback", injuries: ["lowerBack"],
    followUps: [
      yn("leg", "Does pain run down one leg (sciatica)?", { tip: "If leg pain gets worse or spreads, or you get new numbness or weakness, see your doctor." }),
      yn("heavy", "Does lifting heavy things set it off?", { limits: ["noSpine"] })
    ],
    plan: ["Any exercise you'll keep doing helps: strength work, walking, Pilates or yoga.", "Staying active works better than resting it."],
    tips: ["Some discomfort is OK. If it's worse the next day, go lighter next time.", "Keep moving on bad days, just less."],
    stop: ["Numbness around your groin or bottom, or trouble peeing or controlling your bowels: get emergency care"],
    sources: [S_("NICE NG59, low back pain and sciatica", "https://www.nice.org.uk/guidance/ng59")]
  },
  {
    id: "eds", name: "Hypermobility or Ehlers-Danlos (hEDS, HSD)", tags: ["EDS", "hEDS", "Ehlers-Danlos", "Ehlers Danlos syndrome", "hypermobility", "hypermobile", "HSD", "hypermobility spectrum disorder", "joint hypermobility", "double jointed"],
    supports: ["endRange", "energy"], progression: "gentle", flare: "cutback", balance: true,
    followUps: [
      yn("dislocate", "Do joints slip out or dislocate?", { tip: "Machines and slow, controlled reps keep joints on a safe track." }),
      yn("dizzy", "Do you get dizzy or faint when you stand?", { supports: ["recumbent"] })
    ],
    plan: ["Strength work for the muscles around your joints, light to moderate, slow and controlled.", "Balance and body-position practice.", "Low-impact cardio: a bike, swimming or walking."],
    tips: ["Gentle moving stretches beat long holds at the end of your range."],
    sources: [S_("Russek & Simmonds, The Ehlers-Danlos Society: physical therapy for hEDS", "https://www.ehlers-danlos.com/wp-content/uploads/2022/03/Evidence-Based-Rationale-for-Physical-Therapy-Treatment-for-JHShEDS-S.pdf"), S_("Engelbert et al. 2017, physical therapy for hypermobility and hEDS", "https://doi.org/10.1002/ajmg.c.31545")]
  },
  {
    id: "cp", name: "Cerebral palsy", tags: ["CP", "cerebral palsy", "spastic diplegia", "hemiplegic CP", "spastic CP", "quadriplegic CP"],
    supports: ["stretch", "energy"], sets: [1, 4], progression: "build", flare: "cutback", balance: true, minutes: 60,
    followUps: [
      yn("chair", "Do you use a wheelchair most of the time?", { supports: ["seated"] }),
      yn("balance", "Is your balance shaky?", { supports: ["balance"] }),
      yn("hands", "Are your hands hard to grip with?", { supports: ["grip"] })
    ],
    plan: ["Cardio 3 times a week, 20 minutes or more, using big muscles.", "Strength 2–4 days a week, not on back-to-back days. Start with 1–2 sets of 10–15 reps; later 2–4 sets of 6–12.", "Move every day, and break up long sitting."],
    tips: ["It can take 8–16 weeks to feel the benefit. Keep at it.", "Stretch tight muscles after each workout."],
    sources: [S_("Verschuren et al. 2016, exercise recommendations for people with CP", "https://doi.org/10.1111/dmcn.13053"), S_("Savonia: Verschuren's strength progression for CP", "https://www.savonia.fi/en/articles/the-strategy-of-muscle-strength-training-in-children-with-spastic-cerebral-palsy/")]
  },
  {
    id: "limb", name: "Limb loss (amputation)", tags: ["amputation", "amputee", "limb loss", "limb difference", "prosthesis", "prosthetic leg", "prosthetic arm", "below knee amputation", "above knee amputation"],
    supports: ["skin"], progression: "build", flare: "cutback",
    followUps: [
      { id: "which", q: "Which limb?", options: [["leg", "A leg"], ["arm", "An arm"], ["more", "More than one"]],
        effects: { leg: { supports: ["balance"] }, arm: { supports: ["grip"] }, more: { supports: ["balance", "grip", "seated"] } } },
      yn("pros", "Do you exercise with a prosthesis?", { tip: "Check your skin every time you take the prosthesis off. Red marks that don't fade within 10 to 15 minutes, blisters or sores mean rest it and call your prosthetist." }, { tip: "Seated and lying moves are a good fit without a prosthesis." })
    ],
    plan: ["Strength for both sides evenly, plus your core and hips.", "Cardio most days. An arm bike works for everyone.", "Balance practice next to something sturdy."],
    tips: ["A steady weight helps your prosthesis keep fitting.", "Keep the residual limb clean and dry."],
    sources: [S_("Amputee Coalition: Skin Care 101", "https://amputee-coalition.org/?p=3187"), S_("The War Amps: keeping fit", "https://www.amputesdeguerre.ca/pdf/english-site/ways-we-help/health-and-well-being/keeping-fit.pdf")]
  },
  {
    id: "epilepsy", name: "Epilepsy or seizures", tags: ["epilepsy", "seizures", "seizure disorder", "convulsions"],
    supports: ["secure"], progression: "build", flare: "pause",
    followUps: [
      yn("recent", "Have you had a seizure in the past year?", { tip: "Train with a buddy who knows what to do if you have a seizure." }),
      yn("trig", "Do poor sleep, skipped meals or overheating set off seizures for you?", { tip: "Sleep well, eat beforehand, drink water, and don't push to exhaustion." })
    ],
    plan: ["The usual adult guidelines apply. Exercise may even help seizure control.", "Choose machines over free weights held over your face or head.", "A stationary bike or gym cardio is safer than road cycling."],
    tips: ["Never swim alone."],
    sources: [S_("Capovilla et al. 2016, ILAE Task Force on sports and epilepsy", "https://doi.org/10.1111/epi.13261")]
  },
  {
    id: "migraine", name: "Migraine", tags: ["migraine", "migraines", "chronic migraine", "headaches", "migraine with aura", "vestibular migraine"],
    supports: [], progression: "build", flare: "pause",
    followUps: [yn("trigger", "Can hard exercise set off a migraine for you?", { tip: "Warm up for 15 minutes, as in the trial, build up gradually, and skip all-out efforts until you know how you respond." })],
    plan: ["Cardio 3 times a week, about 40 minutes including a long warm-up. In a trial this prevented migraines about as well as a daily medicine.", "Strength work on other days."],
    tips: ["Drink water, eat before you train, and keep sleep regular.", "During an attack, rest. Come back when it's passed."],
    sources: [S_("Varkey et al. 2011, exercise as migraine prevention (randomized trial)", "https://doi.org/10.1177/0333102411419681"), S_("Lemmens et al. 2019, aerobic exercise and migraine (meta-analysis)", "https://doi.org/10.1186/s10194-019-0961-8")]
  },
  {
    id: "ibd", name: "Crohn's or colitis (IBD)", tags: ["IBD", "Crohn's", "Crohns", "Crohn's disease", "ulcerative colitis", "UC", "colitis", "inflammatory bowel disease"],
    supports: ["energy", "bathroom"], progression: "build", flare: "cutback",
    followUps: [
      yn("ostomy", "Do you have an ostomy?", { supports: ["spine"], tip: "Ask your stoma nurse about a support belt, and build core work slowly to lower the risk of a hernia." }),
      yn("bones", "Have you been told your bones are thin?", { supports: ["spine"] })
    ],
    plan: ["Light to moderate exercise is considered safe. Work up to about 150 minutes a week.", "Strength training helps keep muscle, especially in your legs.", "During a flare, switch to walking or light yoga."],
    tips: ["Drink extra water if you've had diarrhea."],
    sources: [S_("Crohn's and Colitis Canada: safe and effective exercise", "https://crohnsandcolitis.ca/About-Crohn-s-Colitis/IBD-Journey/Exercise-and-Lifestyle/Therapeutic-Monitoring"), S_("Exercise is Medicine: being active with IBD", "https://acsm.org/wp-content/uploads/EIM_Inflammatory-Bowel-Disease_Flyer_English.pdf")]
  },
  {
    id: "jointrep", name: "Hip or knee replacement", tags: ["joint replacement", "knee replacement", "hip replacement", "TKA", "TKR", "THA", "THR", "arthroplasty", "new knee", "new hip"],
    supports: ["joints"], progression: "build", flare: "cutback",
    followUps: [
      yn("knee", "Is it a knee?", { injuries: ["knees"] }),
      yn("hip", "Is it a hip?", { injuries: ["hips"], tip: "Follow any hip precautions your surgeon gave you (like how far to bend) until they say otherwise." }),
      yn("recent", "Was your surgery in the last 3 months?", { clearance: "Joint replacement in the last 3 months: follow your surgeon's and physical therapist's plan first.", startSmall: true })
    ],
    plan: ["Low-impact cardio: walking, cycling, swimming or an elliptical.", "Strength with light to moderate weights for the muscles around the new joint.", "The usual 150 minutes a week applies to you too."],
    tips: ["Skip running, jumping and contact sports. They wear a new joint out sooner."],
    sources: [S_("AAOS OrthoInfo: activities after knee replacement", "https://orthoinfo.aaos.org/en/recovery/activities-after-knee-replacement/")]
  },
  {
    id: "mood", name: "Depression or anxiety", tags: ["depression", "anxiety", "depressed", "anxious", "low mood", "panic attacks", "GAD", "MDD", "mental health", "stress"],
    supports: [], progression: "build", flare: "cutback",
    followUps: [yn("start", "Is getting started the hardest part right now?", { startSmall: true, tip: "Any amount counts, and gentle sessions still help." })],
    plan: ["Walking or jogging, yoga, and strength training helped most in the research.", "Harder sessions helped more, but gentle ones help too.", "A clear plan, and training with other people, both help."],
    tips: ["Exercise works alongside your treatment, not instead of it.", "If you're thinking about harming yourself, call or text 988 (in the US) or your local emergency number."],
    sources: [S_("Noetel et al. 2024, exercise for depression (BMJ)", "https://doi.org/10.1136/bmj-2023-075847"), S_("NICE NG222, depression in adults", "https://www.nice.org.uk/guidance/ng222")]
  }
];
export const conditionById = id => CONDITIONS.find(c => c.id === id) || null;

// Everything a person's choices add up to. rec: { conditions: [ids], answers: { "<cond>.<q>": "yes"|"no"|... }, symptoms: [], fn: {} }.
// When conditions disagree, the safest rule wins: pace beats gentle beats build; pace beats pause beats cutback;
// the fewest sets and the smallest weekly target win.
export function effectsOf(rec) {
  const out = { supports: new Set(), limits: new Set(), injuries: new Set(), progression: null, flare: null, clearance: [], tips: [], plan: [], stop: [], conditions: [], startSmall: false, seated: false, balance: false, minutes: 150, sets: null, setsFrom: [] };
  if (!rec) return out;
  const prog = ["build", "gentle", "pace"], flare = ["cutback", "pause", "pace"];
  const pick = (cur, v, order) => (v && (!cur || order.indexOf(v) > order.indexOf(cur)) ? v : cur);
  for (const id of rec.conditions || []) {
    const c = conditionById(id); if (!c) continue;
    out.conditions.push(c);
    c.supports.forEach(s => out.supports.add(s));
    (c.injuries || []).forEach(a => out.injuries.add(a));
    out.progression = pick(out.progression, c.progression, prog); out.flare = pick(out.flare, c.flare, flare);
    if (c.clearance) out.clearance.push(c.clearance);
    if (c.balance) out.balance = true;
    if (c.minutes) out.minutes = Math.min(out.minutes, c.minutes);
    if (c.sets) { out.sets = out.sets ? [Math.min(out.sets[0], c.sets[0]), Math.min(out.sets[1], c.sets[1])] : [...c.sets]; out.setsFrom.push(c.name); }
    out.tips.push(...c.tips); out.plan.push(...c.plan); out.stop.push(...(c.stop || []));
    for (const f of c.followUps) {
      const e = f.effects[(rec.answers || {})[`${id}.${f.id}`]]; if (!e) continue;
      (e.supports || []).forEach(s => out.supports.add(s));
      (e.injuries || []).forEach(a => out.injuries.add(a));
      (e.limits || []).forEach(l => out.limits.add(l));
      out.stop.push(...(e.stop || []));
      out.progression = pick(out.progression, e.progression, prog); out.flare = pick(out.flare, e.flare, flare);
      if (e.clearance) out.clearance.push(typeof e.clearance === "string" ? e.clearance : `${c.name}: check with your doctor before starting, and before anything strenuous.`);
      if (e.tip) out.tips.push(e.tip);
      if (e.noJump) out.limits.add("noImpact");
      if (e.startSmall) out.startSmall = true;
    }
  }
  (rec.symptoms || []).forEach(s => { if (SUPPORTS[s]) out.supports.add(s); });
  const fn = rec.fn || {};
  if (fn.pem === "yes") { out.supports.add("pace"); out.progression = "pace"; out.flare = pick(out.flare, "pace", flare); }
  if (fn.aid === "cane" || fn.aid === "walker") out.supports.add("balance");
  if (fn.aid === "wheelchair") out.supports.add("seated");
  if (fn.floor === "no") out.limits.add("noFloor");
  if (fn.legs === "no") { out.limits.add("noLegs"); out.supports.add("seated"); }
  if (fn.legs === "some") out.supports.add("balance");
  if (fn.arms === "no") out.limits.add("noArms");
  if (fn.arms === "one") out.tips.push("Use one-arm versions of moves: one dumbbell, one cable handle, or one side of a machine.");
  if (out.supports.has("pace")) out.progression = "pace";
  if (out.supports.size || out.conditions.length) out.supports.add("energy");
  if (out.supports.has("seated") || out.supports.has("recumbent")) out.seated = true;
  if (out.supports.has("balance")) out.balance = true;
  for (const s of out.supports) (SUPPORT_LIMITS[s] || []).forEach(l => out.limits.add(l));
  if (out.limits.has("noLegs")) out.seated = true;
  // Sets per exercise, [start, most], from the condition guidelines (the smallest wins). With no condition number, starting
  // small or pacing begins at a single set, which ACSM finds effective for people new to training (Garber 2011).
  if (out.sets && out.sets[0] > out.sets[1]) out.sets[0] = out.sets[1];
  if ((out.startSmall || out.progression === "pace") && (!out.sets || out.sets[0] > 1)) out.sets = [1, out.sets ? out.sets[1] : null];
  if (out.progression === "pace") out.minutes = null; // pacing: no weekly target to chase
  out.clearance = [...new Set(out.clearance)]; out.tips = [...new Set(out.tips)]; out.stop = [...new Set(out.stop)];
  return out;
}
// Tips for today, from the supports that are on (heat and sun are handled with their own wording on the Workout tab).
export const supportTips = eff => [...(eff?.supports || [])].map(s => SUPPORT_TIPS[s]).filter(Boolean);
// The energy check. No study gives a number for "a so-so day", so the check never invents one: a light day goes back to
// the starting sets from the person's guideline (or the single set ACSM finds effective), and weights are chosen by feel.
export const ENERGY = {
  good: { label: "Good", light: false, text: "" },
  soso: { label: "So-so", light: false, text: "Same plan today. Keep the effort moderate: you can talk, but not sing." },
  low: { label: "Low", light: true, text: "Light day: the starting number of sets for your guidelines, at a weight that feels light to moderate. Skip anything that doesn't feel right." },
  flare: { label: "Flare-up", light: true, text: "" }
};
// Sources for the numbers the app uses on its own (not tied to one condition).
export const GENERAL_SOURCES = [
  S_("Garber et al. 2011, ACSM position stand (sets, rest, stretching)", "https://pubmed.ncbi.nlm.nih.gov/21694556/"),
  S_("CDC STEADI 4-Stage Balance Test", "https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-4Stage-508.pdf"),
  S_("Otago Exercise Programme balance exercises", "https://www.med.unc.edu/aging/cgwep/files/2018/09/OtagoExercises.pdf")
];
