// 玩家：貓咪噴射背包戰機。可在畫面最下方區域自由移動，按住射擊鍵連發。
// 貼圖是 assets/images/sprites/player.png（貓咪背影 + 噴射背包），背包的兩個噴射口會持續噴出淺藍色粒子。
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
      this.radius = P.radius;
      this.fx.clear();
    }

    respawn() {
      this.reset();
      this.invuln = P.invuln;
    }

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
      this.vx = input.ax * P.speed;      // 也供 BOSS 預判瞄準用
      this.x = M.clamp(this.x + input.ax * P.speed * dt, P.minX, P.maxX);
      this.y = M.clamp(this.y + input.ay * P.speed * dt, P.minY, P.maxY);
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      this.updateFx(dt, true, -input.ay);   // 往上飛（ay<0）噴得更長

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
      BM.Sprites.draw(ctx, 'cat', this.x, this.y, 0, BM.Sprites.player.scale, blink ? 0.35 : 1);
    }
  }

  BM.Player = Player;
})(window.BM = window.BM || {});
