// A tiny in-memory stand-in for the Firebase SDK, so js/firebase.js can be tested without a network.
// Only what the app uses. Documents live in `docs` keyed by path ("crews/c1/members/u1").
export const docs = new Map();
export const calls = [];
export const fakeAuth = { currentUser: null, deleted: [] };
const segs = a => a.flatMap(s => String(s).split("/")).filter(Boolean);
const snapOf = (path, data) => ({ id: path.split("/").at(-1), ref: { path, id: path.split("/").at(-1) }, exists: () => data !== undefined, data: () => (data === undefined ? undefined : structuredClone(data)) });
const matches = (q, data) => (q.wheres || []).every(([f, op, v]) => op === "==" && data[f] === v);

// ---- app
export const initializeApp = cfg => ({ cfg });
// ---- auth
export const getAuth = () => fakeAuth;
export class GoogleAuthProvider { setCustomParameters() {} }
export const EmailAuthProvider = { credential: (email, pw) => ({ email, pw }) };
const nope = name => async () => { throw new Error(`${name} isn't faked`); };
export const onAuthStateChanged = () => () => {};
export const getRedirectResult = async () => null;
export const signInWithPopup = nope("signInWithPopup"), signInWithRedirect = nope("signInWithRedirect"), signInWithEmailAndPassword = nope("signInWithEmailAndPassword"),
  createUserWithEmailAndPassword = nope("createUserWithEmailAndPassword"), sendPasswordResetEmail = nope("sendPasswordResetEmail"), signOut = async () => {}, updateProfile = async () => {},
  linkWithPopup = nope("linkWithPopup"), linkWithCredential = nope("linkWithCredential");
export const reauthenticateWithPopup = async u => { calls.push(["reauthPopup", u.uid]); };
export const reauthenticateWithCredential = async (u, c) => { calls.push(["reauthPassword", u.uid]); if (c.pw !== "right") { const e = new Error("bad"); e.code = "auth/invalid-credential"; throw e; } };
export const deleteUser = async u => { calls.push(["deleteUser", u.uid]); fakeAuth.deleted.push(u.uid); fakeAuth.currentUser = null; };
// ---- firestore
export const initializeFirestore = () => ({});
export const persistentLocalCache = () => ({}), persistentMultipleTabManager = () => ({});
export const collection = (db, ...p) => ({ kind: "col", path: segs(p).join("/") });
export const doc = (db, ...p) => { const path = segs(p).join("/"); return { kind: "doc", path, id: path.split("/").at(-1) }; };
export const query = (col, ...wheres) => ({ ...col, wheres: [...(col.wheres || []), ...wheres] });
export const where = (f, op, v) => [f, op, v];
export async function getDoc(r) { return snapOf(r.path, docs.get(r.path)); }
export async function getDocs(q) {
  const depth = q.path.split("/").length + 1, out = [];
  for (const [path, data] of docs) if (path.startsWith(q.path + "/") && path.split("/").length === depth && matches(q, data)) out.push(snapOf(path, data));
  return { docs: out, size: out.length };
}
export async function setDoc(r, data, opt) { calls.push(["set", r.path]); docs.set(r.path, opt?.merge ? { ...(docs.get(r.path) || {}), ...data } : { ...data }); }
export async function updateDoc(r, fields) { calls.push(["update", r.path, fields]); if (!docs.has(r.path)) throw new Error(`no document ${r.path}`); docs.set(r.path, { ...docs.get(r.path), ...fields }); }
export async function deleteDoc(r) { calls.push(["delete", r.path]); docs.delete(r.path); }
export async function addDoc(col, data) { const path = `${col.path}/auto${docs.size}`; docs.set(path, { ...data }); return { id: path.split("/").at(-1), path }; }
export function writeBatch() {
  const ops = [];
  return { delete: r => ops.push(() => deleteDoc(r)), set: (r, d, o) => ops.push(() => setDoc(r, d, o)), update: (r, f) => ops.push(() => updateDoc(r, f)), commit: async () => { for (const op of ops) await op(); } };
}
export const onSnapshot = () => () => {};
export const deleteField = () => undefined;
export class FieldPath { constructor(...p) { this.p = p; } }
export const terminate = async () => { calls.push(["terminate"]); };
export const clearIndexedDbPersistence = async () => { calls.push(["clearCache"]); };
export const increment = n => ({ inc: n });
export const arrayUnion = (...v) => ({ union: v });
