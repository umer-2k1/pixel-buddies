// Offline synth for the Bao launch video: one music bed + a set of SFX (WAV, 44.1k stereo).
import fs from 'fs';
const SR = 44100, TAU = Math.PI * 2;
const DUR = 26, BPM = 120, BEAT = 60 / BPM;
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

class Track {
  constructor(sec) { this.n = Math.ceil(sec * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); }
  add(t, arr, gain = 1, pan = 0) {
    const s = Math.floor(t * SR), gl = gain * (pan > 0 ? 1 - pan : 1), gr = gain * (pan < 0 ? 1 + pan : 1);
    for (let i = 0; i < arr.length; i++) { const j = s + i; if (j < 0 || j >= this.n) continue; this.L[j] += arr[i] * gl; this.R[j] += arr[i] * gr; }
  }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

// ---- instruments (return mono Float32Array) ----
function kick(vol = 1) {
  const n = Math.floor(0.32 * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = 42 + 130 * Math.exp(-t / 0.028); ph += (TAU * f) / SR; o[i] = Math.sin(ph) * Math.exp(-t / 0.11) * vol + (t < 0.004 ? rnd() * 0.3 : 0); }
  return o;
}
function noiseHit(dur, decay, hp = 0.9, vol = 1) {
  const n = Math.floor(dur * SR), o = new Float32Array(n); let lp = 0;
  for (let i = 0; i < n; i++) { const x = rnd(); lp += (x - lp) * (1 - hp); o[i] = (x - lp) * Math.exp(-(i / SR) / decay) * vol; }
  return o;
}
const hat = (open = false, v = 0.5) => noiseHit(open ? 0.25 : 0.07, open ? 0.08 : 0.018, 0.55, v);
function clap(v = 0.8) {
  const n = Math.floor(0.22 * SR), o = new Float32Array(n);
  for (const off of [0, 0.011, 0.022]) { const h = noiseHit(0.18, 0.045, 0.7, v); h.forEach((x, i) => { const j = i + Math.floor(off * SR); if (j < n) o[j] += x; }); }
  return o;
}
function pluck(freq, dur = 0.5, vol = 0.5, bright = 1) {
  const n = Math.floor(dur * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = env(t, 0.004, 0.16 * dur / 0.5 + 0.05), p = freq * TAU * t;
    o[i] = (Math.sin(p) + 0.45 * bright * Math.sin(2 * p) * Math.exp(-t / 0.12) + 0.2 * bright * Math.sin(3 * p) * Math.exp(-t / 0.07)) * e * vol;
  }
  return o;
}
function bass(freq, dur = 0.24, vol = 0.6) {
  const n = Math.floor(dur * SR), o = new Float32Array(n); let lp = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; ph += freq / SR; const saw = (ph % 1) * 2 - 1;
    lp += (saw - lp) * (0.06 + 0.28 * Math.exp(-t / 0.05));
    o[i] = (lp * 0.8 + Math.sin(TAU * freq * t) * 0.5) * env(t, 0.004, dur * 0.7) * vol;
  }
  return o;
}
function pad(freqs, dur, vol = 0.12) {
  const n = Math.floor(dur * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = clamp(t / 0.35, 0, 1) * clamp((dur - t) / 0.35, 0, 1);
    let s = 0; for (const f of freqs) s += Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 1.003 * t);
    o[i] = (s / freqs.length) * e * vol;
  }
  return o;
}
function riser(dur, vol = 0.5) {
  const n = Math.floor(dur * SR), o = new Float32Array(n); let lp = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, k = t / dur, a = 0.02 + 0.85 * k * k;
    lp += (rnd() - lp) * a; ph += (TAU * (180 + 1800 * k * k)) / SR;
    o[i] = (lp * 0.9 + Math.sin(ph) * 0.15) * k * k * vol;
  }
  return o;
}
function boom(dur = 1.4, vol = 1) {
  const n = Math.floor(dur * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * (30 + 70 * Math.exp(-t / 0.12))) / SR; o[i] = (Math.sin(ph) * Math.exp(-t / 0.55) + rnd() * 0.25 * Math.exp(-t / 0.08)) * vol; }
  return o;
}
function whoosh(dur = 0.7, vol = 0.6) {
  const n = Math.floor(dur * SR), o = new Float32Array(n); let lp = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, k = t / dur, a = 0.015 + 0.5 * Math.sin(Math.PI * k) ** 2;
    lp += (rnd() - lp) * a; lp2 += (lp - lp2) * 0.5;
    o[i] = (lp - lp2) * 6 * Math.sin(Math.PI * k) * vol;
  }
  return o;
}
function popSfx(mult = 1, vol = 0.8) {
  const n = Math.floor(0.16 * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * 380 * mult * (1 + 1.4 * Math.min(1, t / 0.07))) / SR; o[i] = Math.sin(ph) * Math.exp(-t / 0.05) * vol; }
  return o;
}
function arpSfx(notes, step = 0.075, vol = 0.6, tail = 0.6) {
  const n = Math.floor((notes.length * step + tail) * SR), o = new Float32Array(n);
  notes.forEach((m, k) => { const p = pluck(mtof(m), tail, vol, 1.3); p.forEach((x, i) => { const j = i + Math.floor(k * step * SR); if (j < n) o[j] += x; }); });
  return o;
}
const sparkle = () => { const notes = [96, 100, 103, 108, 105]; return arpSfx(notes, 0.055, 0.35, 0.5); };
function glug(vol = 0.9) {
  const n = Math.floor(0.7 * SR), o = new Float32Array(n);
  for (let k = 0; k < 3; k++) {
    let ph = 0; const s = Math.floor(k * 0.2 * SR);
    for (let i = 0; i < 0.14 * SR; i++) { const t = i / SR; ph += (TAU * (240 - k * 28) * (1 - 0.5 * t / 0.14)) / SR; if (s + i < n) o[s + i] += Math.sin(ph) * Math.exp(-t / 0.05) * vol; }
  }
  return o;
}
const tick = (vol = 0.6) => { const n = Math.floor(0.05 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(TAU * 1700 * t) * Math.exp(-t / 0.008) * vol; } return o; };
const thud = (vol = 0.9) => { const b = boom(0.5, vol); return b; };
const click = () => { const n = Math.floor(0.08 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(TAU * 1300 * t) * Math.exp(-t / 0.01) + Math.sin(TAU * 160 * t) * Math.exp(-t / 0.03) * 0.8) * 0.8; } return o; };

// ---- write ----
function writeWav(path, L, R, peak = 0.9) {
  const n = L.length; let mx = 0;
  for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(L[i]), Math.abs(R[i]));
  const g = mx > 0 ? peak / mx : 1;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.tanh(L[i] * g * 1.1) * 32000), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.tanh(R[i] * g * 1.1) * 32000), 46 + i * 4);
  }
  fs.writeFileSync(path, buf);
}
function sfxFile(name, arr, peak = 0.9) { writeWav(`sfx/${name}.wav`, arr, arr, peak); }

// ---- SFX ----
fs.mkdirSync('sfx', { recursive: true });
sfxFile('tick', tick(), 0.7);
sfxFile('thud', thud(), 0.95);
sfxFile('boom', boom(1.6), 0.95);
sfxFile('whoosh', whoosh(0.7), 0.8);
sfxFile('riser', riser(1.4), 0.8);
sfxFile('click', click(), 0.85);
[1, 1.122, 1.26, 1.414, 1.587].forEach((m, i) => sfxFile('pop' + (i + 1), popSfx(m), 0.8));
sfxFile('yes', arpSfx([72, 76, 79, 84, 88], 0.08, 0.7, 0.9), 0.85);
sfxFile('fanfare', (() => {
  const a = arpSfx([60, 64, 67, 72, 76, 79, 84], 0.085, 0.7, 1.8), c = pad([mtof(72), mtof(76), mtof(79), mtof(84)], 1.9, 0.5);
  c.forEach((x, i) => { if (i < a.length) a[i] += x * 0.7; }); return a;
})(), 0.9);
sfxFile('sparkle', sparkle(), 0.7);
sfxFile('glug', glug(), 0.85);
sfxFile('boing', (() => { const n = Math.floor(0.3 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * (240 + 420 * Math.min(1, t / 0.12))) / SR; o[i] = Math.sin(ph) * Math.exp(-t / 0.1) * 0.8; } return o; })(), 0.8);

// ---- music: 120 BPM, C - G - Am - F ----
const T = new Track(DUR + 1);
const chords = [[48, 52, 55, 60, 64], [43, 47, 50, 59, 62], [45, 48, 52, 57, 64], [41, 45, 48, 57, 60]]; // bass/inner voicings
const roots = [36, 31, 33, 29]; // bass roots (C2 G1 A1 F1)
const chordMidi = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]];
const K = kick(0.95), CL = clap(0.75);
const bar = (t) => Math.floor(t / (BEAT * 4));
for (let t = 0; t < DUR - 0.001; t += BEAT / 2) {
  const beat = Math.round(t / BEAT * 2) / 2, b = bar(t), ci = b % 4, inBar = (t / BEAT) % 4;
  const onBeat = Math.abs(t / BEAT - Math.round(t / BEAT)) < 1e-6;
  // intro 0-4s: sparse ticks + drone
  if (t < 4) {
    if (onBeat) T.add(t, tick(0.35), 0.5);
    continue;
  }
  const full = t >= 8, build = t >= 21 && t < 22, ending = t >= 22;
  if (onBeat && !(ending && t >= 24.5)) {
    if (!(t >= 20.5 && t < 22)) T.add(t, K, 0.85); // kick drops out in the build
    if (full && (Math.round(inBar) === 1 || Math.round(inBar) === 3) && !build) T.add(t, CL, 0.55);
  }
  if (!onBeat && t < 24.5) T.add(t, hat(false, 0.5), 0.5, (Math.round(t * 4) % 2 ? 0.25 : -0.25)); // off-beat 8th hats
  if (full && onBeat && t < 24.5) T.add(t + BEAT / 2 - 0.0, hat(true, 0.35), 0.35);
  // bass: 8th pattern root/octave
  if (t < 24.5 && !build) T.add(t, bass(mtof(roots[ci] + ((Math.round(t * 2) % 4 === 3) ? 12 : 0)), BEAT * 0.45, 0.55), 0.8);
  // 16th arp from 6s
  if (t >= 6 && t < 24) {
    for (let q = 0; q < 2; q++) {
      const tt = t + q * BEAT / 4, m = chordMidi[ci][(Math.round(tt * 4) % 3)] + 12 + ((Math.round(tt * 4) % 8) >= 4 ? 12 : 0);
      T.add(tt, pluck(mtof(m), 0.3, 0.32, 1), 0.55, q ? 0.35 : -0.35);
    }
  }
}
// pads per bar (from 4s)
for (let b = 2; b < 12; b++) { const t0 = b * BEAT * 4; if (t0 >= 24.5) break; T.add(t0, pad(chordMidi[b % 4].map((m) => mtof(m - 12)), BEAT * 4, 0.2), 0.75); }
// lead motif from 8s: bar-long call/response on C pentatonic
const motif = [[0, 79], [1, 76], [1.5, 79], [2, 84], [3, 81], [3.5, 79]];
for (let b = 4; b < 11; b++) for (const [bt, m] of motif) { const t = b * BEAT * 4 + bt * BEAT; if (t >= 8 && t < 22) T.add(t, pluck(mtof(m + (b % 4 === 2 ? -3 : 0)), 0.45, 0.4, 1.2), 0.6, 0.15); }
// intro drone + riser into the drop; build snare roll bar 21-22
T.add(0, pad([mtof(36), mtof(43)], 4, 0.35), 0.8);
T.add(2.6, riser(1.4, 0.55), 0.8);
for (let i = 0; i < 16; i++) { const t = 21 + i * BEAT / 4; T.add(t, noiseHit(0.1, 0.03, 0.5, 0.4 + i * 0.04), 0.6); }
T.add(4.0, boom(1.6, 0.9), 0.9);
T.add(22.0, boom(1.8, 0.95), 0.9);
// ending chord + tail
T.add(22.0, pad([mtof(60), mtof(64), mtof(67), mtof(72)], 3.6, 0.5), 0.9);
for (const [i, m] of [72, 76, 79, 84, 88].entries()) T.add(22.1 + i * 0.09, pluck(mtof(m), 1.4, 0.4, 1.2), 0.5, i % 2 ? 0.3 : -0.3);
// fade out last 0.8s
for (let i = 0; i < T.n; i++) { const t = i / SR, f = t > DUR - 0.8 ? Math.max(0, (DUR - t) / 0.8) : 1; T.L[i] *= f; T.R[i] *= f; }
writeWav('assets/music.wav', T.L, T.R, 0.88);
console.log('synth done');
