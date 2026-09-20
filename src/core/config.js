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
      touchSpeed: 1200,      // 觸控：戰機飛向手指定點的最高速度（像素/秒）；點新位置會以這個速度快速飛過去
      touchFollow: 14,       // 觸控：追蹤係數（越大越貼手指），誤差 × 係數 = 速度，上限為 touchSpeed
      minX: 26, maxX: 514, minY: 690, maxY: 900,   // 玩家活動範圍（畫面最下方）
      fireDelay: 0.22,       // 連發間隔（秒），每次射出左右兩發（原 0.18，調慢約 18%）
      bulletSpeed: 700,      // 子彈飛行速度（原 760，調慢約 8%）
      maxBullets: 20,
      radius: 8,
      respawnDelay: 1.7,
      invuln: 2.4
    },

    // 敵機待機陣形：15 欄，位於畫面中間 1/3（y 320~640）。列數隨波數增加：
    // 第 n 個一般波（BOSS 波不計）的敵機數 = min(maxCount, startCount + perWave × (n-1))
    // → 45、55、65、75（=標準 15×5）、85、90（6 列上限）。最後一列不滿時置中。
    FORMATION: { cols: 15, cx: 270, baseY: 325, spacingX: 31, spacingY: 40, swayAmp: 16,
                 startCount: 45, perWave: 10, maxCount: 90 },

    ENEMY: { radius: 11, bulletRadius: 5 },

    // 起司月亮：背景的月亮是一塊有洞的起司，老鼠從洞裡噴出來進場。holes 是洞的位置（相對月亮中心）與大小
    MOON: {
      x: 440, y: 170, r: 36,
      holes: [
        { x: -12, y: -8, r: 7 }, { x: 10, y: -14, r: 5 }, { x: 4, y: 12, r: 8 },
        { x: -14, y: 14, r: 4.5 }, { x: 17, y: 2, r: 4 }
      ]
    },

    // 敵機進場：先等月亮抖動 startDelay 秒，之後每隻間隔 spacing 秒噴出
    ENTRANCE: { startDelay: 0.9, spacing: 0.038 },

    // BOSS「流氓大老鼠」：每 EVERY 波出現一次（第 5、10、15… 波）
    BOSS: {
      EVERY: 5,
      hpBase: 160, hpPerLevel: 55, hpMax: 420,   // 血量：第 1 隻 160，之後每隻 +55，上限 420（配合射速調慢後下修，戰鬥約 70 秒）
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
