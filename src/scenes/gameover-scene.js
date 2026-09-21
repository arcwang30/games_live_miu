// 結算畫面：
//   1. 這局的分數進得了排行榜（前 20 名）→ 先進「簽名」畫面：4 個格子，可用 A–Z、0–9
//        鍵盤：直接打字（自動跳下一格）、Backspace 刪除、← → 換格、↑ ↓ 換字、Enter 送出
//        手把：↑ ↓ 換字（按住連發）、← → 換格、A 確定這格並跳下一格（最後一格 = 送出）、B 退格、Start 送出
//        觸控 / 滑鼠：點畫面上的鍵盤（A–Z、0–9）輸入，點格子選位置、格子上下的 ▲ ▼ 換字、⌫ 刪除、OK 送出
//   2. 送出後（或沒進榜）顯示本局成績（含結束時的波數）與前 5 名，再選「再玩一次 / 回主選單」
(function (BM) {
  const C = BM.CONFIG, W = C.W, M = BM.M, D = BM.Draw, I = BM.Input, S = BM.Storage;

  const L = (k, v) => BM.I18n.t(k, v);
  const ITEMS = ['go.again', 'go.menu'];
  const BTN = { w: 300, h: 56, y0: 770, gap: 76 };

  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';     // 簽名可用的字元（手把 ↑ ↓ 換字時依此順序循環）
  const SLOTS = S.NAME_LEN;
  const BOX = { w: 76, h: 88, gap: 14, y: 480, arrow: 30 };                        // 簽名格子（▲ ▼ 在格子上下）
  const PAD = { cols: 9, cell: 52, key: 46, x0: 71, y0: 632, gap: 54 };            // 畫面上的鍵盤：9 欄 × 4 列 = 36 個字元
  const ACT = { y: 872, w: 190, h: 52, dx: 110 };                                  // ⌫ / OK 按鈕（中心 ± dx）

  const inBox = (p, cx, cy, w, h) => p && Math.abs(p.x - cx) <= w / 2 && Math.abs(p.y - cy) <= h / 2;

  class GameOverScene {
    enter(params) {
      this.score = (params && params.score) || 0;
      this.wave = Math.max(1, (params && params.wave) || 1);
      this.rank = -1;
      this.name = '';
      this.idx = 0;
      this.t = 0;
      this.lock = 0.6;                                // 這個時間之前不接受操作，避免玩家還在狂按時誤觸
      this.slots = new Array(SLOTS).fill('');
      this.cur = 0;
      this.entry = null;                              // 這局送出的那一筆（榜單更新後用它重新找名次）
      this.ver = -1;
      BM.Storage.refresh();                           // 重新取得雲端榜單（結算時顯示最新的前 5 名）
      this.phase = 'result';
      if (S.qualifies(this.score)) {                  // 進榜 → 先簽名
        this.phase = 'entry';
        this.lock = 1.0;                              // 簽名前多等一下：避免死亡瞬間的 WASD / 空白鍵被當成簽名
        I.textMode = true;                            // 簽名時 M / F 不再是靜音 / 全螢幕
        this.will = S.list().filter(e => e.score >= this.score).length;   // 預計名次（0 起算）
      }
      BM.Audio.stopMusic();
      BM.Audio.sfx('over');
    }
    exit() { I.textMode = false; }

    btnY(i) { return BTN.y0 + i * BTN.gap; }
    boxX(i) { return W / 2 - (SLOTS * BOX.w + (SLOTS - 1) * BOX.gap) / 2 + BOX.w / 2 + i * (BOX.w + BOX.gap); }
    keyPos(i) { return { x: PAD.x0 + (i % PAD.cols) * PAD.cell, y: PAD.y0 + Math.floor(i / PAD.cols) * PAD.gap }; }

    choose(i) {
      BM.Audio.sfx('select');
      BM.Game.setScene(i === 0 ? 'play' : 'menu');
    }

    // ------------------------------------------------ 簽名
    typeChar(c) {
      this.slots[this.cur] = c;
      if (this.cur < SLOTS - 1) this.cur++;
      BM.Audio.sfx('move');
    }
    cycle(dir) {                                      // 換字：目前這格的字元往前 / 往後一個（空格從 A 或 9 開始）
      const s = this.slots[this.cur];
      let k = s && s !== ' ' ? CHARS.indexOf(s) : (dir > 0 ? -1 : 0);
      k = (k + dir + CHARS.length) % CHARS.length;
      this.slots[this.cur] = CHARS[k];
      BM.Audio.sfx('move');
    }
    back() {                                          // 刪除：這格有字先清掉這格，沒有字就退回上一格並清掉它
      if (this.slots[this.cur]) this.slots[this.cur] = '';
      else if (this.cur > 0) { this.cur--; this.slots[this.cur] = ''; }
      BM.Audio.sfx('move');
    }
    confirmSlot() {                                   // 手把 A：確定這格（沒輸入就留空白）並跳下一格，最後一格 = 送出
      if (!this.slots[this.cur]) this.slots[this.cur] = ' ';
      if (this.cur < SLOTS - 1) { this.cur++; BM.Audio.sfx('move'); } else this.submit();
    }
    submit() {
      this.name = this.slots.map(s => s || ' ').join('');
      this.rank = S.submit(this.score, this.wave, this.name);
      this.entry = S.lastEntry;
      this.name = (this.rank >= 0 && S.list()[this.rank].name) || '';
      this.phase = 'result';
      I.textMode = false;
      this.lock = this.t + 0.6;
      BM.Audio.sfx('extra');
    }

    update(dt) {
      this.t += dt;
      BM.Background.update(dt);
      if (this.t < this.lock) return;
      if (this.phase === 'entry') this.updateEntry();
      else this.updateResult();
    }

    updateEntry() {
      const P = I.pressed, N = I.nav;
      for (const c of I.typed) this.typeChar(c);
      if (N.left) { this.cur = (this.cur + SLOTS - 1) % SLOTS; BM.Audio.sfx('move'); }
      if (N.right) { this.cur = (this.cur + 1) % SLOTS; BM.Audio.sfx('move'); }
      if (N.up) this.cycle(1);
      if (N.down) this.cycle(-1);
      if (P.back) this.back();                                          // Backspace / Esc / 手把 B
      if (I.key('Enter') || I.key('NumpadEnter') || I.padPressed(9)) { this.submit(); return; }   // Enter / 手把 Start：直接送出
      if (I.padPressed(0)) { this.confirmSlot(); return; }               // 手把 A：確定這格

      const c = I.click;                                                 // 觸控 / 滑鼠
      if (!c) return;
      for (let i = 0; i < SLOTS; i++) {
        const x = this.boxX(i);
        if (inBox(c, x, BOX.y - BOX.h / 2 - BOX.arrow / 2 - 4, BOX.w, BOX.arrow + 14)) { this.cur = i; this.cycle(1); return; }    // ▲
        if (inBox(c, x, BOX.y + BOX.h / 2 + BOX.arrow / 2 + 4, BOX.w, BOX.arrow + 14)) { this.cur = i; this.cycle(-1); return; }   // ▼
        if (inBox(c, x, BOX.y, BOX.w, BOX.h)) { this.cur = i; BM.Audio.sfx('move'); return; }
      }
      for (let i = 0; i < CHARS.length; i++) {
        const k = this.keyPos(i);
        if (inBox(c, k.x, k.y, PAD.cell, PAD.gap)) { this.typeChar(CHARS[i]); return; }
      }
      if (inBox(c, W / 2 - ACT.dx, ACT.y, ACT.w, ACT.h)) { this.back(); return; }
      if (inBox(c, W / 2 + ACT.dx, ACT.y, ACT.w, ACT.h)) { this.submit(); return; }
    }

    updateResult() {
      const P = I.pressed;
      if (this.entry && S.version !== this.ver) {                        // 雲端榜單更新了：在新榜單裡重新找這一筆的名次
        this.ver = S.version;
        this.rank = S.rankOf(this.entry);
      }
      if (P.up || P.down) { this.idx = 1 - this.idx; BM.Audio.sfx('move'); }
      for (let i = 0; i < ITEMS.length; i++) {
        const hit = p => p && Math.abs(p.x - W / 2) < BTN.w / 2 && Math.abs(p.y - this.btnY(i)) < BTN.h / 2;
        if (I.moved && hit(I.pointer) && this.idx !== i) { this.idx = i; BM.Audio.sfx('move'); }
        if (I.click && hit(I.click)) { this.choose(i); return; }
      }
      if (P.confirm) this.choose(this.idx);
      else if (P.back) this.choose(1);
    }

    // ------------------------------------------------ 繪製
    draw(ctx) {
      const t = this.t;
      BM.Background.draw(ctx, t);
      ctx.fillStyle = 'rgba(6,8,30,0.55)';
      ctx.fillRect(0, 0, W, C.H);
      if (this.phase === 'entry') this.drawEntry(ctx, t); else this.drawResult(ctx, t);
    }

    // 成績區：GAME OVER、分數、結束時的波數
    drawScore(ctx, yTitle, small) {
      D.text(ctx, 'GAME OVER', W / 2, yTitle, { size: small ? 52 : 64, align: 'center', color: '#ff6b8a', stroke: '#3a0d2a', strokeW: 11, weight: '900', family: D.NUM, shadow: 'rgba(255,80,120,0.8)', shadowBlur: 18 });
    }

    drawEntry(ctx, t) {
      this.drawScore(ctx, 96, true);
      const r = this.will;
      const msg = r === 0 ? L('go.record') : L('go.rank', { n: r + 1 });
      D.text(ctx, msg, W / 2, 170, { size: 26, align: 'center', color: '#ffe27a', stroke: '#3a2a00', strokeW: 5, weight: '900', alpha: 0.75 + 0.25 * Math.sin(t * 6), maxW: 470 });
      D.text(ctx, M.pad(this.score, 7), W / 2, 240, { size: 50, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 8, family: D.NUM, weight: '900' });
      D.text(ctx, 'WAVE ' + this.wave, W / 2, 298, { size: 28, align: 'center', color: '#9ff3ff', stroke: '#0d2a3a', strokeW: 6, family: D.NUM, weight: '900' });
      D.text(ctx, L('sign.title'), W / 2, 356, { size: 24, align: 'center', color: '#ffd166', weight: '900', maxW: 470 });

      // 4 個簽名格
      for (let i = 0; i < SLOTS; i++) {
        const x = this.boxX(i), on = i === this.cur, s = this.slots[i];
        ctx.fillStyle = on ? 'rgba(255,209,102,0.2)' : 'rgba(255,255,255,0.1)';
        D.roundRect(ctx, x - BOX.w / 2, BOX.y - BOX.h / 2, BOX.w, BOX.h, 14); ctx.fill();
        ctx.lineWidth = on ? 4 : 2; ctx.strokeStyle = on ? '#ffd166' : 'rgba(255,255,255,0.35)'; ctx.stroke();
        D.text(ctx, s, x, BOX.y + 3, { size: 54, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 6, family: D.NUM, weight: '900' });
        if (on && !s && Math.floor(t * 2.5) % 2 === 0) D.text(ctx, '_', x, BOX.y + 3, { size: 54, align: 'center', color: '#ffd166', family: D.NUM, weight: '900' });
        ctx.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,0.35)';                        // ▲ ▼
        const ay1 = BOX.y - BOX.h / 2 - 20, ay2 = BOX.y + BOX.h / 2 + 20;
        ctx.beginPath(); ctx.moveTo(x, ay1 - 10); ctx.lineTo(x - 13, ay1 + 7); ctx.lineTo(x + 13, ay1 + 7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, ay2 + 10); ctx.lineTo(x - 13, ay2 - 7); ctx.lineTo(x + 13, ay2 - 7); ctx.closePath(); ctx.fill();
      }

      // 畫面上的鍵盤（觸控 / 滑鼠點選；目前這格的字元會亮起，手把 ↑ ↓ 換字時可看到位置）
      const curCh = this.slots[this.cur];
      for (let i = 0; i < CHARS.length; i++) {
        const k = this.keyPos(i), lit = CHARS[i] === curCh;
        ctx.fillStyle = lit ? 'rgba(255,209,102,0.9)' : 'rgba(255,255,255,0.13)';
        D.roundRect(ctx, k.x - PAD.key / 2, k.y - PAD.key / 2, PAD.key, PAD.key, 10); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = lit ? '#fff3d6' : 'rgba(255,255,255,0.28)'; ctx.stroke();
        D.text(ctx, CHARS[i], k.x, k.y + 1, { size: 26, align: 'center', color: lit ? '#3a1d0a' : '#e8eeff', family: D.NUM, weight: '900' });
      }

      D.button(ctx, '⌫  ' + L('sign.del'), W / 2 - ACT.dx, ACT.y, ACT.w, ACT.h, false, t);
      D.button(ctx, 'OK', W / 2 + ACT.dx, ACT.y, ACT.w, ACT.h, true, t);

      const hint = BM.Touch.enabled ? 'sign.hint.touch' : (I.usingPad ? 'sign.hint.pad' : 'sign.hint.kb');
      D.text(ctx, L(hint), W / 2, 930, { size: 14, align: 'center', color: '#9fb0e8', maxW: 500 });
    }

    // 一列排行榜紀錄（前 5 名與「我」的那一列共用）
    row(ctx, y, rank, e, me) {
      if (me) {
        ctx.fillStyle = 'rgba(255,209,102,0.22)';
        D.roundRect(ctx, 50, y - 20, W - 100, 40, 12); ctx.fill();
      }
      D.text(ctx, (rank + 1) + '.', 100, y, { size: 24, align: 'right', color: me ? '#ffd166' : '#9fb0e8', family: D.NUM, weight: '900' });
      if (!e) { D.text(ctx, '--------', 226, y, { size: 26, color: '#5b688f', family: D.NUM, weight: '900' }); return; }
      D.text(ctx, e.name || '----', 122, y, { size: 26, color: me ? '#ffd166' : '#ffe9b0', family: D.NUM, weight: '900' });
      D.text(ctx, M.pad(e.score, 8), 226, y, { size: 26, color: me ? '#fff3c4' : '#fff', family: D.NUM, weight: '900' });
      D.text(ctx, 'W' + (e.wave || '--'), 462, y, { size: 22, align: 'right', color: '#9ff3ff', family: D.NUM, weight: '900' });
    }

    drawResult(ctx, t) {
      this.drawScore(ctx, 130, false);
      D.text(ctx, L('go.sub'), W / 2, 190, { size: 22, align: 'center', color: '#dfe6ff', maxW: 470 });

      D.text(ctx, 'YOUR SCORE', W / 2, 238, { size: 18, align: 'center', color: '#ffd166', family: D.NUM, weight: '900', spacing: 2 });
      D.text(ctx, M.pad(this.score, 7), W / 2, 288, { size: 54, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 8, family: D.NUM, weight: '900' });
      D.text(ctx, 'WAVE ' + this.wave, W / 2, 338, { size: 28, align: 'center', color: '#9ff3ff', stroke: '#0d2a3a', strokeW: 6, family: D.NUM, weight: '900' });

      let msg = '';
      if (this.rank === 0) msg = L('go.record');
      else if (this.rank > 0) msg = L('go.rank', { n: this.rank + 1 });
      if (msg) D.text(ctx, msg, W / 2, 384, { size: 24, align: 'center', color: '#ffe27a', stroke: '#3a2a00', strokeW: 5, weight: '900', alpha: 0.75 + 0.25 * Math.sin(t * 6), maxW: 470 });

      // 前 5 名；如果我排在 5 名之外（6~20 名），另外在下方加一列顯示我的名次
      const list = S.list().slice(0, 20);
      D.text(ctx, L('go.board'), W / 2, 432, { size: 20, align: 'center', color: '#bcd0ff', weight: '900', maxW: 300 });
      const st = S.status;                                                // 全球排行榜 / 同步中 / 離線
      D.text(ctx, L('ranking.sync.' + (st === 'idle' ? 'loading' : st)), W - 50, 432, { size: 13, align: 'right', color: st === 'offline' ? '#ffb38a' : '#9fb0e8', maxW: 150 });
      for (let i = 0; i < 5; i++) this.row(ctx, 476 + i * 42, i, list[i], i === this.rank);
      if (this.rank >= 5) {
        D.text(ctx, '⋮', W / 2, 674, { size: 20, align: 'center', color: '#8fa0d0', weight: '900' });
        this.row(ctx, 708, this.rank, list[this.rank], true);
      }

      for (let i = 0; i < ITEMS.length; i++) {
        D.button(ctx, L(ITEMS[i]), W / 2, this.btnY(i), BTN.w, BTN.h, i === this.idx, t);
      }
    }
  }

  BM.GameOverScene = GameOverScene;
})(window.BM = window.BM || {});
