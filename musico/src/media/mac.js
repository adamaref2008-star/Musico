// macOS: read & control Spotify and Apple Music through AppleScript (osascript).
const { execFile } = require('child_process');

const run = (cmd, args) => new Promise((res) => execFile(cmd, args, { timeout: 5000 }, (e, out) => res(e ? '' : String(out))));
const isRunning = async (name) => (await run('pgrep', ['-x', name])).trim().length > 0;
const num = (s) => parseFloat(String(s).replace(',', '.')) || 0;

function script(app) {
  const art = app === 'Spotify' ? ' & "|" & (artwork url of t)' : ' & "|"';
  return `tell application "${app}"
  if player state is stopped then return ""
  set t to current track
  return "${app}|" & (player state as string) & "|" & (name of t) & "|" & (artist of t) & "|" & (album of t) & "|" & (duration of t) & "|" & (player position)${art}
end tell`;
}

// "App|state|title|artist|album|duration|position|art"  (title may contain "|")
function parse(line) {
  const p = line.trim().split('|');
  if (p.length < 8) return null;
  const app = p[0];
  const n = p.length;
  const duration = num(p[n - 3]);
  return {
    app,
    playing: p[1] === 'playing',
    title: p.slice(2, n - 5).join('|'),
    artist: p[n - 5],
    album: p[n - 4],
    duration: app === 'Spotify' ? duration / 1000 : duration,
    position: num(p[n - 2]),
    art: p[n - 1] || ''
  };
}

let timer = null;
let pollFn = null;
function start(onState) {
  const poll = async () => {
    const found = [];
    for (const app of ['Spotify', 'Music']) {
      if (await isRunning(app)) {
        const s = parse(await run('osascript', ['-e', script(app)]));
        if (s && s.title) found.push(s);
      }
    }
    onState(found.find((s) => s.playing) || found[0] || null);
  };
  pollFn = poll;
  poll();
  timer = setInterval(poll, 1500);
}
function stop() { clearInterval(timer); }

function command(name, arg, cur) {
  const app = cur && cur.app;
  if (!app) return;
  let body;
  if (name === 'toggle') body = 'playpause';
  else if (name === 'next') body = 'next track';
  else if (name === 'prev') body = 'previous track';
  else if (name === 'seek') body = `set player position to ${Math.max(0, Math.round(arg))}`;
  else return;
  run('osascript', ['-e', `tell application "${app}" to ${body}`]);
}

module.exports = { start, stop, command, parse, poll: () => pollFn && pollFn() };
