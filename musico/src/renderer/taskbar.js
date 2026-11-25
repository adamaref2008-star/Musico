    const $ = (i) => document.getElementById(i);
    $('pv').innerHTML = ic('prev'); $('nx').innerHTML = ic('next');
    $('pv').onclick = () => musico.cmd('prev'); $('pl').onclick = () => musico.cmd('toggle'); $('nx').onclick = () => musico.cmd('next');
    function render() { $('t').textContent = nowTitle(); $('a').textContent = P.artist || ''; setArt($('art'), P.art); $('pl').innerHTML = ic(P.playing ? 'pause' : 'play'); tick(); }
    function tick() { $('pb').style.width = (P.duration ? livePos() / P.duration * 100 : 0) + '%'; }
    onPlayer(render); setInterval(tick, 400); render();
