// 玩家：貓咪噴射背包戰機。可在畫面最下方區域自由移動，按住射擊鍵連發。
// 貼圖是 assets/images/sprites/player.png（貓咪背影 + 噴射背包），背包的兩個噴射口會持續噴出淺藍色粒子。
// 緩速：被桐生爹鼠的「極！」擊中時 slowT > 0，移動速度乘上 P.slowMul，直到時間歸零。
(function (BM) {
  const P = BM.CONFIG.PLAYER, M = BM.M;

  class Player {
    constructor() {
      this.fx = new BM.JetFx();
      this.reset();
    }

    reset() {
      this.x = P.startX; this.y = P.startY;
      this.vx = 0;
      this.alive = true;
      this.invuln = 0;
      this.fireT = 0;
      this.slowT = 0;
      this.radius = P.radius;
      this.fx.clear();
      BM.Touch.resync();     // 重生 / 重新開始：舊的觸控定點作廢，手指還按著就重新對準手指
    }

    respawn() {
      this.reset();
      this.invuln = P.invuln;
    }

    // 緩速：多次命中只會延長時間，不會疊加得更慢
    applySlow(dur) { this.slowT = Math.max(this.slowT, dur); }

    // 噴射口的世界座標
    nozzles() {
      const info = BM.Sprites.player;
      return info.nozzles.map(n => ({ x: this.x + n.x * info.scale, y: this.y + n.y * info.scale }));
    }

    // 只更新噴射粒子（死亡期間讓殘留的粒子自然消散）
    updateFx(dt, emit, boost) {
      this.fx.update(dt, this.nozzles(), this.vx, boost || 0, emit);
    }

    // input：BM.Input；world：PlayScene（提供 firePlayer）
    update(dt, input, world) {
      if (this.slowT > 0) this.slowT = Math.max(0, this.slowT - dt);
      const spdK = this.slowT > 0 ? P.slowMul : 1;         // 緩速倍率：移動與觸控速度上限都變慢
      let vy = input.ay * P.speed * spdK;
      if (input.target) {
        // 觸控：朝手指上方的定點飛。誤差越大越快（比例追蹤，手感平順），但有速度上限，
        // 所以「點新位置」會快速飛過去、而不是瞬間移動
        let dx = input.target.x - this.x, dy = input.target.y - this.y;
        let vx = dx * P.touchFollow;
        vy = dy * P.touchFollow;
        const sp = Math.hypot(vx, vy), cap = P.touchSpeed * spdK;
        if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
        this.vx = vx;
        this.x = M.clamp(this.x + vx * dt, P.minX, P.maxX);
        this.y = M.clamp(this.y + vy * dt, P.minY, P.maxY);
      } else {
        this.vx = input.ax * P.speed * spdK;      // 也供 BOSS 預判瞄準用
        this.x = M.clamp(this.x + this.vx * dt, P.minX, P.maxX);
        this.y = M.clamp(this.y + vy * dt, P.minY, P.maxY);
      }
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      this.updateFx(dt, true, M.clamp(-vy / P.speed, -1, 1));   // 往上飛噴得更長

      this.fireT -= dt;
      if (input.fire && this.fireT <= 0) {
        this.fireT = P.fireDelay;
        world.firePlayer(this.x, this.y);
      }
    }

    draw(ctx, t) {
      const blink = this.invuln > 0 && Math.floor(t * 14) % 2 === 0;
      this.fx.draw(ctx, blink ? 0.45 : 1, 1);            // 粒子畫在戰機後面
      if (!this.alive) return;
      if (this.slowT > 0) {                               // 緩速中：腳下一圈淡藍色提示圈
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 10);
        ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.x, this.y + 14, 22, 0, M.TAU); ctx.stroke();
        ctx.restore();
      }
      BM.Sprites.draw(ctx, 'cat', this.x, this.y, 0, BM.Sprites.player.scale, blink ? 0.35 : 1);
    }
  }

  BM.Player = Player;
})(window.BM = window.BM || {});
