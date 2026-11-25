// Hidden window: plays the Musico library and feeds Beat Glow.
const a = document.getElementById('a');
let tracks = [];
let index = -1;
let analyse = false;
let ctx, analyser, data, raf;

function report() {
  musico.engine.report({ index, playing: !a.paused && !a.ended, position: a.currentTime || 0, duration: isFinite(a.duration) ? a.duration : 0 });
}
function load(i, autoplay) {
  if (!tracks.length) return;
  index = ((i % tracks.length) + tracks.length) % tracks.length;
  a.src = tracks[index].url;
  a.load();
  if (autoplay) a.play().catch(() => {});
  report();
}
function setupAnalyser() {
  if (ctx) return;
  ctx = new AudioContext();
  const src = ctx.createMediaElementSource(a);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  data = new Uint8Array(analyser.frequencyBinCount);
  src.connect(analyser);
  analyser.connect(ctx.destination);
}
let avg = 0.2;
function loop() {
  raf = requestAnimationFrame(loop);
  if (!analyse || !analyser || a.paused) return;
  analyser.getByteFrequencyData(data);
  let s = 0;
  for (let i = 1; i < 12; i++) s += data[i]; // low band
  const v = s / 11 / 255;
  avg = avg * 0.95 + v * 0.05;
  musico.engine.level(Math.max(0, Math.min(1, (v - avg) * 3.2 + v * 0.55)));
}
loop();

musico.engine.onCmd((m) => {
  switch (m.type) {
    case 'queue': {
      const cur = index >= 0 ? tracks[index] && tracks[index].url : null;
      tracks = m.tracks;
      if (typeof m.volume === 'number') a.volume = m.volume / 100;
      const ni = cur ? tracks.findIndex((t) => t.url === cur) : -1;
      if (ni >= 0) index = ni; else if (cur) { a.pause(); a.removeAttribute('src'); index = -1; }
      report();
      break;
    }
    case 'play': load(m.index, true); break;
    case 'toggle': if (a.paused) { if (a.src) a.play().catch(() => {}); else load(0, true); } else a.pause(); break;
    case 'next': load(index + 1, true); break;
    case 'prev': if (a.currentTime > 4) a.currentTime = 0; else load(index - 1, true); break;
    case 'seek': if (isFinite(m.arg)) a.currentTime = Math.max(0, m.arg); break;
    case 'volume': a.volume = Math.max(0, Math.min(1, m.v / 100)); break;
    case 'stop': a.pause(); a.removeAttribute('src'); a.load(); index = -1; report(); break;
    case 'analyse': analyse = !!m.on; if (analyse) { setupAnalyser(); ctx.resume(); } break;
  }
});
['play', 'pause', 'ended', 'seeked', 'loadedmetadata', 'durationchange'].forEach((e) => a.addEventListener(e, report));
a.addEventListener('ended', () => load(index + 1, true));
a.addEventListener('error', () => { if (tracks.length > 1) setTimeout(() => load(index + 1, true), 300); });
setInterval(() => { if (!a.paused) report(); }, 500);
