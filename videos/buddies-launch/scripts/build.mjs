// Generates index.html for the Buddies launch video from the real in-app artwork.
// Run: node scripts/build.mjs
import fs from 'fs';

const CH = JSON.parse(fs.readFileSync('scripts/chars.json', 'utf8'));
let uid = 0;
// Place a character SVG; every placement gets unique gradient/clip ids.
const char = (key, width, id, extra = '') => {
  const svg = CH[key].replace(/(sp\d+)-/g, `$1p${++uid}-`).replace('<svg ', '<svg width="100%" height="100%" ');
  return `<div class="char" id="${id}" style="width:${width}px;height:${Math.round(width * 1.2)}px;${extra}">${svg}</div>`;
};

// deterministic confetti
let seed = 99;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const COLORS = ['#5cc3ff', '#ff8fb1', '#ffd45c', '#8de6b8', '#b69bff', '#ff9a5c', '#ffffff'];
const confetti = (n) => Array.from({ length: n }, () => ({
  a: -Math.PI / 2 + (rnd() - 0.5) * 2.6, v: 380 + rnd() * 620, r: (rnd() - 0.5) * 900,
  w: 12 + rnd() * 16, h: 8 + rnd() * 10, c: COLORS[Math.floor(rnd() * COLORS.length)], d: 1.1 + rnd() * 0.9,
}));
const CONF_A = confetti(44), CONF_B = confetti(60);
const confettiDivs = (prefix, arr) => arr.map((c, i) => `<div class="cf" id="${prefix}${i}" style="width:${c.w}px;height:${c.h}px;background:${c.c}"></div>`).join('');

// SFX cues: [time, file, volume]
const SFX = [
  [0.08, 'thud', 0.8], [0.88, 'thud', 0.8], [1.98, 'thud', 1.0], [3.35, 'whoosh', 0.7],
  [4.02, 'whoosh', 0.7], [5.4, 'pop3', 0.9], [6.42, 'click', 0.9], [6.5, 'yes', 0.9], [6.56, 'sparkle', 0.7], [7.0, 'pop1', 0.9],
  [8.0, 'whoosh', 0.6], [8.3, 'pop2', 0.8], [9.5, 'whoosh', 0.6], [9.8, 'pop2', 0.8], [10.2, 'boing', 0.8],
  [11.0, 'whoosh', 0.6], [11.3, 'pop2', 0.8], [12.5, 'whoosh', 0.6], [12.8, 'pop1', 0.8], [13.0, 'pop3', 0.8], [13.2, 'pop5', 0.8],
  [14.0, 'whoosh', 0.7], [14.12, 'pop4', 0.9], [14.5, 'pop1', 0.9], [14.9, 'pop2', 0.9], [15.3, 'pop3', 0.9], [15.7, 'pop4', 0.9], [16.1, 'pop5', 0.9], [16.15, 'sparkle', 0.8],
  [16.8, 'boing', 0.8], [17.2, 'boing', 0.8],
  [18.0, 'whoosh', 0.7], [18.4, 'glug', 0.8],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => [18.5 + k * 0.19, 'pop' + Math.min(5, 1 + Math.floor(k * 0.65)), 0.55]),
  [20.0, 'fanfare', 1.0], [20.04, 'sparkle', 0.8],
  [22.2, 'pop5', 1.0], [22.4, 'sparkle', 0.8], [23.2, 'pop1', 0.7], [23.35, 'pop2', 0.7], [23.5, 'pop3', 0.7], [23.65, 'pop4', 0.7], [23.8, 'pop5', 0.7], [24.1, 'yes', 0.9],
];
const sfxLen = (f) => (fs.statSync(`sfx/${f}.wav`).size - 44) / 4 / 44100;
const sfxTags = SFX.map(([t, f, v], i) =>
  `<audio id="sfx-${i}" src="sfx/${f}.wav" data-start="${t}" data-duration="${sfxLen(f).toFixed(3)}" data-track-index="${11 + (i % 9)}" data-volume="${v}"></audio>`).join('\n      ');

const NAMES = [['panda', 'Bao'], ['cat', 'Mochi'], ['bunny', 'Pip'], ['penguin', 'Pebble'], ['axolotl', 'Ollie']];
const lineup = NAMES.map(([k, n], i) => {
  const left = 60 + i * 370;
  const key = k === 'panda' ? 'panda-joy' : k + '-joy';
  return `<div class="slot" id="s4-slot${i}" style="left:${left}px"><div class="slot-in">${char(key, 340, 's4-ch' + i)}<div class="name">${n}</div></div></div>`;
}).join('\n        ');
const mini = NAMES.map(([k], i) => {
  const key = k === 'panda' ? 'panda-joy' : k + '-joy';
  return `<div class="mini" id="s6-mini${i}" style="left:${170 + i * 330}px">${char(key, 230, 's6-ch' + i)}</div>`;
}).join('\n        ');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Buddies — Launch</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0b1636; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: system-ui, sans-serif; color: #12234a; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .abs { position: absolute; }
      .t { position: absolute; font-weight: 900; letter-spacing: -0.025em; line-height: 1.02; white-space: nowrap; }
      .char { position: absolute; }
      .char svg { display: block; overflow: visible; }
      .cf { position: absolute; left: 0; top: 0; border-radius: 3px; opacity: 0; }
      .pill { position: absolute; border-radius: 999px; font-weight: 900; display: flex; align-items: center; justify-content: center; white-space: nowrap; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
      .slot { position: absolute; top: 450px; width: 340px; height: 560px; }
      .slot-in { position: absolute; inset: 0; }
      .slot .char { left: 0; top: 0; }
      .name { position: absolute; left: 0; width: 340px; top: 420px; text-align: center; font-size: 62px; font-weight: 900; color: #12234a; letter-spacing: -0.02em; }
      .mini { position: absolute; top: 740px; width: 230px; height: 276px; }
      .mini .char { left: 0; top: 0; }
      .card { position: absolute; background: #fff; border-radius: 48px; box-shadow: 0 30px 80px rgba(8, 40, 110, 0.28); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="26" data-width="1920" data-height="1080">

      <!-- ============ SCENE 1 · HOOK (0–4s) ============ -->
      <section id="s1" class="clip scene" data-start="0" data-duration="4" data-track-index="1"
        style="background: radial-gradient(ellipse at 50% 40%, #1b2f66 0%, #0b1636 70%)">
        <div id="s1-shake" class="abs" style="inset:0">
          <div class="t" id="s1-time" style="left:0;width:1920px;text-align:center;top:150px;font-size:300px;color:#fff">3:47 PM</div>
          <div class="t" id="s1-l2" style="left:0;width:1920px;text-align:center;top:520px;font-size:104px;color:#7fd0ff">0 glasses of water today.</div>
          <div class="t" id="s1-l3" style="left:0;width:1920px;text-align:center;top:690px;font-size:220px;color:#ffd54a">Again.</div>
        </div>
      </section>

      <!-- ============ SCENE 2 · MEET (4–8s) ============ -->
      <section id="s2" class="clip scene" data-start="4" data-duration="4" data-track-index="1"
        style="background: linear-gradient(180deg, #8fd0ff 0%, #d9f0ff 68%, #f3faff 100%)">
        <div class="abs" style="right:150px;top:70px;width:200px;height:200px;border-radius:50%;background:#ffe27a;box-shadow:0 0 120px 40px rgba(255,226,122,.55)"></div>
        <div class="abs" style="left:-200px;right:-200px;bottom:-330px;height:520px;border-radius:50%;background:#bfe3ff"></div>
        <div class="t" id="s2-title" style="left:110px;top:90px;font-size:170px;color:#12234a">Meet Buddies.</div>
        <div class="t" id="s2-sub" style="left:118px;top:268px;font-size:62px;color:#2f6fd0">Water reminders you will actually enjoy.</div>
        <div id="s2-panda" class="abs" style="left:0;top:0;width:620px;height:744px">
          ${char('panda-ask', 620, 's2-p-ask')}
          ${char('panda-joy', 620, 's2-p-joy', 'opacity:0')}
        </div>
        <div id="s2-bubble" class="card" style="left:930px;top:310px;width:850px;height:370px">
          <div class="t" style="left:60px;top:58px;font-size:70px;color:#12234a">Have you had some water?</div>
          <div class="pill" id="s2-yes" style="left:60px;top:200px;width:430px;height:112px;font-size:52px;color:#fff;background:linear-gradient(180deg,#1f78e6,#0f55c2);box-shadow:0 12px 26px rgba(15,85,194,.45)">Yes, I have!</div>
          <div class="pill" style="left:520px;top:200px;width:270px;height:112px;font-size:50px;color:#4a5875;background:#eef2fa">Not yet</div>
          <div class="abs" style="left:150px;bottom:-26px;width:52px;height:52px;background:#fff;transform:rotate(45deg);border-radius:8px"></div>
        </div>
        <svg id="s2-cursor" class="abs" style="left:0;top:0;width:90px;height:90px;overflow:visible" viewBox="0 0 24 24">
          <path d="M3 2 L3 19 L8 14.6 L11.4 21.5 L14.2 20.2 L10.9 13.4 L17.5 13.2 Z" fill="#fff" stroke="#12234a" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        <div class="abs" id="s2-ring" style="left:0;top:0;width:120px;height:120px;border-radius:50%;border:8px solid #fff;opacity:0"></div>
        ${confettiDivs('s2c', CONF_A)}
      </section>

      <!-- ============ SCENE 3 · WHAT IT DOES (8–14s) ============ -->
      <section id="s3" class="clip scene" data-start="8" data-duration="6" data-track-index="1"
        style="background: linear-gradient(135deg, #1a5fd0 0%, #2f8ff0 100%)">
        <div class="abs" style="left:-160px;top:-200px;width:700px;height:700px;border-radius:50%;background:rgba(255,255,255,.12)"></div>
        <div class="abs" style="right:-200px;bottom:-260px;width:900px;height:900px;border-radius:50%;background:rgba(255,255,255,.10)"></div>

        <div id="s3a" class="abs" style="inset:0">
          <div class="t" style="left:120px;top:300px;font-size:140px;color:#fff">Walks onto<br/>your screen.</div>
          <div class="card" style="left:1000px;top:170px;width:780px;height:640px;border-radius:36px;background:#f4f9ff">
            <div class="abs" style="left:0;top:0;right:0;height:70px;background:#dfeaf8;border-radius:36px 36px 0 0"></div>
            <div class="abs" style="left:30px;top:24px;width:22px;height:22px;border-radius:50%;background:#ff6b6b"></div>
            <div class="abs" style="left:66px;top:24px;width:22px;height:22px;border-radius:50%;background:#ffc94d"></div>
            <div class="abs" style="left:102px;top:24px;width:22px;height:22px;border-radius:50%;background:#46d369"></div>
            <div class="abs" style="left:60px;top:120px;width:420px;height:26px;border-radius:13px;background:#dde7f5"></div>
            <div class="abs" style="left:60px;top:170px;width:560px;height:26px;border-radius:13px;background:#e6edf8"></div>
            <div class="abs" style="left:60px;top:220px;width:340px;height:26px;border-radius:13px;background:#e6edf8"></div>
            <div id="s3a-panda" class="abs" style="left:300px;top:150px;width:520px;height:624px">${char('panda-ask', 520, 's3a-p')}</div>
          </div>
        </div>

        <div id="s3b" class="abs" style="inset:0;opacity:0">
          <div class="t" style="left:120px;top:300px;font-size:140px;color:#fff">Reacts to<br/>how you feel.</div>
          <div class="abs" style="left:1060px;top:130px;width:640px;height:768px">
            <div class="abs" id="s3b-hmm" style="left:0;top:0;width:640px;height:768px">${char('panda-hmm', 640, 's3b-p1')}</div>
            <div class="abs" id="s3b-joy" style="left:0;top:0;width:640px;height:768px;opacity:0">${char('panda-joy', 640, 's3b-p2')}</div>
          </div>
          <div class="pill" id="s3b-chip1" style="left:760px;top:760px;width:330px;height:100px;font-size:50px;color:#4a5875;background:#fff;box-shadow:0 14px 30px rgba(8,40,110,.25)">Not yet</div>
          <div class="pill" id="s3b-chip2" style="left:1130px;top:760px;width:420px;height:100px;font-size:50px;color:#0a3d2a;background:linear-gradient(180deg,#7ee8b4,#4fd09a);box-shadow:0 14px 30px rgba(8,90,60,.3)">Yes, I have!</div>
        </div>

        <div id="s3c" class="abs" style="inset:0;opacity:0">
          <div class="t" style="left:120px;top:300px;font-size:140px;color:#fff">Little games<br/>for breaks.</div>
          <div class="card" id="s3c-card" style="left:1030px;top:150px;width:720px;height:700px;background:linear-gradient(180deg,#e3f4ff,#f4efff);border-radius:44px">
            <div class="t" style="left:44px;top:34px;font-size:50px;color:#12234a">Drop Catch</div>
            <div class="t" id="s3c-score" style="right:44px;top:34px;font-size:50px;color:#2f8ff0">0 pts</div>
            ${[0, 1, 2, 3, 4].map((i) => `<div class="abs" id="s3c-d${i}" style="left:${90 + i * 130}px;top:90px;width:44px;height:60px;background:#46aef7;border-radius:50% 50% 50% 50% / 62% 62% 38% 38%;clip-path:polygon(50% 0%,100% 55%,100% 100%,0 100%,0 55%)"></div>`).join('')}
            <div class="abs" id="s3c-cup" style="left:300px;top:540px;width:130px;height:110px;background:rgba(210,235,255,.95);border:7px solid #7cc4f2;border-radius:8px 8px 26px 26px;clip-path:polygon(0 0,100% 0,85% 100%,15% 100%)"></div>
          </div>
        </div>

        <div id="s3d" class="abs" style="inset:0;opacity:0">
          <div class="t" style="left:120px;top:300px;font-size:140px;color:#fff">On your<br/>schedule.</div>
          <div class="card" style="left:1030px;top:190px;width:720px;height:620px;border-radius:44px">
            <div class="t" style="left:50px;top:44px;font-size:48px;color:#3f527a">Remind me</div>
            <div class="pill" id="s3d-t1" style="left:50px;top:150px;width:290px;height:120px;font-size:64px;color:#fff;background:#2f8ff0">9:30</div>
            <div class="pill" id="s3d-t2" style="left:370px;top:150px;width:290px;height:120px;font-size:64px;color:#0d2a5c;background:#7fd0ff">11:30</div>
            <div class="pill" id="s3d-t3" style="left:50px;top:300px;width:290px;height:120px;font-size:64px;color:#4a0f2a;background:#ff9fbd">2:00</div>
            <div class="pill" id="s3d-t4" style="left:370px;top:300px;width:290px;height:120px;font-size:64px;color:#12234a;background:#ffd45c">4:30</div>
            <div class="t" style="left:50px;top:480px;font-size:48px;color:#3f527a">or every 45 minutes</div>
          </div>
        </div>
      </section>

      <!-- ============ SCENE 4 · PICK YOUR BUDDY (14–18s) ============ -->
      <section id="s4" class="clip scene" data-start="14" data-duration="4" data-track-index="1"
        style="background: linear-gradient(135deg, #ffe9c7 0%, #ffd3e3 100%)">
        <div class="abs" style="left:-220px;top:-220px;width:760px;height:760px;border-radius:50%;background:rgba(255,255,255,.35)"></div>
        <div class="abs" style="right:-260px;bottom:-300px;width:900px;height:900px;border-radius:50%;background:rgba(255,255,255,.28)"></div>
        <div class="t" id="s4-title" style="left:0;width:1920px;text-align:center;top:70px;font-size:170px;color:#12234a">Pick your buddy.</div>
        <div class="t" id="s4-sub" style="left:0;width:1920px;text-align:center;top:262px;font-size:60px;color:#b8456f">Five characters. One mission.</div>
        ${lineup}
      </section>

      <!-- ============ SCENE 5 · GOAL (18–22s) ============ -->
      <section id="s5" class="clip scene" data-start="18" data-duration="4" data-track-index="1"
        style="background: radial-gradient(ellipse at 50% 55%, #2a5fc2 0%, #0d1b3d 75%)">
        <div class="t" id="s5-title" style="left:0;width:1920px;text-align:center;top:60px;font-size:128px;color:#fff">Small sips. Big streaks.</div>
        <svg class="abs" id="s5-ring" style="left:660px;top:250px;width:600px;height:600px;overflow:visible" viewBox="0 0 600 600">
          <circle cx="300" cy="300" r="240" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="46"/>
          <circle id="s5-arc" cx="300" cy="300" r="240" fill="none" stroke="#5cc3ff" stroke-width="46" stroke-linecap="round"
            stroke-dasharray="1508" stroke-dashoffset="1508" transform="rotate(-90 300 300)"/>
        </svg>
        <div class="t" id="s5-count" style="left:660px;width:600px;text-align:center;top:420px;font-size:190px;color:#fff">0/8</div>
        <div class="t" id="s5-goal" style="left:0;width:1920px;text-align:center;top:880px;font-size:120px;color:#ffd54a">Goal reached!</div>
        <div id="s5-panda" class="abs" style="left:110px;top:430px;width:440px;height:528px">${char('panda-joy', 440, 's5-p')}</div>
        <div class="pill" id="s5-streak" style="left:1350px;top:420px;width:470px;height:130px;font-size:56px;color:#12234a;background:#ffd45c;box-shadow:0 18px 40px rgba(0,0,0,.3);gap:18px">
          <svg width="56" height="64" viewBox="0 0 28 32"><path d="M14 1 C15 8 24 12 24 21 A10 10 0 0 1 4 21 C4 16 7 14 8 10 C10 13 11 13 12 12 C13 9 12 5 14 1Z" fill="#ff6b3d" stroke="#12234a" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 16 C16 19 19 20 19 24 A5 5 0 0 1 9 24 C9 21 12 20 14 16Z" fill="#ffd45c"/></svg>
          7-day streak
        </div>
        ${confettiDivs('s5c', CONF_B)}
      </section>

      <!-- ============ SCENE 6 · CTA (22–26s) ============ -->
      <section id="s6" class="clip scene" data-start="22" data-duration="4" data-track-index="1"
        style="background: linear-gradient(180deg, #8fd0ff 0%, #e4f4ff 75%, #f6fbff 100%)">
        <div class="abs" style="left:-200px;right:-200px;bottom:-380px;height:520px;border-radius:50%;background:#bfe3ff"></div>
        <img id="s6-icon" class="abs" src="assets/icon.png" style="left:150px;top:90px;width:520px;height:520px" alt="" />
        <div class="t" id="s6-name" style="left:760px;top:110px;font-size:250px;color:#12234a">Buddies</div>
        <div class="t" id="s6-tag" style="left:770px;top:430px;font-size:80px;color:#2f6fd0">Your desktop water buddies.</div>
        <div class="t" id="s6-line" style="left:774px;top:560px;font-size:58px;color:#3f527a;font-weight:700">Stay hydrated. Have fun.</div>
        ${mini}
      </section>

      <div id="flash" class="clip" data-start="0" data-duration="26" data-track-index="20"></div>

      <audio id="music" src="assets/music.wav" data-start="0" data-duration="26" data-track-index="10" data-volume="0.85"></audio>
      ${sfxTags}
    </div>

    <script>
      const CONF_A = ${JSON.stringify(CONF_A)};
      const CONF_B = ${JSON.stringify(CONF_B)};
      const tl = gsap.timeline({ paused: true });
      const E = { out: 'power3.out', back: 'back.out(1.8)', slam: 'expo.out', inout: 'power2.inOut' };

      // burst confetti from (x,y) in a scene, starting at time t
      function burst(prefix, arr, x, y, t) {
        arr.forEach((c, i) => {
          const id = '#' + prefix + i, dx = Math.cos(c.a) * c.v * 0.9, dy = Math.sin(c.a) * c.v * 0.9;
          tl.set(id, { x: x, y: y, opacity: 1, rotation: 0 }, t);
          tl.to(id, { x: x + dx, y: y + dy, rotation: c.r, duration: 0.55, ease: 'power2.out' }, t);
          tl.to(id, { y: y + dy + 520 + c.v * 0.3, x: x + dx * 1.25, rotation: c.r * 2, opacity: 0, duration: c.d, ease: 'power1.in' }, t + 0.55);
        });
      }

      // ---- flash cuts on the beat ----
      [4, 8, 14, 18, 22].forEach((t) => {
        tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.9, duration: 0.05, ease: 'none' }, t - 0.03);
        tl.to('#flash', { opacity: 0, duration: 0.3, ease: 'power2.out' }, t + 0.02);
      });

      // ---- S1: hook ----
      tl.fromTo('#s1-time', { scale: 1.35, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: E.slam }, 0.05);
      tl.fromTo('#s1-l2', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: E.out }, 0.85);
      tl.fromTo('#s1-l3', { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: E.slam }, 1.98);
      for (let k = 0; k < 6; k++) tl.to('#s1-shake', { x: k % 2 ? 14 : -14, y: k % 2 ? -8 : 8, duration: 0.035 }, 2.0 + k * 0.035);
      tl.to('#s1-shake', { x: 0, y: 0, duration: 0.05 }, 2.22);
      for (let k = 0; k < 7; k++) tl.fromTo('#s1-time', { scale: 1 }, { scale: 1.03, duration: 0.08, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.5 + k * 0.5);
      tl.to(['#s1-time', '#s1-l2', '#s1-l3'], { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' }, 3.55);

      // ---- S2: meet Buddies (local scene starts at 4.0) ----
      tl.fromTo('#s2-panda', { x: -760, y: 330 }, { x: 150, y: 330, duration: 1.4, ease: 'power2.out' }, 4.0);
      for (let k = 0; k < 8; k++) tl.fromTo('#s2-panda', { y: 330 }, { y: 308, duration: 0.09, yoyo: true, repeat: 1, ease: 'sine.out' }, 4.05 + k * 0.17);
      tl.fromTo('#s2-bubble', { scale: 0.2, opacity: 0, transformOrigin: '8% 100%' }, { scale: 1, opacity: 1, duration: 0.45, ease: E.back }, 5.4);
      tl.fromTo('#s2-cursor', { x: 1620, y: 900, opacity: 0 }, { x: 1620, y: 900, opacity: 1, duration: 0.1 }, 5.7);
      tl.to('#s2-cursor', { x: 1180, y: 560, duration: 0.7, ease: E.inout }, 5.75);
      tl.to('#s2-cursor', { scale: 0.85, duration: 0.07, yoyo: true, repeat: 1 }, 6.43);
      tl.fromTo('#s2-yes', { scale: 1 }, { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1 }, 6.43);
      tl.fromTo('#s2-ring', { x: 1070, y: 495, scale: 0.4, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.5, ease: 'power2.out' }, 6.45);
      tl.to('#s2-p-ask', { opacity: 0, duration: 0.05 }, 6.5);
      tl.to('#s2-p-joy', { opacity: 1, duration: 0.05 }, 6.5);
      tl.fromTo('#s2-panda', { y: 330 }, { y: 250, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 }, 6.5);
      tl.to('#s2-bubble', { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' }, 7.05);
      burst('s2c', CONF_A, 1180, 540, 6.5);
      tl.fromTo('#s2-title', { y: 60, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: E.back }, 7.0);
      tl.fromTo('#s2-sub', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: E.out }, 7.25);
      tl.to('#s2-panda', { x: 520, duration: 0.8, ease: 'power2.inOut' }, 7.1);

      // ---- S3: features (local scene starts at 8.0) ----
      tl.fromTo('#s3a > .t', { x: -120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: E.out }, 8.1);
      tl.fromTo('#s3a-panda', { x: 700 }, { x: 0, duration: 0.7, ease: 'power3.out' }, 8.2);
      for (let k = 0; k < 4; k++) tl.fromTo('#s3a-panda', { y: 0 }, { y: -16, duration: 0.1, yoyo: true, repeat: 1 }, 8.35 + k * 0.2);
      tl.to('#s3a', { opacity: 0, x: -90, duration: 0.2, ease: 'power2.in' }, 9.3);

      tl.fromTo('#s3b', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.3, ease: E.out }, 9.5);
      tl.fromTo('#s3b-chip1', { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.back }, 9.8);
      tl.fromTo('#s3b-chip2', { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: E.back }, 10.05);
      tl.to('#s3b-hmm', { opacity: 0, duration: 0.05 }, 10.2);
      tl.to('#s3b-joy', { opacity: 1, duration: 0.05 }, 10.2);
      tl.fromTo('#s3b-joy', { y: 0 }, { y: -60, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 }, 10.2);
      tl.fromTo('#s3b-chip2', { scale: 1 }, { scale: 1.12, duration: 0.12, yoyo: true, repeat: 1 }, 10.2);
      tl.to('#s3b', { opacity: 0, x: -90, duration: 0.2, ease: 'power2.in' }, 10.8);

      tl.fromTo('#s3c', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.3, ease: E.out }, 11.0);
      for (let i = 0; i < 5; i++) {
        tl.fromTo('#s3c-d' + i, { y: 0, opacity: 1 }, { y: 440 + (i % 2) * 20, duration: 0.9, ease: 'power1.in' }, 11.25 + i * 0.12);
        tl.to('#s3c-d' + i, { opacity: 0, duration: 0.05 }, 12.2 + i * 0.12);
      }
      tl.fromTo('#s3c-cup', { x: -140 }, { x: 320, duration: 1.1, ease: 'sine.inOut' }, 11.25);
      const pts = { v: 0 };
      tl.to(pts, { v: 24, duration: 1.0, ease: 'none', onUpdate: () => { document.getElementById('s3c-score').textContent = Math.round(pts.v) + ' pts'; } }, 11.3);
      tl.to('#s3c', { opacity: 0, x: -90, duration: 0.2, ease: 'power2.in' }, 12.3);

      tl.fromTo('#s3d', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.3, ease: E.out }, 12.5);
      [['#s3d-t1', 12.8], ['#s3d-t2', 13.0], ['#s3d-t3', 13.2], ['#s3d-t4', 13.4]].forEach(([id, t]) => tl.fromTo(id, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: E.back }, t));

      // ---- S4: lineup (local scene starts at 14.0) ----
      tl.fromTo('#s4-title', { y: -120, opacity: 0, scale: 1.2 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: E.slam }, 14.1);
      tl.fromTo('#s4-sub', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: E.out }, 14.35);
      [14.5, 14.9, 15.3, 15.7, 16.1].forEach((t, i) => {
        tl.fromTo('#s4-slot' + i, { y: 420, scale: 0.2, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: E.back }, t);
      });
      [16.8, 17.2].forEach((t) => {
        for (let i = 0; i < 5; i++) tl.fromTo('#s4-slot' + i, { y: 0 }, { y: -55, duration: 0.17, ease: 'power2.out', yoyo: true, repeat: 1 }, t + i * 0.025);
      });

      // ---- S5: goal (local scene starts at 18.0) ----
      tl.fromTo('#s5-title', { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.slam }, 18.1);
      tl.fromTo('#s5-ring', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: E.back }, 18.2);
      tl.fromTo('#s5-panda', { x: -500 }, { x: 0, duration: 0.6, ease: 'power3.out' }, 18.3);
      const cnt = { v: 0 };
      tl.to('#s5-arc', { strokeDashoffset: 0, duration: 1.5, ease: 'power1.inOut' }, 18.45);
      tl.to(cnt, { v: 8, duration: 1.5, ease: 'steps(8)', onUpdate: () => { document.getElementById('s5-count').textContent = Math.round(cnt.v) + '/8'; } }, 18.45);
      tl.to('#s5-arc', { stroke: '#7ee8b4', duration: 0.2 }, 19.9);
      tl.fromTo('#s5-count', { scale: 1 }, { scale: 1.18, duration: 0.15, yoyo: true, repeat: 1 }, 20.0);
      tl.fromTo('#s5-goal', { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: E.slam }, 20.0);
      tl.fromTo('#s5-streak', { x: 500, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: E.back }, 20.3);
      tl.fromTo('#s5-panda', { y: 0 }, { y: -70, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 3 }, 20.0);
      burst('s5c', CONF_B, 960, 540, 20.0);

      // ---- S6: CTA (local scene starts at 22.0) ----
      tl.fromTo('#s6-icon', { scale: 0, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2.2)' }, 22.15);
      tl.fromTo('#s6-name', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: E.out }, 22.35);
      tl.fromTo('#s6-tag', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out }, 22.6);
      tl.fromTo('#s6-line', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.out }, 22.85);
      for (let i = 0; i < 5; i++) {
        tl.fromTo('#s6-mini' + i, { y: 320, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: E.back }, 23.15 + i * 0.15);
        tl.fromTo('#s6-mini' + i, { y: 0 }, { y: -40, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 }, 24.05 + i * 0.07);
      }
      tl.fromTo('#s6-icon', { y: 0 }, { y: -18, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 23.6);

      window.__timelines['main'] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('index.html written', html.length, 'bytes');
