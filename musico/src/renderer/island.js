const isl = document.getElementById('isl');
const $ = (id) => document.getElementById(id);

function applyCfg() {
  isl.classList.toggle('big', S.size === 'Big');
  isl.classList.toggle('float', S.shape === 'Floating');
  isl.classList.toggle('glass', S.look === 'Glass');
  const w = $('wrap');
  w.style.transform = `translateX(-50%) scale(${S.scale / 100})`;
  w.style.transformOrigin = 'top center';
  isl.style.setProperty('--glass', (0.35 + S.glass / 100 * 0.6).toFixed(2));
}
$('pv').innerHTML = ic('prev');
$('nx').innerHTML = ic('next');
$('xp').innerHTML = ic('expand');

// calendar
const now = new Date();
$('mon').textContent = now.toLocaleDateString(undefined, { month: 'short' });
const dow = 'SMTWTFS';
$('days').innerHTML = [-3, -2, -1, 0, 1, 2, 3].map((o) => { const d = new Date(now); d.setDate(now.getDate() + o); return `<div class="${o === 0 ? 'today' : ''}"><small>${dow[d.getDay()]}</small>${d.getDate()}</div>`; }).join('');

$('pl').onclick = () => musico.cmd('toggle');
$('pv').onclick = () => musico.cmd('prev');
$('nx').onclick = () => musico.cmd('next');
$('xp').onclick = () => musico.openSettings();
$('barw').onclick = (e) => { if (!P.duration) return; const r = $('barw').getBoundingClientRect(); musico.cmd('seek', (e.clientX - r.left) / r.width * P.duration); };

// hover to open; the window passes clicks through everywhere except over the island
let hoverT;
const enter = () => { clearTimeout(hoverT); musico.islandMouse(true); isl.classList.add('open'); };
const leave = () => { hoverT = setTimeout(() => { isl.classList.remove('open'); musico.islandMouse(false); }, 400); };
isl.addEventListener('mouseenter', enter);
isl.addEventListener('mouseleave', leave);
document.addEventListener('mousemove', (e) => {
  const r = isl.getBoundingClientRect();
  if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) enter();
});

function render() {
  $('ti').textContent = nowTitle();
  $('ar').textContent = nowArtist();
  setArt($('art'), P.art);
  setArt($('dot'), P.art);
  $('pl').innerHTML = ic(P.playing ? 'pause' : 'play');
  isl.classList.toggle('playing', P.playing);
  tick();
}
function tick() {
  const pos = livePos();
  $('bar').style.width = (P.duration ? pos / P.duration * 100 : 0) + '%';
  $('a').textContent = fmt(pos);
  $('b').textContent = P.duration ? fmt(P.duration) : '0:00';
}
async function cpu() {
  const v = await musico.cpu();
  $('cpuv').textContent = v + '%';
  $('r1').style.strokeDashoffset = 390 * (1 - Math.max(0.03, v / 100));
}
onPlayer(render);
onSettings(applyCfg);
setInterval(tick, 300);
setInterval(cpu, 1500);
applyCfg();
render();
