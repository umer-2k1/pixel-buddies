// Buddies characters (panda, cat, bunny, penguin, axolotl) — drawn as SVG and animated procedurally.
// Poses are plain numbers tweened over time; blinking, breathing, eye-tracking
// and walking are layered on top each frame.
(function () {
  const BODY =
    'M150 108 C100 108 80 150 76 215 C72 280 96 326 150 326 C204 326 228 280 224 215 C220 150 200 108 150 108Z';
  const CAPS = { pink: '#ff8fb1', yellow: '#ffc94d', purple: '#a98bff', orange: '#ff9a5c', blue: '#5ab0ff' };
  const SHOULDER = { l: [84, 252], r: [216, 252] };
  const ARM_LEN = 40;

  // The resting pose. Every tweenable number lives here.
  const REST = {
    x: 0, y: 0, sx: 1, sy: 1, rot: 0, // whole-body transform (y = lift in px)
    lookX: 0, lookY: 0,
    eyeOpen: 1, eyeOpenR: 1, happy: 0, closed: 0, brow: 0, browLift: 0,
    mouthW: 13, curve: 0.9, open: 0,
    puff: 0, blush: 0.65,
    lArm: 14, rArm: -22, bottle: 0, capOff: 0, water: 0.7, sweat: 0, spark: 0,
    leaf: 0, feetDrop: 0, bottleShow: 1,
  };
  const POSE_KEYS = Object.keys(REST).filter((k) => !['x', 'water'].includes(k));

  const EMO = {
    neutral:   { happy: 0, closed: 0, brow: 0.05, browLift: 0, curve: 0.9, open: 0, mouthW: 13, eyeOpen: 1, eyeOpenR: 1, blush: 0.65, puff: 0, sweat: 0, spark: 0 },
    happy:     { happy: 1, closed: 0, brow: 0.5, browLift: 0.4, curve: 1.6, open: 0.55, mouthW: 21, eyeOpen: 1, eyeOpenR: 1, blush: 1, puff: 0, sweat: 0, spark: 0 },
    joy:       { happy: 1, closed: 0, brow: 0.8, browLift: 0.7, curve: 2.0, open: 1, mouthW: 24, eyeOpen: 1, eyeOpenR: 1, blush: 1, puff: 0, sweat: 0, spark: 1 },
    ask:       { happy: 0, closed: 0, brow: 0.6, browLift: 0.8, curve: 1.2, open: 0.25, mouthW: 15, eyeOpen: 1.1, eyeOpenR: 1.1, blush: 0.75, puff: 0, sweat: 0, spark: 0 },
    concern:   { happy: 0, closed: 0, brow: -1, browLift: 0.5, curve: -1.8, open: 0.1, mouthW: 11, eyeOpen: 1.15, eyeOpenR: 1.15, blush: 0.2, puff: 0, sweat: 1, spark: 0 },
    hmm:       { happy: 0, closed: 0, brow: -0.9, browLift: 0.5, curve: -0.7, open: 0, mouthW: 12, eyeOpen: 1.08, eyeOpenR: 1.08, blush: 0.45, puff: 0, sweat: 0.9, spark: 0 },
    sad:       { happy: 0, closed: 0, brow: -1, browLift: 0.2, curve: -2.1, open: 0.25, mouthW: 10, eyeOpen: 0.9, eyeOpenR: 0.9, blush: 0.1, puff: 0, sweat: 0, spark: 0 },
    surprised: { happy: 0, closed: 0, brow: 0.9, browLift: 1.2, curve: 0, open: 1, mouthW: 7, eyeOpen: 1.3, eyeOpenR: 1.3, blush: 0.6, puff: 0, sweat: 0, spark: 0 },
    sleepy:    { happy: 0, closed: 1, brow: 0, browLift: 0, curve: 0.6, open: 0, mouthW: 10, eyeOpen: 0.6, eyeOpenR: 0.6, blush: 0.4, puff: 0, sweat: 0, spark: 0 },
    sip:       { happy: 1, closed: 0, brow: 0.3, browLift: 0.1, curve: 0.5, open: 0, mouthW: 9, eyeOpen: 1, eyeOpenR: 1, blush: 0.9, puff: 0.8, sweat: 0, spark: 0 },
    cheeky:    { happy: 0, closed: 0, brow: 0.6, browLift: 0.5, curve: 1.7, open: 0.65, mouthW: 19, eyeOpen: 1, eyeOpenR: 0.1, blush: 1, puff: 0, sweat: 0, spark: 0 },
    dizzy:     { happy: 0, closed: 0, brow: -0.5, browLift: 0, curve: 0, open: 0.7, mouthW: 11, eyeOpen: 0.75, eyeOpenR: 0.75, blush: 0.5, puff: 0, sweat: 0, spark: 0 },
  };

  const EASE = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const CANCEL = { cancelled: true };

  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function furPaths() {
    const r = seeded(42);
    let light = '', dark = '';
    for (let i = 0; i < 340; i++) {
      const x = 76 + r() * 148, y = 110 + r() * 216;
      const a = Math.atan2(y - 190, x - 150) * 0.45 + Math.PI / 2 * 0.9; // fur combs down and out
      const len = 5 + r() * 5;
      const seg = `M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}`;
      if (i % 2) light += seg; else dark += seg;
    }
    return { light, dark };
  }
  const FUR = furPaths();

  const BOTTLE =
    'M-6 -41 L6 -41 L6 -35 C17 -31 16 -26 16 -19 L16 30 Q16 39 7 39 L-7 39 Q-16 39 -16 30 L-16 -19 C-16 -26 -17 -31 -6 -35Z';

  // ---- characters --------------------------------------------------------
  // Same skeleton, different art. Each skin supplies colours plus SVG for the
  // ears, tail, belly markings and facial features.
  const mirrorPath = (d) => d; // (ears are authored per side)
  const SKINS = {
    panda: {
      out: '#26263a', body: ['#ffffff', '#f4f7fc', '#cfd9ea'], bellyShade: '#9fb0cc',
      arm: ['#26263a', '#3a3a52', '#6b6b8a'], foot: ['#26263a', '#3d3d56', '#ff9db4'],
      arc: '#ffffff', cheek: '#ff8fae', earPos: [100, 132, 200, 132], earRot: [-10, 10],
      earL: (o) => `<circle cx="0" cy="-8" r="29" fill="${o}"/><circle cx="0" cy="-8" r="25" fill="#30304a"/><circle cx="1" cy="-6" r="14" fill="#ff9db4"/><ellipse cx="-8" cy="-19" rx="8" ry="4.5" fill="#fff" opacity=".18" transform="rotate(-30 -8 -19)"/>`,
      earR: (o) => `<circle cx="0" cy="-8" r="29" fill="${o}"/><circle cx="0" cy="-8" r="25" fill="#30304a"/><circle cx="-1" cy="-6" r="14" fill="#ff9db4"/><ellipse cx="8" cy="-19" rx="8" ry="4.5" fill="#fff" opacity=".18" transform="rotate(30 8 -19)"/>`,
      behind: () => '',
      deco: () => `<ellipse cx="150" cy="276" rx="56" ry="50" fill="#fff"/><path d="M92 240 q6 6 12 0 M196 240 q6 6 12 0" stroke="#c4d0e4" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      faceBack: (o) => `<ellipse cx="120" cy="204" rx="22.5" ry="29" fill="${o}" transform="rotate(20 120 204)"/><ellipse cx="180" cy="204" rx="22.5" ry="29" fill="${o}" transform="rotate(-20 180 204)"/><ellipse cx="120" cy="204" rx="19.5" ry="26" fill="#3b3b57" transform="rotate(20 120 204)"/><ellipse cx="180" cy="204" rx="19.5" ry="26" fill="#3b3b57" transform="rotate(-20 180 204)"/>`,
      faceFront: (o) => `<path d="M141 226 Q150 219 159 226 Q157 235 150 236 Q143 235 141 226Z" fill="${o}"/><ellipse cx="147" cy="225" rx="3.4" ry="1.8" fill="#fff" opacity=".65"/>`,
      sprig: true,
    },
    cat: {
      out: '#5b2f1b', body: ['#ffe2b8', '#ffb86b', '#ee8a3a'], bellyShade: '#b4581c',
      arm: ['#5b2f1b', '#f39a4c', '#ffcf9a'], foot: ['#5b2f1b', '#f39a4c', '#ffb3c4'],
      arc: '#3d1e10', cheek: '#ff8fae', earPos: [102, 140, 198, 140], earRot: [-6, 6],
      earL: (o) => `<path d="M-28 8 L-16 -46 L18 -8Z" fill="${o}" stroke="${o}" stroke-width="7" stroke-linejoin="round"/><path d="M-28 8 L-16 -46 L18 -8Z" fill="#f39a4c"/><path d="M-19 -4 L-14 -30 L5 -9Z" fill="#ff9db4"/>`,
      earR: (o) => `<path d="M28 8 L16 -46 L-18 -8Z" fill="${o}" stroke="${o}" stroke-width="7" stroke-linejoin="round"/><path d="M28 8 L16 -46 L-18 -8Z" fill="#f39a4c"/><path d="M19 -4 L14 -30 L-5 -9Z" fill="#ff9db4"/>`,
      behind: (o) => `<path d="M212 304 C266 306 280 244 252 212" stroke="${o}" stroke-width="27" stroke-linecap="round" fill="none"/><path d="M212 304 C266 306 280 244 252 212" stroke="#f39a4c" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M262 232 l-14 6 M268 252 l-16 4" stroke="#c9692a" stroke-width="5" stroke-linecap="round"/>`,
      deco: () => `<ellipse cx="150" cy="278" rx="52" ry="46" fill="#fff6e6"/><path d="M150 112 v26 M133 116 l5 22 M167 116 l-5 22" stroke="#d9712a" stroke-width="5" stroke-linecap="round"/><path d="M78 214 q16 -4 28 6 M78 238 q14 -2 24 6 M222 214 q-16 -4 -28 6 M222 238 q-14 -2 -24 6" stroke="#d9712a" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".75"/>`,
      faceBack: () => '',
      faceFront: (o) => `<path d="M141 225 Q150 219 159 225 Q155 234 150 235 Q145 234 141 225Z" fill="#ff7fa3" stroke="${o}" stroke-width="2" stroke-linejoin="round"/><path d="M98 236 L64 228 M98 246 L62 248 M202 236 L236 228 M202 246 L238 248" stroke="${o}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`,
      sprig: false,
    },
    bunny: {
      out: '#5e4575', body: ['#ffffff', '#f3ebfb', '#d2c0ea'], bellyShade: '#a48cc4',
      arm: ['#5e4575', '#f0e7f9', '#ffffff'], foot: ['#5e4575', '#f4ecfb', '#ffb3d0'],
      arc: '#3f2d55', cheek: '#ffadc9', earPos: [112, 132, 188, 132], earRot: [-9, 9],
      earL: (o) => `<ellipse cx="-4" cy="-52" rx="20" ry="54" fill="${o}"/><ellipse cx="-4" cy="-52" rx="16" ry="50" fill="#f7f1fc"/><ellipse cx="-4" cy="-50" rx="9" ry="38" fill="#ffb8d0"/>`,
      earR: (o) => `<ellipse cx="4" cy="-52" rx="20" ry="54" fill="${o}"/><ellipse cx="4" cy="-52" rx="16" ry="50" fill="#f7f1fc"/><ellipse cx="4" cy="-50" rx="9" ry="38" fill="#ffb8d0"/>`,
      behind: (o) => `<circle cx="226" cy="306" r="19" fill="${o}"/><circle cx="226" cy="306" r="15.5" fill="#fff"/><circle cx="221" cy="301" r="5" fill="#f1e9fa"/>`,
      deco: () => `<ellipse cx="150" cy="278" rx="52" ry="46" fill="#fff"/><path d="M118 124 q8 -6 16 0 M166 124 q8 -6 16 0" stroke="#e6daf4" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      faceBack: () => '',
      faceFront: (o) => `<path d="M142 224 Q150 218 158 224 Q154 232 150 233 Q146 232 142 224Z" fill="#ff7fa3" stroke="${o}" stroke-width="1.8" stroke-linejoin="round"/>`,
      sprig: false,
    },
    penguin: {
      out: '#15233f', body: ['#5b84bd', '#34568a', '#1d3159'], bellyShade: '#9db6dc',
      arm: ['#15233f', '#34568a', '#7ea2d6'], foot: ['#15233f', '#ffa63d', '#ffcb7a'],
      arc: '#15233f', cheek: '#ff9db4', earPos: [100, 132, 200, 132], earRot: [-10, 10],
      earL: () => '', earR: () => '',
      behind: () => '',
      deco: () => `<path d="M150 150 C108 150 86 196 86 246 C86 296 112 324 150 324 C188 324 214 296 214 246 C214 196 192 150 150 150Z" fill="#fff"/><ellipse cx="122" cy="205" rx="34" ry="36" fill="#fff"/><ellipse cx="178" cy="205" rx="34" ry="36" fill="#fff"/>`,
      faceBack: () => '',
      faceFront: (o) => `<path d="M138 221 Q150 212 162 221 Q158 234 150 235 Q142 234 138 221Z" fill="#ffa63d" stroke="${o}" stroke-width="2.2" stroke-linejoin="round"/><path d="M143 222 Q150 218 157 222" stroke="#ffd18a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      sprig: false, tuft: true,
    },
    axolotl: {
      out: '#8a3b5c', body: ['#fff0f6', '#ffc9de', '#ff9dc0'], bellyShade: '#e0679a',
      arm: ['#8a3b5c', '#ffb0cb', '#ffe3ee'], foot: ['#8a3b5c', '#ffb0cb', '#ff8fb5'],
      arc: '#5c1f3d', cheek: '#ff6f9c', earPos: [92, 176, 208, 176], earRot: [-4, 4],
      earL: (o) => [[-24, -22, 22, -40], [-30, -2, 24, -6], [-26, 18, 22, 26]].map(([x, y, rx, r]) =>
        `<ellipse cx="${x}" cy="${y}" rx="${rx + 3}" ry="11" fill="${o}" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="8" fill="#ee5a90" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x - rx * 0.55}" cy="${y}" rx="${rx * 0.45}" ry="5" fill="#ffa9c6" transform="rotate(${r} ${x} ${y})"/>`).join(''),
      earR: (o) => [[24, -22, 22, 40], [30, -2, 24, 6], [26, 18, 22, -26]].map(([x, y, rx, r]) =>
        `<ellipse cx="${x}" cy="${y}" rx="${rx + 3}" ry="11" fill="${o}" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="8" fill="#ee5a90" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x + rx * 0.55}" cy="${y}" rx="${rx * 0.45}" ry="5" fill="#ffa9c6" transform="rotate(${r} ${x} ${y})"/>`).join(''),
      behind: (o) => `<path d="M214 306 C268 312 282 262 262 236" stroke="${o}" stroke-width="30" stroke-linecap="round" fill="none"/><path d="M214 306 C268 312 282 262 262 236" stroke="#ffb0cb" stroke-width="23" stroke-linecap="round" fill="none"/>`,
      deco: () => `<ellipse cx="150" cy="280" rx="54" ry="46" fill="#fff6fa"/><g fill="#ff8fb5" opacity=".75"><circle cx="104" cy="168" r="3"/><circle cx="116" cy="154" r="2.4"/><circle cx="196" cy="168" r="3"/><circle cx="184" cy="154" r="2.4"/><circle cx="150" cy="140" r="2.6"/><circle cx="96" cy="270" r="3"/><circle cx="206" cy="270" r="3"/></g>`,
      faceBack: () => '',
      faceFront: () => `<circle cx="146" cy="226" r="1.8" fill="#b34a78"/><circle cx="154" cy="226" r="1.8" fill="#b34a78"/>`,
      sprig: false,
    },
  };
  const OUT = '#26263a'; // (default outline; skins override)

  function markup(id, cap, skinId) {
    const K = SKINS[skinId] || SKINS.panda;
    const O = K.out;
    const u = (n) => `${id}-${n}`;
    const arm = (side) => `
   <path d="M0 0 L0 ${ARM_LEN}" stroke="${K.arm[0]}" stroke-width="32" stroke-linecap="round"/>
   <path d="M0 0 L0 ${ARM_LEN}" stroke="${K.arm[1]}" stroke-width="25" stroke-linecap="round"/>
   <path d="M${side * 5} 3 L${side * 5} ${ARM_LEN - 6}" stroke="${K.arm[2]}" stroke-width="3.2" stroke-linecap="round" opacity=".7"/>`;
    const foot = (cx, side) => `<g data-id="foot${side}"><ellipse cx="${cx}" cy="322" rx="27" ry="15" fill="${K.foot[0]}"/><ellipse cx="${cx - 2 * (side === 'L' ? 1 : -1)}" cy="318" rx="19" ry="8" fill="${K.foot[1]}"/>${K.foot[2] ? `<ellipse cx="${cx}" cy="324" rx="10" ry="5.5" fill="${K.foot[2]}"/>` : ''}</g>`;
    const sprig = K.sprig
      ? `<path d="M150 112 C150 102 150 98 150 94" stroke="#2f9d5c" stroke-width="4" stroke-linecap="round" fill="none"/>
   <path d="M150 96 C140 86 126 86 118 92 C128 102 142 102 150 96Z" fill="url(#${u('leaf')})" stroke="#2a8a53" stroke-width="2" stroke-linejoin="round"/>
   <path d="M150 96 C160 82 176 80 186 86 C176 100 160 102 150 96Z" fill="url(#${u('leaf')})" stroke="#2a8a53" stroke-width="2" stroke-linejoin="round"/>`
      : K.tuft
        ? `<path d="M150 112 C146 98 140 92 134 90 M150 112 C150 96 152 88 158 84 M150 112 C156 100 164 96 172 96" stroke="${O}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M150 112 C146 98 140 92 134 90 M150 112 C150 96 152 88 158 84 M150 112 C156 100 164 96 172 96" stroke="#34568a" stroke-width="3.4" stroke-linecap="round" fill="none"/>`
        : '';
    return `
<svg class="sprig" viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;pointer-events:none">
 <defs>
  <radialGradient id="${u('body')}" cx="40%" cy="26%" r="85%">
   <stop offset="0" stop-color="${K.body[0]}"/><stop offset=".55" stop-color="${K.body[1]}"/><stop offset="1" stop-color="${K.body[2]}"/>
  </radialGradient>
  <radialGradient id="${u('shadow')}"><stop offset="0" stop-color="#1b2a4a" stop-opacity=".32"/><stop offset="1" stop-color="#1b2a4a" stop-opacity="0"/></radialGradient>
  <linearGradient id="${u('leaf')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9df0a8"/><stop offset="1" stop-color="#39b96a"/></linearGradient>
  <linearGradient id="${u('glass')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8f6ff"/><stop offset=".5" stop-color="#cfe9fb"/><stop offset="1" stop-color="#b9dcf5"/></linearGradient>
  <linearGradient id="${u('water')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd0ff"/><stop offset="1" stop-color="#2f8fe8"/></linearGradient>
  <clipPath id="${u('cbody')}"><path d="${BODY}"/></clipPath>
  <clipPath id="${u('cbottle')}"><path d="${BOTTLE}"/></clipPath>
  <clipPath id="${u('cmouth')}"><path data-id="mouthClip"/></clipPath>
 </defs>

 <ellipse data-id="shadow" cx="150" cy="332" rx="86" ry="14" fill="url(#${u('shadow')})"/>

 <g data-id="char">
  ${K.behind(O)}
  ${foot(116, 'L')}${foot(184, 'R')}

  <g data-id="stem"></g>
  <g data-id="leafL">${K.earL(O)}</g>
  <g data-id="leafR">${K.earR(O)}</g>
  <g data-id="sprig">${sprig}</g>

  <path d="${BODY}" fill="${O}" stroke="${O}" stroke-width="7" stroke-linejoin="round"/>
  <path d="${BODY}" fill="url(#${u('body')})"/>
  <g clip-path="url(#${u('cbody')})">
   ${K.deco()}
   <path d="M70 262 C100 332 200 332 230 262 L230 340 L70 340Z" fill="${K.bellyShade}" opacity=".22"/>
   <path d="M60 170 C70 120 110 108 140 110" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".55"/>
  </g>

  <g data-id="face">
   ${K.faceBack(O)}
   <ellipse data-id="cheekL" cx="94" cy="242" rx="17" ry="11" fill="${K.cheek}"/>
   <ellipse data-id="cheekR" cx="206" cy="242" rx="17" ry="11" fill="${K.cheek}"/>
   <g data-id="eyeL"><g data-id="eyeLs">
     <g data-id="eyeLo"><ellipse rx="13.5" ry="17.5" fill="#0a0912"/><circle cx="-4.5" cy="-7" r="5.6" fill="#fff"/><circle cx="5" cy="6.5" r="2.8" fill="#fff" opacity=".95"/><circle cx="6" cy="-9" r="1.6" fill="#fff" opacity=".8"/></g>
     <path data-id="eyeLh" d="M-14 6 Q0 -17 14 6" stroke="${K.arc}" stroke-width="5.2" fill="none" stroke-linecap="round"/>
     <path data-id="eyeLc" d="M-13 -1 Q0 12 13 -1" stroke="${K.arc}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
   </g></g>
   <g data-id="eyeR"><g data-id="eyeRs">
     <g data-id="eyeRo"><ellipse rx="13.5" ry="17.5" fill="#0a0912"/><circle cx="-4.5" cy="-7" r="5.6" fill="#fff"/><circle cx="5" cy="6.5" r="2.8" fill="#fff" opacity=".95"/><circle cx="6" cy="-9" r="1.6" fill="#fff" opacity=".8"/></g>
     <path data-id="eyeRh" d="M-14 6 Q0 -17 14 6" stroke="${K.arc}" stroke-width="5.2" fill="none" stroke-linecap="round"/>
     <path data-id="eyeRc" d="M-13 -1 Q0 12 13 -1" stroke="${K.arc}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
   </g></g>
   <path data-id="browL" d="M-11 0 L11 0" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
   <path data-id="browR" d="M-11 0 L11 0" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
   ${K.faceFront(O)}
   <path data-id="mouthFill" fill="#5a1f33"/>
   <ellipse data-id="tongue" rx="10" ry="6" fill="#ff7f9e" clip-path="url(#${u('cmouth')})"/>
   <path data-id="mouth" fill="none" stroke="${O}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g data-id="sweat"><path d="M214 168 C222 180 226 186 226 192 A12 12 0 0 1 202 192 C202 186 206 180 214 168Z" fill="#7fd0ff" stroke="#3a98f2" stroke-width="2.2"/><ellipse cx="209" cy="193" rx="3" ry="5" fill="#fff" opacity=".8"/></g>
  <g data-id="sparkL"><path d="M0 -13 Q2 -2 13 0 Q2 2 0 13 Q-2 2 -13 0 Q-2 -2 0 -13Z" fill="#ffd54a" stroke="#f5a623" stroke-width="1.6"/></g>
  <g data-id="sparkR"><path d="M0 -13 Q2 -2 13 0 Q2 2 0 13 Q-2 2 -13 0 Q-2 -2 0 -13Z" fill="#ffd54a" stroke="#f5a623" stroke-width="1.6"/></g>

  <g data-id="armL">${arm(-1)}</g>
  <g data-id="armR">${arm(1)}</g>
  <g data-id="bottle">
   <g transform="scale(1.14) translate(0 8)">
    <g data-id="cap">
     <rect x="-3.5" y="-55" width="7" height="6" rx="2" fill="${cap}" stroke="${O}" stroke-width="1.6"/>
     <rect x="-9" y="-50" width="18" height="11" rx="4" fill="${cap}" data-id="capFill" stroke="${O}" stroke-width="2.2"/>
     <rect x="-6" y="-48" width="12" height="3.4" rx="1.7" fill="#fff" opacity=".4"/>
    </g>
    <path d="${BOTTLE}" fill="url(#${u('glass')})" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <g clip-path="url(#${u('cbottle')})"><g data-id="waterRot"><g data-id="water">
      <path d="M-50 0 Q-40 -4 -30 0 T-10 0 T10 0 T30 0 T50 0 V90 H-50Z" fill="url(#${u('water')})"/>
      <path d="M-50 0 Q-40 -4 -30 0 T-10 0 T10 0 T30 0 T50 0" stroke="#d6f0ff" stroke-width="2.4" fill="none"/>
      <circle cx="-6" cy="14" r="2.2" fill="#fff" opacity=".6"/><circle cx="7" cy="24" r="1.6" fill="#fff" opacity=".5"/>
    </g></g></g>
    <path d="M-16 8 H16 V24 H-16Z" fill="#fff" opacity=".9" clip-path="url(#${u('cbottle')})"/>
    <path d="M0 10 C5 16 7 19 7 21.5 A7 7 0 0 1 -7 21.5 C-7 19 -5 16 0 10Z" fill="#3a98f2"/>
    <path d="M-10 -26 L-10 -4" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".8"/>
    <path d="${BOTTLE}" fill="none" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
    <g transform="translate(0 -8)">
     <rect x="-20" y="-11" width="40" height="22" rx="11" fill="${K.arm[0]}"/>
     <rect x="-17.5" y="-9" width="35" height="18" rx="9" fill="${K.arm[1]}"/>
     <path d="M-6 -7 V7 M6 -7 V7" stroke="${K.arm[0]}" stroke-width="2.4" stroke-linecap="round"/>
     <ellipse cx="-12" cy="-5" rx="5" ry="3" fill="${K.arm[2]}" opacity=".6"/>
    </g>
   </g>
  </g>
  <g data-id="mittR"></g>

  <path class="hit" d="${BODY}" fill="#000" fill-opacity="0" style="pointer-events:all;cursor:grab"/>
 </g>
</svg>`;
  }

  class Mascot {
    constructor(host, opts = {}) {
      Mascot.count = (Mascot.count || 0) + 1;
      this.host = host;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      this.uid = 'sp' + Mascot.count;
      this.skinId = SKINS[opts.skin] ? opts.skin : 'panda';
      this.capColor = CAPS[opts.bottleColor] || CAPS.pink;
      this._build();
      this.v = { ...REST };
      this.tw = [];
      this.tok = 0;
      this.walking = false;
      this.walkAmt = 0;
      this.phase = 0;
      this.lastStep = 0;
      this.facing = 1;
      this.hot = false;
      this.tickers = [];
      this.onStep = null;
      this.autoLook = true;
      this.pointer = null; // {x,y} in -1..1 when the cursor is near
      this.lookAuto = { x: 0, y: 0, tx: 0, ty: 0, next: 0 };
      this.lookSm = { x: 0, y: 0 };
      this.blinkS = { next: performance.now() + 1500, t0: -1, dbl: false };
      this.lastT = performance.now();
      this.lastDraw = 0;
      this.stopped = false;
      this.capName = opts.bottleColor || 'pink';
      this._render(0, 0);
      this._raf = (t) => this._frame(t);
      requestAnimationFrame(this._raf);
    }

    // (Re)builds the SVG for the current skin; pose state is untouched.
    _build() {
      this.sk = SKINS[this.skinId];
      this.host.innerHTML = markup(this.uid, this.capColor, this.skinId);
      this.svg = this.host.querySelector('svg');
      this.$ = {};
      this.svg.querySelectorAll('[data-id]').forEach((e) => (this.$[e.dataset.id] = e));
      this.hit = this.svg.querySelector('.hit');
    }
    setSkin(id) {
      if (!SKINS[id] || id === this.skinId) return;
      this.skinId = id;
      const flip = this.svg ? this.svg.style.transform : '';
      this._build();
      this.svg.style.transform = flip;
      this.setBottleColor(this.capName);
    }

    destroy() { this.stopped = true; }
    setBottleColor(name) { this.capName = name; this.capColor = CAPS[name] || CAPS.pink; if (this.$.capFill) this.$.capFill.setAttribute('fill', this.capColor); }
    addTicker(fn) { this.tickers.push(fn); }

    // ---- tweening ---------------------------------------------------------
    tween(props, ms = 300, ease = 'inOut') {
      return new Promise((resolve) => {
        const keys = Object.keys(props);
        const now = performance.now();
        if (ms <= 0) { keys.forEach((k) => (this.v[k] = props[k])); return resolve(); }
        const group = { pending: keys.length, resolve };
        const fn = EASE[ease] || EASE.inOut;
        keys.forEach((k) => {
          const old = this.tw.find((t) => t.k === k);
          if (old) { this.tw.splice(this.tw.indexOf(old), 1); this._done(old.group); }
          this.tw.push({ k, from: this.v[k], to: props[k], t0: now, ms, fn, group });
        });
      });
    }
    _done(group) { if (--group.pending <= 0) group.resolve(); }

    set(props) { Object.assign(this.v, props); }
    emotion(name, ms = 260) { return this.tween(EMO[name] || EMO.neutral, ms); }

    // Starts a cancellable behaviour. Any await on the ctx throws CANCEL if a
    // newer behaviour has taken over, which unwinds the old one cleanly.
    run(fn, { reset = true } = {}) {
      const id = ++this.tok;
      const m = this;
      this.autoLook = true; // a cancelled behaviour must never leave the eyes frozen
      const chk = () => { if (m.tok !== id) throw CANCEL; };
      // Fire-and-forget calls (not awaited) must not surface a CANCEL as an
      // unhandled rejection, so each promise gets a no-op catch attached.
      const safe = (p) => { p.catch(() => {}); return p; };
      const c = {
        get dead() { return m.tok !== id; },
        to: (p, ms, ease) => safe(m.tween(p, ms, ease).then(chk)),
        wait: (ms) => safe(sleep(ms).then(chk)),
        emo: (n, ms) => safe(m.emotion(n, ms).then(chk)),
        check: chk,
      };
      if (reset) {
        const rest = {};
        POSE_KEYS.forEach((k) => (rest[k] = REST[k]));
        Object.assign(rest, EMO.neutral);
        this.tween(rest, 240);
      }
      return Promise.resolve()
        .then(() => fn(c))
        .catch((e) => { if (e !== CANCEL) console.error(e); });
    }
    cancel() { this.tok++; }

    // ---- gestures (all take a ctx from run()) -----------------------------
    async hop(c, h = 34, ms = 420) {
      await c.to({ sy: 0.84, sx: 1.12 }, 110, 'out');
      window.Sound && Sound.play('hop');
      c.to({ y: h, sy: 1.1, sx: 0.93 }, ms * 0.45, 'out');
      await c.wait(ms * 0.45);
      await c.to({ y: 0, sy: 1, sx: 1 }, ms * 0.45, 'in');
      window.Sound && Sound.play('land');
      await c.to({ sy: 0.88, sx: 1.1 }, 70, 'out');
      await c.to({ sy: 1, sx: 1 }, 160, 'back');
    }
    async wave(c, n = 3) {
      await c.to({ lArm: 150 }, 280, 'back');
      for (let i = 0; i < n; i++) {
        await c.to({ lArm: 128, rot: -2 }, 170);
        await c.to({ lArm: 160, rot: 2 }, 170);
      }
      await c.to({ lArm: REST.lArm, rot: 0 }, 260);
    }
    async cheer(c, n = 3) {
      for (let i = 0; i < n; i++) {
        c.to({ lArm: 165, rArm: 165, bottle: 14 }, 160, 'out');
        await this.hop(c, 38, 380);
        c.to({ lArm: 135, rArm: 140 }, 120);
      }
      await c.to({ lArm: REST.lArm, rArm: REST.rArm, bottle: REST.bottle }, 260);
    }
    async nod(c, n = 2) {
      for (let i = 0; i < n; i++) { await c.to({ sy: 0.94, lookY: 0.6 }, 130); await c.to({ sy: 1, lookY: 0 }, 130); }
    }
    async shake(c, n = 3) {
      for (let i = 0; i < n; i++) { await c.to({ rot: -5, lookX: -0.7 }, 130); await c.to({ rot: 5, lookX: 0.7 }, 130); }
      await c.to({ rot: 0, lookX: 0 }, 140);
    }
    async sip(c, { gulps = 2, amount = 0.1 } = {}) {
      c.to({ lArm: 28 }, 360);
      await c.to({ rArm: -148, bottle: -123, lookY: -0.15 }, 460, 'back');
      window.Sound && Sound.play('splash');
      c.to({ capOff: 1 }, 160);
      await c.emo('sip', 220);
      for (let i = 0; i < gulps; i++) {
        c.to({ bottle: -133, rArm: -152, water: Math.max(0.05, this.v.water - amount / gulps) }, 260);
        await c.wait(200);
        window.Sound && Sound.play('glug');
        c.to({ puff: 1, sy: 1.04 }, 100);
        await c.wait(110);
        await c.to({ puff: 0.5, sy: 1, bottle: -123, rArm: -148 }, 160);
        await c.wait(120);
      }
      await c.to({ capOff: 0 }, 120);
    }
    // Hold the bottle out toward the user with a little encouraging jiggle.
    async offer(c, n = 3) {
      await c.to({ rArm: 70, bottle: 14, lookY: 0 }, 360, 'back');
      for (let i = 0; i < n; i++) {
        await c.to({ bottle: 30, rArm: 78 }, 190);
        await c.to({ bottle: 6, rArm: 62 }, 190);
      }
    }

    // ---- effects ----------------------------------------------------------
    // x,y in viewBox units (300x360)
    emote(text, { x = 150, y = 100, dx = 0, dy = -70, ms = 1400, size = 26, spin = 0 } = {}) {
      const el = document.createElement('div');
      el.textContent = text;
      Object.assign(el.style, {
        position: 'absolute', left: `${(x / 300) * 100}%`, top: `${(y / 360) * 100}%`,
        fontSize: `${size}px`, pointerEvents: 'none', transform: 'translate(-50%,-50%)',
        zIndex: 5, willChange: 'transform,opacity', textShadow: '0 2px 6px rgba(0,0,0,.12)',
      });
      this.host.appendChild(el);
      const a = el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.5}px)) scale(1.1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.25 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9) rotate(${spin}deg)`, opacity: 0 },
        ],
        { duration: ms, easing: 'ease-out' }
      );
      a.onfinish = () => el.remove();
    }
    burst(list = ['✨', '💧', '💙', '⭐'], n = 8) {
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random();
        const r = 60 + Math.random() * 60;
        setTimeout(() => this.emote(list[i % list.length], {
          x: 150 + Math.cos(ang) * 40, y: 170 + Math.sin(ang) * 40,
          dx: Math.cos(ang) * r, dy: Math.sin(ang) * r - 20, ms: 1000 + Math.random() * 500,
          size: 18 + Math.random() * 14, spin: (Math.random() - 0.5) * 120,
        }), i * 40);
      }
    }

    // ---- frame loop -------------------------------------------------------
    setWalking(on) { this.walking = on; if (!on) this.phase = 0; }
    setFacing(d) { this.facing = d; }

    _frame(now) {
      if (this.stopped) return;
      requestAnimationFrame(this._raf);
      const active = this.tw.length > 0 || this.walking || this.hot || this.walkAmt > 0.01;
      if (!active && now - this.lastDraw < 33) return;
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      this.lastDraw = now;
      for (const fn of this.tickers) fn(dt, now);
      // tweens
      for (let i = this.tw.length - 1; i >= 0; i--) {
        const t = this.tw[i];
        const p = clamp((now - t.t0) / t.ms, 0, 1);
        this.v[t.k] = t.from + (t.to - t.from) * t.fn(p);
        if (p >= 1) { this.v[t.k] = t.to; this.tw.splice(i, 1); this._done(t.group); }
      }
      this._render(now / 1000, dt, now);
    }

    _render(t, dt, nowMs = performance.now()) {
      const v = this.v, $ = this.$;
      // walking gait
      this.walkAmt += ((this.walking ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 10);
      if (this.walking) {
        this.phase += dt * Math.PI * 2 * 1.6;
        const st = Math.floor(this.phase / Math.PI);
        if (st !== this.lastStep) { this.lastStep = st; this.onStep && this.onStep(); }
      }
      const wa = this.walkAmt;
      const s = Math.sin(this.phase);
      const bob = Math.abs(s) * 8 * wa;
      const sway = s * 3.2 * wa;

      // body transform (pivot at the feet)
      const breath = Math.sin(t * 2.1) * 0.014;
      const lift = v.y + bob;
      $.char.setAttribute(
        'transform',
        `translate(150 ${324 - lift}) rotate(${v.rot + sway}) scale(${(v.sx * (1 - breath * 0.6)).toFixed(4)} ${(v.sy * (1 + breath)).toFixed(4)}) translate(-150 -324)`
      );
      const sh = clamp(1 - lift / 260, 0.4, 1);
      $.shadow.setAttribute('transform', `translate(150 330) scale(${sh.toFixed(3)} ${sh.toFixed(3)}) translate(-150 -330)`);
      $.shadow.setAttribute('opacity', sh.toFixed(2));

      // feet
      const fl = Math.max(0, s) * 9 * wa + v.feetDrop;
      const fr = Math.max(0, -s) * 9 * wa + v.feetDrop;
      $.footL.setAttribute('transform', `translate(0 ${(-fl + v.feetDrop * 0).toFixed(2)})`);
      $.footR.setAttribute('transform', `translate(0 ${(-fr).toFixed(2)})`);

      // look: pointer if present, otherwise gentle wandering
      const la = this.lookAuto;
      if (nowMs > la.next) {
        la.tx = (Math.random() * 2 - 1) * 0.9;
        la.ty = (Math.random() * 2 - 1) * 0.5;
        la.next = nowMs + 1400 + Math.random() * 3200;
      }
      let tx = 0, ty = 0;
      if (this.pointer) { tx = this.pointer.x; ty = this.pointer.y; }
      else if (this.autoLook) { tx = la.tx; ty = la.ty; }
      const k = Math.min(1, dt * 7);
      this.lookSm.x += (tx - this.lookSm.x) * k;
      this.lookSm.y += (ty - this.lookSm.y) * k;
      const lx = clamp(this.lookSm.x + v.lookX, -1.2, 1.2);
      const ly = clamp(this.lookSm.y + v.lookY, -1.2, 1.2);

      // blink
      let blink = 1;
      const b = this.blinkS;
      if (b.t0 < 0 && nowMs > b.next) { b.t0 = nowMs; b.dbl = Math.random() < 0.18; }
      if (b.t0 >= 0) {
        const p = (nowMs - b.t0) / 150;
        if (p >= 1) {
          b.t0 = -1;
          b.next = nowMs + (b.dbl ? 120 : 1800 + Math.random() * 3600);
          b.dbl = false;
        } else blink = 1 - Math.sin(p * Math.PI);
      }

      // face
      $.face.setAttribute('transform', `translate(${(lx * 3.2).toFixed(2)} ${(ly * 2.4).toFixed(2)})`);
      const eyeY = 204;
      const eyes = [
        { id: 'L', cx: 121, open: v.eyeOpen, sideSign: 1 },
        { id: 'R', cx: 179, open: v.eyeOpenR, sideSign: -1 },
      ];
      for (const e of eyes) {
        const o = clamp(e.open * blink, 0.06, 1.35);
        $['eye' + e.id].setAttribute('transform', `translate(${e.cx} ${eyeY})`);
        $['eye' + e.id + 's'].setAttribute('transform', `scale(${(1 + (e.open - 1) * 0.25).toFixed(3)} ${o.toFixed(3)})`);
        $['eye' + e.id + 'o'].setAttribute('transform', `translate(${(lx * 3.4).toFixed(2)} ${(ly * 2.8).toFixed(2)})`);
        const happy = clamp(v.happy, 0, 1);
        const closed = clamp(v.closed, 0, 1) * (1 - happy);
        $['eye' + e.id + 'o'].setAttribute('opacity', ((1 - happy) * (1 - closed)).toFixed(2));
        $['eye' + e.id + 'h'].setAttribute('opacity', (happy * (e.open < 0.3 ? 0 : 1)).toFixed(2));
        $['eye' + e.id + 'c'].setAttribute('opacity', closed.toFixed(2));
      }
      // brows
      // worried: inner ends up; happy/curious: lifted and nearly flat (never angry)
      const browRot = v.brow < 0 ? v.brow * 26 : -v.brow * 5;
      const bo = clamp((Math.max(Math.abs(v.brow), v.browLift) - 0.12) * 3, 0, 1);
      const by = eyeY - 34 - v.browLift * 8;
      $.browL.setAttribute('transform', `translate(121 ${by}) rotate(${browRot.toFixed(1)})`);
      $.browR.setAttribute('transform', `translate(179 ${by}) rotate(${(-browRot).toFixed(1)})`);
      $.browL.setAttribute('opacity', bo.toFixed(2));
      $.browR.setAttribute('opacity', bo.toFixed(2));
      // cheeks
      const pf = 1 + v.puff * 0.38;
      $.cheekL.setAttribute('transform', `translate(92 240) scale(${pf.toFixed(3)}) translate(-92 -240)`);
      $.cheekR.setAttribute('transform', `translate(208 240) scale(${pf.toFixed(3)}) translate(-208 -240)`);
      $.cheekL.setAttribute('opacity', clamp(v.blush + v.puff * 0.3, 0, 1).toFixed(2));
      $.cheekR.setAttribute('opacity', clamp(v.blush + v.puff * 0.3, 0, 1).toFixed(2));
      // mouth
      const mx = 150 + lx * 3.2 * 0, my = 240;
      const w = v.mouthW, c1 = v.curve * 7, c2 = c1 + Math.max(0, v.open) * 26;
      const top = `M${mx - w} ${my} Q${mx} ${my + c1 * 2} ${mx + w} ${my}`;
      $.mouth.setAttribute('d', top);
      if (v.open > 0.06) {
        const d = `M${mx - w} ${my} Q${mx} ${my + c1 * 2} ${mx + w} ${my} Q${mx} ${my + c2 * 2} ${mx - w} ${my}Z`;
        $.mouthFill.setAttribute('d', d);
        $.mouthClip.setAttribute('d', d);
        $.mouthFill.setAttribute('opacity', clamp(v.open * 4, 0, 1).toFixed(2));
        $.tongue.setAttribute('transform', `translate(${mx} ${my + c2 * 0.5 + c1 * 0.5 + 4})`);
        $.tongue.setAttribute('opacity', clamp(v.open * 3, 0, 1).toFixed(2));
      } else {
        $.mouthFill.setAttribute('opacity', 0);
        $.tongue.setAttribute('opacity', 0);
      }

      // sprout
      const sw = Math.sin(t * 1.7) * 2.5 + v.leaf;
      const E = this.sk;
      $.leafL.setAttribute('transform', `translate(${E.earPos[0]} ${E.earPos[1]}) rotate(${(E.earRot[0] + sw * 0.7).toFixed(1)})`);
      $.leafR.setAttribute('transform', `translate(${E.earPos[2]} ${E.earPos[3]}) rotate(${(E.earRot[1] - sw * 0.7).toFixed(1)})`);

      // sprig sways with the ears
      $.sprig.setAttribute('transform', `rotate(${(Math.sin(t * 1.7) * 3 + v.leaf).toFixed(1)} 150 112)`);
      // emotion accents
      const sw2 = clamp(v.sweat, 0, 1);
      $.sweat.setAttribute('opacity', sw2.toFixed(2));
      $.sweat.setAttribute('transform', `translate(${(lx * 3.2).toFixed(1)} ${(Math.sin(t * 3) * 2 + sw2 * 4).toFixed(1)})`);
      const sp = clamp(v.spark, 0, 1), pulse = 0.85 + Math.sin(t * 6) * 0.18;
      $.sparkL.setAttribute('opacity', sp.toFixed(2));
      $.sparkR.setAttribute('opacity', sp.toFixed(2));
      $.sparkL.setAttribute('transform', `translate(74 176) scale(${(sp * pulse * 1.15).toFixed(3)}) rotate(${(Math.sin(t * 2) * 12).toFixed(0)})`);
      $.sparkR.setAttribute('transform', `translate(226 168) scale(${(sp * (1.8 - pulse) * 0.95).toFixed(3)}) rotate(${(-Math.sin(t * 2) * 12).toFixed(0)})`);
      // arms
      const swing = s * 16 * wa;
      const la_ = v.lArm + swing;
      const ra_ = v.rArm - swing;
      const idle = Math.sin(t * 1.9) * 1.6;
      const [lsx, lsy] = SHOULDER.l, [rsx, rsy] = SHOULDER.r;
      $.armL.setAttribute('transform', `translate(${lsx} ${lsy}) rotate(${(la_ + idle).toFixed(1)})`);
      $.armR.setAttribute('transform', `translate(${rsx} ${rsy}) rotate(${(-(ra_ - idle)).toFixed(1)})`);
      const ar = ((ra_ - idle) * Math.PI) / 180;
      const hx = rsx + ARM_LEN * Math.sin(ar), hy = rsy + ARM_LEN * Math.cos(ar);
      const bt = v.bottle + Math.sin(t * 1.9 + 1) * 1.2;
      $.bottle.setAttribute('transform', `translate(${hx.toFixed(1)} ${(hy - 6).toFixed(1)}) rotate(${bt.toFixed(1)})`);
      $.bottle.setAttribute('opacity', v.bottleShow.toFixed(2));
      $.mittR.setAttribute('transform', `translate(${hx.toFixed(1)} ${(hy + 2).toFixed(1)})`);
      // cap pops off while drinking
      $.cap.setAttribute('transform', `translate(${v.capOff * 16} ${-v.capOff * 18}) rotate(${v.capOff * 50})`);
      $.cap.setAttribute('opacity', (1 - v.capOff * 0.9).toFixed(2));
      // water: flat surface in world space, sloshing a little
      const wy = 39 - v.water * 70;
      $.waterRot.setAttribute('transform', `rotate(${(-bt).toFixed(1)})`);
      $.water.setAttribute('transform', `translate(${(Math.sin(t * 2.4) * 6).toFixed(1)} ${wy.toFixed(1)})`);
    }
  }

  Mascot.CAPS = CAPS;
  Mascot.SKINS = Object.keys(SKINS);
  Mascot.EMO = EMO;
  Mascot.REST = REST;
  window.Mascot = Mascot;
})();
