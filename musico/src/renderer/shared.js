// Shared by every Musico window: platform flags, settings and live player state.
const env = musico.env;
document.documentElement.dataset.platform = env.platform === 'darwin' ? 'mac' : 'win';
if (env.mica) document.documentElement.dataset.mica = '1';
const isMac = env.platform === 'darwin';

let S = musico.getSettings();
const settingListeners = [];
musico.onSettings((s) => { S = s; settingListeners.forEach((f) => f(S)); });
const onSettings = (f) => settingListeners.push(f);
const set = (k, v) => { S[k] = v; musico.setSettings({ [k]: v }); };

let P = { source: 'none', title: '', artist: '', album: '', art: '', duration: 0, position: 0, playing: false, canSeek: false };
let PAT = Date.now();
const playerListeners = [];
const onPlayer = (f) => playerListeners.push(f);
const gotPlayer = (s) => { P = s; PAT = Date.now(); playerListeners.forEach((f) => f(P)); };
musico.onPlayer(gotPlayer);
musico.getPlayer().then(gotPlayer);

const livePos = () => (P.playing ? Math.min(P.duration || Infinity, P.position + (Date.now() - PAT) / 1000) : P.position);
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function setArt(el, art) {
  if (!el) return;
  el.style.backgroundImage = art ? `url("${art}")` : '';
  el.classList.toggle('has', !!art);
}
const nowTitle = () => P.title || 'Nothing playing';
const nowArtist = () => (P.title ? P.artist || '' : 'Play something or add songs');
