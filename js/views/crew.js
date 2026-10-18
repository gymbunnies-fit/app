// The Crew tab: everyone's progress in one place.
import { P, TODAY, avatarHtml, bonusDates, canSee, crewCard, cycleStart, esc, funAt, listText, paceOf, profileIds, seg, shareOf, state } from "../app.js";
import * as F from "../fun.js";
import * as S from "../stats.js";

// ---------------------------------------------------------------- CREW: everyone's progress in one place
function crewStats(id) {
  const t = TODAY(); const ci = S.cycleInfo(t, cycleStart()); const wk = S.mondayOf(t);
  const trained = S.userSessions(state.data.sessions, id).filter(x => (x.exercises || []).some(e => e.sets?.length));
  const inCycle = trained.filter(x => x.date >= ci.start && x.date <= ci.end);
  const sets = inCycle.reduce((n, x) => n + (x.exercises || []).reduce((m, e) => m + (e.sets?.length || 0), 0), 0);
  const lbs = Math.round(inCycle.reduce((n, x) => n + (x.exercises || []).reduce((m, e) => m + F.volumeOf(e), 0), 0));
  const prs = F.prEvents(state.data.sessions, id).filter(e => e.date >= ci.start && e.date <= ci.end);
  const cardio = inCycle.reduce((n, x) => n + (x.cardio?.done ? +x.cardio.minutes || 0 : 0), 0);
  return { days: new Set(trained.map(x => x.date)), week: trained.filter(x => x.date >= wk).length, cycle: inCycle.length, sets, lbs, prs, cardio,
    streak: F.streaks(state.data.sessions, id, t, paceOf(id), bonusDates(id)), badges: F.earnedBadges(state.data.sessions, state.data.body, state.data.activities, id, t).size,
    last: trained.map(x => x.date).sort().pop() || null, ci, wk };
}
const SHARE_LABEL = { all: "Everything", trained: "Just that I trained", none: "Nothing" };
function viewCrew() {
  const ids = profileIds(); const me = state.user; const t = TODAY();
  const st = Object.fromEntries(ids.map(id => [id, crewStats(id)]));
  const ci = st[me]?.ci || S.cycleInfo(t, cycleStart()); const wk = S.mondayOf(t);
  const week = Array.from({ length: 7 }, (_, i) => S.addDays(wk, i));
  const visible = ids.filter(id => id === me || shareOf(id) !== "none");
  const full = ids.filter(id => canSee(id));
  const tot = full.reduce((a, id) => ({ w: a.w + st[id].cycle, s: a.s + st[id].sets, l: a.l + st[id].lbs, p: a.p + st[id].prs.length }), { w: 0, s: 0, l: 0, p: 0 });
  const DN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const card = id => {
    const x = st[id]; const p = P(id); const mine = id === me; const lvl = shareOf(id);
    const head = `<div class="between"><h3 class="h3 crew-name">${avatarHtml(id)} ${esc(p.name)}${mine ? ` <span class="tag orig">You</span>` : ""}</h3>${!mine && funAt("medium") ? `<button class="btn small" data-act="hi5to" data-u="${esc(id)}" aria-label="High-five ${esc(p.name)}">🙌 High-five</button>` : ""}</div>`;
    const basic = `<div class="stats crew-stats"><div class="stat"><div class="v">${x.week}</div><div class="l">Workouts this week</div></div><div class="stat"><div class="v">${x.streak.current}</div><div class="l">Week streak</div></div><div class="stat"><div class="v">${x.last ? esc(S.fmtDate(x.last)) : "—"}</div><div class="l">Last workout</div></div></div>`;
    const more = `<div class="stats crew-stats"><div class="stat"><div class="v">${x.cycle}</div><div class="l">Workouts this cycle</div></div><div class="stat"><div class="v">${x.sets}</div><div class="l">Sets this cycle</div></div><div class="stat"><div class="v">${x.lbs.toLocaleString()}</div><div class="l">Pounds moved</div></div><div class="stat"><div class="v">${x.cardio}</div><div class="l">Cardio minutes</div></div><div class="stat"><div class="v">${x.badges}</div><div class="l">Badges</div></div></div>
      ${x.prs.length ? (() => { const names = [...new Set(x.prs.map(e => String(e.name).replace(/, (\d+ sets?)$/, " ($1)")))]; return `<p class="small"><b>Personal bests this cycle:</b> ${esc(names.length > 5 ? `${names.slice(0, 5).join(", ")}, and ${names.length - 5} more` : listText(names))}.</p>`; })() : `<p class="small muted">No new personal bests yet this cycle.</p>`}`;
    const privacy = mine ? `<div class="field crew-privacy"><span id="share-lbl">What the crew sees of your progress</span>${seg("setShare", lvl, Object.entries(SHARE_LABEL), "What the crew sees")}
      <p class="small muted">${lvl === "all" ? "Your crew sees everything on this card, plus your Progress and Body tabs." : lvl === "trained" ? "Your crew sees which days you trained and your streak. Numbers, Progress, and Body stay hidden." : "Your crew sees only that you're a member. You still see everything here."} This hides it in the app. Crewmates' phones still receive your workouts so partner mode works.</p></div>` : "";
    if (!mine && lvl === "none") return "";
    return `<section class="card crew-card">${head}${mine || lvl !== "none" ? basic : ""}${mine || lvl === "all" ? more : `<p class="small muted">${esc(p.name)} shares just the days they trained.</p>`}${privacy}</section>`;
  };
  const hidden = ids.filter(id => id !== me && shareOf(id) === "none");
  return `<section class="card"><h2 class="h2">${esc(state.auth.crew?.name || "Crew")}</h2>
      <p class="small muted">Cycle ${esc(S.fmtDate(ci.start))} to ${esc(S.fmtDate(ci.end))} · Week ${esc(ci.week)}</p>
      ${full.length > 1 ? `<div class="stats crew-stats"><div class="stat"><div class="v">${tot.w}</div><div class="l">Workouts together this cycle</div></div><div class="stat"><div class="v">${tot.s}</div><div class="l">Sets</div></div><div class="stat"><div class="v">${tot.l.toLocaleString()}</div><div class="l">Pounds moved</div></div><div class="stat"><div class="v">${tot.p}</div><div class="l">Personal bests</div></div></div>` : ""}
    </section>
    <section class="card"><h3 class="h3">This week</h3>
      <div class="scroll"><table class="t crew-week"><caption class="visually-hidden">Who trained each day this week</caption><thead><tr><th scope="col"><span class="cw-name">Person</span></th>${week.map((d, i) => `<th scope="col" class="${d === t ? "today" : ""}"><span aria-hidden="true">${DN[i][0]}</span><span class="visually-hidden">${DN[i]}</span></th>`).join("")}</tr></thead>
      <tbody>${visible.map(id => `<tr><th scope="row">${avatarHtml(id)} <span class="cw-name">${esc(P(id).name)}</span></th>${week.map(d => { const did = st[id].days.has(d); return `<td class="${did ? "did" : ""} ${d === t ? "today" : ""}">${did ? `<span aria-hidden="true">✓</span><span class="visually-hidden">trained</span>` : d > t ? "" : `<span aria-hidden="true">·</span><span class="visually-hidden">rest</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div></section>
    ${ids.map(card).join("")}
    ${hidden.length ? `<p class="small muted">${esc(listText(hidden.map(id => P(id).name)))} ${hidden.length === 1 ? "keeps" : "keep"} their progress private.</p>` : ""}
    ${crewCard()}`;
}

export { SHARE_LABEL, viewCrew };
