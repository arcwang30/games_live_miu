// 爆炸粒子與飄浮得分文字
(function (BM) {
  const M = BM.M, D = BM.Draw;

  const parts = [];
  const popups = [];

  BM.Particles = {
    clear() { parts.length = 0; },

    explode(x, y, color, n) {
      n = n || 16;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * M.TAU, sp = M.rand(60, 230);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: M.rand(0.4, 0.85), size: M.rand(2, 5), color });
      }
      parts.push({ ring: true, x, y, life: 0, max: 0.35, size: 6, color: '#ffffff' });
    },

    update(dt) {
      for (const p of parts) {
        p.life += dt;
        if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life >= parts[i].max) parts.splice(i, 1);
    },

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, k);
        if (p.ring) {
          ctx.strokeStyle = p.color; ctx.lineWidth = 3 * k + 0.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (1 - k) * 30, 0, M.TAU); ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, M.TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  };

  BM.Popups = {
    clear() { popups.length = 0; },
    add(x, y, text, color) { popups.push({ x, y, text, color: color || '#fff', t: 0, dur: 0.9 }); },
    update(dt) {
      for (const p of popups) { p.t += dt; p.y -= 34 * dt; }
      for (let i = popups.length - 1; i >= 0; i--) if (popups[i].t >= popups[i].dur) popups.splice(i, 1);
    },
    draw(ctx) {
      for (const p of popups) {
        D.text(ctx, p.text, p.x, p.y, {
          size: 18, align: 'center', color: p.color, stroke: '#1b1240', strokeW: 4,
          family: D.NUM, weight: '900', alpha: Math.min(1, (p.dur - p.t) / 0.3)
        });
      }
    }
  };
})(window.BM = window.BM || {});
