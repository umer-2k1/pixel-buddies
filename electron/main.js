const { app, BrowserWindow, Tray, Menu, ipcMain, screen, powerMonitor, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Store, dayKey } = require('./store');
const Characters = require('../src/shared/characters.js');
const { dropIcon } = require('./icon');

const FOREVER = Number.MAX_SAFE_INTEGER;
const GAMES = ['drop', 'memory', 'pour'];
const TABS = ['today', 'reminders', 'buddy', 'games'];
const BOTTLES = ['pink', 'yellow', 'purple', 'orange', 'blue'];

app.setName('Buddies');
// Quiets noisy GPU log spam from transparent windows on macOS.
if (process.platform === 'darwin') app.commandLine.appendSwitch('use-angle', 'metal');
if (process.platform === 'win32') app.setAppUserModelId('com.buddies.app');

if (!app.requestSingleInstanceLock()) app.quit();

// ---------- logging & crash safety ----------
// An uncaught error must never pop a dialog in front of a user; log it and carry on.
let logFile = null;
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((a) => (a && a.stack) || (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`;
  try {
    if (!logFile) {
      const dir = path.join(app.getPath('userData'), 'logs');
      fs.mkdirSync(dir, { recursive: true });
      logFile = path.join(dir, 'main.log');
      try { if (fs.statSync(logFile).size > 512 * 1024) fs.renameSync(logFile, logFile + '.old'); } catch (e) { /* none yet */ }
    }
    fs.appendFileSync(logFile, line);
  } catch (e) { /* logging must never throw */ }
  if (!app.isPackaged) process.stderr.write(line);
}
process.on('uncaughtException', (e) => log('uncaughtException', e));
process.on('unhandledRejection', (e) => log('unhandledRejection', e));

// Wrap an IPC handler so bad input can never throw in the main process.
const safe = (fn) => (...a) => { try { return fn(...a); } catch (e) { log('ipc error', e); return undefined; } };
const on = (ch, fn) => ipcMain.on(ch, safe(fn));
const handle = (ch, fn) => ipcMain.handle(ch, safe(fn));

// Electron rejects NaN, ±Infinity and -0 for window geometry; normalise everything.
const int = (n, lo = -100000, hi = 100000) => {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return Math.min(hi, Math.max(lo, v)) + 0; // "+ 0" turns -0 into 0
};

let store, mascotWin, panelWin, tray;
let nextDueAt = 0;
let attempt = 0; // re-asks used in the current reminder cycle
let awaiting = false; // a question is currently on screen
let locked = false;
let mascotVisible = true; // the companion overlay is showing (the renderer reports this)

// ---------- state helpers ----------
const buddy = () => Characters.get(store.settings.character).name;
const now = () => Date.now();
const today = () => store.data.days[dayKey()] || { yes: 0, no: 0 };

function streak() {
  const goal = store.settings.goal;
  let n = 0;
  const d = new Date();
  const isDone = (dt) => (store.data.days[dayKey(dt)]?.yes || 0) >= goal;
  if (!isDone(d)) d.setDate(d.getDate() - 1); // today may still be in progress
  while (isDone(d)) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function week() {
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    out.push({ day: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }), yes: store.data.days[dayKey(d)]?.yes || 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function snapshot() {
  const s = store.settings;
  return {
    settings: s,
    today: today(),
    streak: streak(),
    week: week(),
    games: store.data.games,
    nextDueAt,
    paused: isPaused(),
    pausedUntil: s.pausedUntil,
    awaiting,
  };
}

function broadcast() {
  const snap = snapshot();
  [mascotWin, panelWin].forEach((w) => w && !w.isDestroyed() && w.webContents.send('state', snap));
  refreshTray();
}

const isPaused = () => store.settings.pausedUntil > now();

// The overlay is only on screen when it has something to do: a reminder is due,
// the buddy was asked for, or the user chose "hangs out all day". Hiding the
// window while the buddy is away is what guarantees he can never be left
// stranded on screen by a work-area change, a Space switch or a resize.
function applyMascotVisibility() {
  if (!mascotWin || mascotWin.isDestroyed()) return;
  if (store.settings.hidden || !mascotVisible) mascotWin.hide();
  else mascotWin.showInactive();
}

// ---------- schedule ----------
const hm = (str) => { const [h, m] = String(str).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const minutesNow = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

function inActiveHours(d = new Date()) {
  const s = store.settings;
  if (s.mode === 'times') return true;
  const a = hm(s.activeFrom), b = hm(s.activeTo), m = minutesNow(d);
  return a <= b ? m >= a && m < b : m >= a || m < b; // supports overnight ranges
}

function nextActiveStart(from) {
  const d = new Date(from);
  for (let i = 0; i < 48 * 60; i++) { // scan forward minute by minute (cheap, bounded)
    d.setTime(from + i * 60000);
    if (inActiveHours(d)) return d.getTime();
  }
  return from + 60000 * 60;
}

function computeNext(from = now()) {
  const s = store.settings;
  if (s.mode === 'times') {
    const times = (s.times || []).map(hm).sort((a, b) => a - b);
    if (!times.length) return from + 3600000;
    const d = new Date(from);
    for (let dayOff = 0; dayOff < 2; dayOff++) {
      for (const t of times) {
        const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOff, Math.floor(t / 60), t % 60, 0, 0).getTime();
        if (c > from + 1000) return c;
      }
    }
    return from + 3600000;
  }
  const t = from + Math.max(1, s.intervalMin) * 60000;
  return inActiveHours(new Date(t)) ? t : nextActiveStart(t);
}

function reschedule(from = now()) {
  nextDueAt = computeNext(from);
  broadcast();
}

function fire(kind = 'interval') {
  if (!mascotWin || mascotWin.isDestroyed()) return;
  awaiting = true;
  mascotVisible = true; // a question is about to be asked, so the stage must be on screen
  applyMascotVisibility();
  mascotWin.webContents.send('remind', { kind, attempt, state: snapshot() });
  // Don't fire again until answered (the renderer reports back, with a timeout).
  nextDueAt = now() + 24 * 3600000;
  broadcast();
}

function tick() {
  if (awaiting || locked || isPaused()) return;
  if (store.settings.pausedUntil && !isPaused()) { store.settings.pausedUntil = 0; store.save(); }
  if (now() >= nextDueAt) {
    if (inActiveHours()) fire(attempt > 0 ? 'retry' : 'interval');
    else reschedule();
  }
}

function handleAnswer(answer) {
  const s = store.settings;
  awaiting = false;
  const key = dayKey();
  const day = (store.data.days[key] = store.data.days[key] || { yes: 0, no: 0 });
  if (answer === 'yes') {
    day.yes++; attempt = 0; reschedule();
  } else {
    if (answer === 'no') day.no++;
    attempt++;
    if (attempt > s.maxRetries) { attempt = 0; reschedule(); } // give up politely until the next slot
    else { nextDueAt = now() + s.retryMin * 60000; broadcast(); }
  }
  store.save();
  broadcast();
}

// ---------- windows ----------
const workArea = () => screen.getPrimaryDisplay().workArea;

function mascotSize() {
  const sc = store.settings.scale || 1;
  return { width: Math.max(330, Math.round(240 * sc) + 90), height: Math.round(288 * sc) + 175 };
}

// Common hardening for every window we create.
function lockDown(win) {
  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e) => e.preventDefault());
  wc.on('console-message', (_e, level, msg, line, src) => level >= 2 && log('[renderer]', msg, `${path.basename(src || '')}:${line}`));
  wc.on('unresponsive', () => log('renderer unresponsive'));
}

// The overlay window is only as large as the character + bubble and is moved by
// the renderer; it must never cover the screen.
function createMascotWindow() {
  const wa = workArea();
  const { width, height } = mascotSize();
  mascotWin = new BrowserWindow({
    x: int(wa.x - width - 200), y: int(wa.y + wa.height - height), width, height, // parked off-screen until placed
    transparent: true, frame: false, hasShadow: false, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true,
    alwaysOnTop: true, focusable: false, show: false, backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false,
    },
  });
  mascotWin.setAlwaysOnTop(true, 'floating');
  if (process.platform !== 'win32') mascotWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mascotWin.setIgnoreMouseEvents(true, { forward: true });
  lockDown(mascotWin);
  mascotWin.webContents.on('render-process-gone', (_e, d) => {
    log('mascot renderer gone', d);
    if (mascotWin && !mascotWin.isDestroyed() && d.reason !== 'clean-exit') {
      awaiting = false; reschedule();
      mascotWin.reload();
    }
  });
  mascotWin.loadFile(path.join(__dirname, '../src/mascot/index.html'));
  mascotWin.once('ready-to-show', applyMascotVisibility);
  mascotWin.on('closed', () => (mascotWin = null));
}

function openPanel(tab) {
  tab = TABS.includes(tab) ? tab : 'today';
  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.show(); panelWin.focus();
    panelWin.webContents.send('tab', tab);
    return;
  }
  panelWin = new BrowserWindow({
    width: 560, height: 700, minWidth: 520, minHeight: 600,
    title: 'Buddies', backgroundColor: '#eef3fb',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  lockDown(panelWin);
  panelWin.loadFile(path.join(__dirname, '../src/panel/index.html'), { query: { tab } });
  panelWin.on('closed', () => (panelWin = null));
}

// ---------- tray / menus ----------
function toggleMute() { setSettings({ muted: !store.settings.muted }); }
function setHidden(h) {
  setSettings({ hidden: h });
  applyMascotVisibility();
}
function pause(mode) {
  let until = 0;
  if (mode === '1h') until = now() + 3600000;
  else if (mode === '2h') until = now() + 2 * 3600000;
  else if (mode === 'tomorrow') {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const m = hm(store.settings.activeFrom);
    d.setHours((m / 60) | 0, m % 60, 0, 0);
    until = d.getTime();
  } else if (mode === 'forever') until = FOREVER;
  setSettings({ pausedUntil: until });
  if (until === 0) reschedule();
}

function nextLabel() {
  if (isPaused()) return store.settings.pausedUntil > 8e15 ? '⏸ Paused until you resume' : '⏸ Paused';
  if (awaiting) return `💬 ${buddy()} is asking you now`;
  const mins = Math.round((nextDueAt - now()) / 60000);
  if (mins <= 1) return '⏰ Next reminder: any moment now';
  if (mins < 90) return `⏰ Next reminder in ${mins} min`;
  return `⏰ Next reminder ${dayWord(nextDueAt)}at ${clockTime(nextDueAt)}`;
}

// "9:00 PM" — hour12 is forced so no locale can drop the AM/PM, which made
// "Next reminder at 9:00" read as tonight when it actually meant tomorrow morning.
function clockTime(ms) {
  const d = new Date(ms);
  const s = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  if (/\d\s*[ap]\.?m/i.test(s)) return s;
  return `${(d.getHours() % 12) || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
// '' for today, 'tomorrow ' for tomorrow, 'Sat ' for anything further out.
function dayWord(ms) {
  const d = new Date(ms), t = new Date();
  const key = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (key(d) === key(t)) return '';
  const tm = new Date(t); tm.setDate(tm.getDate() + 1);
  if (key(d) === key(tm)) return 'tomorrow ';
  return `${d.toLocaleDateString([], { weekday: 'short' })} `;
}

function menuTemplate() {
  const s = store.settings;
  const paused = isPaused();
  const t = today();
  return [
    { label: `💧 ${t.yes}/${s.goal} today`, enabled: false },
    { label: nextLabel(), enabled: false },
    { type: 'separator' },
    { label: 'Ask me now', click: () => { if (!awaiting) { attempt = 0; fire('manual'); } } },
    { label: 'I just drank water (+1)', click: () => logWater(1) },
    { type: 'separator' },
    paused
      ? { label: 'Resume reminders', click: () => pause('none') }
      : { label: 'Pause reminders', submenu: [
          { label: 'For 1 hour', click: () => pause('1h') },
          { label: 'For 2 hours', click: () => pause('2h') },
          { label: 'Until tomorrow', click: () => pause('tomorrow') },
          { label: 'Until I resume', click: () => pause('forever') },
        ] },
    { label: s.muted ? 'Unmute sounds' : 'Mute sounds', click: toggleMute },
    { label: s.hidden ? `Show ${buddy()}` : `Hide ${buddy()}`, click: () => setHidden(!s.hidden) },
    { type: 'separator' },
    { label: 'Choose buddy…', click: () => openPanel('buddy') },
    { label: 'Mini-games…', click: () => openPanel('games') },
    { label: 'Settings…', click: () => openPanel('reminders') },
    { label: 'Today & stats…', click: () => openPanel('today') },
    { type: 'separator' },
    { label: 'Quit Buddies', click: () => app.quit() },
  ];
}

function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate()));
  const t = today();
  tray.setToolTip(`Buddies — ${t.yes}/${store.settings.goal} glasses today\n${nextLabel().replace(/^\S+\s/, '')}`);
}

// ---------- settings (validated) ----------
const num = (lo, hi) => (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
const oneOf = (list) => (v) => (list.includes(v) ? v : undefined);
const bool = (v) => (typeof v === 'boolean' ? v : undefined);
const time = (v) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : undefined);
const SCHEMA = {
  userName: (v) => (typeof v === 'string' ? v.replace(/[<>]/g, '').slice(0, 24) : undefined),
  mode: oneOf(['interval', 'times']),
  intervalMin: num(5, 720),
  times: (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => time(x)))].sort().slice(0, 24) : undefined),
  activeFrom: time,
  activeTo: time,
  retryMin: num(1, 120),
  maxRetries: (v) => { const n = num(0, 10)(v); return n === undefined ? n : Math.round(n); },
  answerTimeoutSec: num(15, 600),
  goal: (v) => { const n = num(1, 30)(v); return n === undefined ? n : Math.round(n); },
  muted: bool,
  volume: num(0, 1),
  presence: oneOf(['always', 'reminders']),
  scale: num(0.6, 1.6),
  character: oneOf(Characters.list.map((c) => c.id)),
  bottleColor: oneOf(BOTTLES),
  idleAntics: bool,
  openAtLogin: bool,
  pausedUntil: num(0, FOREVER),
  hidden: bool,
  welcomed: bool,
};
function sanitize(patch) {
  const out = {};
  if (!patch || typeof patch !== 'object') return out;
  for (const k of Object.keys(SCHEMA)) {
    if (!(k in patch)) continue;
    const v = SCHEMA[k](patch[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function setSettings(raw) {
  const patch = sanitize(raw);
  if (!Object.keys(patch).length) return;
  const prev = { ...store.settings };
  Object.assign(store.settings, patch);
  store.save();
  if (patch.openAtLogin !== undefined && app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!patch.openAtLogin });
  if (patch.character) { // keep window titles in step with the chosen buddy
    if (panelWin && !panelWin.isDestroyed()) panelWin.setTitle('Buddies');
  }
  const schedChanged = ['mode', 'intervalMin', 'times', 'activeFrom', 'activeTo'].some((k) => patch[k] !== undefined && JSON.stringify(patch[k]) !== JSON.stringify(prev[k]));
  if (schedChanged && !awaiting) { attempt = 0; reschedule(); } else broadcast();
}

function logWater(delta) {
  delta = delta > 0 ? 1 : -1;
  const key = dayKey();
  const day = (store.data.days[key] = store.data.days[key] || { yes: 0, no: 0 });
  day.yes = Math.max(0, day.yes + delta);
  store.save();
  if (delta > 0 && mascotWin && !mascotWin.isDestroyed()) mascotWin.webContents.send('command', { name: 'logged', state: snapshot() });
  if (delta > 0 && !awaiting) { attempt = 0; reschedule(); } else broadcast();
}

// ---------- IPC ----------
handle('state:get', () => snapshot());
handle('display:get', () => workArea());
on('win:move', (_e, x, y) => { if (mascotWin && !mascotWin.isDestroyed()) mascotWin.setPosition(int(x), int(y), false); });
on('win:size', (_e, w, h) => { if (mascotWin && !mascotWin.isDestroyed()) mascotWin.setSize(int(w, 200, 1200), int(h, 200, 1400), false); });
on('settings:update', (_e, patch) => setSettings(patch));
on('answer', (_e, answer) => { if (['yes', 'no', 'later', 'timeout'].includes(answer) && awaiting) handleAnswer(answer); });
on('mouse:ignore', (_e, ignore) => { if (mascotWin && !mascotWin.isDestroyed()) mascotWin.setIgnoreMouseEvents(!!ignore, { forward: true }); });
on('mascot:visible', (_e, v) => { mascotVisible = !!v; applyMascotVisibility(); });
on('menu:context', () => Menu.buildFromTemplate(menuTemplate()).popup({ window: mascotWin }));
on('panel:open', (_e, tab) => openPanel(tab));
on('water:log', (_e, d) => logWater(Number(d)));
on('remind:now', () => { if (!awaiting) { attempt = 0; fire('manual'); } });
on('pause', (_e, mode) => { if (['1h', '2h', 'tomorrow', 'forever', 'none'].includes(mode)) pause(mode); });
on('game:result', (_e, r) => {
  if (!r || !GAMES.includes(r.game)) return;
  const score = int(r.score, 0, 100000);
  const g = (store.data.games[r.game] = store.data.games[r.game] || { best: 0, plays: 0 });
  const isBest = score > g.best;
  g.plays++;
  if (isBest) g.best = score;
  store.save();
  if (mascotWin && !mascotWin.isDestroyed()) mascotWin.webContents.send('game-result', { game: r.game, score, best: g.best, isBest });
  broadcast();
});

// ---------- lifecycle ----------
app.whenReady().then(() => {
  store = new Store(log);
  if (process.platform === 'darwin') app.dock.hide();

  // No renderer ever needs camera, mic, geolocation, notifications, etc.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  tray = new Tray(dropIcon(32).resize({ width: 18, height: 18 }));
  tray.on('click', () => openPanel('today'));

  createMascotWindow();
  reschedule();
  // First thing on launch: the buddy walks in and asks, so the buttons are seen right away.
  mascotWin.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (!store.settings.hidden && !isPaused() && !awaiting) { attempt = 0; fire('launch'); }
    }, 2500);
  });
  refreshTray();
  setInterval(tick, 10000); // wall-clock based, so sleep/wake can't skip reminders
  setInterval(refreshTray, 60000); // keep the "next reminder in N min" label fresh

  if (!store.settings.welcomed) {
    setSettings({ welcomed: true });
    setTimeout(() => openPanel('buddy'), 2500); // first run: let them pick a buddy
  }

  powerMonitor.on('resume', () => { locked = false; setTimeout(tick, 4000); });
  powerMonitor.on('lock-screen', () => (locked = true));
  powerMonitor.on('unlock-screen', () => { locked = false; });
  const pushDisplay = () => mascotWin && !mascotWin.isDestroyed() && mascotWin.webContents.send('display', workArea());
  screen.on('display-metrics-changed', pushDisplay);
  screen.on('display-added', pushDisplay);
  screen.on('display-removed', pushDisplay);
  log('started', app.getVersion(), process.platform, process.arch);
}).catch((e) => log('startup failed', e));

app.on('second-instance', () => openPanel('today'));
app.on('window-all-closed', (e) => e.preventDefault()); // live in the tray
app.on('before-quit', () => store && store.flush());
