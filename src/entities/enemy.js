// 老鼠敵機。狀態機：
//   wait（尚未登場）→ enter（曲線飛入陣形）→ formation（待機）
//   → attack（由 BM.AI 控制）→ return（回到陣形）→ formation …
(function (BM) {
  const C = BM.CONFIG, M = BM.M, W = C.W, PI = Math.PI;

  const TYPES = [
    { name: '迅捷鼠', hp: 1, points: 60,  color: '#d5d8e6' },
    { name: '狙擊鼠', hp: 2, points: 100, color: '#6fe6d8' },
    { name: '衝撞鼠', hp: 1, points: 80,  color: '#ff8585' },
    { name: '旋轉鼠', hp: 1, points: 120, color: '#c9a4ff' }
  ];

  class Enemy {
    constructor(type, col, row) {
      const info = TYPES[type];
      this.type = type; this.col = col; this.row = row;
      this.hp = info.hp;
      this.points = info.points;
      this.radius = C.ENEMY.radius;
      this.state = 'wait';
      this.delay = 0;
      this.side = 1;              // 登場方向：1 從左、-1 從右
      this.x = -100; this.y = -100;
      this.heading = PI / 2;
      this.flash = 0;
      this.dead = false;
      this.ai = null;
      this.aimAngle = null;       // 狙擊鼠預警線
      this.aimLocked = false;
      this.warn = false;          // 衝撞鼠蓄力驚嘆號
      this.tele = 0;              // 狙擊鼠預警光圈
      this.t = 0;
    }

    get hittable() { return this.state !== 'wait'; }

    update(dt, w) {
      if (this.flash > 0) this.flash -= dt;
      switch (this.state) {
        case 'wait':
          this.delay -= dt;
          if (this.delay <= 0) this.beginEnter();
          break;
        case 'enter': this.updateEnter(dt, w); break;
        case 'formation': {
          const s = w.formation.slot(this.col, this.row);
          this.x = s.x; this.y = s.y;
          this.heading = M.lerpAngle(this.heading, PI / 2, Math.min(1, 12 * dt));
          break;
        }
        case 'attack': BM.AI[this.type].update(this, dt, w); break;
        case 'return': this.updateReturn(dt, w); break;
      }
    }

    // ---- 登場：從畫面上方角落沿曲線飛入陣形（此時不會傷害玩家，但可以被打）----
    beginEnter() {
      this.state = 'enter';
      this.t = 0;
      const left = this.side === 1;
      this.p0 = { x: left ? -30 : W + 30, y: 130 };
      this.p1 = { x: left ? W * 0.65 : W * 0.35, y: 700 };
      this.x = this.p0.x; this.y = this.p0.y;
    }

    updateEnter(dt, w) {
      this.t += dt;
      const u = Math.min(1, this.t / C.ENEMY.enterDur);
      const s = w.formation.slot(this.col, this.row);
      const pos = M.bezier(this.p0, this.p1, { x: s.x, y: s.y + 190 }, s, u);
      const dx = pos.x - this.x, dy = pos.y - this.y;
      if (dx * dx + dy * dy > 0.01) {
        const target = M.lerpAngle(Math.atan2(dy, dx), PI / 2, M.smoothstep((u - 0.7) / 0.3));
        this.heading = M.lerpAngle(this.heading, target, Math.min(1, 14 * dt));
      }
      this.x = pos.x; this.y = pos.y;
      if (u >= 1) this.state = 'formation';
    }

    // ---- 攻擊結束回陣形：fromTop=true 表示已飛出畫面，從上方重新進場 ----
    startReturn(fromTop) {
      const s = BM.Formation.slot(this.col, this.row);
      this.state = 'return';
      this.rt = 0;
      this.rdur = fromTop ? 1.1 : 0.9;
      if (fromTop) { this.x = M.clamp(s.x, 20, W - 20); this.y = -40; }
      this.rfrom = { x: this.x, y: this.y };
      this.ai = null; this.aimAngle = null; this.warn = false; this.tele = 0;
    }

    updateReturn(dt, w) {
      this.rt += dt;
      const u = Math.min(1, this.rt / this.rdur);
      const e = M.easeInOutSine(u);
      const s = w.formation.slot(this.col, this.row);
      const nx = M.lerp(this.rfrom.x, s.x, e), ny = M.lerp(this.rfrom.y, s.y, e);
      const dx = nx - this.x, dy = ny - this.y;
      if (dx * dx + dy * dy > 0.01) this.heading = M.lerpAngle(this.heading, Math.atan2(dy, dx), Math.min(1, 12 * dt));
      this.x = nx; this.y = ny;
      if (u >= 1) this.state = 'formation';
    }

    draw(ctx, t) {
      if (this.state === 'wait') return;
      if (this.tele > 0) {                                   // 狙擊鼠預警光圈
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 30);
        ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, 17 + this.tele * 7, 0, M.TAU); ctx.stroke();
        ctx.restore();
      }
      const name = 'mouse' + this.type + (this.flash > 0 ? '_hit' : '');
      BM.Sprites.draw(ctx, name, this.x, this.y, this.heading - PI / 2, 1);
      if (this.warn) {                                       // 衝撞鼠蓄力驚嘆號
        BM.Draw.text(ctx, '!', this.x, this.y - 26, {
          size: 24, align: 'center', color: '#ff4d4d', stroke: '#fff', strokeW: 4, weight: '900', family: BM.Draw.NUM
        });
      }
    }
  }

  Enemy.TYPES = TYPES;
  BM.Enemy = Enemy;
})(window.BM = window.BM || {});
