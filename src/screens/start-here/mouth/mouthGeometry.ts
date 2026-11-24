import type { MouthSoundId } from '../data/types';

export type TongueShapeId =
  | 'rest'
  | 'low'
  | 'tipUp'
  | 'tipGap'
  | 'fwd'
  | 'fwdGap'
  | 'back'
  | 'backGap'
  | 'mid'
  | 'midGap'
  | 'dors'
  | 'dorsGap'
  | 'i'
  | 'u'
  | 'e';

export type LipShapeId = 'open' | 'shut' | 'round' | 'smile' | 'f';
export type AirKind = 'puff' | 'small' | 'stream' | 'nose';

export interface MouthPose {
  t: TongueShapeId;
  lips: LipShapeId;
  jaw: number;
  vel: number;
}

export interface MouthSpec {
  au: string;
  pose: MouthPose;
  pre?: MouthPose;
  v?: MouthPose[];
  tm?: [number, number];
  end?: number;
  air?: AirKind;
  paper?: boolean;
  ring?: [number, number];
  cue: string;
}

type Pt = [number, number];

const TONGUE_SHAPES: Record<TongueShapeId, Pt[]> = {
  rest: [[72.3, 282.6], [76.8, 275.4], [87, 266.2], [104, 260.8], [125, 261.8], [145, 271], [152.5, 291]],
  low: [[72.8, 285], [79.5, 280], [91, 274.4], [107, 271.2], [127, 272.2], [145, 280], [152, 297]],
  tipUp: [[79.8, 269.1], [86.6, 268], [95.2, 266.8], [108.5, 263.6], [126.5, 263], [145, 271.5], [152.5, 291]],
  tipGap: [[80, 272.6], [87, 270.6], [95.6, 268.4], [108.5, 264.4], [126.5, 263.2], [145, 271.5], [152.5, 291]],
  fwd: [[72.5, 272.1], [78.6, 271.6], [89.5, 266.2], [105, 262], [125.5, 262.6], [145, 271.5], [152.5, 291]],
  fwdGap: [[71.9, 275.9], [79, 273.6], [90, 267.6], [105, 262.6], [125.5, 262.8], [145, 271.5], [152.5, 291]],
  back: [[85.8, 261.6], [92.4, 264.2], [100.6, 266.6], [113, 265], [128.5, 264], [145.5, 272.2], [152.8, 291]],
  backGap: [[86, 265], [92.6, 266.6], [100.8, 267.6], [113, 265.4], [128.5, 264], [145.5, 272.2], [152.8, 291]],
  mid: [[72.5, 284.6], [77.4, 273.6], [88.6, 259.6], [101, 257.2], [121, 262.4], [141.5, 272], [149.5, 291]],
  midGap: [[72.5, 284.6], [77.4, 274.6], [88.6, 263], [101, 260], [121, 263.4], [141.5, 272], [149.5, 291]],
  dors: [[75, 287.4], [82, 281], [94, 271.4], [110.5, 262.6], [129, 257.8], [145.5, 262.6], [153.8, 288]],
  dorsGap: [[75, 287.4], [82, 281.4], [94, 272.4], [110.5, 264.6], [129, 261.8], [145.5, 266.6], [153.8, 288.6]],
  i: [[72.5, 284.6], [77.6, 275.8], [87.4, 265.2], [101, 261.2], [121, 265], [141.5, 274], [149.5, 291.6]],
  u: [[77, 288], [84.5, 283], [96.5, 273.5], [112, 265.2], [129, 261.6], [146, 267.4], [154, 289]],
  e: [[73.6, 285.6], [80, 279.6], [92, 271.4], [108.5, 265.8], [127, 265.4], [145, 272.6], [153, 292]],
};

const LIP_SHAPES: Record<LipShapeId, [number, number, number, number, number, number]> = {
  open: [0, 0, 0, 0, 0, 0],
  shut: [0, 1, 0, 0, 2.6, 0],
  round: [4.4, 0.9, 0, 4.4, 0.8, 0],
  smile: [0, -1, 1, 0, -0.7, 1],
  f: [0, -0.4, 0, -2.2, 1.9, 0],
};

const P = (t: TongueShapeId, lips: LipShapeId = 'open', jaw = 0, vel = 0): MouthPose => ({ t, lips, jaw, vel });

export const REST_POSE = P('rest');
export const CALM_POSE = P('rest', 'shut');

const V_A = [P('low', 'open', 11)];
const V_E = [P('e', 'open', 4)];
const V_I = [P('i', 'smile', 1)];
const V_RI = [P('backGap', 'open', 2)];
const V_AI = [P('low', 'open', 10), P('i', 'open', 3)];
const V_AN = [P('low', 'open', 10), P('tipUp', 'open', 0, 1)];

export const MOUTH_SOUNDS: Record<MouthSoundId, MouthSpec> = {
  b: { au: 'ba1', pose: P('rest', 'shut'), v: V_A, tm: [45, 650], air: 'small', paper: true, ring: [58.6, 279.4], cue: 'Lips closed, then open. Almost no air.' },
  p: { au: 'pa1', pose: P('rest', 'shut'), v: V_A, tm: [130, 600], air: 'puff', paper: true, ring: [58.6, 279.4], cue: 'Lips closed, then open with a puff of air.' },
  m: { au: 'ma1', pose: P('rest', 'shut', 0, 1), v: V_A, tm: [120, 605], air: 'nose', ring: [58.6, 279.4], cue: 'Lips closed. The sound goes out through your nose.' },
  f: { au: 'fa1', pose: P('rest', 'f'), v: V_A, tm: [275, 700], air: 'stream', ring: [64.4, 279.4], cue: 'Top teeth on your bottom lip. Blow.' },
  d: { au: 'da1', pose: P('tipUp'), v: V_A, tm: [45, 625], air: 'small', paper: true, ring: [79.6, 268], cue: 'Tongue tip behind the top teeth. Almost no air.' },
  t: { au: 'ta1', pose: P('tipUp'), v: V_A, tm: [140, 540], air: 'puff', paper: true, ring: [79.6, 268], cue: 'Tongue tip behind the top teeth. A puff of air.' },
  n: { au: 'na4', pose: P('tipUp', 'open', 0, 1), v: V_A, tm: [110, 385], air: 'nose', ring: [79.6, 268], cue: 'Tongue tip behind the top teeth. Sound through the nose.' },
  l: { au: 'la4', pose: P('tipUp'), v: V_A, tm: [100, 305], air: 'stream', ring: [79.6, 268], cue: 'Tongue tip behind the top teeth. Air goes around the sides.' },
  g: { au: 'ge1', pose: P('dors'), v: V_E, tm: [90, 595], air: 'small', paper: true, ring: [132, 257.4], cue: 'Back of the tongue touches the roof. Almost no air.' },
  k: { au: 'ke1', pose: P('dors'), v: V_E, tm: [180, 710], air: 'puff', paper: true, ring: [132, 257.4], cue: 'Back of the tongue touches the roof. A puff of air.' },
  h: { au: 'he1', pose: P('dorsGap'), v: V_E, tm: [160, 695], air: 'stream', ring: [132, 259], cue: 'Back of the tongue close to the roof. Breathe out.' },
  z: { au: 'zai4', pose: P('fwd'), v: V_AI, tm: [195, 525], air: 'small', paper: true, ring: [71.6, 272], cue: 'Tongue tip against the top teeth. Almost no air.' },
  c: { au: 'cai4', pose: P('fwd'), v: V_AI, tm: [340, 795], air: 'puff', paper: true, ring: [71.6, 272], cue: 'Tongue tip against the top teeth. A strong puff of air.' },
  s: { au: 'san1', pose: P('fwdGap'), v: V_AN, tm: [315, 1015], air: 'stream', ring: [71.4, 274.2], cue: 'Tongue tip close to the top teeth. Air hisses through.' },
  zh: { au: 'zhi1', pose: P('back'), v: V_RI, tm: [175, 660], air: 'small', paper: true, ring: [85.6, 260.6], cue: 'Tongue tip lifted, a little further back. Almost no air.' },
  ch: { au: 'chi1', pose: P('back'), v: V_RI, tm: [270, 695], air: 'puff', paper: true, ring: [85.6, 260.6], cue: 'Tongue tip lifted, a little further back. A puff of air.' },
  sh: { au: 'shi1', pose: P('backGap'), v: V_RI, tm: [375, 780], air: 'stream', ring: [85.6, 262.4], cue: 'Tongue tip lifted, a little further back. Air hisses through.' },
  r: { au: 'ri4', pose: P('backGap'), v: V_RI, tm: [140, 445], air: 'stream', ring: [85.6, 262.4], cue: 'Same place as sh. Add your voice.' },
  j: { au: 'ji1', pose: P('mid', 'smile'), v: V_I, tm: [220, 980], air: 'small', paper: true, ring: [90, 258.2], cue: 'Tongue tip down. The middle of the tongue touches the roof. Almost no air.' },
  q: { au: 'qi1', pose: P('mid', 'smile'), v: V_I, tm: [285, 770], air: 'puff', paper: true, ring: [90, 258.2], cue: 'Tongue tip down. The middle of the tongue touches the roof. A strong puff of air.' },
  x: { au: 'xi1', pose: P('midGap', 'smile'), v: V_I, tm: [325, 640], air: 'stream', ring: [90, 260], cue: 'Tongue tip down. The middle of the tongue is close to the roof. Smile.' },
  a: { au: 'a1', end: 575, pose: P('low', 'open', 12), cue: 'Mouth wide open. Tongue low.' },
  o: { au: 'o1', end: 950, pose: P('e', 'round', 6), cue: 'Lips round.' },
  e: { au: 'w:e', end: 545, pose: P('e', 'open', 4), cue: 'Lips relaxed. The back of the tongue lifts a little.' },
  i: { au: 'yi1', end: 965, pose: P('i', 'smile', 1), cue: 'Smile. Tongue high and forward.' },
  u: { au: 'wu1', end: 980, pose: P('u', 'round'), cue: 'Lips in a small circle. Tongue pulled back.' },
  ü: { au: 'yu1', end: 995, pose: P('i', 'round'), cue: 'Tongue as for i. Lips as for u.' },
  '-n': { au: 'an1', end: 1135, pre: P('low', 'open', 10), pose: P('tipUp', 'open', 0, 1), air: 'nose', ring: [79.6, 268], cue: 'Ends with the tongue tip up. Sound through the nose.' },
  '-ng': { au: 'ang1', end: 810, pre: P('low', 'open', 10), pose: P('dors', 'open', 0, 1), air: 'nose', ring: [132, 258.6], cue: 'Ends with the back of the tongue up. Sound through the nose.' },
};

const PIVOT: Pt = [189.6, 244.4];
const DEG = 0.6;
const BASE: Array<[number, number, number]> = [
  [148, 304, 0.85],
  [128, 305, 0.95],
  [105, 300, 1],
];

export const IN_MATRIX = 'matrix(0.6 0 0 0.6 28.8 93.2)';

/** Spots the ring can mark (outer picture coordinates), named in talk lines as `word^spot`; a sound's own name means
 *  its usual spot. */
const NAMED_SPOTS: Record<string, [number, number]> = { tipdown: [72.5, 284.6], mid: [90, 259], tipup: [86, 265], e: [126, 262], i: [88, 262] };
export function ringSpot(name: string): [number, number] | null {
  return NAMED_SPOTS[name] ?? MOUTH_SOUNDS[name as MouthSoundId]?.ring ?? null;
}

const f1 = (n: number) => n.toFixed(1);
const M = (p: Pt) => `M${f1(p[0])} ${f1(p[1])}`;
const L = (p: Pt) => `L${f1(p[0])} ${f1(p[1])}`;

function rot(pt: Pt, deg: number): Pt {
  const a = (-deg * Math.PI) / 180;
  const x = pt[0] - PIVOT[0];
  const y = pt[1] - PIVOT[1];
  return [PIVOT[0] + x * Math.cos(a) - y * Math.sin(a), PIVOT[1] + x * Math.sin(a) + y * Math.cos(a)];
}

function curve(pts: Pt[], closed = false, thin = -1, tight = 0.4): string[] {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const k = (i: number) => ((i + n) % n === thin ? tight : 1) / 6;
  const out: string[] = [];
  for (let i = 0; i < (closed ? n : n - 1); i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k1 = k(i);
    const k2 = k(i + 1);
    out.push(
      `C${f1(p1[0] + (p2[0] - p0[0]) * k1)} ${f1(p1[1] + (p2[1] - p0[1]) * k1)} ${f1(p2[0] - (p3[0] - p1[0]) * k2)} ${f1(p2[1] - (p3[1] - p1[1]) * k2)} ${f1(p2[0])} ${f1(p2[1])}`,
    );
  }
  return out;
}

function strip(c: Pt[], w: number[]): string {
  const up: Pt[] = [];
  const dn: Pt[] = [];
  c.forEach((p, i) => {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    up.push([p[0] + (dy / d) * w[i], p[1] - (dx / d) * w[i]]);
    dn.unshift([p[0] - (dy / d) * w[i], p[1] + (dx / d) * w[i]]);
  });
  const end = c[c.length - 1];
  const prev = c[c.length - 2];
  const d = Math.hypot(end[0] - prev[0], end[1] - prev[1]) || 1;
  const wl = w[w.length - 1];
  const loop: Pt[] = [...up, [end[0] + ((end[0] - prev[0]) / d) * wl, end[1] + ((end[1] - prev[1]) / d) * wl], ...dn];
  return `${M(loop[0])}${curve(loop, true).join('')}Z`;
}

function cap(a: Pt, b: Pt, k: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  return `Q${f1((a[0] + b[0]) / 2 - (dy / d) * k)} ${f1((a[1] + b[1]) / 2 + (dx / d) * k)} ${f1(a[0])} ${f1(a[1])}Z`;
}

function upperLip(f: number, d: number, s: number): Pt[] {
  return [
    [61.6, 254.6],
    [58.2 - 0.45 * f + 0.3 * s, 261.8],
    [55.6 - f + 0.9 * s, 267.4 + 0.3 * d],
    [53.6 - f + 1.6 * s, 272.6 + 0.7 * d],
    [55 - f + 1.6 * s, 277 + d - 0.3 * s],
    [59.2 - f + s, 278.8 + d - 0.5 * s],
    [63.3 - 0.85 * f + 0.5 * s, 277.5 + d - 0.3 * s],
    [65.2 - 0.35 * f, 272.4 + 0.4 * d],
    [67.5, 263.6],
  ];
}

function lowerLip(f: number, l: number, s: number): Pt[] {
  const tuck = Math.max(0, -f);
  return [
    [66.4, 290.2],
    [66.2 - 0.15 * f, 286 - 0.4 * l],
    [65.2 - 0.5 * f + 0.2 * s - 0.2 * tuck, 282.8 - l],
    [61.8 - 0.95 * f + 0.6 * s, 280.8 - l],
    [57.4 - f + 1.1 * s, 281.4 - l + 0.3 * s],
    [54.6 - f + 1.6 * s, 284.8 - 0.85 * l],
    [55.8 - 0.8 * f + s, 289.8 - 0.5 * l],
    [61.6 - 0.3 * f, 296.2 - 0.1 * l],
    [59.3, 305],
    [60.4, 315],
    [65, 326],
    [74, 331.6],
    [90, 332.4],
    [119, 332.4],
    [138, 330.2],
    [140, 321.2],
  ];
}

export const FLOOR_D = curve([[140, 321.2], [124, 323.2], [104, 322.6], [89, 318.6], [84.4, 311], [81.4, 301], [77.4, 293.8], [73.4, 290]]).join('');
export const ROOF_D = curve([
  [74.3, 267.4], [77.2, 268.5], [80.2, 267.4], [82.4, 264.6], [84.2, 261.8],
  [87.6, 259.1], [92.6, 257], [100, 255.5], [110, 255.3], [118, 256], [124.5, 257.6],
]).join('');

export function poseToVec(pose: MouthPose): number[] {
  return [...TONGUE_SHAPES[pose.t].flat(), ...LIP_SHAPES[pose.lips], pose.jaw, pose.vel];
}

export function lerpVec(a: number[], b: number[], u: number): number[] {
  const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  return a.map((x, i) => x + (b[i] - x) * e);
}

export interface MouthDrawPaths {
  tongueD: string;
  shineD: string;
  upPadD: string;
  upRimD: string;
  upperD: string;
  lowPadD: string;
  lowRimD: string;
  lowerD: string;
  jawTransform: string;
  jawSkinTransform: string;
  hyoidTransform: string;
  gapD: string;
  velD: string;
  airInOpacity: string;
  airTransform: string;
}

export function computeMouthPaths(v: number[]): MouthDrawPaths {
  const deg = v[20] * DEG;
  const top: Pt[] = [];
  for (let i = 0; i < 7; i += 1) {
    top.push([v[i * 2], v[i * 2 + 1]]);
  }
  const tip = top[0];
  const lift = Math.max(0, Math.min(1, (283 - tip[1]) / 14));
  const r = 6 + 2.5 * lift;
  const under0: Pt = [tip[0] + 1.2 * r, Math.min(tip[1] + 1.2 * r, 292)];
  const left0: Pt = [tip[0] + 0.25 * r, tip[1] + 0.8 * r];
  const mix2 = (a: Pt, b: Pt): Pt => [a[0] + (b[0] - a[0]) * lift, a[1] + (b[1] - a[1]) * lift];
  const under = mix2(under0, [tip[0] + 0.55 * r, tip[1] + 1.9 * r]);
  const left = mix2(left0, [tip[0] - 0.22 * r, tip[1] + 0.95 * r]);
  const front = mix2([89, 293.5], [(under[0] + 105) / 2 - 1.5, (under[1] + 297) / 2 + 2.5]);
  const loop: Pt[] = [
    ...top.map((p) => rot(p, deg)),
    ...BASE.map((p) => rot([p[0], p[1] - (p[2] === 1 ? 3 * lift : 0)], deg * p[2])),
    rot(front, deg),
    rot(under, deg),
    rot(left, deg),
  ];
  const sg = curve(loop, true, 0, 1);
  const tongueD = `${M(loop[0])}${sg.join('')}Z`;

  const sh = top.slice(1, 5).map((p, i) => rot([p[0] + 1.6, p[1] + 3.6 + (i === 0 ? 1.2 : 0)], deg));
  const shineD = `${M(sh[0])}${curve(sh).join('')}`;

  const up = upperLip(v[14], v[15], v[16]);
  const us = curve(up);
  const upPadD = `${M(up[0])}${us.join('')}Z`;
  const upRimD = `${M(up[0])}${us[0]}${us[1]}`;
  const upperD = `${M(up[2])}${us.slice(2, 6).join('')}${cap(up[2], up[6], 1.7)}`;

  const lo = lowerLip(v[17], v[18], v[19]);
  const ls = curve(lo);
  const lowPadD = `${M(lo[0])}${ls.join('')}${FLOOR_D}Z`;
  const lowRimD = `${M(lo[6])}${ls.slice(6, 13).join('')}`;
  const lowerD = `${M(lo[2])}${ls.slice(2, 6).join('')}${cap(lo[2], lo[6], 1.3)}`;

  const jawTransform = `rotate(${f1(-deg)} ${PIVOT[0]} ${PIVOT[1]})`;
  const jawSkinTransform = `rotate(${f1(-deg)} 268 252)`;
  const hyoidTransform = `rotate(${f1(-deg * 0.8)} ${PIVOT[0]} ${PIVOT[1]})`;

  const la = rot(lo[2], deg);
  const lb = rot(lo[1], deg);
  const gapD = `${M(up[6])}${L(up[7])}L66.8 264L70 266${L(rot([70, 290], deg))}${L(rot(lo[0], deg))}${L(lb)}${L(la)}Z`;

  const k = v[21];
  const mix = (a: Pt, b: Pt): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const velD = strip(
    [[117, 254], mix([131, 252.8], [130, 256.6]), mix([146, 253.6], [141, 263.6]), mix([159.6, 259.6], [147.6, 273.4])],
    [2.4, 4.1, 3.9, 2.5],
  );
  const airInOpacity = k > 0.6 ? '' : '0';

  const lowTop = rot(lo[3], deg);
  const airTransform = `translate(${f1(-Math.max(v[14], v[17], 0) / 0.6)} ${f1(((up[5][1] + lowTop[1]) / 2 - 93.2) / 0.6)})`;

  return {
    tongueD,
    shineD,
    upPadD,
    upRimD,
    upperD,
    lowPadD,
    lowRimD,
    lowerD,
    jawTransform,
    jawSkinTransform,
    hyoidTransform,
    gapD,
    velD,
    airInOpacity,
    airTransform,
  };
}
