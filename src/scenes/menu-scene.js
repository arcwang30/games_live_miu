// 主選單：開始遊戲 / 排行榜 / 操作說明 / 設定
//   操作說明：兩個頁籤 —「操作」「敵機介紹」
//   設定：三個頁籤（由左至右）—「語言」「了解歷史」「CREDIT」，預設「語言」；
//         「了解歷史」內含 3 個分頁：關於射擊遊戲 / 概念結構 / 關於Arc遊戲庫（前兩個內文之後補上；第三個有 LOGO、長文字與粉絲團連結按鈕）
// 頁籤操作：← → 切換頁籤、（語言頁籤）↑ ↓ 選擇、（關於頁籤）↑ ↓ / 滾輪 / 拖曳捲動（捲到頭尾再按 = 換分頁）、Esc / B 返回；觸控 / 滑鼠直接點頁籤與「返回」按鈕。
(function (BM) {
  const C = BM.CONFIG, W = C.W, M = BM.M, D = BM.Draw, I = BM.Input;
  const L = (k, v) => BM.I18n.t(k, v);

  const MAIN = ['menu.start', 'menu.ranking', 'menu.howto', 'menu.settings'];
  const BTN = { w: 300, h: 54, y0: 596, gap: 66 };

  // 頁面（操作說明 / 設定 / 排行榜）的版面
  const PANEL = { x: 30, y: 70, w: 480, h: 820 };
  const TAB = { x: 50, w: 440, y: 186, h: 44 };          // 頁籤列
  const SUB = { x: 50, w: 440, y: 268, h: 40 };          // 「關於」頁籤裡的分頁列
  const BACK = { x: W / 2, y: 846, w: 210, h: 50 };      // 返回按鈕
  const LANGS = [{ id: 'zh', label: '中文' }, { id: 'ja', label: '日本語' }, { id: 'en', label: 'English' }];
  const LANG_ROW = { y0: 330, gap: 84, w: 320, h: 58 };
  const FB_BTN = { y: 762, w: 300, h: 44 };              // 「關於Arc遊戲庫」頁的粉絲團按鈕

  // 設定頁面的頁籤順序（由左至右）；進入設定時預設停在第 0 個「語言」
  const SET_TAB = { LANG: 0, HISTORY: 1, CREDIT: 2 };

  const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  class MenuScene {
    enter() {
      this.mode = 'main';          // main | ranking | howto | settings
      this.idx = 0;
      this.tab = 0;                // howto：0 操作 1 敵機介紹；settings：見 SET_TAB（0 語言 1 了解歷史 2 CREDIT），預設 0 = 語言
      this.sub = 0;                // 關於頁籤裡的分頁
      this.scroll = 0;             // 關於頁籤裡文字的捲動量（往下捲為正）
      this.aboutH = 0;
      if (!this.logo) { this.logo = new Image(); this.logo.src = 'assets/images/ui/arc-logo.webp?v=' + C.VERSION; }   // 「關於Arc遊戲庫」的 LOGO
      this.makeFbLink();
      this.langIdx = Math.max(0, LANGS.findIndex(l => l.id === BM.I18n.lang));
      this.t = 0;
      this.mice = [];
      for (let i = 0; i < 6; i++) {
        this.mice.push({ x: M.rand(40, W - 40), y: M.rand(-200, 300), v: M.rand(28, 55), type: i % 4, ph: Math.random() * 6 });
      }
      this.jet = new BM.JetFx();
      BM.Audio.playMusic('menu');
    }
    exit() { this.showFb(false); }

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
      else {
        this.mode = ['', 'ranking', 'howto', 'settings'][i]; this.tab = 0; this.sub = 0; this.scroll = 0; this.aboutH = 1e9;
        if (this.mode === 'ranking') BM.Storage.refresh();          // 進排行榜時重新取得雲端榜單
      }
    }

    goMain() { this.mode = 'main'; BM.Audio.sfx('move'); }

    // ---- 頁籤 ----
    tabCount() { return this.mode === 'howto' ? 2 : 3; }
    tabLabels() {
      return this.mode === 'howto' ? [L('tab.controls'), L('tab.enemies')] : [L('tab.language'), L('tab.history'), L('tab.credit')];
    }
    tabRect(i, n) { const w = TAB.w / n; return { x: TAB.x + i * w, y: TAB.y - TAB.h / 2, w, h: TAB.h }; }
    subRect(i) { const w = SUB.w / 3; return { x: SUB.x + i * w, y: SUB.y - SUB.h / 2, w, h: SUB.h }; }
    langRect(i) { return { x: W / 2 - LANG_ROW.w / 2, y: LANG_ROW.y0 + i * LANG_ROW.gap - LANG_ROW.h / 2, w: LANG_ROW.w, h: LANG_ROW.h }; }
    backRect() { return { x: BACK.x - BACK.w / 2, y: BACK.y - BACK.h / 2, w: BACK.w, h: BACK.h }; }

    setTab(i) { if (i !== this.tab) { this.tab = i; BM.Audio.sfx('move'); } }
    applyLang(i) {
      this.langIdx = i;
      BM.I18n.set(LANGS[i].id);
      BM.Audio.sfx('select');
      BM.Game.toast(L('toast.lang'));
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

      if (this.mode === 'main') { this.updateMain(P); return; }
      if (P.back) { this.goMain(); return; }
      if (this.mode === 'ranking') { if (P.confirm || I.click) this.goMain(); return; }
      this.updateTabbed(P);
    }

    updateMain(P) {
      if (P.up) { this.idx = (this.idx + MAIN.length - 1) % MAIN.length; BM.Audio.sfx('move'); }
      if (P.down) { this.idx = (this.idx + 1) % MAIN.length; BM.Audio.sfx('move'); }

      // 滑鼠：移動時選取、點擊時確認
      for (let i = 0; i < MAIN.length; i++) {
        const hit = p => p && Math.abs(p.x - W / 2) < BTN.w / 2 && Math.abs(p.y - this.btnY(i)) < BTN.h / 2;
        if (I.moved && hit(I.pointer) && this.idx !== i) { this.idx = i; BM.Audio.sfx('move'); }
        if (I.click && hit(I.click)) { this.idx = i; this.choose(i); return; }
      }
      if (P.confirm) this.choose(this.idx);
    }

    updateTabbed(P) {
      const n = this.tabCount();
      if (P.left) this.setTab((this.tab + n - 1) % n);
      if (P.right) this.setTab((this.tab + 1) % n);
      const settings = this.mode === 'settings';
      if (settings && this.tab === SET_TAB.LANG) {                 // 語言：↑↓ 選擇、Enter 確認
        if (P.up) { this.langIdx = (this.langIdx + 2) % 3; BM.Audio.sfx('move'); }
        if (P.down) { this.langIdx = (this.langIdx + 1) % 3; BM.Audio.sfx('move'); }
        if (P.confirm) this.applyLang(this.langIdx);
      } else if (settings && this.tab === SET_TAB.HISTORY) {       // 了解歷史：↑↓ / 滾輪 / 拖曳 捲動長文字，捲到頭尾再按一次 = 換分頁
        this.updateAbout(P);
      }

      const c = I.click;
      if (!c) return;
      if (inRect(c, this.backRect())) { this.goMain(); return; }
      for (let i = 0; i < n; i++) if (inRect(c, this.tabRect(i, n))) { this.setTab(i); return; }
      if (settings && this.tab === SET_TAB.LANG) {
        for (let i = 0; i < 3; i++) if (inRect(c, this.langRect(i))) { this.applyLang(i); return; }
      } else if (settings && this.tab === SET_TAB.HISTORY) {
        for (let i = 0; i < 3; i++) if (inRect(c, this.subRect(i))) { this.setSub(i); return; }
      }
    }

    // ---- 「了解歷史」的分頁與長文字捲動 ----
    setSub(i) { if (i !== this.sub) { this.sub = i; this.scroll = 0; this.aboutH = 1e9; BM.Audio.sfx('move'); } }   // aboutH 在下一次繪製前先當成「很長」，避免還沒量好高度就誤判到底而連跳分頁

    // 文字的可視範圍（有粉絲團按鈕的「關於Arc遊戲庫」頁要留出按鈕的位置）
    aboutCard() { return this.sub === 2 ? { y: 306, h: 418, y0: 362, y1: 712 } : { y: 306, h: 470, y0: 362, y1: 764 }; }

    updateAbout(P) {
      const A = this.aboutCard(), viewH = A.y1 - A.y0, max = Math.max(0, this.aboutH - viewH);
      const N = I.nav;
      if (P.down && this.scroll >= max - 0.5) { this.setSub((this.sub + 1) % 3); return; }      // 已經在底了，再按一次 ↓ = 下一個分頁
      if (P.up && this.scroll <= 0) { this.setSub((this.sub + 2) % 3); return; }                 // 已經在頂了，再按一次 ↑ = 上一個分頁
      let d = 0;
      if (N.down || P.down) d += 52;                                                             // ↑ ↓（按住連發）/ W S / 手把方向
      if (N.up || P.up) d -= 52;
      if (I.key('PageDown')) d += viewH * 0.85;
      if (I.key('PageUp')) d -= viewH * 0.85;
      if (I.key('End')) d += 1e6;
      if (I.key('Home')) d -= 1e6;
      d += I.wheel;                                                                              // 滑鼠滾輪
      const dp = I.downPos;
      if (I.pointerDown && dp && dp.x > 50 && dp.x < 490 && dp.y > 306 && dp.y < A.y1 + 12) d += I.drag;   // 手指 / 滑鼠在文字區按住上下拖曳
      this.scroll = M.clamp(this.scroll + d, 0, max);
      if (this.sub === 2 && P.confirm) this.openFan();                                           // Enter / 空白鍵 / 手把 A：開粉絲團
    }

    // ---- 粉絲團連結：用一個透明的 <a> 蓋在畫面上的按鈕上（手機 / 滑鼠直接點就是真的連結，不會被瀏覽器當成彈出視窗擋掉）；
    //      鍵盤 / 手把按確認則用 window.open（被擋住時顯示提示） ----
    makeFbLink() {
      if (this.fbLink) return;
      const a = document.createElement('a');
      a.href = C.LINKS.fanPage; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', 'Facebook'); a.tabIndex = -1;
      a.style.cssText = 'position:fixed;display:none;z-index:50;background:transparent;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;';
      a.addEventListener('click', () => BM.Audio.sfx('select'));
      document.body.appendChild(a);
      this.fbLink = a;
    }
    showFb(vis) {
      const a = this.fbLink;
      if (!a) return;
      if (!vis) { a.style.display = 'none'; return; }
      const r = document.getElementById('game').getBoundingClientRect(), b = FB_BTN;
      a.style.display = 'block';
      a.style.left = (r.left + (W / 2 - b.w / 2) / W * r.width) + 'px';
      a.style.top = (r.top + (b.y - b.h / 2) / C.H * r.height) + 'px';
      a.style.width = (b.w / W * r.width) + 'px';
      a.style.height = (b.h / C.H * r.height) + 'px';
    }
    openFan() {
      BM.Audio.sfx('select');
      const w = window.open(C.LINKS.fanPage, '_blank');
      if (w) { try { w.opener = null; } catch (e) { /* ignore */ } }
      else BM.Game.toast(L('about.fb.blocked'));
    }

    // ------------------------------------------------ 繪製
    draw(ctx) {
      const t = this.t;
      BM.Background.draw(ctx, t);
      this.fbShow = false;                                          // 粉絲團連結只在「關於Arc遊戲庫」頁顯示（drawAbout 會設為 true）

      if (this.mode === 'main') this.drawMain(ctx, t);
      else if (this.mode === 'ranking') this.drawRanking(ctx, t);
      else if (this.mode === 'howto') this.drawHowTo(ctx, t);
      else this.drawSettings(ctx, t);
      this.showFb(this.fbShow);
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

      for (let i = 0; i < MAIN.length; i++) {
        D.button(ctx, L(MAIN[i]), W / 2, this.btnY(i), BTN.w, BTN.h, i === this.idx, t);
      }

      const pad = I.pad, hint = { size: 16, align: 'center', color: '#dfe6ff', stroke: '#1b1240', strokeW: 3, maxW: 500 };
      if (BM.Touch.enabled) {                          // 手機 / 平板：顯示觸控操作提示
        D.text(ctx, L('hint.touch1'), W / 2, 890, hint);
        D.text(ctx, L('hint.touch2'), W / 2, 918, { size: 15, align: 'center', color: '#8dffb0', stroke: '#1b1240', strokeW: 3, maxW: 500 });
      } else {
        D.text(ctx, L('hint.kb'), W / 2, 890, hint);
        D.text(ctx, pad ? L('hint.pad.yes') : L('hint.pad.no'), W / 2, 918, { size: 15, align: 'center', color: pad ? '#8dffb0' : '#9aa8d8', stroke: '#1b1240', strokeW: 3, maxW: 460 });
        D.text(ctx, L('hint.keys'), W / 2, 942, { size: 13, align: 'center', color: '#8f9cc8', maxW: 220 });
      }

      // 左下角版本號（檢查有沒有更新到最新版用）
      D.text(ctx, 'v' + C.VERSION, 10, 946, { size: 11, color: '#8f9cc8', family: D.NUM, weight: '700', alpha: 0.85 });

      // 右下角版權字樣（白色描邊，疊在城鎮剪影上也看得清楚）
      D.text(ctx, "© Arc's Concept Game", W - 12, 943, { size: 16, align: 'right', color: '#5b2a86', stroke: '#ffffff', strokeW: 4, weight: '900' });
    }

    // ---- 頁面共用元件 ----
    panel(ctx, title) {
      ctx.fillStyle = 'rgba(8,10,40,0.74)';
      D.roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
      D.text(ctx, title, W / 2, 122, { size: 42, align: 'center', color: '#ffd166', stroke: '#5b2a86', strokeW: 8, weight: '900', maxW: 420 });
    }

    // 頁籤列；rects 由 rect(i) 提供，active 是目前頁籤
    tabs(ctx, labels, active, rect, size) {
      for (let i = 0; i < labels.length; i++) {
        const r = rect(i), on = i === active;
        D.roundRect(ctx, r.x + 3, r.y, r.w - 6, r.h, 12);
        if (on) {
          const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
          g.addColorStop(0, '#ffd166'); g.addColorStop(1, '#ff9a48');
          ctx.fillStyle = g;
        } else ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = on ? '#fff3d6' : 'rgba(255,255,255,0.22)'; ctx.stroke();
        D.text(ctx, labels[i], r.x + r.w / 2, r.y + r.h / 2 + 1, { size: size || 17, align: 'center', color: on ? '#3a1d0a' : '#cfd8ff', weight: '900', maxW: r.w - 18 });
      }
    }

    // 底部：返回按鈕 + 操作提示
    footer(ctx, t, keysKey, tapKey) {
      D.button(ctx, L('nav.back'), BACK.x, BACK.y, BACK.w, BACK.h, false, t);
      D.text(ctx, BM.Touch.enabled ? L(tapKey || 'nav.tap') : L(keysKey || 'nav.keys'), W / 2, 882, { size: 13, align: 'center', color: '#9fb0e8', maxW: 440 });
    }

    drawRanking(ctx, t) {
      this.panel(ctx, L('ranking.title'));
      const list = BM.Storage.list();                       // 前 20 名：名次 / 簽名 / 分數 / 結束時的波數
      const N = BM.Storage.MAX, y0 = 226, gap = 29;
      const medal = ['#ffd166', '#cfd6e6', '#e0a070'];
      D.text(ctx, L('ranking.sync.' + (BM.Storage.status === 'idle' ? 'loading' : BM.Storage.status)), W / 2, 158, { size: 15, align: 'center', color: BM.Storage.status === 'offline' ? '#ffb38a' : '#9fb0e8', maxW: 420 });   // 全球排行榜 / 同步中 / 離線
      const head = { size: 13, color: '#8fa0d0', family: D.NUM, weight: '900' };
      D.text(ctx, '#', 84, 192, Object.assign({ align: 'right' }, head));
      D.text(ctx, 'NAME', 112, 192, head);
      D.text(ctx, 'SCORE', 216, 192, head);
      D.text(ctx, 'WAVE', 448, 192, Object.assign({ align: 'right' }, head));
      for (let i = 0; i < N; i++) {
        const y = y0 + i * gap, e = list[i];
        if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; D.roundRect(ctx, 44, y - 14, W - 88, 28, 8); ctx.fill(); }
        D.text(ctx, String(i + 1), 84, y, { size: 22, align: 'right', color: medal[i] || '#8fa0d0', family: D.NUM, weight: '900' });
        if (e) {
          D.text(ctx, e.name || '----', 112, y, { size: 22, color: i < 3 ? medal[i] : '#ffe9b0', family: D.NUM, weight: '900' });
          D.text(ctx, M.pad(e.score, 8), 216, y, { size: 22, color: '#fff', family: D.NUM, weight: '900' });
          D.text(ctx, e.wave ? String(e.wave) : '--', 448, y, { size: 22, align: 'right', color: '#9ff3ff', family: D.NUM, weight: '900' });
        } else {
          D.text(ctx, '----', 112, y, { size: 22, color: '#4a5580', family: D.NUM, weight: '900' });
          D.text(ctx, '--------', 216, y, { size: 22, color: '#4a5580', family: D.NUM, weight: '900' });
        }
      }
      if (!list.length) D.text(ctx, L('ranking.empty'), W / 2, 800, { size: 18, align: 'center', color: '#bcd0ff', maxW: 420 });
      D.button(ctx, L('nav.back'), BACK.x, BACK.y, BACK.w, BACK.h, false, t);
    }

    // ---- 操作說明：「操作」「敵機介紹」兩個頁籤 ----
    drawHowTo(ctx, t) {
      this.panel(ctx, L('howto.title'));
      this.tabs(ctx, this.tabLabels(), this.tab, i => this.tabRect(i, 2));
      if (this.tab === 0) this.drawControls(ctx);
      else this.drawEnemies(ctx, t);
      this.footer(ctx, t);
    }

    drawControls(ctx) {
      D.text(ctx, L('ctrl.keyboard'), 210, 270, { size: 17, align: 'center', color: '#7fe9ff', weight: '900', maxW: 160 });
      D.text(ctx, L('ctrl.gamepad'), 395, 270, { size: 17, align: 'center', color: '#8dffb0', weight: '900', maxW: 160 });
      const rows = [['ctrl.move', 'ctrl.move.kb', 'ctrl.move.pad'], ['ctrl.fire', 'ctrl.fire.kb', 'ctrl.fire.pad'], ['ctrl.pause', 'ctrl.pause.kb', 'ctrl.pause.pad']];
      for (let i = 0; i < rows.length; i++) {
        const y = 316 + i * 56;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        D.roundRect(ctx, 50, y - 24, 440, 48, 12); ctx.fill();
        D.text(ctx, L(rows[i][0]), 62, y, { size: 21, color: '#ffd166', weight: '900', maxW: 84 });
        D.text(ctx, L(rows[i][1]), 210, y, { size: 16, align: 'center', color: '#fff', maxW: 170 });
        D.text(ctx, L(rows[i][2]), 395, y, { size: 15, align: 'center', color: '#dfe6ff', maxW: 160 });
      }

      D.text(ctx, L('ctrl.touch'), 62, 508, { size: 21, color: '#ffd166', weight: '900', maxW: 200 });
      const lines = ['ctrl.touch1', 'ctrl.touch2', 'ctrl.touch3'];
      for (let i = 0; i < lines.length; i++) D.text(ctx, '• ' + L(lines[i]), 66, 548 + i * 34, { size: 16, color: i === 0 ? '#fff' : '#dfe6ff', maxW: 410 });

      D.text(ctx, L('ctrl.tip'), W / 2, 690, { size: 17, align: 'center', color: '#bcd0ff', maxW: 430 });
      D.text(ctx, L('hint.keys'), W / 2, 730, { size: 14, align: 'center', color: '#8f9cc8', maxW: 400 });
    }

    drawEnemies(ctx, t) {
      const names = ['#d5d8e6', '#6fe6d8', '#ff8585', '#c9a4ff', '#ffd23f'];      // 名稱顏色（第 5 個是金必鼠）
      for (let i = 0; i < 5; i++) {
        const y = 290 + i * 98;
        const gold = i === 4;
        ctx.fillStyle = gold ? 'rgba(255,210,80,0.14)' : 'rgba(255,255,255,0.08)';
        D.roundRect(ctx, 56, y - 43, W - 112, 86, 16); ctx.fill();
        if (gold) { ctx.strokeStyle = 'rgba(255,210,80,0.55)'; ctx.lineWidth = 2; ctx.stroke(); }
        BM.Sprites.draw(ctx, gold ? 'mouseGold' : 'mouse' + i, 112, y, Math.sin(t * 2 + i) * 0.2, 1.9);
        D.text(ctx, L('enemy.' + i + '.name'), 172, y - 22, { size: 24, color: names[i], stroke: '#1b1240', strokeW: 4, weight: '900', maxW: 300 });
        const lines = D.wrap(ctx, L('enemy.' + i + '.desc'), 300, 15);
        for (let k = 0; k < Math.min(2, lines.length); k++) D.text(ctx, lines[k], 172, y + 4 + k * 21, { size: 15, color: '#e6ecff' });
      }
      D.text(ctx, L('enemy.x2'), W / 2, 780, { size: 17, align: 'center', color: '#ffe27a', weight: '900', maxW: 420 });
    }

    // ---- 設定：由左至右「語言」「了解歷史」「CREDIT」三個頁籤（預設停在「語言」）----
    drawSettings(ctx, t) {
      this.panel(ctx, L('settings.title'));
      this.tabs(ctx, this.tabLabels(), this.tab, i => this.tabRect(i, 3), 15);
      if (this.tab === SET_TAB.LANG) this.drawLanguage(ctx, t);
      else if (this.tab === SET_TAB.HISTORY) this.drawAbout(ctx, t);
      else this.drawCredit(ctx);
      this.footer(ctx, t, this.tab === SET_TAB.LANG ? 'nav.keys.lang' : this.tab === SET_TAB.HISTORY ? 'nav.keys.history' : 'nav.keys', this.tab === SET_TAB.HISTORY ? 'nav.tap.history' : null);
    }

    drawCredit(ctx) {
      const rows = [['credit.planning', 'Arc Wang'], ['credit.programming', 'AI'], ['credit.art', 'AI'], ['credit.music', 'AI']];
      for (let i = 0; i < rows.length; i++) {
        const y = 300 + i * 62;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        D.roundRect(ctx, 70, y - 26, 400, 52, 14); ctx.fill();
        D.text(ctx, L(rows[i][0]), 94, y, { size: 22, color: '#ffd166', weight: '900', maxW: 130 });
        D.text(ctx, rows[i][1], 250, y, { size: 24, color: '#fff', weight: '900', family: D.NUM, maxW: 200 });
      }
      D.text(ctx, L('credit.thanks'), W / 2, 556, { size: 26, align: 'center', color: '#ffd166', stroke: '#5b2a86', strokeW: 6, weight: '900', maxW: 380 });
      const names = ['Kelvin Lo', 'Gomoto', 'Bubu Lin', '國見比呂', 'KT Lee', '大王KUNI'];
      for (let i = 0; i < names.length; i++) D.text(ctx, names[i], W / 2, 610 + i * 33, { size: 23, align: 'center', color: '#fff', weight: '700', maxW: 300 });
    }

    drawLanguage(ctx, t) {
      for (let i = 0; i < LANGS.length; i++) {
        const y = LANG_ROW.y0 + i * LANG_ROW.gap;
        D.button(ctx, LANGS[i].label, W / 2, y, LANG_ROW.w, LANG_ROW.h, i === this.langIdx, t);
        if (LANGS[i].id === BM.I18n.lang) {                       // 目前使用中的語言：右邊打勾
          ctx.save();
          ctx.translate(W / 2 + LANG_ROW.w / 2 + 34, y);
          ctx.beginPath(); ctx.arc(0, 0, 17, 0, M.TAU);
          ctx.fillStyle = '#3ddc84'; ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -6); ctx.stroke();
          ctx.restore();
        }
      }
      D.text(ctx, L('lang.hint'), W / 2, 630, { size: 16, align: 'center', color: '#9fb0e8', maxW: 400 });
    }

    // 文字斷行 + 每行的位置（依語言快取；\n 換段）
    aboutLayout(ctx, key) {
      const ck = BM.I18n.lang + key;
      if (this.layout && this.layout.ck === ck) return this.layout;
      const lines = [];
      let y = 14;
      for (const para of L(key).split('\n')) {
        for (const ln of D.wrap(ctx, para, 396, 16)) { lines.push({ t: ln, y }); y += 26; }
        y += 12;
      }
      return (this.layout = { ck, lines, h: y + 6 });
    }

    // 「了解歷史」的 3 個分頁。有內文的分頁自動斷行、可以上下捲動（↑↓ / 滾輪 / 拖曳）；「關於Arc遊戲庫」頁最上面是 LOGO，下方固定一顆粉絲團按鈕
    drawAbout(ctx, t) {
      const labels = [L('about.0'), L('about.1'), L('about.2')];
      this.tabs(ctx, labels, this.sub, i => this.subRect(i), 14);
      const A = this.aboutCard(), arc = this.sub === 2;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      D.roundRect(ctx, 50, A.y, 440, A.h, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.stroke();
      D.text(ctx, labels[this.sub], W / 2, 336, { size: 26, align: 'center', color: '#ffd166', stroke: '#5b2a86', strokeW: 6, weight: '900', maxW: 400 });
      const bodyKey = 'about.body.' + this.sub;
      if (!BM.I18n.has(bodyKey)) {                                 // 還沒有內文：顯示「準備中」
        D.text(ctx, L('about.soon'), W / 2, 540, { size: 22, align: 'center', color: '#8f9cc8', maxW: 360 });
        this.aboutH = 0;
        return;
      }
      const lay = this.aboutLayout(ctx, bodyKey), logoH = arc ? 204 : 0, viewH = A.y1 - A.y0;
      this.aboutH = lay.h + logoH;
      const max = Math.max(0, this.aboutH - viewH);
      this.scroll = M.clamp(this.scroll, 0, max);

      ctx.save();
      ctx.beginPath(); ctx.rect(56, A.y0, 428, viewH); ctx.clip();  // 只畫在可視範圍裡
      const top = A.y0 - this.scroll;
      if (arc) {
        const im = this.logo;
        if (im && im.complete && im.naturalWidth) {
          const s = 184, h = s * im.naturalHeight / im.naturalWidth;
          ctx.drawImage(im, W / 2 - s / 2, top + 6, s, h);
        }
      }
      for (const ln of lay.lines) {
        const y = top + logoH + ln.y;
        if (y > A.y0 - 20 && y < A.y1 + 20) D.text(ctx, ln.t, 70, y, { size: 16, color: '#e6ecff' });
      }
      ctx.restore();

      if (max > 0) {                                               // 捲軸 + 還有更多內容的提示
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; D.roundRect(ctx, 478, A.y0, 4, viewH, 2); ctx.fill();
        const th = Math.max(28, viewH * viewH / this.aboutH), ty = A.y0 + (viewH - th) * (this.scroll / max);
        ctx.fillStyle = 'rgba(255,209,102,0.85)'; D.roundRect(ctx, 478, ty, 4, th, 2); ctx.fill();
        if (this.scroll < max - 4) D.text(ctx, '▼', 458, A.y1 - 6, { size: 14, align: 'center', color: '#ffd166', alpha: 0.5 + 0.5 * Math.sin(t * 5) });
      }

      if (arc) {                                                   // 粉絲團連結按鈕（實際的點擊由蓋在上面的 <a> 處理）
        D.button(ctx, L('about.fb'), W / 2, FB_BTN.y, FB_BTN.w, FB_BTN.h, true, t);
        this.fbShow = true;
      }
    }
  }

  BM.MenuScene = MenuScene;
})(window.BM = window.BM || {});
