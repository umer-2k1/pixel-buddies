(function () {
  const pf = window.pf;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const charEl = document.getElementById('char');
  const bubble = document.getElementById('bubble');
  const bText = document.getElementById('bubble-text');
  const bBtns = document.getElementById('bubble-btns');
  const m = new Mascot(charEl);
  m.onStep = () => Sound.play('step');

  const S = {
    x: 0, lift: 0, vy: 0, dir: 1, scale: 1,
    state: 'idle', // idle | asking | busy | drag | sleeping
    away: false,
    snap: null,
    hover: { char: false, bubble: false },
    dragging: false, falling: false,
    askTimer: null, bubbleTimer: null,
    pokes: [],
    walk: null,
    wa: { x: 0, y: 0, width: window.screen.availWidth, height: window.screen.availHeight }, // work area
    win: { x: null, y: null, w: 0, h: 0 }, // last window geometry sent to main
  };
  const W = () => S.wa.width; // logical stage width = the usable screen width
  const CH = () => 288 * S.scale;
  const CW = () => 240 * S.scale;
  // The overlay window is only as big as Bao plus his speech bubble (it moves
  // with him) — it never covers the rest of the screen.
  const winW = () => Math.max(330, Math.round(CW()) + 90);
  const winH = () => Math.round(CH()) + 175;
  const set = () => S.snap && S.snap.settings;
  const vars = () => ({ name: (set() && set().userName) || '', mascot: Characters.get(set() && set().character).name });

  // ---------- layout ----------
  // S.x is Bao's centre in screen space (relative to the work area). The window
  // is placed around him; when a bubble is showing it is kept fully on screen
  // and Bao slides inside it instead.
  let charCx = 0; // Bao's centre inside the window, in px
  function layout() {
    const w = winW(), h = winH();
    const bubbleOn = !bubble.classList.contains('hidden');
    let left = S.wa.x + S.x - w / 2;
    if (bubbleOn) left = clamp(left, S.wa.x, S.wa.x + S.wa.width - w);
    // macOS never lets a window leave the screen entirely (>=40px stays visible); clamp here
    // so the character is drawn at its true position instead of drifting by the difference.
    left = clamp(left, S.wa.x - w + 40, S.wa.x + S.wa.width - 40);
    const top = S.wa.y + S.wa.height - h - S.lift;
    // Electron rejects NaN/Infinity/-0 window coordinates, so always send clean integers.
    const I = (n) => (Number.isFinite(n) ? Math.round(n) : 0) + 0;
    const lx = I(left), ty = I(top);
    if (S.win.w !== w || S.win.h !== h) { S.win.w = w; S.win.h = h; pf.resize(w, h); }
    if (S.win.x !== lx || S.win.y !== ty) { S.win.x = lx; S.win.y = ty; pf.move(lx, ty); }
    charCx = S.wa.x + S.x - lx;
    charEl.style.width = CW() + 'px';
    charEl.style.height = CH() + 'px';
    charEl.style.transform = `translate3d(${(charCx - CW() / 2).toFixed(1)}px, 0, 0)`;
    m.svg.style.transform = `scaleX(${S.dir})`;
    if (bubbleOn) placeBubble();
  }
  function placeBubble() {
    const bw = 270;
    const left = clamp(charCx - bw / 2, 8, winW() - bw - 8);
    bubble.style.left = left + 'px';
    bubble.style.bottom = CH() * 0.86 + 2 + 'px';
    bubble.style.setProperty('--tail-x', clamp(charCx - left, 28, bw - 28) + 'px');
  }

  // ---------- click-through ----------
  let ignoring = true;
  function updateIgnore() {
    const want = !(S.hover.char || S.hover.bubble || S.dragging || S.pinned);
    if (want !== ignoring) { ignoring = want; pf.setIgnoreMouse(want); }
  }
  // delegated, so the character can be swapped (new SVG) without re-binding
  const onHit = (type, fn) => charEl.addEventListener(type, (e) => { if (e.target.closest && e.target.closest('.hit')) fn(e); });
  onHit('pointerover', () => { S.hover.char = true; updateIgnore(); });
  onHit('pointerout', () => { S.hover.char = false; updateIgnore(); });
  bubble.addEventListener('pointerenter', () => { S.hover.bubble = true; updateIgnore(); });
  bubble.addEventListener('pointerleave', () => { S.hover.bubble = false; updateIgnore(); });

  // eyes follow the cursor when it is near
  let lastMove = 0;
  window.addEventListener('mousemove', (e) => {
    // Hit-test by position: forwarded mouse-moves are the one signal that always arrives.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    S.hover.bubble = !!(el && el.closest && el.closest('#bubble'));
    S.hover.char = !!(el && el.classList && el.classList.contains('hit'));
    updateIgnore();
    lastMove = performance.now();
    const cx = charCx, cy = window.innerHeight - CH() * 0.55;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    if (Math.hypot(dx, dy) > 650) { m.pointer = null; return; }
    m.pointer = { x: clamp(dx / 220, -1, 1), y: clamp(dy / 220, -1, 1) };
  });
  setInterval(() => { if (m.pointer && performance.now() - lastMove > 3500) m.pointer = null; }, 1000);

  // ---------- bubble ----------
  function showBubble(text, buttons = [], ttl = 0) {
    clearTimeout(S.bubbleTimer);
    bText.textContent = text;
    bBtns.innerHTML = '';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = b.cls; el.textContent = b.label;
      el.addEventListener('click', () => { Sound.play('tick'); b.onClick(); });
      bBtns.appendChild(el);
    });
    if (bubble.classList.contains('hidden')) {
      Sound.play('pop');
      bubble.classList.remove('hidden');
      bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = '';
    }
    S.pinned = buttons.length > 0; // a question is on screen: never depend on hover detection
    updateIgnore();
    placeBubble();
    if (ttl) S.bubbleTimer = setTimeout(hideBubble, ttl);
  }
  function hideBubble() {
    clearTimeout(S.bubbleTimer);
    bubble.classList.add('hidden');
    S.pinned = false;
    S.hover.bubble = false; updateIgnore();
  }

  // ---------- movement ----------
  // Walking eases in and out (smoothstep over the first/last ~170px) so
  // arrivals and departures read as natural rather than mechanical.
  const RAMP = 130;
  m.addTicker((dt) => {
    if (S.walk) {
      const w = S.walk;
      if (w.ctx.dead) { finishWalk(); }
      else {
        const dist = w.tx - S.x;
        const done = Math.abs(S.x - w.x0);
        const edge = Math.min(done, Math.abs(dist));
        const k = clamp(edge / RAMP, 0, 1);
        const f = 0.4 + 0.6 * (k * k * (3 - 2 * k));
        const step = w.speed * f * dt;
        if (Math.abs(dist) <= Math.max(step, 0.6)) { S.x = w.tx; finishWalk(); }
        else S.x += Math.sign(dist) * step;
      }
    }
    if (S.dragging) {
      m.hot = true;
      m.tw = m.tw.filter((t) => t.k !== 'rot');
      m.v.rot += (clamp(S.dragVx * 0.04, -16, 16) - m.v.rot) * Math.min(1, dt * 10);
      S.dragVx *= 0.9;
    } else if (S.falling) {
      m.hot = true;
      S.vy -= 2400 * dt;
      S.lift += S.vy * dt;
      if (S.lift <= 0) {
        S.lift = 0;
        if (S.vy < -380) { S.vy = -S.vy * 0.32; Sound.play('land'); m.tween({ sy: 0.82, sx: 1.14 }, 70).then(() => m.tween({ sy: 1, sx: 1 }, 220, 'back')); }
        else { S.falling = false; S.vy = 0; m.hot = false; onLanded(); }
      }
    }
    layout();
  });
  function finishWalk() {
    const w = S.walk; S.walk = null;
    m.setWalking(false); m.hot = false;
    if (!S.dragging) m.tween({ rot: 0 }, 350);
    w && w.resolve();
  }
  // opts.offscreen lets the target sit outside the visible area (exit/entrance).
  function walkTo(c, tx, speed = 170, opts = {}) {
    return new Promise((resolve) => {
      if (!opts.offscreen) tx = clamp(tx, 60, W() - 60);
      if (Math.abs(tx - S.x) < 4) return resolve();
      S.dir = tx > S.x ? 1 : -1;
      S.walk = { tx, speed, ctx: c, resolve, x0: S.x };
      m.tween({ rot: 3 }, 400); // lean into the walk
      m.setWalking(true); m.hot = true;
    }).then(() => c.check());
  }
  const faceUser = () => { S.dir = S.x < W() / 2 ? 1 : -1; };

  const neutral = () => {
    const o = { ...Mascot.REST, ...Mascot.EMO.neutral };
    delete o.x; delete o.water;
    return o;
  };
  const restTo = (c, ms = 280) => c.to(neutral(), ms);

  // ---------- confetti ----------
  const cv = document.getElementById('confetti');
  const cx2 = cv.getContext('2d');
  let parts = [], confettiOn = false, lastC = 0;
  function sizeCanvas() { cv.width = innerWidth; cv.height = innerHeight; }
  sizeCanvas();
  window.addEventListener('resize', () => { sizeCanvas(); S.x = clamp(S.x, 60, W() - 60); });
  function confetti(n = 60) {
    const colors = ['#5cc3ff', '#ff8fb1', '#ffd45c', '#8de6b8', '#b69bff', '#ff9a5c'];
    const ox = charCx, oy = innerHeight - CH() * 0.7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1), sp = rand(300, 760);
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(3, 6.5), c: pick(colors), rot: rand(0, 6), vr: rand(-9, 9), life: rand(1.6, 2.6), age: 0, drop: Math.random() < 0.3 });
    }
    if (!confettiOn) { confettiOn = true; lastC = performance.now(); requestAnimationFrame(drawConfetti); }
  }
  function drawConfetti(t) {
    const dt = Math.min(0.04, (t - lastC) / 1000); lastC = t;
    cx2.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.age < p.life);
    for (const p of parts) {
      p.age += dt; p.vy += 900 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      cx2.globalAlpha = clamp((p.life - p.age) / 0.5, 0, 1);
      cx2.fillStyle = p.c;
      cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.rot);
      if (p.drop) { cx2.beginPath(); cx2.arc(0, 2, p.r, 0, 7); cx2.moveTo(-p.r, 1); cx2.lineTo(0, -p.r * 2.2); cx2.lineTo(p.r, 1); cx2.fill(); }
      else cx2.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      cx2.restore();
    }
    if (parts.length) requestAnimationFrame(drawConfetti);
    else { confettiOn = false; cx2.clearRect(0, 0, cv.width, cv.height); }
  }

  // ---------- presence (walk in / out) ----------
  // Entrance is always left -> right and settles on the right-hand side;
  // exit is always right -> left, so the whole sequence reads as one gesture.
  const ENTER_SPEED = 240, EXIT_SPEED = 225, LINGER_MS = 4500;
  async function enter(c) {
    if (!S.away) return;
    S.away = false;
    S.x = -150; S.dir = 1;
    layout();
    m.set({ ...neutral() });
    c.emo('happy', 500);
    Sound.play('appear');
    await walkTo(c, W() * rand(0.58, 0.74), ENTER_SPEED);
    // settle: turn to the user, a little "ta-da" hop
    S.dir = S.x < W() / 2 ? 1 : -1;
    await c.wait(250);
    await m.hop(c, 22, 380);
  }
  async function leave(c) {
    // say goodbye first, then stroll off to the left across the whole screen
    c.emo('happy', 250);
    await m.wave(c, 2);
    await c.wait(250);
    S.dir = -1;
    c.emo('neutral', 300);
    // never rush: the exit always takes at least ~3.5s, however close to the edge it is
    const speed = clamp((S.x + 170) / 3.5, 110, EXIT_SPEED);
    await walkTo(c, -170, speed, { offscreen: true });
    S.away = true;
  }
  const wantsAway = () => set() && set().presence === 'reminders';

  // ---------- reminder flow ----------
  // "see you in 10 min" / "tomorrow at 9:00 AM" — so it never looks like Bao just died.
  function returnText() {
    const sn = S.snap;
    if (!sn || !sn.nextDueAt) return '';
    const mins = Math.round((sn.nextDueAt - Date.now()) / 60000);
    if (mins < 1) return '';
    if (mins < 90) return `See you in ${mins} min 👋`;
    const d = new Date(sn.nextDueAt);
    const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `See you ${d.toDateString() === new Date().toDateString() ? 'at' : 'tomorrow at'} ${t} 👋`;
  }

  function askText(info) {
    if (info.kind === 'launch') return Lines.pick('launch', vars());
    const k = info.attempt === 0 ? 'ask' : info.attempt >= (set().maxRetries) ? 'askLastTry' : 'askRetry';
    return Lines.pick(k, vars());
  }

  async function ask(info) {
    clearTimeout(S.askTimer);
    S.state = 'asking';
    S.askInfo = info;
    hideBubble();
    await m.run(async (c) => {
      if (S.away) await enter(c);
      else {
        // already on screen: just get its attention, never vanish and re-enter
        if (S.x < 200 || S.x > W() - 200) await walkTo(c, clamp(S.x, 220, W() - 220), 150);
        S.dir = S.x < W() / 2 ? 1 : -1;
        Sound.play('appear');
        await m.hop(c, 30, 380);
      }
      c.emo('ask', 220);
      showBubble(askText(info), [
        { cls: 'yes', label: 'Yes, I have! 💧', onClick: () => choose('yes') },
        { cls: 'no', label: 'Not yet', onClick: () => choose('no') },
        { cls: 'later', label: 'Remind me later', onClick: () => choose('later') },
      ]);
      Sound.play('ask');
      m.emote('💧', { x: 222, y: 96, dy: -34, ms: 1600, size: 24 });
      S.askTimer = setTimeout(() => S.state === 'asking' && choose('timeout'), (set().answerTimeoutSec || 90) * 1000);
      await askGestures(c);
    });
  }

  // While waiting: calm, friendly loop — hold the bottle out, small wave, rest.
  async function askGestures(c) {
    for (;;) {
      await m.offer(c, 1);
      await c.wait(1800);
      await c.to({ rArm: Mascot.REST.rArm, bottle: Mascot.REST.bottle }, 320);
      await c.wait(2400);
      await m.wave(c, 1);
      await c.wait(3200);
    }
  }

  function afterReaction(c) {
    return (async () => {
      await restTo(c);
      if (S.snap && S.snap.awaiting) { S.state = 'idle'; return; }
      if (wantsAway()) {
        // stay visible for a beat so the exit never feels like a vanish
        await c.wait(LINGER_MS);
        hideBubble();
        await leave(c);
      } else hideBubble();
      S.state = S.snap && S.snap.paused ? 'sleeping' : 'idle';
      if (S.state === 'sleeping') sleepLoop();
    })();
  }

  function choose(kind) {
    clearTimeout(S.askTimer);
    if (S.state !== 'asking') return;
    const count = (S.snap.today.yes || 0) + 1;
    const goal = set().goal;
    pf.answer(kind);
    S.state = 'busy';
    if (kind === 'yes') reactYes(count, goal);
    else if (kind === 'no') reactNo();
    else if (kind === 'later') reactLater();
    else reactTimeout();
  }

  // YES: warm smile, one proud hop, tasteful confetti, a shared sip. ~4s.
  function reactYes(count, goal) {
    const goalHit = count === goal;
    m.run(async (c) => {
      c.emo('joy', 180);
      Sound.play(goalHit ? 'big' : 'yes');
      showBubble(goalHit ? Lines.pick('goal', vars()) : Lines.pick('yes', vars()), [], 0);
      confetti(goalHit ? 90 : 26);
      m.burst(goalHit ? ['🎉', '⭐', '💙', '✨'] : ['💙', '✨', '⭐'], goalHit ? 10 : 5);
      c.to({ lArm: 150, rArm: 150, bottle: 14 }, 200, 'out');
      await m.hop(c, 40, 420);
      if (goalHit) await m.cheer(c, 2);
      await c.wait(150);
      showBubble(`${count}/${goal} today · ${returnText() || Lines.pick('sip', vars())}`, [], 0);
      await m.sip(c, { gulps: 2, amount: 0.12 });
      Sound.play('sparkle');
      m.emote('😊', { x: 150, y: 70, dy: -40, ms: 1500, size: 28 });
      c.emo('happy', 220);
      c.to({ water: 0.7 }, 900);
      await m.wave(c, 1);
      await c.wait(900);
      await afterReaction(c);
    });
  }

  // NOT YET: mild concern, glances at the bottle, gentle encouragement. No guilt.
  function reactNo() {
    m.run(async (c) => {
      const firm = S.askInfo && S.askInfo.attempt >= set().maxRetries;
      c.emo('hmm', 220);
      Sound.play('hmm');
      m.emote('🤔', { x: 214, y: 78, dy: -30, ms: 1900, size: 28 });
      showBubble(Lines.pick(firm ? 'noFirm' : 'no', vars()), [], 0);
      m.autoLook = false;
      // glance down at the bottle (it is on the character's right)
      await c.to({ lookX: 0.9, lookY: 0.8, rArm: -30, bottle: 4 }, 380);
      await c.wait(850);
      // look back up with a small encouraging smile and a bottle raise
      await c.to({ lookX: 0, lookY: 0 }, 320);
      c.emo('ask', 300);
      await m.offer(c, 1);
      await c.wait(1100);
      { const rt = returnText(); if (rt) showBubble(`${Lines.pick(firm ? 'noFirm' : 'no', vars())}\n${rt}`, [], 0); }
      await c.wait(1700);
      m.autoLook = true;
      c.emo('neutral', 400);
      await afterReaction(c);
    });
  }

  function reactLater() {
    m.run(async (c) => {
      Sound.play('later');
      m.emote('👋', { x: 214, y: 90, dy: -30, ms: 1500, size: 26 });
      await c.wait(120);
      showBubble(`${Lines.pick('later', vars())}\n${returnText()}`.trim(), [], 0);
      c.emo('happy', 220);
      await m.nod(c, 1);
      await m.wave(c, 1);
      await c.wait(800);
      await afterReaction(c);
    });
  }

  function reactTimeout() {
    m.run(async (c) => {
      showBubble(Lines.pick('timeout', vars()), [], 0);
      c.emo('sleepy', 700);
      await c.to({ lArm: 40, rArm: 50, sy: 0.98 }, 500);
      Sound.play('zzz');
      m.emote('💤', { x: 205, y: 80, dy: -40, ms: 2200, size: 24 });
      await c.wait(2200);
      await afterReaction(c);
    });
  }

  // ---------- idle life ----------
  // Small, purposeful behaviours. Weighted so quiet ones dominate.
  const IDLE = {
    look: (c) => (async () => { m.autoLook = false; await c.to({ lookX: -0.8 }, 420); await c.wait(600); await c.to({ lookX: 0.8 }, 520); await c.wait(500); await c.to({ lookX: 0 }, 380); m.autoLook = true; })(),
    smile: (c) => (async () => { await c.emo('happy', 450); await c.wait(1300); await c.emo('neutral', 500); })(),
    curious: (c) => (async () => {
      m.autoLook = false;
      c.to({ rot: 4, lookX: 0.5, lookY: -0.4 }, 450);
      await c.emo('ask', 400);
      await c.wait(1200);
      await c.to({ rot: 0, lookX: 0, lookY: 0 }, 450);
      m.autoLook = true;
    })(),
    hop: (c) => (async () => { await m.hop(c, 26, 400); })(),
    walk: (c) => (async () => {
      if (wantsAway()) return;
      const tx = S.x < W() / 2 ? rand(W() * 0.55, W() - 120) : rand(120, W() * 0.45);
      await walkTo(c, tx, 150);
      S.dir = S.x < W() / 2 ? 1 : -1;
      await c.wait(400);
    })(),
    patrol: (c) => (async () => {
      if (wantsAway()) return;
      const toRight = S.x < W() / 2;
      await walkTo(c, toRight ? W() - 100 : 100, 160);
      await c.wait(500);
      await m.wave(c, 1);
      await walkTo(c, toRight ? W() * 0.3 : W() * 0.7, 160);
      S.dir = S.x < W() / 2 ? 1 : -1;
    })(),
    sip: (c) => (async () => {
      await m.sip(c, { gulps: 1, amount: 0.06 });
      c.emo('happy', 250);
      await c.wait(500);
      c.to({ water: 0.7 }, 1200);
    })(),
    stretch: (c) => (async () => {
      c.to({ lArm: 168, rArm: 168, bottle: 14 }, 600);
      await c.to({ sy: 1.07, sx: 0.96 }, 600);
      await c.wait(600);
      await c.to({ sy: 0.97, sx: 1.03 }, 300);
    })(),
    dance: (c) => (async () => {
      for (let i = 0; i < 3; i++) {
        c.to({ rot: -5, lArm: 110, rArm: 45 }, 280); await c.wait(280);
        c.to({ rot: 5, lArm: 45, rArm: 120 }, 280); await c.wait(280);
      }
    })(),
    yawn: (c) => (async () => {
      c.to({ mouthW: 8, open: 1, eyeOpen: 0.3, eyeOpenR: 0.3, sy: 1.04, curve: 0 }, 450);
      await c.wait(1100);
    })(),
  };
  const IDLE_BAG = [
    'look', 'look', 'look', 'smile', 'smile', 'curious', 'curious', 'walk', 'walk',
    'sip', 'stretch', 'hop', 'patrol', 'yawn', 'dance',
  ];

  function scheduleIdle() {
    setTimeout(async () => {
      scheduleIdle();
      if (S.state !== 'idle' || S.away || !set() || !set().idleAntics || S.dragging || S.falling) return;
      const k = pick(IDLE_BAG);
      await m.run(async (c) => {
        await IDLE[k](c);
        await restTo(c);
      });
    }, rand(6000, 11000));
  }

  async function sleepLoop() {
    m.run(async (c) => {
      c.emo('sleepy', 700);
      c.to({ lArm: 10, rArm: 14, sy: 0.96, lookY: 0.4 }, 700);
      while (S.state === 'sleeping') {
        m.emote('💤', { x: 190, y: 80, dy: -55, ms: 2400, size: 22 });
        await c.wait(3200);
      }
    });
  }

  // ---------- interaction: poke, drag, menu ----------
  let down = null;
  onHit('pointerdown', (e) => {
    if (e.button !== 0) return;
    down = { x: e.screenX, y: e.screenY, sx: S.x, sl: S.lift, moved: false, t: performance.now(), lx: e.screenX };
    S.dragVx = 0;
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (!down.moved && Math.hypot(e.screenX - down.x, e.screenY - down.y) > 5) {
      down.moved = true;
      startDrag();
    }
    if (down.moved) {
      S.dragVx = (e.screenX - down.lx) * 60;
      down.lx = e.screenX;
      S.x = clamp(down.sx + (e.screenX - down.x), 40, W() - 40);
      S.lift = clamp(down.sl + (down.y - e.screenY), 0, Math.max(0, S.wa.height - winH()));
    }
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    const wasMove = down.moved;
    down = null;
    if (wasMove) endDrag(); else poke();
  });
  onHit('dblclick', () => pf.openPanel('today'));
  onHit('contextmenu', (e) => { e.preventDefault(); pf.contextMenu(); });

  let prevState = 'idle';
  function startDrag() {
    S.walk && finishWalk();
    prevState = S.state === 'drag' ? prevState : S.state;
    S.state = 'drag'; S.dragging = true; S.falling = false;
    clearTimeout(S.askTimer);
    updateIgnore();
    Sound.play('poke');
    m.run(async (c) => {
      c.emo('surprised', 120);
      c.to({ lArm: 150, rArm: 150, bottle: 24, feetDrop: 7 }, 200, 'back');
    });
  }
  function endDrag() {
    S.dragging = false;
    S.falling = true; S.vy = 0;
    m.tw = m.tw.filter((t) => t.k !== 'rot');
    updateIgnore();
  }
  function onLanded() {
    m.run(async (c) => {
      Sound.play('land');
      c.to({ feetDrop: 0 }, 100);
      await c.to({ sy: 0.85, sx: 1.12 }, 80, 'out');
      await c.to({ sy: 1, sx: 1 }, 220, 'back');
      if (prevState === 'asking') {
        S.state = 'asking';
        S.askTimer = setTimeout(() => S.state === 'asking' && choose('timeout'), (set().answerTimeoutSec || 90) * 1000);
        c.emo('ask', 200);
        await askGestures(c);
        return;
      }
      S.state = prevState === 'busy' ? 'idle' : prevState;
      if (S.state === 'sleeping') { sleepLoop(); return; }
      c.emo('happy', 200);
      showBubble(Lines.pick('drag', vars()), [], 1800);
      await c.wait(1200);
      await restTo(c);
      S.state = 'idle';
    });
  }

  function poke() {
    if (S.state === 'drag') return;
    if (S.state === 'asking') { Sound.play('poke'); m.tween({ y: 18 }, 120, 'out').then(() => m.tween({ y: 0 }, 200, 'in')); return; }
    const t = performance.now();
    S.pokes = S.pokes.filter((x) => t - x < 3000); S.pokes.push(t);
    const many = S.pokes.length >= 4;
    const wasSleeping = S.state === 'sleeping';
    S.state = 'busy';
    m.run(async (c) => {
      if (many) {
        Sound.play('giggle');
        c.emo('dizzy', 120);
        showBubble(Lines.pick('pokeMany', vars()), [], 2200);
        m.emote('💫', { x: 150, y: 60, dy: -20, ms: 1400 });
        for (let i = 0; i < 4; i++) { await c.to({ rot: -8 }, 110); await c.to({ rot: 8 }, 110); }
      } else {
        Sound.play(Math.random() < 0.5 ? 'giggle' : 'poke');
        c.emo(pick(['happy', 'cheeky', 'joy']), 120);
        showBubble(wasSleeping ? 'Mmh? Oh, hi! 🥱' : Lines.pick('poke', vars()), [], 1800);
        m.emote(pick(['💙', '✨', '💧']), { x: rand(110, 190), y: 90, dy: -55 });
        await m.hop(c, 30, 360);
      }
      await c.wait(700);
      await restTo(c);
      if (!set() || !S.snap.awaiting) hideBubble();
      S.state = S.snap && S.snap.paused ? 'sleeping' : 'idle';
      if (S.state === 'sleeping') sleepLoop();
    });
  }

  // ---------- events from main ----------
  function applySettings(s) {
    Sound.configure({ muted: s.muted, volume: s.volume });
    if (s.character && s.character !== S.character) {
      const first = S.character === undefined;
      S.character = s.character;
      m.setSkin(s.character);
      if (!first && !S.away && (S.state === 'idle' || S.state === 'sleeping')) introduce(); // "ta-da" for the new buddy
    }
    m.setBottleColor(s.bottleColor);
    S.scale = s.scale || 1;
  }

  // Shown when the user picks a different character.
  function introduce() {
    S.state = 'busy';
    Sound.play('appear');
    m.run(async (c) => {
      m.burst(['✨', '💙', '⭐'], 6);
      c.emo('joy', 150);
      await m.hop(c, 38, 400);
      showBubble(`Hi, I’m ${vars().mascot}! 💧`, [], 0);
      await m.wave(c, 2);
      await c.wait(1200);
      hideBubble();
      await restTo(c);
      S.state = 'idle';
    });
  }

  pf.onState((snap) => {
    const prevPaused = S.snap && S.snap.paused;
    S.snap = snap;
    applySettings(snap.settings);
    if (S.state === 'idle' && snap.paused && !prevPaused) { S.state = 'sleeping'; sleepLoop(); }
    else if (S.state === 'sleeping' && !snap.paused) {
      S.state = 'busy';
      Sound.play('appear');
      m.run(async (c) => { c.emo('surprised', 150); await m.hop(c, 32, 380); c.emo('happy', 200); showBubble('Back to work! 💧', [], 1800); await c.wait(1400); await restTo(c); S.state = 'idle'; });
    }
    if (S.state === 'idle' && wantsAway() && !S.away && !snap.awaiting) {
      S.state = 'busy';
      m.run(async (c) => { await leave(c); S.state = 'idle'; });
    } else if (S.state === 'idle' && !wantsAway() && S.away) {
      S.state = 'busy';
      m.run(async (c) => { await enter(c); await restTo(c); S.state = 'idle'; });
    }
  });

  pf.onDisplay((wa) => { S.wa = wa; S.x = clamp(S.x, 60, wa.width - 60); });

  pf.onRemind((info) => {
    S.snap = info.state; applySettings(info.state.settings);
    if (S.state === 'asking') return;
    ask(info);
  });

  pf.onCommand((cmd) => {
    if (cmd.name === 'logged') {
      S.snap = cmd.state;
      if (S.state === 'asking') choose('yes');
      else if (S.state === 'idle' || S.state === 'sleeping') {
        S.state = 'busy';
        reactYes(cmd.state.today.yes, cmd.state.settings.goal, true);
      }
    }
  });

  pf.onGameResult((r) => {
    if (S.state !== 'idle' || S.away) return;
    S.state = 'busy';
    m.run(async (c) => {
      if (r.isBest) {
        Sound.play('yes'); c.emo('joy', 150); confetti(50);
        showBubble(`New best! ${r.score} points! 🏆`, [], 0);
        await m.cheer(c, 2);
      } else if (r.score > 0) {
        Sound.play('good'); c.emo('happy', 150);
        showBubble(`Nice game! ${r.score} pts 💙`, [], 0);
        await m.hop(c, 30, 380);
      } else {
        c.emo('concern', 150);
        showBubble('Aww, try again! 💪', [], 0);
        await c.wait(600);
      }
      await c.wait(1200);
      hideBubble();
      await restTo(c);
      S.state = 'idle';
    });
  });

  // ---------- boot ----------
  // Deterministic start-up: the state is 'busy' from the first moment so no
  // settings broadcast can start a competing entrance; Bao then walks in from
  // the left edge, greets, and only then becomes 'idle'.
  (async function boot() {
    S.state = 'busy';
    S.snap = await pf.getState();
    S.wa = await pf.getDisplay();
    applySettings(S.snap.settings);
    m.set({ ...neutral() });

    if (S.snap.paused) { // paused: nap in view, no greeting
      S.away = false; S.x = W() * 0.78; layout();
      S.state = 'sleeping'; sleepLoop();
    } else {
      // Off-screen until the launch reminder (or a fallback greeting) walks Bao in.
      S.away = true; S.x = -170; layout();
      S.state = 'idle';
      if (!wantsAway()) {
        setTimeout(() => {
          if (S.state !== 'idle' || !S.away) return; // the launch question already brought him in
          S.state = 'busy';
          m.run(async (c) => {
            await enter(c);
            c.emo('happy', 200);
            showBubble(Lines.pick('hello', vars()), [], 0);
            await m.wave(c, 2);
            await c.wait(1600);
            hideBubble();
            await restTo(c);
            S.state = 'idle';
          });
        }, 6000);
      }
    }
    scheduleIdle();
  })();
})();
