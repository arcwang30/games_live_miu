// 敵機進場隊形：老鼠從「起司月亮」的洞噴出，沿著該波的隊形路線飛到自己的陣形位置。
// 依「一般波」序號輪替 5 種隊形（BOSS 波不計入）：
//   0 弧線俯衝  從月亮橫掃過上半畫面，再從下方彎回陣形
//   1 大迴圈    繞畫面上半部一整圈大圓，再俯衝入陣形
//   2 S 蛇行    一路左右蛇行、先俯衝到畫面下方再爬升就位
//   3 螺旋展開  先飛到陣形中央，再由中央螺旋展開到各自位置
//   4 雙側交叉  左半邊的位置繞右側、右半邊的位置繞左側，在陣形下方交叉成 X 形
//
// 每個隊形的 pos(u, p0, s) 回傳進度 u（0~1）時的位置：p0 = 月亮上的出發洞口，s = 目前的陣形位置（陣形會左右搖擺，所以每格重新算）。
(function (BM) {
  const C = BM.CONFIG, M = BM.M, MOON = C.MOON, TAU = M.TAU;
  const bez = M.bezier;

  const PATTERNS = [
    {
      name: '弧線俯衝', dur: 1.9,
      pos(u, p0, s) {
        return bez(p0, { x: 30, y: 260 }, { x: s.x, y: s.y + 220 }, s, u);
      }
    },
    {
      name: '大迴圈', dur: 3.2,
      pos(u, p0, s) {
        const cx = 270, cy = 300, dx0 = p0.x - cx, dy0 = p0.y - cy;
        const R = Math.hypot(dx0, dy0), a0 = Math.atan2(dy0, dx0), US = 0.64;
        if (u < US) {                                            // 前段：以月亮為起點繞圓一整圈（順時針）
          const a = a0 + TAU * (u / US);
          return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
        }
        return bez(p0, { x: p0.x - 40, y: p0.y + 220 }, { x: s.x, y: s.y + 160 }, s, (u - US) / (1 - US));   // 後段：回到月亮位置後俯衝就位
      }
    },
    {
      name: 'S 蛇行', dur: 2.6,
      pos(u, p0, s) {
        const k = M.easeInOutSine(u);
        return {
          x: M.lerp(p0.x, s.x, k) + 150 * Math.sin(3 * Math.PI * u) * (1 - 0.4 * u),
          y: M.lerp(p0.y, s.y, u) + 340 * Math.sin(Math.PI * u)
        };
      }
    },
    {
      name: '螺旋展開', dur: 2.8,
      pos(u, p0, s) {
        const cx = 270, cy = 430, US = 0.4;
        if (u < US) return bez(p0, { x: p0.x + 30, y: p0.y + 160 }, { x: cx + 150, y: cy - 130 }, { x: cx, y: cy }, u / US);
        const v = (u - US) / (1 - US);
        const dx = s.x - cx, dy = s.y - cy;
        const r = Math.hypot(dx, dy) * v;                         // 半徑由 0 線性長到目標位置
        const a = Math.atan2(dy, dx) - TAU * 1.25 * (1 - v) * (1 - v);   // 一又四分之一圈；越接近終點轉得越慢，最後剛好對準位置（避免尾段半徑大時速度爆衝）
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      }
    },
    {
      name: '雙側交叉', dur: 2.4,
      pos(u, p0, s) {
        const viaRight = s.x < 270;                               // 左半邊的位置繞右側、右半邊的位置繞左側 → 在下方交叉成 X
        const p1 = viaRight ? { x: 640, y: 420 } : { x: -110, y: 300 };
        const p2 = { x: s.x + (viaRight ? 100 : -100), y: s.y + 260 };
        return bez(p0, p1, p2, s, u);
      }
    }
  ];

  BM.Entrance = {
    PATTERNS,
    // 第 n 個一般波使用的隊形編號
    patternFor(n) { return (n - 1) % PATTERNS.length; },
    // 從月亮的某個洞口出發（隨機挑洞、加一點抖動）
    spawnPoint() {
      const h = M.pick(MOON.holes.slice(0, 3));
      return { x: MOON.x + h.x + M.rand(-2, 2), y: MOON.y + h.y + M.rand(-2, 2) };
    }
  };
})(window.BM = window.BM || {});
