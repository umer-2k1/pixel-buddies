// Three small games. Each start() returns { stop() }; call ctx.finish(score) when done.
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  // ---- 1. Drop Catch ------------------------------------------------------
  function dropCatch(host, ctx) {
    const cv = document.createElement('canvas');
    cv.width = 480; cv.height = 360;
    host.appendChild(cv);
    const g = cv.getContext('2d');
    let cupX = 240, targetX = 240, drops = [], score = 0, timeLeft = 30, spawn = 0, raf, last = performance.now(), done = false, lives = 3;
    const keys = {};
    const move = (e) => { const r = cv.getBoundingClientRect(); targetX = ((e.clientX - r.left) / r.width) * cv.width; };
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerdown', move);
    const kd = (e) => { keys[e.key] = true; }, ku = (e) => { keys[e.key] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    let msg = '', msgT = 0;

    function drawDrop(x, y, r, color) {
      g.fillStyle = color; g.beginPath(); g.arc(x, y + 3, r, 0, 7); g.moveTo(x - r, y + 2); g.lineTo(x, y - r * 2); g.lineTo(x + r, y + 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - r * 0.35, y + 1, r * 0.25, 0, 7); g.fill();
    }
    function loop(t) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!done) {
        timeLeft -= dt; spawn -= dt;
        if (keys.ArrowLeft || keys.a) targetX -= 520 * dt;
        if (keys.ArrowRight || keys.d) targetX += 520 * dt;
        targetX = clamp(targetX, 40, cv.width - 40);
        cupX += (targetX - cupX) * Math.min(1, dt * 14);
        const hard = 1 + (30 - timeLeft) / 30;
        if (spawn <= 0) {
          spawn = rand(0.28, 0.6) / hard;
          const r = Math.random();
          drops.push({ x: rand(30, cv.width - 30), y: -20, vy: rand(150, 230) * hard, kind: r < 0.62 ? 'w' : r < 0.72 ? 'g' : 'b' });
        }
        for (const d of drops) {
          d.y += d.vy * dt;
          if (!d.hit && d.y > 292 && d.y < 330 && Math.abs(d.x - cupX) < 42) {
            d.hit = true;
            if (d.kind === 'w') { score += 1; Sound.play('good'); }
            else if (d.kind === 'g') { score += 5; Sound.play('match'); msg = '+5 ✨'; msgT = 0.7; }
            else { score = Math.max(0, score - 3); lives--; Sound.play('bad'); msg = 'Yuck! −3'; msgT = 0.8; }
            ctx.setScore(score + ' pts');
          }
        }
        drops = drops.filter((d) => !d.hit && d.y < cv.height + 30);
        if (timeLeft <= 0) { done = true; ctx.finish(score); }
      }
      // draw
      g.clearRect(0, 0, cv.width, cv.height);
      for (const d of drops) {
        if (d.kind === 'b') { g.font = '30px system-ui'; g.textAlign = 'center'; g.fillText('🍬', d.x, d.y + 10); }
        else drawDrop(d.x, d.y, d.kind === 'g' ? 13 : 10, d.kind === 'g' ? '#ffc93d' : '#46aef7');
      }
      // glass
      g.save(); g.translate(cupX, 300);
      g.fillStyle = 'rgba(210,235,255,.9)'; g.strokeStyle = '#7cc4f2'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-34, -14); g.lineTo(34, -14); g.lineTo(26, 36); g.lineTo(-26, 36); g.closePath(); g.fill(); g.stroke();
      const fill = clamp(score / 40, 0, 1);
      g.fillStyle = '#4fb4f6'; g.beginPath(); g.moveTo(-34 + 8 * (1 - fill) * 0.1, -14 + (1 - fill) * 44); g.lineTo(34, -14 + (1 - fill) * 44); g.lineTo(26, 34); g.lineTo(-26, 34); g.closePath(); g.fill();
      g.restore();
      // hud
      g.fillStyle = '#25304a'; g.font = '800 18px system-ui'; g.textAlign = 'left';
      g.fillText('⏱ ' + Math.max(0, Math.ceil(timeLeft)), 12, 26);
      if (msgT > 0) { msgT -= dt; g.textAlign = 'center'; g.fillText(msg, cupX, 250); }
      raf = requestAnimationFrame(loop);
    }
    ctx.setScore('0 pts');
    raf = requestAnimationFrame(loop);
    return {
      hint: 'Move your mouse (or ←/→) to catch the blue drops. Gold = +5. Avoid candy!',
      stop() { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); },
    };
  }

  // ---- 2. Memory Match ----------------------------------------------------
  function memory(host, ctx) {
    const faces = ['💧', '🍋', '🥒', '🍓', '🧊', '🍉', '🍊', '🍃'];
    const deck = [...faces, ...faces].sort(() => Math.random() - 0.5);
    const grid = document.createElement('div'); grid.className = 'mem';
    host.appendChild(grid);
    let first = null, lock = false, moves = 0, matched = 0;
    const t0 = performance.now();
    const btns = deck.map((f, i) => {
      const b = document.createElement('button');
      b.textContent = f;
      b.addEventListener('click', () => flip(i));
      grid.appendChild(b);
      return b;
    });
    function flip(i) {
      const b = btns[i];
      if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
      b.classList.add('up'); Sound.play('flip');
      if (first === null) { first = i; return; }
      moves++; ctx.setScore(moves + ' moves');
      const a = first; first = null;
      if (deck[a] === deck[i]) {
        btns[a].classList.add('done'); b.classList.add('done'); Sound.play('match');
        if (++matched === faces.length) {
          const sec = (performance.now() - t0) / 1000;
          setTimeout(() => ctx.finish(Math.max(10, Math.round(140 - (moves - 8) * 7 - sec * 0.8))), 500);
        }
      } else {
        lock = true;
        setTimeout(() => { btns[a].classList.remove('up'); b.classList.remove('up'); lock = false; }, 750);
      }
    }
    ctx.setScore('0 moves');
    return { hint: 'Flip two cards at a time and find all the matching pairs.', stop() {} };
  }

  // ---- 3. Perfect Pour ----------------------------------------------------
  function pour(host, ctx) {
    const root = document.createElement('div'); root.className = 'pour';
    root.innerHTML = `<div class="bigbottle"><i></i></div><div class="msg"></div>
      <div class="track"><div class="zone"></div><div class="mark"></div></div>
      <button class="big" style="max-width:260px;width:100%">Stop the pour!</button>`;
    host.appendChild(root);
    const zone = root.querySelector('.zone'), mark = root.querySelector('.mark'), msg = root.querySelector('.msg'), fillEl = root.querySelector('.bigbottle i'), btn = root.querySelector('button');
    const ROUNDS = 5;
    let round = 0, score = 0, pos = 0, dir = 1, speed = 0.9, zc = 0.5, zw = 0.3, raf, last = performance.now(), waiting = false;
    function newRound() {
      zw = 0.3 - round * 0.04; zc = rand(zw / 2 + 0.05, 1 - zw / 2 - 0.05);
      speed = 0.85 + round * 0.3;
      zone.style.left = (zc - zw / 2) * 100 + '%'; zone.style.width = zw * 100 + '%';
      pos = Math.random() < 0.5 ? 0 : 1; dir = pos ? -1 : 1;
      ctx.setScore(`Round ${round + 1}/${ROUNDS}`);
      waiting = false;
    }
    function stop() {
      if (waiting) return;
      waiting = true;
      const off = Math.abs(pos - zc);
      let pts = 0, text = 'Oops! 💦';
      if (off <= zw * 0.15) { pts = 100; text = 'PERFECT! ✨'; Sound.play('match'); }
      else if (off <= zw / 2) { pts = 60; text = 'Nice pour! 💧'; Sound.play('good'); }
      else if (off <= zw) { pts = 25; text = 'Close one!'; Sound.play('flip'); }
      else Sound.play('bad');
      score += pts; msg.textContent = `${text}  +${pts}`;
      fillEl.style.height = clamp((round + 1) / ROUNDS * 100 * (0.5 + score / (ROUNDS * 200)), 8, 100) + '%';
      round++;
      setTimeout(() => { msg.textContent = ''; if (round >= ROUNDS) ctx.finish(score); else newRound(); }, 900);
    }
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); stop(); } };
    window.addEventListener('keydown', key);
    btn.addEventListener('click', stop);
    function loop(t) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!waiting) {
        pos += dir * speed * dt;
        if (pos > 1) { pos = 1; dir = -1; } else if (pos < 0) { pos = 0; dir = 1; }
        mark.style.left = pos * 100 + '%';
      }
      raf = requestAnimationFrame(loop);
    }
    newRound();
    raf = requestAnimationFrame(loop);
    return { hint: 'Stop the marker inside the green zone (Space or click). The zone gets smaller!', stop() { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); } };
  }

  window.Games = {
    list: [
      { id: 'drop', title: 'Drop Catch', emoji: '🥛', desc: '30 seconds. Catch drops, dodge candy.', start: dropCatch, unit: 'pts' },
      { id: 'memory', title: 'Memory Match', emoji: '🧠', desc: 'Match all 8 pairs in few moves.', start: memory, unit: 'pts' },
      { id: 'pour', title: 'Perfect Pour', emoji: '🎯', desc: 'Stop the marker in the green zone.', start: pour, unit: 'pts' },
    ],
  };
})();
