// Renders all Product Hunt images. Run: npx electron marketing/producthunt/render.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const R = __dirname, SRC = path.join(R, 'src'), TMP = path.join(R, '.tmp'), OUT = path.join(R, 'out');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
let win;
async function shot(url, w, h, file) {
  if (!win) win = new BrowserWindow({ width: w, height: h, show: false, useContentSize: true, webPreferences: { webSecurity: false } });
  win.setContentSize(w, h);
  try { await win.loadURL(url); } catch (e) { console.log('load warn', e.message.slice(0, 80)); }
  await sleep(1200);
  const img = await win.webContents.capturePage();
  fs.writeFileSync(file, (img.getSize().width !== w ? img.resize({ width: w, height: h, quality: 'best' }) : img).toPNG());
  console.log('wrote', path.basename(file));
}
app.whenReady().then(async () => {
  const panelDir = path.resolve(R, '../../src/panel');
  let html = fs.readFileSync(path.join(panelDir, 'index.html'), 'utf8')
    .replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '')
    .replace(/(src|href)="(?!https?:|file:)([^"]+)"/g, (m, a, p) => `${a}="file://${path.resolve(panelDir, p)}"`)
    .replace(/<script/, `<script src="file://${path.join(SRC, 'mock-pf.js')}"></script><style>body.mac header{padding-left:22px!important}</style><script`);
  for (const tab of ['today', 'buddy', 'games']) {
    fs.writeFileSync(path.join(TMP, `p-${tab}.html`), html.replace('<script src="file://', `<script>history.replaceState(0,'','?tab=${tab}')</script><script src="file://`));
    await shot('file://' + path.join(TMP, `p-${tab}.html`) + '?tab=' + tab, 560, 760, path.join(TMP, `panel-${tab}.png`)); }
  for (let i = 1; i <= 7; i++) await shot('file://' + path.join(SRC, `gallery-${i}.html`), 1270, 760, path.join(OUT, `gallery-${i}.png`));
  await shot('file://' + path.join(SRC, 'thumb.html'), 480, 480, path.join(OUT, 'thumbnail-480.png'));
  app.quit();
});
