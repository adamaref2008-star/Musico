const { chromium } = require('playwright');
const D = require('../src/defaults');
const out = process.argv[2];
const art = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a45"/><stop offset="1" stop-color="#7a2cff"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="100" r="46" fill="#111"/></svg>');
const stub = ({ platform, mica, D, art }) => {
  const st = { source: 'library', title: 'Get Lucky', artist: 'Daft Punk, Pharrell Williams', album: 'Random Access Memories', art, duration: 369, position: 120, playing: true, canSeek: true, index: 1 };
  let pl = [], sl = [], ll = [];
  window.__cmds = [];
  window.musico = {
    env: { platform, mica }, getSettings: () => D, setSettings: (p) => Object.assign(D, p), onSettings: (cb) => sl.push(cb),
    getPlayer: async () => st, onPlayer: (cb) => pl.push(cb), cmd: (...a) => window.__cmds.push(a),
    library: { get: async () => [{ title: 'Around The World', artist: 'Daft Punk' }, { title: 'Get Lucky', artist: 'Daft Punk', album: 'Random Access Memories' }, { title: 'Instant Crush', artist: 'Daft Punk' }], add: async () => 0, addPaths: async () => 0, remove: async () => {}, onChanged: (cb) => ll.push(cb) },
    pathForFile: () => '', islandMouse() {}, openSettings() {}, cpu: async () => 7, engine: {}, onBeat(cb) { setInterval(() => cb(Math.random()), 50); }
  };
};
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [platform, mica] of [['darwin', false], ['win32', true]]) {
    const tag = platform === 'darwin' ? 'mac' : 'win';
    const p = await b.newPage({ viewport: { width: 840, height: 660 } });
    p.on('pageerror', (e) => errs.push(tag + ':' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(tag + ':' + m.text()));
    await p.addInitScript(stub, { platform, mica, D: { ...D }, art });
    await p.goto('file:///home/claude/musico/src/renderer/index.html');
    for (const id of ['now', 'library', 'island', 'general', 'beat']) {
      await p.evaluate((i) => go(i), id); await p.waitForTimeout(350);
      await p.screenshot({ path: `${out}/${tag}_${id}.png` });
    }
    // interactions
    await p.evaluate(() => go('now')); await p.click('#npplay'); await p.click('#npbarw');
    console.log(tag, 'cmds', JSON.stringify(await p.evaluate(() => window.__cmds)));
    await p.evaluate(() => go('library')); await p.dblclick('.song:nth-child(3)');
    console.log(tag, 'play idx cmd', JSON.stringify((await p.evaluate(() => window.__cmds)).slice(-1)));
    await p.close();
  }
  // island, taskbar, glow
  const q = await b.newPage({ viewport: { width: 780, height: 300 } });
  q.on('pageerror', (e) => errs.push('island:' + e.message));
  await q.addInitScript(stub, { platform: 'win32', mica: true, D: { ...D, size: 'Big' }, art });
  await q.goto('file:///home/claude/musico/src/renderer/island.html');
  await q.evaluate(() => document.getElementById('isl').classList.add('open')); await q.waitForTimeout(800);
  await q.screenshot({ path: `${out}/island_big.png` });
  const t = await b.newPage({ viewport: { width: 300, height: 40 } });
  t.on('pageerror', (e) => errs.push('taskbar:' + e.message));
  await t.addInitScript(stub, { platform: 'win32', mica: true, D: { ...D }, art });
  await t.goto('file:///home/claude/musico/src/renderer/taskbar.html'); await t.waitForTimeout(500);
  await t.screenshot({ path: `${out}/taskbar.png` });
  const g = await b.newPage({ viewport: { width: 700, height: 400 } });
  g.on('pageerror', (e) => errs.push('glow:' + e.message));
  await g.addInitScript(stub, { platform: 'win32', mica: true, D: { ...D, beat: true, beatStyle: 'Edges' }, art });
  await g.goto('file:///home/claude/musico/src/renderer/glow.html'); await g.waitForTimeout(600);
  await g.screenshot({ path: `${out}/glow.png` });
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
