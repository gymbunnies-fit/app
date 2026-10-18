// Settings, including Delete my account.
import { $, APP_VERSION, FUN_LEVELS, P, THEMES, TODAY, a11yOn, crewSettings, cycleStart, esc, gymSet, other, personToggle, profileIds, state, stopAll, store, toast } from "../app.js";
import * as A from "../a11y.js";
import * as S from "../stats.js";
import { fbMine, fbNew } from "./feedback.js";
import { cssVar } from "./progress.js";
import { ev, isAdmin } from "./usage.js";
import { deleteEverything, reauth } from "../firebase.js";

// ---------------------------------------------------------------- settings
// ---------------------------------------------------------------- delete my account
function delAcctCard() {
  const a = state.auth, me = a.user, d = state.delAcct || {};
  const others = (a.members || []).filter(m => m.uid !== me?.uid).sort((x, y) => (x.joinedAt || 0) - (y.joinedAt || 0));
  const owner = a.crew?.owner === me?.uid;
  const pwOnly = !(me?.providers || []).includes("google.com");
  const crewLine = !others.length ? `You're the only one in ${esc(a.crew?.name || "this crew")}, so the crew and everything in it will be deleted too.`
    : owner ? `You own ${esc(a.crew?.name || "this crew")}. It will pass to ${esc(others[0].name || "the longest-standing member")}, and everyone else keeps their own data.`
    : `Everyone else in ${esc(a.crew?.name || "the crew")} keeps their own data.`;
  return `<section class="card del-acct" aria-labelledby="da-h"><h3 class="h3" id="da-h">Delete my account</h3>
    <p class="small">Permanently erases your workouts, body measurements, check-ins, profile and feedback, takes you out of the crew, and deletes your sign-in. This can't be undone. <a href="privacy.html">Privacy page</a></p>
    <p class="small">${crewLine}</p>
    ${!d.step ? `<button class="btn danger small" data-act="delAcct">Delete my account…</button>` : `
      <p class="small"><b>Are you sure?</b> ${pwOnly ? "Enter your password to confirm." : "Google will ask you to confirm it's you."}</p>
      ${pwOnly ? `<label class="field">Password<input type="password" id="da-pw" autocomplete="current-password"></label>` : ""}
      ${d.error ? `<p class="small" role="alert" style="color:var(--bad,#b3261e)">${esc(d.error)}</p>` : ""}
      <div class="row"><button class="btn danger" data-act="delAcctGo" ${d.busy ? "disabled" : ""}>${d.busy ? "Deleting…" : "Delete everything permanently"}</button><button class="btn" data-act="delAcctCancel" ${d.busy ? "disabled" : ""}>Keep my account</button></div>`}
  </section>`;
}
async function deleteMyAccount() {
  const d = state.delAcct; if (!d || d.busy) return;
  const me = state.auth.user, pwOnly = !(me?.providers || []).includes("google.com");
  const pw = pwOnly ? ($("#da-pw")?.value || "") : null;
  if (pwOnly && !pw) { d.error = "Enter your password first."; openSettings(); $("#da-pw")?.focus(); return; }
  d.busy = true; d.error = ""; openSettings();
  try {
    await reauth(pw);
    const crewId = state.auth.crewId, profileId = (state.auth.members || []).find(m => m.uid === me.uid)?.profileId || "";
    const uid = me.uid;
    stopAll();
    await deleteEverything(crewId, profileId);
    for (const k of Object.keys(localStorage)) if (k.includes(uid) || /^(twp-user|twp-view|twp-variants|gb-)/.test(k)) store.del(k);
    try { sessionStorage.setItem("gb-deleted", "1"); } catch {}
    location.reload();
  } catch (e) {
    d.busy = false; d.error = e.message || String(e);
    if (state.overlay === "settings") openSettings(); else toast(d.error);
  }
}
try { if (sessionStorage.getItem("gb-deleted")) { sessionStorage.removeItem("gb-deleted"); setTimeout(() => toast("Your account and everything in it has been deleted."), 800); } } catch {}

function openSettings() {
  if (state.overlay !== "settings") ev("v_settings");
  state.overlay = "settings";
  const u = state.user; const p = P(u); const cs = cycleStart(); const ci = S.cycleInfo(TODAY(), cs); const g = gymSet();
  const one = (act, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-label="Settings"><div class="inner">
    <div class="between"><h2 class="h2">Settings</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <section class="card"><h3 class="h3">App version ${APP_VERSION}</h3>
      <p class="small">The app updates itself when it opens. If something looks out of date, tap below to get the newest version right now.</p>
      <button class="btn primary block" data-act="updateApp">Update app</button></section>
    <section class="card"><h3 class="h3">Accessibility</h3>
      <p class="small">${a11yOn() ? `${a11yOn()} option${a11yOn() === 1 ? "" : "s"} changed.` : "Text size, contrast, reading fonts, spoken timers, screen flashes, one-step-at-a-time, and more."}</p>
      <button class="btn primary" data-act="openA11y">Accessibility options</button></section>
    ${crewSettings()}
    <section class="card"><h3 class="h3">Exercise library</h3>
      <p class="small">Every exercise and machine, with how-tos, risks, and filters. Add your own, mark what's sore today, or add exercises to your plan.</p>
      <button class="btn small" data-act="openLib">Open the exercise library</button></section>
    <section class="card"><h3 class="h3">Share GymBunnies.fit</h3>
      <p class="small">Sends the link with the GymBunnies.fit preview card. Use this instead of the browser's share button, which sends a picture of your screen.</p>
      <button class="btn primary small" data-act="shareApp">Share the app</button></section>
    <section class="card"><h3 class="h3">Feedback and ideas</h3>
      <p class="small">Something broken, or an idea for the app? Send it to Mat and Benny.${fbMine().filter(f => f.reply).length ? ` You have ${fbMine().filter(f => f.reply).length} repl${fbMine().filter(f => f.reply).length === 1 ? "y" : "ies"}.` : ""}</p>
      <div class="row"><button class="btn primary small" data-act="fbOpen">Send feedback</button>${isAdmin() ? `<button class="btn small" data-act="fbInbox">Inbox${fbNew() ? ` (${fbNew()} new)` : ""}</button>` : ""}</div></section>
    <section class="card"><h3 class="h3">Your plan</h3>
      <p class="small">${p.onboardedAt ? `Tailored from your questionnaire: ${p.daysPerWeek || 4} day${(p.daysPerWeek || 4) === 1 ? "" : "s"} a week${(p.tailorList || []).length ? `, ${p.tailorList.length} exercise${p.tailorList.length === 1 ? "" : "s"} adjusted for you` : ""}.` : "Answer a few questions about your goals, injuries, and schedule, and the plan adjusts to fit you."}</p>
      <div class="row"><button class="btn primary small" data-act="obRetake">${p.onboardedAt ? "Retake the questionnaire" : "Tailor my plan"}</button>${(p.tailorList || []).length ? `<button class="btn small" data-act="tailorOff">Use the standard plan</button>` : ""}</div></section>
    <section class="card"><h3 class="h3">Who's using this phone</h3>${personToggle("pickUser", u)}
      <div class="row"><button class="btn small" data-act="editProfile">Edit ${esc(p.name)}'s profile</button><button class="btn small" data-act="newProfile">+ New person</button></div>
      ${profileIds().length > 1 ? `<label class="check"><input type="checkbox" data-act="partner" ${state.partner ? "checked" : ""}><span>Partner mode: log for a partner from this phone</span></label>` : ""}
      ${profileIds().length > 2 ? `<div class="field"><span>Training partner</span>${one("pickPartner", other(u), profileIds().filter(id => id !== u).map(id => [id, P(id).name]))}</div>` : ""}</section>
    <section class="card"><h3 class="h3">Look</h3>
      <div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button type="button" class="theme-tile" data-act="setTheme" data-v="${k}" aria-pressed="${(p.theme || "bunny") === k}"><div class="sw" style="background:${t.sw[0]}"><i style="background:${t.sw[1]}"></i><i style="background:${t.sw[2]}"></i></div><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join("")}</div>
      <div class="grid2"><label class="field">Accent color<input type="color" data-act="setAccent" value="${esc(p.accent || cssVar("--accent") || "#2f6b5e")}"></label>
      <div class="field"><span>&nbsp;</span><button class="btn small" data-act="resetAccent">Use the theme's color</button></div></div>
      <div class="field"><span>Text size</span>${one("setText", A.get().textSize || "m", Object.entries(A.LABELS.textSize))}</div></section>
    <section class="card"><h3 class="h3">Personality</h3>
      <div class="field"><span>How the app talks to you</span>${one("setVoice", p.voice || "hype", [["hype", "Hype"], ["chill", "Chill"], ["plain", "Just the numbers"]])}</div>
      <div class="field"><span>Fun level</span>${one("setFun", p.fun || "medium", [["light", "Light"], ["medium", "Medium"], ["full", "Full"]])}<p class="small muted">${esc(FUN_LEVELS[p.fun || "medium"])}</p></div>
      <label class="check"><input type="checkbox" data-act="setSound" ${p.sound !== false ? "checked" : ""}><span>Sounds and vibration</span></label></section>
    <section class="card"><h3 class="h3">Our gym</h3>
      <p class="small muted">Shared by everyone. Weights step by 2.5 lb; hold + or − to keep going.</p>
      <label class="field">Smith bar weight (lb)<input type="number" step="any" data-gym="smithBar" value="${esc(g.smithBar ?? "")}" placeholder="Check at the gym"></label></section>
    <section class="card"><h3 class="h3">Two-week cycle</h3>
      <label class="field">Week A started on (a Monday)<input type="date" data-act="cycleStart" value="${cs}"></label>
      <p class="small muted">Today is in Week ${ci.week}. Shared by everyone.</p></section>
    <section class="card"><h3 class="h3">Install on your phone</h3>
      <p class="small"><b>iPhone:</b> open this page in Safari, tap Share, then Add to Home Screen.</p>
      <p class="small"><b>Android:</b> open it in Chrome, tap the ⋮ menu, then Install app.</p><p class="small muted">App version ${APP_VERSION}. If a fix isn't showing up, close the app completely (swipe it away) and open it again.</p></section>
    <section class="card"><h3 class="h3">Backup</h3>
      <div class="row"><button class="btn" data-act="export">Download backup</button><label class="btn">Restore backup<input type="file" accept="application/json" data-act="import" hidden></label></div></section>
      ${delAcctCard()}
  </div></div>`;
}

export { deleteMyAccount, openSettings };
