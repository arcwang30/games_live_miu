// 縱向捲動的夜空背景：漸層天空 + 閃爍星星 + 兩層雲 + 底部小鎮剪影（貓咪要守護的家園）
(function (BM) {
  const C = BM.CONFIG, W = C.W, H = C.H, M = BM.M;
  let sky = null;
  let stars = [];
  let clouds = [];

  function buildSky() {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#0d1240');
    gr.addColorStop(0.5, '#22378a');
    gr.addColorStop(1, '#3f7fd6');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    // 月亮
    g.fillStyle = 'rgba(255,246,200,0.9)';
    g.beginPath(); g.arc(440, 170, 36, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,246,200,0.18)';
    g.beginPath(); g.arc(440, 170, 58, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(214,200,150,0.55)';
    for (const m of [[428, 160, 7], [452, 182, 5], [446, 155, 3.5]]) {
      g.beginPath(); g.arc(m[0], m[1], m[2], 0, Math.PI * 2); g.fill();
    }

    // 底部小鎮剪影
    g.fillStyle = '#0a1038';
    let x = -6;
    while (x < W) {
      const w = M.randInt(26, 46), h = M.randInt(18, 38);
      g.fillRect(x, H - h, w, h);
      g.beginPath();                                       // 貓耳屋頂
      g.moveTo(x - 2, H - h);
      g.lineTo(x + w * 0.22, H - h - 12);
      g.lineTo(x + w * 0.5, H - h);
      g.lineTo(x + w * 0.78, H - h - 12);
      g.lineTo(x + w + 2, H - h);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,220,120,0.85)';              // 燈火窗戶
      for (let wy = H - h + 6; wy < H - 6; wy += 11) {
        for (let wx = x + 6; wx < x + w - 6; wx += 12) {
          if (Math.random() < 0.55) g.fillRect(wx, wy, 5, 5);
        }
      }
      g.fillStyle = '#0a1038';
      x += w + M.randInt(2, 8);
    }
    return c;
  }

  BM.Background = {
    init() {
      sky = buildSky();
      stars = [];
      for (let i = 0; i < 70; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: M.rand(0.6, 1.8), tw: Math.random() * 6, v: M.rand(8, 22) });
      }
      clouds = [];
      for (let i = 0; i < 9; i++) {
        const far = i < 5;
        clouds.push({
          x: Math.random() * W, y: Math.random() * (H + 120) - 60,
          v: far ? M.rand(26, 38) : M.rand(70, 95),
          s: far ? M.rand(0.6, 0.9) : M.rand(1.0, 1.5),
          a: far ? 0.10 : 0.17,
          k: M.randInt(0, 2)
        });
      }
    },

    update(dt) {
      for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y -= H; s.x = Math.random() * W; } }
      for (const c of clouds) {
        c.y += c.v * dt;
        if (c.y > H + 80) { c.y = -80; c.x = Math.random() * W; }
      }
    },

    draw(ctx, t) {
      ctx.drawImage(sky, 0, 0, W, H);
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.6 + s.tw));
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      for (const c of clouds) BM.Sprites.draw(ctx, 'cloud' + c.k, c.x, c.y, 0, c.s, c.a);
      ctx.globalAlpha = 1;
    }
  };
})(window.BM = window.BM || {});
