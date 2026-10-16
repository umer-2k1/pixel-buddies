(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  Sound.configure({ muted: true, volume: 0.5 });

  // ---------- decorative droplets ----------
  var dropsEl = $('.drops');
  if (dropsEl && !reduce) {
    for (var i = 0; i < 14; i++) {
      var d = document.createElement('i'), s = 0.6 + Math.random() * 1.1;
      d.style.cssText = 'left:' + Math.round(Math.random() * 100) + '%;transform:scale(' + s + ');animation-duration:' + (14 + Math.random() * 16) + 's;animation-delay:-' + (Math.random() * 20) + 's;opacity:' + (0.25 + Math.random() * 0.4);
      dropsEl.appendChild(d);
    }
  }

  // ---------- scroll reveal ----------
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 }) : null;
  function watch(el) { if (io) io.observe(el); else el.classList.add('in'); }
  document.querySelectorAll('.reveal').forEach(watch);

  // ---------- sound toggle ----------
  var soundBtn = $('#sound');
  soundBtn.addEventListener('click', function () {
    var on = soundBtn.getAttribute('aria-pressed') !== 'true';
    Sound.configure({ muted: !on });
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.firstElementChild.textContent = on ? '🔊' : '🔇';
    soundBtn.lastElementChild.textContent = on ? 'Sound on' : 'Sound off';
    if (on) Sound.play('pop');
  });

  // ---------- confetti ----------
  var fx = $('#fx'), COLORS = ['#5cc3ff', '#ff8fb1', '#ffd45c', '#8de6b8', '#b69bff', '#ff9a5c', '#ffffff'];
  function confetti(x, y, n) {
    if (reduce) return;
    for (var i = 0; i < n; i++) {
      let el = document.createElement('i'); var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 240 + Math.random() * 420;
      var dx = Math.cos(a) * v, dy = Math.sin(a) * v;
      el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + (8 + Math.random() * 8) + 'px;height:' + (6 + Math.random() * 7) + 'px;background:' + pick(COLORS);
      fx.appendChild(el);
      el.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + Math.random() * 540 + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + dx * 1.2 + 'px,' + (dy + 520) + 'px) rotate(' + Math.random() * 900 + 'deg)', opacity: 0 },
      ], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = function () { el.remove(); };
    }
  }

  // ---------- hero demo (the real app animation engine) ----------
  var host = $('#hero-char'), bubble = $('#bubble'), btext = $('#bubble-text'), bbtns = $('#bubble-btns');
  var score = $('#score'), who = $('#who');
  var hero = new Mascot(host, { skin: 'panda', bottleColor: 'pink' });
  var count = 0, state = 'busy';
  var NO_LINES = ['No rush! A few sips would feel great 💧', 'That’s okay — your bottle is right here.', 'Whenever you’re ready. Even one sip helps!'];
  var YES_LINES = ['Nice one! 💙', 'Refreshing!', 'You’re amazing!', 'That’s the whole habit.'];

  function say(text, buttons) { btext.textContent = text; bbtns.classList.toggle('hide', !buttons); bubble.classList.remove('hide'); }

  function ask(first) {
    state = 'asking';
    say(first ? 'Have you had some water?' : pick(['Time for a sip?', 'Water check! 💧', 'Have you had some water?']), true);
    hero.run(function (c) {
      return (async function () {
        c.emo('ask', 200);
        await hero.hop(c, 26, 380);
        for (;;) {
          await hero.offer(c, 1); await c.wait(1800);
          await c.to({ rArm: Mascot.REST.rArm, bottle: Mascot.REST.bottle }, 320); await c.wait(2200);
          await hero.wave(c, 1); await c.wait(2800);
        }
      })();
    });
  }

  async function yes() {
    if (state !== 'asking') return;
    state = 'busy'; count++;
    var goal = count >= 8;
    Sound.play(goal ? 'big' : 'yes');
    say(goal ? 'Daily goal reached! 🏆' : pick(YES_LINES), false);
    score.textContent = count + '/8 today';
    var r = host.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height * 0.4, goal ? 70 : 30);
    await hero.run(function (c) {
      return (async function () {
        c.emo('joy', 150);
        hero.burst(['💙', '✨', '⭐'], goal ? 9 : 5);
        c.to({ lArm: 150, rArm: 150, bottle: 14 }, 200, 'out');
        await hero.hop(c, 40, 420);
        await hero.sip(c, { gulps: 1, amount: 0.1 });
        Sound.play('sparkle');
        c.emo('happy', 200); c.to({ water: 0.7 }, 800);
        await hero.wave(c, 1); await c.wait(800);
      })();
    });
    if (goal) { count = 0; score.textContent = '0/8 today'; }
    ask(false);
  }

  async function no() {
    if (state !== 'asking') return;
    state = 'busy';
    Sound.play('hmm');
    say(pick(NO_LINES), false);
    await hero.run(function (c) {
      return (async function () {
        c.emo('hmm', 220);
        hero.autoLook = false;
        await c.to({ lookX: 0.9, lookY: 0.8, rArm: -30, bottle: 4 }, 380); await c.wait(750);
        await c.to({ lookX: 0, lookY: 0 }, 320);
        c.emo('ask', 300); await hero.offer(c, 1); await c.wait(1000);
      })();
    });
    ask(false);
  }
  $('#b-yes').addEventListener('click', yes);
  $('#b-no').addEventListener('click', no);

  async function setBuddy(id) {
    var b = Characters.get(id);
    state = 'busy';
    hero.setSkin(id);
    who.textContent = b.name + ' the ' + b.species.toLowerCase();
    document.querySelectorAll('.b-card').forEach(function (c) { c.classList.toggle('on', c.dataset.id === id); });
    count = 0; score.textContent = '0/8 today';
    Sound.play('appear');
    say('Hi, I’m ' + b.name + '! 💧', false);
    await hero.run(function (c) {
      return (async function () {
        c.emo('joy', 150); hero.burst(['✨', '💙'], 5);
        await hero.hop(c, 38, 400); await hero.wave(c, 2); await c.wait(300);
      })();
    });
    ask(true);
  }

  async function walkIn() {
    if (reduce) return;
    hero.svg.style.transform = 'scaleX(1)';
    hero.setWalking(true); hero.hot = true;
    var a = host.animate([{ transform: 'translateX(-560px)' }, { transform: 'translateX(0)' }], { duration: 1800, easing: 'cubic-bezier(.2,.6,.3,1)' });
    host.style.transform = 'translateX(-560px)';
    await a.finished;
    host.style.transform = ''; a.cancel();
    hero.setWalking(false); hero.hot = false;
  }

  // ---------- buddy cards ----------
  var BG = {
    panda: 'linear-gradient(180deg,#d9ecff,#b9d9ff)', cat: 'linear-gradient(180deg,#ffe6c8,#ffc88f)', bunny: 'linear-gradient(180deg,#eee6ff,#d4c5ff)',
    penguin: 'linear-gradient(180deg,#d3e0f7,#a3b9ea)', axolotl: 'linear-gradient(180deg,#ffe0ec,#ffbcd3)',
  };
  var grid = $('#buddy-grid');
  Characters.list.forEach(function (c) {
    var card = document.createElement('article');
    card.className = 'b-card reveal' + (c.id === 'panda' ? ' on' : '');
    card.dataset.id = c.id;
    card.innerHTML = '<div class="b-stage" style="background:' + BG[c.id] + '"><div class="b-char" role="img" aria-label="' + c.name + ' the ' + c.species.toLowerCase() + '"></div></div>' +
      '<h3>' + c.name + '</h3><div class="sp">' + c.species + '</div><p>' + c.tagline + '</p><button type="button">Try ' + c.name + '</button>';
    grid.appendChild(card); watch(card);
    var m = new Mascot(card.querySelector('.b-char'), { skin: c.id, bottleColor: 'pink' });
    m.set(Object.assign({}, Mascot.EMO.happy, { lArm: 150 }));
    var greet = function () { m.run(function (ctx) { return (async function () { ctx.emo('joy', 120); m.burst(['✨', '💧'], 3); await m.hop(ctx, 34, 380); await m.wave(ctx, 1); ctx.emo('happy', 300); ctx.to({ lArm: 150 }, 300); })(); }); Sound.play('poke'); };
    card.querySelector('.b-char').addEventListener('click', greet);
    card.querySelector('.b-char').addEventListener('mouseenter', function () { if (!reduce) m.tween({ sy: 1.04 }, 150).then(function () { return m.tween({ sy: 1 }, 200); }); });
    card.querySelector('button').addEventListener('click', function () {
      setBuddy(c.id);
      document.getElementById('top').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // ---------- go ----------
  (async function boot() {
    host.style.opacity = '0';
    await sleep(250);
    host.style.opacity = '';
    await walkIn();
    ask(true);
  })();
})();
