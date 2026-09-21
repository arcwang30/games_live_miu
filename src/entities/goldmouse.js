// 金必鼠：稀有的加分鼠。跟小兵鼠一樣大，身上有金色、紅色、白色。
//   - 不在陣形裡，也不會攻擊；從畫面左右其中一側飛進來，在畫面最上方的一塊範圍（GOLD.zone）徘徊，絕對不會往下飛
//   - 徘徊方式：在範圍內一站一站地飛（S 形蛇行）——時快時慢，偶爾突然急衝，每到一站會短暫停住懸浮；
//     55% 的機率會挑「正下方沒有小兵擋住」的位置（因為陣形會擋子彈，這樣玩家才有機會打到），剩下的隨機
//   - 徘徊 GOLD.stay（30）秒（時間快到時閃爍提醒），時間到就往上方斜角飛走；小兵被清光（過關）後還會多留過關橫幅那 2.8 秒讓玩家補打，下一波開始時才飛走
//   - 要打中 GOLD.hp（11）發才會爆炸；擊落 → 高分 + 多一台預備機（已滿時改給額外分數）
// 出現的機率與時機由 PlayScene.planGold() 決定。
(function (BM) {
  const C = BM.CONFIG, G = C.GOLD, Z = G.zone, M = BM.M, W = C.W;

  class GoldMouse {
    constructor(w) {
      this.side = Math.random() < 0.5 ? -1 : 1;                    // 從哪一側飛進來
      this.x = this.side < 0 ? -40 : W + 40;
      this.y = M.rand(Z.y0, Z.y1);
      this.vx = 0; this.vy = 0;
      this.radius = C.ENEMY.radius;
      this.hp = this.maxHp = G.hp;
      this.hits = 0;
      this.state = 'enter';                                        // enter 飛入 → roam 徘徊 → leave 飛走
      this.t = 0;
      this.life = G.stay;                                          // 剩餘徘徊時間（秒）
      this.pause = 0;                                              // 在一站停住懸浮的剩餘時間
      this.vmax = G.speed;
      this.tilt = 0;
      this.flash = 0;
      this.dead = false; this.gone = false;
      this.sparkT = 0;
      this.pickWaypoint(w, true);
      BM.Particles.sparkle(this.x, this.y, '#ffe27a', 6);
    }

    get hittable() { return !this.dead && !this.gone && this.y > -16; }

    // 挑下一個要去的地方（都在 zone 範圍內）
    pickWaypoint(w, first) {
      let best = null, bestScore = -1e9;
      const wantLane = Math.random() < 0.55;                       // 這一站想找「正下方沒人擋」的位置
      for (let i = 0; i < 6; i++) {
        const x = first ? (this.side < 0 ? M.rand(W * 0.5, Z.x1) : M.rand(Z.x0, W * 0.5)) : M.rand(Z.x0, Z.x1);
        const y = M.rand(Z.y0, Z.y1);
        let s = Math.abs(x - this.x) + M.rand(0, 80);              // 喜歡飛得遠一點（才有大範圍的蛇行）
        if (wantLane && this.laneOpen(w, x, y)) s += 160;
        if (s > bestScore) { bestScore = s; best = { x, y }; }
      }
      this.tx = best.x; this.ty = best.y;
      this.vmax = first ? 300 : (Math.random() < 0.3 ? G.dash : G.speed * M.rand(0.7, 1.1));   // 30% 的機率急衝
    }

    // x 位置正下方有沒有小兵擋著（有擋著的話玩家的子彈會先打到小兵）
    laneOpen(w, x, y) {
      for (const e of w.enemies) if (!e.dead && e.state !== 'wait' && e.y > y && Math.abs(e.x - x) < 20) return false;
      return true;
    }

    // 時間到 / 過關：往上方斜角飛走
    leave() {
      if (this.state === 'leave' || this.dead || this.gone) return;
      this.state = 'leave';
      this.leaveDir = this.x < W / 2 ? -1 : 1;
      BM.Audio.sfx('goldOut');
    }

    update(dt, w) {
      if (this.dead || this.gone) return;
      this.t += dt;
      if (this.flash > 0) this.flash -= dt;

      if (this.state === 'leave') {
        this.vy -= 900 * dt; this.vx += this.leaveDir * 500 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.y < -50 || this.x < -60 || this.x > W + 60) this.gone = true;
      } else {
        if (this.state === 'roam') {
          this.life -= dt;
          if (this.life <= 0) { this.leave(); return; }
        }
        if (this.pause > 0) {                                      // 在一站停住懸浮
          this.pause -= dt;
          this.vx += (0 - this.vx) * Math.min(1, 7 * dt); this.vy += (0 - this.vy) * Math.min(1, 7 * dt);
          if (this.pause <= 0) this.pickWaypoint(w, false);
        } else {
          const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy) || 1;
          const want = Math.min(this.vmax, d * 4);                 // 快到站時自然減速
          this.vx += (dx / d * want - this.vx) * Math.min(1, 6 * dt);
          this.vy += (dy / d * want - this.vy) * Math.min(1, 6 * dt);
          if (d < 6) this.pause = M.rand(0.15, 0.65);
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.state === 'enter' && this.x > Z.x0 && this.x < Z.x1) this.state = 'roam';    // 進到範圍內才開始計時
        if (this.state === 'roam') {                               // 絕對不會離開範圍（尤其不會往下）
          this.x = M.clamp(this.x, Z.x0 - 6, Z.x1 + 6);
          this.y = M.clamp(this.y, Z.y0 - 6, Z.y1);
        }
      }
      this.tilt += (M.clamp(this.vx / 420, -0.45, 0.45) - this.tilt) * Math.min(1, 8 * dt);

      this.sparkT -= dt;                                           // 閃閃發光
      if (this.sparkT <= 0) {
        this.sparkT = 0.11;
        BM.Particles.sparkle(this.x + M.rand(-13, 13), this.y + M.rand(-13, 13), Math.random() < 0.5 ? '#ffe27a' : '#ffffff', 1);
      }
    }

    draw(ctx, t) {
      if (this.gone) return;
      const warn = this.state === 'roam' && this.life < 3;         // 快要飛走：閃爍提醒
      const alpha = warn ? 0.45 + 0.55 * (Math.sin(t * 22) > 0 ? 1 : 0) : 1;
      const bob = Math.sin(this.t * 6) * 3;

      ctx.save();
      const pulse = 0.32 + 0.14 * Math.sin(t * 8);                 // 金色光暈
      const gr = ctx.createRadialGradient(this.x, this.y + bob, 4, this.x, this.y + bob, 34);
      gr.addColorStop(0, 'rgba(255,215,80,' + pulse + ')'); gr.addColorStop(1, 'rgba(255,215,80,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(this.x, this.y + bob, 34, 0, M.TAU); ctx.fill();
      ctx.restore();

      BM.Sprites.draw(ctx, 'mouseGold' + (this.flash > 0 ? '_hit' : ''), this.x, this.y + bob, this.tilt, 1, alpha);

      // 血條：11 格，剩幾發一目了然
      const bw = 36, bh = 5, bx = this.x - bw / 2, by = this.y + bob - 26;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(20,10,0,0.65)'; ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
      const k = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = k > 0.5 ? '#ffd23f' : k > 0.25 ? '#ff9a3c' : '#ff4d4d';
      ctx.fillRect(bx, by, bw * k, bh);
      ctx.strokeStyle = 'rgba(20,10,0,0.7)'; ctx.lineWidth = 1;
      for (let i = 1; i < this.maxHp; i++) { const sx = bx + bw * i / this.maxHp; ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by + bh); ctx.stroke(); }
      ctx.restore();
    }
  }

  BM.GoldMouse = GoldMouse;
})(window.BM = window.BM || {});
