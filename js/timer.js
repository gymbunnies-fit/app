// Every timer in the app runs through here, so they all behave the same:
// 3-2-1-go countdown (4 beeps), the timed part, then exactly 5 beeps at the end. No looping alarm.
// One timer runs at a time. The volume slider shows next to every timer and is remembered on this phone.

const VOL_KEY = "twp-vol";
let ctx = null, master = null, wake = null, tick = null;
let scheduled = [], endBeeps = [];
let active = null; // { key, total, phase: "count" | "run" | "paused" | "done", runAt, endAt, left }

export function getVol() {
  try { const v = localStorage.getItem(VOL_KEY); return v == null ? 0.8 : Math.min(1, Math.max(0, +v)); } catch { return 0.8; }
}
export function setVol(v) {
  v = Math.min(1, Math.max(0, +v || 0));
  try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* storage blocked */ }
  if (master) master.gain.value = v;
  document.querySelectorAll("[data-tvol]").forEach(el => { if (+el.value !== v) el.value = v; });
  document.querySelectorAll(".tmr-vol-icon").forEach(el => { el.textContent = volIcon(v); });
}
const volIcon = v => (v === 0 ? "🔇" : v < 0.4 ? "🔈" : v < 0.75 ? "🔉" : "🔊");

// Two ways to make sound. "loud" (default) plays real audio files through the phone's media player,
// the same path music and video use, so it always comes out of the speaker. It can pause music from
// other apps. "mix" uses Web Audio, which plays over your music but some iPhones keep it silent.
const MODE_KEY = "twp-sound";
export function getMode() { try { return localStorage.getItem(MODE_KEY) === "mix" ? "mix" : "loud"; } catch { return "loud"; } }
function setMode(m) {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* storage blocked */ }
  cancelSound(); sessionType(); unlockAudio(); play("test");
  document.querySelectorAll("[data-act=tMode]").forEach(b => { b.textContent = modeText(); b.setAttribute("aria-pressed", String(m === "mix")); });
  setTimeout(paintAudioWarn, 400);
}
const modeText = () => (getMode() === "loud" ? "Sound: Loud" : "Sound: Over music");
function sessionType() {
  try { if (navigator.audioSession) navigator.audioSession.type = getMode() === "mix" ? "ambient" : "auto"; } catch { /* not supported */ }
}
sessionType();

// ---- loud: short WAV files made on the phone, volume baked in (iPhones ignore volume on audio elements)
const TONES = {
  count: [[0, 660, 0.15]], go: [[0, 1320, 0.4]], test: [[0, 990, 0.2]], silent: [],
  end: [0, 1, 2, 3, 4].map(i => [i * 0.3, 990, 0.18])
};
const wavCache = new Map();
function wavUrl(kind, vol) {
  const k = `${kind}:${Math.round(vol * 20)}`; if (wavCache.has(k)) return wavCache.get(k);
  const sr = 22050, tones = TONES[kind];
  const dur = Math.max(0.05, ...tones.map(([a, , l]) => a + l + 0.05));
  const n = Math.round(sr * dur), buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, n * 2, true);
  const amp = 0.6 * vol * 32767;
  for (const [at, f, len] of tones) {
    const s0 = Math.round(at * sr), s1 = Math.min(n, Math.round((at + len) * sr));
    for (let i = s0; i < s1; i++) {
      const t = (i - s0) / sr, env = Math.min(1, t / 0.01, (len - t) / 0.03);
      const sq = Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1;
      dv.setInt16(44 + i * 2, Math.round(sq * amp * Math.max(0, env)), true);
    }
  }
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  wavCache.set(k, url); return url;
}
let el = null, elFailed = false;
function media() { if (!el && typeof Audio !== "undefined") { el = new Audio(); el.preload = "auto"; el.setAttribute("playsinline", ""); } return el; }
function playMedia(kind) {
  const a = media(); if (!a) return;
  try { a.pause(); } catch { /* ignore */ }
  a.src = wavUrl(kind, kind === "silent" ? 0 : getVol()); a.currentTime = 0;
  const p = a.play(); if (p?.then) p.then(() => { if (kind !== "silent") elFailed = false; }).catch(err => { if (err?.name === "AbortError") return; elFailed = true; paintAudioWarn(); });
}

// ---- mix: Web Audio
function audioOn() {
  try {
    if (ctx && (ctx.state === "closed" || ctx.state === "interrupted")) { try { ctx.close(); } catch { /* ignore */ } ctx = null; master = null; }
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== "running") ctx.resume?.().catch(() => {});
    if (!master) { master = ctx.createGain(); master.connect(ctx.destination); }
    master.gain.value = getVol();
  } catch { ctx = null; }
  return ctx;
}
// Called inside a tap: that's when phones allow sound to start, and later sounds ride on it.
function unlockAudio() {
  if (getMode() === "loud") { const a = media(); if (a && a.paused) playMedia("silent"); return; }
  if (!audioOn()) return;
  try { const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch { /* ignore */ }
}
export const audioBlocked = () => (getMode() === "loud" ? elFailed : !ctx || ctx.state !== "running");
function beep(at, freq, len, list = scheduled) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square"; o.frequency.value = freq; o.connect(g); g.connect(master);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.35, at + 0.01);
  g.gain.setValueAtTime(0.35, at + len - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.start(at); o.stop(at + len + 0.02);
  list.push(o);
}
// Beeps play when they're due (driven by the timer's own clock), not pre-scheduled when you tap Start.
function play(kind) {
  if (getMode() === "loud") { playMedia(kind); return; }
  if (!audioOn()) return;
  const go = () => {
    const t = ctx.currentTime + 0.02;
    if (kind === "count") beep(t, 660, 0.15);
    else if (kind === "go") beep(t, 1320, 0.4);
    else if (kind === "end") for (let i = 0; i < 5; i++) beep(t + i * 0.3, 990, 0.18, endBeeps);
    else if (kind === "test") beep(t, 990, 0.2);
  };
  if (ctx.state === "running") go();
  else ctx.resume?.().then(go).catch(() => {});
}
const stopAllIn = list => list.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
function cancelSound() { stopAllIn(scheduled); stopAllIn(endBeeps); scheduled = []; endBeeps = []; try { el?.pause(); } catch { /* ignore */ } }
export function testSound() { unlockAudio(); play("test"); setTimeout(paintAudioWarn, 400); }

const lockScreen = () => navigator.wakeLock?.request("screen").then(w => { wake = w; }).catch(() => {});
const unlockScreen = () => { wake?.release?.().catch(() => {}); wake = null; };

export const isActive = key => active?.key === key && active.phase !== "done";
export const state = key => (active?.key === key ? active : null);

// Other parts of the app (speech, screen flashes, screen-reader announcements) listen for these.
const emit = (what, extra = {}) => document.dispatchEvent(new CustomEvent("twp-timer", { detail: { key: active?.key, label: active?.label || "", what, ...extra } }));
const labelFor = key => document.querySelector(`.tmr[data-tkey="${CSS.escape(key)}"]`)?.dataset.tlabel || "";

export function start(key, seconds, label = labelFor(key)) {
  seconds = Math.max(1, Math.round(+seconds || 0));
  stopAll();
  const now = Date.now();
  active = { key, label, total: seconds, phase: "count", runAt: now + 3000, endAt: now + 3000 + seconds * 1000, left: seconds, said: {} };
  unlockAudio();
  lockScreen();
  setTimeout(paintAudioWarn, 500);
  clearInterval(tick); tick = setInterval(step, 50); step();
  paint();
}
// Pausing during the countdown cancels it. Resuming runs the countdown again, then picks up where it left off.
export function toggle(key, seconds) {
  if (active?.key === key && (active.phase === "count" || active.phase === "run")) {
    if (active.phase === "count") { stop(key); return; }
    active.left = Math.max(0, (active.endAt - Date.now()) / 1000);
    active.phase = "paused"; cancelSound(); clearInterval(tick); unlockScreen(); paint(); emit("paused"); return;
  }
  if (active?.key === key && active.phase === "paused") { const total = active.total, left = active.left, label = active.label; start(key, left, label); active.total = total; paint(); return; }
  start(key, seconds);
}
export function stop(key, byUser = false) { if (!key || active?.key === key) { if (byUser && active && active.phase !== "done") emit("stopped"); stopAll(); } }
function stopAll() {
  const k = active?.key; cancelSound(); clearInterval(tick); unlockScreen(); active = null;
  if (k) paintKey(k, null);
}
// Add or take away time (rest timer ±15). Works during the countdown, while running, or paused.
export function adjust(key, delta) {
  if (active?.key !== key || active.phase === "done") return false;
  if (active.phase === "paused") { active.left = Math.max(1, active.left + delta); active.total = Math.max(active.total, active.left); paint(); return true; }
  const now = Date.now();
  const left = Math.max(1, (active.endAt - Math.max(now, active.runAt)) / 1000 + delta);
  active.endAt = Math.max(now, active.runAt) + left * 1000;
  active.total = Math.max(active.total + Math.max(0, delta), left);
  if (active.phase === "run") active.left = left;
  paint(); return true;
}

function step() {
  if (!active) return;
  const now = Date.now();
  const said = active.said;
  if (active.phase === "count") {
    const n = Math.ceil((active.runAt - now) / 1000);
    if (n >= 1 && n <= 3 && !said[`c${n}`]) { said[`c${n}`] = 1; play("count"); emit("count", { n }); }
    if (now >= active.runAt) { active.phase = "run"; if (!said.go) { said.go = 1; play("go"); emit("go"); } }
  }
  if (active.phase === "run") {
    active.left = Math.max(0, (active.endAt - now) / 1000);
    if (active.total >= 20 && active.left <= active.total / 2 && !said.half && active.left > 11) { said.half = 1; emit("half"); }
    if (active.total > 40 && active.left <= 30 && !said.thirty && active.left > 11) { said.thirty = 1; emit("thirty"); }
    if (active.total > 15 && active.left <= 10 && !said.ten && active.left > 0) { said.ten = 1; emit("ten"); }
    if (active.left <= 0) {
      active.phase = "done"; clearInterval(tick); unlockScreen();
      const key = active.key;
      setTimeout(() => { if (!active || active.phase === "done") { scheduled = []; endBeeps = []; } }, 2000);
      play("end"); paint(); emit("done");
      document.dispatchEvent(new CustomEvent("twp-timer-done", { detail: { key } }));
      return;
    }
  }
  paint();
}

const fmt = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function view(t, seconds) {
  if (!t) return { clock: fmt(seconds), btn: "Start", cls: "", pct: 100 };
  if (t.phase === "count") { const n = Math.ceil((t.runAt - Date.now()) / 1000); return { clock: n > 0 ? String(n) : "GO", btn: "Cancel", cls: "counting", pct: 100 }; }
  if (t.phase === "run") return { clock: t.runAt > Date.now() - 600 ? "GO" : fmt(t.left), btn: "Pause", cls: "running", pct: (t.left / t.total) * 100 };
  if (t.phase === "paused") return { clock: fmt(t.left), btn: "Resume", cls: "paused", pct: (t.left / t.total) * 100 };
  return { clock: "Done", btn: "Again", cls: "done", pct: 0 };
}
function paintKey(key, t) {
  document.querySelectorAll(`.tmr[data-tkey="${CSS.escape(key)}"]`).forEach(el => {
    const v = view(t, +el.dataset.tsec);
    el.classList.remove("counting", "running", "paused", "done"); if (v.cls) el.classList.add(v.cls);
    const c = el.querySelector(".tmr-clock"); if (c && c.textContent !== v.clock) c.textContent = v.clock;
    const b = el.querySelector("[data-act=tGo]"); if (b && b.textContent !== v.btn) { b.textContent = v.btn; b.setAttribute("aria-label", `${v.btn} timer${el.dataset.tlabel ? ": " + el.dataset.tlabel : ""}`); }
    const r = el.querySelector("[data-act=tReset]"); if (r) r.hidden = !t;
    const bar = el.querySelector(".tmr-bar > i"); if (bar) bar.style.width = `${Math.max(0, Math.min(100, v.pct))}%`;
  });
}
const paint = () => { if (active) paintKey(active.key, active); };

// The timer as HTML. Safe to re-render at any time: it always reflects the running timer for its key.
// from: optional selector (inside the same [data-ex] card) of an input holding the seconds, e.g. a set's seconds box.
// Shows the "no sound" note on any timer on screen while the phone is blocking audio.
function paintAudioWarn() {
  const blocked = audioBlocked() || getVol() === 0;
  document.querySelectorAll(".tmr-warn").forEach(el => {
    el.hidden = !blocked;
    el.textContent = getVol() === 0 ? "Timer volume is all the way down." : WARN();
  });
}
const WARN = () => (getMode() === "mix" ? "The phone is keeping this timer quiet. Tap \u201cSound: Over music\u201d to switch to Loud." : "The phone blocked the sound. Tap Test sound once, then start the timer again.");
export function html(key, seconds, label = "", from = "") {
  const t = state(key); const v = view(t, seconds); const vol = getVol();
  const al = label ? `: ${esc(label)}` : "";
  return `<div class="tmr ${v.cls}" data-tkey="${esc(key)}" data-tsec="${seconds}" data-tlabel="${esc(label)}" role="group" aria-label="Timer${al}"${from ? ` data-tfrom="${esc(from)}"` : ""}>
    <div class="tmr-main">
      ${label ? `<span class="tmr-label">${esc(label)}</span>` : ""}
      <span class="tmr-clock mono" role="timer" aria-label="Time left">${v.clock}</span>
      <button type="button" class="btn small primary" data-act="tGo" aria-label="${v.btn} timer${al}">${v.btn}</button>
      <button type="button" class="btn small" data-act="tReset" aria-label="Reset timer${al}" ${t ? "" : "hidden"}>Reset</button>
    </div>
    ${key === "rest" ? "" : `<div class="tmr-adj" role="group" aria-label="Change the time${al}"><button type="button" class="btn small" data-act="tAdj" data-by="-15" aria-label="15 seconds less${al}">−15 sec</button><button type="button" class="btn small" data-act="tAdj" data-by="15" aria-label="15 seconds more${al}">+15 sec</button></div>`}
    <div class="tmr-bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, v.pct))}%"></i></div>
    <div class="tmr-vol"><label class="tmr-vol-l"><span class="tmr-vol-icon" aria-hidden="true">${volIcon(vol)}</span><span class="visually-hidden">Timer volume</span>
      <input type="range" min="0" max="1" step="0.05" value="${vol}" data-tvol></label><button type="button" class="btn small" data-act="tTest">Test sound</button></div>
    <div class="tmr-mode"><button type="button" class="btn small" data-act="tMode" aria-pressed="${getMode() === "mix"}">${modeText()}</button><span class="small muted">${getMode() === "loud" ? "Always beeps. Can pause your music." : "Plays over your music."}</span></div>
    <p class="tmr-warn small" role="status" hidden>${WARN()}</p>
  </div>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Buttons and the volume slider work on their own, wherever a timer is drawn.
document.addEventListener("click", e => {
  const b = e.target.closest(".tmr [data-act]"); if (!b) return;
  const el = b.closest(".tmr"); const key = el.dataset.tkey;
  e.stopPropagation();
  syncSeconds(el);
  if (b.dataset.act === "tGo") {
    const wasCounting = active?.key === key && active.phase === "count";
    if (active?.key === key && active.phase === "done") start(key, +el.dataset.tsec); else toggle(key, +el.dataset.tsec);
    if (wasCounting) document.dispatchEvent(new CustomEvent("twp-timer", { detail: { key, what: "stopped" } }));
  }
  if (b.dataset.act === "tReset") stop(key, true);
  if (b.dataset.act === "tTest") testSound();
  if (b.dataset.act === "tMode") { setMode(getMode() === "loud" ? "mix" : "loud"); const sp = b.parentElement.querySelector("span"); if (sp) sp.textContent = getMode() === "loud" ? "Always beeps. Can pause your music." : "Plays over your music."; }
  if (b.dataset.act === "tAdj") {
    const by = +b.dataset.by; adjust(key, by);
    // Timers tied to a set: the app changes the set's seconds (and the timer follows). Others change here.
    if (el.dataset.tfrom) document.dispatchEvent(new CustomEvent("twp-timer-adj", { detail: { key, by, el } }));
    else { el.dataset.tsec = Math.max(5, +el.dataset.tsec + by); if (!state(key)) paintKey(key, null); }
  }
}, true);
// Read the seconds from the linked input (if any), so editing a set's seconds changes its timer right away.
export const syncCard = card => card?.querySelectorAll(".tmr[data-tfrom]").forEach(syncSeconds);
function syncSeconds(el) {
  const src = el.dataset.tfrom && el.closest("[data-ex]")?.querySelector(el.dataset.tfrom);
  const v = src ? Math.round(+src.value) : 0;
  if (v > 0 && v !== +el.dataset.tsec) { el.dataset.tsec = v; if (!state(el.dataset.tkey)) paintKey(el.dataset.tkey, null); }
}
document.addEventListener("input", e => {
  const card = e.target.closest?.("[data-ex]");
  if (card && e.target.matches("input[data-f]")) card.querySelectorAll(".tmr[data-tfrom]").forEach(syncSeconds);
  if (!e.target.matches?.("[data-tvol]")) return;
  setVol(e.target.value);
  if (!active || active.phase === "done" || active.phase === "paused") { unlockAudio(); play("test"); }
  paintAudioWarn();
});
document.addEventListener("change", e => { if (e.target.matches?.("[data-tvol]")) e.stopPropagation(); }, true);

// Bring the screen lock back when the app returns to the front mid-timer.
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && active && (active.phase === "count" || active.phase === "run")) { lockScreen(); ctx?.resume?.().catch(() => {}); } });
