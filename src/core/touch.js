// 手機 / 平板觸控操作（戰機跟在手指上方）：
//   - 按住畫面：手指位置出現虛擬搖桿圓盤，戰機會飛到圓盤「正上方」並 1:1 跟著手指移動，
//     所以戰機永遠在手指上方，不會被手指或圓盤擋住
//   - 放開後點擊新的位置：戰機會快速飛到新位置上方的定點（就算手指很快放開，也會飛到定點才停）
//   - 觸控模式下子彈自動連射（Input.fire 直接為 true），玩家只要操作位置
//   - 右上角暫停按鈕：按下後開啟暫停選單
//   - 鎖住畫面：擋掉瀏覽器的捲動、下拉重新整理、雙指縮放、長按選單、文字選取
//
// 何時啟用：裝置的主要輸入是觸控（pointer: coarse），或偵測到第一次觸控。
// 之後只要按了鍵盤或遊戲控制器就會自動關閉觸控介面，再觸控又會重新開啟。
(function (BM) {
  const C = BM.CONFIG, W = C.W, H = C.H, M = BM.M, D = BM.Draw, P = C.PLAYER;

  const OFFSET_Y = 105;               // 戰機（錨點）在手指上方的距離：讓噴射火焰尖端剛好在圓盤上緣
  const RING = 52;                    // 圓盤半徑（邏輯座標）
  const KNOB = 22;                    // 圓盤中心的搖桿頭半徑
  const TOP_LIMIT = 140;              // 這條線以上（HUD 區）按下不會開始操控，避免誤觸
  const HINT = { x: 110, y: 830 };    // 沒有觸控時，提示用圓盤的位置
  const PAUSE = { x: W - 38, y: 112, r: 22, hit: 34 };   // 暫停按鈕（預備機圖示下方）
  const PULSE_TIME = 0.4;             // 新點擊位置的提示圈持續時間（秒）

  let canvas = null;
  let pauseId = null;

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  // 手指位置 → 戰機的目標定點（在手指正上方，並限制在玩家活動範圍內）
  function setTarget(p) {
    T.target = { x: M.clamp(p.x, P.minX, P.maxX), y: M.clamp(p.y - OFFSET_Y, P.minY, P.maxY) };
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
      s.fx = p.x; s.fy = p.y;
      setTarget(p);                              // 戰機立刻朝新的定點快速飛過去
      T.pulseAt = performance.now();
      T.used = true;
    }
  }

  function onMove(e) {
    const s = T.stick;
    if (!s.active || e.pointerId !== s.id) return;
    const p = toLogical(e);
    s.fx = p.x; s.fy = p.y;
    setTarget(p);
  }

  function onUp(e) {
    const s = T.stick;
    if (s.active && e.pointerId === s.id) T.releaseStick();   // 放開手指：目標定點保留，戰機會飛到定點才停
    if (e.pointerId === pauseId) { pauseId = null; T.pauseDown = false; }
  }

  const T = BM.Touch = {
    enabled: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
    mode: 'none',                   // 'play' 時才會顯示並接受虛擬控制
    used: false,                    // 是否已經用過（用過後提示變淡）
    pauseDown: false,
    pauseEdge: false,
    pulseAt: -1e9,
    target: null,                   // 戰機要飛去的定點 {x,y}；null = 沒有觸控目標
    stick: { active: false, id: -1, fx: 0, fy: 0 },     // 目前按住的手指位置

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
      s.active = false; s.id = -1;
    },
    releaseAll() {
      T.releaseStick();
      T.target = null;
      pauseId = null; T.pauseDown = false; T.pauseEdge = false;
    },

    // 戰機重置 / 重生時呼叫：舊的定點作廢；如果手指還按著，就重新對準手指
    resync() {
      const s = T.stick;
      if (s.active) setTarget({ x: s.fx, y: s.fy });
      else T.target = null;
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

      // 虛擬搖桿圓盤：按住時畫在手指位置（戰機就在它的正上方）；沒按時在左下角畫一個淡淡的提示圓盤
      const cx = s.active ? M.clamp(s.fx, RING + 10, W - RING - 10) : HINT.x;
      const cy = s.active ? s.fy : HINT.y;
      const a = s.active ? 1 : (T.used ? 0.16 : 0.34);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(cx, cy, RING, 0, M.TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, RING * 0.6, 0, M.TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';                       // 上下左右的小三角
      for (let k = 0; k < 4; k++) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(RING - 6, 0); ctx.lineTo(RING - 16, -6); ctx.lineTo(RING - 16, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const g = ctx.createRadialGradient(cx - 5, cy - 6, 3, cx, cy, KNOB);   // 搖桿頭（在圓盤中心 = 手指位置）
      g.addColorStop(0, s.active ? 'rgba(200,245,255,0.95)' : 'rgba(255,255,255,0.85)');
      g.addColorStop(1, s.active ? 'rgba(90,200,255,0.75)' : 'rgba(255,255,255,0.45)');
      ctx.beginPath(); ctx.arc(cx, cy, KNOB, 0, M.TAU);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      ctx.restore();

      // 新點擊位置的提示圈：標出戰機即將飛去的定點
      const pk = (performance.now() - T.pulseAt) / 1000 / PULSE_TIME;
      if (T.target && pk >= 0 && pk < 1) {
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - pk);
        ctx.strokeStyle = '#9ff3ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(T.target.x, T.target.y, 12 + 34 * (1 - pk), 0, M.TAU); ctx.stroke();
        ctx.restore();
      }

      if (!T.used && !s.active) {                                     // 第一次使用的操作提示
        D.text(ctx, '按住畫面：戰機在手指上方', HINT.x + 40, HINT.y + RING + 22, { size: 14, align: 'center', color: '#fff', stroke: '#1b1240', strokeW: 4, weight: '900', alpha: 0.6 + 0.4 * Math.sin(t * 4) });
        D.text(ctx, '子彈自動連射', HINT.x + 40, HINT.y + RING + 42, { size: 13, align: 'center', color: '#ffd166', stroke: '#1b1240', strokeW: 4, weight: '900' });
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
