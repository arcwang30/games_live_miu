// 遊戲主場景：一波一群老鼠（數量隨波數增加）→ 清光進下一波；每 5 波換 BOSS → 玩家全數陣亡則結算
(function (BM) {
  const C = BM.CONFIG, W = C.W, H = C.H, M = BM.M, D = BM.Draw, I = BM.Input;
  const PAUSE_ITEMS = ['繼續遊戲', '回主選單'];

  class PlayScene {
    enter() {
      BM.Audio.playMusic('play');
      BM.Particles.clear();
      BM.Popups.clear();
      BM.Background.update(0);

      this.formation = BM.Formation;
      this.player = new BM.Player();
      this.pBullets = [];
      this.eBullets = [];
      this.enemies = [];
      this.boss = null;
      this.score = 0;
      this.reserve = C.START_LIVES;
      this.nextExtra = C.EXTRA_LIFE_EVERY;
      this.hiBase = BM.Storage.best();
      this.wave = 0;
      this.time = 0;
      this.shake = 0;
      this.respawnT = 0;
      this.paused = false;
      this.pauseIdx = 0;
      this.banner = null;
      BM.Touch.setMode('play');       // 一進入遊戲就啟用觸控介面（不用等第一格更新）
      this.startWave();
    }
    exit() { BM.Touch.setMode('none'); }

    // ------------------------------------------------ 提供給 AI / 玩家的介面
    firePlayer(x, y) {
      if (this.pBullets.length >= C.PLAYER.maxBullets) return;
      this.pBullets.push(new BM.PlayerBullet(x - 8, y - 18), new BM.PlayerBullet(x + 8, y - 18));
      BM.Audio.sfx('shoot');
    }
    fireBullet(x, y, angle, speed, kind) {
      if (kind !== 'fish' && this.eBullets.length >= 140) return;     // 彈開的小魚只是特效，不佔用子彈上限
      this.eBullets.push(new BM.EnemyBullet(x, y, angle, speed, kind));
    }
    sfx(name) { BM.Audio.sfx(name); }
    addShake(v) { this.shake = Math.max(this.shake, v); }

    // ------------------------------------------------ 流程
    startWave() {
      this.wave++;
      this.params = BM.Waves.params(this.wave);
      this.formation.reset();
      this.eBullets.length = 0;
      if (this.wave % C.BOSS.EVERY === 0) { this.startBossWave(); return; }   // 每 5 波出現一次 BOSS

      this.boss = null;
      // 一般波的序號（BOSS 波不計入）：第 1、2、4、5、7、8… 波依序是第 1、2、3、4、5、6… 個一般波
      this.normalWave = this.wave - Math.floor(this.wave / C.BOSS.EVERY);
      this.enemies = BM.Waves.spawn(this.normalWave);
      this.director = new BM.Director();
      this.state = 'playing';
      this.banner = { text: this.wave === 1 ? 'READY!' : 'WAVE ' + this.wave, sub: this.wave === 1 ? 'WAVE 1' : '', t: 0, dur: 2.0 };
      BM.Audio.playMusic('play');
      BM.Audio.sfx('wave');
    }

    startBossWave() {
      const level = this.wave / C.BOSS.EVERY;
      this.enemies = [];
      this.boss = new BM.Boss(level);
      this.state = 'boss';
      this.banner = { text: 'WARNING!', sub: 'BOSS  流氓大老鼠 來襲', t: 0, dur: 2.6, warn: true };
      BM.Audio.playMusic('boss');
      BM.Audio.sfx('warning');
    }

    waveClear(text, sub) {
      const bonus = 1000 * this.wave;
      this.addScore(bonus);
      this.eBullets.length = 0;
      this.state = 'clear';
      this.stateT = 2.8;
      this.banner = { text: text || 'WAVE CLEAR!', sub: (sub ? sub + '　' : '') + '通關獎勵 +' + bonus, t: 0, dur: 2.6 };
      BM.Audio.sfx('clear');
    }

    // ---- BOSS 事件（由 Boss 呼叫）----
    onBossPhase(phase) {
      this.addShake(0.35);
      BM.Audio.sfx('roar');
      this.banner = { text: phase === 2 ? 'RAGE!' : 'RAGE MAX!!', sub: '', t: 0, dur: 1.3, warn: true, small: true };
    }
    onBossDying() {
      const bo = this.boss;
      this.eBullets.length = 0;                     // 死亡演出時清掉所有子彈，安心欣賞
      BM.Particles.explode(bo.x, bo.y, '#ffffff', 14);
      this.addShake(0.5);
      BM.Audio.sfx('sigh');
    }
    bossDefeated() {
      const bonus = C.BOSS.killBonus * this.boss.level;
      this.addScore(bonus);
      BM.Popups.add(this.boss.x, this.boss.y, '+' + bonus, '#ffe27a');
      this.waveClear('BOSS DEFEATED!', '擊破 BOSS +' + bonus);
    }

    // ---- 玩家子彈打到 BOSS 護盾：依圓形法線物理反射，變成半透明小魚彈開 ----
    // 彈開的小魚只有視覺效果（harmless），不會傷害玩家：確保「危險扇形之外 = 安全」
    reflectBullet(b, bo, dx, dy) {
      const r = Math.hypot(dx, dy) || 1, nx = dx / r, ny = dy / r;
      const vx = 0, vy = -C.PLAYER.bulletSpeed;
      const dot = vx * nx + vy * ny;
      const ang = Math.atan2(vy - 2 * dot * ny, vx - 2 * dot * nx) + M.rand(-0.22, 0.22);
      this.fireBullet(b.x, b.y + 4, ang, 300, 'fish');
      b.dead = true;
      BM.Particles.explode(b.x, b.y, '#9ff3ff', 4);
      BM.Audio.sfx('reflect');
    }

    finish() {
      const rank = BM.Storage.submit(this.score);
      BM.Game.setScene('gameover', { score: this.score, rank });
    }

    addScore(n) {
      this.score = Math.min(C.MAX_SCORE, this.score + n);
      while (this.score >= this.nextExtra) {
        this.nextExtra += C.EXTRA_LIFE_EVERY;
        if (this.reserve < C.MAX_LIVES) {
          this.reserve++;
          BM.Popups.add(this.player.x, this.player.y - 40, '1UP', '#8dffb0');
          BM.Audio.sfx('extra');
        }
      }
    }

    // 目前的最高分 = 排行榜第一名與本局分數取大
    get hi() { return Math.min(C.MAX_HISCORE, Math.max(this.hiBase, this.score)); }

    // ------------------------------------------------ 暫停
    pause() { this.paused = true; this.pauseIdx = 0; BM.Audio.sfx('move'); }
    onBlur() { if (!this.paused && this.state !== 'gameover') this.pause(); }

    updatePause() {
      const P = I.pressed;
      if (P.pause) { this.paused = false; return; }
      if (P.up || P.down) { this.pauseIdx = 1 - this.pauseIdx; BM.Audio.sfx('move'); }
      for (let i = 0; i < PAUSE_ITEMS.length; i++) {
        const hit = p => p && Math.abs(p.x - W / 2) < 150 && Math.abs(p.y - (470 + i * 76)) < 28;
        if (I.moved && hit(I.pointer) && this.pauseIdx !== i) { this.pauseIdx = i; BM.Audio.sfx('move'); }
        if (I.click && hit(I.click)) { this.pauseIdx = i; this.pauseChoose(); return; }
      }
      if (P.confirm) this.pauseChoose();
    }
    pauseChoose() {
      BM.Audio.sfx('select');
      if (this.pauseIdx === 0) this.paused = false;
      else BM.Game.setScene('menu');
    }

    // ------------------------------------------------ 更新
    update(dt) {
      // 觸控介面（虛擬圓盤與暫停按鈕）只在遊玩中啟用；暫停 / 遊戲結束時關閉
      BM.Touch.setMode(this.paused || this.state === 'gameover' ? 'none' : 'play');
      if (this.paused) { this.updatePause(); return; }
      if (I.pressed.pause && this.state !== 'gameover') { this.pause(); return; }

      this.time += dt;
      BM.Background.update(dt);
      this.formation.update(dt);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
      if (this.banner) { this.banner.t += dt; if (this.banner.t >= this.banner.dur) this.banner = null; }

      const p = this.player;
      if (p.alive) p.update(dt, I, this);
      else {
        p.updateFx(dt, false);                   // 殘留的噴射粒子自然消散
        if (this.respawnT > 0) {
          this.respawnT -= dt;
          if (this.respawnT <= 0) p.respawn();
        }
      }

      for (const e of this.enemies) e.update(dt, this);
      if (this.boss) this.boss.update(dt, this);

      // 陣形排好一半以上就開始出擊；玩家死亡期間不出擊
      if (this.state === 'playing' && p.alive) {
        let inForm = 0;
        for (const e of this.enemies) if (e.state === 'formation') inForm++;
        if (inForm >= 30 || this.enemies.every(e => e.state !== 'wait' && e.state !== 'enter')) {
          this.director.update(dt, this);
        }
      }

      for (const b of this.pBullets) b.update(dt);
      for (const b of this.eBullets) b.update(dt);
      this.collide();
      this.enemies = this.enemies.filter(e => !e.dead);
      this.pBullets = this.pBullets.filter(b => !b.dead);
      this.eBullets = this.eBullets.filter(b => !b.dead);
      BM.Particles.update(dt);
      BM.Popups.update(dt);

      if (this.state === 'playing' && this.enemies.length === 0) this.waveClear();
      else if (this.state === 'boss' && this.boss.done) this.bossDefeated();
      else if (this.state === 'clear') { this.stateT -= dt; if (this.stateT <= 0) this.startWave(); }
      else if (this.state === 'gameover') { this.stateT -= dt; if (this.stateT <= 0) this.finish(); }
    }

    collide() {
      const p = this.player;

      // 玩家子彈 → 敵機
      for (const b of this.pBullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (e.dead || !e.hittable) continue;
          const dx = b.x - e.x, dy = b.y - e.y, r = e.radius + b.r;
          if (dx * dx + dy * dy < r * r) { b.dead = true; this.hitEnemy(e, 1); break; }
        }
      }

      // 玩家子彈 → BOSS（爪擊護盾期間會反彈，其餘時間造成傷害）
      const bo = this.boss;
      if (bo && bo.alive && bo.state !== 'enter') {
        for (const b of this.pBullets) {
          if (b.dead) continue;
          const dx = b.x - bo.x, dy = b.y - bo.cy, d2 = dx * dx + dy * dy;
          if (bo.guarding) {
            const R = bo.guardR + b.r;
            if (d2 < R * R) this.reflectBullet(b, bo, dx, dy);
          } else {
            const R = bo.radius + b.r;
            if (d2 < R * R) {
              b.dead = true;
              this.addScore(C.BOSS.hitScore);
              BM.Audio.sfx('bossHit');
              bo.damage(1, this);
              if (!bo.alive) break;
            }
          }
        }
      }

      if (!p.alive || p.invuln > 0) return;

      // BOSS 身體衝撞 / 爪擊 → 玩家
      if (bo && bo.lethal) {
        const dx = bo.x - p.x, dy = bo.cy - p.y, r = bo.radius + p.radius - 4;
        if (dx * dx + dy * dy < r * r || bo.clawHit(p)) { this.killPlayer(); return; }
      }

      // 敵方子彈 → 玩家
      for (const b of this.eBullets) {
        if (b.dead || b.harmless) continue;
        const dx = b.x - p.x, dy = b.y - p.y, r = p.radius + b.r;
        if (dx * dx + dy * dy < r * r) { b.dead = true; this.killPlayer(); return; }
      }
      // 出擊中的敵機 → 玩家（登場、待機、返回中不會撞傷）
      for (const e of this.enemies) {
        if (e.dead || e.state !== 'attack') continue;
        const dx = e.x - p.x, dy = e.y - p.y, r = p.radius + e.radius - 2;
        if (dx * dx + dy * dy < r * r) { this.hitEnemy(e, 99, true); this.killPlayer(); return; }
      }
    }

    // crash=true：敵機撞上玩家而同歸於盡，敵機會爆炸但不算玩家擊殺，不得分
    hitEnemy(e, dmg, crash) {
      e.hp -= dmg;
      if (e.hp > 0) { e.flash = 0.12; BM.Audio.sfx('hit'); return; }
      e.dead = true;
      BM.Particles.explode(e.x, e.y, BM.Enemy.TYPES[e.type].color);
      BM.Audio.sfx('boom');
      if (crash) return;
      const pts = e.points * (e.state === 'attack' ? 2 : 1);      // 出擊中的敵機分數 ×2
      this.addScore(pts);
      BM.Popups.add(e.x, e.y - 12, String(pts), e.state === 'attack' ? '#ffe27a' : '#ffffff');
    }

    killPlayer() {
      const p = this.player;
      p.alive = false;
      BM.Particles.explode(p.x, p.y, '#ffa14a', 26);
      BM.Particles.explode(p.x, p.y, '#ffffff', 12);
      this.shake = 0.5;
      this.eBullets.length = 0;
      BM.Audio.sfx('die');
      if (this.reserve > 0) {
        this.reserve--;
        this.respawnT = C.PLAYER.respawnDelay;
      } else {
        this.state = 'gameover';
        this.stateT = 2.8;
      }
    }

    // ------------------------------------------------ 繪製
    draw(ctx) {
      const t = this.time;
      BM.Background.draw(ctx, t);
      BM.Touch.drawStick(ctx);               // 觸控虛擬搖桿圓盤畫在最底層，不會擋住戰機、敵機和子彈

      ctx.save();
      if (this.shake > 0) ctx.translate(M.rand(-1, 1) * this.shake * 14, M.rand(-1, 1) * this.shake * 14);

      // 狙擊鼠的瞄準預警線
      for (const e of this.enemies) {
        if (e.aimAngle === null || e.state !== 'attack') continue;
        ctx.save();
        ctx.strokeStyle = e.aimLocked ? 'rgba(255,60,60,0.85)' : 'rgba(255,120,120,0.4)';
        ctx.lineWidth = e.aimLocked ? 2.5 : 1.5;
        if (!e.aimLocked) ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.aimAngle) * 1100, e.y + Math.sin(e.aimAngle) * 1100);
        ctx.stroke();
        ctx.restore();
      }

      for (const e of this.enemies) e.draw(ctx, t);
      if (this.boss) this.boss.draw(ctx, t);
      for (const b of this.pBullets) b.draw(ctx);
      for (const b of this.eBullets) b.draw(ctx);
      this.player.draw(ctx, t);
      BM.Particles.draw(ctx);
      BM.Popups.draw(ctx);
      ctx.restore();

      BM.HUD.draw(ctx, { score: this.score, hi: this.hi, lives: this.reserve, wave: this.wave, boss: !!this.boss });
      if (this.boss && this.state !== 'clear') BM.HUD.drawBossBar(ctx, this.boss);
      BM.Touch.draw(ctx, this.time);          // 虛擬圓盤 + 暫停按鈕（僅觸控模式）
      this.drawBanner(ctx);
      if (this.state === 'gameover') this.drawGameOver(ctx);
      if (this.paused) this.drawPause(ctx);
    }

    drawBanner(ctx) {
      const b = this.banner;
      if (!b) return;
      const a = Math.min(1, b.t / 0.25, (b.dur - b.t) / 0.35);
      const s = 1 + (1 - Math.min(1, b.t / 0.25)) * 0.4;
      if (b.warn && !b.small) {                                    // BOSS 警告：整個畫面邊緣閃紅光
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
        g.addColorStop(0, 'rgba(255,0,0,0)');
        g.addColorStop(1, 'rgba(255,0,0,' + (0.3 + 0.25 * Math.sin(b.t * 14)) * a + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.save();
      ctx.translate(W / 2, b.small ? 300 : 215);       // 橫幅在陣形上方，不擋到敵機
      ctx.scale(s, s);
      const col = b.warn ? '#ff5d5d' : '#ffd166', edge = b.warn ? '#4a0a14' : '#5b2a86';
      D.text(ctx, b.text, 0, 0, { size: b.small ? 48 : 60, align: 'center', color: col, stroke: edge, strokeW: 10, weight: '900', family: D.NUM, alpha: a, shadow: 'rgba(255,170,70,0.8)', shadowBlur: 16 });
      if (b.sub) D.text(ctx, b.sub, 0, 56, { size: 24, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 5, weight: '900', alpha: a });
      ctx.restore();
    }

    drawGameOver(ctx) {
      const a = Math.min(1, (2.8 - this.stateT) / 0.5);
      ctx.fillStyle = 'rgba(6,8,30,' + (0.45 * a) + ')';
      ctx.fillRect(0, 0, W, H);
      D.text(ctx, 'GAME OVER', W / 2, 400, { size: 64, align: 'center', color: '#ff6b8a', stroke: '#3a0d2a', strokeW: 12, weight: '900', family: D.NUM, alpha: a });
    }

    drawPause(ctx) {
      ctx.fillStyle = 'rgba(6,8,30,0.72)';
      ctx.fillRect(0, 0, W, H);
      D.text(ctx, '暫停', W / 2, 340, { size: 76, align: 'center', color: '#ffd166', stroke: '#5b2a86', strokeW: 12, weight: '900' });
      for (let i = 0; i < PAUSE_ITEMS.length; i++) {
        D.button(ctx, PAUSE_ITEMS[i], W / 2, 470 + i * 76, 300, 56, i === this.pauseIdx, this.time + performance.now() / 1000);
      }
      D.text(ctx, BM.Touch.enabled ? '點一下選項' : 'Esc / P / Start 繼續', W / 2, 660, { size: 16, align: 'center', color: '#9fb0e8' });
    }
  }

  BM.PlayScene = PlayScene;
})(window.BM = window.BM || {});
