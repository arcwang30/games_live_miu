// 老鼠敵機。狀態機：
//   wait（尚未登場）→ enter（從起司月亮噴出，沿進場隊形飛入陣形，見 systems/entrance.js）→ formation（待機）
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
      this.landT = 0;             // 落位彈跳剩餘時間
      this.hopDelay = null;       // 波紋跳躍：延遲 / 剩餘時間
      this.hopT = 0;
    }

    get hittable() { return this.state !== 'wait'; }

    update(dt, w) {
      if (this.flash > 0) this.flash -= dt;
      if (this.landT > 0) this.landT -= dt;                  // 落位彈跳
      if (this.hopDelay !== null) {                          // 全隊到位後的波紋：依距離延遲，輪到時跳一下
        this.hopDelay -= dt;
        if (this.hopDelay <= 0) { this.hopDelay = null; this.hopT = 0.3; }
      }
      if (this.hopT > 0) this.hopT -= dt;
      switch (this.state) {
        case 'wait':
          this.delay -= dt;
          if (this.delay <= 0) this.beginEnter(w);
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

    // ---- 登場：從起司月亮的洞噴出（由小變大），沿該波的進場隊形飛到陣形位置。
    //      進場期間不會傷害玩家，但可以被打 ----
    beginEnter(w) {
      this.state = 'enter';
      this.t = 0;
      this.pat = BM.Entrance.PATTERNS[w.entrancePattern || 0];
      this.p0 = BM.Entrance.spawnPoint();
      this.x = this.p0.x; this.y = this.p0.y;
      this.popS = 0;
      BM.Particles.sparkle(this.p0.x, this.p0.y, '#ffe27a', 3);      // 洞口噴出的小火花
      if ((Enemy.popCount = (Enemy.popCount || 0) + 1) % 4 === 0) w.sfx('pop');
    }

    updateEnter(dt, w) {
      this.t += dt;
      const u = Math.min(1, this.t / this.pat.dur);
      const s = w.formation.slot(this.col, this.row);
      const pos = this.pat.pos(u, this.p0, s);
      const dx = pos.x - this.x, dy = pos.y - this.y;
      if (dx * dx + dy * dy > 0.01) {
        const target = M.lerpAngle(Math.atan2(dy, dx), PI / 2, M.smoothstep((u - 0.8) / 0.2));   // 快到位時轉回正面朝下
        this.heading = M.lerpAngle(this.heading, target, Math.min(1, 14 * dt));
      }
      this.x = pos.x; this.y = pos.y;
      this.popS = M.smoothstep(u / 0.1);                             // 剛出洞時由小變大
      if (u >= 1) {                                                  // 落位：小彈跳 + 星星閃光
        this.state = 'formation';
        this.landT = 0.28;
        BM.Particles.sparkle(this.x, this.y, '#fff3b0', 3);
      }
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
      let sc = this.state === 'enter' ? 0.25 + 0.75 * this.popS : 1;             // 出洞由小變大
      if (this.landT > 0) sc *= 1 + 0.3 * Math.sin(Math.PI * this.landT / 0.28);  // 落位彈一下
      const yOff = this.hopT > 0 ? -12 * Math.sin(Math.PI * (1 - this.hopT / 0.3)) : 0;   // 波紋經過時跳一下
      BM.Sprites.draw(ctx, name, this.x, this.y + yOff, this.heading - PI / 2, sc);
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
