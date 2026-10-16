// Tiny JSON persistence in the user-data folder. Writes are debounced and atomic.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  settings: {
    userName: '',
    mode: 'interval', // 'interval' | 'times'
    intervalMin: 45,
    times: ['09:30', '11:30', '14:00', '16:00', '18:00'],
    activeFrom: '09:00',
    activeTo: '21:00',
    retryMin: 10,
    maxRetries: 3,
    answerTimeoutSec: 90,
    goal: 8,
    muted: false,
    volume: 0.6,
    presence: 'reminders', // 'reminders' (visits when it's time) | 'always' (hangs out)
    scale: 1,
    character: 'panda',
    bottleColor: 'pink',
    idleAntics: true,
    openAtLogin: false,
    pausedUntil: 0,
    hidden: false,
    welcomed: false,
    version: 2,
  },
  days: {}, // 'YYYY-MM-DD' -> { yes, no }
  games: {}, // name -> { best, plays }
};

class Store {
  constructor(log = () => {}) {
    this.log = log;
    const dir = app.getPath('userData');
    this.file = path.join(dir, 'settings.json');
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    // Read the current file; fall back to the legacy name; quarantine a corrupt file.
    for (const f of [this.file, path.join(dir, 'sprig.json')]) {
      if (!fs.existsSync(f)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
        this.data.settings = { ...DEFAULTS.settings, ...(raw.settings || {}) };
        this.data.days = raw.days && typeof raw.days === 'object' ? raw.days : {};
        this.data.games = raw.games && typeof raw.games === 'object' ? raw.games : {};
        if ((raw.settings || {}).version !== 2) { // v2: the buddy now visits instead of lingering
          this.data.settings.presence = 'reminders';
          this.data.settings.version = 2;
        }
        break;
      } catch (e) {
        this.log('settings file unreadable, starting fresh', f, e);
        try { fs.renameSync(f, f + '.corrupt-' + Date.now()); } catch (e2) { /* ignore */ }
      }
    }
    this._t = null;
  }

  get settings() { return this.data.settings; }

  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 300);
  }

  flush() {
    clearTimeout(this._t);
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (e) { this.log('save failed', e); }
  }
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

module.exports = { Store, dayKey, DEFAULTS };
