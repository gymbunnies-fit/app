// Bunny avatars: original drawings for GymBunnies.fit. Saved on a profile as "bun:<id>".
// White shapes sit on the person's color circle; pink for inner ears and noses, dark for eyes.
const W = "#fff", PINK = "#f7a8c9", INK = "#1a1818";
const head = `<ellipse cx="16" cy="21" rx="8.5" ry="7.5" fill="${W}"/>`;
const eyes = `<circle cx="13" cy="20" r="1.2" fill="${INK}"/><circle cx="19" cy="20" r="1.2" fill="${INK}"/>`;
const nose = `<path d="M14.8 23.2h2.4L16 24.6z" fill="${PINK}"/>`;
const ear = (x, rot, h = 9) => `<g transform="rotate(${rot} ${x} 14)"><ellipse cx="${x}" cy="${14 - h / 2}" rx="2.6" ry="${h / 2 + 1}" fill="${W}"/><ellipse cx="${x}" cy="${14 - h / 2}" rx="1.2" ry="${h / 2 - 1}" fill="${PINK}"/></g>`;
const upright = ear(12.5, -10) + ear(19.5, 10);
const face = (extra = "", ears = upright, e = eyes) => ears + head + e + nose + extra;

export const BUNNIES = {
  classic: { n: "Bunny", svg: face() },
  lop: { n: "Lop-eared bunny", svg: `<ellipse cx="7.5" cy="21" rx="2.6" ry="6.5" transform="rotate(20 7.5 21)" fill="${W}"/><ellipse cx="24.5" cy="21" rx="2.6" ry="6.5" transform="rotate(-20 24.5 21)" fill="${W}"/>` + head + eyes + nose },
  flop: { n: "Bunny with one floppy ear", svg: face("", ear(12.5, -10) + `<g transform="rotate(70 19 14)"><ellipse cx="19" cy="9.5" rx="2.6" ry="5.5" fill="${W}"/><ellipse cx="19" cy="9.5" rx="1.2" ry="3.5" fill="${PINK}"/></g>`) },
  sleepy: { n: "Sleepy bunny", svg: face("", upright, `<path d="M11.6 20.2q1.4 1.2 2.8 0M17.6 20.2q1.4 1.2 2.8 0" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>`) },
  wink: { n: "Winking bunny", svg: face("", upright, `<circle cx="13" cy="20" r="1.2" fill="${INK}"/><path d="M17.6 20.2q1.4-1.2 2.8 0" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>`) },
  sweatband: { n: "Bunny in a sweatband", svg: face(`<rect x="8" y="15.2" width="16" height="2.6" rx="1.3" fill="#ff4fa3"/><rect x="8" y="16" width="16" height=".8" fill="${W}" opacity=".7"/>`) },
  shades: { n: "Bunny in sunglasses", svg: face(`<rect x="10.2" y="18.6" width="5" height="3" rx="1.2" fill="${INK}"/><rect x="16.8" y="18.6" width="5" height="3" rx="1.2" fill="${INK}"/><path d="M15.2 19.6h1.6" stroke="${INK}" stroke-width=".8"/>`, upright, "") },
  blush: { n: "Blushing bunny", svg: face(`<ellipse cx="11" cy="22.6" rx="1.5" ry=".9" fill="${PINK}"/><ellipse cx="21" cy="22.6" rx="1.5" ry=".9" fill="${PINK}"/>`) },
  ears: { n: "Bunny ears headband", svg: `<g transform="translate(0 6)">${ear(12, -14, 11) + ear(20, 14, 11)}</g><path d="M6.5 25q9.5-9 19 0" stroke="${W}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
  tail: { n: "Bunny tail", svg: `<ellipse cx="15" cy="19" rx="9" ry="7.5" fill="${W}" opacity=".55"/><g fill="${W}"><circle cx="16" cy="19" r="4.2"/><circle cx="13" cy="17.4" r="2.4"/><circle cx="19" cy="17.2" r="2.4"/><circle cx="12.8" cy="20.8" r="2.3"/><circle cx="19.2" cy="21" r="2.3"/><circle cx="16" cy="15.4" r="2.2"/><circle cx="16" cy="22.8" r="2.2"/></g>` },
  hop: { n: "Hopping bunny", svg: `<g fill="${W}"><ellipse cx="15" cy="20" rx="7.5" ry="5" transform="rotate(-15 15 20)"/><circle cx="22.5" cy="14.5" r="3.6"/><ellipse cx="22" cy="8.5" rx="1.5" ry="4" transform="rotate(-20 22 8.5)"/><ellipse cx="24.6" cy="9" rx="1.4" ry="3.6" transform="rotate(10 24.6 9)"/><circle cx="7.6" cy="19" r="2.2"/><path d="M9 23.5l-3.5 3.5h5z"/><path d="M18 23.5l3 3.5h-4.5z"/></g><circle cx="23.6" cy="14" r=".8" fill="${INK}"/>` },
  lift: { n: "Bunny with a dumbbell", svg: upright + head + eyes + nose + `<g fill="${INK}" opacity=".85"><rect x="5" y="26" width="22" height="1.6" rx=".8"/><rect x="5" y="24" width="2.6" height="5.6" rx="1"/><rect x="24.4" y="24" width="2.6" height="5.6" rx="1"/></g>` },
  carrot: { n: "Carrot", svg: `<path d="M10 25l9.5-11.5q2.5-1.8 3.8.5 1.2 2.4-1.3 4.2z" fill="#ff9a3c"/><path d="M14 20.5l2 1.4M16.6 17.6l1.8 1.4" stroke="#c96a1e" stroke-width=".8" stroke-linecap="round"/><path d="M22 13q-1-4.5 1.5-6M22.6 13.6q2.5-3.6 5.4-3.4M21.4 13.4q-3-2.4-3.2-5.4" stroke="#7bd36b" stroke-width="1.6" fill="none" stroke-linecap="round"/>` },
  heart: { n: "Bunny ears and a heart", svg: ear(12, -12, 11) + ear(20, 12, 11) + `<path d="M16 28s-6-3.8-6-7.6c0-2 1.6-3.4 3.3-3.4 1.2 0 2.2.7 2.7 1.7.5-1 1.5-1.7 2.7-1.7 1.7 0 3.3 1.4 3.3 3.4 0 3.8-6 7.6-6 7.6z" fill="${W}"/>` },
  paw: { n: "Bunny paw print", svg: `<g fill="${W}"><ellipse cx="16" cy="21.5" rx="5" ry="4.2"/><ellipse cx="10.2" cy="15.4" rx="2" ry="2.8" transform="rotate(-20 10.2 15.4)"/><ellipse cx="14.2" cy="11.8" rx="2" ry="3"/><ellipse cx="18.6" cy="11.8" rx="2" ry="3"/><ellipse cx="22.4" cy="15.4" rx="2" ry="2.8" transform="rotate(20 22.4 15.4)"/></g>` }
};
export const isBunny = a => typeof a === "string" && a.startsWith("bun:") && !!BUNNIES[a.slice(4)];
export const bunnySvg = (id, label = "") =>
  `<svg viewBox="0 0 32 32" class="bun" ${label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`} focusable="false">${BUNNIES[id].svg}</svg>`;
