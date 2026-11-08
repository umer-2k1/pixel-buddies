// Stands in for the app's preload bridge so the REAL settings panel can be screenshotted with demo data.
(function () {
  const wk = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], yes = [8, 6, 9, 5, 8, 3, 5];
  const st = {
    settings: { userName: '', mode: 'interval', intervalMin: 45, times: ['09:30', '11:30', '14:00', '16:00', '18:00'], activeFrom: '09:00', activeTo: '21:00', retryMin: 10, maxRetries: 3, answerTimeoutSec: 90, goal: 8, muted: false, volume: 0.6, presence: 'reminders', scale: 1, character: 'panda', bottleColor: 'pink', idleAntics: true, openAtLogin: false },
    today: { yes: 5, no: 1 }, streak: 4,
    week: wk.map((label, i) => ({ label, yes: yes[i] })),
    games: { drop: { best: 42, plays: 4 }, memory: { best: 88, plays: 2 }, pour: { best: 340, plays: 3 } },
    nextDueAt: Date.now() + 23 * 60000, paused: false, awaiting: false,
  };
  window.pf = { getState: async () => st, onState() {}, onTab() {}, updateSettings() {}, logWater() {}, askNow() {}, pause() {}, gameResult() {} };
})();
