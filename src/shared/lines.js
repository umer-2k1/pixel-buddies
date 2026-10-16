// What the mascot says. {name} = the user's name (or "friend").
(function () {
  const L = {
    ask: [
      'Hey, have you had some water?',
      'Quick check-in: have you had some water? 💧',
      'Hi {name}! Have you had some water?',
    ],
    launch: [
      'Hi {name}! I’m {mascot} 💧 Have you had some water today?',
      'Hello {name}! {mascot} here. Have you had some water yet?',
    ],
    askRetry: [
      'Just checking again… any water yet? 🥹',
      'Tiny reminder: water? I believe in you!',
      'Okay, second try! Had a little sip?',
    ],
    askLastTry: [
      'Last nudge, I promise! A little sip? 💧',
    ],
    yes: [
      'Yay!! You’re amazing, {name}! 💙',
      'Nice one! Your body says thanks!',
            'That’s my hydro-hero! ✨',
      'Refreshing! I’m so proud of you!',
    ],
    goal: [
      'DAILY GOAL REACHED! You’re a water legend! 🏆',
      'Goal complete!! Sprig is doing a happy dance! 🎊',
    ],
    no: [
      'No rush! A few sips would feel great 💧',
      'That’s okay — your bottle is right here for you.',
      'Whenever you’re ready. Even one sip helps!',
    ],
    noFirm: [
      'Okay okay, no nagging! I’ll check back later 💙',
    ],
    later: [
      'Okay! I’ll pop back soon 👋',
      'No worries — see you in a bit! 💤',
    ],
    timeout: [
      'Busy bee? I’ll ask again soon 🐝',
      'No answer… I’ll wait quietly 💤',
    ],
    poke: ['Hehe! 😆', 'Boop! 💧', 'That tickles!', 'Eek! Hi!', 'Wheee~', 'Hello, {name}!'],
    pokeMany: ['Okay okay okay! 😵‍💫', 'I’m getting dizzy!', 'Stop it, you goober! 😂'],
    hello: ['Hi {name}! I’m {mascot}. I’ll remind you to drink water! 💧', 'Hello! I’m back on your desktop! ✨'],
    paused: ['Zzz… (reminders paused)'],
    drag: ['Whoa! 😮', 'Wheee!', 'Put me down gently!'],
    sip: ['Ahh~ 💧', 'Refreshing!', 'Mmm, water!'],
    progress: ['{count}/{goal} glasses today'],
  };

  window.Lines = {
    pick(key, vars = {}) {
      const list = L[key] || [''];
      const s = list[Math.floor(Math.random() * list.length)];
      return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== '' ? vars[k] : k === 'name' ? 'friend' : ''));
    },
  };
})();
