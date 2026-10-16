// Buddies — Instagram Reel v2 (1080x1920, 9:16, 30s). "The long stretch".
// Full-bleed scenes, hero-scale characters, kinetic type, iris-wipe cuts on the bar lines.
import fs from 'fs';

const CH = JSON.parse(fs.readFileSync('scripts/chars.json', 'utf8'));
let uid = 0;
const char = (key, width, id, extra = '') => {
  const svg = CH[key].replace(/(sp\d+)-/g, `$1p${++uid}-`).replace('<svg ', '<svg width="100%" height="100%" ');
  return `<div class="char" id="${id}" style="width:${width}px;height:${Math.round(width * 1.2)}px;${extra}">${svg}</div>`;
};
const W = (s) => s.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');

let seed = 777;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const COLORS = ['#5cc3ff', '#ff8fb1', '#ffd45c', '#8de6b8', '#b69bff', '#ff9a5c', '#ffffff'];
const confetti = (n) => Array.from({ length: n }, () => ({
  a: -Math.PI / 2 + (rnd() - 0.5) * 2.9, v: 340 + rnd() * 620, r: (rnd() - 0.5) * 900,
  w: 14 + rnd() * 16, h: 9 + rnd() * 10, c: COLORS[Math.floor(rnd() * COLORS.length)], d: 1.0 + rnd() * 0.8,
}));
const CONF_A = confetti(46), CONF_B = confetti(52);
const confettiDivs = (p, arr) => arr.map((c, i) => `<div class="cf" id="${p}${i}" style="width:${c.w}px;height:${c.h}px;background:${c.c}"></div>`).join('');

// floating droplets: constant gentle motion in the bright scenes
const drops = (scene, n) => Array.from({ length: n }, (_, i) => {
  const left = Math.round(40 + rnd() * 1000), size = Math.round(26 + rnd() * 34);
  return `<div class="drop ${scene}-drop" id="${scene}-drop${i}" data-d="${(1.6 + rnd() * 1.6).toFixed(2)}" data-o="${(rnd() * 2.2).toFixed(2)}" style="left:${left}px;top:1960px;width:${size}px;height:${Math.round(size * 1.3)}px"></div>`;
}).join('');

const BOTTLE_PATH = 'M-6 -41 L6 -41 L6 -35 C17 -31 16 -26 16 -19 L16 30 Q16 39 7 39 L-7 39 Q-16 39 -16 30 L-16 -19 C-16 -26 -17 -31 -6 -35Z';
const bottle = (id, w, h, level, left, top, cap = '#ff8fb1') => `
<svg id="${id}" class="abs" viewBox="-22 -52 44 100" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;overflow:visible">
  <defs><clipPath id="${id}-c"><path d="${BOTTLE_PATH}"/></clipPath>
  <linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd0ff"/><stop offset="1" stop-color="#2f8fe8"/></linearGradient></defs>
  <rect x="-9" y="-50" width="18" height="11" rx="4" fill="${cap}" stroke="#26263a" stroke-width="2.2"/>
  <path d="${BOTTLE_PATH}" fill="#e8f6ff" fill-opacity=".9"/>
  <g clip-path="url(#${id}-c)"><rect id="${id}-water" x="-30" y="${39 - 80 * level}" width="60" height="90" fill="url(#${id}-w)"/>
    <rect x="-30" y="${39 - 80 * level}" width="60" height="2.6" fill="#d6f0ff"/></g>
  <path d="M-10 -26 L-10 -4" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>
  <path d="${BOTTLE_PATH}" fill="none" stroke="#26263a" stroke-width="2.6" stroke-linejoin="round"/>
</svg>`;

// ---- sound cues ----
const SFX = [
  [1.0, 'pop1', 0.6], [1.7, 'pop2', 0.6], [2.4, 'pop3', 0.6], [3.1, 'pop2', 0.6], [3.8, 'pop1', 0.6],
  [2.4, 'tick', 0.6], [4.2, 'tick', 0.6], [5.95, 'thud', 1.0], [6.05, 'whoosh', 0.6], [6.6, 'riser', 0.8], [7.72, 'whoosh', 0.8],
  [8.05, 'whoosh', 0.7], [8.5, 'boing', 0.8], [9.85, 'pop3', 0.9], [11.22, 'click', 0.9], [11.3, 'pop1', 0.7],
  [12.9, 'thud', 0.7], [12.95, 'tick', 0.7], [13.65, 'pop3', 0.9], [14.72, 'click', 0.9], [14.78, 'yes', 0.95],
  [14.85, 'sparkle', 0.8], [15.0, 'glug', 0.9], [15.3, 'pop5', 0.9], [15.72, 'whoosh', 0.8],
  [16.05, 'whoosh', 0.7], [16.2, 'pop2', 0.9], [16.4, 'boing', 0.8], [17.7, 'pop4', 0.9], [18.2, 'sparkle', 0.8], [19.72, 'whoosh', 0.8],
  [20.0, 'whoosh', 0.6], [20.05, 'pop1', 0.9], [20.8, 'whoosh', 0.6], [20.85, 'pop2', 0.9], [21.6, 'whoosh', 0.6], [21.65, 'pop3', 0.9],
  [22.4, 'whoosh', 0.6], [22.45, 'pop4', 0.9], [23.2, 'whoosh', 0.6], [23.25, 'pop5', 0.9], [23.72, 'whoosh', 0.8],
  [24.2, 'pop5', 1.0], [24.5, 'sparkle', 0.8], [24.6, 'pop1', 0.8], [25.05, 'pop2', 0.8], [25.7, 'yes', 0.95], [25.75, 'sparkle', 0.8],
  [26.5, 'pop1', 0.7], [26.65, 'pop2', 0.7], [26.8, 'pop3', 0.7], [26.95, 'pop4', 0.7], [27.1, 'pop5', 0.7],
];
const sfxLen = (f) => (fs.statSync(`sfx/${f}.wav`).size - 44) / 4 / 44100;
const sfxTags = SFX.map(([t, f, v], i) =>
  `<audio id="sfx-${i}" src="sfx/${f}.wav" data-start="${t}" data-duration="${sfxLen(f).toFixed(3)}" data-track-index="${11 + (i % 9)}" data-volume="${v}"></audio>`).join('\n      ');

// ---- S4 carousel ----
const CAROUSEL = [
  ['panda', 'Bao', 'the panda', '#2f8ff0', '#ffffff'],
  ['cat', 'Mochi', 'the cat', '#ffa94d', '#12234a'],
  ['bunny', 'Pip', 'the bunny', '#7357d8', '#ffffff'],
  ['penguin', 'Pebble', 'the penguin', '#1d3f8f', '#ffffff'],
  ['axolotl', 'Ollie', 'the axolotl', '#ff8fb5', '#12234a'],
];
const carousel = CAROUSEL.map(([k, name, sp, bg, fg], i) => `
        <div id="s4-slot${i}" class="abs slot" style="background:${bg}">
          <div class="abs" style="left:-300px;top:480px;width:1100px;height:1100px;border-radius:50%;background:rgba(255,255,255,.14)"></div>
          <div class="t" id="s4-name${i}" style="left:0;width:1080px;top:330px;font-size:230px;color:${fg};text-shadow:0 8px 0 ${fg === '#ffffff' ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.35)'}">${name}</div>
          <div class="t" id="s4-sp${i}" style="left:0;width:1080px;top:580px;font-size:70px;color:${fg}">${sp}</div>
          <div id="s4-ch${i}" class="abs" style="left:150px;top:720px;width:780px;height:936px">${char(k === 'panda' ? 'panda-joy' : k + '-joy', 780, 's4-c' + i)}</div>
        </div>`).join('');
const mini = CAROUSEL.map(([k], i) => `<div class="mini" id="s5-mini${i}" style="left:${55 + i * 195}px">${char(k === 'panda' ? 'panda-joy' : k + '-joy', 175, 's5-ch' + i)}</div>`).join('\n        ');

// S1 notification chips
const CHIPS = [
  ['47 unread emails', '#ff6b6b', 20, 760], ['Meeting in 5 min', '#ffc94d', 660, 900], ['Report due today', '#7ee8b4', 20, 1040],
  ['Reply ASAP', '#b69bff', 660, 1180], ['12 new messages', '#5cc3ff', 20, 1320],
];
const chips = CHIPS.map(([t, c, l, tp], i) => `<div class="pill chip h0" id="s1-chip${i}" style="left:${l}px;top:${tp}px"><i style="background:${c}"></i>${t}</div>`).join('\n        ');

const docLines = Array.from({ length: 16 }, (_, i) => `<div class="abs" style="left:70px;top:${190 + i * 84}px;width:${[760, 620, 880, 540, 700, 820, 480, 760][i % 8]}px;height:30px;border-radius:15px;background:${i % 5 === 0 ? '#cfdcf2' : '#e3ebf8'}"></div>`).join('');

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
      .slot { inset: 0; overflow: hidden; }
      .t { position: absolute; font-weight: 900; letter-spacing: -0.02em; line-height: 1.02; text-align: center; white-space: normal; }
      .w { display: inline-block; opacity: 0; }
      .h0 { opacity: 0; }
      .char { position: absolute; }
      .char svg { display: block; overflow: visible; }
      .cf { position: absolute; left: 0; top: 0; border-radius: 3px; opacity: 0; }
      .pill { position: absolute; border-radius: 999px; font-weight: 900; display: flex; align-items: center; justify-content: center; white-space: nowrap; text-align: center; }
      .chip { height: 104px; width: 400px; font-size: 33px; background: rgba(255,255,255,.96); color: #12234a; justify-content: flex-start; padding-left: 24px; padding-right: 16px; gap: 14px; box-shadow: 0 14px 30px rgba(0,0,0,.25); }
      .chip i { display: block; width: 30px; height: 30px; border-radius: 50%; flex: none; }
      .card { position: absolute; background: #fff; border-radius: 48px; box-shadow: 0 30px 80px rgba(8, 40, 110, 0.32); }
      .drop { position: absolute; background: rgba(255,255,255,.55); clip-path: polygon(50% 0%, 100% 58%, 100% 100%, 0 100%, 0 58%); border-radius: 0; opacity: 0; }
      .mini { position: absolute; top: 1380px; width: 175px; height: 210px; }
      .mini .char { left: 0; top: 0; }
      #iris { position: absolute; left: -660px; top: -240px; width: 2400px; height: 2400px; border-radius: 50%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="30" data-width="1080" data-height="1920">

      <!-- ===== S1 · THE LONG STRETCH (0–8s) ===== -->
      <section id="s1" class="clip scene" data-start="0" data-duration="8" data-track-index="1"
        style="background: linear-gradient(180deg, #cfe6ff 0%, #eaf4ff 100%)">
        <div id="s1-dusk" class="abs" style="inset:0;opacity:0;background:linear-gradient(180deg,#14275a 0%,#0b1636 100%)"></div>
        <div class="abs" style="left:-150px;top:1420px;width:1380px;height:700px;border-radius:50%;background:rgba(120,150,210,.35)"></div>
        <div class="t" id="s1-time" style="left:0;width:1080px;top:235px;font-size:208px;color:#12234a">9:00 AM</div>
        <div class="t" id="s1-u1" style="left:60px;width:960px;top:500px;font-size:68px;color:#2f5fb0">Big day. Lots to do.</div>
        <div class="t h0" id="s1-u2" style="left:60px;width:960px;top:500px;font-size:68px;color:#2f5fb0">“Just one more email.”</div>
        <div class="t h0" id="s1-u3" style="left:60px;width:960px;top:500px;font-size:68px;color:#bcd7ff">“I’ll drink later.”</div>
        ${bottle('s1-bottle', 280, 640, 0.95, 400, 800)}
        <div class="t h0" id="s1-still" style="left:60px;width:960px;top:1455px;font-size:92px;color:#ffd54a">${W('6 hours. Zero sips.')}</div>
        ${chips}
      </section>

      <!-- ===== S2 · THE NUDGE (8–16s) ===== -->
      <section id="s2" class="clip scene" data-start="8" data-duration="8" data-track-index="1" style="background:#f4f8ff">
        <div id="s2-doc" class="abs" style="left:0;top:0;width:1080px;height:2400px">
          <div class="abs" style="left:0;top:0;width:1080px;height:130px;background:#dfe9f8"></div>
          <div class="abs" style="left:40px;top:50px;width:30px;height:30px;border-radius:50%;background:#ff6b6b"></div>
          <div class="abs" style="left:92px;top:50px;width:30px;height:30px;border-radius:50%;background:#ffc94d"></div>
          <div class="abs" style="left:144px;top:50px;width:30px;height:30px;border-radius:50%;background:#46d369"></div>
          ${docLines}
        </div>
        <div class="abs" id="s2-dim" style="inset:0;background:linear-gradient(180deg,rgba(18,60,150,.55),rgba(80,170,255,.35))"></div>
        <div class="t" id="s2-cap1" style="left:60px;width:960px;top:210px;font-size:96px;color:#fff;text-shadow:0 6px 0 rgba(6,26,96,.85), 0 0 24px rgba(6,26,96,.35)">${W('A gentle nudge.')}</div>
        <div class="t" id="s2-cap2" style="left:60px;width:960px;top:210px;font-size:96px;color:#fff;text-shadow:0 6px 0 rgba(6,26,96,.85), 0 0 24px rgba(6,26,96,.35)">${W('No pressure.')}</div>
        <div class="t" id="s2-cap3" style="left:60px;width:960px;top:210px;font-size:96px;color:#fff;text-shadow:0 6px 0 rgba(6,26,96,.85), 0 0 24px rgba(6,26,96,.35)">${W('Just a sip.')}</div>
        <div class="t" id="s2-cap4" style="left:60px;width:960px;top:210px;font-size:96px;color:#ffffff;text-shadow:0 6px 0 rgba(6,26,96,.85), 0 0 24px rgba(6,26,96,.35)">${W('That’s the whole habit.')}</div>
        <div class="pill" id="s2-later" style="left:90px;top:560px;width:900px;height:170px;font-size:78px;color:#fff;background:#12234a;box-shadow:0 24px 50px rgba(0,0,0,.35)">10 minutes later…</div>
        <div id="s2-panda" class="abs" style="left:150px;top:690px;width:780px;height:936px">
          ${char('panda-ask', 780, 's2-p-ask')}
          ${char('panda-hmm', 780, 's2-p-hmm', 'opacity:0')}
          ${char('panda-joy', 780, 's2-p-joy', 'opacity:0')}
        </div>
        <div id="s2-bubble" class="card" style="left:70px;top:450px;width:940px;height:420px">
          <div class="t" id="s2-qa" style="left:40px;top:62px;width:860px;font-size:66px;color:#12234a">Have you had some water?</div>
          <div class="t" id="s2-qb" style="left:40px;top:100px;width:860px;font-size:64px;color:#12234a">No rush! A few sips would feel great.</div>
          <div class="t" id="s2-qc" style="left:40px;top:80px;width:860px;font-size:76px;color:#12234a">Time for a sip?</div>
          <div class="pill" id="s2-yes" style="left:50px;top:270px;width:430px;height:112px;font-size:54px;color:#fff;background:linear-gradient(180deg,#1f78e6,#0f55c2);box-shadow:0 12px 26px rgba(15,85,194,.45)">Yes, I have!</div>
          <div class="pill" id="s2-no" style="left:510px;top:270px;width:380px;height:112px;font-size:50px;color:#3f527a;background:#eef2fa">Not yet</div>
          <div class="abs" style="left:200px;bottom:-24px;width:50px;height:50px;background:#fff;transform:rotate(45deg);border-radius:8px"></div>
        </div>
        <svg id="s2-cursor" class="abs" style="left:0;top:0;width:110px;height:110px;overflow:visible" viewBox="0 0 24 24">
          <path d="M3 2 L3 19 L8 14.6 L11.4 21.5 L14.2 20.2 L10.9 13.4 L17.5 13.2 Z" fill="#fff" stroke="#12234a" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        <div class="abs" id="s2-ring" style="left:0;top:0;width:140px;height:140px;border-radius:50%;border:9px solid #fff;opacity:0"></div>
        <div class="pill" id="s2-count" style="left:260px;top:510px;width:560px;height:132px;font-size:72px;color:#12234a;background:#ffd45c;box-shadow:0 18px 40px rgba(0,0,0,.25)">1/8 today</div>
        ${drops('s2', 9)}
        ${confettiDivs('s2c', CONF_A)}
      </section>

      <!-- ===== S3 · PAYOFF (16–20s) ===== -->
      <section id="s3" class="clip scene" data-start="16" data-duration="4" data-track-index="1"
        style="background: radial-gradient(circle at 50% 55%, #ffe9a8 0%, #ffb86b 60%, #ff8fb1 100%)">
        <div id="s3-rays" class="abs" style="left:-560px;top:-160px;width:2200px;height:2200px;border-radius:50%;background:repeating-conic-gradient(from 0deg, rgba(255,255,255,.28) 0deg 12deg, rgba(255,255,255,0) 12deg 30deg)"></div>
        <div class="t" id="s3-h1" style="left:50px;width:980px;top:190px;font-size:118px;color:#12234a">${W('Same deadline.')}</div>
        <div class="t" id="s3-h2" style="left:50px;width:980px;top:340px;font-size:170px;color:#fff;text-shadow:0 8px 0 rgba(120,20,60,.75), 0 0 28px rgba(120,20,60,.35)">${W('Better afternoon.')}</div>
        <div id="s3-panda" class="abs" style="left:120px;top:760px;width:760px;height:912px">${char('panda-joy', 760, 's3-p')}</div>
        ${bottle('s3-bottle', 190, 434, 0.4, 800, 1130)}
        ${drops('s3', 8)}
      </section>

      <!-- ===== S4 · PICK YOUR BUDDY (20–24s) ===== -->
      <section id="s4" class="clip scene" data-start="20" data-duration="4" data-track-index="1" style="background:#2f8ff0">
        ${carousel}
        <div class="pill" id="s4-title" style="left:190px;top:190px;width:700px;height:104px;font-size:52px;letter-spacing:.06em;color:#12234a;background:#fff;box-shadow:0 14px 30px rgba(0,0,0,.2)">PICK YOUR BUDDY</div>
      </section>

      <!-- ===== S5 · CTA (24–30s) ===== -->
      <section id="s5" class="clip scene" data-start="24" data-duration="6" data-track-index="1"
        style="background: linear-gradient(180deg, #8fd0ff 0%, #e4f4ff 75%, #f6fbff 100%)">
        <div class="abs" style="left:-200px;right:-200px;bottom:-330px;height:520px;border-radius:50%;background:#bfe3ff"></div>
        ${drops('s5', 8)}
        <img id="s5-icon" class="abs" src="assets/icon.png" style="left:320px;top:190px;width:440px;height:440px" alt="" />
        <div class="t" id="s5-name" style="left:0;width:1080px;top:650px;font-size:220px;color:#12234a">Buddies</div>
        <div class="t" id="s5-tag" style="left:30px;width:1020px;top:920px;font-size:58px;color:#2f6fd0">Your desktop water buddies.</div>
        <div class="pill" id="s5-web" style="left:240px;top:1060px;width:600px;height:130px;font-size:66px;color:#12234a;background:#ffd45c;box-shadow:0 18px 40px rgba(0,0,0,.2)">Coming soon</div>
        <div class="t" id="s5-line" style="left:60px;width:960px;top:1230px;font-size:52px;color:#3f527a;font-weight:700">Stay hydrated. Have fun.</div>
        ${mini}
        ${confettiDivs('s5c', CONF_B)}
      </section>

      <div id="iris" class="clip" data-start="0" data-duration="30" data-track-index="20"></div>

      <audio id="music" src="assets/music.wav" data-start="0" data-duration="30" data-track-index="10" data-volume="0.85"></audio>
      ${sfxTags}
    </div>

    <script>
      const CONF_A = ${JSON.stringify(CONF_A)};
      const CONF_B = ${JSON.stringify(CONF_B)};
      const tl = gsap.timeline({ paused: true });
      const E = { out: 'power3.out', back: 'back.out(1.7)', slam: 'power4.out', inout: 'power2.inOut' };
      const kin = (sel, t, step = 0.08, y = 70) => tl.fromTo(sel + ' .w', { y, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: E.back, stagger: step, immediateRender: false }, t);
      const swap = (outs, ins, t, d = 0.18) => {
        tl.to(outs, { opacity: 0, y: -26, duration: d, ease: 'power2.in' }, t - d);
        tl.fromTo(ins, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3, ease: E.out, immediateRender: false }, t);
      };
      function burst(prefix, arr, x, y, t) {
        arr.forEach((c, i) => {
          const id = '#' + prefix + i, dx = Math.cos(c.a) * c.v * 0.95, dy = Math.sin(c.a) * c.v * 0.95;
          tl.set(id, { x, y, opacity: 1, rotation: 0 }, t);
          tl.to(id, { x: x + dx, y: y + dy, rotation: c.r, duration: 0.55, ease: 'power2.out' }, t);
          tl.to(id, { y: y + dy + 560 + c.v * 0.3, x: x + dx * 1.2, rotation: c.r * 2, opacity: 0, duration: c.d, ease: 'power1.in' }, t + 0.55);
        });
      }
      // squash & stretch landing for a character wrapper (pivot at the feet)
      function land(sel, t) {
        tl.fromTo(sel, { scaleY: 1, scaleX: 1, transformOrigin: '50% 100%' }, { scaleY: 0.86, scaleX: 1.1, duration: 0.1, ease: 'power2.out', immediateRender: false }, t);
        tl.to(sel, { scaleY: 1.08, scaleX: 0.96, duration: 0.14, ease: 'power2.out' }, t + 0.1);
        tl.to(sel, { scaleY: 1, scaleX: 1, duration: 0.25, ease: E.back }, t + 0.24);
      }
      // floating droplets
      document.querySelectorAll('.drop').forEach((el) => {
        const sec = el.closest('section'), t0 = +sec.dataset.start + parseFloat(el.dataset.o), d = parseFloat(el.dataset.d) * 2.2 + 3.2;
        tl.set(el, { opacity: 0 }, 0);
        tl.fromTo(el, { y: 0, opacity: 0.0 }, { y: -2200, opacity: 0.55, duration: d, ease: 'none', immediateRender: false }, t0);
        tl.to(el, { x: 40, duration: d / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, t0);
      });

      // ---- baselines (everything that starts hidden/off-screen) ----
      tl.set('#iris', { scale: 0 }, 0);
      tl.set(['#s1-u2', '#s1-u3', '#s1-still'], { opacity: 0 }, 0);
      tl.set(['#s1-chip0', '#s1-chip1', '#s1-chip2', '#s1-chip3', '#s1-chip4'], { opacity: 0 }, 0);
      tl.set(['#s2-cap1', '#s2-cap2', '#s2-cap3', '#s2-cap4', '#s2-later', '#s2-count', '#s2-ring', '#s2-cursor', '#s2-qb', '#s2-qc'], { opacity: 0 }, 0);
      tl.set('#s2-panda', { y: 1100 }, 0);
      tl.set('#s2-bubble', { opacity: 0 }, 0);
      tl.set(['#s3-h1', '#s3-h2', '#s3-panda', '#s3-bottle'], { opacity: 0 }, 0);
      tl.set(['#s4-slot1', '#s4-slot2', '#s4-slot3', '#s4-slot4'], { x: 1100 }, 0);
      tl.set('#s4-title', { opacity: 0 }, 0);
      tl.set(['#s5-icon', '#s5-name', '#s5-tag', '#s5-web', '#s5-line'], { opacity: 0 }, 0);
      for (let i = 0; i < 5; i++) tl.set('#s5-mini' + i, { opacity: 0 }, 0);

      // ---- iris wipes on the bar lines: circle closes just before the cut, opens right after ----
      [[8, '#1a63d6'], [16, '#ffb86b'], [20, '#2f8ff0'], [24, '#8fd0ff']].forEach(([t, c]) => {
        tl.set('#iris', { backgroundColor: c }, t - 0.34);
        tl.fromTo('#iris', { scale: 0 }, { scale: 1, duration: 0.3, ease: 'power2.in', immediateRender: false }, t - 0.3);
        tl.to('#iris', { scale: 0, duration: 0.42, ease: 'power3.out' }, t + 0.03);
      });

      // ---- S1: the long stretch ----
      const clock = { m: 0 };
      const fmt = (m) => { const t = 540 + Math.round(m), h24 = Math.floor(t / 60) % 24, mm = String(t % 60).padStart(2, '0'); return ((h24 % 12) || 12) + ':' + mm + ' ' + (h24 >= 12 ? 'PM' : 'AM'); };
      tl.fromTo('#s1-time', { y: 60, opacity: 0, scale: 1.1 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: E.slam }, 0.1);
      tl.to(clock, { m: 407, duration: 5.7, ease: 'power1.inOut', onUpdate: () => { document.getElementById('s1-time').textContent = fmt(clock.m); } }, 0.3);
      tl.to('#s1-time', { color: '#ffffff', duration: 0.25, ease: 'power1.out' }, 3.9);
      tl.fromTo('#s1-u1', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.out }, 0.5);
      swap('#s1-u1', '#s1-u2', 2.4);
      swap('#s1-u2', '#s1-u3', 4.2);
      tl.to('#s1-u3', { opacity: 0, y: -20, duration: 0.2 }, 5.8);
      tl.to('#s1-dusk', { opacity: 0.94, duration: 7.2, ease: 'none' }, 0);
      tl.fromTo('#s1-bottle', { y: 140, opacity: 0, scale: 0.8, transformOrigin: '50% 100%' }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: E.back, immediateRender: false }, 0.35);
      [1.0, 1.7, 2.4, 3.1, 3.8].forEach((t, i) => {
        const side = CHIP_SIDES[i];
        tl.fromTo('#s1-chip' + i, { x: side * 380, opacity: 0, rotation: side * 8 }, { x: 0, opacity: 1, rotation: 0, duration: 0.5, ease: E.back, immediateRender: false }, t);
        tl.to('#s1-chip' + i, { y: -10, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: 3 }, t + 0.5);
      });
      kin('#s1-still', 5.95, 0.12, 80);
      tl.fromTo('#s1-still', { opacity: 1 }, { opacity: 1, duration: 0.01 }, 5.95);
      tl.fromTo('#s1-bottle', { scale: 1 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, 6.05);

      // ---- S2: the nudge (scene starts 8.0) ----
      tl.fromTo('#s2-doc', { y: 0 }, { y: -420, duration: 8, ease: 'none' }, 8);
      tl.fromTo('#s2-panda', { y: 1100 }, { y: 0, duration: 0.8, ease: 'power3.out', immediateRender: false }, 8.4);
      land('#s2-panda', 9.15);
      tl.fromTo('#s2-bubble', { scale: 0.2, opacity: 0, transformOrigin: '22% 100%' }, { scale: 1, opacity: 1, duration: 0.5, ease: E.back, immediateRender: false }, 9.8);
      kin('#s2-cap1', 9.9, 0.1);
      tl.set('#s2-cap1', { opacity: 1 }, 9.88);
      tl.fromTo('#s2-cursor', { x: 960, y: 1450, opacity: 0 }, { x: 960, y: 1450, opacity: 1, duration: 0.1, immediateRender: false }, 10.4);
      tl.to('#s2-cursor', { x: 760, y: 780, duration: 0.75, ease: E.inout }, 10.45);
      tl.to('#s2-cursor', { scale: 0.85, duration: 0.07, yoyo: true, repeat: 1 }, 11.18);
      tl.fromTo('#s2-no', { scale: 1 }, { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, 11.18);
      tl.to('#s2-p-ask', { opacity: 0, duration: 0.05 }, 11.3);
      tl.to('#s2-p-hmm', { opacity: 1, duration: 0.05 }, 11.3);
      tl.to(['#s2-qa', '#s2-yes', '#s2-no'], { opacity: 0, duration: 0.15 }, 11.3);
      tl.fromTo('#s2-qb', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.out, immediateRender: false }, 11.4);
      tl.to('#s2-cap1', { opacity: 0, y: -30, duration: 0.18 }, 11.4);
      tl.set('#s2-cap2', { opacity: 1 }, 11.55);
      kin('#s2-cap2', 11.55, 0.1);
      tl.to('#s2-cursor', { opacity: 0, duration: 0.2 }, 11.5);
      tl.to('#s2-bubble', { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' }, 12.65);
      tl.to('#s2-cap2', { opacity: 0, duration: 0.2 }, 12.6);
      tl.fromTo('#s2-later', { y: 60, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: E.back, immediateRender: false }, 12.9);
      tl.to('#s2-later', { opacity: 0, y: -30, duration: 0.25, ease: 'power2.in' }, 13.45);
      tl.to('#s2-p-hmm', { opacity: 0, duration: 0.05 }, 13.5);
      tl.to('#s2-p-ask', { opacity: 1, duration: 0.05 }, 13.5);
      tl.set(['#s2-yes', '#s2-no'], { opacity: 1, scale: 1 }, 13.55);
      tl.set('#s2-qb', { opacity: 0 }, 13.55);
      tl.fromTo('#s2-bubble', { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: E.back, immediateRender: false }, 13.6);
      tl.fromTo('#s2-qc', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.out, immediateRender: false }, 13.65);
      tl.set('#s2-cap3', { opacity: 1 }, 13.7);
      kin('#s2-cap3', 13.7, 0.1);
      tl.fromTo('#s2-cursor', { x: 960, y: 1450, opacity: 0 }, { x: 960, y: 1450, opacity: 1, duration: 0.1, immediateRender: false }, 14.0);
      tl.to('#s2-cursor', { x: 330, y: 780, duration: 0.65, ease: E.inout }, 14.05);
      tl.to('#s2-cursor', { scale: 0.85, duration: 0.07, yoyo: true, repeat: 1 }, 14.7);
      tl.fromTo('#s2-yes', { scale: 1 }, { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, 14.7);
      tl.fromTo('#s2-ring', { x: 270, y: 715, scale: 0.4, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, 14.72);
      tl.to('#s2-p-ask', { opacity: 0, duration: 0.05 }, 14.8);
      tl.to('#s2-p-joy', { opacity: 1, duration: 0.05 }, 14.8);
      tl.fromTo('#s2-panda', { y: 0 }, { y: -110, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1, immediateRender: false }, 14.8);
      burst('s2c', CONF_A, 540, 900, 14.8);
      tl.to('#s2-bubble', { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' }, 15.05);
      tl.to('#s2-cursor', { opacity: 0, duration: 0.2 }, 14.9);
      tl.to('#s2-cap3', { opacity: 0, y: -30, duration: 0.18 }, 15.0);
      tl.set('#s2-cap4', { opacity: 1 }, 15.1);
      kin('#s2-cap4', 15.1, 0.07);
      tl.fromTo('#s2-count', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: E.back, immediateRender: false }, 15.25);

      // ---- S3: payoff (16.0) ----
      tl.fromTo('#s3-rays', { rotation: 0 }, { rotation: 50, duration: 4, ease: 'none' }, 16);
      tl.set('#s3-h1', { opacity: 1 }, 16.1);
      kin('#s3-h1', 16.15, 0.1, 50);
      tl.fromTo('#s3-panda', { y: 900, opacity: 1, transformOrigin: '50% 100%' }, { y: 0, duration: 0.6, ease: 'power3.out', immediateRender: false }, 16.3);
      land('#s3-panda', 16.85);
      tl.fromTo('#s3-bottle', { x: 220, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: E.out, immediateRender: false }, 16.7);
      tl.set('#s3-h2', { opacity: 1 }, 17.65);
      kin('#s3-h2', 17.7, 0.14, 90);
      tl.fromTo('#s3-panda', { rotation: 0 }, { rotation: 4, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, 17.8);
      tl.fromTo('#s3-bottle', { y: 0 }, { y: -40, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, 17.8);

      // ---- S4: carousel (20.0 + 0.8 per buddy) ----
      tl.fromTo('#s4-title', { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.back, immediateRender: false }, 20.1);
      for (let i = 0; i < 5; i++) {
        const t = 20 + i * 0.8;
        if (i > 0) {
          tl.fromTo('#s4-slot' + i, { x: 1100 }, { x: 0, duration: 0.34, ease: 'power3.out', immediateRender: false }, t);
          tl.to('#s4-slot' + (i - 1), { x: -380, duration: 0.34, ease: 'power3.out' }, t);
          tl.set('#s4-slot' + (i - 1), { x: 1400 }, t + 0.36); // covered by the new slide: park it off-canvas
        }
        tl.fromTo('#s4-name' + i, { y: 70, scale: 0.8, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: E.back, immediateRender: false }, t + 0.12);
        tl.fromTo('#s4-ch' + i, { y: 120, scale: 0.85, transformOrigin: '50% 100%' }, { y: 0, scale: 1, duration: 0.45, ease: E.back, immediateRender: false }, t + 0.08);
        tl.fromTo('#s4-ch' + i, { rotation: 0 }, { rotation: 3, duration: 0.2, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, t + 0.45);
      }

      // ---- S5: CTA (24.0) ----
      tl.fromTo('#s5-icon', { scale: 0, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, 24.15);
      tl.fromTo('#s5-name', { y: 70, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: E.back, immediateRender: false }, 24.6);
      tl.fromTo('#s5-tag', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out, immediateRender: false }, 25.05);
      tl.fromTo('#s5-web', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: E.back, immediateRender: false }, 25.65);
      tl.fromTo('#s5-web', { scale: 1 }, { scale: 1.05, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, 26.3);
      tl.fromTo('#s5-line', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out, immediateRender: false }, 26.25);
      for (let i = 0; i < 5; i++) {
        tl.fromTo('#s5-mini' + i, { y: 320, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: E.back, immediateRender: false }, 26.5 + i * 0.15);
        tl.fromTo('#s5-mini' + i, { y: 0 }, { y: -40, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1, immediateRender: false }, 27.3 + i * 0.07);
      }
      tl.fromTo('#s5-icon', { y: 0 }, { y: -18, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 3, immediateRender: false }, 24.9);
      burst('s5c', CONF_B, 540, 560, 24.15);

      window.__timelines['main'] = tl;
    </script>
  </body>
</html>
`;
// chip fly-in side: left chips come from the left, right chips from the right
const CHIP_SIDES = CHIPS.map(([, , l]) => (l < 300 ? -1 : 1));
fs.writeFileSync('index.html', html.replace('const CONF_B = ', `const CHIP_SIDES = ${JSON.stringify(CHIP_SIDES)};\n      const CONF_B = `));
console.log('index.html written (v2)');
