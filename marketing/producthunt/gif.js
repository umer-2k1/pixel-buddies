// Renders the looping thumbnail GIF. Run: npx electron marketing/producthunt/gif.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const R = __dirname, FR = path.join(R, '.tmp', 'frames');
fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: 480, height: 480, show: false, useContentSize: true, webPreferences: { webSecurity: false } });
  await w.loadURL('file://' + path.join(R, 'src', 'thumb-gif.html'));
  w.webContents.on('console-message', (e, l, m) => console.log('CON', m.slice(0, 200)));
  w.webContents.on('render-process-gone', (e, d) => console.log('GONE', d.reason));
  const ex = async (s) => { return w.webContents.executeJavaScript(s); };
  await ex('step(50)'); await ex('start()'); await ex('step(1)');
  const N = +process.env.FRAMES || 56;
  for (let i = 0; i < N; i++) {
    await ex('step(50)');
    const img = (await w.webContents.capturePage()).resize({ width: 240, height: 240, quality: 'best' });
    fs.writeFileSync(path.join(FR, `f${String(i).padStart(3, '0')}.png`), img.toPNG());
  }
  const out = path.join(R, 'out', 'thumbnail-240.gif');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '20', '-i', path.join(FR, 'f%03d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', out]);
  console.log('gif', fs.statSync(out).size);
  app.quit();
});
