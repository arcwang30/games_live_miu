// 玩家：貓咪噴射背包戰機。可在畫面最下方區域自由移動，按住射擊鍵連發。
// 貼圖是 assets/images/sprites/player.png（貓咪背影 + 噴射背包），背包的兩個噴射口會持續噴出淺藍色粒子。
// 麻痺：被桐生爹鼠的「極！」擊中時 stunT > 0，這段時間完全無法移動（卡一下的感覺），機身會小幅晃抖並冒出麻痺特效，直到時間歸零；還是可以開火。
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
      this.stunT = 0;
      this.radius = P.radius;
      this.fx.clear();
      BM.Touch.resync();     // 重生 / 重新開始：舊的觸控定點作廢，手指還按著就重新對準手指
    }

    respawn() {
      this.reset();
      this.invuln = P.invuln;
    }

    // 麻痺：多次命中只會延長時間，不會疊加得更久
    applyStun(dur) { this.stunT = Math.max(this.stunT, dur); }

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
      if (this.stunT > 0) {                                // 麻痺中：完全無法移動（卡一下），但還能開火
        this.stunT = Math.max(0, this.stunT - dt);
        this.vx = 0;
        this.updateFx(dt, true, 0);
        if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
        this.fireT -= dt;
        if (input.fire && this.fireT <= 0) { this.fireT = P.fireDelay; world.firePlayer(this.x, this.y); }
        return;
      }
      let vy = input.ay * P.speed;
      if (input.target) {
        // 觸控：朝手指上方的定點飛。誤差越大越快（比例追蹤，手感平順），但有速度上限，
        // 所以「點新位置」會快速飛過去、而不是瞬間移動
        let dx = input.target.x - this.x, dy = input.target.y - this.y;
        let vx = dx * P.touchFollow;
        vy = dy * P.touchFollow;
        const sp = Math.hypot(vx, vy), cap = P.touchSpeed;
        if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
        this.vx = vx;
        this.x = M.clamp(this.x + vx * dt, P.minX, P.maxX);
        this.y = M.clamp(this.y + vy * dt, P.minY, P.maxY);
      } else {
        this.vx = input.ax * P.speed;      // 也供 BOSS 預判瞄準用
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
      const stunned = this.stunT > 0;
      const jx = stunned ? Math.sin(t * 70) * 3 : 0, jy = stunned ? Math.cos(t * 55) * 1.6 : 0;   // 麻痺：機身小幅快速晃抖
      if (stunned) this.drawStunFx(ctx, t);               // 麻痺特效（畫在機身後面）
      BM.Sprites.draw(ctx, 'cat', this.x + jx, this.y + jy, 0, BM.Sprites.player.scale, blink ? 0.35 : 1);
    }

    // 麻痺特效：機身周圍繞著幾道閃電
    drawStunFx(ctx, t) {
      ctx.save();
      ctx.strokeStyle = '#fff27a';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,242,122,0.85)'; ctx.shadowBlur = 9;
      for (let i = 0; i < 3; i++) {
        const ang = t * 9 + i * (M.TAU / 3);
        const cx = this.x + Math.cos(ang) * 24, cy = this.y - 26 + Math.sin(ang) * 12;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 6);
        ctx.lineTo(cx + 1, cy - 2);
        ctx.lineTo(cx - 2, cy - 2);
        ctx.lineTo(cx + 5, cy - 8);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  BM.Player = Player;
})(window.BM = window.BM || {});
