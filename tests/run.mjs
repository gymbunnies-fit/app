// Unit tests for the progress math, the week review and Delete my account. Run with:  node tests/run.mjs
// No packages needed. Copies the js/ modules into a temp folder as ES modules.
import { mkdtempSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "twp-"));
for (const f of readdirSync(join(here, "../js"))) if (f.endsWith(".js") && !["app.js", "firebase.js"].includes(f)) copyFileSync(join(here, "../js", f), join(dir, f));
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const S = await import(join(dir, "stats.js"));
const F = await import(join(dir, "fun.js"));
const { ALL_EX } = await import(join(dir, "plan.js"));
const { BUILTIN, STRETCH_BY_FOCUS } = await import(join(dir, "library.js"));
const { PLAN_SAFETY, safetyFor } = await import(join(dir, "safety.js"));
const { STRETCH } = await import(join(dir, "plan.js"));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
};
const yes = (name, v) => eq(name, !!v, true);

// ---- ranges
eq("range 3 × 10–12", S.parseRange("3 × 10–12"), { sets: 3, min: 10, max: 12 });
eq("range per leg", S.parseRange("3 × 8 per leg"), { sets: 3, min: 8, max: 8 });
eq("range seconds", S.parseRange("3 × 20–30 sec"), { sets: 3, min: 20, max: 30 });
eq("range max", S.parseRange("3 × max"), { sets: 3, min: null, max: null });
eq("range hyphen", S.parseRange("4 × 8-10"), { sets: 4, min: 8, max: 10 });

// ---- dates and cycles
eq("monday of a Sunday", S.mondayOf("2026-10-04"), "2026-09-28");
eq("monday of a Monday", S.mondayOf("2026-09-28"), "2026-09-28");
eq("days across DST end", S.daysBetween("2026-10-31", "2026-11-02"), 2);
eq("days across DST start", S.daysBetween("2027-03-13", "2027-03-15"), 2);
eq("week A first week", S.cycleInfo("2026-09-30", "2026-09-28").week, "A");
eq("week B second week", S.cycleInfo("2026-10-07", "2026-09-28").week, "B");
eq("week A third week", S.cycleInfo("2026-10-12", "2026-09-28").week, "A");
eq("cycle across new year", S.cycleInfo("2027-01-11", "2026-09-28"), { index: 7, start: "2027-01-04", end: "2027-01-17", week: "B" });
eq("before cycle start", S.cycleInfo("2026-09-21", "2026-09-28").week, "B");
eq("workout days in a week", S.workoutDaysBetween("2026-09-28", "2026-10-04"), 4);

// ---- scores
eq("e1rm", Math.round(S.e1rm(100, 10)), 133);
eq("best load", Math.round(S.bestScore("load", [{ w: 40, r: 10 }, { w: 45, r: 6 }])), 54);
eq("best assist is lowest", S.bestScore("assist", [{ w: 50, r: 8 }, { w: 40, r: 6 }]), 40);
yes("assist lower is better", S.betterThan("assist", 30, 40));
yes("time higher is better", S.betterThan("time", 45, 30));
eq("empty sets", S.bestScore("load", []), null);

// ---- helpers for sessions
const ses = (date, id, sets, o = {}) => ({ id: `mat_${date}`, user: "mat", date, week: "A", day: "Mon", exercises: [{ id, variant: o.v || "std", name: o.name || id, kind: o.kind || "load", db: !!o.db, sets }], ...o.extra });
const set = (w, r, d = 2) => ({ w, r, d });

// ---- weight-bump prompts
let h = [ses("2026-09-14", "a-mon-sp", [set(40, 10), set(40, 10)]), ses("2026-09-21", "a-mon-sp", [set(40, 10), set(40, 11)])];
yes("bump after two top sessions", S.suggestion(h, "mat", "a-mon-sp", "std")?.text.includes("45 lb"));
h = [ses("2026-09-14", "a-mon-sp", [set(40, 10), set(40, 9)]), ses("2026-09-21", "a-mon-sp", [set(40, 10), set(40, 10)])];
eq("no bump if one session fell short", S.suggestion(h, "mat", "a-mon-sp", "std"), null);
h = [ses("2026-09-14", "a-wed-ht", [set(20, 20), set(20, 20)])];
yes("way over target bumps right away", S.suggestion(h, "mat", "a-wed-ht", "std")?.text.includes("30 lb"));
h = [ses("2026-09-14", "a-mon-cp", [set(80, 7, 3), set(80, 6, 3)])];
yes("too heavy says hold", S.suggestion(h, "mat", "a-mon-cp", "std")?.type === "hold");
h = [ses("2026-09-14", "a-tue-pu", [set(50, 10), set(50, 10)], { kind: "assist" }), ses("2026-09-21", "a-tue-pu", [set(50, 10), set(50, 10)], { kind: "assist" })];
yes("assist bump lowers assist", S.suggestion(h, "mat", "a-tue-pu", "std")?.text.includes("45 lb of assist"));
h = [ses("2026-09-14", "a-thu-bug", [set(0, 8), set(0, 8)], { kind: "bw" }), ses("2026-09-21", "a-thu-bug", [set(0, 8), set(0, 8)], { kind: "bw" })];
yes("bodyweight suggests harder version", S.suggestion(h, "mat", "a-thu-bug", "std")?.text.includes("harder"));
eq("library swap gets no prompt", S.suggestion(h, "mat", "a-thu-bug", "lib:db-fly"), null);

// ---- reports
const two = [ses("2026-09-30", "a-wed-ht", [set(35, 12), set(35, 12), set(35, 10, 3)]), { ...ses("2026-09-30", "custom-hip-adductor", [set(90, 15)], { kind: "load", name: "Hip Adductor Machine" }), id: "dup" }];
const r = S.cycleReport({ sessions: two, body: [], activities: [], user: "mat", start: "2026-09-28", end: "2026-10-11", today: "2026-09-30" });
eq("report counts distinct days", r.sessions, 1);
eq("report planned so far", r.soFar, 3);
yes("report includes custom exercise", r.newEx.some(x => x.name === "Hip Adductor Machine"));
yes("report text lists every set", S.reportText(r).includes("3 sets: 35×12, 35×12, 35×10 lb (R R H)"));
yes("report text says in progress", S.reportText(r).includes("Cycle in progress"));
const cmp = S.compare({ sessions: two, body: [{ user: "mat", date: "2026-09-20", waist: 42 }], activities: [], user: "mat", a: "2026-09-01", b: "2026-10-01" });
eq("compare body with only one side", cmp.bodyRows[0].change, null);

// ---- fun
eq("volume doubles for dumbbells", F.volumeOf({ kind: "load", db: true, sets: [set(20, 10)] }), 400);
eq("volume for a machine", F.volumeOf({ kind: "load", db: false, sets: [set(100, 10)] }), 1000);
eq("no volume for time", F.volumeOf({ kind: "time", sets: [set(0, 30)] }), 0);
eq("fun weight", F.funWeight(2060), "about 1.9 horses");
eq("fun weight tiny", F.funWeight(40), "");
const weeks = [];
for (const mon of ["2026-09-07", "2026-09-14", "2026-09-21"]) for (let i = 0; i < 3; i++) weeks.push(ses(S.addDays(mon, i), "a-mon-cp", [set(50, 10)]));
const st = F.streaks(weeks, "mat", "2026-09-28");
eq("streak counts back from last full week", [st.current, st.longest], [3, 3]);
eq("records", F.prEvents([ses("2026-09-01", "a-mon-cp", [set(50, 10)]), ses("2026-09-08", "a-mon-cp", [set(55, 10)]), ses("2026-09-15", "a-mon-cp", [set(50, 10)])], "mat").length, 1);
eq("level", F.level(1200).name, "Grinder");
const got = F.earnedBadges(weeks, [], [], "mat", "2026-09-28");
yes("first workout badge", got.has("first"));
yes("not ten yet", !got.has("w10") || weeks.length >= 10);

// ---- content cross-checks
const stretchKeys = new Set(Object.keys(STRETCH));
for (const e of Object.values(ALL_EX)) {
  for (const k of e.s) yes(`stretch key ${k} on ${e.id}`, stretchKeys.has(k));
  yes(`safety info for ${e.id}`, PLAN_SAFETY[e.id]);
  yes(`swap for ${e.id}`, e.swap?.n && e.swap?.how);
  for (const v of ["std", "hard", "swap"]) yes(`safety resolves ${e.id}/${v}`, safetyFor(e, v));
}
for (const f of Object.values(STRETCH_BY_FOCUS)) for (const k of f) yes(`focus stretch ${k}`, stretchKeys.has(k));
// Every stretch says where you feel it and what it does; held stretches have a timer length that matches their label.
for (const [k, st] of Object.entries(STRETCH)) {
  yes(`stretch ${k} has feel + purpose`, st.f?.length > 20 && st.g?.length > 20);
  const held = /sec/.test(st.t);
  yes(`stretch ${k} timer matches label`, held ? st.sec > 0 && st.t.includes(String(st.sec)) : st.sec === 0);
}
const ids = new Set();
for (const b of BUILTIN) {
  yes(`unique library id ${b.id}`, !ids.has(b.id)); ids.add(b.id);
  yes(`library ${b.id} has risks`, b.risks.length > 0);
  yes(`library ${b.id} has a range`, S.parseRange(b.sr).max != null);
  for (const r of b.risks) yes(`library ${b.id} risk has advice`, r.risk && r.avoid);
}


// Our machines: every "At our gym" link points at a real machine and a real plan exercise.
{
  const { PLAN_MACHINES, MACHINES } = await import(join(dir, "library.js"));
  const { ALL_EX } = await import(join(dir, "plan.js"));
  yes("23 machine names covered (24 entries: fly + rear delt share a machine)", MACHINES.length === 24);
  for (const [pid, ids] of Object.entries(PLAN_MACHINES)) { yes(`plan exercise ${pid} exists`, !!ALL_EX[pid]); for (const id of ids) yes(`${pid} → ${id} exists`, MACHINES.some(m => m.id === id)); }
  for (const m of MACHINES) yes(`${m.id} has a setup tip and isn't a dumbbell`, m.tip.length > 20 && m.equip === "machine" && m.db === false);
}
// Which day the Workout tab opens on (cycle starts Mon Sep 28: Week A Sep 28–Oct 4, Week B Oct 5–11).
{
  const s = (date, week, day) => ({ user: "mat", date, week, day, exercises: [{ id: "x", sets: [{ w: 1, r: 1 }] }] });
  // Last week: Week A Wed, Thu, and Mon (made up Friday). Week A Tue never done.
  const lastWeek = [s("2026-09-30", "A", "Wed"), s("2026-10-01", "A", "Thu"), s("2026-10-02", "A", "Mon")];
  const pd = (sessions, today) => { const r = S.pickDay(sessions, "mat", today, "2026-09-28"); return r.week + r.day; };
  yes("Tuesday of Week B with Monday skipped opens Day 1 (Week B Mon)", pd(lastWeek, "2026-10-06") === "BMon");
  const d1 = [...lastWeek, s("2026-10-06", "B", "Mon")];
  yes("skip Wednesday, go Thursday: opens Day 2", pd(d1, "2026-10-08") === "BTue");
  const midWeek = [...d1, s("2026-10-08", "B", "Tue"), s("2026-10-09", "B", "Wed")];
  yes("a workout logged today keeps that day open", pd(midWeek, "2026-10-09") === "BWed");
  yes("next visit that week opens Day 4", pd(midWeek, "2026-10-10") === "BThu");
  const full = [...midWeek, s("2026-10-10", "B", "Thu")];
  yes("all four done: stays on the last one, week complete", pd(full, "2026-10-11") === "BThu" && S.pickDay(full, "mat", "2026-10-11", "2026-09-28").complete);
  yes("new week starts at Day 1 even with days missed last week", pd(d1, "2026-10-12") === "AMon");
  yes("Week A Monday of a new cycle opens Day 1", pd(full, "2026-10-12") === "AMon");
  yes("a day from last cycle doesn't count this cycle", pd([s("2026-09-28", "A", "Mon")], "2026-10-13") === "AMon");
  yes("marked done counts as done", pd([{ user: "mat", date: "2026-10-12", week: "A", day: "Mon", markedDone: true }], "2026-10-13") === "ATue");
  yes("ex-map sessions count as done", pd([{ user: "mat", date: "2026-10-12", week: "A", day: "Mon", ex: { a: { sets: [{ w: 1, r: 1 }] } } }], "2026-10-13") === "ATue");
}
// Tailoring from the questionnaire.
{
  const TL = await import(join(dir, "tailor.js"));
  const { ALL_EX } = await import(join(dir, "plan.js"));
  const { safetyFor } = await import(join(dir, "safety.js"));
  const { BUILTIN } = await import(join(dir, "library.js"));
  const none = TL.tailorPlan({ injuries: [], limits: [], experience: "some" });
  yes("no injuries, some experience: standard plan unchanged", Object.keys(none).length === 0);
  const vet = TL.tailorPlan({ injuries: [], limits: [], experience: "veteran" });
  yes("veteran: harder versions picked", Object.values(vet).length > 10 && Object.values(vet).every(t => t.v === "hard"));
  for (const prof of [{ injuries: ["knees"], limits: ["noFloor"], experience: "some" }, { injuries: ["shoulders", "lowerBack"], limits: [], experience: "new" },
    { injuries: ["wrists", "elbows", "foot"], limits: ["noOverhead", "noImpact", "grip", "balance"], experience: "regular", intensity: "push" }]) {
    const t = TL.tailorPlan(prof);
    yes(`${JSON.stringify(prof)}: something tailored`, Object.keys(t).length > 0);
    for (const [id, x] of Object.entries(t)) {
      const ex = ALL_EX[id];
      yes(`${id} → ${x.v} exists`, x.v === "hard" ? !!ex.h : x.v === "swap" ? !!ex.swap : BUILTIN.some(b => `lib:${b.id}` === x.v));
      yes(`${id} has a reason`, typeof x.why === "string" && x.why.length > 5);
      if (x.v !== "hard" && prof.injuries.length) {
        const before = safetyFor(ex, "std")?.joints || {}, after = x.v === "swap" ? safetyFor(ex, "swap")?.joints || {} : BUILTIN.find(b => `lib:${b.id}` === x.v).joints;
        const load = j => prof.injuries.map(a => a === "foot" ? "ankles" : a).reduce((n, a) => n + (j[a] || 0), 0);
        yes(`${id} is no harder on the injured areas`, load(after) <= load(before) || (prof.limits || []).length > 0);
      }
    }
    // never the same exercise twice in a day
    const days = {};
    for (const ex of Object.values(ALL_EX)) { const x = t[ex.id]; const nm = !x ? ex.n : x.v === "hard" ? ex.h.n : x.v === "swap" ? ex.swap.n : BUILTIN.find(b => `lib:${b.id}` === x.v).name; (days[ex.week + ex.day] ||= []).push(nm.toLowerCase()); }
    for (const [d, names] of Object.entries(days)) yes(`${d}: no duplicates`, new Set(names).size === names.length);
  }
  const noFloor = TL.tailorPlan({ injuries: [], limits: ["noFloor"], experience: "some" });
  yes("no floor work: Dead Bug replaced", !!noFloor["a-thu-bug"]);
}
// Plans built from the questionnaire: 1–7 days, full body or split, plus home workouts.
{
  const PG = await import(join(dir, "program.js"));
  const { ALL_EX } = await import(join(dir, "plan.js"));
  const { BUILTIN } = await import(join(dir, "library.js"));
  const exists = id => id.startsWith("lib-") ? BUILTIN.some(b => `lib-${b.id}` === id) : !!ALL_EX[id];
  yes("Mat/Benny (no questionnaire) keep the original plan", PG.buildWeek({}, "A") === null);
  yes("4 days, split: original plan", PG.buildWeek({ onboardedAt: 1, daysPerWeek: 4, planStyle: "split" }, "A") === null);
  for (const n of [1, 2, 3, 4, 5, 6, 7]) for (const style of ["auto", "full", "split"]) for (const len of [30, 60, 90]) {
    const prof = { onboardedAt: 1, daysPerWeek: n, planStyle: style, sessionLen: len, focus: ["glutes", "arms"] };
    for (const w of ["A", "B"]) {
      const wk = PG.buildWeek(prof, w);
      if (n === 4 && style !== "full") { yes(`${n}/${style}: original`, wk === null); continue; }
      const tag = `${n} days, ${style}, ${len} min, week ${w}`;
      yes(`${tag}: ${n} days`, wk.length === n && wk.every((d, i) => d.key === `D${i + 1}`));
      yes(`${tag}: every day has 3+ real exercises, no repeats`, wk.every(d => d.ex.length >= 3 && d.ex.every(exists) && new Set(d.ex).size === d.ex.length));
      yes(`${tag}: sessions fit the time`, wk.every(d => d.ex.length <= ({ 30: 4, 60: 6, 90: 8 })[len]));
      if (style === "full" || (style === "auto" && n <= 3) || n === 1) yes(`${tag}: full body days`, wk.every(d => d.title === "Full body"));
    }
    if (!(n === 4 && style !== "full")) yes(`${n}/${style}: weeks A and B differ`, JSON.stringify(PG.buildWeek(prof, "A")) !== JSON.stringify(PG.buildWeek(prof, "B")));
  }
  for (const gear of [[], ["band"], ["dumbbells"], ["dumbbells", "band", "mat"]]) for (const lim of [[], ["noFloor"], ["noImpact"]]) {
    const prof = { homeGear: gear, limits: lim, injuries: ["knees"], sessionLen: 45 };
    for (const w of ["A", "B"]) {
      const h = PG.buildHome(prof, w); const items = h.ex.map(id => BUILTIN.find(b => `lib-${b.id}` === id));
      const tag = `home ${gear.join("+") || "none"} ${lim.join("+")} ${w}`;
      yes(`${tag}: 4+ moves`, items.length >= 4 && items.every(Boolean));
      yes(`${tag}: only gear they have`, items.every(m => m.equip === "bodyweight" || (m.equip === "band" && gear.includes("band")) || (m.equip === "dumbbell" && gear.includes("dumbbells")) || (m.equip === "barbell" && gear.includes("barbell"))));
      if (lim.includes("noFloor")) yes(`${tag}: no floor work`, items.every(m => m.position !== "floor"));
      if (lim.includes("noImpact")) yes(`${tag}: no impact`, items.every(m => !m.impact));
    }
  }
  // Doing a plan day at home: same muscles, only their gear, no bench moves without a bench.
  const { PLAN, DAYS } = await import(join(dir, "plan.js"));
  for (const gear of [[], ["band"], ["dumbbells"], ["barbell"], ["barbell", "bench", "dumbbells"]]) for (const w of ["A", "B"]) for (const d of DAYS) {
    const src = PLAN[w][d].ex, out = PG.homeVersion({ homeGear: gear, sessionLen: 60 }, src).map(id => BUILTIN.find(b => `lib-${b.id}` === id));
    const tag = `home version ${gear.join("+") || "none"} ${w} ${d}`;
    yes(`${tag}: most of the day kept`, out.length >= Math.min(3, src.length) && out.every(Boolean));
    yes(`${tag}: works the day's muscles`, out.filter(m => src.some(e => m.focus.includes(e.focus[0]))).length >= out.length - 1);
    yes(`${tag}: only their gear`, out.every(m => m.equip === "bodyweight" || gear.includes({ band: "band", dumbbell: "dumbbells", barbell: "barbell" }[m.equip])));
    if (!gear.includes("bench")) yes(`${tag}: no bench needed`, out.every(m => !m.bench && m.position !== "lying"));
  }
  for (const f of Object.keys(PG.BONUS_FOCUS)) for (const where of ["gym", "home"]) for (const gear of [[], ["dumbbells", "band"]]) {
    const b = PG.buildBonus({ homeGear: gear, sessionLen: 45 }, f, where, "A");
    const areas = PG.BONUS_FOCUS[f][1];
    const items = b.ex.map(id => id.startsWith("lib-") ? BUILTIN.find(x => `lib-${x.id}` === id) : ALL_EX[id]);
    const tag = `bonus ${f} ${where} ${gear.join("+") || "none"}`;
    yes(`${tag}: 3+ exercises, real, no repeats`, items.length >= 3 && items.every(Boolean) && new Set(b.ex).size === b.ex.length);
    yes(`${tag}: on focus (or a close neighbor when home gear is thin)`, items.every(m => m.focus.some(x => areas.includes(x) || ({ arms: ["chest", "back"], shoulders: ["chest", "back"] }[f] || []).includes(x))));
    if (where === "home") yes(`${tag}: home gear only`, items.every(m => m.equip === "bodyweight" || (gear.includes("dumbbells") && m.equip === "dumbbell") || (gear.includes("band") && m.equip === "band")));
  }
  const S2 = S;
  const s = (date, week, day) => ({ user: "jo", date, week, day, exercises: [{ id: "x", sets: [{ w: 1, r: 1 }] }] });
  const D2 = ["D1", "D2"];
  yes("2-day plan opens Day 1", S2.pickDay([], "jo", "2026-10-13", "2026-09-28", D2).day === "D1");
  yes("2-day plan, Day 1 done: Day 2 next", S2.pickDay([s("2026-10-12", "A", "D1")], "jo", "2026-10-14", "2026-09-28", D2).day === "D2");
  const both = [s("2026-10-12", "A", "D1"), s("2026-10-13", "A", "D2")];
  yes("2-day plan done: week complete", S2.pickDay(both, "jo", "2026-10-15", "2026-09-28", D2).complete === true);
  yes("a home workout doesn't count as a plan day", S2.pickDay([s("2026-10-12", "A", "Home")], "jo", "2026-10-13", "2026-09-28", D2).day === "D1");
  yes("a home workout logged today opens Home", S2.pickDay([s("2026-10-13", "A", "Home")], "jo", "2026-10-13", "2026-09-28", D2).day === "Home");
}
// Stretch routines.
{
  const ST = await import(join(dir, "stretch.js"));
  yes("30+ stretches, each with how, feel, and what it does", ST.STRETCHES.length >= 30 && ST.STRETCHES.every(s => s.how && s.feel && s.does && s.areas.length && ["standing", "seated", "floor"].includes(s.pos)));
  for (const s of ST.STRETCHES) yes(`${s.key}: areas are known`, s.areas.every(a => ST.AREAS[a]));
  for (const id of Object.keys(ST.ROUTINES)) for (const m of [5, 10, 15]) {
    const areas = { today: ["legs", "hips"], sore: ["lowerBack"], area: ["shoulders"] }[id] || [];
    const r = ST.buildRoutine(id, { minutes: m, areas });
    yes(`${id} ${m} min: 3+ stretches, no repeats`, r.items.length >= 3 && new Set(r.items.map(o => o.key)).size === r.items.length);
    yes(`${id} ${m} min: close to the time asked (or shorter)`, r.seconds <= m * 60 + 60 && r.seconds >= Math.min(m * 60 * 0.6, 240));
    if (ST.ROUTINES[id].where) yes(`${id}: only ${ST.ROUTINES[id].where.join("/")}`, r.items.every(o => ST.ROUTINES[id].where.includes(ST.BY_KEY[o.key].pos)));
    if (areas.length) yes(`${id}: on the chosen areas`, r.items.every(o => ST.BY_KEY[o.key].areas.some(a => areas.includes(a))));
  }
  const nf = ST.buildRoutine("bedtime", { minutes: 10, prof: { limits: ["noFloor"], injuries: ["knees"] } });
  yes("no-floor limit: no floor stretches", nf.items.length && nf.items.every(o => ST.BY_KEY[o.key].pos !== "floor"));
  yes("knee injury: skips stretches that load the knee", nf.items.every(o => !ST.BY_KEY[o.key].caution.includes("knees")));
  yes("sore spots: gentle ones only", ST.buildRoutine("sore", { minutes: 10, areas: ["lowerBack", "hips"] }).items.every(o => !ST.BY_KEY[o.key].caution.length));
  yes("bedtime ends on the breathing", (r => !r.items.some(o => o.key === "box-breath") || r.items.at(-1).key === "box-breath")(ST.buildRoutine("bedtime", { minutes: 15 })));
  const steps = ST.steps([{ key: "quad", rounds: 2 }, { key: "childs-pose", rounds: 1 }]);
  yes("guided steps: each side, each round", steps.length === 5 && steps[0].side === "Left side" && steps[1].side === "Right side" && steps[3].round === 2 && steps[4].side === "");
  yes("dose text reads like stretching", ST.doseText(ST.BY_KEY.quad, 2) === "Hold 25 sec · each side · 2 rounds" && ST.doseText(ST.BY_KEY["childs-pose"]) === "6 slow breaths");
}
// ---------------------------------------------------------------- accessibility settings
{
  const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const A = await import(join(dir, "a11y.js"));
  let a = A.load(null);
  yes("a11y defaults load", a.textSize === "m" && a.vibrate === true && a.focusMode === false);
  for (const [id, p] of Object.entries(A.PRESETS)) for (const k of Object.keys(p.set)) yes(`preset ${id}.${k} is a real option`, k in A.DEFAULTS);
  globalThis.document = undefined;
  const set = patch => { a = { ...a, ...patch, _t: Date.now() }; mem["twp-a11y"] = JSON.stringify({ ...a, _who: "mat" }); };
  set({ textSize: "xxl", toastTime: 0 });
  a = A.load({ textSize: "l", _t: 1 }, "mat");
  yes("newer phone copy beats older profile copy", a.textSize === "xxl");
  a = A.load({ textSize: "s", _t: Date.now() + 5000 }, "mat");
  yes("newer profile copy beats phone copy", a.textSize === "s");
  a = A.load({ textSize: "l", _t: 1 }, "benny");
  yes("another person's phone copy is ignored", a.textSize === "l" && a.toastTime === 4);
}
// ---- every script is cached for offline use and preloaded
{
  const { readFileSync, readdirSync } = await import("node:fs");
  const files = [...readdirSync(join(here, "../js")).filter(f => f.endsWith(".js")).map(f => `js/${f}`), ...readdirSync(join(here, "../js/views")).map(f => `js/views/${f}`)];
  const sw = readFileSync(join(here, "../sw.js"), "utf8"), app = readFileSync(join(here, "../js/app.js"), "utf8"), html = readFileSync(join(here, "../index.html"), "utf8");
  for (const f of files) {
    yes(`offline cache has ${f}`, sw.includes(`"${f}"`));
    yes(`update check refreshes ${f}`, app.includes(`"${f}"`));
    if (f !== "js/app.js") yes(`index.html preloads ${f}`, html.includes(`<link rel="modulepreload" href="${f}">`));
  }
  eq("app and offline cache versions match", app.match(/APP_VERSION = "(\d+)"/)?.[1], sw.match(/twp-v(\d+)/)?.[1]);
}

// ---- history follows the move across plan days; one-sided moves; body areas
{
  const sess = [{ id: "x", user: "mat", date: "2026-10-12", exercises: [
    { id: "a-mon-fly", variant: "std", name: "Pec Fly Machine", kind: "load", sets: [{ w: 70, r: 12, d: 2 }] },
    { id: "a-mon-sp", variant: "swap", name: "Seated Dumbbell Shoulder Press", kind: "load", sets: [{ w: 20, r: 10, d: 2 }] },
    { id: "b-mon-clat", variant: "std", name: "Cable Lateral Raise", kind: "load", sets: [{ w: 10, r: 12, d: 2, side: "L" }, { w: 10, r: 12, d: 2, side: "R" }] }] }];
  eq("Week B pec fly sees Week A's pec fly", S.lastTime(sess, "mat", "b-mon-fly", "std")?.sets[0].w, 70);
  eq("Week B shoulder press sees Week A's swap of the same move", S.lastTime(sess, "mat", "b-mon-sp", "std")?.sets[0].w, 20);
  eq("a different move stays separate", S.lastTime(sess, "mat", "a-mon-sp", "std"), null);
  eq("Benny's history isn't Mat's", S.lastTime(sess, "benny", "b-mon-fly", "std"), null);
  yes("cable lateral raise is one side at a time", S.isSided("Cable Lateral Raise"));
  yes("dumbbell lateral raise is both arms together", !S.isSided("Dumbbell Lateral Raise"));
  const w = S.withSides([{ w: 10, r: 12 }, { w: 10, r: 12 }, { w: 10, r: 12 }], true);
  eq("3 sets become left/right pairs", w.map(x => x.side).join(""), "LRLRLR");
  eq("pairs count as one set each", S.setCount(w), 3);
  eq("pairs fold back when the move is two-sided", S.withSides(w, false).length, 3);
  yes("summary says each side", S.setsText({ kind: "load", db: false, sets: w }).startsWith("3 sets each side"));
  const a = S.areasOf("Machine Chest Press", ["chest"]);
  yes("a chest press also works the arms", a.main === "chest" && a.also.includes("arms"));
  yes("a straight-arm pulldown doesn't count as arm work", !S.areasOf("Straight-Arm Cable Pulldown", ["back"]).also.includes("arms"));
  const r = S.areaReport([{ name: "Dumbbell Bicep Curl", focus: ["arms"], sets: 3 }, { name: "Lat Pulldown", focus: ["back"], sets: 3 }], sess, "mat", "2026-10-05", "2026-10-18");
  eq("arms: aimed-at sets", r.arms.planMain, 3); eq("arms: also-works sets", r.arms.planAlso, 3);
  eq("logged shoulder sets count left/right as one set", r.shoulders.didMain, 2);
}

// ---- body map: every plan exercise maps to a muscle; counts; shapes always draw
{
  const MU = await import(join(here, "../js/muscles.js"));
  const { anatomy } = await import(join(here, "../js/anatomy.js"));
  const { PLAN: P2, variantDef: vd } = await import(join(here, "../js/plan.js"));
  for (const w of ["A", "B"]) for (const d of Object.values(P2[w])) for (const ex of d.ex) for (const v of ["std", "hard", "swap"]) {
    const def = vd(ex, v); yes(`${def.name} maps to a muscle`, !!MU.musclesOf(def.name, ex.focus));
  }
  eq("curl aims at biceps", MU.musclesOf("Cable Curl").main, "biceps");
  eq("hammer curl aims at biceps", MU.musclesOf("Hammer Curl").main, "biceps");
  yes("lat pulldown helps biceps", MU.musclesOf("Lat Pulldown").also.includes("biceps"));
  eq("an unknown move falls back to its focus", MU.musclesOf("Mystery Machine", ["back"]).main, "lats");
  eq("nothing to go on gives nothing", MU.musclesOf("Mystery Machine", []), null);
  const sess = [{ id: "s", user: "mat", date: "2026-10-13", exercises: [
    { id: "x", name: "Cable Lateral Raise", sets: [{ w: 10, r: 12, side: "L" }, { w: 10, r: 12, side: "R" }, { w: 10, r: 12, side: "L" }, { w: 10, r: 12, side: "R" }] },
    { id: "y", name: "Lat Pulldown", sets: [{ w: 80, r: 10 }, { w: 80, r: 10 }] }] }];
  const r = MU.muscleReport([{ name: "Hammer Curl", focus: ["arms"], sets: 3 }], sess, "mat", "2026-10-12", "2026-10-25");
  eq("left/right pairs count once", r.sideDelts.didMain, 2);
  eq("helping sets are counted", r.biceps.didAlso, 2);
  eq("planned sets are counted", r.biceps.planMain, 3);
  eq("effort counts helping sets as half", MU.effort(r.biceps), 1);
  eq("another person's sets don't count", MU.muscleReport([], sess, "benny").lats.didMain, 0);
  eq("a bad stored shape falls back to the middle", MU.cleanShape({ hips: 999, chest: "x" }).hips, 35);
  const ok = d => typeof d === "string" && d.length > 20 && !/NaN|undefined|Infinity/.test(d);
  for (const chest of [0, 9, 15]) for (const shoulders of [36, 40, 45]) for (const waist of [24, 28, 35]) for (const hips of [31, 35, 41]) for (const build of [0.9, 1, 1.16]) {
    const g = anatomy({ chest, shoulders, waist, hips, build });
    const all = [g.silhouette, g.hands, g.feetFront, g.heel, g.headFront.base, ...Object.values(g.front), ...Object.values(g.back)];
    if (!all.every(ok)) { yes(`shape ${chest}/${shoulders}/${waist}/${hips}/${build} draws`, false); break; }
  }
  yes("all 243 body shapes draw", true);
  const g0 = anatomy(MU.DEFAULT_SHAPE);
  const drawn = new Set([...Object.keys(g0.front), ...Object.keys(g0.back)]);
  for (const id of Object.keys(MU.MUSCLES)) yes(`${id} is drawn on the figure`, drawn.has(id));
}

// ---- workout time: hidden when the workout was logged after the fact
{
  const ex = n => Array.from({ length: n }, (_, i) => ({ id: "e" + i, sets: [{ w: 10, r: 10 }] }));
  const t0 = Date.UTC(2026, 9, 20, 22, 0);
  const w = (mins, n = 6) => S.workoutDuration({ startedAt: t0, finishedAt: t0 + mins * 60e3, exercises: ex(n) });
  eq("a real 50-minute workout shows its time", w(50), 50 * 60e3);
  eq("6 exercises logged in 4 minutes hides the time", w(4), null);
  eq("6 exercises in 11 minutes is still too fast to be real", w(11), null);
  eq("a short real workout with 2 exercises shows its time", w(15, 2), 15 * 60e3);
  eq("a timer left running overnight hides the time", w(9 * 60), null);
  eq("no finish, no time", S.workoutDuration({ startedAt: t0 }), null);
}

// ---- gyms and equipment
{
  const Q = await import(join(here, "../js/equipment.js"));
  const { ALL_EX: AX, variantDef: vd } = await import(join(here, "../js/plan.js"));
  const { BUILTIN: LIB } = await import(join(here, "../js/library.js"));
  const defs = Object.values(AX).flatMap(ex => ["std", "hard", "swap"].filter(v => !((v === "hard" && !ex.h) || (v === "swap" && !ex.swap))).map(v => vd(ex, v)));
  const kirkwood = { items: Q.coverAll(Q.PRESETS.pf.items, [...defs, ...LIB.filter(b => b.equip === "machine")]) };
  for (const d of defs) yes(`Planet Fitness Kirkwood can do ${d.name}`, Q.canDo(kirkwood, d));
  for (const m of LIB.filter(b => b.equip === "machine")) yes(`Planet Fitness Kirkwood has the ${m.name}`, Q.canDo(kirkwood, m));
  const ids = new Set(Q.EQUIPMENT.map(e => e.id));
  eq("equipment ids are unique", ids.size, Q.EQUIPMENT.length);
  yes("catalog has 100+ items", Q.EQUIPMENT.length >= 100);
  for (const [k, p] of Object.entries(Q.PRESETS)) yes(`preset ${k} lists only real equipment`, p.items.every(id => ids.has(id)));
  for (const d of [...defs, ...LIB]) for (const opt of Q.needsFor(d)) yes(`${d.name || d.n} needs real equipment`, opt.every(id => ids.has(id)));
  eq("search finds a functional trainer by its other name", Q.searchEquipment("functional trainer").at(0)?.id, "cable-dual");
  eq("search finds the pec deck", Q.searchEquipment("butterfly").at(0)?.id, "pec-deck");
  const hotel = { items: Q.PRESETS.hotel.items };
  yes("a hotel gym can't do a leg press", !Q.canDo(hotel, { name: "Leg Press" }));
  yes("a hotel gym can do dumbbell curls", Q.canDo(hotel, { name: "Dumbbell Bicep Curl", db: true }));
  eq("a hotel gym says what a leg press needs", Q.missingFor(hotel, { name: "Leg Press" }).join(), "Leg press machine");
  yes("bodyweight moves work anywhere", Q.canDo({ items: [] }, { name: "Push-Ups", kind: "bw" }));
  yes("an exercise someone added by hand is assumed available", Q.canDo({ items: [] }, { name: "Mystery Machine", equip: "machine" }));
  const g = Q.newGym("g1", "", "hotel");
  eq("a new gym takes the preset's name", g.name, "Hotel gym");
  yes("a new gym copies the preset's items, not shares them", g.items !== Q.PRESETS.hotel.items && g.items.length === Q.PRESETS.hotel.items.length);
  eq("a copied gym keeps the original's equipment", Q.newGym("g2", "", "", { name: "A", items: ["dumbbells"] }).items.join(), "dumbbells");
  eq("details default to 2.5 lb steps", Q.gymDetails({}).cableStep, 2.5);
  const typical = Q.DEFAULT_GYM; const missingAtTypical = defs.filter(d => !Q.canDo(typical, d)).map(d => d.name);
  yes(`a typical big gym can do the plan (missing: ${missingAtTypical.join(", ") || "none"})`, missingAtTypical.length <= 2);
}

// ---- week review and Delete my account
// ---- bringing history in from Strong and Hevy
{
  const I = await import(join(dir, "importer.js"));
  const strong = [
    '"Date","Workout Name","Duration","Exercise Name","Set Order","Weight","Reps","Distance","Seconds","Notes","Workout Notes","RPE"',
    '"2025-03-04 18:05:11","Push, ""heavy""","1h 5m","Bench Press (Barbell)","W","45","10","","","","",""',
    '"2025-03-04 18:05:11","Push, ""heavy""","1h 5m","Bench Press (Barbell)","1","135","8","","","","","9"',
    '"2025-03-04 18:05:11","Push, ""heavy""","1h 5m","Bench Press (Barbell)","2","135","7","","","","","6"',
    '"2025-03-04 18:05:11","Push, ""heavy""","1h 5m","Plank","1","0","0","","45","","",""',
    '"2025-03-04 18:05:11","Push, ""heavy""","1h 5m","Running (Treadmill)","1","0","0","2.1","1200","","",""',
    '"2025-03-04 18:05:11","Push, ""heavy""","1h 5m","Bench Press (Barbell)","Rest Timer","0","0","","90","","",""',
    '"2025-03-06 07:00:00","Pull","45m","Lat Pulldown (Cable)","1","100","10","","","multi\nline","",""',
  ].join("\r\n");
  const p = I.parseCSV(strong);
  eq("import: header read", p.header.length, 12);
  eq("import: quoted commas and doubled quotes", p.rows[0].workoutname, 'Push, "heavy"');
  eq("import: a newline inside quotes stays in the cell", p.rows[6].notes, "multi\nline");
  eq("import: Strong found, unit unknown", I.detect(p.header), { format: "Strong", unit: null });
  let r = I.toWorkouts(p, "lb");
  eq("import: two workouts", r.workouts.map(w => [w.date, w.minutes]), [["2025-03-04", 65], ["2025-03-06", 45]]);
  eq("import: warm-up left out, cardio left out", [r.skipped.warmups, r.skipped.cardio], [1, 1]);
  eq("import: sets in order with how they felt", r.workouts[0].exercises[0].sets, [{ w: 135, r: 8, d: 3 }, { w: 135, r: 7, d: 1 }]);
  eq("import: timed hold", [r.workouts[0].exercises[1].kind, r.workouts[0].exercises[1].sets[0].r], ["time", 45]);
  r = I.toWorkouts(p, "kg");
  eq("import: kilograms to pounds, to the half pound", r.workouts[0].exercises[0].sets[0].w, 297.5);
  const semi = I.parseCSV('"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"\n"1";"2025-04-29 12:00:00";"Chest";"600";"Bench Press (Barbell)";"1";"100.0";"10";"";"";"";"";""');
  eq("import: semicolons and a kg column", [I.detect(semi.header).unit, I.toWorkouts(semi).workouts[0].exercises[0].sets[0].w, I.toWorkouts(semi).workouts[0].minutes], ["kg", 220.5, 10]);
  const hevy = I.parseCSV(['"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"',
    '"Legs","12 Sep 2024, 07:30","12 Sep 2024, 08:40","","Leg Press (Machine)","","","0","warmup","90","12","","",""',
    '"Legs","12 Sep 2024, 07:30","12 Sep 2024, 08:40","","Leg Press (Machine)","","","1","normal","180","10","","",""',
    '"Legs","12 Sep 2024, 07:30","12 Sep 2024, 08:40","","Pull Up (Assisted)","","","0","normal","50","8","","",""'].join("\n"));
  const h = I.toWorkouts(hevy);
  eq("import: Hevy found, in pounds", I.detect(hevy.header), { format: "Hevy", unit: "lb" });
  eq("import: Hevy workout, length from start and end", [h.workouts[0].date, h.workouts[0].minutes, h.skipped.warmups], ["2024-09-12", 70, 1]);
  eq("import: assisted move", h.workouts[0].exercises[1].kind, "assist");
  eq("import: dates", [I.parseWhen("2025-01-02 3:04").date, I.parseWhen("Jan 5, 2025, 2:00 PM").date, I.parseWhen("3/9/2025 10:00").date, I.parseWhen("nope")], ["2025-01-02", "2025-01-05", "2025-03-09", null]);
  eq("import: lengths", [I.parseMinutes("1h 5m"), I.parseMinutes("45m"), I.parseMinutes("3600"), I.parseMinutes("1:10:00"), I.parseMinutes("")], [65, 45, 60, 70, null]);
  const top = n => I.matchMove(n)[0];
  eq("import: Strong names match the app's", ["Bench Press (Barbell)", "Chest Press (Machine)", "Lat Pulldown (Cable)", "Bicep Curl (Dumbbell)"].map(n => [top(n).name, top(n).sure]),
    [["Barbell Bench Press", true], ["Machine Chest Press", true], ["Lat Pulldown", true], ["Dumbbell Bicep Curl", true]]);
  yes("import: different equipment is never a sure match", !I.matchMove("Bench Press (Dumbbell)").some(m => m.sure && /barbell/i.test(m.name)));
  eq("import: unknown moves have no sure match", I.matchMove("Zercher Good Morning")[0]?.sure || false, false);
  const ex = I.entriesFor(r.workouts[0], { "Bench Press (Barbell)": "Barbell Bench Press" });
  const bench = Object.values(ex).find(e => e.from);
  eq("import: entry takes the app's name and keeps where it came from", [bench.name, bench.from, bench.variant.startsWith("lib:")], ["Barbell Bench Press", "Bench Press (Barbell)", true]);
  eq("import: history connects by the move", S.moveKey(bench.id, bench.variant, bench), bench.variant);
  // Records and points: imported history sets the bar but earns nothing.
  const sess = [
    { user: "mat", date: "2025-01-01", imported: true, exercises: [{ id: "imp:barbell-bench-press", name: "Barbell Bench Press", variant: "std", kind: "load", sets: [{ w: 200, r: 5 }] }] },
    { user: "mat", date: "2026-10-01", exercises: [{ id: "x1", name: "Barbell Bench Press", variant: "std", kind: "load", sets: [{ w: 150, r: 5 }] }] },
    { user: "mat", date: "2026-10-08", exercises: [{ id: "x1", name: "Barbell Bench Press", variant: "std", kind: "load", sets: [{ w: 210, r: 5 }] }] },
  ];
  eq("import: a lighter first time isn't a record; beating history is", F.prEvents(sess, "mat").map(e => e.date), ["2026-10-08"]);
  eq("import: imported days earn no points", F.points(sess.slice(0, 1), [], "mat"), 0);
  eq("import: a stated length counts as the workout time", [S.workoutDuration({ minutes: 50 }), S.workoutDuration({ minutes: 900 })], [50 * 60e3, null]);
}

await (await import("./app-logic.mjs")).run({ dir, here, eq, yes });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
