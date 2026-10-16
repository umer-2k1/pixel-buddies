(function () {
  const pf = window.pf;
  const $ = (id) => document.getElementById(id);
  const COLORS = { pink: '#ff8fb1', yellow: '#ffc94d', purple: '#a98bff', orange: '#ff9a5c', blue: '#5ab0ff' };
  if (/Mac/.test(navigator.platform)) document.body.classList.add('mac');

  let st = null;
  let current = null; // the running mini-game
  const buddy = new Mascot($('buddy'));
  const chosen = () => Characters.get(st && st.settings.character);
  buddy.autoLook = true;

  // ---------- tabs ----------
  function showTab(name) {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('main > section').forEach((s) => s.classList.toggle('on', s.dataset.tab === name));
    if (name !== 'games') leaveGame();
  }
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => { Sound.play('tick'); showTab(b.dataset.tab); }));
  pf.onTab(showTab);
  showTab(new URLSearchParams(location.search).get('tab') || 'today');

  // ---------- helpers ----------
  const send = (patch) => { Object.assign(st.settings, patch); pf.updateSettings(patch); };
  let debounce;
  const sendSoon = (patch) => { Object.assign(st.settings, patch); clearTimeout(debounce); debounce = setTimeout(() => pf.updateSettings(patch), 120); };
  const seg = (id, key) => $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.play('tick'); send({ [key]: b.dataset.v }); render(); }));
  seg('modeSeg', 'mode'); seg('presenceSeg', 'presence');

  // ---------- today ----------
  $('drank').addEventListener('click', () => { pf.logWater(1); Sound.play('splash'); buddyCheer(); });
  $('undo').addEventListener('click', () => pf.logWater(-1));
  $('askNow').addEventListener('click', () => pf.askNow());
  $('pauseRow').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => pf.pause(b.dataset.pause)));

  // ---------- reminders ----------
  $('interval').addEventListener('input', (e) => { $('intervalVal').textContent = e.target.value; sendSoon({ intervalMin: +e.target.value }); markChips(); });
  $('intervalChips').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { send({ intervalMin: +b.dataset.m }); render(); }));
  const markChips = () => $('intervalChips').querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.m === st.settings.intervalMin));
  $('activeFrom').addEventListener('change', (e) => send({ activeFrom: e.target.value || '09:00' }));
  $('activeTo').addEventListener('change', (e) => send({ activeTo: e.target.value || '21:00' }));
  $('addTime').addEventListener('click', () => {
    const v = $('newTime').value;
    if (!v || st.settings.times.includes(v)) return;
    send({ times: [...st.settings.times, v].sort() }); render();
  });
  $('retryMin').addEventListener('change', (e) => send({ retryMin: +e.target.value }));
  $('maxRetries').addEventListener('change', (e) => send({ maxRetries: +e.target.value }));
  $('timeout').addEventListener('change', (e) => send({ answerTimeoutSec: +e.target.value }));
  $('goalMinus').addEventListener('click', () => { send({ goal: Math.max(1, st.settings.goal - 1) }); render(); });
  $('goalPlus').addEventListener('click', () => { send({ goal: Math.min(20, st.settings.goal + 1) }); render(); });

  // ---------- buddy & sound ----------
  $('userName').addEventListener('input', (e) => sendSoon({ userName: e.target.value.trim() }));
  $('scale').addEventListener('input', (e) => { $('scaleVal').textContent = Math.round(e.target.value * 100) + '%'; sendSoon({ scale: +e.target.value }); });
  $('idleAntics').addEventListener('change', (e) => send({ idleAntics: e.target.checked }));
  $('openAtLogin').addEventListener('change', (e) => send({ openAtLogin: e.target.checked }));
  $('sound').addEventListener('change', (e) => { send({ muted: !e.target.checked }); Sound.configure({ muted: !e.target.checked }); Sound.play('yes'); });
  $('volume').addEventListener('input', (e) => { $('volVal').textContent = Math.round(e.target.value * 100) + '%'; Sound.configure({ volume: +e.target.value }); sendSoon({ volume: +e.target.value }); });
  $('volume').addEventListener('change', () => Sound.play('tick'));
  $('testSound').addEventListener('click', () => { Sound.play('ask'); buddyCheer(); });
  Object.entries(COLORS).forEach(([k, c]) => {
    const b = document.createElement('button');
    b.style.background = c; b.dataset.k = k; b.title = k;
    b.addEventListener('click', () => { send({ bottleColor: k }); buddy.setBottleColor(k); Sound.play('tick'); render(); });
    $('swatches').appendChild(b);
  });

  // ---------- buddy mini-mascot ----------
  function buddyCheer() {
    buddy.run(async (c) => {
      c.emo('joy', 120);
      buddy.burst(['💧', '✨'], 5);
      await buddy.hop(c, 26, 340);
      await buddy.wave(c, 1);
      await c.emo('neutral', 300);
    });
  }
  $('buddy').addEventListener('click', () => { Sound.play('poke'); buddyCheer(); });
  const mood = (type) => buddy.run(async (c) => {
    if (type === 'good') { c.emo('happy', 150); await buddy.cheer(c, 2); }
    else { c.emo('concern', 150); await buddy.shake(c, 2); }
    await c.emo('neutral', 300);
  });

  // ---------- character picker ----------
  const previews = {};
  function renderCharacters() {
    const grid = $('charGrid');
    if (!grid.children.length) {
      Characters.list.forEach((c) => {
        const card = document.createElement('button');
        card.className = 'char'; card.dataset.id = c.id;
        card.innerHTML = `<div class="pic"><div></div></div><b>${c.name} <i class="tick">✓</i></b><span>${c.species} · ${c.tagline}</span>`;
        card.addEventListener('click', () => { Sound.play('pop'); send({ character: c.id }); render(); });
        grid.appendChild(card);
        previews[c.id] = new Mascot(card.querySelector('.pic > div'), { skin: c.id, bottleColor: st.settings.bottleColor });
        previews[c.id].svg.style.cssText = 'width:100px;height:120px';
      });
    }
    [...grid.children].forEach((card) => {
      card.classList.toggle('on', card.dataset.id === st.settings.character);
      const p = previews[card.dataset.id];
      if (p) { p.setBottleColor(st.settings.bottleColor); }
    });
  }

  // ---------- render ----------
  let tickInt;
  function render() {
    if (!st) return;
    const s = st.settings;
    Sound.configure({ muted: s.muted, volume: s.volume });
    buddy.setBottleColor(s.bottleColor);
    if (s.character) buddy.setSkin(s.character);
    $('buddyName').textContent = chosen().name;
    renderCharacters();
    const goal = s.goal, yes = st.today.yes;
    $('count').textContent = yes;
    $('goalTxt').textContent = goal;
    $('goalVal').textContent = goal;
    $('ringArc').style.strokeDashoffset = 364.4 * (1 - Math.min(1, yes / goal));
    $('streak').textContent = st.streak;
    $('tagline').textContent = yes >= goal ? 'Goal reached — you’re a legend! 🏆' : yes === 0 ? 'Let’s get the first glass in!' : `${goal - yes} to go. You’ve got this!`;
    const gl = $('glasses');
    const n = Math.max(goal, yes);
    if (gl.children.length !== n) {
      gl.innerHTML = '';
      for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'glass'; d.addEventListener('click', () => pf.logWater(i < st.today.yes ? -1 : 1)); gl.appendChild(d); }
    }
    [...gl.children].forEach((d, i) => d.classList.toggle('full', i < yes));
    const max = Math.max(goal, ...st.week.map((d) => d.yes));
    $('week').innerHTML = st.week.map((d, i) => `<div class="d ${d.yes >= goal ? 'hit' : ''} ${i === 6 ? 'today' : ''}"><div class="bar"><i style="height:${Math.max(4, (d.yes / max) * 100)}%"></i></div>${i === 6 ? 'Today' : d.label}<br>${d.yes}</div>`).join('');
    $('resumeBtn').style.display = st.paused ? '' : 'none';
    $('pauseRow').querySelectorAll('button:not(#resumeBtn)').forEach((b) => (b.style.display = st.paused ? 'none' : ''));

    document.querySelectorAll('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.mode));
    document.querySelectorAll('#presenceSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.presence));
    $('intervalBox').classList.toggle('hidden', s.mode !== 'interval');
    $('timesBox').classList.toggle('hidden', s.mode !== 'times');
    $('interval').value = s.intervalMin; $('intervalVal').textContent = s.intervalMin; markChips();
    const setIf = (el, v) => { if (document.activeElement !== el) el.value = v; };
    setIf($('activeFrom'), s.activeFrom); setIf($('activeTo'), s.activeTo);
    setIf($('retryMin'), s.retryMin); setIf($('maxRetries'), s.maxRetries); setIf($('timeout'), s.answerTimeoutSec);
    setIf($('userName'), s.userName);
    $('timeChips').innerHTML = '';
    s.times.forEach((t) => {
      const c = document.createElement('span'); c.className = 'chips'; c.innerHTML = `<button class="t">${t} <i>✕</i></button>`;
      c.firstChild.addEventListener('click', () => { send({ times: st.settings.times.filter((x) => x !== t) }); render(); });
      $('timeChips').appendChild(c);
    });
    $('scale').value = s.scale; $('scaleVal').textContent = Math.round(s.scale * 100) + '%';
    $('volume').value = s.volume; $('volVal').textContent = Math.round(s.volume * 100) + '%';
    $('sound').checked = !s.muted; $('idleAntics').checked = s.idleAntics; $('openAtLogin').checked = s.openAtLogin;
    $('swatches').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === s.bottleColor));
    renderNext();
    renderGameCards();
  }

  function renderNext() {
    if (!st) return;
    let t;
    if (st.paused) t = st.pausedUntil > 8e15 ? '⏸ Paused until you resume' : '⏸ Paused until ' + new Date(st.pausedUntil).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    else if (st.awaiting) t = chosen().name + ' is asking you right now… 💧';
    else {
      const mins = Math.max(0, Math.round((st.nextDueAt - Date.now()) / 60000));
      t = mins <= 0 ? 'Next reminder: any moment now' : mins < 60 ? `Next reminder in ${mins} min` : `Next reminder at ${new Date(st.nextDueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    $('nextTxt').textContent = t;
  }
  clearInterval(tickInt);
  tickInt = setInterval(renderNext, 15000);

  // ---------- games ----------
  function renderGameCards() {
    const grid = $('gameGrid');
    grid.innerHTML = '';
    Games.list.forEach((g) => {
      const best = st.games[g.id];
      const b = document.createElement('button');
      b.className = 'gcard';
      b.innerHTML = `<div class="em">${g.emoji}</div><div><b>${g.title}</b><span>${g.desc}</span></div><div class="best">${best ? 'Best<br>' + best.best : 'New!'}</div>`;
      b.addEventListener('click', () => { Sound.play('start'); startGame(g); });
      grid.appendChild(b);
    });
  }
  function startGame(g) {
    leaveGame();
    $('gamesMenu').classList.add('hidden');
    $('gameArea').classList.remove('hidden');
    $('gameTitle').textContent = g.title;
    const host = $('gameHost');
    host.innerHTML = '';
    const ctx = {
      setScore: (t) => ($('gameScore').textContent = t),
      finish: (score) => finish(g, score),
    };
    const hint = document.createElement('p'); hint.className = 'hint'; hint.style.margin = '0 0 10px';
    host.appendChild(hint);
    current = { g, game: g.start(host, ctx) };
    hint.textContent = current.game.hint || '';
  }
  function finish(g, score) {
    if (!current) return;
    current.game.stop();
    pf.gameResult({ game: g.id, score });
    const prevBest = (st.games[g.id] && st.games[g.id].best) || 0;
    const isBest = score > prevBest;
    Sound.play(isBest ? 'big' : score > 0 ? 'yes' : 'no');
    mood(score > 0 ? 'good' : 'bad');
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<h2>${isBest ? '🏆 New best!' : score > 0 ? 'Nice one!' : 'Aww, so close!'}</h2><div class="sc">${score}</div><div class="hint">Best: ${Math.max(prevBest, score)}</div>
      <div class="row" style="justify-content:center"><button class="big" id="again" style="padding:10px 20px">Play again</button><button class="ghost" id="menu">Menu</button></div>`;
    $('gameHost').appendChild(ov);
    ov.querySelector('#again').addEventListener('click', () => startGame(g));
    ov.querySelector('#menu').addEventListener('click', leaveGame);
  }
  function leaveGame() {
    if (current) { current.game.stop(); current = null; }
    $('gameHost').innerHTML = '';
    $('gameScore').textContent = '';
    $('gameArea').classList.add('hidden');
    $('gamesMenu').classList.remove('hidden');
  }
  $('gameBack').addEventListener('click', leaveGame);

  // ---------- boot ----------
  pf.onState((s) => { st = s; render(); });
  pf.getState().then((s) => { st = s; render(); });
})();
