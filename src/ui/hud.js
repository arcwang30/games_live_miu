// 遊戲畫面上方的 HUD：
//   左上 = 玩家積分（7 位數）　中上 = 最高積分（8 位數）　右上 = 剩餘戰機（預備機）
(function (BM) {
  const C = BM.CONFIG, D = BM.Draw, M = BM.M;

  BM.HUD = {
    // 只畫「最高積分」（主選單也會用）
    drawHi(ctx, hi, x, y) {
      D.text(ctx, 'HI-SCORE', x, y, { size: 15, align: 'center', color: '#ff9ecb', stroke: '#1b1240', strokeW: 3, family: D.NUM, weight: '900', spacing: 1 });
      D.text(ctx, M.pad(Math.min(hi, C.MAX_HISCORE), 8), x, y + 28, { size: 26, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 5, family: D.NUM, weight: '900' });
    },

    // BOSS 血條（畫在 HUD 下方）；66% / 33% 有階段刻度
    drawBossBar(ctx, boss) {
      const x = 70, y = 100, w = 400, h = 14;
      const k = Math.max(0, boss.hp / boss.maxHp) * boss.barK;
      const ghost = Math.max(0, boss.ghost / boss.maxHp) * boss.barK;

      D.text(ctx, '流氓大老鼠', x, y - 12, { size: 16, color: '#ffd166', stroke: '#1b1240', strokeW: 4, weight: '900' });
      D.text(ctx, 'BOSS LV.' + boss.level, x + w, y - 12, { size: 14, align: 'right', color: '#ff9ecb', stroke: '#1b1240', strokeW: 4, family: D.NUM, weight: '900' });

      ctx.save();
      D.roundRect(ctx, x, y, w, h, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';                       // 殘影
      ctx.fillRect(x, y, w * ghost, h);
      const r = boss.hp / boss.maxHp;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      if (r > 0.66) { g.addColorStop(0, '#8dffa8'); g.addColorStop(1, '#2fbf5a'); }
      else if (r > 0.33) { g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#f0a020'); }
      else { g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#d92b2b'); }
      ctx.fillStyle = boss.flash > 0 ? '#ffffff' : g;
      ctx.fillRect(x, y, w * k, h);
      ctx.restore();

      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2;
      for (const m of [0.33, 0.66]) { ctx.beginPath(); ctx.moveTo(x + w * m, y); ctx.lineTo(x + w * m, y + h); ctx.stroke(); }
      D.roundRect(ctx, x, y, w, h, 7);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    },

    draw(ctx, s) {
      // 上方半透明底條
      const g = ctx.createLinearGradient(0, 0, 0, C.HUD_H);
      g.addColorStop(0, 'rgba(6,8,30,0.72)');
      g.addColorStop(1, 'rgba(6,8,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, C.W, C.HUD_H);

      // 左上：積分
      D.text(ctx, 'SCORE', 16, 22, { size: 15, color: '#ffd166', stroke: '#1b1240', strokeW: 3, family: D.NUM, weight: '900', spacing: 1 });
      D.text(ctx, M.pad(Math.min(s.score, C.MAX_SCORE), 7), 16, 50, { size: 26, color: '#fff', stroke: '#1b1240', strokeW: 5, family: D.NUM, weight: '900' });

      // 中上：最高積分排行榜第一名
      BM.HUD.drawHi(ctx, s.hi, C.W / 2, 22);

      // 右上：預備戰機
      D.text(ctx, 'LIVES', C.W - 16, 22, { size: 15, align: 'right', color: '#7fe9ff', stroke: '#1b1240', strokeW: 3, family: D.NUM, weight: '900', spacing: 1 });
      for (let i = 0; i < s.lives; i++) {
        BM.Sprites.draw(ctx, 'cat', C.W - 28 - i * 26, 54, 0, 0.42);
      }
    }
  };
})(window.BM = window.BM || {});
