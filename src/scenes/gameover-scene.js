// 結算畫面：顯示本局成績與前 5 名排行榜
(function (BM) {
  const C = BM.CONFIG, W = C.W, M = BM.M, D = BM.Draw, I = BM.Input;

  const ITEMS = ['再玩一次', '回主選單'];
  const BTN = { w: 300, h: 56, y0: 770, gap: 76 };

  class GameOverScene {
    enter(params) {
      this.score = (params && params.score) || 0;
      this.rank = params && params.rank !== undefined ? params.rank : -1;
      this.idx = 0;
      this.t = 0;
      BM.Audio.stopMusic();
      BM.Audio.sfx('over');
    }
    exit() {}

    btnY(i) { return BTN.y0 + i * BTN.gap; }

    choose(i) {
      BM.Audio.sfx('select');
      BM.Game.setScene(i === 0 ? 'play' : 'menu');
    }

    update(dt) {
      this.t += dt;
      BM.Background.update(dt);
      const P = I.pressed;
      if (this.t < 0.6) return;                       // 避免玩家還在狂按射擊鍵時直接誤觸選項
      if (P.up || P.down) { this.idx = 1 - this.idx; BM.Audio.sfx('move'); }
      for (let i = 0; i < ITEMS.length; i++) {
        const hit = p => p && Math.abs(p.x - W / 2) < BTN.w / 2 && Math.abs(p.y - this.btnY(i)) < BTN.h / 2;
        if (I.moved && hit(I.pointer) && this.idx !== i) { this.idx = i; BM.Audio.sfx('move'); }
        if (I.click && hit(I.click)) { this.choose(i); return; }
      }
      if (P.confirm) this.choose(this.idx);
      else if (P.back) this.choose(1);
    }

    draw(ctx) {
      const t = this.t;
      BM.Background.draw(ctx, t);
      ctx.fillStyle = 'rgba(6,8,30,0.55)';
      ctx.fillRect(0, 0, W, C.H);

      D.text(ctx, 'GAME OVER', W / 2, 150, { size: 68, align: 'center', color: '#ff6b8a', stroke: '#3a0d2a', strokeW: 12, weight: '900', family: D.NUM, shadow: 'rgba(255,80,120,0.8)', shadowBlur: 20 });
      D.text(ctx, '老鼠入侵了…喵嗚', W / 2, 212, { size: 22, align: 'center', color: '#dfe6ff' });

      D.text(ctx, 'YOUR SCORE', W / 2, 272, { size: 18, align: 'center', color: '#ffd166', family: D.NUM, weight: '900', spacing: 2 });
      D.text(ctx, M.pad(this.score, 7), W / 2, 322, { size: 56, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 8, family: D.NUM, weight: '900' });

      let msg = '';
      if (this.rank === 0) msg = '★ 新的最高紀錄！ ★';
      else if (this.rank > 0 && this.rank < 5) msg = '第 ' + (this.rank + 1) + ' 名！進入排行榜';
      if (msg) D.text(ctx, msg, W / 2, 372, { size: 24, align: 'center', color: '#ffe27a', stroke: '#3a2a00', strokeW: 5, weight: '900', alpha: 0.75 + 0.25 * Math.sin(t * 6) });

      // 前 5 名
      const list = BM.Storage.list().slice(0, 5);
      D.text(ctx, '— 排行榜 —', W / 2, 425, { size: 20, align: 'center', color: '#bcd0ff', weight: '900' });
      for (let i = 0; i < 5; i++) {
        const y = 470 + i * 46, e = list[i], me = i === this.rank;
        if (me) {
          ctx.fillStyle = 'rgba(255,209,102,0.22)';
          D.roundRect(ctx, 90, y - 20, W - 180, 40, 12); ctx.fill();
        }
        D.text(ctx, (i + 1) + '.', 120, y, { size: 24, color: me ? '#ffd166' : '#9fb0e8', family: D.NUM, weight: '900' });
        D.text(ctx, e ? M.pad(e.score, 8) : '--------', 170, y, { size: 26, color: e ? (me ? '#fff3c4' : '#fff') : '#5b688f', family: D.NUM, weight: '900' });
        if (e) D.text(ctx, e.date, W - 120, y, { size: 14, align: 'right', color: '#9fb0e8', family: D.NUM });
      }

      for (let i = 0; i < ITEMS.length; i++) {
        D.button(ctx, ITEMS[i], W / 2, this.btnY(i), BTN.w, BTN.h, i === this.idx, t);
      }
    }
  }

  BM.GameOverScene = GameOverScene;
})(window.BM = window.BM || {});
