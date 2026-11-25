const { app, BrowserWindow, ipcMain, screen, Tray, Menu, dialog, nativeImage, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const DEFAULTS = require('./defaults');
const { trackInfo } = require('./media/id3');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const winBuild = isWin ? parseInt(os.release().split('.')[2], 10) || 0 : 0;
const mica = isWin && winBuild >= 22621; // Windows 11 22H2+
const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'webm'];

protocol.registerSchemesAsPrivileged([
  { scheme: 'musico-media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('com.musico.app');

const asset = (n) => path.join(__dirname, 'assets', n);
const preload = path.join(__dirname, 'preload.js');
const wp = () => ({ preload, contextIsolation: true, nodeIntegration: false, sandbox: true });

// ---------------- persistence ----------------
const userDir = () => app.getPath('userData');
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(userDir(), f), 'utf8')); } catch { return d; } };
const writeJSON = (f, v) => { try { fs.mkdirSync(userDir(), { recursive: true }); fs.writeFileSync(path.join(userDir(), f), JSON.stringify(v)); } catch {} };
let settings = Object.assign({}, DEFAULTS);
let library = []; // [{path,title,artist,album,art}]
let saveT;
const saveSettings = () => { clearTimeout(saveT); saveT = setTimeout(() => writeJSON('settings.json', settings), 300); };
const saveLibrary = () => writeJSON('library.json', library.map((t) => t.path));

// ---------------- windows ----------------
let settingsWin, islandWin, engineWin, taskbarWin, glowWin, tray;
const all = () => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
const broadcast = (ch, ...a) => all().forEach((w) => w.webContents.send(ch, ...a));

function createSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) { if (settingsWin.isMinimized()) settingsWin.restore(); settingsWin.show(); settingsWin.focus(); return; }
  const opts = { width: 840, height: 660, minWidth: 700, minHeight: 520, show: false, title: 'Musico', icon: asset('icon.png'), webPreferences: wp() };
  if (isMac) {
    Object.assign(opts, { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 20 }, vibrancy: 'sidebar', visualEffectState: 'followWindow', backgroundColor: '#00000000' });
  } else if (isWin) {
    Object.assign(opts, {
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff', height: 44 },
      backgroundColor: mica ? '#00000000' : '#202020'
    });
    if (mica) opts.backgroundMaterial = 'mica';
  }
  settingsWin = new BrowserWindow(opts);
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
  updateThumbar();
}

function createIsland() {
  if (islandWin && !islandWin.isDestroyed()) return;
  const d = screen.getPrimaryDisplay().bounds;
  const W = 780, H = 300;
  islandWin = new BrowserWindow({
    width: W, height: H, x: Math.round(d.x + (d.width - W) / 2), y: d.y,
    frame: false, transparent: true, resizable: false, movable: false, hasShadow: false,
    skipTaskbar: true, focusable: false, alwaysOnTop: true, show: false, webPreferences: wp()
  });
  islandWin.setAlwaysOnTop(true, 'screen-saver');
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  islandWin.setIgnoreMouseEvents(true, { forward: true });
  islandWin.loadFile(path.join(__dirname, 'renderer', 'island.html'));
  islandWin.once('ready-to-show', () => islandWin.showInactive());
  islandWin.on('closed', () => { islandWin = null; });
}
function destroy(w) { if (w && !w.isDestroyed()) w.destroy(); }

function createEngine() {
  engineWin = new BrowserWindow({ show: false, width: 100, height: 100, webPreferences: Object.assign(wp(), { backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' }) });
  engineWin.loadFile(path.join(__dirname, 'renderer', 'engine.html'));
}
const engineSend = (m) => { if (engineWin && !engineWin.isDestroyed()) engineWin.webContents.send('engine:cmd', m); };

// Windows taskbar song widget
function placeTaskbar() {
  if (!taskbarWin || taskbarWin.isDestroyed()) return;
  const d = screen.getPrimaryDisplay();
  const tb = d.bounds.height - d.workArea.height;
  const H = 40;
  const bottomBar = tb > 8 && d.workArea.y === d.bounds.y;
  const y = bottomBar ? d.bounds.y + d.bounds.height - tb + Math.round((tb - H) / 2) : d.bounds.y + d.bounds.height - H - 4;
  taskbarWin.setBounds({ x: d.bounds.x + 12, y, width: 300, height: H });
}
function createTaskbar() {
  if (!isWin || (taskbarWin && !taskbarWin.isDestroyed())) return;
  taskbarWin = new BrowserWindow({
    width: 300, height: 40, frame: false, transparent: true, resizable: false, movable: false, hasShadow: false,
    skipTaskbar: true, focusable: false, alwaysOnTop: true, show: false, webPreferences: wp()
  });
  taskbarWin.setAlwaysOnTop(true, 'screen-saver');
  taskbarWin.loadFile(path.join(__dirname, 'renderer', 'taskbar.html'));
  taskbarWin.on('closed', () => { taskbarWin = null; });
  placeTaskbar();
}
function syncTaskbar() {
  if (!isWin) return;
  if (settings.songWidget) createTaskbar(); else { destroy(taskbarWin); taskbarWin = null; return; }
  if (!taskbarWin) return;
  const c = current();
  if (c.title) { placeTaskbar(); if (!taskbarWin.isVisible()) taskbarWin.showInactive(); taskbarWin.moveTop(); }
  else taskbarWin.hide();
}

// Beat Glow overlay
function syncGlow() {
  if (settings.beat && !(glowWin && !glowWin.isDestroyed())) {
    const d = screen.getPrimaryDisplay().bounds;
    glowWin = new BrowserWindow({
      x: d.x, y: d.y, width: d.width, height: d.height, frame: false, transparent: true, resizable: false, movable: false,
      hasShadow: false, skipTaskbar: true, focusable: false, alwaysOnTop: true, show: false, webPreferences: wp()
    });
    glowWin.setAlwaysOnTop(true, 'screen-saver');
    glowWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    glowWin.setIgnoreMouseEvents(true);
    glowWin.loadFile(path.join(__dirname, 'renderer', 'glow.html'));
    glowWin.once('ready-to-show', () => glowWin && glowWin.showInactive());
    glowWin.on('closed', () => { glowWin = null; });
  } else if (!settings.beat) { destroy(glowWin); glowWin = null; }
  engineSend({ type: 'analyse', on: !!settings.beat });
}

// ---------------- player state ----------------
const eng = { index: -1, playing: false, position: 0, duration: 0 };
let sys = null; // {app,title,artist,album,art,duration,position,playing}
let active = 'library';
let bridge = null;

function current() {
  if (active === 'system' && sys && sys.title) return Object.assign({ source: 'system', canSeek: true }, sys);
  const t = library[eng.index];
  if (t) return { source: 'library', title: t.title, artist: t.artist, album: t.album, art: t.art, duration: eng.duration, position: eng.position, playing: eng.playing, canSeek: true, index: eng.index };
  return { source: 'none', title: '', artist: '', album: '', art: '', duration: 0, position: 0, playing: false, canSeek: false };
}
let lastSig = '';
function pushState(force) {
  const c = current();
  const msg = Object.assign({}, c);
  broadcast('player:state', msg);
  const sig = [c.title, c.artist, c.playing, c.source].join('|');
  if (force || sig !== lastSig) { lastSig = sig; updateTray(); updateThumbar(); syncTaskbar(); }
}
setInterval(() => pushState(false), 1000);

function onSystemState(s) {
  const wasPlaying = !!(sys && sys.playing);
  if (!s) { sys = null; if (active === 'system') active = 'library'; pushState(); return; }
  const prevArt = sys && sys.title === s.title && sys.artist === s.artist ? sys.art : '';
  let art = s.art;
  if (art === '-') art = ''; // helper: "changed, no thumbnail"
  else if (!art) art = prevArt; // helper: "unchanged"
  sys = Object.assign({}, s, { art });
  const mode = settings.source;
  if (mode === 'System') active = 'system';
  else if (mode === 'Auto' && s.playing && !wasPlaying) active = 'system';
  else if (mode === 'Auto' && active !== 'system' && !eng.playing && !library[eng.index]) active = 'system';
  pushState();
}
function startBridge() {
  try {
    if (isMac) { bridge = require('./media/mac'); bridge.start(onSystemState); }
    else if (isWin) { bridge = require('./media/win'); bridge.start(onSystemState, userDir()); }
  } catch (e) { console.error('media bridge failed', e); }
}

function command(name, arg) {
  const c = current();
  if (name === 'playIndex') {
    if (sys && sys.playing && bridge) bridge.command('toggle', 0, sys); // pause the other app first
    active = 'library'; engineSend({ type: 'play', index: arg }); return;
  }
  if (c.source === 'system' && bridge) { bridge.command(name, arg, sys); setTimeout(() => bridge.poll && bridge.poll(), 400); return; }
  if (name === 'toggle' && !library[eng.index] && library.length) { engineSend({ type: 'play', index: 0 }); active = 'library'; return; }
  engineSend({ type: name, arg });
}

// ---------------- library ----------------
const libView = () => library.map((t) => ({ path: t.path, title: t.title, artist: t.artist, album: t.album }));
function pushQueue() {
  engineSend({ type: 'queue', tracks: library.map((t) => ({ url: 'musico-media://track/' + encodeURIComponent(t.path) })), volume: settings.volume });
  broadcast('library:changed', libView());
}
function addPaths(paths) {
  let added = 0;
  for (const p of paths) {
    const ext = path.extname(p).slice(1).toLowerCase();
    if (!AUDIO_EXT.includes(ext) || library.some((t) => t.path === p)) continue;
    try { if (!fs.statSync(p).isFile()) continue; } catch { continue; }
    library.push(trackInfo(p)); added++;
  }
  if (added) { saveLibrary(); pushQueue(); }
  return added;
}

// ---------------- tray / menu bar ----------------
function trayMenu() {
  const c = current();
  return Menu.buildFromTemplate([
    { label: c.title ? `${c.title} — ${c.artist}`.slice(0, 60) : 'Nothing playing', enabled: false },
    { type: 'separator' },
    { label: c.playing ? 'Pause' : 'Play', click: () => command('toggle') },
    { label: 'Next', click: () => command('next') },
    { label: 'Previous', click: () => command('prev') },
    { type: 'separator' },
    { label: 'Open Musico', click: createSettings },
    { label: 'Quit Musico', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
}
function createTray() {
  const img = isMac ? nativeImage.createFromPath(asset('trayTemplate.png')) : nativeImage.createFromPath(asset('tray-win.png')).resize({ width: 16, height: 16 });
  if (isMac) img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip('Musico');
  tray.on('click', () => { if (isWin) createSettings(); });
  tray.on('right-click', () => tray.popUpContextMenu(trayMenu()));
  if (isMac) tray.on('click', () => tray.popUpContextMenu(trayMenu()));
  updateTray();
}
function updateTray() {
  if (!tray) return;
  const c = current();
  const text = c.title ? `${c.title}${c.artist ? ' – ' + c.artist : ''}` : '';
  if (isMac) tray.setTitle(settings.songWidget && text ? ' ' + (text.length > 38 ? text.slice(0, 37) + '…' : text) : '');
  tray.setToolTip(text || 'Musico');
  if (!isMac) tray.setContextMenu(trayMenu());
}
function updateThumbar() {
  if (!isWin || !settingsWin || settingsWin.isDestroyed()) return;
  const ic = (n) => nativeImage.createFromPath(asset(n)).resize({ width: 16, height: 16 });
  const c = current();
  settingsWin.setThumbarButtons([
    { tooltip: 'Previous', icon: ic('prev.png'), click: () => command('prev') },
    { tooltip: c.playing ? 'Pause' : 'Play', icon: ic(c.playing ? 'pause.png' : 'play.png'), click: () => command('toggle') },
    { tooltip: 'Next', icon: ic('next.png'), click: () => command('next') }
  ]);
}

// ---------------- settings plumbing ----------------
function applySetting(k) {
  if (k === 'islandOn') { settings.islandOn ? createIsland() : (destroy(islandWin), (islandWin = null)); }
  if (k === 'launchAtLogin') app.setLoginItemSettings({ openAtLogin: !!settings.launchAtLogin });
  if (k === 'songWidget') { syncTaskbar(); updateTray(); }
  if (k === 'beat') syncGlow();
  if (k === 'volume') engineSend({ type: 'volume', v: settings.volume });
  if (k === 'source') { if (settings.source === 'Library') active = 'library'; else if (settings.source === 'System' && sys) active = 'system'; pushState(true); }
}

ipcMain.on('env:get', (e) => { e.returnValue = { platform: process.platform, mica }; });
ipcMain.on('settings:get', (e) => { e.returnValue = settings; });
ipcMain.on('settings:set', (e, patch) => {
  if (!patch || typeof patch !== 'object') return;
  for (const k of Object.keys(patch)) if (k in DEFAULTS) { settings[k] = patch[k]; applySetting(k); }
  saveSettings();
  all().forEach((w) => { if (w.webContents !== e.sender) w.webContents.send('settings:changed', settings); });
});
ipcMain.handle('player:get', () => current());
ipcMain.on('player:cmd', (_e, name, arg) => { if (['toggle', 'next', 'prev', 'seek', 'playIndex'].includes(name)) command(name, arg); });
ipcMain.handle('library:get', () => libView());
ipcMain.handle('library:add', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(win, { title: 'Add songs', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio', extensions: AUDIO_EXT }] });
  return r.canceled ? 0 : addPaths(r.filePaths);
});
ipcMain.handle('library:addPaths', (_e, paths) => (Array.isArray(paths) ? addPaths(paths.filter((p) => typeof p === 'string')) : 0));
ipcMain.handle('library:remove', (_e, index) => {
  if (!library[index]) return;
  const cur = library[eng.index];
  library.splice(index, 1);
  if (cur) { const ni = library.indexOf(cur); if (ni < 0) { engineSend({ type: 'stop' }); eng.index = -1; eng.playing = false; } else eng.index = ni; }
  saveLibrary(); pushQueue(); pushState(true);
});
ipcMain.on('engine:state', (_e, s) => {
  const was = eng.playing;
  Object.assign(eng, s);
  if (eng.playing && !was && settings.source !== 'System') active = 'library';
  pushState(eng.playing !== was);
});
ipcMain.on('engine:level', (_e, v) => { if (glowWin && !glowWin.isDestroyed()) glowWin.webContents.send('beat:level', v); });
ipcMain.on('island:mouse', (_e, inside) => { if (islandWin && !islandWin.isDestroyed()) islandWin.setIgnoreMouseEvents(!inside, { forward: true }); });
ipcMain.on('settings:open', createSettings);
let lastCpu = os.cpus();
ipcMain.handle('sys:cpu', () => {
  const now = os.cpus();
  let idle = 0, total = 0;
  now.forEach((c, i) => {
    const p = lastCpu[i];
    total += Object.values(c.times).reduce((a, b) => a + b, 0) - Object.values(p.times).reduce((a, b) => a + b, 0);
    idle += c.times.idle - p.times.idle;
  });
  lastCpu = now;
  return total ? Math.round((1 - idle / total) * 100) : 0;
});

// ---------------- lifecycle ----------------
app.on('second-instance', createSettings);
app.on('window-all-closed', () => { /* keep running in tray / menu bar */ });
app.on('before-quit', () => { app.isQuitting = true; if (bridge) bridge.stop(); });
app.on('activate', createSettings);

app.whenReady().then(() => {
  Object.assign(settings, readJSON('settings.json', {}));
  protocol.handle('musico-media', (req) => {
    const p = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!library.some((t) => t.path === p)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(p).toString(), { headers: req.headers }).then((r) => {
      const h = new Headers(r.headers); h.set('Access-Control-Allow-Origin', '*');
      return new Response(r.body, { status: r.status, headers: h });
    });
  });
  if (isWin) Menu.setApplicationMenu(null);
  library = readJSON('library.json', []).filter((p) => { try { return fs.existsSync(p); } catch { return false; } }).map(trackInfo);
  createEngine();
  engineWin.webContents.once('did-finish-load', () => { pushQueue(); syncGlow(); });
  createTray();
  createSettings();
  if (settings.islandOn) createIsland();
  syncTaskbar();
  startBridge();
  screen.on('display-metrics-changed', placeTaskbar);
  if (isWin) setInterval(() => { if (taskbarWin && !taskbarWin.isDestroyed() && taskbarWin.isVisible()) { taskbarWin.setAlwaysOnTop(true, 'screen-saver'); taskbarWin.moveTop(); } }, 2000);
  if (settings.launchAtLogin) app.setLoginItemSettings({ openAtLogin: true });
});
