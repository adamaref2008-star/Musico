const COLORS = ["#e8a33d", "#c9c9cf", "#2b2b30", "#3b6fd6", "#d63b86", "#d98b2b", "#2fa58a", "#8a4fd6"];

// ---------- building blocks ----------
const tg = (k) => `<div class="tg ${S[k] ? 'on' : ''}" data-tg="${k}"></div>`;
const seg = (k, opts, cls = '') => `<div class="seg ${cls}" data-seg="${k}">${opts.map(o => `<button class="${S[k] === o ? 'on' : ''}" data-v="${o}">${o}</button>`).join('')}</div>`;
const row = (icon, t, s, ctl = '') => `<div class="row"><div class="ri">${ic(icon)}</div><div class="tx"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div>${ctl}</div>`;
const slider = (k, label, lo, hi, min = 0, max = 100, suffix = '%', vtxt) =>
  `<div class="sl"><div class="hd">${label}<span data-val="${k}">${vtxt ? vtxt(S[k]) : S[k] + suffix}</span></div>
   <input type="range" min="${min}" max="${max}" value="${S[k]}" data-sl="${k}" data-suf="${suffix}" />
   <div class="ft"><span>${lo}</span><span>${hi}</span></div></div>`;
const rangeRow = (icon, t, s, k, suffix = '%') => `<div class="row"><div class="ri">${ic(icon)}</div><div class="tx"><div class="t">${t}</div><div class="s" data-val="${k}">${S[k]}${suffix}</div></div><div style="width:46%"><input type="range" min="0" max="100" value="${S[k]}" data-sl="${k}" data-suf="${suffix}"/></div></div>`;
const swatches = (k, cols = COLORS) => `<div class="sw" data-sw="${k}">${cols.map((c, i) => `<i data-i="${i}" class="${S[k] === i ? 'on' : ''}" style="background:${c};border-color:rgba(255,255,255,.18)"></i>`).join('')}</div>`;
const lbl = (t) => `<div class="lbl">${t}</div>`;
const group = (...h) => `<div class="group">${h.join('')}</div>`;
const note = (t) => `<div class="note">${t}</div>`;


const PAGES = {
  now: { title: 'Now Playing', icon: 'music', render() {
    const has = !!P.title;
    return `<div class="np">
      <div class="hd"><div class="art" id="npart"></div><div class="meta"><div class="ti" id="npti"></div><div class="ar" id="npar"></div><div class="src" id="npsrc"></div></div></div>
      <div class="bar" id="npbarw"><b id="npbar"></b></div>
      <div class="times"><span id="npl">0:00</span><span id="npr">0:00</span></div>
      <div class="ctl"><button data-act="prev" title="Previous">${ic('prev')}</button><button class="big" data-act="play" id="npplay" title="Play / Pause">${ic('play')}</button><button data-act="next" title="Next">${ic('next')}</button></div>
    </div>
    <div class="tiles">
      <div class="tile" data-go="library"><div class="ti2">${ic('music')}</div><div><div class="t">Library</div><div class="s" id="tlib">${libCount} songs</div></div></div>
      <div class="tile ${S.beat ? '' : 'dim'}" data-go="beat"><div class="ti2">${ic('wave')}</div><div><div class="t">Beat Glow</div><div class="s">${S.beat ? 'On' : 'Off'}</div></div></div>
      <div class="tile ${S.islandOn ? '' : 'dim'}" data-go="island"><div class="ti2">${ic('pill')}</div><div><div class="t">Notch Island</div><div class="s">${S.islandOn ? S.size : 'Off'}</div></div></div>
      <div class="tile ${S.songWidget ? '' : 'dim'}" data-go="general"><div class="ti2">${ic('window')}</div><div><div class="t">${isMac ? 'Menu Bar' : 'Taskbar'}</div><div class="s">${S.songWidget ? 'Song shown' : 'Hidden'}</div></div></div>
    </div>`;
  }, after() { fillNow(); } },
  library: { title: 'Library', icon: 'music', render() {
    return `<div class="lib-head"><button class="btn primary" id="addSongs">${ic('plus')}Add Songs</button><span class="s">Drop audio files anywhere on this window · MP3, M4A, FLAC, WAV, OGG</span></div>
      <div class="group" id="liblist"></div>`;
  }, after() { fillLibrary(); } },
  island: { title: 'Island', icon: 'pill', render() {
    return group(row('pill', 'Notch Island', 'The song you are playing, always one hover away at the top of your screen', tg('islandOn')))
    + lbl('Style') + group(
      row('window', 'Size', 'Compact shows the player. Big adds a CPU ring and calendar.', seg('size', ['Compact', 'Big'])),
      slider('scale', 'Scale', 'Smaller', 'Larger', 50, 150))
    + lbl('Glass') + group(row('drop', 'Look', '', seg('look', ['Black', 'Glass'])), slider('glass', 'Glass', 'Clear', 'Dark', 0, 100, '', v => v < 30 ? 'Clear' : v < 60 ? 'Lightly tinted' : 'Dark'))
    + lbl('Shape') + `<div class="group"><div class="cards two" data-cardsel="shape">
        <div class="sc ${S.shape === 'Classic' ? 'on' : ''}" data-v="Classic"><div class="pv classic"></div><div class="n">Classic</div><div class="d">Round the notch, from the top edge</div></div>
        <div class="sc ${S.shape === 'Floating' ? 'on' : ''}" data-v="Floating"><div class="pv floating"></div><div class="n">Floating</div><div class="d">An island just under the top, like on iPhone</div></div></div></div>`
    + note('Move the pointer to the top of the screen to open it. Click the arrow button to open Musico.');
  } },
  sound: { title: 'Sound', icon: 'sliders', render() {
    return lbl('Output') + group(`<div class="dev"><span class="di">${ic('speaker')}</span>System Default<span class="ck">${ic('check')}</span></div>`, rangeRow('speaker', 'Volume', '', 'volume'))
    + note('Volume applies to songs played from the Musico Library. Songs from Spotify, Apple Music or a browser keep using that app\'s own volume.');
  } },
  beat: { title: 'Beat Glow', icon: 'wave', render() {
    const st = [['Rim', 'A line of light running round…'], ['Edges', 'Light along every edge'], ['Corners', 'Out of the four corners'], ['Sides', 'Smooth lines down both sides']];
    return group(row('wave', 'Beat Glow', 'Light on your screen, flaring to the beat', tg('beat')))
    + lbl('Style') + `<div class="group"><div class="cards" data-cardsel="beatStyle">${st.map(([n, d]) => `<div class="sc ${S.beatStyle === n ? 'on' : ''}" data-v="${n}"><div class="pv ${n.toLowerCase()}"></div><div class="n">${n}</div><div class="d">${d}</div></div>`).join('')}</div></div>`
    + lbl('Light') + group(slider('thick', 'Thickness', 'Thin', 'Thick', 0, 100, ''), slider('bright', 'Brightness', 'Dim', 'Bright', 0, 100, ''),
      row('wave', 'Motion', '', seg('motion', ['To the Beat', 'Steady'])), row('drop', 'Colors', '', seg('colors', ['From the Album', 'My Own'])))
    + note('The light follows the beat of songs played from the Musico Library. For other apps it glows gently while music plays. Nothing is recorded.');
  } },
  lock: { soon: true, title: 'Lock Screen', icon: 'lock', render() {
    return `<div class="pvbox"><div class="clk">${new Date().toLocaleDateString('en', { weekday: 'long' }).toUpperCase().split('').join(' ')}</div></div>`
    + lbl('Background') + group(`<div class="sub" style="padding-top:12px">${seg('lsSource', ['Cover', 'Desktop', 'Picture', 'Live'], 'wide tab')}</div>`, slider('blur', 'Blur', 'Sharp', 'Soft', 0, 100))
    + note('Behind the clock and the player. Your other displays show their own wallpaper, or the same picture or scene.')
    + lbl('Clock') + `<div class="group"><div class="clocks">${['Rounded', 'Classic', 'Light', 'Serif', 'Mono', 'Tall'].map(n => `<div data-clk="${n}" style="${S.clockStyle === n ? 'outline:1.5px solid var(--blue)' : ''}">9:41<small>${n}</small></div>`).join('')}</div>
      ${row('lock', 'Glass', 'See-through figures with lit edges', tg('lsGlass'))}${slider('clockSize', 'Size', 'Smaller', 'Larger', 50, 150)}</div>`
    + lbl('Sounds') + group(row('speaker', 'Lock Sound', 'A click as your PC locks, like a phone', tg('lsSound')), row('speaker', 'Unlock Sound', 'Light clicks as it unlocks', tg('unlockSound')))
    + lbl('Player') + group(row('disc', 'Record', 'Spinning vinyl next to the cover', tg('record')), `<div class="sub" style="padding-top:12px">${seg('playerGlass', ['Liquid', 'Frosted', 'Dark'], 'wide')}</div>`, slider('opacity', 'Opacity', 'No Card', 'Full Card', 0, 100))
    + lbl('Musico Lock') + group(row('lock', 'Lock with Musico', 'Musico Lock from anywhere', '<span class="val">Ctrl+Alt+L</span>'), row('timer', 'Lock When Idle', '', seg('lockIdle', ['Off', '5 min', '10 min', '15 min', '30 min'])), row('window', 'Windows Lock Screen', 'The blurred cover as its picture while music plays', tg('winLock')));
  } },
  desk: { soon: true, title: 'Desktop', icon: 'disc', render() {
    return group(row('window', 'Clock on the Desktop', 'The day, the date and the time on your wallpaper', tg('deskClock')), row('user', 'Position', 'Drag it anywhere on the screen', '<span class="val">Move…</span>'))
    + note('On the desktop, under the icons. It steps aside while the music or lyrics are on the desktop, and stays over Live. The time is 12- or 24-hour as your region settings say.')
    + lbl('Taskbar look') + group(row('image', 'Wallpaper Effects', 'Parallax, flow and snow, one picture across displays', ''))
    + lbl('Player') + group(row('disc', 'Player on the Desktop', 'The cover, the song and its buttons on your wallpaper', tg('deskPlayer')))
    + lbl('Look') + `<div class="group"><div class="cards" style="grid-template-columns:repeat(4,1fr)" data-cardsel="tbLook">${['Normal', 'Opaque', 'Clear', 'Blur', 'Acrylic', 'Album', 'Beat'].map(n => `<div class="sc ${S.tbLook === n ? 'on' : ''}" data-v="${n}"><div class="pv" style="height:44px;background:linear-gradient(135deg,#a9566b,#4a3a7a)"></div><div class="d" style="margin-top:6px">${n}</div></div>`).join('')}</div>
      ${row('drop', 'Color', 'Over the taskbar', swatches('tbColor'))}${rangeRow('drop', 'Opacity', '', 'tbOpacity')}${row('line', 'Hide the Line', "The thin line along the taskbar's top", tg('tbHide'))}</div>`
    + note('On an empty desktop.')
    + lbl("While something's open") + group(row('window', 'A Window Is Open', "Any window on the taskbar's screen", tg('winOpen')), row('max', 'A Window Is Maximized', 'Or covers the whole screen', tg('winMax')),
      `<div class="sub" style="display:flex;justify-content:center">${seg('tbLook', ['Normal', 'Opaque', 'Clear', 'Blur', 'Acrylic'])}</div>`,
      row('drop', 'Color', 'Over the taskbar', swatches('tbColor')), rangeRow('drop', 'Opacity', '', 'tbOpacity'),
      row('start', 'Start Is Open', 'The Start menu', tg('startOpen')), row('search', 'Search Is Open', 'Windows Search', tg('searchOpen')), row('window', 'Task View Is Open', 'Task View and Alt+Tab', tg('taskView')))
    + lbl('Safety') + group(row('shield', 'Turns Itself Off', "If Explorer stops working right while the taskbar has Musico's look", ''));
  } },
  lyrics: { soon: true, title: 'Lyrics', icon: 'lyrics', render() {
    return lbl('Background') + group(`<div class="sub" style="padding-top:12px">${seg('lyBg', ['Black', 'White', 'Cover', 'Aura'], 'wide pink')}</div>`)
    + note("The album's cover, still")
    + lbl('Text color') + `<div class="group"><div class="row" style="justify-content:flex-start">${swatches('lyColor', ['conic-gradient(#f66,#fd6,#6f6,#6df,#a6f,#f66)', '#fff', '#111', '#ffc83d', '#ff8a2b', '#ff4455', '#ff3d9a', '#b266ff', '#4d9bff', '#3ddcff', '#34d17a'])}</div><div class="s" style="padding:0 14px 12px;color:var(--mute);font-size:12px">From the album</div></div>`
    + lbl('Movement') + group(slider('scatter', 'Scatter', 'How far words stray from the middle', '', 0, 100, '').replace('<span data-val', '<span style="display:none" data-val'), `<div class="sub" style="text-align:center;color:var(--dim)">Reset to Default</div>`)
    + lbl('Where') + group(row('lock', 'Open When Locked', 'Your PC locks straight into the words', tg('lyLocked')), row('window', 'On the Desktop', 'The words behind your windows while music plays', tg('lyDesktop')), row('sun', 'Keep Screen On', "Your PC's screen won't dim while the music plays", tg('lyAwake')));
  } },
  keys: { soon: true, title: 'Keys', icon: 'keys', render() {
    return group(row('keys', 'Keyboard Sounds', 'A soft sound for every key you press', tg('keySounds')), row('user', 'Michael', 'A keycap that types along with you', tg('michael')))
    + `<div class="group" style="margin-top:10px"><div class="row" style="min-height:40px;color:var(--mute)">Turn on Keyboard Sounds to try them here</div></div>`
    + note('Musico only notices which key you press. Nothing is recorded or sent anywhere.')
    + note("Keys typed into apps running as administrator aren't heard, and the keys go quiet while a full-screen game is in front.")
    + note('');
  } },
  general: { title: 'General', icon: 'gear', render() {
    return group(row('power', 'Launch at Login', 'Start Musico when you sign in', tg('launchAtLogin')),
        row('window', isMac ? 'Song in the Menu Bar' : 'Song on the Taskbar', isMac ? 'Show the current song next to the clock' : 'Show the current song, with controls, on the taskbar', tg('songWidget')))
    + lbl('Music source') + group(row('music', 'Play from', 'Auto follows whatever started playing last', seg('source', ['Auto', 'System', 'Library'])))
    + note(isMac ? 'System reads Spotify and Apple Music. The first time, macOS asks to let Musico control them — choose OK.' : 'System reads whatever is playing on this PC: Spotify, browsers, Apple Music and more.')
    + lbl('About') + group(row('gear', 'Musico', 'Version 1.0.0', ''));
  } }
};
ICON_P.pin = '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>';
ICON_P.plus = '<path d="M12 5v14M5 12h14"/>';
ICON_P.trash = '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>';

// ---------- shell ----------
const NAV = [
  ['now', 'Now Playing', 'music'], ['library', 'Library', 'disc'], ['island', 'Island', 'pill'], ['lock', 'Lock Screen', 'lock', () => 'Soon'],
  ['desk', 'Desktop', 'image', () => 'Soon'], ['lyrics', 'Lyrics', 'lyrics', () => 'Soon'], ['sound', 'Sound', 'sliders'],
  ['beat', 'Beat Glow', 'wave', () => (S.beat ? 'On' : 'Off')], ['keys', 'Keys', 'keys', () => 'Soon']
];
const NAVCOLOR = { now: '#ff375f', library: '#ff9f0a', island: '#5e5ce6', lock: '#8e8e93', desk: '#0a84ff', lyrics: '#bf5af2', sound: '#30d158', beat: '#ff2d55', keys: '#8e8e93', general: '#8e8e93' };
let cur = 'now';
let libCount = 0;
let libList = [];
const $ = (s) => document.querySelector(s);
function buildNav(filter = '') {
  const f = filter.trim().toLowerCase();
  const item = ([id, name, icon, st]) => `<a data-go="${id}" class="${cur === id ? 'on' : ''}"><span class="ic" style="--c:${NAVCOLOR[id] || '#888'}">${ic(icon)}</span>${name}${st ? `<span class="st">${st()}</span>` : ''}</a>`;
  $('#nav').innerHTML = NAV.filter(n => !f || n[1].toLowerCase().includes(f)).map(item).join('');
  $('#foot').innerHTML = item(['general', 'General', 'gear']);
}
function go(id) {
  cur = id;
  const p = PAGES[id];
  $('#title').innerHTML = ic(p.icon) + p.title;
  const el = $('#page');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  el.innerHTML = (p.soon ? `<div class="soonbar">${ic('timer')}<span>Preview — this page is coming in a later update. The settings here are not active yet.</span></div>` : '') + p.render();
  $('#scroll').scrollTop = 0;
  buildNav($('#q').value);
  bind();
  if (p.after) p.after();
}
function bind() {
  const root = $('#page');
  root.querySelectorAll('[data-tg]').forEach(el => el.onclick = () => {
    const k = el.dataset.tg; set(k, !S[k]); el.classList.toggle('on', S[k]); buildNav($('#q').value);
  });
  root.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
    set(g.dataset.seg, b.dataset.v);
    if (g.dataset.seg === 'tbLook' || g.dataset.seg === 'lyBg') go(cur);
    else g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  }));
  root.querySelectorAll('[data-cardsel]').forEach(g => g.querySelectorAll('.sc').forEach(c => c.onclick = () => {
    set(g.dataset.cardsel, c.dataset.v); g.querySelectorAll('.sc').forEach(x => x.classList.toggle('on', x === c));
  }));
  root.querySelectorAll('[data-sw]').forEach(g => g.querySelectorAll('i').forEach(i => i.onclick = () => {
    set(g.dataset.sw, +i.dataset.i); g.querySelectorAll('i').forEach(x => x.classList.toggle('on', x === i));
  }));
  root.querySelectorAll('[data-sl]').forEach(r => {
    const upd = () => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
    upd();
    r.oninput = () => {
      upd(); set(r.dataset.sl, +r.value);
      const v = root.querySelector(`[data-val="${r.dataset.sl}"]`);
      if (v) v.textContent = r.dataset.sl === 'glass' ? (r.value < 30 ? 'Clear' : r.value < 60 ? 'Lightly tinted' : 'Dark') : r.value + r.dataset.suf;
    };
  });
  root.querySelectorAll('[data-clk]').forEach(d => d.onclick = () => { set('clockStyle', d.dataset.clk); go(cur); });
  root.querySelectorAll('[data-go]').forEach(t => t.onclick = () => go(t.dataset.go));
  root.querySelectorAll('[data-act]').forEach(b => b.onclick = () => musico.cmd(b.dataset.act === 'play' ? 'toggle' : b.dataset.act));
  const bw = $('#npbarw');
  if (bw) bw.onclick = (e) => { if (!P.duration) return; const r = bw.getBoundingClientRect(); musico.cmd('seek', (e.clientX - r.left) / r.width * P.duration); };
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('.nav a, .foot a');
  if (a && a.dataset.go) go(a.dataset.go);
});
$('#q').addEventListener('input', (e) => buildNav(e.target.value));
$('#sIcon').innerHTML = ic('search');

// ---- Now Playing live fill ----
function fillNow() {
  if (cur !== 'now') return;
  $('#npti').textContent = nowTitle();
  $('#npar').textContent = nowArtist();
  $('#npsrc').textContent = P.title ? (P.source === 'library' ? 'Musico Library' : P.app ? 'From ' + String(P.app).replace(/\.exe$/i, '').replace(/^.*[!.]/, '') : 'System') : '';
  setArt($('#npart'), P.art);
  $('#npplay').innerHTML = ic(P.playing ? 'pause' : 'play');
  const t = $('#tlib'); if (t) t.textContent = libCount + (libCount === 1 ? ' song' : ' songs');
  tickNow();
}
function tickNow() {
  if (cur !== 'now') return;
  const pos = livePos();
  const b = $('#npbar'); if (b) b.style.width = (P.duration ? pos / P.duration * 100 : 0) + '%';
  const l = $('#npl'); if (l) l.textContent = fmt(pos);
  const r = $('#npr'); if (r) r.textContent = P.duration ? '−' + fmt(P.duration - pos) : '';
}
onPlayer(() => { fillNow(); if (cur === 'library') markPlaying(); });
setInterval(tickNow, 250);
onSettings(() => buildNav($('#q').value));

// ---- Library ----
function fillLibrary() {
  const el = $('#liblist');
  if (!el) return;
  if (!libList.length) {
    el.innerHTML = `<div class="empty">${ic('music')}<div class="t">No songs yet</div><div class="s">Add songs from your computer, then pick any of them to play. Next and Previous move through this list.</div></div>`;
    return;
  }
  el.innerHTML = libList.map((t, i) => `<div class="song" data-i="${i}"><div class="num">${i + 1}</div><div class="ptx"><div class="t">${esc(t.title)}</div><div class="s">${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</div></div><span class="eqb">${ic('wave')}</span><button class="rm" data-rm="${i}" title="Remove">${ic('trash')}</button></div>`).join('');
  el.querySelectorAll('.song').forEach(r => r.ondblclick = () => musico.cmd('playIndex', +r.dataset.i));
  el.querySelectorAll('.song').forEach(r => r.onclick = (e) => { if (e.target.closest('.rm')) return; if (matchMedia('(pointer:coarse)').matches) musico.cmd('playIndex', +r.dataset.i); r.classList.add('sel'); [...el.children].forEach(x => x !== r && x.classList.remove('sel')); });
  el.querySelectorAll('.rm').forEach(b => b.onclick = () => musico.library.remove(+b.dataset.rm));
  markPlaying();
}
function markPlaying() {
  document.querySelectorAll('#liblist .song').forEach((r, i) => r.classList.toggle('now', P.source === 'library' && P.index === i));
}
musico.library.onChanged((l) => { libList = l; libCount = l.length; if (cur === 'library') fillLibrary(); fillNow(); });
musico.library.get().then((l) => { libList = l; libCount = l.length; if (cur === 'library') fillLibrary(); fillNow(); });
document.addEventListener('click', (e) => { if (e.target.closest('#addSongs')) musico.library.add(); });
// drag & drop files
['dragover', 'drop'].forEach(ev => document.addEventListener(ev, (e) => { e.preventDefault(); }));
document.addEventListener('drop', (e) => {
  const paths = [...(e.dataTransfer.files || [])].map(f => { try { return musico.pathForFile(f); } catch { return ''; } }).filter(Boolean);
  if (paths.length) musico.library.addPaths(paths).then(() => go('library'));
});
go('now');
