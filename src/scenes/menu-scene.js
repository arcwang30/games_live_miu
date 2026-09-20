// 主選單：開始遊戲 / 排行榜 / 操作說明
(function (BM) {
  const C = BM.CONFIG, W = C.W, M = BM.M, D = BM.Draw, I = BM.Input;

  const ITEMS = ['開始遊戲', '排行榜', '操作說明'];
  const BTN = { w: 300, h: 56, y0: 640, gap: 76 };

  const ENEMY_INFO = [
    ['迅捷鼠', '波浪形俯衝，途中射出瞄準彈'],
    ['狙擊鼠', '懸停瞄準，紅線鎖定後連射（2 滴血）'],
    ['衝撞鼠', '蓄力後追蹤衝撞，橫向閃避即可'],
    ['旋轉鼠', '迴旋一圈半後俯衝，發射三向散彈']
  ];

  class MenuScene {
    enter() {
      this.mode = 'main';
      this.idx = 0;
      this.t = 0;
      this.mice = [];
      for (let i = 0; i < 6; i++) {
        this.mice.push({ x: M.rand(40, W - 40), y: M.rand(-200, 300), v: M.rand(28, 55), type: i % 4, ph: Math.random() * 6 });
      }
      this.jet = new BM.JetFx();
      BM.Audio.playMusic('menu');
    }
    exit() {}

    // 主選單主角：在畫面中央左右來回飄移（±110px）、上下輕微起伏，機身依移動方向傾斜
    hero(t) {
      const A = 110, w = 0.85;
      return {
        x: W / 2 + Math.sin(t * w) * A,
        y: 410 + Math.sin(t * 1.7) * 14,
        rot: Math.cos(t * w) * 0.22,          // 往右飛時向右傾、往左飛時向左傾
        vx: Math.cos(t * w) * A * w           // 水平速度（粒子尾跡用）
      };
    }

    btnY(i) { return BTN.y0 + i * BTN.gap; }

    choose(i) {
      BM.Audio.sfx('select');
      if (i === 0) BM.Game.setScene('play');
      else this.mode = i === 1 ? 'ranking' : 'howto';
    }

    update(dt) {
      this.t += dt;
      BM.Background.update(dt);
      for (const m of this.mice) {
        m.y += m.v * dt;
        if (m.y > 560) { m.y = -40; m.x = M.rand(40, W - 40); }
      }
      const P = I.pressed;

      const info = BM.Sprites.player, h = this.hero(this.t), hs = 2 * info.scale;
      const cs = Math.cos(h.rot), sn = Math.sin(h.rot);
      this.jet.update(dt, info.nozzles.map(n => {          // 噴射口跟著機身傾斜旋轉
        const nx = n.x * hs, ny = n.y * hs;
        return { x: h.x + nx * cs - ny * sn, y: h.y + nx * sn + ny * cs };
      }), h.vx, 0, this.mode === 'main');

      if (this.mode !== 'main') {
        if (P.confirm || P.back || I.click) { this.mode = 'main'; BM.Audio.sfx('move'); }
        return;
      }
      if (P.up) { this.idx = (this.idx + ITEMS.length - 1) % ITEMS.length; BM.Audio.sfx('move'); }
      if (P.down) { this.idx = (this.idx + 1) % ITEMS.length; BM.Audio.sfx('move'); }

      // 滑鼠：移動時選取、點擊時確認
      for (let i = 0; i < ITEMS.length; i++) {
        const hit = p => p && Math.abs(p.x - W / 2) < BTN.w / 2 && Math.abs(p.y - this.btnY(i)) < BTN.h / 2;
        if (I.moved && hit(I.pointer) && this.idx !== i) { this.idx = i; BM.Audio.sfx('move'); }
        if (I.click && hit(I.click)) { this.idx = i; this.choose(i); return; }
      }
      if (P.confirm) this.choose(this.idx);
    }

    draw(ctx) {
      const t = this.t;
      BM.Background.draw(ctx, t);

      if (this.mode === 'main') this.drawMain(ctx, t);
      else if (this.mode === 'ranking') this.drawRanking(ctx, t);
      else this.drawHowTo(ctx, t);
    }

    drawMain(ctx, t) {
      BM.HUD.drawHi(ctx, BM.Storage.best(), W / 2, 30);

      for (const m of this.mice) {
        BM.Sprites.draw(ctx, 'mouse' + m.type, m.x + Math.sin(t * 1.5 + m.ph) * 24, m.y, Math.sin(t * 1.5 + m.ph) * 0.25, 1.1, 0.75);
      }

      // 標題
      const bob = Math.sin(t * 2) * 5;
      ctx.save();
      ctx.translate(W / 2, 200 + bob);
      ctx.rotate(-0.04);
      D.text(ctx, '子彈喵喵', 0, 0, { size: 104, align: 'center', color: '#ffd166', stroke: '#5b2a86', strokeW: 16, weight: '900', shadow: 'rgba(255,170,70,0.9)', shadowBlur: 24 });
      D.text(ctx, '子彈喵喵', 0, -4, { size: 104, align: 'center', color: '#fff3c4', weight: '900' });
      ctx.restore();
      D.text(ctx, 'B U L L E T   M E O W', W / 2, 282, { size: 22, align: 'center', color: '#bcd0ff', stroke: '#1b1240', strokeW: 4, family: D.NUM, weight: '900' });

      // 主角
      const h = this.hero(t), hs = 2 * BM.Sprites.player.scale;
      this.jet.draw(ctx, 1, hs);
      BM.Sprites.draw(ctx, 'cat', h.x, h.y, h.rot, hs);
      const p = (t * 0.9) % 1;                       // 小魚子彈裝飾（從機頭往上發射）
      BM.Sprites.draw(ctx, 'fish', h.x - 24, h.y - 80 - p * 100, 0, 1.4, 1 - p);
      BM.Sprites.draw(ctx, 'fish', h.x + 24, h.y - 80 - ((p + 0.5) % 1) * 100, 0, 1.4, 1 - ((p + 0.5) % 1));

      for (let i = 0; i < ITEMS.length; i++) {
        D.button(ctx, ITEMS[i], W / 2, this.btnY(i), BTN.w, BTN.h, i === this.idx, t);
      }

      const pad = I.pad;
      if (BM.Touch.enabled) {                          // 手機 / 平板：顯示觸控操作提示
        D.text(ctx, '點選按鈕開始　遊戲中按住畫面，戰機在手指上方跟隨', W / 2, 890, { size: 16, align: 'center', color: '#dfe6ff', stroke: '#1b1240', strokeW: 3 });
        D.text(ctx, '子彈自動連射　右上角 ⏸ 可暫停', W / 2, 918, { size: 15, align: 'center', color: '#8dffb0', stroke: '#1b1240', strokeW: 3 });
      } else {
        D.text(ctx, '↑ ↓ / W S / 十字鍵 選擇　　Enter / 空白鍵 / A 確認', W / 2, 890, { size: 16, align: 'center', color: '#dfe6ff', stroke: '#1b1240', strokeW: 3 });
        D.text(ctx, pad ? '● 已偵測到遊戲控制器' : '○ 支援遊戲控制器（連接後按任一鍵）', W / 2, 918, { size: 15, align: 'center', color: pad ? '#8dffb0' : '#9aa8d8', stroke: '#1b1240', strokeW: 3 });
        D.text(ctx, 'M 音效開關　F 全螢幕', W / 2, 942, { size: 13, align: 'center', color: '#8f9cc8' });
      }

      // 右下角版權字樣（白色描邊，疊在城鎮剪影上也看得清楚）
      D.text(ctx, "© Arc's Concept Game", W - 12, 943, { size: 16, align: 'right', color: '#5b2a86', stroke: '#ffffff', strokeW: 4, weight: '900' });
    }

    panel(ctx, title) {
      ctx.fillStyle = 'rgba(8,10,40,0.72)';
      D.roundRect(ctx, 30, 70, W - 60, 820, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
      D.text(ctx, title, W / 2, 122, { size: 42, align: 'center', color: '#ffd166', stroke: '#5b2a86', strokeW: 8, weight: '900' });
      D.text(ctx, BM.Touch.enabled ? '點一下畫面返回' : '按 Enter / 空白鍵 / B 返回', W / 2, 858, { size: 16, align: 'center', color: '#9fb0e8' });
    }

    drawRanking(ctx, t) {
      this.panel(ctx, '排行榜');
      const list = BM.Storage.list().slice(0, 5);
      const medal = ['#ffd166', '#cfd6e6', '#e0a070', '#8fa0d0', '#8fa0d0'];
      for (let i = 0; i < 5; i++) {
        const y = 230 + i * 100, e = list[i];
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        D.roundRect(ctx, 60, y - 38, W - 120, 76, 16); ctx.fill();
        D.text(ctx, String(i + 1), 100, y, { size: 44, align: 'center', color: medal[i], stroke: '#1b1240', strokeW: 6, family: D.NUM, weight: '900' });
        if (e) {
          D.text(ctx, M.pad(e.score, 8), 150, y - 6, { size: 34, color: '#fff', stroke: '#1b1240', strokeW: 5, family: D.NUM, weight: '900' });
          D.text(ctx, e.date, 150, y + 24, { size: 14, color: '#9fb0e8', family: D.NUM });
        } else {
          D.text(ctx, '--------', 150, y, { size: 30, color: '#5b688f', family: D.NUM, weight: '900' });
        }
      }
      if (!list.length) D.text(ctx, '還沒有紀錄，快去挑戰吧！', W / 2, 790, { size: 20, align: 'center', color: '#bcd0ff' });
    }

    drawHowTo(ctx, t) {
      this.panel(ctx, '操作說明');
      const rows = [
        ['移動', '方向鍵 / WASD', '左搖桿 / 十字鍵'],
        ['射擊', '空白鍵（可按住連發）', 'A / X / Y / RB / RT'],
        ['暫停', 'Esc / P', 'Start']
      ];
      D.text(ctx, '鍵盤', 140, 178, { size: 16, color: '#7fe9ff', weight: '900' });
      D.text(ctx, '遊戲控制器', 330, 178, { size: 16, color: '#8dffb0', weight: '900' });
      for (let i = 0; i < rows.length; i++) {
        const y = 214 + i * 50;
        D.text(ctx, rows[i][0], 64, y, { size: 22, color: '#ffd166', weight: '900' });
        D.text(ctx, rows[i][1], 140, y, { size: 16, color: '#fff' });
        D.text(ctx, rows[i][2], 330, y, { size: 15, color: '#dfe6ff' });
      }
      // 手機 / 平板觸控
      D.text(ctx, '手機觸控', 64, 352, { size: 22, color: '#ffd166', weight: '900' });
      D.text(ctx, '按住畫面：戰機飛到手指正上方並跟隨移動（不被手指擋住）', 140, 348, { size: 14, color: '#fff' });
      D.text(ctx, '放開再點新位置，戰機快速飛過去；子彈自動連射；右上 ⏸ 暫停', 140, 370, { size: 13, color: '#dfe6ff' });

      D.text(ctx, '消滅所有老鼠進入下一波！每 30000 分多一台戰機', W / 2, 410, { size: 16, align: 'center', color: '#bcd0ff' });
      D.text(ctx, '每 5 波出現 BOSS「流氓大老鼠」，他揮爪時會反彈子彈！', W / 2, 436, { size: 16, align: 'center', color: '#ff9ecb', weight: '900' });

      D.text(ctx, '— 敵機介紹 —', W / 2, 474, { size: 24, align: 'center', color: '#ffd166', weight: '900' });
      for (let i = 0; i < 4; i++) {
        const y = 546 + i * 76;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        D.roundRect(ctx, 56, y - 34, W - 112, 68, 14); ctx.fill();
        BM.Sprites.draw(ctx, 'mouse' + i, 106, y, Math.sin(t * 2 + i) * 0.2, 1.5);
        D.text(ctx, ENEMY_INFO[i][0], 156, y - 12, { size: 22, color: BM.Enemy.TYPES[i].color, stroke: '#1b1240', strokeW: 4, weight: '900' });
        D.text(ctx, ENEMY_INFO[i][1], 156, y + 16, { size: 15, color: '#e6ecff' });
      }
      D.text(ctx, '出擊中的敵機分數 ×2！', W / 2, 840, { size: 16, align: 'center', color: '#ffe27a' });
    }
  }

  BM.MenuScene = MenuScene;
})(window.BM = window.BM || {});
