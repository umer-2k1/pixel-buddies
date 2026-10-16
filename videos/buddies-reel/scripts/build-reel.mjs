// Buddies — Instagram Reel (1080x1920, 9:16, 30s). Story: "The long stretch".
// A long workday, a full bottle that never moves, a gentle nudge, one sip.
// Generates index.html from the real in-app artwork.
import fs from 'fs';

const CH = JSON.parse(fs.readFileSync('scripts/chars.json', 'utf8'));
let uid = 0;
const char = (key, width, id, extra = '') => {
  const svg = CH[key].replace(/(sp\d+)-/g, `$1p${++uid}-`).replace('<svg ', '<svg width="100%" height="100%" ');
  return `<div class="char" id="${id}" style="width:${width}px;height:${Math.round(width * 1.2)}px;${extra}">${svg}</div>`;
};

let seed = 4242;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const COLORS = ['#5cc3ff', '#ff8fb1', '#ffd45c', '#8de6b8', '#b69bff', '#ff9a5c', '#ffffff'];
const confetti = (n) => Array.from({ length: n }, () => ({
  a: -Math.PI / 2 + (rnd() - 0.5) * 2.8, v: 300 + rnd() * 520, r: (rnd() - 0.5) * 900,
  w: 12 + rnd() * 14, h: 8 + rnd() * 9, c: COLORS[Math.floor(rnd() * COLORS.length)], d: 1.0 + rnd() * 0.8,
}));
const CONF_A = confetti(40), CONF_B = confetti(46);
const confettiDivs = (p, arr) => arr.map((c, i) => `<div class="cf" id="${p}${i}" style="width:${c.w}px;height:${c.h}px;background:${c.c}"></div>`).join('');

// Water bottle (same silhouette as the in-app bottle). level: 0..1 fill.
const BOTTLE_PATH = 'M-6 -41 L6 -41 L6 -35 C17 -31 16 -26 16 -19 L16 30 Q16 39 7 39 L-7 39 Q-16 39 -16 30 L-16 -19 C-16 -26 -17 -31 -6 -35Z';
const bottle = (id, w, h, level, left, top, cap = '#ff8fb1') => `
<svg id="${id}" class="abs" viewBox="-22 -52 44 100" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;overflow:visible">
  <defs><clipPath id="${id}-c"><path d="${BOTTLE_PATH}"/></clipPath>
  <linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd0ff"/><stop offset="1" stop-color="#2f8fe8"/></linearGradient></defs>
  <rect x="-9" y="-50" width="18" height="11" rx="4" fill="${cap}" stroke="#26263a" stroke-width="2.2"/>
  <path d="${BOTTLE_PATH}" fill="#e8f6ff" fill-opacity=".85"/>
  <g clip-path="url(#${id}-c)"><rect id="${id}-water" x="-30" y="${39 - 80 * level}" width="60" height="90" fill="url(#${id}-w)"/>
    <rect x="-30" y="${39 - 80 * level}" width="60" height="2.6" fill="#d6f0ff" id="${id}-top"/></g>
  <path d="M-10 -26 L-10 -4" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>
  <path d="${BOTTLE_PATH}" fill="none" stroke="#26263a" stroke-width="2.6" stroke-linejoin="round"/>
</svg>`;

// ---- sound cues: [time, file, volume] ----
const SFX = [
  [0.1, 'thud', 0.7], [1.9, 'whoosh', 0.5], [2.05, 'pop2', 0.6], [3.9, 'whoosh', 0.5], [4.05, 'pop2', 0.6],
  [5.9, 'whoosh', 0.55], [6.05, 'thud', 0.9], [6.45, 'pop1', 0.6], [6.6, 'riser', 0.8],
  [8.1, 'whoosh', 0.7], [8.45, 'boing', 0.6], [10.0, 'pop3', 0.9], [11.22, 'click', 0.9], [11.3, 'pop1', 0.7],
  [12.85, 'whoosh', 0.6], [12.95, 'thud', 0.7], [13.6, 'pop3', 0.9], [14.72, 'click', 0.9], [14.78, 'yes', 0.95],
  [14.85, 'sparkle', 0.8], [15.0, 'glug', 0.9], [15.35, 'pop5', 0.9],
  [16.0, 'whoosh', 0.7], [16.2, 'pop2', 0.9], [17.8, 'pop4', 0.9], [18.3, 'sparkle', 0.8],
  [20.0, 'whoosh', 0.7], [20.15, 'pop4', 0.9], [20.7, 'pop1', 0.9], [21.1, 'pop2', 0.9], [21.5, 'pop3', 0.9], [21.9, 'pop4', 0.9], [22.3, 'pop5', 0.9], [22.35, 'sparkle', 0.8],
  [23.0, 'boing', 0.7], [23.4, 'boing', 0.7],
  [24.2, 'pop5', 1.0], [24.5, 'sparkle', 0.8], [25.2, 'pop1', 0.8], [25.8, 'pop2', 0.8], [26.55, 'yes', 0.95], [26.6, 'sparkle', 0.8],
  [27.2, 'pop1', 0.7], [27.35, 'pop2', 0.7], [27.5, 'pop3', 0.7], [27.65, 'pop4', 0.7], [27.8, 'pop5', 0.7],
];
const sfxLen = (f) => (fs.statSync(`sfx/${f}.wav`).size - 44) / 4 / 44100;
const sfxTags = SFX.map(([t, f, v], i) =>
  `<audio id="sfx-${i}" src="sfx/${f}.wav" data-start="${t}" data-duration="${sfxLen(f).toFixed(3)}" data-track-index="${11 + (i % 9)}" data-volume="${v}"></audio>`).join('\n      ');

// ---- S4 lineup (3 + 2) ----
const NAMES = [['panda', 'Bao', 52, 700], ['cat', 'Mochi', 394, 700], ['bunny', 'Pip', 736, 700], ['penguin', 'Pebble', 167, 1140], ['axolotl', 'Ollie', 623, 1140]];
const lineup = NAMES.map(([k, n, left, top], i) => {
  const key = k === 'panda' ? 'panda-joy' : k + '-joy';
  return `<div class="slot" id="s4-slot${i}" style="left:${left}px;top:${top}px"><div class="slot-in">${char(key, 290, 's4-ch' + i)}<div class="name">${n}</div></div></div>`;
}).join('\n        ');
const mini = NAMES.map(([k], i) => {
  const key = k === 'panda' ? 'panda-joy' : k + '-joy';
  return `<div class="mini" id="s5-mini${i}" style="left:${70 + i * 190}px">${char(key, 170, 's5-ch' + i)}</div>`;
}).join('\n        ');

// laptop "typing" bars for S1
const bars = [[60, 380], [110, 520], [160, 300], [210, 460], [260, 420], [310, 240]]
  .map(([top, w], i) => `<div class="abs bar" id="s1-bar${i}" style="left:46px;top:${top}px;width:${w}px;height:22px;border-radius:11px;background:${i % 3 === 0 ? '#5cc3ff' : '#3d5aa8'}"></div>`).join('');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Buddies — Reel</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #0b1636; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: system-ui, sans-serif; color: #12234a; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .abs { position: absolute; }
      .t { position: absolute; font-weight: 900; letter-spacing: -0.02em; line-height: 1.04; text-align: center; white-space: normal; }
      .char { position: absolute; }
      .char svg { display: block; overflow: visible; }
      .cf { position: absolute; left: 0; top: 0; border-radius: 3px; opacity: 0; }
      .pill { position: absolute; border-radius: 999px; font-weight: 900; display: flex; align-items: center; justify-content: center; white-space: nowrap; text-align: center; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
      .slot { position: absolute; width: 290px; height: 420px; }
      .slot-in { position: absolute; inset: 0; }
      .slot .char { left: 0; top: 0; }
      .name { position: absolute; left: -20px; width: 330px; top: 344px; text-align: center; font-size: 58px; font-weight: 900; color: #12234a; letter-spacing: -0.02em; }
      .mini { position: absolute; top: 1340px; width: 170px; height: 204px; }
      .mini .char { left: 0; top: 0; }
      .card { position: absolute; background: #fff; border-radius: 44px; box-shadow: 0 30px 80px rgba(8, 40, 110, 0.28); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="30" data-width="1080" data-height="1920">

      <!-- ===== S1 · THE LONG STRETCH (0–8s) ===== -->
      <section id="s1" class="clip scene" data-start="0" data-duration="8" data-track-index="1"
        style="background: linear-gradient(180deg, #cfe6ff 0%, #eaf4ff 100%)">
        <div id="s1-dusk" class="abs" style="inset:0;opacity:0;background:linear-gradient(180deg,#14275a 0%,#0b1636 100%)"></div>
        <div class="t" id="s1-t1" style="left:0;width:1080px;top:250px;font-size:200px;color:#12234a">9:00 AM</div>
        <div class="t" id="s1-t2" style="left:0;width:1080px;top:250px;font-size:200px;color:#12234a">11:40 AM</div>
        <div class="t" id="s1-t3" style="left:0;width:1080px;top:250px;font-size:200px;color:#ffffff">1:15 PM</div>
        <div class="t" id="s1-t4" style="left:0;width:1080px;top:250px;font-size:200px;color:#ffffff">3:47 PM</div>
        <div class="t" id="s1-u1" style="left:60px;width:960px;top:500px;font-size:70px;color:#2f5fb0">Big day. So much to do.</div>
        <div class="t" id="s1-u2" style="left:60px;width:960px;top:500px;font-size:70px;color:#2f5fb0">“Just one more email.”</div>
        <div class="t" id="s1-u3" style="left:60px;width:960px;top:500px;font-size:70px;color:#bcd7ff">“I’ll drink later.”</div>
        <div class="t" id="s1-u4" style="left:60px;width:960px;top:500px;font-size:78px;color:#ffd54a">6 hours. Zero sips.</div>
        <!-- desk -->
        <div id="s1-laptop" class="abs" style="left:60px;top:760px;width:700px;height:470px">
          <div class="abs" style="left:0;top:0;width:700px;height:430px;border-radius:30px;background:#101a36;border:12px solid #2a3b66;overflow:hidden">
            ${bars}
            <div class="abs" id="s1-cursor" style="left:430px;top:310px;width:14px;height:34px;border-radius:3px;background:#ffd54a"></div>
          </div>
          <div class="abs" style="left:-30px;top:430px;width:760px;height:36px;border-radius:18px;background:#9fb2d8"></div>
        </div>
        <div class="abs" style="left:0;top:1235px;width:1080px;height:70px;background:rgba(120,150,210,.45)"></div>
        ${bottle('s1-bottle', 200, 456, 0.92, 800, 800)}
        <div class="pill" id="s1-chip" style="left:150px;top:1450px;width:780px;height:120px;font-size:58px;color:#12234a;background:rgba(255,255,255,.92)">Sips today: 0</div>
        <div class="t" id="s1-tag" style="left:760px;top:1290px;width:300px;font-size:44px;color:#ffd54a">still full</div>
      </section>

      <!-- ===== S2 · THE NUDGE (8–16s) ===== -->
      <section id="s2" class="clip scene" data-start="8" data-duration="8" data-track-index="1"
        style="background: linear-gradient(180deg, #8fd0ff 0%, #d9f0ff 70%, #f3faff 100%)">
        <div class="abs" style="right:90px;top:90px;width:150px;height:150px;border-radius:50%;background:#ffe27a;box-shadow:0 0 100px 30px rgba(255,226,122,.55)"></div>
        <div class="t" id="s2-time" style="left:0;width:1080px;top:290px;font-size:110px;color:#12234a">3:47 PM</div>
        <div class="t" id="s2-later" style="left:90px;width:900px;top:280px;font-size:84px;color:#12234a">10 minutes later…</div>
        <div id="s2-screen" class="card" style="left:60px;top:480px;width:960px;height:800px;border-radius:40px;background:#f4f9ff">
          <div class="abs" style="left:0;top:0;right:0;height:66px;background:#dfeaf8;border-radius:40px 40px 0 0"></div>
          <div class="abs" style="left:30px;top:22px;width:22px;height:22px;border-radius:50%;background:#ff6b6b"></div>
          <div class="abs" style="left:66px;top:22px;width:22px;height:22px;border-radius:50%;background:#ffc94d"></div>
          <div class="abs" style="left:102px;top:22px;width:22px;height:22px;border-radius:50%;background:#46d369"></div>
          <div class="abs" style="left:60px;top:120px;width:560px;height:26px;border-radius:13px;background:#d6e2f4"></div>
          <div class="abs" style="left:60px;top:176px;width:780px;height:26px;border-radius:13px;background:#e3ebf8"></div>
          <div class="abs" style="left:60px;top:232px;width:640px;height:26px;border-radius:13px;background:#e3ebf8"></div>
          <div class="abs" style="left:60px;top:288px;width:720px;height:26px;border-radius:13px;background:#e3ebf8"></div>
        </div>
        <div id="s2-panda" class="abs" style="left:0;top:744px;width:480px;height:576px">
          ${char('panda-ask', 480, 's2-p-ask')}
          ${char('panda-hmm', 480, 's2-p-hmm', 'opacity:0')}
          ${char('panda-joy', 480, 's2-p-joy', 'opacity:0')}
        </div>
        <div id="s2-bubble" class="card" style="left:100px;top:500px;width:880px;height:390px">
          <div class="t" id="s2-qa" style="left:50px;top:40px;width:780px;font-size:62px;color:#12234a">Have you had some water?</div>
          <div class="t" id="s2-qb" style="left:50px;top:110px;width:780px;font-size:58px;color:#12234a">No rush! A few sips would feel great.</div>
          <div class="t" id="s2-qc" style="left:50px;top:70px;width:780px;font-size:64px;color:#12234a">Time for a sip?</div>
          <div class="pill" id="s2-yes" style="left:50px;top:250px;width:400px;height:100px;font-size:50px;color:#fff;background:linear-gradient(180deg,#1f78e6,#0f55c2);box-shadow:0 12px 26px rgba(15,85,194,.4)">Yes, I have!</div>
          <div class="pill" id="s2-no" style="left:480px;top:250px;width:300px;height:100px;font-size:46px;color:#3f527a;background:#eef2fa">Not yet</div>
          <div class="abs" style="left:190px;bottom:-22px;width:46px;height:46px;background:#fff;transform:rotate(45deg);border-radius:8px"></div>
        </div>
        <svg id="s2-cursor" class="abs" style="left:0;top:0;width:90px;height:90px;overflow:visible" viewBox="0 0 24 24">
          <path d="M3 2 L3 19 L8 14.6 L11.4 21.5 L14.2 20.2 L10.9 13.4 L17.5 13.2 Z" fill="#fff" stroke="#12234a" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        <div class="abs" id="s2-ring" style="left:0;top:0;width:120px;height:120px;border-radius:50%;border:8px solid #fff;opacity:0"></div>
        <div class="t" id="s2-cap1" style="left:60px;width:960px;top:1345px;font-size:78px;color:#12234a">A gentle nudge.</div>
        <div class="t" id="s2-cap2" style="left:60px;width:960px;top:1345px;font-size:78px;color:#12234a">No pressure.</div>
        <div class="t" id="s2-cap3" style="left:60px;width:960px;top:1345px;font-size:78px;color:#12234a">Just a sip.</div>
        <div class="t" id="s2-cap4" style="left:60px;width:960px;top:1345px;font-size:70px;color:#12234a">That’s the whole habit.</div>
        <div class="pill" id="s2-count" style="left:310px;top:1470px;width:460px;height:120px;font-size:62px;color:#12234a;background:#ffd45c;box-shadow:0 16px 36px rgba(0,0,0,.18)">1/8 today</div>
        ${confettiDivs('s2c', CONF_A)}
      </section>

      <!-- ===== S3 · PAYOFF (16–20s) ===== -->
      <section id="s3" class="clip scene" data-start="16" data-duration="4" data-track-index="1"
        style="background: linear-gradient(180deg, #ffe9c7 0%, #ffd3e3 100%)">
        <div class="abs" style="left:-200px;top:-160px;width:640px;height:640px;border-radius:50%;background:rgba(255,255,255,.35)"></div>
        <div class="abs" style="right:-240px;bottom:-200px;width:760px;height:760px;border-radius:50%;background:rgba(255,255,255,.3)"></div>
        <div class="t" id="s3-h1" style="left:60px;width:960px;top:210px;font-size:112px;color:#12234a">Same deadline.</div>
        <div class="t" id="s3-h2" style="left:60px;width:960px;top:360px;font-size:150px;color:#e0507f">Better afternoon.</div>
        <div id="s3-panda" class="abs" style="left:170px;top:740px;width:740px;height:888px">${char('panda-joy', 740, 's3-p')}</div>
        ${bottle('s3-bottle', 170, 388, 0.42, 830, 1180)}
      </section>

      <!-- ===== S4 · PICK YOUR BUDDY (20–24s) ===== -->
      <section id="s4" class="clip scene" data-start="20" data-duration="4" data-track-index="1"
        style="background: linear-gradient(180deg, #d9f0ff 0%, #e9e2ff 100%)">
        <div class="abs" style="left:-220px;top:900px;width:700px;height:700px;border-radius:50%;background:rgba(255,255,255,.4)"></div>
        <div class="t" id="s4-title" style="left:60px;width:960px;top:230px;font-size:140px;color:#12234a">Pick your buddy.</div>
        <div class="t" id="s4-sub" style="left:60px;width:960px;top:570px;font-size:58px;color:#6a4fb0">Whoever keeps you going.</div>
        ${lineup}
      </section>

      <!-- ===== S5 · CTA (24–30s) ===== -->
      <section id="s5" class="clip scene" data-start="24" data-duration="6" data-track-index="1"
        style="background: linear-gradient(180deg, #8fd0ff 0%, #e4f4ff 75%, #f6fbff 100%)">
        <div class="abs" style="left:-200px;right:-200px;bottom:-330px;height:520px;border-radius:50%;background:#bfe3ff"></div>
        <img id="s5-icon" class="abs" src="assets/icon.png" style="left:330px;top:230px;width:420px;height:420px" alt="" />
        <div class="t" id="s5-name" style="left:0;width:1080px;top:680px;font-size:200px;color:#12234a">Buddies</div>
        <div class="t" id="s5-tag" style="left:40px;width:1000px;top:925px;font-size:56px;color:#2f6fd0">Your desktop water buddies.</div>
        <div class="pill" id="s5-web" style="left:240px;top:1070px;width:600px;height:122px;font-size:62px;color:#12234a;background:#ffd45c;box-shadow:0 18px 40px rgba(0,0,0,.2)">Coming soon</div>
        <div class="t" id="s5-line" style="left:60px;width:960px;top:1235px;font-size:50px;color:#3f527a;font-weight:700">Stay hydrated. Have fun.</div>
        ${mini}
        ${confettiDivs('s5c', CONF_B)}
      </section>

      <div id="flash" class="clip" data-start="0" data-duration="30" data-track-index="20"></div>

      <audio id="music" src="assets/music.wav" data-start="0" data-duration="30" data-track-index="10" data-volume="0.85"></audio>
      ${sfxTags}
    </div>

    <script>
      const CONF_A = ${JSON.stringify(CONF_A)};
      const CONF_B = ${JSON.stringify(CONF_B)};
      const tl = gsap.timeline({ paused: true });
      const E = { out: 'power3.out', back: 'back.out(1.7)', slam: 'power4.out', inout: 'power2.inOut' };
      const swap = (outIds, inIds, t, d = 0.18) => {
        tl.to(outIds, { opacity: 0, y: -26, duration: d, ease: 'power2.in' }, t - d);
        tl.fromTo(inIds, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3, ease: E.out }, t);
      };
      function burst(prefix, arr, x, y, t) {
        arr.forEach((c, i) => {
          const id = '#' + prefix + i, dx = Math.cos(c.a) * c.v * 0.9, dy = Math.sin(c.a) * c.v * 0.9;
          tl.set(id, { x, y, opacity: 1, rotation: 0 }, t);
          tl.to(id, { x: x + dx, y: y + dy, rotation: c.r, duration: 0.55, ease: 'power2.out' }, t);
          tl.to(id, { y: y + dy + 520 + c.v * 0.3, x: x + dx * 1.2, rotation: c.r * 2, opacity: 0, duration: c.d, ease: 'power1.in' }, t + 0.55);
        });
      }

      // stable resting states for anything that is tweened from an initial hidden/off-screen state
      tl.set('#s1-chip', { opacity: 0 }, 0);
      tl.set('#s2-panda', { x: -560, y: 0 }, 0);
      tl.set(['#s2-bubble', '#s2-screen', '#s2-time', '#s2-ring'], { opacity: 0 }, 0);
      tl.set(['#s3-panda', '#s3-bottle', '#s3-h1', '#s3-h2'], { opacity: 0 }, 0);
      tl.set(['#s4-title', '#s4-sub'], { opacity: 0 }, 0);
      tl.set(['#s5-icon', '#s5-web', '#s5-name', '#s5-tag', '#s5-line'], { opacity: 0 }, 0);

      // flash cuts on the bar lines
      [8, 16, 20, 24].forEach((t) => {
        tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.85, duration: 0.05, ease: 'none' }, t - 0.03);
        tl.to('#flash', { opacity: 0, duration: 0.3, ease: 'power2.out' }, t + 0.02);
      });

      // ---- S1: the long stretch ----
      tl.set(['#s1-t2', '#s1-t3', '#s1-t4', '#s1-u2', '#s1-u3', '#s1-u4', '#s1-tag'], { opacity: 0 }, 0);
      tl.fromTo('#s1-t1', { y: 50, opacity: 0, scale: 1.12 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: E.slam }, 0.08);
      tl.fromTo('#s1-u1', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.out }, 0.45);
      swap(['#s1-t1', '#s1-u1'], ['#s1-t2', '#s1-u2'], 2.0);
      swap(['#s1-t2', '#s1-u2'], ['#s1-t3', '#s1-u3'], 4.0);
      swap(['#s1-t3', '#s1-u3'], ['#s1-t4', '#s1-u4'], 6.0);
      tl.fromTo('#s1-t4', { scale: 1.15 }, { scale: 1, duration: 0.25, ease: E.slam }, 6.0);
      tl.fromTo('#s1-tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.out }, 6.45);
      tl.to('#s1-dusk', { opacity: 0.92, duration: 7.0, ease: 'none' }, 0);
      tl.fromTo('#s1-laptop', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: E.out }, 0.2);
      tl.fromTo('#s1-bottle', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: E.out }, 0.35);
      tl.fromTo('#s1-chip', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out }, 0.7);
      // "typing": the bars keep growing as the day drags on
      for (let i = 0; i < 6; i++) tl.fromTo('#s1-bar' + i, { width: 0 }, { width: [380, 520, 300, 460, 420, 240][i], duration: 0.5, ease: 'steps(8)' }, 0.5 + i * 0.9);
      tl.fromTo('#s1-cursor', { opacity: 1 }, { opacity: 0, duration: 0.01, repeat: 15, yoyo: true, repeatDelay: 0.24 }, 0.4);
      tl.fromTo('#s1-chip', { scale: 1 }, { scale: 1.06, duration: 0.14, yoyo: true, repeat: 1 }, 6.05);
      tl.to('#s1-chip', { backgroundColor: '#ffd54a', duration: 0.2 }, 6.05);

      // ---- S2: the nudge (scene starts 8.0) ----
      tl.set(['#s2-qb', '#s2-qc', '#s2-cap2', '#s2-cap3', '#s2-cap4', '#s2-later', '#s2-count', '#s2-cursor'], { opacity: 0 }, 8);
      tl.fromTo('#s2-screen', { y: 100, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: E.back }, 8.05);
      tl.fromTo('#s2-time', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.out }, 8.2);
      tl.fromTo('#s2-panda', { x: -560 }, { x: 300, duration: 1.5, ease: 'power2.out' }, 8.5);
      for (let k = 0; k < 8; k++) tl.fromTo('#s2-panda', { y: 0 }, { y: -20, duration: 0.09, yoyo: true, repeat: 1, ease: 'sine.out' }, 8.55 + k * 0.17);
      tl.fromTo('#s2-bubble', { scale: 0.2, opacity: 0, transformOrigin: '22% 100%' }, { scale: 1, opacity: 1, duration: 0.45, ease: E.back }, 10.0);
      tl.fromTo('#s2-cap1', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.out }, 10.1);
      // cursor goes to "Not yet"
      tl.fromTo('#s2-cursor', { x: 900, y: 1500, opacity: 0 }, { x: 900, y: 1500, opacity: 1, duration: 0.1 }, 10.4);
      tl.to('#s2-cursor', { x: 730, y: 800, duration: 0.8, ease: E.inout }, 10.45);
      tl.to('#s2-cursor', { scale: 0.85, duration: 0.07, yoyo: true, repeat: 1 }, 11.18);
      tl.fromTo('#s2-no', { scale: 1 }, { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1 }, 11.18);
      tl.to(['#s2-p-ask'], { opacity: 0, duration: 0.05 }, 11.3);
      tl.to(['#s2-p-hmm'], { opacity: 1, duration: 0.05 }, 11.3);
      tl.to(['#s2-qa', '#s2-yes', '#s2-no'], { opacity: 0, duration: 0.15 }, 11.3);
      tl.fromTo('#s2-qb', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.out }, 11.4);
      swap(['#s2-cap1'], ['#s2-cap2'], 11.5);
      tl.to('#s2-cursor', { opacity: 0, duration: 0.2 }, 11.5);
      tl.to('#s2-bubble', { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' }, 12.7);
      tl.to('#s2-cap2', { opacity: 0, duration: 0.2 }, 12.6);
      tl.fromTo('#s2-later', { y: 50, opacity: 0, scale: 1.1 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: E.slam }, 12.9);
      tl.to('#s2-time', { opacity: 0, duration: 0.2 }, 12.85);
      tl.to('#s2-later', { opacity: 0, y: -20, duration: 0.25, ease: 'power2.in' }, 13.5);
      tl.to(['#s2-p-hmm'], { opacity: 0, duration: 0.05 }, 13.5);
      tl.to(['#s2-p-ask'], { opacity: 1, duration: 0.05 }, 13.5);
      tl.set(['#s2-yes', '#s2-no'], { opacity: 1, scale: 1 }, 13.55);
      tl.set('#s2-qb', { opacity: 0 }, 13.55);
      tl.fromTo('#s2-bubble', { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: E.back }, 13.6);
      tl.fromTo('#s2-qc', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.out }, 13.65);
      tl.fromTo('#s2-cap3', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.out }, 13.7);
      // cursor goes to "Yes"
      tl.fromTo('#s2-cursor', { x: 900, y: 1500, opacity: 0 }, { x: 900, y: 1500, opacity: 1, duration: 0.1 }, 14.0);
      tl.to('#s2-cursor', { x: 350, y: 800, duration: 0.7, ease: E.inout }, 14.05);
      tl.to('#s2-cursor', { scale: 0.85, duration: 0.07, yoyo: true, repeat: 1 }, 14.7);
      tl.fromTo('#s2-yes', { scale: 1 }, { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1 }, 14.7);
      tl.fromTo('#s2-ring', { x: 290, y: 740, scale: 0.4, opacity: 0.9 }, { scale: 2.2, opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, 14.72);
      tl.to('#s2-p-ask', { opacity: 0, duration: 0.05 }, 14.8);
      tl.to('#s2-p-joy', { opacity: 1, duration: 0.05 }, 14.8);
      tl.fromTo('#s2-panda', { y: 0 }, { y: -80, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }, 14.8);
      burst('s2c', CONF_A, 540, 900, 14.8);
      tl.to('#s2-bubble', { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' }, 15.05);
      tl.to('#s2-cursor', { opacity: 0, duration: 0.2 }, 14.9);
      swap(['#s2-cap3'], ['#s2-cap4'], 15.0);
      tl.fromTo('#s2-count', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: E.back }, 15.25);

      // ---- S3: payoff (16.0) ----
      tl.fromTo('#s3-h1', { y: 60, opacity: 0, scale: 1.15 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: E.slam }, 16.15);
      tl.fromTo('#s3-panda', { y: 500, opacity: 0, scale: 0.7 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: E.back }, 16.3);
      tl.fromTo('#s3-bottle', { x: 160, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: E.out }, 16.6);
      tl.fromTo('#s3-h2', { y: 60, opacity: 0, scale: 1.12 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: E.slam }, 17.75);
      tl.fromTo('#s3-panda', { rotation: 0 }, { rotation: 4, duration: 0.22, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 17.8);
      tl.fromTo('#s3-bottle', { y: 0 }, { y: -26, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }, 17.8);

      // ---- S4: pick your buddy (20.0) ----
      tl.fromTo('#s4-title', { y: -30, opacity: 0, scale: 1.08 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: E.slam }, 20.1);
      tl.fromTo('#s4-sub', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: E.out }, 20.35);
      [20.7, 21.1, 21.5, 21.9, 22.3].forEach((t, i) => {
        tl.fromTo('#s4-slot' + i, { y: 300, scale: 0.2, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: E.back }, t);
      });
      [23.0, 23.4].forEach((t) => {
        for (let i = 0; i < 5; i++) tl.fromTo('#s4-slot' + i, { y: 0 }, { y: -45, duration: 0.17, ease: 'power2.out', yoyo: true, repeat: 1 }, t + i * 0.025);
      });

      // ---- S5: CTA (24.0) ----
      tl.fromTo('#s5-icon', { scale: 0, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' }, 24.15);
      tl.fromTo('#s5-name', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: E.out }, 25.1);
      tl.fromTo('#s5-tag', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out }, 25.75);
      tl.fromTo('#s5-web', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: E.back }, 26.5);
      tl.fromTo('#s5-web', { scale: 1 }, { scale: 1.05, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 27.1);
      tl.fromTo('#s5-line', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out }, 27.0);
      for (let i = 0; i < 5; i++) {
        tl.fromTo('#s5-mini' + i, { y: 280, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.back }, 27.15 + i * 0.15);
        tl.fromTo('#s5-mini' + i, { y: 0 }, { y: -36, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 }, 28.1 + i * 0.07);
      }
      tl.fromTo('#s5-icon', { y: 0 }, { y: -16, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 25.2);
      burst('s5c', CONF_B, 540, 560, 24.15);

      window.__timelines['main'] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('index.html written', html.length, 'bytes');
