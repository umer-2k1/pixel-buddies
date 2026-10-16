// Tiny Web Audio synth: every sound is generated, no asset files.
(function () {
  let ctx = null;
  const cfg = { muted: false, volume: 0.6 };

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, o = {}) {
    if (cfg.muted || cfg.volume <= 0) return;
    const c = ac();
    const t0 = c.currentTime + (o.at || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const peak = (o.gain ?? 0.16) * cfg.volume * 0.75;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, o = {}) {
    if (cfg.muted || cfg.volume <= 0) return;
    const c = ac();
    const t0 = c.currentTime + (o.at || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1800, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    f.Q.value = o.q || 2;
    const g = c.createGain();
    const peak = (o.gain ?? 0.2) * cfg.volume;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  }

  const N = { C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, E6: 1319, G6: 1568 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  const sounds = {
    appear() { tone(300, 0.14, { to: 760, gain: 0.18 }); tone(1200, 0.12, { at: 0.1, to: 1900, gain: 0.08 }); },
    ask() { tone(N.E5, 0.16, { type: 'triangle' }); tone(N.G5, 0.22, { at: 0.13, type: 'triangle' }); },
    yes() {
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.22, { at: i * 0.08, type: 'triangle', gain: 0.17 }));
      tone(N.E6, 0.4, { at: 0.34, gain: 0.08 });
    },
    big() {
      [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(f, 0.3, { at: i * 0.09, type: 'triangle', gain: 0.17 }));
      [N.C6, N.E6, N.G6].forEach((f) => tone(f, 0.7, { at: 0.6, gain: 0.07 }));
    },
    no() { tone(440, 0.3, { to: 370, gain: 0.1 }); },
    hmm() { tone(392, 0.16, { type: 'triangle', gain: 0.09 }); tone(330, 0.26, { at: 0.14, type: 'triangle', gain: 0.08 }); },
    later() { tone(N.G5, 0.12, { type: 'triangle', gain: 0.1 }); tone(N.E5, 0.18, { at: 0.1, type: 'triangle', gain: 0.1 }); },
    pop() { tone(520, 0.07, { to: 880, gain: 0.1 }); },
    glug() { for (let i = 0; i < 3; i++) { tone(230 - i * 25, 0.12, { at: i * 0.2, to: 120, type: 'sine', gain: 0.2 }); noise(0.09, { at: i * 0.2, freq: 700, q: 3, gain: 0.07 }); } },
    gulp() { for (let i = 0; i < 3; i++) tone(190, 0.1, { at: i * 0.17, to: 110, type: 'triangle', gain: 0.22 }); },
    sip() { tone(220, 0.09, { to: 130, type: 'triangle', gain: 0.18 }); },
    splash() { noise(0.25, { freq: 2500, to: 700, q: 1.2, gain: 0.18 }); },
    poke() { tone(700, 0.09, { to: 1150, gain: 0.16 }); },
    giggle() { for (let i = 0; i < 4; i++) tone(rnd(900, 1250), 0.07, { at: i * 0.075, gain: 0.1 }); },
    hop() { tone(260, 0.16, { to: 520, gain: 0.14 }); },
    land() { tone(180, 0.1, { to: 90, gain: 0.16 }); },
    step() { tone(rnd(200, 240), 0.04, { type: 'triangle', gain: 0.05 }); },
    tick() { tone(880, 0.05, { gain: 0.08 }); },
    sparkle() { for (let i = 0; i < 3; i++) tone(rnd(1400, 2200), 0.12, { at: i * 0.06, gain: 0.05 }); },
    zzz() { tone(330, 0.5, { to: 260, gain: 0.05 }); },
    good() { tone(988, 0.07, { type: 'square', gain: 0.07 }); tone(1319, 0.14, { at: 0.07, type: 'square', gain: 0.07 }); },
    bad() { tone(170, 0.2, { to: 110, type: 'sawtooth', gain: 0.1 }); },
    flip() { tone(500, 0.07, { to: 720, gain: 0.1 }); },
    match() { tone(N.G5, 0.1, { type: 'triangle' }); tone(N.C6, 0.2, { at: 0.08, type: 'triangle' }); },
    start() { [N.C5, N.E5, N.G5].forEach((f, i) => tone(f, 0.12, { at: i * 0.1, type: 'triangle' })); },
  };

  window.Sound = {
    cfg,
    configure(s) {
      if (s.muted !== undefined) cfg.muted = !!s.muted;
      if (s.volume !== undefined) cfg.volume = Math.max(0, Math.min(1, s.volume));
    },
    play(name) {
      try { sounds[name] && sounds[name](); } catch (e) { /* audio is optional */ }
    },
  };
})();
