// Firebase: sign-in (Google or email + password) and crew-scoped data with an offline cache.
// Data lives under crews/{crewId}/{collection}/{doc}. See README for the security rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile,
  linkWithPopup, linkWithCredential, EmailAuthProvider, reauthenticateWithPopup, reauthenticateWithCredential, deleteUser
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, writeBatch, updateDoc, deleteField, FieldPath, terminate, clearIndexedDbPersistence,
  increment, arrayUnion, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1RgJvqEyg8-HvVvNmQrSQkUnpPIkIG5k",
  authDomain: "gymbunnies-fit.firebaseapp.com",
  projectId: "gymbunnies-fit",
  storageBucket: "gymbunnies-fit.firebasestorage.app",
  messagingSenderId: "940175627423",
  appId: "1:940175627423:web:81eff9c543377c4ec1beaa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });

export const COLLECTIONS = ["sessions", "body", "activities", "settings", "library", "profiles", "pings", "gyms"];
let crewId = null;
const col = name => collection(db, "crews", crewId, name);
const ref = (name, id) => doc(db, "crews", crewId, name, id);

// ---------------------------------------------------------------- auth
const info = u => u && !u.isAnonymous ? { uid: u.uid, email: u.email || "", name: u.displayName || "", providers: u.providerData.map(p => p.providerId) } : null;
export function watchAuth(cb) {
  getRedirectResult(auth).catch(err => cb(null, explain(err)));
  return onAuthStateChanged(auth, u => cb(info(u)));
}
export async function signInGoogle() {
  try { await signInWithPopup(auth, google); }
  catch (err) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(err.code)) return signInWithRedirect(auth, google);
    throw new Error(explain(err));
  }
}
export async function signInEmail(email, pw) { try { await signInWithEmailAndPassword(auth, email.trim(), pw); } catch (err) { throw new Error(explain(err)); } }
export async function createEmailAccount(email, pw, name) {
  try { const r = await createUserWithEmailAndPassword(auth, email.trim(), pw); if (name) await updateProfile(r.user, { displayName: name }); }
  catch (err) { throw new Error(explain(err)); }
}
export async function resetPassword(email) { try { await sendPasswordResetEmail(auth, email.trim()); } catch (err) { throw new Error(explain(err)); } }
export const signOutNow = () => signOut(auth);
export async function addGoogle() { try { await linkWithPopup(auth.currentUser, google); } catch (err) { throw new Error(explain(err)); } }
export async function addPassword(pw) {
  try { await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, pw)); } catch (err) { throw new Error(explain(err)); }
}
export const currentInfo = () => info(auth.currentUser);

// ---------------------------------------------------------------- user record and crews
export async function getUserDoc(uid) {
  try { const s = await getDoc(doc(db, "users", uid)); return s.exists() ? s.data() : null; }
  catch (err) { if (String(err.code).includes("unavailable")) return null; throw new Error(explain(err)); }
}
export const setUserDoc = (uid, data) => setDoc(doc(db, "users", uid), data, { merge: true });

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

export async function createCrew(name, me) {
  const id = doc(collection(db, "crews")).id; const code = newCode();
  await setDoc(doc(db, "crews", id), { name, code, owner: me.uid, createdAt: Date.now() });
  await setDoc(doc(db, "crews", id, "members", me.uid), { name: me.name, email: me.email, role: "owner", profileId: me.profileId || "", code, joinedAt: Date.now() });
  await setDoc(doc(db, "codes", code), { crewId: id });
  await setUserDoc(me.uid, { crewId: id });
  return { id, code };
}
export async function joinCrew(code, me) {
  code = code.trim().toUpperCase();
  const c = await getDoc(doc(db, "codes", code)).catch(err => { throw new Error(explain(err)); });
  if (!c.exists()) throw new Error("That code doesn't match a crew. Check it with whoever invited you.");
  const id = c.data().crewId;
  await setDoc(doc(db, "crews", id, "members", me.uid), { name: me.name, email: me.email, role: "member", profileId: "", code, joinedAt: Date.now() }).catch(err => { throw new Error(explain(err)); });
  await setUserDoc(me.uid, { crewId: id });
  return id;
}
export function watchCrew(id, onCrew, onMembers) {
  // Only report "no crew" when the server says so; an empty offline cache isn't proof.
  const a = onSnapshot(doc(db, "crews", id), { includeMetadataChanges: true }, s => {
    if (s.exists()) onCrew({ id, ...s.data() }); else if (!s.metadata.fromCache) onCrew(null);
  }, err => { if (String(err.code).includes("permission-denied")) onCrew(null); });
  const b = onSnapshot(collection(db, "crews", id, "members"), s => onMembers(s.docs.map(d => ({ uid: d.id, ...d.data() }))), () => {});
  return () => { a(); b(); };
}
export const updateMember = (id, uid, patch) => updateDoc(doc(db, "crews", id, "members", uid), patch);
export const removeMember = (id, uid) => deleteDoc(doc(db, "crews", id, "members", uid));
export async function renameCrew(id, name) { await updateDoc(doc(db, "crews", id), { name }); }
export async function newInviteCode(id, old) {
  const code = newCode();
  await setDoc(doc(db, "codes", code), { crewId: id });
  await updateDoc(doc(db, "crews", id), { code });
  if (old) await deleteDoc(doc(db, "codes", old)).catch(() => {});
  return code;
}

// ---------------------------------------------------------------- anonymous usage stats
// Two top-level collections, readable by anyone, holding no names or emails:
// daily/{YYYY-MM-DD}: counters (workouts, sets, stretches, ...) summed across everyone.
// usage/{hashed account id}: which days an account opened the app, plus a coarse plan summary.
// Counters can be nested one level ({ ev: { t_saveEx: 2 } }); every number becomes a server-side increment.
const incs = o => Object.fromEntries(Object.entries(o).filter(([, n]) => n).map(([k, n]) => [k, typeof n === "object" ? incs(n) : increment(n)]));
export function bump(date, fields) {
  setDoc(doc(db, "daily", date), incs(fields), { merge: true }).catch(() => {});
}
// people/{hashed account + profile}: one per person using the app (a phone can hold several people).
export function markPerson(id, date, data) {
  return setDoc(doc(db, "people", id), { ...data, last: date, seen: arrayUnion(date) }, { merge: true });
}
export function markSeen(id, date, data) {
  return setDoc(doc(db, "usage", id), { ...data, last: date, seen: arrayUnion(date) }, { merge: true });
}

// ---------------------------------------------------------------- delete my account
// Google asks for a fresh sign-in before an account can be deleted, so this runs first.
export async function reauth(password) {
  const u = auth.currentUser; if (!u) throw new Error("You're signed out. Sign in again first.");
  try {
    if (password != null) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
    else await reauthenticateWithPopup(u, google);
  } catch (err) { throw new Error(explain(err)); }
}
// Erase this account: its person's data in the crew (or the whole crew if they're the last one), crew membership,
// feedback, the user record, and finally the sign-in. A crew owner hands the crew to the longest-standing member.
export async function deleteEverything(crewId, profileId) {
  const u = auth.currentUser, uid = u.uid;
  const wipe = async refs => { for (let i = 0; i < refs.length; i += 400) { const b = writeBatch(db); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); } };
  if (crewId) {
    const crewRef = doc(db, "crews", crewId);
    const crew = (await getDoc(crewRef)).data() || {};
    const members = (await getDocs(collection(db, "crews", crewId, "members"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const others = members.filter(m => m.id !== uid).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    if (!others.length) {
      // Last one out: the whole crew goes.
      if (crew.owner && crew.owner !== uid) await updateDoc(crewRef, { owner: uid });
      const refs = [];
      for (const name of COLLECTIONS) (await getDocs(collection(db, "crews", crewId, name))).docs.forEach(d => refs.push(d.ref));
      await wipe(refs);
      if (crew.code) await deleteDoc(doc(db, "codes", crew.code)).catch(() => {});
      await deleteDoc(crewRef);
    } else {
      const refs = [];
      if (profileId) {
        for (const name of ["sessions", "body", "activities"]) (await getDocs(query(collection(db, "crews", crewId, name), where("user", "==", profileId)))).docs.forEach(d => refs.push(d.ref));
        refs.push(doc(db, "crews", crewId, "profiles", profileId), doc(db, "crews", crewId, "settings", `plan_${profileId}`), doc(db, "crews", crewId, "settings", `deload_${profileId}`));
      }
      await wipe(refs);
      if (crew.owner === uid) {
        await updateDoc(doc(db, "crews", crewId, "members", others[0].id), { role: "owner" });
        await updateDoc(crewRef, { owner: others[0].id });
      }
    }
    await deleteDoc(doc(db, "crews", crewId, "members", uid)).catch(() => {});
  }
  const fb = await getDocs(query(collection(db, "feedback"), where("uid", "==", uid))).catch(() => null);
  if (fb) await wipe(fb.docs.map(d => d.ref));
  await deleteDoc(doc(db, "users", uid)).catch(() => {});
  try { await deleteUser(u); } catch (err) { throw new Error(explain(err)); }
  crewId = null;
  await terminate(db).catch(() => {}); await clearIndexedDbPersistence(db).catch(() => {});
}

// ---------------------------------------------------------------- feedback
// feedback/{id}: written by the sender, readable by the sender and the admin, answered by the admin.
export const sendFeedback = data => addDoc(collection(db, "feedback"), data);
export function watchFeedback(uid, all, cb) {
  const q = all ? collection(db, "feedback") : query(collection(db, "feedback"), where("uid", "==", uid));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb(null));
}
export const answerFeedback = (id, fields) => updateDoc(doc(db, "feedback", id), fields);

// ---------------------------------------------------------------- crew data
export function connect(id, onData, onStatus) {
  crewId = id;
  const unsubs = COLLECTIONS.map(name => onSnapshot(col(name), { includeMetadataChanges: true }, snap => {
    onData(name, snap.docs.map(d => ({ id: d.id, ...d.data() })), snap.metadata.fromCache, snap.metadata.hasPendingWrites);
  }, err => onStatus?.({ state: "error", message: explain(err) })));
  onStatus?.({ state: "ready" });
  return () => unsubs.forEach(u => u());
}
// Writes return immediately; Firestore queues them offline and syncs later.
export function save(name, id, data) {
  setDoc(ref(name, id), { ...data, updatedAt: Date.now() }, { merge: false }).catch(err => console.error("Save failed", err));
  return id;
}
export function remove(name, id) { deleteDoc(ref(name, id)).catch(err => console.error("Delete failed", err)); }
// Many records at once (history brought in from another app, or taking it back out). Waits for the server.
export async function saveMany(name, items) {
  for (let i = 0; i < items.length; i += 400) {
    const b = writeBatch(db); items.slice(i, i + 400).forEach(({ id, ...data }) => b.set(ref(name, id), { ...data, updatedAt: Date.now() })); await b.commit();
  }
}
export async function removeMany(name, ids) {
  for (let i = 0; i < ids.length; i += 400) { const b = writeBatch(db); ids.slice(i, i + 400).forEach(id => b.delete(ref(name, id))); await b.commit(); }
}
// Merge only the given fields, so two phones changing different parts of the same record don't overwrite each other.
export function patch(name, id, data) {
  setDoc(ref(name, id), { ...data, updatedAt: Date.now() }, { merge: true }).catch(err => console.error("Save failed", err));
  return id;
}
export function dropField(name, id, path) {
  updateDoc(ref(name, id), new FieldPath(...path), deleteField(), "updatedAt", Date.now()).catch(err => console.error("Delete failed", err));
}
// Sign out and wipe this phone's cached copy of the crew's data.
export async function signOutAndClear() {
  const uid = auth.currentUser?.uid;
  if (uid) try { localStorage.removeItem(`twp-shape-${uid}`); localStorage.removeItem(`twp-gyms-${uid}`); } catch { /* storage blocked */ }
  await signOut(auth);
  try { await terminate(db); await clearIndexedDbPersistence(db); } catch (err) { console.warn("Cache clear", err); }
}
export async function importAll(data) {
  let batch = writeBatch(db), n = 0;
  for (const name of COLLECTIONS) for (const item of data[name] || []) {
    if (name === "gyms") continue;
    const { id, ...rest } = item;
    batch.set(ref(name, id || doc(col(name)).id), rest);
    if (++n % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
  }
  await batch.commit();
  // Shared gyms one at a time: a gym keeps the person who shared it, and one the rules refuse doesn't stop the rest.
  const uid = auth.currentUser?.uid || "";
  for (const item of data.gyms || []) {
    const { id, crew, ...rest } = item; void crew;
    if (!id || !rest.name) continue;
    const had = await getDoc(ref("gyms", id)).catch(() => null);
    const owner = had?.exists() ? had.data().owner : uid;
    try { await setDoc(ref("gyms", id), { ...rest, owner }); n++; } catch (err) { console.warn("Gym not restored", id, err); }
  }
  return n;
}

function explain(err) {
  const c = err?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "That email and password don't match. Try again, or use Forgot password.";
  if (c.includes("email-already-in-use")) return "There's already an account with that email. Sign in instead, or use Forgot password.";
  if (c.includes("weak-password")) return "Use a password with at least 6 characters.";
  if (c.includes("invalid-email")) return "That doesn't look like an email address.";
  if (c.includes("popup-closed-by-user")) return "The Google window was closed before signing in finished.";
  if (c.includes("unauthorized-domain")) return "This web address isn't approved for Google sign-in yet. Add it in Firebase → Authentication → Settings → Authorized domains.";
  if (c.includes("operation-not-allowed")) return "That sign-in method isn't turned on yet in Firebase → Authentication → Sign-in method.";
  if (c.includes("credential-already-in-use") || c.includes("provider-already-linked")) return "That sign-in is already connected to an account.";
  if (c.includes("user-mismatch")) return "That's a different Google account from the one you're signed in with. Pick the same one.";
  if (c.includes("requires-recent-login")) return "For security, sign out and back in, then try again.";
  if (c.includes("too-many-requests")) return "Too many tries. Wait a few minutes and try again.";
  if (c.includes("permission-denied")) return "The database refused access. Check that the Firestore rules from the README are published.";
  if (c.includes("unavailable") || c.includes("network")) return "Offline. Your entries are saved on this phone and will sync when you're back online.";
  return err?.message || "Something went wrong.";
}
