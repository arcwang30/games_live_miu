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

    // 波數：「WAVE」小標籤 + 大數字，靠右對齊；BOSS 波時標籤改成紅色的「BOSS WAVE」
    drawWave(ctx, wave, isBoss, xRight, y) {
      const num = String(wave);
      const numOpt = { size: 24, align: 'right', color: '#fff', stroke: '#1b1240', strokeW: 5, family: D.NUM, weight: '900' };
      D.text(ctx, num, xRight, y, numOpt);
      ctx.save();
      ctx.font = '900 24px ' + D.NUM;
      const w = ctx.measureText(num).width;      // 量出數字寬度，標籤才能貼在數字左邊
      ctx.restore();
      D.text(ctx, isBoss ? 'BOSS WAVE' : 'WAVE', xRight - w - 8, y + 2, {
        size: 14, align: 'right', color: isBoss ? '#ff6b6b' : '#8dffb0',
        stroke: '#1b1240', strokeW: 3, family: D.NUM, weight: '900', spacing: 1
      });
    },

    // BOSS 血條（畫在 HUD 下方）；66% / 33% 有階段刻度
    drawBossBar(ctx, boss) {
      const x = 70, y = 100, w = 400, h = 14;
      const k = Math.max(0, boss.hp / boss.maxHp) * boss.barK;
      const ghost = Math.max(0, boss.ghost / boss.maxHp) * boss.barK;

      D.text(ctx, BM.I18n.t('boss.name'), x, y - 12, { size: 16, color: '#ffd166', stroke: '#1b1240', strokeW: 4, weight: '900', maxW: 250 });
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

      // 右上：目前波數（BOSS 波標示紅色 BOSS）
      BM.HUD.drawWave(ctx, s.wave, s.boss, C.W - 16, 22);

      // 右上：預備戰機（在波數下方）。最多顯示 5 隻圖示；超過 5 隻時，在最左邊多一組「戰機圖 +N」（N = 超過 5 的隻數）
      const SHOW = 5, shown = Math.min(s.lives, SHOW);
      for (let i = 0; i < shown; i++) {
        BM.Sprites.draw(ctx, 'cat', C.W - 28 - i * 26, 58, 0, 0.42);
      }
      if (s.lives > SHOW) {
        const label = '+' + (s.lives - SHOW);
        ctx.save();
        ctx.font = '900 20px ' + D.NUM;
        const tw = ctx.measureText(label).width;
        ctx.restore();
        const xr = C.W - 28 - (SHOW - 1) * 26 - 15;            // 這組的右緣：緊貼第 5 隻圖示的左邊
        D.text(ctx, label, xr, 59, { size: 20, align: 'right', color: '#ffd166', stroke: '#1b1240', strokeW: 4, family: D.NUM, weight: '900' });
        BM.Sprites.draw(ctx, 'cat', xr - tw - 14, 58, 0, 0.42);
      }
    }
  };
})(window.BM = window.BM || {});
