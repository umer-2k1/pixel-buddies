const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const fn = (_e, data) => cb(data);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('pf', {
  // state / settings
  getState: () => ipcRenderer.invoke('state:get'),
  onState: on('state'),
  updateSettings: (patch) => ipcRenderer.send('settings:update', patch),
  // mascot window
  onRemind: on('remind'),
  onCommand: on('command'),
  onGameResult: on('game-result'),
  answer: (answer) => ipcRenderer.send('answer', answer),
  move: (x, y) => ipcRenderer.send('win:move', x, y),
  resize: (w, h) => ipcRenderer.send('win:size', w, h),
  getDisplay: () => ipcRenderer.invoke('display:get'),
  onDisplay: on('display'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('mouse:ignore', ignore),
  contextMenu: () => ipcRenderer.send('menu:context'),
  openPanel: (tab) => ipcRenderer.send('panel:open', tab),
  // panel window
  onTab: on('tab'),
  logWater: (delta) => ipcRenderer.send('water:log', delta),
  askNow: () => ipcRenderer.send('remind:now'),
  pause: (mode) => ipcRenderer.send('pause', mode),
  gameResult: (r) => ipcRenderer.send('game:result', r),
});
