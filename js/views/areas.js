// Body areas across a two-week cycle: shown on Progress > Focus and in the week review.
import { P, cyclePlan, cycleStart, esc, state } from "../app.js";
import * as S from "../stats.js";
import { FOCUS } from "../plan.js";

// Shared by the Focus tab and the week review. "Aimed at" = sets where this area is the main target.
// "Also works" = sets aimed elsewhere that still work it (presses work triceps, rows work biceps).
function areaCard(u, date, opts = {}) {
  const c = S.cycleInfo(date, cycleStart());
  const r = S.areaReport(cyclePlan(u), state.data.sessions, u, c.start, c.end);
  const focus = P(u)?.focus || [];
  const hid = `area-h-${opts.id || "p"}`;
  const rows = S.AREA_ORDER.map(a => {
    const x = r[a];
    return `<tr><th scope="row">${FOCUS[a]}${focus.includes(a) ? ` <span class="tag new">Goal</span>` : ""}</th><td class="num">${x.planMain}</td><td class="num">${x.planAlso}</td><td class="num">${x.didMain + x.didAlso ? `${x.didMain} + ${x.didAlso}` : "—"}</td></tr>`;
  }).join("");
  const moves = S.AREA_ORDER.filter(a => r[a].moves.length).map(a => `<li><b>${FOCUS[a]}:</b> ${esc(r[a].moves.join(", "))}</li>`).join("");
  return `<section class="card" aria-labelledby="${hid}"><h3 class="h3" id="${hid}">Body areas this cycle</h3>
    <p class="small muted">${S.fmtDate(c.start)} to ${S.fmtDate(c.end)}, Week A and Week B together. Sets your plan aims at each area, sets that also work it, and what you've logged so far.</p>
    <div class="scroll"><table class="t"><thead><tr><th scope="col">Area</th><th scope="col">Aimed at</th><th scope="col">Also works</th><th scope="col">Logged</th></tr></thead><tbody>${rows}</tbody></table></div>
    <details><summary>Which exercises aim at each area</summary><ul class="small">${moves}</ul></details>
  </section>`;
}
export { areaCard };
