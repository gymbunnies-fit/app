// Feedback and ideas: send, read replies, and (for the admin) answer.
import { $, a11yOn, esc, state, store, toast } from "../app.js";
import * as A from "../a11y.js";
import { isAdmin } from "./usage.js";

// ---------------------------------------------------------------- feedback
const FB_KINDS = { bug: "Something's broken", idea: "Feature idea", other: "Something else" };
const FB_STATUS = { new: "New", seen: "Read", planned: "Planned", done: "Done", no: "Not now" };
const fbMine = () => (state.fb || []).filter(f => f.uid === state.auth?.user?.uid).sort((a, b) => b.at - a.at);
const fbNew = () => (state.fb || []).filter(f => f.status === "new").length;
function fbWhen(t) { return t ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""; }
function fbItem(f, admin) {
  return `<li class="fb-item"><div class="between"><b>${esc(FB_KINDS[f.kind] || "Feedback")}</b><span class="tag fb-st fb-${esc(f.status)}">${esc(FB_STATUS[f.status] || f.status)}</span></div>
    <p class="small muted">${admin ? `${esc(f.name || "Someone")}${f.crew ? ` · ${esc(f.crew)}` : ""} · ` : ""}${esc(fbWhen(f.at))} · v${esc(f.v || "?")}</p>
    <p class="fb-text">${esc(f.text)}</p>
    ${f.reply ? `<p class="fb-reply"><b>Reply:</b> ${esc(f.reply)}</p>` : ""}
    ${admin ? `<div class="seg wrap" role="group" aria-label="Status">${Object.entries(FB_STATUS).map(([k, l]) => `<button type="button" data-act="fbStatus" data-id="${esc(f.id)}" data-v="${k}" aria-pressed="${f.status === k}">${esc(l)}</button>`).join("")}</div>
      <label class="field">Reply (they see this in Settings)<textarea rows="2" id="fbr-${esc(f.id)}">${esc(f.reply || "")}</textarea></label>
      <button class="btn small" data-act="fbReply" data-id="${esc(f.id)}">Save reply</button>` : ""}</li>`;
}
function openFeedback(mode = "send") { state.overlay = "feedback"; state.fbMode = mode; drawFeedback(); }
function drawFeedback() {
  if (state.overlay !== "feedback") return;
  const admin = state.fbMode === "inbox" && isAdmin(), d = state.fbDraft || (state.fbDraft = { kind: "idea", text: "" });
  const list = admin ? (state.fb || []).slice().sort((a, b) => (a.status === "new") - (b.status === "new") || a.at - b.at).reverse() : fbMine();
  const keep = $("#fb-text") === document.activeElement;
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-labelledby="fb-title"><div class="inner">
    <div class="between"><h2 class="h2" id="fb-title">${admin ? "Feedback inbox" : "Feedback and ideas"}</h2><button class="btn small" data-act="fbBack">Back</button></div>
    ${admin ? `<p class="small">${list.length} message${list.length === 1 ? "" : "s"}, ${fbNew()} new. Set a status and reply; the sender sees both in their Settings.</p>` : `
    <section class="card"><p class="small">Found something broken, or wish the app did something? Tell Mat and Benny. They'll see your name with it, and any reply shows up here.</p>
      <div class="seg wrap" role="group" aria-label="What kind">${Object.entries(FB_KINDS).map(([k, l]) => `<button type="button" data-act="fbKind" data-v="${k}" aria-pressed="${d.kind === k}">${esc(l)}</button>`).join("")}</div>
      <label class="field">${d.kind === "bug" ? "What happened, and what did you expect?" : d.kind === "idea" ? "What would you like the app to do?" : "Your message"}<textarea id="fb-text" rows="5" maxlength="3000">${esc(d.text)}</textarea></label>
      <button class="btn primary block" data-act="fbSend">Send</button></section>`}
    ${state.fb === null ? `<p class="small muted">Can't load messages right now. Check your connection.</p>` : list.length ? `${admin ? "" : `<h3 class="h3">Your messages</h3>`}<ul class="fb-list">${list.map(f => fbItem(f, admin)).join("")}</ul>` : admin ? `<p class="muted">Nothing yet.</p>` : ""}
  </div></div>`;
  if (keep) $("#fb-text")?.focus();
}
// Let people know when Mat answers.
function fbNotify(list) {
  const uid = state.auth?.user?.uid; if (!list || !uid || isAdmin()) return;
  const seen = store.get(`gb-fb-seen-${uid}`, 0);
  const fresh = list.filter(f => f.uid === uid && f.replyAt && f.replyAt > seen);
  if (fresh.length) { toast(`Mat replied to your ${fresh.length === 1 ? "message" : `${fresh.length} messages`}. See Settings → Feedback.`); store.set(`gb-fb-seen-${uid}`, Math.max(...fresh.map(f => f.replyAt))); }
}

function openA11y() { state.overlay = "a11y"; drawA11y(); }
function drawA11y() {
  const a = A.get();
  const choice = (k, opts, label) => `<div class="field"><span id="lbl-${k}">${esc(label)}</span><div class="seg wrap" role="group" aria-labelledby="lbl-${k}">${opts.map(([v, l, style]) => `<button type="button" data-act="a11ySet" data-k="${k}" data-v="${v}" aria-pressed="${String(a[k]) === String(v)}" ${style ? `style="${style}"` : ""}>${esc(l)}</button>`).join("")}</div></div>`;
  const tog = (k, label, help) => `<label class="check a11y-tog"><input type="checkbox" data-a11y="${k}" ${a[k] ? "checked" : ""}${help ? ` aria-describedby="help-${k}"` : ""}><span><b>${esc(label)}</b>${help ? `<small id="help-${k}">${esc(help)}</small>` : ""}</span></label>`;
  const L = A.LABELS;
  const fonts = { theme: "", atkinson: "font-family:'Atkinson Hyperlegible'", lexend: "font-family:Lexend", dyslexic: "font-family:OpenDyslexic", system: "font-family:system-ui,-apple-system,sans-serif" };
  $("#overlay").innerHTML = `<div class="overlay" role="dialog" aria-labelledby="a11y-title"><div class="inner a11y-panel">
    <div class="between"><h2 class="h2" id="a11y-title">Accessibility</h2><button class="btn small" data-act="closeOverlay">Close</button></div>
    <p class="small">Make the app work the way you do. These follow you to any phone you sign in on.${state.user ? "" : " Saved on this phone until you sign in."}</p>
    <section class="card"><h3 class="h3">Quick setup</h3>
      <p class="small muted">Each one turns on a group of options. You can fine-tune everything below.</p>
      <div class="preset-grid">${Object.entries(A.PRESETS).map(([id, pr]) => `<button type="button" class="btn preset" data-act="a11yPreset" data-v="${id}"><span aria-hidden="true">${pr.icon}</span> ${esc(pr.label)}</button>`).join("")}</div>
      ${a11yOn() ? `<button type="button" class="btn small" data-act="a11yReset">Reset all ${a11yOn()} changes</button>` : `<p class="small muted">Everything is at the default.</p>`}</section>
    <section class="card"><h3 class="h3">Seeing</h3>
      ${choice("textSize", Object.entries(L.textSize).map(([v, l]) => [v, l]), "Text size")}
      ${choice("contrast", Object.entries(L.contrast), "Contrast")}
      ${tog("bold", "Bold text", "Heavier letters everywhere.")}
      ${tog("bigTargets", "Bigger buttons", "Every button and box at least 52 points tall, with more space between them.")}
      ${tog("underline", "Underline links", "So links don't rely on color.")}
      ${tog("focusRing", "Strong focus outline", "A thick, high-visibility outline on whatever is selected, for keyboards, switches, and screen readers.")}
      ${tog("colorSafe", "Color-blind-safe colors", "Blue and orange instead of green and red, plus symbols on selected buttons and initials on calendar dots.")}</section>
    <section class="card"><h3 class="h3">Reading</h3>
      ${choice("font", Object.entries(L.font).map(([v, l]) => [v, l, fonts[v]]), "Font")}
      ${choice("spacing", Object.entries(L.spacing), "Space between letters, words, and lines")}
      ${tog("plain", "Plain text style", "No italics, no ALL CAPS, no stretched letters. Everything left-aligned.")}
      ${A.canSpeak() ? tog("readAloud", "Read-aloud buttons", "A 🔊 button on every exercise and stretch reads the instructions out loud.") : ""}</section>
    <section class="card"><h3 class="h3">Hearing</h3>
      ${tog("flash", "Visual alerts", "A gentle color pulse on 3, 2, 1, and GO, and when time is up, with the word in big letters. One pulse at a time, never strobing.")}
      ${a.flash ? `<button type="button" class="btn small" data-act="a11yTestFlash">Show me</button>` : ""}
      ${tog("captions", "Captioned videos", "Form-video links only look for videos with captions (CC).")}
      ${tog("vibrate", "Haptics", "Buzzes on the countdown and when time is up. Works on Android; iPhone web apps can't vibrate.")}
      <p class="small muted">Every sound in the app also shows on screen. Timers always show the countdown and "Done".</p></section>
    <section class="card"><h3 class="h3">Screen readers &amp; voice</h3>
      ${A.canSpeak() ? tog("speak", "Talk me through timers", "Says 3, 2, 1, go, halfway, 10 seconds, and time's up.") : ""}
      ${a.speak && A.canSpeak() ? `<button type="button" class="btn small" data-act="a11yTestSpeak">Test the voice</button>` : ""}
      <p class="small muted">Works with VoiceOver and TalkBack. Every button is labeled, charts have a table version, the calendar reads out who trained each day, and timers announce the countdown without chattering every second.</p></section>
    <section class="card"><h3 class="h3">Focus &amp; memory</h3>
      ${tog("focusMode", "One step at a time", "The Workout tab shows just the current step (warm-up, cardio, each exercise, check-in) with Back and Next. Saving moves you on.")}
      ${tog("autoRest", "Start the rest timer when I check off a set", "So you don't have to remember to.")}
      ${choice("toastTime", Object.entries(L.toastTime), "Pop-up messages stay for")}
      ${tog("calm", "Calm mode", "No confetti, celebration sounds, or buzzing. Timers still beep.")}
      ${tog("themeVoice", "Theme voice", "Bunny and The Lanai write captions and pop-ups in their own playful voice. Screen readers always hear the plain wording, and safety and injury notes are never themed.")}</section>
    <section class="card"><h3 class="h3">Motion</h3>
      ${choice("motion", Object.entries(L.motion), "Animation")}
      <p class="small muted">Nothing in the app ever flashes more than once a second.</p></section>
    <section class="card"><h3 class="h3">Our promise</h3>
      <p class="small">We aim for WCAG 2.2 AA everywhere and go past it where we can. You can zoom up to 500%, use a keyboard or switch control, and nothing has a time limit you can't turn off. If anything is hard to use, tell us and we'll fix it.</p></section>
  </div></div>`;
}

export { drawA11y, drawFeedback, fbMine, fbNew, fbNotify, openA11y, openFeedback };
