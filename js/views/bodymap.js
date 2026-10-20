// Progress > Focus: the body map. Front and back figures, coloured by how much each muscle was worked
// this two-week cycle (or by muscle group). Tap a muscle on the figure or in the list to see its sets.
// The figures are aria-hidden; the list below them is the same information as real buttons.
import { TODAY, cyclePlan, cycleStart, esc, seg, state } from "../app.js";
import * as S from "../stats.js";
import * as MU from "../muscles.js";
import { anatomy } from "../anatomy.js";

const PLATE = { skin: "#eedfc8", skinLine: "#c9b49a", hand: "#e3c7ad", handLine: "#b99b80", muscle: "#b9442f", deep: "#a93d2a", fibre: "rgba(80,14,6,0.33)" };
// Effort colours: the muscle's own red when untouched, warming to pink with more sets.
const LEVELS = [["#b9442f", "None yet"], ["#c94160", "Some"], ["#de3f80", "More"], ["#f23fa0", "Most"]];
const FRONT = ["traps", "chest", "frontDelts", "sideDelts", "abs", "obliques", "biceps", "forearms", "adductors", "quads", "calves"];
const BACK = ["traps", "rearDelts", "sideDelts", "upperBack", "lats", "lowerBack", "obliques", "triceps", "forearms", "outerHips", "glutes", "adductors", "hamstrings", "calves"];

const shapeOf = u => MU.cleanShape(state.bodyShape?.[u]);

function volumeFilter(id) {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/><feComposite in="SourceAlpha" in2="b" operator="out" result="rim"/>
    <feFlood flood-color="#3d0c06" flood-opacity="0.6"/><feComposite in2="rim" operator="in" result="shade"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b2"/><feOffset in="b2" dx="-0.8" dy="-1.6" result="o2"/>
    <feComposite in="o2" in2="SourceAlpha" operator="in" result="core"/><feFlood flood-color="#ffd9c4" flood-opacity="0.2"/><feComposite in2="core" operator="in" result="hi"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="hi"/><feMergeNode in="shade"/></feMerge></filter>`;
}

function figure(g, view, colorOf, sel) {
  const F = view === "front", fid = `bm-vol-${view}`, h = F ? g.headFront : g.headBack;
  const p = (d, attrs) => d ? `<path d="${d}" ${attrs}/>` : "";
  const muscles = (F ? FRONT : BACK).filter(id => g[view][id]).map(id =>
    `<path d="${g[view][id]}" fill="${colorOf(id)}" data-act="bmPick" data-v="${id}" class="bm-m${id === sel ? " on" : ""}"/>`).join("");
  return `<svg class="bm-fig" viewBox="0 0 200 415" aria-hidden="true" focusable="false"><defs>${volumeFilter(fid)}</defs>
    ${p(g.silhouette, `fill="${PLATE.skin}" stroke="${PLATE.skinLine}" stroke-width="0.6"`)}
    ${p(g.hands, `fill="${PLATE.hand}" stroke="${PLATE.handLine}" stroke-width="0.5" stroke-linejoin="round"`)}
    ${F ? p(g.thenar, `fill="#c98068" opacity="0.75"`) : p(g.handTendons, `fill="none" stroke="#c9a88c" stroke-width="0.5"`)}
    ${p(g.fingerCreases, `fill="none" stroke="${PLATE.handLine}" stroke-width="0.35"`)}
    ${F ? p(g.feetFront, `fill="${PLATE.skin}" stroke="${PLATE.skinLine}" stroke-width="0.6" stroke-linejoin="round"`) + p(g.footLines, `fill="none" stroke="#cdb497" stroke-width="0.5"`)
        : p(g.soleBack, `fill="#dcc8ad" stroke="#c2aa8c" stroke-width="0.6"`) + p(g.heel, `fill="${PLATE.skin}" stroke="#c2aa8c" stroke-width="0.6"`)}
    <g filter="url(#${fid})">${p(F ? g.untrackedFront : g.untrackedBack, `fill="${PLATE.deep}" class="bm-x"`)}${muscles}</g>
    ${p(F ? g.fibresFront : g.fibresBack, `fill="none" stroke="${PLATE.fibre}" stroke-width="0.4" class="bm-x"`)}
    ${p(F ? g.paleFront : g.paleBack, `fill="${PLATE.skin}" opacity="0.85" class="bm-x"`)}
    ${F ? p(g.tendonsFront, `fill="none" stroke="${PLATE.skin}" stroke-width="1.6" stroke-linecap="round" class="bm-x"`) : ""}
    ${p(h.base, `fill="${PLATE.muscle}" filter="url(#${fid})" class="bm-x"`)}
    ${p(h.cream, `fill="${PLATE.skin}" opacity="0.92" class="bm-x"`)}
    ${p(h.muscle, `fill="${PLATE.deep}" filter="url(#${fid})" class="bm-x"`)}
    ${sel ? (F ? FRONT : BACK).includes(sel) && g[view][sel] ? `<path d="${g[view][sel]}" fill="none" stroke="#1a1818" stroke-width="2.2" stroke-linejoin="round" class="bm-x"/>` : "" : ""}
  </svg>`;
}

export function bodyMapCard(u) {
  const c = S.cycleInfo(TODAY(), cycleStart());
  const r = MU.muscleReport(cyclePlan(u), state.data.sessions, u, c.start, c.end);
  const ids = Object.keys(MU.MUSCLES);
  const eff = id => MU.effort(r[id]);
  const mode = state.bmMode === "groups" ? "groups" : "effort";
  const colorOf = id => mode === "groups" ? MU.groupOf(id)[1] : LEVELS[MU.level(eff(id))][0];
  const ranked = ids.slice().sort((a, b) => eff(b) - eff(a) || r[b].planMain - r[a].planMain);
  const sel = MU.MUSCLES[state.bmSel] ? state.bmSel : ranked[0];
  const g = anatomy(shapeOf(u));
  const x = r[sel], m = MU.MUSCLES[sel];
  const legend = (mode === "groups" ? MU.GROUPS.map(gr => [gr[1], gr[0]]) : LEVELS).map(([col, n]) => `<li><span class="bm-sw" style="background:${col}"></span>${esc(n)}</li>`).join("");
  const aimed = x.planned.length ? x.planned : x.logged;
  const list = ranked.map(id => `<li><button type="button" class="bm-item" data-act="bmPick" data-v="${id}" aria-pressed="${id === sel}">
      <span class="bm-sw" style="background:${colorOf(id)}" aria-hidden="true"></span><span class="bm-n">${esc(MU.MUSCLES[id].n)}</span>
      <span class="bm-v"><span class="visually-hidden">, </span>${fmt(eff(id))}<span class="visually-hidden"> sets this cycle</span></span></button></li>`).join("");
  const own = u === state.user;
  const shape = shapeOf(u);
  const shapeBox = own ? `<details class="more bm-shape"${state.bmShapeOpen ? " open" : ""}><summary data-act="bmShapeToggle">Your body shape</summary>
      <p class="small muted">Build a figure that fits you, now or the body you're working toward. Each choice is separate. It's saved to your own account only: your crew never sees it.</p>
      ${MU.SHAPE.map(([key, label, opts]) => `<div class="bm-shape-row"><div class="bm-shape-l" id="bm-s-${key}">${esc(label)}</div>${seg("bmShape", `${key}:${shape[key]}`, opts.map(([l, v]) => [`${key}:${v}`, l]), label)}</div>`).join("")}
    </details>` : "";
  return `<section class="card bm" aria-labelledby="bm-h">
    <h3 class="h3" id="bm-h">Muscles worked</h3>
    <p class="small muted">This cycle, ${S.fmtDate(c.start)} to ${S.fmtDate(c.end)}, from what's been logged.</p>
    ${seg("bmMode", mode, [["effort", "Effort"], ["groups", "Groups"]], "Color the map by")}
    <div class="bm-plate">
      <div class="bm-figs"><figure><figcaption>Front</figcaption>${figure(g, "front", colorOf, sel)}</figure><figure><figcaption>Back</figcaption>${figure(g, "back", colorOf, sel)}</figure></div>
      <ul class="bm-legend" aria-label="${mode === "groups" ? "Muscle groups" : "How much each muscle got"}">${legend}</ul>
      <p class="bm-hint">${mode === "groups" ? "Each color is a muscle group." : "A muscle's own red means no sets yet. The pinker it is, the more sets it got. Sets where it only helps count as half."} Tap a muscle, or pick one from the list.</p>
    </div>
    <div class="bm-sel" aria-live="polite">
      <div class="between"><h4 class="h3">${esc(m.n)}</h4><span class="tag new">${esc(mode === "groups" ? MU.groupOf(sel)[0] : LEVELS[MU.level(eff(sel))][1])}</span></div>
      <p class="small">${esc(m.about)}</p>
      <div class="stats"><div class="stat"><div class="v">${x.didMain} + ${x.didAlso}</div><div class="l">Logged: aimed at it + helping</div></div>
        <div class="stat"><div class="v">${x.planMain} + ${x.planAlso}</div><div class="l">Planned this cycle</div></div></div>
      <p class="small"><b>${x.planned.length ? "Aimed at it in your plan" : "Logged"}:</b> ${aimed.length ? esc(aimed.join(", ")) : "No exercise aims straight at it. It works as a helper in other moves."}</p>
    </div>
    <h4 class="bm-list-h">All muscles, most worked first</h4>
    <ul class="bm-list">${list}</ul>
    ${shapeBox}
  </section>`;
}
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
