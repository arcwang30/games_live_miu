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

    // （起司月亮是動態畫的，見 drawMoon）

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

    // 起司月亮的狀態：shake=進場前抖動（0/1）、glow=正在噴出老鼠時發亮（會平滑過渡）
    moonShake: 0, moonGlow: 0, moonGlowTarget: 0,
    moon(shake, glow) { this.moonShake = shake; this.moonGlowTarget = glow; },

    update(dt) {
      this.moonGlow += (this.moonGlowTarget - this.moonGlow) * Math.min(1, 6 * dt);
      for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y -= H; s.x = Math.random() * W; } }
      for (const c of clouds) {
        c.y += c.v * dt;
        if (c.y > H + 80) { c.y = -80; c.x = Math.random() * W; }
      }
    },

    // 起司月亮：黃色的月亮上有幾個洞（老鼠從洞裡噴出來）；噴出時月亮發亮、洞口變深
    drawMoon(ctx, t) {
      const m = C.MOON, sh = this.moonShake, gl = this.moonGlow;
      ctx.save();
      ctx.translate(m.x + (sh ? Math.sin(t * 70) * 2.6 : 0), m.y + (sh ? Math.cos(t * 63) * 2 : 0));
      const pulse = gl * (0.7 + 0.3 * Math.sin(t * 12));
      const halo = ctx.createRadialGradient(0, 0, m.r * 0.8, 0, 0, m.r * 2.1 + pulse * 14);   // 光暈
      halo.addColorStop(0, 'rgba(255,226,122,' + (0.35 + 0.3 * pulse) + ')');
      halo.addColorStop(1, 'rgba(255,226,122,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, m.r * 2.1 + pulse * 14, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createRadialGradient(-10, -12, 4, 0, 0, m.r);                            // 月亮本體（起司黃）
      body.addColorStop(0, '#fff2ac');
      body.addColorStop(1, '#ffd456');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#e6a92a'; ctx.stroke();
      for (const h of m.holes) {                                                                 // 起司的洞
        ctx.fillStyle = gl > 0.3 ? '#8a5410' : '#e8b640';
        ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(h.x - h.r * 0.25, h.y - h.r * 0.3, h.r * 0.45, h.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },

    draw(ctx, t) {
      ctx.drawImage(sky, 0, 0, W, H);
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.6 + s.tw));
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
      this.drawMoon(ctx, t);
      for (const c of clouds) BM.Sprites.draw(ctx, 'cloud' + c.k, c.x, c.y, 0, c.s, c.a);
      ctx.globalAlpha = 1;
    }
  };
})(window.BM = window.BM || {});
