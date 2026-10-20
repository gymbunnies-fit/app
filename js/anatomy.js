// GymBunnies.fit body map: an original anatomy-chart figure (Progress > Focus). Pure: no DOM, testable in Node.
// Drawn once for a middle body (shoulders 40, waist 28, hips 35 as half-widths), then warped to the
// person's chosen shape. Points are [distance from centre, y] for the viewer's left side; "a" marks
// arm points (they move with the shoulders and hips instead of stretching).
export function anatomy(o) {
  const C = 100;
  const k = o.build;
  const sh = o.shoulders + (k - 1) * 10, wa = o.waist + (k - 1) * 14, hp = o.hips + (k - 1) * 12, ch = o.chest;
  const sS = sh / 40, wS = wa / 28, hS = hp / 35;
  const f = n => Math.round(n * 10) / 10;
  const lerpTab = (tab, y) => {
    if (y <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, v0] = tab[i - 1], [y1, v1] = tab[i]; return v0 + (v1 - v0) * (y - y0) / (y1 - y0); }
    return tab[tab.length - 1][1];
  };
  const widthTab = [[50, 1], [64, sS], [96, sS * 0.6 + wS * 0.4], [120, sS * 0.3 + wS * 0.7], [162, wS], [184, (wS + hS) / 2], [204, hS], [250, hS * 0.55 + k * 0.45], [300, k], [420, k]];
  const armMid = [[66, 37], [100, 40], [157, 43], [218, 46], [260, 47]];
  const armShift = (sh - 40) + Math.max(0, hp - 35 - (sh - 40)) * 0.9;
  // Heights: the figure was drawn with a long torso. Remap so it is eight heads tall: chin 54, nipples ~104,
  // navel ~154, crotch ~204, knees 300, soles ~404.
  const Y = y => lerpTab([[0, 0], [50, 50], [68, 68], [110, 108], [162, 154], [213, 204], [236, 224], [300, 300], [999, 999]], y);
  const bump = (d, y) => Math.exp(-(((d - 17) / 13) ** 2) - (((y - 104) / 12) ** 2));
  // Warp one point.
  const W = p => {
    let [d, y, r] = p;
    if (r === "a") { const m = lerpTab(armMid, y); return [m + armShift + (d - m) * k, Y(y)]; }
    if (r === "s") { return [d + armShift * 0.8 + (d - 36) * (k - 1) * 0.6, Y(y)]; } // shoulder cap
    const g = ch ? bump(d, y) : 0;
    return [d * lerpTab(widthTab, y) + ch * 0.12 * g, Y(y + ch * 0.55 * g)];
  };
  function curve(P, closed) {
    const n = P.length; let s = "M" + f(P[0][0]) + " " + f(P[0][1]);
    const get = i => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      s += " C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) + " " + f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) + " " + f(p2[0]) + " " + f(p2[1]);
    }
    return s + (closed ? "Z" : "");
  }
  const toL = P => P.map(p => [C - p[0], p[1]]), toR = P => P.map(p => [C + p[0], p[1]]);
  const shape = pts => { const w = pts.map(W); return curve(toL(w), true) + " " + curve(toR(w), true); };
  const open = pts => { const w = pts.map(W); return curve(toL(w), false) + " " + curve(toR(w), false); };
  function polyAt(P, t) {
    if (P.length === 1) return P[0];
    const cum = [0]; let s = 0;
    for (let i = 1; i < P.length; i++) { s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(s); }
    const want = t * s; let i = 1; while (i < P.length - 1 && cum[i] < want) i++;
    const u = (want - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u];
  }
  // Fibres between two edges of a shape (lists of point indexes).
  function fibres(pts, A, B, n, bow) {
    const w = pts.map(W), PA = A.map(i => w[i]), PB = B.map(i => w[i]); let s = "";
    for (let j = 1; j < n; j++) {
      const t = j / n, a = polyAt(PA, t), c = polyAt(PB, t);
      const mx = (a[0] + c[0]) / 2 - (c[1] - a[1]) * bow, my = (a[1] + c[1]) / 2 + (c[0] - a[0]) * bow;
      for (const sd of [-1, 1]) s += " M" + f(C + sd * a[0]) + " " + f(a[1]) + " Q" + f(C + sd * mx) + " " + f(my) + " " + f(C + sd * c[0]) + " " + f(c[1]);
    }
    return s;
  }

  // ---------------------------------------------------------------- outline
  const A = "a", S = "s";
  const body = [
    [7, 50], [8.5, 58], [17, 62], [30, 65],
    [38, 68, S], [45, 76, S], [47.5, 90, S],
    [47, 104, A], [48, 122, A], [48, 140, A], [47.5, 156, A], [50.5, 172, A], [51.5, 190, A], [50.5, 206, A], [49.5, 217, A],
    [41.5, 217, A], [40, 200, A], [39, 180, A], [39, 165, A], [38.5, 155, A], [38, 138, A], [37.5, 118, A], [36.5, 104, A], [35, 98],
    [33.5, 106], [31.5, 120], [29.5, 138], [28, 156], [28.5, 166], [31.5, 182], [35, 198],
    [36, 214], [35, 240], [32, 264], [27.5, 290], [26.5, 302], [28.5, 318], [27.5, 340], [22.5, 364], [19.6, 379], [14, 383], [8.8, 379], [7, 352], [7.5, 326], [8.5, 302], [9, 290], [7, 266], [5, 242], [3, 220], [1, 213]
  ];
  const bw = body.map(W);
  const silhouette = curve(toL(bw).concat(toR(bw).reverse()), true);
  // ---------------------------------------------------------------- head (not reshaped; 50 tall, chin at 54)
  const sym = P => curve(toL(P).concat(toR(P).reverse().slice(1, -1)), true);   // one shape across the centre line
  const pair = P => curve(toL(P), true) + " " + curve(toR(P), true);            // a left and a right copy
  const skull = [[0, 4], [8.5, 5.5], [14, 10], [16.8, 17], [17.4, 24.5], [16.8, 31], [15.9, 36], [14.7, 41], [12.8, 46], [9, 51], [4.5, 53.6], [0, 54.3]];
  const ears = pair([[16.4, 26.5], [18.6, 25.6], [19.7, 28.6], [19.3, 33.5], [17.8, 38.5], [16.2, 37.5]]);
  const headShape = sym(skull);
  // No face: the head shows its muscles and tendons only.
  const headFront = {
    base: headShape + " " + ears,
    cream: sym([[0, 4], [8.5, 5.5], [14, 10], [15.4, 14.8], [11, 17.6], [5, 18.4], [0, 18]]) + " " +                   // scalp
      sym([[0, 18], [1.4, 18.2], [1.2, 27], [0, 27.5]]),                                                               // seam between the forehead muscles
    muscle: pair([[14, 13], [16.8, 19.5], [16.9, 28.5], [15, 30], [13.4, 22]]) + " " +                                  // temple
      pair([[1.6, 18.6], [5, 18.9], [11, 17.9], [11.4, 23.5], [7, 26.5], [1.6, 26.8]]) + " " +                          // forehead
      pair([[12, 37.5], [15, 38], [14, 45], [11.8, 45.8], [11, 41.5]]),                                                // jaw
    dark: "", lids: "", lines: ""
  };
  const headBack = {
    base: headShape + " " + ears,
    cream: sym([[0, 4], [8.5, 5.5], [14, 10], [16.8, 17], [17.2, 26], [15.4, 33], [10, 34], [4, 36], [0, 37]]),       // galea
    muscle: pair([[1.6, 35.5], [9.5, 33.4], [13.6, 34.8], [12.2, 38.6], [3, 39]]) + " " +                               // occipitalis
      pair([[1.2, 41], [9, 40.5], [13.4, 44], [12, 51], [6, 54], [1.2, 53]]),                                          // neck under the traps
    dark: "", lids: "", lines: ""
  };

  // ---------------------------------------------------------------- hands
  // Relaxed and continuous with the wrist: palm a little wider than the wrist, fingers together and slightly
  // curled, thumb on the outer side. About three-quarters of a head long, reaching mid-thigh.
  const wr = W([45.5, 213, A]); const hx = wr[0], hy = wr[1] - 1, hw = 5.6 * k;
  const knuck = hy + 16.5, fl = 18.5;
  const fingers = [[0.62, 0.92], [0.2, 1], [-0.22, 0.95], [-0.62, 0.78]];      // outer (index) to inner (little)
  const handPts = [[hx + hw * 0.92, hy], [hx + hw * 1.08, hy + 4], [hx + hw * 1.55, hy + 9], [hx + hw * 1.85, hy + 14.5], [hx + hw * 1.72, hy + 19.5], [hx + hw * 1.38, hy + 16], [hx + hw * 1.12, hy + 14]];
  fingers.forEach(([u, len], i) => {
    const x = hx + hw * 1.1 * u, w = hw * 0.27, tip = knuck + fl * len;
    if (i > 0) handPts.push([x + w * 1.25, knuck + 1.5]);
    handPts.push([x + w * 1.02, knuck + fl * len * 0.55], [x + w * 0.7, tip - 1.4], [x - 0.2, tip], [x - w * 0.8, tip - 1.4], [x - w * 1.02, knuck + fl * len * 0.55]);
  });
  handPts.push([hx - hw * 1.1, knuck - 2], [hx - hw * 1.05, hy + 7], [hx - hw * 0.92, hy]);
  const L1 = P => curve(toL(P), true) + " " + curve(toR(P), true);
  const hands = L1(handPts);
  const thenar = L1([[hx + hw * 0.45, hy + 3.5], [hx + hw * 1.05, hy + 6.5], [hx + hw * 1.2, hy + 11.5], [hx + hw * 0.75, hy + 13], [hx + hw * 0.35, hy + 9]]);
  const hypothenar = L1([[hx - hw * 0.8, hy + 4], [hx - hw * 0.35, hy + 5], [hx - hw * 0.38, hy + 14], [hx - hw * 0.9, hy + 14], [hx - hw * 0.98, hy + 9]]);
  let tendonLines = "";
  for (const [u] of fingers) for (const sd of [-1, 1]) {
    const x0 = hx + hw * 0.25 * u, x1 = hx + hw * 1.1 * u;
    tendonLines += " M" + f(C + sd * x0) + " " + f(hy + 2) + " L" + f(C + sd * x1) + " " + f(knuck + 6);
  }
  let creases = "";
  for (const [u, len] of fingers) for (const sd of [-1, 1]) for (const t of [0.42, 0.72]) {
    const x = hx + hw * 1.1 * u, w = hw * 0.25, y = knuck + fl * len * t;
    creases += " M" + f(C + sd * (x - w)) + " " + f(y) + " L" + f(C + sd * (x + w)) + " " + f(y);
  }

  // ---------------------------------------------------------------- feet
  // Front: the top of the foot, toes pointing forward and a little out. Back: the heel.
  const footF = [[9, 377], [8.2, 385], [6.4, 394], [6.2, 401]];
  const toes = [[9.8, 2.5, 409.5], [13.6, 1.6, 408.6], [16.5, 1.45, 407.4], [19.2, 1.35, 405.8], [21.7, 1.25, 403.8]]; // big to little
  toes.forEach(([x, w, tip], i) => {
    if (i > 0) footF.push([x - w - 0.35, tip - 3.6]);
    footF.push([x - w, tip - 1.6], [x, tip], [x + w, tip - 1.6]);
  });
  footF.push([23.6, 400], [22.8, 394], [21.4, 387], [19.9, 380.5], [19.4, 377]);
  const kW = d => d * Math.max(0.9, Math.min(1.15, k));
  const fP = P => P.map(([d, y]) => [kW(d), y]);
  const feetFront = pair(fP(footF));
  const footTendons = pair(fP([[10.6, 381], [10.2, 395], [9.8, 404]])).replace(/Z/g, "");
  let toeLines = "";
  for (const [x, , tip] of toes.slice(1)) for (const sd of [-1, 1]) toeLines += " M" + f(C + sd * kW(13.5)) + " " + f(383) + " L" + f(C + sd * kW(x)) + " " + f(tip - 4);
  const ebrevis = pair(fP([[16.5, 388], [21.2, 389.5], [21.4, 395.5], [17.5, 396.5], [15.6, 392]]));
  const soleBack = pair(fP([[8, 389], [6, 395.5], [6.4, 401.5], [9, 403.6], [19.4, 403.6], [22.2, 401.5], [22.4, 395.5], [20.6, 389]]));
  const heel = pair(fP([[8.8, 377], [7.4, 383.5], [8, 391], [9.4, 399.5], [12, 404], [16, 404], [18.6, 399.5], [20.1, 391], [20.9, 384.5], [19.6, 377]]));
  const feetBack = soleBack + " " + heel;

  // ---------------------------------------------------------------- muscles
  // [id or null (drawn, not tracked), points, fibre edge A, fibre edge B, fibre count, bow]
  const FRONT = [
    [null, [[3, 49], [6.5, 47], [11.5, 52], [5, 64], [2.2, 63.5]], [0, 1], [4, 3], 3, 0],                                      // neck (SCM)
    ["traps", [[9, 52], [16, 59.5], [33, 65], [27, 68], [12, 62]], [0, 4], [2, 3], 5, 0.02],
    ["chest", [[2.2, 70], [14, 67], [27, 68.5], [33, 80], [35, 92, S], [30, 104], [20, 110], [8, 110.5], [2.2, 106]], [0, 8, 7, 6], [3, 4, 4], 13, 0.04],
    ["frontDelts", [[27, 68], [36.5, 67.5, S], [42, 80, S], [42.5, 98, A], [39, 108, A], [34, 94], [29, 78]], [0, 1], [3, 4], 7, 0.04],
    ["sideDelts", [[37, 67.5, S], [44, 72, S], [48, 86, S], [46.5, 102, A], [42.5, 109, A], [42, 92, S], [40.5, 78, S]], [0, 1], [3, 4], 6, 0.03],
    [null, [[27.5, 108], [33.5, 104], [32.5, 110.5], [26.5, 113.5]], [0, 3], [1, 2], 3, 0],                                    // serratus
    [null, [[26.5, 116], [32, 112.5], [31, 119.5], [25.5, 121.5]], [0, 3], [1, 2], 3, 0],
    [null, [[25.5, 124], [31, 121], [30, 127.5], [24.5, 129.5]], [0, 3], [1, 2], 3, 0],
    ["abs", [[2, 113], [11.5, 112], [12, 126], [2, 126.5]], [0, 1], [3, 2], 4, 0],
    ["abs", [[2, 129], [12, 128.5], [12.5, 143], [2, 143.5]], [0, 1], [3, 2], 4, 0],
    ["abs", [[2, 146], [12.5, 145.5], [12.5, 160], [2, 160.5]], [0, 1], [3, 2], 4, 0],
    ["abs", [[2, 163], [12.5, 162.5], [11.5, 185], [7, 202], [2, 206]], [0, 1], [4, 3], 4, 0],
    ["obliques", [[14, 114], [24.5, 118], [28.5, 134], [27.5, 158], [30, 178], [24, 190], [15, 188], [14, 166], [14.5, 140]], [1, 2, 3, 4], [0, 8, 7, 6], 10, 0.02],
    ["biceps", [[37, 102, A], [41.5, 99, A], [45, 113, A], [45.5, 133, A], [43, 150, A], [40.5, 153, A], [38, 140, A], [37, 120, A]], [0, 1], [5, 4], 7, 0.02],
    ["biceps", [[45.5, 133, A], [47.8, 138, A], [47.3, 154, A], [44, 156, A]], [0, 1], [3, 2], 3, 0],                     // brachialis
    ["forearms", [[44.5, 155, A], [48.5, 158, A], [51, 176, A], [48, 200, A], [45.5, 196, A], [45, 172, A]], [0, 1], [4, 3], 4, 0.02],
    ["forearms", [[39, 160, A], [44.5, 158, A], [45, 180, A], [45.5, 203, A], [43.5, 211, A], [41, 210, A], [39.5, 188, A]], [0, 1], [5, 4], 6, 0.02],
    [null, [[30.5, 185], [34.8, 196], [34.5, 212], [30.5, 206]], [0, 3], [1, 2], 3, 0],                                    // tensor fasciae latae
    ["adductors", [[2.5, 214], [13, 205], [17.5, 216], [14.5, 245], [10, 263], [6.5, 250], [4, 230]], [0, 1], [5, 4], 7, 0.03],
    ["quads", [[19, 206], [25.5, 210], [27.5, 240], [24.5, 274], [20, 281], [16, 252], [16.5, 222]], [0, 1], [4, 5], 6, 0.01],      // rectus femoris
    ["quads", [[27.5, 207], [35, 213], [35, 240], [30.5, 270], [26.5, 286], [25, 276], [28, 242], [27, 214]], [0, 1], [4, 5], 6, 0.01], // vastus lateralis
    ["quads", [[12.5, 250], [16.5, 252], [20, 280], [17, 292.5], [11, 289], [9.8, 272]], [0, 1], [3, 4], 5, 0.03],           // vastus medialis
    [null, [[30.5, 194], [33.5, 199], [17, 248], [12.5, 288], [9.5, 291], [13.5, 248]], [0, 1], [4, 3], 2, 0],               // sartorius
    [null, [[17.5, 304], [25.5, 305], [26.5, 322], [23.5, 346], [19.8, 372], [17.6, 371], [17.5, 346], [16.5, 320]], [0, 1], [5, 4], 5, 0.01],  // tibialis anterior
    [null, [[25.8, 306], [28.4, 314], [27.6, 336], [23.4, 362], [21.4, 361], [24.4, 340]], [0, 1], [4, 3], 3, 0.01],               // peroneus
    ["calves", [[8.6, 300], [15.6, 303], [16, 326], [13.5, 348], [9.5, 352], [7.6, 336], [7.6, 314]], [0, 1], [4, 3], 4, 0.01],
    ["calves", [[9.5, 352], [13.5, 349], [16.6, 352], [16.4, 368], [12, 372], [8.8, 366]], [0, 1], [5, 4], 3, 0]               // soleus, inner edge
  ];
  const BACK = [
    ["traps", [[0.6, 50], [6.5, 51.5], [16, 59.5], [35.5, 66.5], [28, 74], [17, 90], [6, 118], [0.6, 126]], [0, 1, 7], [3, 4, 5], 13, 0.02],
    ["rearDelts", [[29, 70], [39.5, 68, S], [46, 80, S], [46, 98, A], [42.5, 105, A], [36, 90]], [0, 1], [3, 4], 6, 0.04],
    ["sideDelts", [[39.5, 68, S], [45, 72, S], [48, 86, S], [46.5, 101, A], [44.5, 104, A], [44, 86, S]], [0, 1], [3, 4], 4, 0.03],
    ["upperBack", [[19.5, 79], [33, 76], [37, 88], [30, 99], [19.5, 98]], [0, 4], [1, 2, 3], 6, 0.03],                     // infraspinatus
    ["upperBack", [[30, 100], [37, 91], [38.5, 100], [33.5, 106.5]], [0, 3], [1, 2], 3, 0],                               // teres major
    ["lats", [[13, 104], [32.5, 106.5], [36.5, 112], [32.5, 140], [28.5, 160], [18, 172], [9.5, 178], [8, 150], [9.5, 120]], [6, 7, 8, 0], [1, 2, 2, 2], 12, 0.03],
    ["lowerBack", [[2, 122], [9.5, 120], [12.5, 150], [11, 186], [6, 194], [2, 190]], [0, 1], [5, 4], 4, 0],
    ["obliques", [[27.5, 152], [29.5, 166], [31.5, 181], [26, 187], [21, 173], [25.5, 160]], [0, 1, 2], [5, 4, 3], 5, 0.02],
    ["triceps", [[36, 104, A], [41, 102, A], [41.5, 128, A], [39.5, 146, A], [37.5, 146, A], [35.5, 124, A]], [0, 1], [4, 3], 5, 0.01],  // long head
    ["triceps", [[41.5, 101, A], [46.5, 104, A], [48, 124, A], [45.5, 140, A], [42, 132, A]], [0, 1], [4, 3], 4, 0.02],               // lateral head
    ["forearms", [[39.5, 160, A], [44.5, 157, A], [45.5, 182, A], [45, 206, A], [42, 210, A], [40, 190, A]], [0, 1], [4, 3], 4, 0.02],
    ["forearms", [[45, 156, A], [49.5, 162, A], [51.5, 182, A], [49, 206, A], [46, 205, A], [46, 180, A]], [0, 1], [4, 3], 4, 0.02],
    ["outerHips", [[18, 180], [30.5, 180], [35, 196], [30, 199], [22, 192]], [0, 1], [4, 3], 5, 0.03],
    ["glutes", [[2, 194], [18, 186.5], [30, 194], [35, 210], [33, 228], [22, 236], [8, 236], [2, 230]], [0, 7, 6], [1, 3, 4], 11, 0.04],
    ["adductors", [[2.5, 234], [6.5, 238], [6.5, 262], [3.5, 262]], [0, 1], [3, 2], 2, 0],
    ["hamstrings", [[19.5, 240], [30, 236], [32.3, 260], [28, 290], [22, 296], [21, 270]], [0, 1], [4, 3], 5, 0.01],           // biceps femoris
    ["hamstrings", [[7, 241], [18, 240], [20, 270], [19.5, 292], [12, 297], [8, 281], [6.5, 260]], [0, 1], [4, 3], 6, 0.01],   // semitendinosus / membranosus
    ["calves", [[6.5, 304], [15.2, 300], [15.2, 330], [13, 346], [8, 339], [6.3, 320]], [0, 1], [3, 4], 4, 0.02],               // gastrocnemius, inner head
    ["calves", [[16.3, 300], [26.3, 304], [27.3, 325], [22, 343], [16.3, 334]], [0, 1], [3, 4], 4, 0.02],                     // outer head
    ["calves", [[7.8, 342], [14, 347], [22, 345], [21, 362], [17.5, 372], [11, 370], [8.5, 356]], [0, 1, 2], [5, 4, 3], 4, 0.02] // soleus
  ];
  function build(list) {
    const parts = {}, untracked = []; let fib = "";
    for (const [id, pts, a, b, n, bow] of list) {
      const d = shape(pts);
      if (id) parts[id] = (parts[id] ? parts[id] + " " : "") + d; else untracked.push(d);
      fib += fibres(pts, a, b, n, bow);
    }
    return { parts: parts, untracked: untracked.join(" "), fibres: fib };
  }
  const fm = build(FRONT), bk = build(BACK);
  // Pale tendons drawn over the muscles: the line down the abs, the trap diamond, the lower-back fascia, kneecaps, Achilles.
  const tendonsFront = [
    open([[0.01, 68], [0.01, 112]]),
    ch ? open([[33, 100], [24, 108.5], [12, 111], [3, 108]]) : ""
  ].join(" ");
  const fasciaBack = shape([[0.01, 58], [4, 62], [6, 70], [0.01, 82]]) + " " + shape([[0.01, 150], [8, 168], [12, 188], [0.01, 196]]);
  const kneeFront = shape([[13, 288], [19, 290], [21, 300], [17, 306], [11, 302], [10.5, 294]]);
  const achilles = shape([[11.5, 368], [15, 368], [14.5, 384], [12, 384]]);
  return {
    silhouette: silhouette, headFront: headFront, headBack: headBack,
    hands: hands, thenar: thenar + " " + hypothenar, handTendons: tendonLines, fingerCreases: creases,
    feetFront: feetFront, feetBack: feetBack, soleBack: soleBack, heel: heel, footLines: toeLines + " " + footTendons, ebrevis: ebrevis,
    front: fm.parts, back: bk.parts, untrackedFront: fm.untracked, untrackedBack: bk.untracked,
    fibresFront: fm.fibres, fibresBack: bk.fibres,
    tendonsFront: tendonsFront, paleFront: kneeFront, paleBack: fasciaBack + " " + achilles
  };
}
