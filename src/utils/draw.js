// 常用繪圖小工具（文字、圓角矩形、按鈕）
(function (BM) {
  // 中文字型在前；日文字型排在後面（日文假名 / 日文漢字缺字時會自動使用）
  const CJK = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC","Yu Gothic UI","Meiryo","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';
  const NUM = '"Courier New",Consolas,"Liberation Mono",monospace';

  const Draw = BM.Draw = {
    CJK, NUM,

    // 選項 maxW：文字超過這個寬度時自動縮小字級（多語系文字長度不一，避免超出版面）
    text(ctx, str, x, y, o) {
      o = o || {};
      ctx.save();
      let size = o.size || 20;
      const fontOf = s => (o.weight || '700') + ' ' + s + 'px ' + (o.family || CJK);
      ctx.font = fontOf(size);
      if (o.maxW) {
        const w = ctx.measureText(str).width;
        if (w > o.maxW) { size = Math.max(9, size * o.maxW / w); ctx.font = fontOf(size); }
      }
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'middle';
      if (o.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = o.spacing + 'px';
      if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
      if (o.stroke) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = o.strokeW || 4;
        ctx.strokeStyle = o.stroke;
        ctx.strokeText(str, x, y);
      }
      if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 10; }
      ctx.fillStyle = o.color || '#fff';
      ctx.fillText(str, x, y);
      ctx.restore();
    },

    // 依寬度斷行：有空白的（英文）依單字斷，沒有空白的（中日文）逐字斷
    wrap(ctx, str, maxW, size, weight) {
      ctx.save();
      ctx.font = (weight || '700') + ' ' + size + 'px ' + CJK;
      const spaced = str.indexOf(' ') >= 0;
      const parts = spaced ? str.split(' ') : Array.from(str), sep = spaced ? ' ' : '';
      const lines = [];
      let cur = '';
      for (const p of parts) {
        const test = cur ? cur + sep + p : p;
        if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = p; } else cur = test;
      }
      if (cur) lines.push(cur);
      ctx.restore();
      return lines;
    },

    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    // 選單按鈕；selected 時放大、變橘色
    button(ctx, label, cx, cy, w, h, selected, t) {
      const pulse = selected ? 1 + Math.sin(t * 8) * 0.02 : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      Draw.roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      if (selected) {
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, '#ffd166');
        g.addColorStop(1, '#ff8c42');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(255,170,70,0.8)';
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = selected ? '#fff3d6' : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      Draw.text(ctx, label, 0, 2, {
        size: 26, align: 'center', color: selected ? '#3a1d0a' : '#dfe6ff', weight: '800', maxW: w - 90
      });
      if (selected) {
        Draw.text(ctx, '▶', -w / 2 + 26, 2, { size: 18, align: 'center', color: '#3a1d0a' });
        Draw.text(ctx, '◀', w / 2 - 26, 2, { size: 18, align: 'center', color: '#3a1d0a' });
      }
      ctx.restore();
    }
  };
})(window.BM = window.BM || {});
