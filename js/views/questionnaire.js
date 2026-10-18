// The onboarding questionnaire: one question per screen.
import { $, AVATARS, GROUPS, P, PROFILE_DEFAULTS, closeOverlay, dayName, esc, libItem, listText, profileIds, render, saveProfile, slug, state, store, toast } from "../app.js";
import * as PG from "../program.js";
import * as TL from "../tailor.js";
import { track } from "./usage.js";
import { ALL_EX, DAYS, FOCUS, PAIN_AREAS, PLAN } from "../plan.js";

// ---------------------------------------------------------------- onboarding questionnaire
// One question per screen. New people go through it when they're added; anyone can retake it from Settings.
// Finishing tailors the plan to them (see tailor.js) and saves the answers on their profile.
const OB_STEPS = ["name", "goals", "focus", "experience", "schedule", "injuries", "limits", "home", "cardio", "review"];
function openOnboarding(id) {
  state.overlay = "onboard";
  const p = id ? P(id) : { ...PROFILE_DEFAULTS, name: "", color: ["#2f6b5e", "#4b5d8a", "#b5532f", "#8a5a9c", "#2e7d4f", "#9a6b12"][profileIds().length % 6] };
  state.ob = { id, step: 0, a: {
    name: p.name || "", avatar: p.avatar || "", color: p.color, goals: [...(p.goals || [])], goalNote: p.focusNote || "", focus: [...(p.focus || [])],
    experience: p.experience || "", intensity: p.intensity || "steady", days: p.daysPerWeek || 4, sessionLen: p.sessionLen || 60,
    style: p.planStyle || "auto", homeGear: [...(p.homeGear || [])],
    injuries: id ? [...(p.injuries || [])] : [], injuryNote: p.injuryNote || "", limits: [...(p.limits || [])], limitNote: p.limitNote || "",
    cardio: p.cardio || "steady", commute: !!p.commute?.enabled, miles: p.commute?.miles || ""
  } };
  drawOnboarding();
}
function obAnswers() { const a = state.ob.a; return { injuries: a.injuries, limits: a.limits, experience: a.experience || "some", intensity: a.intensity }; }
function drawOnboarding() {
  const o = state.ob, a = o.a, step = OB_STEPS[o.step], n = OB_STEPS.length;
  const multi = (k, opts, none) => `<div class="focus-chips ob-chips" role="group">${opts.map(([v, l]) => `<button type="button" data-act="obToggle" data-k="${k}" data-v="${v}" aria-pressed="${a[k].includes(v)}">${esc(l)}</button>`).join("")}${none ? `<button type="button" data-act="obNone" data-k="${k}" aria-pressed="${!a[k].length}">${esc(none)}</button>` : ""}</div>`;
  const single = (k, opts) => `<div class="ob-choices" role="radiogroup">${opts.map(([v, l, sub]) => `<button type="button" role="radio" data-act="obPick" data-k="${k}" data-v="${v}" aria-checked="${String(a[k]) === String(v)}"><b>${esc(l)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</button>`).join("")}</div>`;
  const q = (title, sub, body) => `<h2 class="h2 ob-q" id="ob-q" tabindex="-1">${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ""}${body}`;
  let body = "";
  if (step === "name") body = q(o.id ? `Let's update your plan, ${esc(a.name)}` : "Welcome! Let's build your plan.", "A few quick questions so the workouts fit you: your goals, your body, and your schedule. About two minutes.",
    `<label class="field">First name<input type="text" data-ob="name" value="${esc(a.name)}" placeholder="First name" autocomplete="given-name"></label>
     <div class="field"><span>Pick an avatar</span><div class="avatars"><button type="button" data-act="obPick" data-k="avatar" data-v="" aria-pressed="${!a.avatar}">${esc((a.name || "A")[0].toUpperCase())}</button>${AVATARS.map(x => `<button type="button" data-act="obPick" data-k="avatar" data-v="${x}" aria-pressed="${a.avatar === x}">${x}</button>`).join("")}</div></div>`);
  if (step === "goals") body = q("What do you want out of training?", "Pick up to three.", multi("goals", Object.entries(TL.GOALS)) +
    `<label class="field">Anything else? (optional)<textarea data-ob="goalNote" placeholder="Get ready for a hike, fit into my suit for a wedding…">${esc(a.goalNote)}</textarea></label>`);
  if (step === "focus") body = q("Any body parts you want extra attention on?", "Optional. Leave it blank for a balanced plan.", multi("focus", [...GROUPS.filter(g => g !== "cardio").map(g => [g, FOCUS[g]]), ["full", "Full body"], ["cardio", "Cardio fitness"]]));
  if (step === "experience") body = q("How much have you trained before?", "", single("experience", Object.entries(TL.EXPERIENCE).map(([k, [l, s]]) => [k, l, s]))) +
    `<h3 class="h3 ob-sub">How hard should we push?</h3>` + single("intensity", [["easy", "Ease me in", "Lighter start, build up slowly"], ["steady", "Steady", "Challenging but comfortable"], ["push", "Push me", "Harder versions when they're safe for you"]]);
  if (step === "schedule") body = q("How many days a week do you want to train?", "Your plan gets this many workouts a week. Do them on whatever days you make it in. On days off, bonus workouts are always there if you want them.",
    `<div class="seg ob-days" role="radiogroup">${[1, 2, 3, 4, 5, 6, 7].map(d => `<button type="button" role="radio" data-act="obPick" data-k="days" data-v="${d}" aria-checked="${+a.days === d}" aria-label="${d} day${d === 1 ? "" : "s"} a week">${d}</button>`).join("")}</div>
     <h3 class="h3 ob-sub">How do you want your week laid out?</h3>` + single("style", Object.entries(PG.STYLES).map(([k, [l, sub]]) => [k, l, sub])) +
    `<h3 class="h3 ob-sub">How long is a typical session?</h3>` + single("sessionLen", Object.entries(TL.SESSION_LEN)));
  if (step === "home") body = q("Some days you won't make it to the gym. What do you have at home?", "Your home workout uses only what you pick. Pick all that apply.",
    multi("homeGear", Object.entries(PG.HOME_GEAR), "Nothing, just me"));
  if (step === "injuries") body = q("Any injuries, aches, or weak spots?", "We'll swap in gentler exercises for these and track them in your daily check-in. Pick all that apply.",
    multi("injuries", Object.entries(PAIN_AREAS), "None") + `<label class="field">Details (optional)<textarea data-ob="injuryNote" placeholder="Torn meniscus in my left knee, 2023…">${esc(a.injuryNote)}</textarea></label>
     <p class="small muted">This isn't medical advice. If something hurts, stop, and check with a doctor or physical therapist.</p>`);
  if (step === "limits") body = q("Anything we should work around?", "Pick all that apply.", multi("limits", Object.entries(TL.LIMITS), "None of these") +
    `<label class="field">Anything else? (optional)<textarea data-ob="limitNote" placeholder="Bad balance on my left side, no lying flat…">${esc(a.limitNote)}</textarea></label>`);
  if (step === "cardio") body = q("How do you like your cardio?", "", single("cardio", [["steady", "Steady", "Bike, elliptical, or walking at a pace you can talk at"], ["intervals", "Steady plus intervals", "Two days a week of hard and easy bursts"]])) +
    `<label class="check"><input type="checkbox" data-ob="commute" ${a.commute ? "checked" : ""}><span>I bike or walk to work (counts as cardio)</span></label>
     <label class="field">Round-trip miles (optional)<input type="number" inputmode="decimal" step="any" data-ob="miles" value="${esc(a.miles)}"></label>`;
  if (step === "review") {
    const t = TL.tailorPlan(obAnswers()); const list = Object.entries(t);
    const line = ([exId, x]) => { const ex = ALL_EX[exId]; const nm = x.v === "hard" ? ex.h?.n : x.v === "swap" ? ex.swap?.n : libItem(x.v.slice(4))?.name; return `<li><b>${esc(ex.n)}</b> → ${esc(nm || "")}<br><span class="small muted">${esc(x.why)} · Week ${ex.week} ${dayName(ex.day)}</span></li>`; };
    const gentle = list.filter(([, x]) => x.v !== "hard"), harder = list.filter(([, x]) => x.v === "hard");
    body = q(`Here's your plan${a.name ? ", " + esc(a.name) : ""}`, "",
      `${(() => { const pv = { ...obAnswers(), onboardedAt: 1, daysPerWeek: +a.days, planStyle: a.style, sessionLen: +a.sessionLen, focus: a.focus, homeGear: a.homeGear };
          const wk = PG.buildWeek(pv, "A") || DAYS.map((d, i) => ({ key: d, title: PLAN.A[d].title, ex: PLAN.A[d].ex }));
          return `<section class="card ob-sum"><h3 class="h3">Your week</h3><ol class="ob-week">${wk.map((d, i) => `<li><b>Day ${i + 1}</b> · ${esc(d.title)} <span class="small muted">(${d.ex.length} exercises)</span></li>`).join("")}</ol>
            <p class="small muted">Week A and Week B use different exercises. Plus a ${PG.buildHome(pv, "A").ex.length}-exercise home workout for days you can't make it to the gym.</p></section>`; })()}
       <section class="card ob-sum"><p><b>${a.days} day${+a.days === 1 ? "" : "s"} a week</b> · ${esc(TL.SESSION_LEN[a.sessionLen] || "")} · ${esc(TL.EXPERIENCE[a.experience || "some"][0])}</p>
        ${a.goals.length ? `<p>Goals: ${esc(listText(a.goals.map(g => TL.GOALS[g].toLowerCase())))}.</p>` : ""}
        ${a.focus.length ? `<p>Extra attention: ${esc(listText(a.focus.map(f => (FOCUS[f] || f).toLowerCase())))}.</p>` : ""}</section>
       ${list.length ? `<p>We changed <b>${list.length}</b> exercise${list.length === 1 ? "" : "s"} to fit you. You can switch any of them back on the workout card.</p>
         ${gentle.length ? `<details class="more" open><summary>Gentler or safer for you (${gentle.length})</summary><div class="panel"><ul class="ob-list">${gentle.map(line).join("")}</ul></div></details>` : ""}
         ${harder.length ? `<details class="more"><summary>Tougher versions (${harder.length})</summary><div class="panel"><ul class="ob-list">${harder.map(line).join("")}</ul></div></details>` : ""}`
        : `<p>The standard plan already fits you, so nothing needed changing. You can still pick a different version of any exercise on its card.</p>`}
       <p class="small muted">Change any of this later in Settings → Your plan → Retake the questionnaire.</p>`);
  }
  const canNext = step !== "name" || a.name.trim();
  $("#overlay").innerHTML = `<div class="overlay ob" role="dialog" aria-modal="true" aria-labelledby="ob-q"><div class="inner">
    <div class="between"><span class="eyebrow">Step ${o.step + 1} of ${n}</span><button class="btn small" data-act="closeOverlay">${o.id ? "Cancel" : "Later"}</button></div>
    <div class="ob-progress" role="progressbar" aria-label="Questionnaire progress" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${o.step + 1}"><i style="width:${((o.step + 1) / n) * 100}%"></i></div>
    ${body}
    <div class="ob-nav">${o.step ? `<button class="btn" data-act="obBack">Back</button>` : "<span></span>"}
      ${step === "review" ? `<button class="btn primary" data-act="obFinish">${o.id ? "Save my plan" : "Start training"}</button>` : `<button class="btn primary" data-act="obNext" ${canNext ? "" : "disabled"}>${step === "cardio" ? "See my plan" : "Next"}</button>`}</div>
  </div></div>`;
  const h = $("#ob-q"); h?.focus({ preventScroll: true }); $("#overlay .overlay")?.scrollTo(0, 0);
}
function finishOnboarding() {
  const o = state.ob, a = o.a; const name = a.name.trim(); if (!name) { o.step = 0; drawOnboarding(); return; }
  let id = o.id; if (!id) { id = slug(name) || "person"; let k = 2; while (profileIds().includes(id)) id = `${slug(name)}-${k++}`; }
  const tailor = TL.tailorPlan(obAnswers());
  const harder = a.experience === "veteran" || (a.experience === "regular" && a.intensity === "push");
  saveProfile(id, {
    name, avatar: a.avatar, color: a.color || "#2f6b5e", goals: a.goals, focusNote: a.goalNote.trim(), focus: a.focus,
    experience: a.experience || "some", intensity: a.intensity, daysPerWeek: +a.days || 4, sessionLen: +a.sessionLen || 60,
    planStyle: a.style || "auto", homeGear: a.homeGear,
    injuries: a.injuries, injuryNote: a.injuryNote.trim(), limits: a.limits, limitNote: a.limitNote.trim(),
    pain: a.injuries.length ? a.injuries : (o.id ? P(id).pain : ["knees", "shoulders", "lowerBack"]),
    defaultVariant: harder ? "hard" : "std", cardio: a.cardio, commute: { enabled: !!a.commute, miles: +a.miles || 0 },
    tailorList: Object.entries(tailor).map(([exId, t]) => ({ id: exId, v: t.v, why: t.why })), onboardedAt: Date.now()
  });
  // Tailored picks win over a version chosen earlier on this phone.
  for (const exId of Object.keys(tailor)) delete state.variants[`${id}:${exId}`];
  store.set("twp-variants", state.variants);
  if (!o.id && !state.user) { state.user = id; state.viewUser = id; store.set("twp-user", id); }
  if (!o.id) track({ onboarded: 1 });
  state.ob = null; closeOverlay();
  toast(o.id ? "Your plan is updated." : `Welcome, ${name}! Your plan is ready.`); render();
}

// Share the plain site address (not the page you're on), so Messages builds the brand preview card.
const SITE_URL = "https://gymbunnies.fit/";
function shareLink(title, text) {
  if (navigator.share) { navigator.share({ title, text, url: SITE_URL }).catch(() => {}); return; }
  const all = `${text} ${SITE_URL}`;
  navigator.clipboard?.writeText(all).then(() => toast("Copied. Paste it into a message."), () => toast(all));
}

export { OB_STEPS, drawOnboarding, finishOnboarding, openOnboarding, shareLink };
