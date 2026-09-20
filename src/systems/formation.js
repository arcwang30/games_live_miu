// 敵機待機陣形：15 欄 × 5 列，位於畫面中間 1/3。
// 整個陣形左右輕微搖擺、呼吸般伸縮（經典小蜜蜂風格）。
(function (BM) {
  const F = BM.CONFIG.FORMATION;

  BM.Formation = {
    time: 0,
    reset() { this.time = 0; },
    update(dt) { this.time += dt; },

    // 回傳 (col,row) 這格此刻的位置
    slot(col, row) {
      const t = this.time;
      const breath = 1 + 0.05 * Math.sin(t * 1.1);
      return {
        x: F.cx + (col - (F.cols - 1) / 2) * F.spacingX * breath + Math.sin(t * 0.7) * F.swayAmp,
        y: F.baseY + row * F.spacingY + Math.sin(t * 2.2 + col * 0.5) * 2.2
      };
    }
  };
})(window.BM = window.BM || {});
