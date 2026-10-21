// Tests for the week review (js/views/review.js) and Delete my account (js/firebase.js).
// Run by tests/run.mjs. The review runs against a small stand-in for app.js; firebase.js runs against
// tests/fake-firebase.mjs, an in-memory copy of the parts of the Firebase SDK the app uses.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

export async function run({ dir, here, eq, yes }) {
  // ------------------------------------------------------------ week review
  mkdirSync(join(dir, "views"), { recursive: true });
  for (const f of readdirSync(join(here, "../js/views"))) copyFileSync(join(here, "../js/views", f), join(dir, "views", f));
  writeFileSync(join(dir, "app.js"), `
import * as S from "./stats.js";
export const state = { data: { sessions: [], settings: [] }, bonusDraft: null };
export const t = { today: "2026-10-18", cycle: "2026-10-05", status: {}, prof: {} };
export const TODAY = () => t.today;
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const slotDate = (week, day) => S.addDays(t.cycle, (week === "B" ? 7 : 0) + DOW.indexOf(day));
export const daysFor = () => ["Mon", "Tue", "Wed", "Thu"];
export const dayStatus = (u, week, d) => ({ state: t.status[week + d] || "done" });
export const P = u => t.prof[u] || {};
export const planDay = () => ({ ex: [] });
export const dayEdits = () => ({ remove: [], add: [] });
export const resolveEx = () => null;
export const dayName = d => d;
export const dayTitle = () => "Upper, chest focus";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
export const listText = a => a.join(", ");
export const libItem = () => null;
export const bonusDates = () => [];
export const cycleStart = () => t.cycle;
export const cyclePlan = () => [];
`);
  const R = await import(join(dir, "views/review.js"));
  const app = await import(join(dir, "app.js"));
  const { t, state } = app;
  const set = (w, r, d = 2) => ({ w, r, d });
  const sess = (date, week, day, exercises, extra = {}) => ({ id: `mat_${date}_${week}${day}`, user: "mat", date, week, day, exercises, ...extra });
  const press = (sets, extra = {}) => ({ id: "bench", name: "Bench press", kind: "load", sets, ...extra });

  // Week B of the cycle starting Oct 5 is Oct 12–18. "Today" is Sunday Oct 18.
  t.status = {};
  t.cycle = "2026-10-19"; // the cycle starts tomorrow
  eq("review: future week shows no review", R.reviewState("mat", "A"), null);
  t.cycle = "2026-10-05";
  let rv = R.reviewState("mat", "B");
  yes("review: this week, every day done, shows the review", rv && rv.allDone && rv.current && !rv.over);
  eq("review: week range", rv && [rv.from, rv.to], ["2026-10-12", "2026-10-18"]);
  t.status = { BThu: "missed" };
  eq("review: this week with a day still to do waits", R.reviewState("mat", "B"), null);
  t.today = "2026-10-20";
  rv = R.reviewState("mat", "B");
  yes("review: a past week always shows, even with a missed day", rv && rv.over && !rv.current && !rv.allDone);
  t.today = "2026-10-18"; t.status = {};
  state.data.sessions = [sess("2026-10-18", "B", "Thu", [press([set(100, 8)])], { startedAt: 1, finishedAt: 0 })];
  eq("review: waits while today's workout is still going", R.reviewState("mat", "B"), null);
  state.data.sessions[0].finishedAt = 2;
  yes("review: shows once today's workout is finished", R.reviewState("mat", "B"));

  // Growth against the last time before the week.
  state.data.sessions = [sess("2026-09-24", "B", "Mon", [press([set(100, 8), set(100, 8)])])];
  eq("growth: first time is marked first", R.growthOf("mat", { id: "squat", kind: "load", sets: [set(50, 8)] }, "2026-10-12"), { first: true });
  let g = R.growthOf("mat", press([set(110, 8)]), "2026-10-12");
  eq("growth: heavier weight", g.text, "100 → 110 lb");
  yes("growth: heavier weight is a new best", g.pr);
  g = R.growthOf("mat", press([set(100, 10)]), "2026-10-12");
  eq("growth: same weight, more reps", g.text, "100 lb: 8 → 10 reps");
  g = R.growthOf("mat", press([set(95, 8)]), "2026-10-12");
  eq("growth: lighter shows no jump", [g.text, !!g.pr], [null, false]);
  state.data.sessions = [sess("2026-09-24", "B", "Mon", [{ id: "dip", name: "Assisted dip", kind: "assist", sets: [set(60, 8)] }])];
  g = R.growthOf("mat", { id: "dip", kind: "assist", sets: [set(50, 8)] }, "2026-10-12");
  eq("growth: less assist counts as growth", g.text, "60 → 50 lb assist");
  state.data.sessions = [sess("2026-09-24", "B", "Mon", [press([set(100, 8)], { variant: "db" })])];
  eq("growth: a different variant starts fresh", R.growthOf("mat", press([set(110, 8)]), "2026-10-12"), { first: true });

  // Bonus suggestion: what got the least work, nudged toward what they asked for.
  const PG = await import(join(dir, "program.js"));
  t.prof = { mat: { focus: ["arms"] } };
  let sug = R.bonusSuggest("mat", []);
  eq("bonus: with nothing logged, what they asked for wins", sug.key, "arms");
  yes("bonus: and says they didn't train it", /didn't train arms/.test(sug.why));
  t.prof = { mat: {} };
  const { ALL_EX } = await import(join(dir, "plan.js"));
  const chestId = Object.keys(ALL_EX).find(id => (ALL_EX[id].focus || []).includes("chest"));
  sug = R.bonusSuggest("mat", [{ exercises: [{ id: chestId, sets: [set(1, 1), set(1, 1), set(1, 1)] }] }]);
  yes("bonus: doesn't suggest what was just trained", sug.key !== "chest" && PG.BONUS_FOCUS[sug.key]);
  yes("bonus: never suggests full, upper or lower", !["full", "upper", "lower"].includes(sug.key));

  // The whole review.
  t.today = "2026-10-18"; t.status = {}; t.prof = { mat: {} }; state.bonusDraft = null;
  state.data.sessions = [
    sess("2026-09-28", "B", "Mon", [press([set(100, 8), set(100, 8)])]),
    sess("2026-10-12", "B", "Mon", [press([set(110, 8, 3), set(110, 7, 3)])], { startedAt: 1000, finishedAt: 1000 + 45 * 60000 }),
    sess("2026-10-13", "B", "Tue", [{ id: "row", name: "Cable row", kind: "load", sets: [set(80, 10)] }]),
    sess("2026-10-14", "B", "Wed", [], { markedDone: true }),
    sess("2026-10-15", "B", "Thu", [{ id: "plank", name: "Plank", kind: "time", sets: [{ r: 30 }] }]),
  ];
  rv = R.reviewState("mat", "B");
  const html = R.weekReview("mat", "B", rv);
  yes("review html: headline", html.includes("Week B, done."));
  yes("review html: next week note", html.includes("Week A starts Monday"));
  yes("review html: growth line", html.includes("100 → 110 lb"));
  yes("review html: compares with the same week last cycle", /lb more than your last Week B/.test(html));
  yes("review html: worth noting a hard exercise", html.includes("Bench press: 2 sets felt Hard"));
  yes("review html: time training", html.includes("45 min"));
  yes("review html: bonus tile this week", html.includes("bonus-tile") && state.bonusDraft?.week === "2026-10-12");
  yes("review html: one first-time exercise per new move", html.includes("2 exercises were new to you"));
  t.today = "2026-10-25";
  yes("review html: no bonus tile for a past week", !R.weekReview("mat", "B", R.reviewState("mat", "B")).includes("bonus-tile"));

  // ------------------------------------------------------------ delete my account
  copyFileSync(join(here, "fake-firebase.mjs"), join(dir, "fake-firebase.js"));
  writeFileSync(join(dir, "firebase.js"), readFileSync(join(here, "../js/firebase.js"), "utf8")
    .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/firebase-(app|auth|firestore)\.js/g, "./fake-firebase.js"));
  const FB = await import(join(dir, "firebase.js"));
  const fake = await import(join(dir, "fake-firebase.js"));
  const { docs, fakeAuth, calls } = fake;
  const seed = rows => { docs.clear(); calls.length = 0; fakeAuth.deleted.length = 0; for (const [p, d] of Object.entries(rows)) docs.set(p, d); };
  const has = p => docs.has(p);
  const crew = (owner, members, extra = {}) => ({
    "crews/c1": { name: "Gym", owner, code: "ABC123" }, "codes/ABC123": { crew: "c1" },
    ...Object.fromEntries(members.map(([uid, joinedAt]) => [`crews/c1/members/${uid}`, { joinedAt, role: uid === owner ? "owner" : "member" }])),
    ...extra,
  });
  const data = {
    "crews/c1/sessions/s1": { user: "mat" }, "crews/c1/sessions/s2": { user: "benny" },
    "crews/c1/body/b1": { user: "mat" }, "crews/c1/activities/a1": { user: "mat" }, "crews/c1/activities/a2": { user: "benny" },
    "crews/c1/profiles/mat": { name: "Mat" }, "crews/c1/profiles/benny": { name: "Benny" },
    "crews/c1/settings/plan_mat": {}, "crews/c1/settings/deload_mat": {}, "crews/c1/settings/plan_benny": {}, "crews/c1/settings/gym": {},
    "feedback/f1": { uid: "u1", text: "mine" }, "feedback/f2": { uid: "u2", text: "theirs" },
    "users/u1": { crewId: "c1" }, "users/u2": { crewId: "c1" },
  };

  // A member (not the owner) leaves a two-person crew.
  seed(crew("u2", [["u1", 2], ["u2", 1]], data)); fakeAuth.currentUser = { uid: "u1", email: "a@b.c" };
  await FB.deleteEverything("c1", "mat");
  yes("delete: my sessions, body and activities are gone", !has("crews/c1/sessions/s1") && !has("crews/c1/body/b1") && !has("crews/c1/activities/a1"));
  yes("delete: my profile and plan settings are gone", !has("crews/c1/profiles/mat") && !has("crews/c1/settings/plan_mat") && !has("crews/c1/settings/deload_mat"));
  yes("delete: the other person's data stays", has("crews/c1/sessions/s2") && has("crews/c1/activities/a2") && has("crews/c1/profiles/benny") && has("crews/c1/settings/plan_benny"));
  yes("delete: shared crew settings stay", has("crews/c1/settings/gym"));
  yes("delete: I'm out of the crew; the crew stays", !has("crews/c1/members/u1") && has("crews/c1") && has("codes/ABC123"));
  eq("delete: the owner doesn't change", docs.get("crews/c1").owner, "u2");
  yes("delete: my feedback and user record are gone, theirs stay", !has("feedback/f1") && has("feedback/f2") && !has("users/u1") && has("users/u2"));
  eq("delete: the sign-in is deleted last, then the phone copy cleared", calls.slice(-3).map(c => c[0]), ["deleteUser", "terminate", "clearCache"]);

  // The owner leaves: the crew goes to whoever has been in it longest.
  seed(crew("u1", [["u1", 1], ["u3", 30], ["u2", 20]], data)); fakeAuth.currentUser = { uid: "u1" };
  await FB.deleteEverything("c1", "mat");
  eq("delete as owner: the longest-standing member takes over", docs.get("crews/c1").owner, "u2");
  eq("delete as owner: and is marked owner", docs.get("crews/c1/members/u2").role, "owner");
  eq("delete as owner: the newer member stays a member", docs.get("crews/c1/members/u3").role, "member");
  yes("delete as owner: the crew and the other person's data stay", has("crews/c1") && has("crews/c1/sessions/s2"));
  const roleAt = calls.findIndex(c => c[0] === "update" && c[1] === "crews/c1/members/u2"), ownerAt = calls.findIndex(c => c[0] === "update" && c[1] === "crews/c1");
  yes("delete as owner: the new owner's role is set before the crew changes hands", roleAt >= 0 && roleAt < ownerAt);
  yes("delete as owner: hand-off happens before leaving", ownerAt < calls.findIndex(c => c[0] === "delete" && c[1] === "crews/c1/members/u1"));

  // The last one out: the whole crew goes.
  seed(crew("u1", [["u1", 1]], data)); fakeAuth.currentUser = { uid: "u1" };
  await FB.deleteEverything("c1", "mat");
  eq("delete as last member: nothing left under the crew", [...docs.keys()].filter(p => p.startsWith("crews/c1")), []);
  yes("delete as last member: the invite code is freed", !has("codes/ABC123"));
  yes("delete as last member: other people's feedback is untouched", has("feedback/f2"));

  // Last one out of a crew whose owner already left: take ownership first so the rules allow the delete.
  seed(crew("gone", [["u1", 1]], data)); fakeAuth.currentUser = { uid: "u1" };
  await FB.deleteEverything("c1", "mat");
  const takeAt = calls.findIndex(c => c[0] === "update" && c[1] === "crews/c1" && c[2].owner === "u1");
  yes("delete when the owner is gone: takes over first", takeAt >= 0 && takeAt < calls.findIndex(c => c[0] === "delete" && c[1] === "crews/c1"));
  yes("delete when the owner is gone: crew deleted", !has("crews/c1"));

  // No crew yet (signed up, never joined).
  seed({ "feedback/f1": { uid: "u1" }, "users/u1": {} }); fakeAuth.currentUser = { uid: "u1" };
  await FB.deleteEverything(null, null);
  yes("delete without a crew: feedback, user record and sign-in go", !has("feedback/f1") && !has("users/u1") && fakeAuth.deleted.includes("u1"));

  // Re-confirming the sign-in first.
  fakeAuth.currentUser = { uid: "u1", email: "a@b.c" }; calls.length = 0;
  await FB.reauth(null);
  eq("reauth: Google accounts confirm with the Google window", calls.map(c => c[0]), ["reauthPopup"]);
  await FB.reauth("right");
  eq("reauth: email accounts confirm with the password", calls.at(-1)[0], "reauthPassword");
  let msg = ""; try { await FB.reauth("wrong"); } catch (e) { msg = e.message; }
  eq("reauth: a wrong password gets a plain message", msg, "That email and password don't match. Try again, or use Forgot password.");
  fakeAuth.currentUser = null; msg = ""; try { await FB.reauth(null); } catch (e) { msg = e.message; }
  eq("reauth: signed out", msg, "You're signed out. Sign in again first.");

  // Restoring a backup: shared gyms keep whoever shared them, and new ones belong to the person restoring.
  seed({ "crews/c1/gyms/g1": { name: "Kirkwood", owner: "u2", items: ["a"] } }); fakeAuth.currentUser = { uid: "u1" };
  FB.connect("c1", () => {}, () => {});
  const nRestored = await FB.importAll({ sessions: [{ id: "s1", user: "mat" }],
    gyms: [{ id: "g1", name: "Kirkwood", owner: "u1", crew: true, items: ["a", "b"] }, { id: "g2", name: "Hotel", owner: "u9", items: [] }, { name: "no id" }] });
  eq("restore: counts sessions and gyms", nRestored, 3);
  eq("restore: an existing gym keeps its owner", docs.get("crews/c1/gyms/g1").owner, "u2");
  eq("restore: a new gym belongs to the restorer", docs.get("crews/c1/gyms/g2").owner, "u1");
  yes("restore: the app-only crew flag isn't saved", !("crew" in docs.get("crews/c1/gyms/g1")));
}
