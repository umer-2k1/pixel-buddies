// Renders a still buddy pose using the app's real artwork (src/shared/mascot.js).
window.buddy = function (el, skin, emo, patch, cap) {
  const m = new Mascot(el, { skin, bottleColor: cap || 'pink' });
  m.autoLook = false; m.blinkS.next = 1e12; m.destroy();
  m.set(Object.assign({}, Mascot.EMO[emo] || {}, patch || {}));
  m.lookSm.x = 0; m.lookSm.y = 0; m._render(0, 0, 0);
  return m;
};
window.POSE = {
  joy: ['joy', { lArm: 160, rArm: 150, bottle: 14 }],
  ask: ['ask', { rArm: 70, bottle: 14, lArm: 140 }],
  hmm: ['hmm', { rArm: -30, bottle: 4, lookX: 0.9, lookY: 0.8 }],
  happy: ['happy', { lArm: 150 }],
  sip: ['sip', { rArm: -148, bottle: -123, capOff: 1, lArm: 28 }],
  rest: ['neutral', {}],
};
window.place = function (id, skin, pose) { const p = POSE[pose]; return buddy(document.getElementById(id), skin, p[0], p[1]); };
