// 噴射粒子特效：從背包噴射口噴出淺藍色小粒子。
// 粒子在「世界座標」中飄散，所以戰機左右移動時會拖出一條尾跡；往上加速時噴得更長、往下時變短。
(function (BM) {
  const M = BM.M;
  const COLORS = ['#eafcff', '#c4f1ff', '#9fe6ff', '#7fd6ff'];   // 淺藍色系
  const MAX = 220;

  class JetFx {
    constructor() { this.p = []; this.acc = []; }

    clear() { this.p.length = 0; this.acc.length = 0; }

    // nozzles：噴口的世界座標陣列 [{x,y},…]；vx：戰機水平速度；boost：-1（下）~ 1（上）；emit：是否持續噴出
    update(dt, nozzles, vx, boost, emit) {
      if (emit) {
        for (let i = 0; i < nozzles.length; i++) {
          this.acc[i] = (this.acc[i] || 0) + dt * (72 + boost * 26);
          while (this.acc[i] >= 1) {
            this.acc[i] -= 1;
            if (this.p.length < MAX) this.p.push(this.spawn(nozzles[i], vx, boost));
          }
        }
      }
      for (const q of this.p) {
        q.t += dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vx *= 1 - 0.9 * dt;
      }
      this.p = this.p.filter(q => q.t < q.life);
    }

    spawn(n, vx, boost) {
      const k = 1 + boost * 0.25;
      return {
        x: n.x + M.rand(-1.6, 1.6),
        y: n.y + M.rand(-1, 2),
        vx: M.rand(-28, 28) + vx * 0.3,
        vy: M.rand(150, 270) * k,
        t: 0,
        life: M.rand(0.28, 0.55) * k,
        size: M.rand(1.5, 3.4),
        color: M.pick(COLORS)
      };
    }

    // scale：粒子大小倍率（主選單的大隻主角用）；alpha：整體透明度（無敵閃爍時變淡）
    draw(ctx, alpha, scale) {
      if (!this.p.length) return;
      ctx.save();
      for (const q of this.p) {
        const k = 1 - q.t / q.life;
        ctx.globalAlpha = (alpha === undefined ? 1 : alpha) * Math.min(1, k * 1.6) * 0.92;
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (scale || 1) * (0.45 + 0.55 * k), 0, M.TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  BM.JetFx = JetFx;
})(window.BM = window.BM || {});
