(function (BM) {
  const C = BM.CONFIG, W = C.W, H = C.H;

  // 玩家子彈：小魚，直線向上
  class PlayerBullet {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.vy = -C.PLAYER.bulletSpeed;
      this.r = 5;
      this.dead = false;
    }
    update(dt) {
      this.y += this.vy * dt;
      if (this.y < -20) this.dead = true;
    }
    draw(ctx) { BM.Sprites.draw(ctx, 'fish', this.x, this.y, 0, 1); }
  }

  // 敵方子彈種類：orb=小老鼠光球、poop=BOSS 便便、cheese=BOSS 起司、knife=桐生爹鼠三角錐攻擊的小刀、
  // moon=桐生爹鼠揮刀射出的半月形弧光、goku=桐生爹鼠「極！」射出的字（打中玩家只會緩速，不會扣命，見 play-scene.js 的 collide()）、
  // fish=被 BOSS 護盾彈開的玩家小魚（只有視覺效果，不會傷害玩家，讓「危險扇形之外 = 安全」）
  const KINDS = {
    orb:    { sprite: 'orb',    r: C.ENEMY.bulletRadius },
    poop:   { sprite: 'poop',   r: 8 },
    cheese: { sprite: 'cheese', r: 7 },
    knife:  { sprite: 'knife',  r: 7 },
    moon:   { sprite: 'moon',   r: 50 },
    goku:   { sprite: 'goku',   r: 40 },
    fish:   { sprite: 'fish',   r: 5, harmless: true, life: 0.9 }
  };

  // 敵方子彈：可朝任意角度飛行
  class EnemyBullet {
    constructor(x, y, angle, speed, kind) {
      const k = KINDS[kind] || KINDS.orb;
      this.kind = kind || 'orb';
      this.sprite = k.sprite;
      this.r = k.r;
      this.harmless = !!k.harmless;      // 無傷害：碰撞判定會略過
      this.life = k.life || 0;           // >0：存活秒數，時間到就消失
      this.age = 0;
      this.x = x; this.y = y;
      this.angle = angle;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.spin = Math.random() * 6;
      this.dead = false;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.spin += dt * 4;
      this.age += dt;
      if (this.life > 0 && this.age >= this.life) this.dead = true;
      if (this.y > H + 30 || this.y < -30 || this.x < -30 || this.x > W + 30) this.dead = true;
    }
    draw(ctx) {
      let rot = 0, alpha;
      if (this.kind === 'poop') rot = Math.sin(this.spin) * 0.35;      // 便便左右搖晃
      else if (this.kind === 'cheese' || this.kind === 'knife' || this.kind === 'moon') rot = this.angle;   // 起司 / 小刀 / 半月弧光朝飛行方向
      // goku（「極」字）不隨飛行方向旋轉，維持正立好辨認
      else if (this.kind === 'fish') {                                 // 被彈開的小魚：半透明、漸漸消失
        rot = this.angle + Math.PI / 2;
        alpha = 0.6 * (1 - this.age / this.life);
      }
      BM.Sprites.draw(ctx, this.sprite, this.x, this.y, rot, 1, alpha);
    }
  }

  BM.PlayerBullet = PlayerBullet;
  BM.EnemyBullet = EnemyBullet;
})(window.BM = window.BM || {});
