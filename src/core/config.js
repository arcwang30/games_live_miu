// 遊戲全域設定。所有模組都掛在 window.BM 命名空間底下。
(function (BM) {
  BM.CONFIG = {
    W: 540,            // 邏輯解析度（9:16 直式）
    H: 960,
    HUD_H: 84,

    MAX_SCORE: 9999999,      // 積分最高 7 位數
    MAX_HISCORE: 99999999,   // 排行榜最高 8 位數
    START_LIVES: 3,          // 預備戰機數（不含畫面中的那一台）
    MAX_LIVES: 5,
    EXTRA_LIFE_EVERY: 30000, // 每 3 萬分加一台

    PLAYER: {
      startX: 270, startY: 880,
      speed: 340,
      minX: 26, maxX: 514, minY: 690, maxY: 900,   // 玩家活動範圍（畫面最下方）
      fireDelay: 0.18,       // 連發間隔（秒），每次射出左右兩發
      bulletSpeed: 760,
      maxBullets: 20,
      radius: 8,
      respawnDelay: 1.7,
      invuln: 2.4
    },

    // 敵機待機陣形：15 欄 × 5 列，位於畫面中間 1/3（y 320~640）
    FORMATION: { cols: 15, rows: 5, cx: 270, baseY: 390, spacingX: 31, spacingY: 40, swayAmp: 16 },

    ENEMY: { radius: 11, bulletRadius: 5, enterDur: 1.75 },

    // BOSS「流氓大老鼠」：每 EVERY 波出現一次（第 3、6、9… 波）
    BOSS: {
      EVERY: 3,
      hpBase: 200, hpPerLevel: 70, hpMax: 520,   // 血量：第 1 隻 200，之後每隻 +70，上限 520
      radius: 64,             // 身體判定圓
      homeY: 250,             // 待機高度
      idle: 1.3,              // 兩次攻擊之間的間隔（秒）
      guardRadius: 100,       // 爪擊時的反彈護盾半徑
      poopSpeed: 185,         // 便便彈速度
      cheeseSpeed: 540,       // 起司速度（快）
      clawIn: 50, clawOut: 250, clawSweep: 0.5, clawHalf: 0.36,   // 爪擊扇形（弧度）
      hitScore: 10,           // 每打中一發的分數
      killBonus: 10000,       // 擊破獎勵 ×BOSS 等級
      deathTime: 4.2          // 厭世死亡演出長度（秒）
    }
  };
})(window.BM = window.BM || {});
