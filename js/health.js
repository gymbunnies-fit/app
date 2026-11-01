// Health conditions, symptoms and daily energy: kept ONLY on this phone, in this browser's storage.
// Nothing here is ever sent to GymBunnies.fit's database, the crew, usage counts, feedback or backups.
// This module must never import js/firebase.js or anything that does (tests/run.mjs checks).
// Keys start with "gbh-" (not "twp-"), so signing out keeps them for the same account, and they are keyed by
// account id + profile, so another account on the same phone never sees them. Deleting the account erases them.
import { effectsOf } from "./conditions.js";

const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const read = k => { try { const v = ls()?.getItem(k); return v == null ? null : JSON.parse(v); } catch { return null; } };
const write = (k, v) => { try { ls()?.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
const del = k => { try { ls()?.removeItem(k); } catch { /* blocked */ } };

const recKey = (uid, pid) => `gbh-${uid}-${pid}`;
const dayKey = (uid, pid) => `gbh-energy-${uid}-${pid}`;
const memo = new Map(); // key -> { v, eff }

export function load(uid, pid) {
  if (!uid || !pid) return null;
  const k = recKey(uid, pid);
  if (!memo.has(k)) memo.set(k, { v: read(k), eff: null });
  return memo.get(k).v;
}
export function save(uid, pid, rec) {
  if (!uid || !pid) return;
  const clean = rec && ((rec.conditions || []).length || (rec.symptoms || []).length || Object.values(rec.fn || {}).some(Boolean)) ? { v: 1, ...rec, savedAt: Date.now() } : null;
  if (clean) write(recKey(uid, pid), clean); else del(recKey(uid, pid));
  memo.set(recKey(uid, pid), { v: clean, eff: null });
}
export function clear(uid, pid) { del(recKey(uid, pid)); del(dayKey(uid, pid)); memo.delete(recKey(uid, pid)); }
// Everything this account keeps on this phone (all profiles). Used by "Remove from this phone".
export function clearAll(uid) {
  const s = ls(); if (!s || !uid) return;
  for (const k of Object.keys(s)) if (k.startsWith("gbh-") && k.includes(uid)) del(k);
  memo.clear();
}
export function effects(uid, pid) {
  const rec = load(uid, pid); if (!rec) return null;
  const m = memo.get(recKey(uid, pid));
  if (!m.eff) m.eff = effectsOf(rec);
  return m.eff;
}
// Daily energy check: { "2026-11-01": "soso", ... }, the last 60 days only.
export function energy(uid, pid, date) { return (read(dayKey(uid, pid)) || {})[date] || null; }
export function setEnergy(uid, pid, date, level) {
  const all = read(dayKey(uid, pid)) || {};
  if (level) all[date] = level; else delete all[date];
  const keep = Object.keys(all).sort().slice(-60);
  write(dayKey(uid, pid), Object.fromEntries(keep.map(d => [d, all[d]])));
}
// Days that were low or flare-ups: their lighter weights shouldn't become next time's starting point.
export function lightDays(uid, pid) {
  const all = read(dayKey(uid, pid)) || {};
  return new Set(Object.keys(all).filter(d => all[d] === "low" || all[d] === "flare"));
}
