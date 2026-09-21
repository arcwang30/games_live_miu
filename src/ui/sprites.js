// 所有圖像都用 Canvas 程式繪製後預先渲染成貼圖（不需要圖檔）。
// 老鼠敵機貼圖朝「下」（面向玩家）；貓咪戰機朝「上」。
(function (BM) {
  const D = 3;               // 貼圖像素密度（高解析螢幕也清晰）
  const TAU = Math.PI * 2;
  const store = {};

  function make(name, w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w * D; c.height = h * D;
    const g = c.getContext('2d');
    g.scale(D, D);
    g.translate(w / 2, h / 2);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    fn(g);
    store[name] = { c, w, h };
  }

  // 受擊閃白版本
  function makeFlash(name) {
    const s = store[name];
    const c = document.createElement('canvas');
    c.width = s.c.width; c.height = s.c.height;
    const g = c.getContext('2d');
    g.drawImage(s.c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, 0, c.width, c.height);
    store[name + '_hit'] = { c, w: s.w, h: s.h };
  }

  // 把白色貼圖染成另一種顏色（雲在黃昏偏橘粉、黑夜偏冷藍用）：存成 name + suffix
  function makeTint(name, suffix, color) {
    const s = store[name];
    const c = document.createElement('canvas');
    c.width = s.c.width; c.height = s.c.height;
    const g = c.getContext('2d');
    g.drawImage(s.c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    store[name + suffix] = { c, w: s.w, h: s.h };
  }

  function ell(g, x, y, rx, ry, fill, stroke, lw) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.lineWidth = lw || 1.4; g.strokeStyle = stroke; g.stroke(); }
  }
  function poly(g, pts, fill, stroke, lw) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.lineWidth = lw || 1.4; g.strokeStyle = stroke; g.stroke(); }
  }
  function line(g, x1, y1, x2, y2, color, lw) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.strokeStyle = color; g.lineWidth = lw || 1; g.stroke();
  }

  // ---------- 貓咪戰機（朝上）----------
  function drawCat(g) {
    const OUT = '#4a2d1c';
    for (const s of [-1, 1]) {                                     // 機翼
      poly(g, [[s * 6, 5], [s * 25, 16], [s * 25, 22], [s * 6, 19]], '#f2f8ff', OUT, 1.5);
      poly(g, [[s * 19, 14], [s * 25, 16], [s * 25, 22], [s * 19, 20.5]], '#ff8fab');
    }
    for (const s of [-1, 1]) poly(g, [[s * 4, 20], [s * 12, 28], [s * 3, 27]], '#f2f8ff', OUT, 1.4);  // 尾翼
    ell(g, 0, 11, 8.5, 14, '#ffa14a', OUT, 1.6);                   // 機身
    ell(g, 0, 15, 5, 8, '#fff1e0');                                // 肚子
    for (const s of [-1, 1]) {                                     // 耳朵
      poly(g, [[s * 14, -8], [s * 11.5, -25], [s * 2.5, -16]], '#ffa14a', OUT, 1.6);
      poly(g, [[s * 11.5, -11.5], [s * 10.6, -20.5], [s * 5, -15.5]], '#ff9db5');
    }
    ell(g, 0, -4, 15, 13.5, '#ffb35c', OUT, 1.7);                  // 頭
    line(g, 0, -17.2, 0, -12.5, '#d9701a', 1.8);                   // 額頭條紋
    line(g, -4.6, -16.6, -3.6, -12.8, '#d9701a', 1.8);
    line(g, 4.6, -16.6, 3.6, -12.8, '#d9701a', 1.8);
    for (const s of [-1, 1]) {
      ell(g, s * 9.6, 1.6, 2.7, 2.2, 'rgba(255,110,150,0.45)');   // 腮紅
      ell(g, s * 5.2, -4, 2.6, 3.6, '#2a1a12');                    // 眼睛
      ell(g, s * 5.9, -5.4, 1, 1, '#fff');
      ell(g, s * 4.4, -2.6, 0.55, 0.55, '#fff');
      line(g, s * 8, 1, s * 16, -0.8, 'rgba(74,45,28,0.75)', 0.9); // 鬍鬚
      line(g, s * 8, 2.6, s * 16, 3.8, 'rgba(74,45,28,0.75)', 0.9);
    }
    ell(g, 0, 2.4, 5.6, 3.8, '#fff5ea');                           // 嘴套
    poly(g, [[-1.8, 0.5], [1.8, 0.5], [0, 2.3]], '#ff7f9b');       // 鼻子
    g.beginPath();                                                 // 嘴
    g.arc(-1.7, 3.7, 1.7, 0, Math.PI);
    g.arc(1.7, 3.7, 1.7, 0, Math.PI);
    g.strokeStyle = OUT; g.lineWidth = 0.9; g.stroke();
  }

  // ---------- 老鼠敵機（朝下）----------
  const MOUSE_BODY = ['#d5d8e6', '#6fe6d8', '#ff8585', '#c9a4ff'];
  const LINE = '#3a3350';

  function drawMouse(g, type) {
    const body = MOUSE_BODY[type];
    for (const s of [-1, 1]) {                                     // 翅膀
      g.save(); g.translate(s * 12, -1); g.rotate(s * 0.5);
      ell(g, 0, 0, 4, 8, 'rgba(255,255,255,0.92)', LINE, 1.2);
      g.restore();
    }
    g.beginPath(); g.moveTo(0, -9); g.quadraticCurveTo(6, -14, 3, -17);   // 尾巴
    g.strokeStyle = '#ff9db5'; g.lineWidth = 1.7; g.stroke();
    for (const s of [-1, 1]) {                                     // 耳朵
      ell(g, s * 9, -7, 6, 6, body, LINE, 1.4);
      ell(g, s * 9, -7, 3.4, 3.4, '#ffb3c7');
    }
    ell(g, 0, 1, 11.5, 10.5, body, LINE, 1.5);                     // 頭
    ell(g, 0, 6, 5, 3.6, '#fff4f4');                               // 嘴套
    ell(g, 0, 7.6, 1.8, 1.4, '#ff7f9b');                           // 鼻子
    for (const s of [-1, 1]) {
      ell(g, s * 4.4, 0.5, 2.3, 2.8, '#231a2b');                   // 眼睛
      ell(g, s * 4.4 - 0.6, -0.6, 0.9, 0.9, '#fff');
      line(g, s * 6, 6, s * 13.5, 4.6, 'rgba(58,51,80,0.7)', 0.9); // 鬍鬚
      line(g, s * 6, 7.4, s * 13.5, 8.4, 'rgba(58,51,80,0.7)', 0.9);
    }

    if (type === 0) {                    // 迅捷鼠：飛行護目鏡
      line(g, -11, -4.8, 11, -4.8, '#5a4a3a', 1.5);
      for (const s of [-1, 1]) ell(g, s * 4.6, -4.8, 3.4, 3.4, 'rgba(150,220,255,0.8)', '#5a4a3a', 1.2);
    } else if (type === 1) {             // 狙擊鼠：瞄準鏡
      g.beginPath(); g.arc(4.4, 0.5, 4.8, 0, TAU);
      g.fillStyle = 'rgba(255,60,60,0.22)'; g.fill();
      g.strokeStyle = '#ff3d3d'; g.lineWidth = 1.4; g.stroke();
      line(g, -0.8, 0.5, 9.6, 0.5, '#ff3d3d', 0.9);
      line(g, 4.4, -5.6, 4.4, 6.6, '#ff3d3d', 0.9);
    } else if (type === 2) {             // 衝撞鼠：頭巾 + 怒眉 + 尖牙
      line(g, -10.5, -5.2, 10.5, -5.2, '#ffffff', 3.6);
      ell(g, 0, -5.2, 1.7, 1.7, '#e0303a');
      line(g, -7.8, -2.4, -2.2, -0.6, '#3a1a2a', 1.9);
      line(g, 7.8, -2.4, 2.2, -0.6, '#3a1a2a', 1.9);
      poly(g, [[-2.8, 8.8], [-1.2, 8.8], [-2, 11.4]], '#fff', LINE, 0.6);
      poly(g, [[2.8, 8.8], [1.2, 8.8], [2, 11.4]], '#fff', LINE, 0.6);
    } else {                             // 旋轉鼠：螺旋槳帽
      g.beginPath(); g.ellipse(0, -8.6, 7.4, 4.6, 0, Math.PI, TAU);
      g.closePath(); g.fillStyle = '#ffd166'; g.fill();
      g.strokeStyle = LINE; g.lineWidth = 1.2; g.stroke();
      line(g, 0, -13, 0, -15.2, LINE, 1.2);
      ell(g, 0, -15.6, 8.6, 1.7, '#ff6b8a', LINE, 0.9);
    }
  }

  // ---------- 子彈 ----------
  function drawFish(g, evil) {           // 小魚（朝上）。evil=true 是被 BOSS 反彈的紅色版本
    const glow = evil ? '255,90,90' : '140,240,255';
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, 13);
    gr.addColorStop(0, 'rgba(' + glow + ',0.6)');
    gr.addColorStop(1, 'rgba(' + glow + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill();
    poly(g, [[0, 6], [-5.5, 13], [5.5, 13]], evil ? '#e0505a' : '#4fc8e8');   // 尾
    ell(g, 0, -1, 4.6, 9, evil ? '#ffa0a8' : '#8ff0ff', evil ? '#8a2030' : '#2a7fa8', 1);   // 身體
    ell(g, 0, 2, 2.6, 5, evil ? '#ffe6e8' : '#e6fdff');            // 肚子
    ell(g, 0, -6, 1.2, 1.2, evil ? '#4a1018' : '#173a52');         // 眼睛
  }

  // BOSS 子彈：便便（有一張小臉）
  function drawPoop(g) {
    const OUT = '#4a2d1c', BR = '#8b5a2b';
    ell(g, 0, 7, 11, 7, BR, OUT, 1.5);
    ell(g, 0, 0, 8.4, 6, BR, OUT, 1.5);
    ell(g, 0, -6.5, 5.4, 4.6, BR, OUT, 1.5);
    poly(g, [[-2.2, -10], [0.8, -14], [2.6, -9.6]], BR, OUT, 1.3);   // 尖尖的頭
    ell(g, -4, -1.5, 1.8, 1, 'rgba(255,255,255,0.35)');              // 反光
    ell(g, -3.4, 5.2, 1.3, 1.6, '#2a1a12'); ell(g, 3.4, 5.2, 1.3, 1.6, '#2a1a12');
    g.beginPath(); g.arc(0, 8.4, 2.3, 0.15, Math.PI - 0.15);
    g.strokeStyle = '#2a1a12'; g.lineWidth = 1; g.stroke();
  }

  // BOSS 子彈：起司（畫成朝右，飛行時依角度旋轉）
  function drawCheese(g) {
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, 15);
    gr.addColorStop(0, 'rgba(255,230,90,0.45)');
    gr.addColorStop(1, 'rgba(255,230,90,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    poly(g, [[-13, -8], [14, -1], [14, 8], [-13, 8]], '#ffd23f', '#a8741a', 1.3);
    poly(g, [[-13, -8], [14, -1], [14, 2], [-13, -4]], '#ffe98a');
    ell(g, -2, 3.6, 2.4, 2.4, '#e0a92a'); ell(g, 7, 4.4, 1.8, 1.8, '#e0a92a'); ell(g, -8, 4.4, 1.6, 1.6, '#e0a92a');
  }

  // ---------- BOSS：流氓大老鼠（獨眼面罩 + 太空裝）----------
  // face: 'normal' 得意 / 'angry' 攻擊中 / 'dead' 厭世（死亡演出）
  function drawBoss(g, face) {
    const OUT = '#2a2438', FUR = '#7d8194', SUIT = '#eef1f8', ORANGE = '#f39c3d';
    const RR = BM.Draw.roundRect;

    for (const s of [-1, 1]) {                                       // 背後噴射背包
      RR(g, s * 58 - 9, -26, 18, 66, 8);
      g.fillStyle = '#9aa3b8'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      ell(g, s * 58, -24, 9, 5, '#c9d1e4', OUT, 1.5);
      poly(g, [[s * 58 - 6, 40], [s * 58 + 6, 40], [s * 58 + 4, 50], [s * 58 - 4, 50]], ORANGE, OUT, 1.5);
    }
    g.beginPath(); g.moveTo(38, 66); g.bezierCurveTo(86, 84, 100, 34, 78, 16);   // 尾巴
    g.lineWidth = 8; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 4.5; g.strokeStyle = '#ff9db5'; g.stroke();
    for (const s of [-1, 1]) {                                       // 靴子
      ell(g, s * 24, 90, 20, 14, '#dfe4f0', OUT, 2.5);
      ell(g, s * 24, 99, 20, 6, ORANGE, OUT, 2);
    }

    ell(g, 0, 50, 54, 46, SUIT, OUT, 3);                             // 太空裝身體
    g.save();                                                        // 橘色腰帶
    g.beginPath(); g.ellipse(0, 50, 54, 46, 0, 0, TAU); g.clip();
    g.fillStyle = ORANGE; g.fillRect(-60, 68, 120, 11);
    g.restore();
    RR(g, -10, 66, 20, 15, 4); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    RR(g, -26, 28, 52, 28, 6); g.fillStyle = '#2f3448'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();   // 胸前面板
    line(g, -14, 34, 14, 52, '#dfe4f0', 2.4); line(g, 14, 34, -14, 52, '#dfe4f0', 2.4);                              // 交叉骨頭
    ell(g, 0, 42, 8, 7.4, '#ffffff', OUT, 1.4);                                                                     // 骷髏頭
    ell(g, -3, 41, 1.9, 2.1, '#15121f'); ell(g, 3, 41, 1.9, 2.1, '#15121f');
    line(g, -3, 46.5, 3, 46.5, '#15121f', 1.1);
    for (const s of [-1, 1]) {                                       // 肩膀、手臂、手套、爪子
      ell(g, s * 54, 26, 17, 15, ORANGE, OUT, 2.5);
      ell(g, s * 64, 54, 13, 22, SUIT, OUT, 2.5);
      ell(g, s * 68, 78, 15, 14, '#cfd5e6', OUT, 2.5);
      for (let k = -1; k <= 1; k++) poly(g, [[s * 68 + k * 8 - 3.5, 87], [s * 68 + k * 8 + 3.5, 87], [s * 68 + k * 8.6, 101]], '#f4f6ff', OUT, 1.6);
    }
    g.beginPath(); g.ellipse(0, 6, 46, 13, 0, 0, TAU);               // 太空裝領圈
    g.lineWidth = 9; g.strokeStyle = '#b9c1d6'; g.stroke();
    g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();

    for (const s of [-1, 1]) {                                       // 耳朵
      ell(g, s * 46, -74, 20, 20, FUR, OUT, 2.5);
      ell(g, s * 46, -74, 11, 11, '#ffb3c7');
    }
    ell(g, 0, -34, 44, 40, FUR, OUT, 3);                             // 頭
    ell(g, 0, -16, 24, 17, '#dcd6e0', OUT, 2);                       // 嘴套
    ell(g, 0, -24, 6.5, 5, '#ff6f91', OUT, 1.5);                     // 鼻子
    for (const s of [-1, 1]) {                                       // 鬍鬚
      line(g, s * 15, -16, s * 46, -23, 'rgba(42,36,56,0.8)', 1.4);
      line(g, s * 15, -12, s * 46, -10, 'rgba(42,36,56,0.8)', 1.4);
    }

    // ---- 獨眼面罩：左眼被黑色面罩蓋住，右眼外露 ----
    line(g, -40, -52, 42, -60, '#15121f', 4.5);                      // 綁帶
    ell(g, -19, -42, 16, 13.5, '#15121f', '#000', 1.5);
    ell(g, -23, -46, 3.4, 2.2, 'rgba(255,255,255,0.28)');
    line(g, -27, -36, -11, -48, '#8a1f2c', 1.6);                     // 面罩上的紅色傷疤紋

    if (face === 'dead') {
      // 厭世臉：半眼皮、黑眼圈、扁嘴、冒汗
      ell(g, 19, -42, 11, 12, '#fff', OUT, 1.8);
      ell(g, 19.5, -37, 4.4, 4.4, '#231a2b');                        // 眼珠往下看（放空）
      g.beginPath(); g.ellipse(19, -42, 11, 12, 0, Math.PI, TAU); g.closePath();   // 沉重的上眼皮
      g.fillStyle = FUR; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      line(g, 8, -42.5, 30, -42.5, OUT, 2.6);
      g.beginPath(); g.arc(19, -35, 12, 0.35, Math.PI - 0.35);       // 黑眼圈
      g.strokeStyle = '#4b4f63'; g.lineWidth = 2.2; g.stroke();
      line(g, 7, -55, 32, -52, OUT, 4.6);                            // 眉毛垂下
      line(g, -14, -6, 14, -7.5, OUT, 3);                            // 扁嘴
      line(g, -14, -6, -17, -3, OUT, 2.4); line(g, 14, -7.5, 17, -4.5, OUT, 2.4);
      for (const gx of [30, 35, 40]) line(g, gx, -34, gx - 1, -20, 'rgba(60,70,110,0.7)', 1.6);   // 臉上黑線
      g.beginPath(); g.moveTo(43, -66);                              // 冷汗
      g.quadraticCurveTo(48, -56, 43, -51); g.quadraticCurveTo(38, -56, 43, -66);
      g.fillStyle = '#8fd8ff'; g.fill(); g.lineWidth = 1.3; g.strokeStyle = '#3a7fa8'; g.stroke();
    } else {
      const angry = face === 'angry';
      ell(g, 19, -42, 11, 12, '#fff', OUT, 1.8);
      ell(g, 20, -41, angry ? 6.4 : 5.4, angry ? 6.4 : 5.4, '#d1301f');
      ell(g, 20.5, -41, 2.6, 2.8, '#15121f');
      ell(g, 18, -44.5, 1.5, 1.5, '#fff');
      if (angry) line(g, 6, -53, 33, -64, OUT, 5.4);                 // 怒眉（內側壓低）
      else line(g, 7, -60, 32, -53, OUT, 5);                         // 得意的斜眉
      line(g, 26, -58, 30, -28, '#e6b8b0', 2.4);                     // 右眼傷疤
      line(g, 24.5, -52, 30, -53.5, '#e6b8b0', 1.6); line(g, 26.5, -44, 32, -45, '#e6b8b0', 1.6); line(g, 28, -35, 33.5, -36, '#e6b8b0', 1.6);
      if (angry) {                                                   // 張嘴大吼
        ell(g, 0, -7, 17, 10.5, '#3a1020', OUT, 2);
        poly(g, [[-10, -15], [-5, -15], [-7.5, -8]], '#fff');
        poly(g, [[10, -15], [5, -15], [7.5, -8]], '#fff');
        ell(g, 0, -3, 8, 4.4, '#ff6b86');
      } else {                                                       // 得意的奸笑 + 金牙
        g.beginPath(); g.moveTo(-17, -8); g.quadraticCurveTo(0, 3, 19, -12);
        g.lineWidth = 3.2; g.strokeStyle = OUT; g.stroke();
        RR(g, -6, -10, 7, 10, 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OUT; g.stroke();
        RR(g, 2, -11, 7, 10, 2); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
      }
    }

    // ---- 太空頭盔玻璃 ----
    g.beginPath(); g.arc(0, -34, 54, 0, TAU);
    g.fillStyle = 'rgba(170,225,255,0.2)'; g.fill();
    g.lineWidth = 3.4; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
    g.beginPath(); g.arc(0, -34, 46, Math.PI * 1.08, Math.PI * 1.36);
    g.lineWidth = 4.5; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
    if (face === 'dead') {                                           // 玻璃碎裂
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(-32, -76); g.lineTo(-24, -58); g.lineTo(-33, -50); g.lineTo(-17, -36); g.lineTo(-24, -24); g.stroke();
      g.beginPath(); g.moveTo(-24, -58); g.lineTo(-8, -62); g.stroke();
      g.beginPath(); g.moveTo(-17, -36); g.lineTo(-2, -40); g.stroke();
    }
  }
  function drawOrb(g) {                  // 敵方子彈：橘紅光球
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 9);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.35, '#ffe27a');
    gr.addColorStop(0.7, '#ff6a3d');
    gr.addColorStop(1, 'rgba(255,60,90,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    // 深色外圈：在白天 / 黃昏這種亮背景上，橘紅光球才不會融進天空
    g.strokeStyle = 'rgba(105,14,44,0.75)'; g.lineWidth = 1.7;
    g.beginPath(); g.arc(0, 0, 6.6, 0, TAU); g.stroke();
  }

  function drawCloud(g, seed) {
    const sets = [
      [[-30, 6, 18], [-8, -6, 24], [18, 0, 20], [36, 8, 14]],
      [[-24, 4, 16], [0, -8, 22], [24, 2, 18]],
      [[-40, 8, 14], [-16, -4, 22], [10, -10, 26], [36, -2, 20], [54, 8, 12]]
    ][seed];
    g.fillStyle = '#ffffff';
    for (const c of sets) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fill(); }
  }

  BM.Sprites = {
    init() {
      make('cat', 60, 60, drawCat);
      for (let t = 0; t < 4; t++) {
        make('mouse' + t, 36, 40, g => drawMouse(g, t));
        makeFlash('mouse' + t);
      }
      make('fish', 30, 40, g => drawFish(g, false));
      make('fishR', 30, 40, g => drawFish(g, true));
      make('orb', 22, 22, drawOrb);
      make('poop', 30, 34, drawPoop);
      make('cheese', 34, 30, drawCheese);
      for (const f of ['normal', 'angry', 'dead']) {
        make('boss_' + f, 250, 250, g => drawBoss(g, f));
        makeFlash('boss_' + f);
      }
      for (let i = 0; i < 3; i++) {
        make('cloud' + i, 150, 70, g => drawCloud(g, i));       // 白色（白天 / 主選單）
        makeTint('cloud' + i, 'w', '#ffb48c');                  // 暖色（黃昏）
        makeTint('cloud' + i, 'c', '#a9bcff');                  // 冷藍（黑夜）
      }
    },

    // 主角戰機資訊：display scale 與兩個噴射口（相對於貼圖錨點、scale=1 時的座標）
    // 預設是程式繪製的備用貓咪；載入 assets/images/sprites/player.png 成功後會換成圖片版本
    player: { scale: 0.9, nozzles: [{ x: -6, y: 26 }, { x: 6, y: 26 }] },

    // 載入外部圖片素材（主角戰機）。不論成功與否都會 resolve，失敗時沿用程式繪製的備用貓咪。
    loadImages() {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const w = 52, h = 80, K = 3;              // 顯示大小 52×80，預先以 3 倍解析度高品質縮放，畫面才不會鋸齒
          const c = document.createElement('canvas');
          c.width = w * K; c.height = h * K;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, 0, 0, c.width, c.height);
          // ay：貓咪身體中心在圖片高度的位置（判定點 / 座標對齊這裡，火焰往下延伸）
          store.cat = { c, w, h, ay: 0.4 };
          // 噴射口位置量自原圖（195×300）：左 (70,174)、右 (122,174)
          const sx = w / 195, sy = h / 300;
          BM.Sprites.player = {
            scale: 1,
            nozzles: [{ x: (70 - 97.5) * sx, y: (174 - 0.4 * 300) * sy }, { x: (122 - 97.5) * sx, y: (174 - 0.4 * 300) * sy }]
          };
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = 'assets/images/sprites/player.png';
      });
    },

    // rot: 弧度；scale、alpha 可省略
    draw(ctx, name, x, y, rot, scale, alpha) {
      const s = store[name];
      if (!s) return;
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (scale && scale !== 1) ctx.scale(scale, scale);
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.drawImage(s.c, -s.w / 2, -s.h * (s.ay === undefined ? 0.5 : s.ay), s.w, s.h);
      ctx.restore();
    }
  };
})(window.BM = window.BM || {});
