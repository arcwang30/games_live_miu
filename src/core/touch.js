// 手機 / 平板觸控操作：
//   - 虛擬圓盤（浮動搖桿）：手指在畫面上按下的位置會出現圓盤，拖曳即可類比移動（推越遠越快）
//   - 觸控模式下子彈自動連射（Input.fire 直接為 true），玩家只要操作方向
//   - 右上角暫停按鈕：按下後開啟暫停選單
//   - 鎖住畫面：擋掉瀏覽器的捲動、下拉重新整理、雙指縮放、長按選單、文字選取
//
// 何時啟用：裝置的主要輸入是觸控（pointer: coarse），或偵測到第一次觸控。
// 之後只要按了鍵盤或遊戲控制器就會自動關閉觸控介面，再觸控又會重新開啟。
(function (BM) {
  const C = BM.CONFIG, W = C.W, H = C.H, M = BM.M, D = BM.Draw;

  const R = 70;                       // 圓盤半徑（邏輯座標）
  const KNOB = 30;                    // 搖桿頭半徑
  const DEAD = 0.12;                  // 死區（比例）
  const TOP_LIMIT = 140;              // 這條線以上（HUD 區）按下不會啟動圓盤，避免誤觸
  const HINT = { x: 110, y: 820 };    // 沒有觸控時，提示用圓盤的位置
  const PAUSE = { x: W - 38, y: 112, r: 22, hit: 34 };   // 暫停按鈕（預備機圖示下方）

  let canvas = null;
  let pauseId = null;

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  function onDown(e) {
    if (e.pointerType === 'mouse') return;
    T.enabled = true;
    if (T.mode !== 'play') return;
    const p = toLogical(e), s = T.stick;
    if (pauseId === null && Math.hypot(p.x - PAUSE.x, p.y - PAUSE.y) < PAUSE.hit) {
      pauseId = e.pointerId;
      T.pauseDown = true;
      T.pauseEdge = true;
      return;
    }
    if (!s.active && p.y > TOP_LIMIT) {
      s.active = true; s.id = e.pointerId;
      s.ox = p.x; s.oy = p.y;                 // 按下的位置就是圓盤中心（原點）
      s.kx = s.ky = s.vx = s.vy = 0;
      T.used = true;
    }
  }

  function onMove(e) {
    const s = T.stick;
    if (!s.active || e.pointerId !== s.id) return;
    const p = toLogical(e);
    let dx = p.x - s.ox, dy = p.y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) {                              // 手指超出圓盤：圓盤跟著手指走，不會卡在邊緣
      const k = (d - R) / d;
      s.ox += dx * k; s.oy += dy * k;
      dx = p.x - s.ox; dy = p.y - s.oy;
    }
    s.kx = dx; s.ky = dy;
    const len = Math.hypot(dx, dy), m = len / R;
    if (m < DEAD) { s.vx = s.vy = 0; return; }
    const mag = Math.min(1, (m - DEAD) / (1 - DEAD));   // 死區外重新縮放成 0~1
    s.vx = dx / len * mag;
    s.vy = dy / len * mag;
  }

  function onUp(e) {
    const s = T.stick;
    if (s.active && e.pointerId === s.id) T.releaseStick();
    if (e.pointerId === pauseId) { pauseId = null; T.pauseDown = false; }
  }

  const T = BM.Touch = {
    enabled: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
    mode: 'none',                   // 'play' 時才會顯示並接受虛擬控制
    used: false,                    // 是否已經用過圓盤（用過後提示變淡）
    pauseDown: false,
    pauseEdge: false,
    stick: { active: false, id: -1, ox: 0, oy: 0, kx: 0, ky: 0, vx: 0, vy: 0 },

    attach(c) {
      canvas = c;
      const opt = { passive: false };
      window.addEventListener('pointerdown', onDown, opt);
      window.addEventListener('pointermove', onMove, opt);
      window.addEventListener('pointerup', onUp, opt);
      window.addEventListener('pointercancel', onUp, opt);
      window.addEventListener('blur', () => T.releaseAll());

      // ---- 鎖住畫面：不要被拖曳、縮放、長按干擾 ----
      document.addEventListener('touchmove', e => e.preventDefault(), opt);                 // 擋捲動 / 下拉重新整理
      document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, opt);   // 擋雙指縮放
      for (const n of ['gesturestart', 'gesturechange', 'gestureend']) {                    // iOS Safari 的縮放手勢
        document.addEventListener(n, e => e.preventDefault());
      }
      document.addEventListener('contextmenu', e => e.preventDefault());                    // 長按選單
      document.addEventListener('selectstart', e => e.preventDefault());                    // 文字選取
      document.addEventListener('dragstart', e => e.preventDefault());                      // 圖片拖曳
    },

    setMode(m) {
      if (m === T.mode) return;
      T.mode = m;
      if (m !== 'play') T.releaseAll();
    },

    // 按了鍵盤或手把 → 關閉觸控介面（同時取消自動連射）
    disable() {
      if (!T.enabled) return;
      T.enabled = false;
      T.releaseAll();
    },

    releaseStick() {
      const s = T.stick;
      s.active = false; s.id = -1; s.kx = s.ky = s.vx = s.vy = 0;
    },
    releaseAll() {
      T.releaseStick();
      pauseId = null; T.pauseDown = false; T.pauseEdge = false;
    },

    // 取走「剛按下暫停按鈕」的事件（每次按下只回傳一次 true）
    takePause() {
      const v = T.pauseEdge;
      T.pauseEdge = false;
      return v;
    },

    draw(ctx, t) {
      if (!T.enabled || T.mode !== 'play') return;
      const s = T.stick;

      // 圓盤：使用中畫在手指按下處（限制在畫面內），沒使用時在左下角畫一個淡淡的提示圓盤
      const cx = s.active ? M.clamp(s.ox, R + 10, W - R - 10) : HINT.x;
      const cy = s.active ? M.clamp(s.oy, TOP_LIMIT + R, H - R - 10) : HINT.y;
      const a = s.active ? 1 : (T.used ? 0.16 : 0.34);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, M.TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, M.TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';                       // 上下左右的小三角
      for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(R - 8, 0); ctx.lineTo(R - 20, -7); ctx.lineTo(R - 20, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const kx = s.active ? s.kx : 0, ky = s.active ? s.ky : 0;      // 搖桿頭
      const g = ctx.createRadialGradient(cx + kx - 6, cy + ky - 8, 4, cx + kx, cy + ky, KNOB);
      g.addColorStop(0, s.active ? 'rgba(200,245,255,0.95)' : 'rgba(255,255,255,0.85)');
      g.addColorStop(1, s.active ? 'rgba(90,200,255,0.75)' : 'rgba(255,255,255,0.45)');
      ctx.beginPath(); ctx.arc(cx + kx, cy + ky, KNOB, 0, M.TAU);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      ctx.restore();

      if (!T.used && !s.active) {                                     // 第一次使用的操作提示
        D.text(ctx, '手指拖曳移動', HINT.x, HINT.y + R + 22, { size: 15, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 4, weight: '900', alpha: 0.6 + 0.4 * Math.sin(t * 4) });
        D.text(ctx, '子彈自動連射', HINT.x, HINT.y + R + 42, { size: 13, align: 'center', color: '#ffd166', stroke: '#1b1240', strokeW: 4, weight: '900' });
      }

      // 暫停按鈕
      ctx.save();
      ctx.beginPath(); ctx.arc(PAUSE.x, PAUSE.y, PAUSE.r, 0, M.TAU);
      ctx.fillStyle = T.pauseDown ? 'rgba(255,255,255,0.45)' : 'rgba(10,14,50,0.55)'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(PAUSE.x - 8, PAUSE.y - 9, 5.5, 18);
      ctx.fillRect(PAUSE.x + 2.5, PAUSE.y - 9, 5.5, 18);
      ctx.restore();
    }
  };
})(window.BM = window.BM || {});
