    const g = document.getElementById('g');
    let level = 0, color = [255, 45, 117], t0 = performance.now();
    function albumColor() {
      if (S.colors !== 'From the Album' || !P.art) { color = [255, 45, 117]; return; }
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = 16;
          const x = c.getContext('2d'); x.drawImage(img, 0, 0, 16, 16);
          const d = x.getImageData(0, 0, 16, 16).data;
          let r = 0, gg = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) { const m = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); if (m > 40) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } }
          if (n) { const k = 255 / Math.max(r / n, gg / n, b / n); color = [Math.min(255, r / n * k), Math.min(255, gg / n * k), Math.min(255, b / n * k)]; }
        } catch { color = [255, 45, 117]; }
      };
      img.onerror = () => { color = [255, 45, 117]; };
      img.src = P.art;
    }
    function draw() {
      requestAnimationFrame(draw);
      if (!S.beat || !P.playing) { g.style.opacity = 0; return; }
      level *= 0.9;
      let lv = level;
      if (S.motion === 'Steady') lv = 0.55;
      else if (P.source !== 'library') lv = 0.35 + 0.25 * Math.sin((performance.now() - t0) / 480); // other apps: gentle breathing
      const k = S.bright / 100;
      const a = Math.min(1, (0.15 + lv * 0.85) * (0.4 + k * 0.9));
      const th = 4 + S.thick * 0.6 * (0.6 + lv * 0.6); // px
      const c = `rgb(${color.map(Math.round)})`;
      const cs = `rgba(${color.map(Math.round)},${a.toFixed(3)})`;
      let bg = 'none', sh = 'none';
      switch (S.beatStyle) {
        case 'Rim': sh = `inset 0 0 0 ${(th / 6).toFixed(1)}px ${cs}, inset 0 0 ${th * 1.6}px ${(th / 3).toFixed(1)}px ${cs}`; break;
        case 'Edges': sh = `inset 0 0 ${th * 3}px ${th * 0.7}px ${cs}`; break;
        case 'Corners': { const r = 120 + th * 8; bg = ['0 0', '100% 0', '0 100%', '100% 100%'].map((p) => `radial-gradient(circle at ${p}, ${cs}, transparent ${r}px)`).join(','); break; }
        case 'Sides': { const w = 40 + th * 5; bg = `linear-gradient(90deg, ${cs}, transparent ${w}px, transparent calc(100% - ${w}px), ${cs})`; break; }
      }
      g.style.background = bg; g.style.boxShadow = sh; g.style.opacity = 1;
    }
    musico.onBeat((v) => { level = Math.max(level * 0.5, v); });
    onPlayer(albumColor); onSettings(albumColor);
    albumColor(); draw();
