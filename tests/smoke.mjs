// End-to-end smoke test for a PACKAGED Buddies app. Nothing is injected into the app:
// it is launched with an isolated profile and driven through Chromium's debug port.
//
//   node tests/smoke.mjs "release/mac/Buddies.app/Contents/MacOS/Buddies"      (macOS)
//   node tests/smoke.mjs "release\\win-unpacked\\Buddies.exe"                    (Windows)
//   node tests/smoke.mjs                                                         (dev: uses `electron .`)
//
// Requires Node 22+ (global fetch/WebSocket). Exit code 0 = all checks passed.
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exe = process.argv[2];
const PORT = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'buddies-smoke-'));
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (ok, name, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

function launch(extra = []) {
  const args = [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, ...extra];
  const child = exe
    ? spawn(exe, args, { stdio: 'ignore' })
    : spawn(path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron'), [ROOT, ...args], { stdio: 'ignore', shell: process.platform === 'win32' });
  child.exited = false; child.on('exit', (code) => { child.exited = true; child.code = code; });
  return child;
}

async function targets(timeout = 40000) {
  const t0 = Date.now();
  for (;;) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); const j = await r.json(); if (j.length) return j; } catch { /* not up yet */ }
    if (Date.now() - t0 > timeout) throw new Error('debug port never came up');
    await sleep(300);
  }
}

class Cdp {
  constructor(url) { this.url = url; this.id = 0; this.pend = new Map(); this.errors = []; }
  async open() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pend.has(d.id)) { this.pend.get(d.id)(d); this.pend.delete(d.id); }
      if (d.method === 'Runtime.exceptionThrown') this.errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    };
    await new Promise((r, j) => { this.ws.onopen = r; this.ws.onerror = j; });
    await this.send('Runtime.enable');
    return this;
  }
  send(method, params = {}) { return new Promise((r) => { const i = ++this.id; this.pend.set(i, r); this.ws.send(JSON.stringify({ id: i, method, params })); }); }
  async ev(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}
async function page(match, timeout = 30000) {
  const t0 = Date.now();
  for (;;) {
    const t = (await targets()).find((x) => x.type === 'page' && x.url.includes(match));
    if (t) return { cdp: await new Cdp(t.webSocketDebuggerUrl).open(), target: t };
    if (Date.now() - t0 > timeout) return null;
    await sleep(400);
  }
}
async function waitFor(fn, timeout, step = 250) { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(step); } }
const snap = (c) => c.ev(`JSON.stringify({bubble:!document.getElementById('bubble').classList.contains('hidden'),text:document.getElementById('bubble-text').textContent,btns:[...document.querySelectorAll('#bubble button')].map(b=>b.textContent)})`).then(JSON.parse);
const settingsFile = () => path.join(profile, 'settings.json');

const keepAlive = setInterval(() => {}, 1000);

async function main() {
  console.log(`Buddies smoke test  ·  ${exe || 'dev (electron .)'}  ·  ${process.platform}/${process.arch}  ·  profile ${profile}\n`);
  let app = launch();
  const mas = await page('mascot/index.html');
  log(!!mas, 'app starts and the overlay window loads');
  if (!mas) throw new Error('overlay never loaded');
  const c = mas.cdp;

  // --- window footprint: the overlay must stay small (never full screen)
  const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const br = await new Cdp(ver.webSocketDebuggerUrl).open();
  const b = JSON.parse(await c.ev(`JSON.stringify({w: innerWidth, h: innerHeight, sw: screen.availWidth, sh: screen.availHeight})`));
  log(b.w <= 700 && b.h <= 800 && b.w * b.h < 0.5 * b.sw * b.sh, 'overlay window is small (not full-screen)', `${b.w}x${b.h} on a ${b.sw}x${b.sh} screen`);

  // --- first-run: launch question with all buttons
  const q = await waitFor(async () => { const s = await snap(c); return s.bubble && s.btns.length >= 3 ? s : null; }, 40000);
  log(!!q, 'launch question appears with buttons', q ? JSON.stringify(q.btns) : 'never appeared');
  log(!!q && /^Yes/.test(q.btns[0]) && q.btns.includes('Not yet'), 'has "Yes" and "Not yet" answers');

  // --- answer "Not yet": gentle reaction, stats untouched
  await sleep(900);
  await c.ev(`document.querySelector('#bubble button.no').click(); 1`);
  const no = await waitFor(async () => { const s = await snap(c); return s.bubble && s.btns.length === 0 ? s : null; }, 5000);
  log(!!no && no.text.length > 3 && !/aww|sad|shame|please/i.test(no.text), '"Not yet" gets a gentle, non-guilt reply', JSON.stringify(no?.text));
  const st1 = JSON.parse(await c.ev(`pf.getState().then(s=>JSON.stringify({yes:s.today.yes,no:s.today.no,attempt:s.awaiting}))`));
  log(st1.no === 1 && st1.yes === 0, '"Not yet" is counted, "Yes" is not', JSON.stringify(st1));

  // --- manual ask → "Yes": counted, persisted to disk
  await waitFor(async () => (await c.ev(`pf.getState().then(s=>!s.awaiting)`)), 30000);
  await sleep(6000); // let the leave animation finish
  await c.ev(`pf.askNow(); 1`);
  const q2 = await waitFor(async () => { const s = await snap(c); return s.bubble && s.btns.length >= 3 ? s : null; }, 30000);
  log(!!q2, 'reminder can be triggered again ("Ask me now")');
  await sleep(900);
  await c.ev(`document.querySelector('#bubble button.yes').click(); 1`);
  const yes = await waitFor(async () => { const s = JSON.parse(await c.ev(`pf.getState().then(s=>JSON.stringify({yes:s.today.yes}))`)); return s.yes === 1 ? s : null; }, 5000);
  log(!!yes, '"Yes" is counted toward today\'s goal');
  await sleep(1200);
  const disk = fs.existsSync(settingsFile()) ? JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) : null;
  const day = disk && Object.values(disk.days || {})[0];
  log(!!day && day.yes === 1 && day.no === 1, 'progress is saved to disk', day ? JSON.stringify(day) : 'no settings file');

  // --- settings validation + characters
  await c.ev(`pf.updateSettings({character:'cat'}); 1`); await sleep(700);
  const earLen = await c.ev(`document.querySelector('[data-id=leafL]').innerHTML.length`);
  log(earLen > 100 && earLen < 400, 'switching character changes the artwork (cat)', `ear svg ${earLen}b`);
  await c.ev(`pf.updateSettings({volume:'loud',scale:99,character:'<script>',goal:-5,intervalMin:'x',times:'nope',foo:1}); 1`); await sleep(600);
  const s = JSON.parse(await c.ev(`pf.getState().then(s=>JSON.stringify(s.settings))`));
  log(s.volume === 0.6 && s.scale === 1.6 && s.character === 'cat' && s.goal === 1 && !('foo' in s) && typeof s.intervalMin === 'number' && Array.isArray(s.times),
    'invalid settings are rejected or clamped', `volume=${s.volume} scale=${s.scale} goal=${s.goal}`);

  // --- hostile / malformed messages must never crash the app
  await c.ev(`pf.move(NaN, undefined); pf.move(-0, -0); pf.move(1e12, -1e12); pf.resize('x', null); pf.answer('hack'); pf.gameResult({game:'../x', score:NaN}); pf.gameResult(null); pf.logWater(1e9); pf.pause('rm -rf'); pf.openPanel('<img>'); 1`);
  await sleep(1500);
  log(!app.exited, 'malformed messages do not crash the app');

  // --- panel + games
  const pan = await page('panel/index.html', 15000);
  log(!!pan, 'settings window opens');
  if (pan) {
    const p = pan.cdp;
    const tabs = await p.ev(`document.querySelectorAll('#tabs button').length`);
    const cards = await p.ev(`document.querySelectorAll('.char').length`);
    await p.ev(`document.querySelector('#tabs [data-tab=games]').click(); 1`); await sleep(300);
    const games = await p.ev(`document.querySelectorAll('.gcard').length`);
    for (let i = 0; i < games; i++) { await p.ev(`document.querySelectorAll('.gcard')[${i}].click(); 1`); await sleep(500); await p.ev(`document.getElementById('gameBack').click(); 1`); await sleep(200); }
    log(tabs === 4 && cards === 5 && games === 3, 'panel shows 4 tabs, 5 characters, 3 games', `${tabs}/${cards}/${games}`);
    log(p.errors.length === 0, 'panel has no script errors', p.errors.slice(0, 2).join(' | '));
    p.close();
  }
  log(c.errors.length === 0, 'overlay has no script errors', c.errors.slice(0, 2).join(' | '));

  // --- resource use (macOS/Linux)
  if (process.platform !== 'win32') {
    // sum CPU time of every process launched with THIS test's profile (main + helpers), over 10s
    const cpuSeconds = () => execSync('ps -A -o time=,command=').toString().split('\n')
      .filter((l) => l.includes(`user-data-dir=${profile}`))
      .reduce((sum, l) => { const t = l.trim().split(/\s+/)[0].split(':').map(Number); return sum + t.reduce((a, x) => a * 60 + x, 0); }, 0);
    await sleep(6000); // let the reaction animations settle first
    const c0 = cpuSeconds(); await sleep(10000); const c1 = cpuSeconds();
    const pct = ((c1 - c0) / 10) * 100;
    const memMB = execSync('ps -A -o rss=,command=').toString().split('\n').filter((l) => l.includes(`user-data-dir=${profile}`))
      .reduce((a, l) => a + parseInt(l.trim().split(/\s+/)[0], 10) / 1024, 0);
    log(pct < 25, 'idle CPU stays low', `${pct.toFixed(1)}% of one core (this app only, 10s)`);
    log(memMB < 600, 'memory use is reasonable', `${memMB.toFixed(0)} MB (all of this app's processes)`);
  }

  // --- single instance: a second launch must not start a second app
  const second = launch();
  await sleep(4000);
  log(second.exited && !app.exited, 'second launch hands over to the running app (single instance)');
  if (!second.exited) second.kill();

  // --- persistence across a clean quit + relaunch
  await c.ev(`pf.updateSettings({character:'bunny', intervalMin:30}); 1`); await sleep(900);
  const before = JSON.parse(await c.ev(`pf.getState().then(s=>JSON.stringify({yes:s.today.yes,no:s.today.no}))`));
  br.ws.send(JSON.stringify({ id: 99999, method: 'Browser.close' })); c.close();
  const quit = await waitFor(async () => app.exited, 10000);
  log(!!quit, 'app quits cleanly');
  app = launch();
  const mas2 = await page('mascot/index.html');
  const s2 = mas2 ? JSON.parse(await mas2.cdp.ev(`pf.getState().then(s=>JSON.stringify({c:s.settings.character,i:s.settings.intervalMin,yes:s.today.yes}))`)) : null;
  log(!!s2 && s2.c === 'bunny' && s2.i === 30 && s2.yes === before.yes, 'settings and progress survive a restart', `${JSON.stringify(s2)} (before quit: yes=${before.yes})`);
  const v2 = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const br2 = await new Cdp(v2.webSocketDebuggerUrl).open(); br2.ws.send(JSON.stringify({ id: 99999, method: 'Browser.close' }));
  await waitFor(async () => app.exited, 10000);
  log(app.exited, 'app quits cleanly again');
}

main().catch((e) => { console.log('FAIL  harness error — ' + (e && e.message)); results.push(false); })
  .finally(() => {
    try { execSync(process.platform === 'win32' ? 'taskkill /F /IM Buddies.exe >NUL 2>&1' : `pkill -f "user-data-dir=${profile}" || true`, { stdio: 'ignore' }); } catch { /* ignore */ }
    fs.rmSync(profile, { recursive: true, force: true });
    clearInterval(keepAlive);
    const failed = results.filter((r) => !r).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
  });
