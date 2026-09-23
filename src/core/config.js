// 遊戲全域設定。所有模組都掛在 window.BM 命名空間底下。
(function (BM) {
  BM.CONFIG = {
    // 版本號：每次發佈都要和 index.html 裡的 BM_INDEX_VERSION（以及 <script src="...?v=">）一起更新。
    // 兩邊不一致代表有檔案沒更新到，遊戲會直接在畫面上提醒。
    VERSION: '2026.09.24h',

    W: 540,            // 邏輯解析度（9:16 直式）
    H: 960,
    HUD_H: 84,

    MAX_SCORE: 9999999,      // 積分最高 7 位數
    MAX_HISCORE: 99999999,   // 排行榜最高 8 位數
    START_LIVES: 3,          // 預備戰機數（不含畫面中的那一台）
    MAX_LIVES: 9,            // 預備機數上限（HUD 最多畫 5 隻圖示，超過 5 隻改用「戰機圖 +隻數」顯示）
    EXTRA_LIFE_UNIT: 15000,  // 加命門檻遞增：第 n 台在 UNIT × n × (n+1) 分（3 萬、9 萬、18 萬、30 萬、45 萬…）

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

    // 外部連結
    LINKS: { fanPage: 'https://www.facebook.com/profile.php?id=61594197187795' },   // 「關於Arc遊戲庫」頁的粉絲團

    // 金必鼠：稀有加分鼠（不在陣形裡、不攻擊）。在畫面最上方的 zone 範圍徘徊 stay 秒後飛走；要打中 hp 發才會爆炸。
    // 出現機率：第 firstWave 波起，每個一般波 chance；連續沒出現，每波再加 chanceStep（上限 chanceMax）；BOSS 波不出現。出現時間 = 該波開始後 appear 秒
    GOLD: {
      hp: 11,                              // 打中 11 發才會爆炸（「超過 10 發」）
      points: 3000, capBonus: 2000,        // 擊落得分；預備機已滿時改給的額外分數
      stay: 30,                            // 徘徊秒數（從飛進範圍開始算）
      firstWave: 3, chance: 0.10, chanceStep: 0.03, chanceMax: 0.30,
      appear: [7, 16],
      zone: { x0: 50, x1: 490, y0: 175, y1: 290 },   // 徘徊範圍（陣形上緣 y≈314，所以不會往下飛進陣形）
      speed: 210, dash: 380                // 一般 / 急衝的最高速度（像素/秒）
    },

    // 起司月亮：背景的月亮是一塊有洞的起司，老鼠從洞裡噴出來進場。holes 是洞的位置（相對月亮中心）與大小
    MOON: {
      x: 440, y: 170, r: 36,
      holes: [
        { x: -12, y: -8, r: 7 }, { x: 10, y: -14, r: 5 }, { x: 4, y: 12, r: 8 },
        { x: -14, y: 14, r: 4.5 }, { x: 17, y: 2, r: 4 }
      ]
    },

    // 晝夜變化：每 every 個波段換一次，依 order 循環（第 1~5 波白天、6~10 黃昏、11~15 黑夜、16~20 又回到白天…）。
    // 打敗 BOSS（每 5 波的最後一波）後開始轉場，轉場約 transition 秒。
    DAYNIGHT: { every: 5, order: ['day', 'dusk', 'night'], transition: 5 },

    // 敵機進場：先等月亮抖動 startDelay 秒，之後每隻間隔 spacing 秒噴出
    ENTRANCE: { startDelay: 0.9, spacing: 0.038 },

    // BOSS「流氓大老鼠」：每 EVERY 波出現一次（第 5、10、15… 波）
    BOSS: {
      EVERY: 5,
      hpBase: 130, hpPerLevel: 45, hpMax: 340,   // 血量：第 1 隻 130，之後每隻 +45，上限 340（使用者回報所有 BOSS 血量再調低一些，原本 160/55/420 整體下修約 20%）
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
    },

    // BOSS「桐生爹鼠」：硬派西裝流氓，和「流氓大老鼠」交替出現（EVERY 的偶數次，也就是第 10、20、30…波）。
    // 血量 / 動作與子彈速度倍率沿用上面 BOSS 的等級曲線；這裡只放這隻專屬的攻擊數值。
    BOSS2: {
      radius: 64, homeY: 250,           // 跟流氓大老鼠同尺寸、同待機高度
      idle: 1.3,
      moonSpeed: 510,                   // 揮刀：半月形弧光往畫面下方飛的速度（原本 340，使用者要求再快 0.5 倍）
      punchReach: 150, punchHitR: 50, punchGap: 0.16,   // 百裂拳：拳頭最遠能伸出多遠（超過這個距離就搆不到鎖定的區塊，等於伸到底也只到 +80 的上限）、拳頭判定半徑、兩拳間隔（秒，未乘等級倍率前）
      coneSpeed: 460, coneShardSpeed: 280, coneSplitDelay: 0.42, coneShards: 5,  // 三角錐攻擊：小刀速度／碎片速度／飛行多久後炸開／碎片數
      // 「極！」：以 BOSS 為中心朝外螺旋狀連續射出多發「極」字子彈（玩家要真的碰到才會麻痺，不是範圍攻擊）：
      // 蓄力／子彈飛行速度／麻痺秒數（完全無法移動，卡一下的感覺）／每發之間轉的角度／每發之間的間隔秒數
      shout: { charge: 0.5, speed: 440, stunTime: 0.3, spiralStep: 0.5, spiralGap: 0.055 }
    },

    // BOSS「狠蘭達鼠」：阿修羅造型的四臂法師，是全遊戲最強的 FINAL BOSS，跟另外兩隻交替出現（EVERY 的第 3 輪，也就是第 15、30、45…波）。
    // 身體大小、待機高度沿用上面 BOSS 的 radius / homeY（純法術系、沒有近戰，所以不需要 claw/punch 那些數值）；
    // 血量在共用等級曲線上再乘 hpMul 加成，attack 節奏比另外兩隻快（idle 更短），4 招分別對應四隻手的法器：劍（十字斬）／三叉戟（貫穿齊射）／法鈴（滿圈音波）／法輪（迴旋弧線）。
    BOSS3: {
      hpMul: 1.25,             // 血量再乘 1.25 倍（在 boss.js 另外 clamp 到上限 450 + 輪次加成），全場最硬
      idle: 0.95,              // 攻擊間隔比另外兩隻（1.3）短，出招更密集
      bladeSpan: 1.1,          // 十字斬：每輪扇形涵蓋的弧度
      bladeSpeed: 480,         // 光刃飛行速度
      tridentSpeed: 560, tridentGap: 0.32,     // 三叉戟：貫穿彈速度／每組三連發的間隔
      bellRings: 2, bellSpeed: 300, bellRingGap: 0.5,   // 法鈴：基礎圈數（依 phase／出場次數再加，見 boss.js）／音波珠速度／每圈間隔
      wheelSpeed: 340, wheelSpread: 0.5        // 法輪：飛行速度／一開始偏離瞄準角多少弧度（實際轉彎角速度由 boss.js 用切線-弦幾何關係反推，讓弧線精準繞回玩家）
    },

    // 狠蘭達鼠擊敗後的謝幕演出：起司星球爆炸消失又重新出現，我方飛機同步表演無限符號軌跡（見 play-scene.js 的 startFinale/updateFinale）
    FINALE: {
      explode: 4.0, fadeOut: 0.4, burstGap: 0.35,   // 星球持續爆炸幾秒（最後 fadeOut 秒淡出消失）／爆炸特效間隔
      gap: 3.0,                                      // 星球消失後，維持空無一物幾秒
      reappear: 2.0,                                 // 星球從無到完全出現的淡入時間
      flyOff: 0.9, flyIn: 1.1,                        // 我方飛機衝出畫面上方／從下方飛回起始位置各需要的時間
      loops: 2.5                                      // 無限符號軌跡演出繞幾圈（0.5 的倍數，結尾才會剛好繞回畫面中心）
    }
  };
})(window.BM = window.BM || {});
