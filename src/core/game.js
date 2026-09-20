// 遊戲引擎外殼：畫布縮放（保持 9:16）、主迴圈、場景切換、提示訊息
(function (BM) {
  const C = BM.CONFIG;
  const scenes = {};
  let canvas, ctx, scale = 1;
  let current = null;
  let last = 0;
  let toastText = '', toastT = 0;

  function resize() {
    // 依 #stage 的實際內容區決定畫布大小（已扣掉瀏海 / 圓角的安全區 padding；
    // 手機網址列收合造成可視高度改變時，stage 也會跟著變）
    const stage = canvas.parentElement, cs = getComputedStyle(stage);
    const vw = stage.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const vh = stage.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    let h = vh, w = h * C.W / C.H;
    if (w > vw) { w = vw; h = w * C.H / C.W; }
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor(h) + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = canvas.width / C.W;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // 任何一格出錯都不會讓遊戲默默凍結：改成在畫面上顯示錯誤原因（點一下重新整理）
    if (failure) drawFailure();
    else {
      try { step(dt); } catch (e) { onError(e); }
    }
    requestAnimationFrame(frame);
  }

  function step(dt) {
    const I = BM.Input;
    I.update();
    if (I.pressed.mute) BM.Game.toast(BM.Audio.toggleMute() ? '音效：關' : '音效：開');
    if (I.pressed.fullscreen) {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    }

    if (current) current.update(dt);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (current) current.draw(ctx);
    drawToast(dt);

    I.endFrame();
  }

  // ---- 錯誤處理 ----
  let failure = null;                 // { message, where }：發生錯誤後顯示的資訊

  function onError(e) {
    console.error(e);
    const m = /(src\/[^\s):?]+\.js)[^\s:]*:(\d+)/.exec(String(e && e.stack));   // 從呼叫堆疊找出是哪個檔案的第幾行
    failure = {
      message: String((e && e.message) || e),
      where: m ? m[1] + '（第 ' + m[2] + ' 行）' : ''
    };
    try { BM.Audio.stopMusic(); } catch (_) { /* ignore */ }
  }

  function wrap(text, n) {            // 中英文混排的簡易斷行
    const out = [];
    for (let i = 0; i < text.length; i += n) out.push(text.slice(i, i + n));
    return out;
  }

  function drawFailure() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = 'rgba(30,6,20,0.94)';
    ctx.fillRect(0, 0, C.W, C.H);
    const D = BM.Draw;
    D.text(ctx, '遊戲發生錯誤', C.W / 2, 190, { size: 46, align: 'center', color: '#ff8fa3', stroke: '#3a0d2a', strokeW: 8, weight: '900' });
    let y = 270;
    for (const line of wrap(failure.message, 30)) { D.text(ctx, line, C.W / 2, y, { size: 19, align: 'center', color: '#ffe9ee', family: D.NUM, weight: '700' }); y += 28; }
    if (failure.where) { y += 8; D.text(ctx, failure.where, C.W / 2, y, { size: 17, align: 'center', color: '#ffd166', family: D.NUM, weight: '700' }); y += 28; }
    y += 30;
    const tips = ['常見原因：有檔案沒有更新到，', '或被瀏覽器快取了舊版。', '', '請確認 index.html 載入的所有', '.js 檔案都已上傳，然後按 Ctrl+F5', '（手機：清除網站快取）重新整理。', '', '版本：index ' + (window.BM_INDEX_VERSION || '?') + ' ／ config ' + (C.VERSION || '?')];
    for (const line of tips) { D.text(ctx, line, C.W / 2, y, { size: 18, align: 'center', color: '#c9d3ff' }); y += 28; }
    D.text(ctx, '點一下畫面重新整理', C.W / 2, 840, { size: 24, align: 'center', color: '#fff', stroke: '#3a0d2a', strokeW: 6, weight: '900', alpha: 0.6 + 0.4 * Math.sin(performance.now() / 250) });
  }

  function drawToast(dt) {
    if (toastT <= 0) return;
    toastT -= dt;
    const a = Math.min(1, toastT / 0.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    BM.Draw.roundRect(ctx, C.W / 2 - 170, 96, 340, 36, 18);
    ctx.fill();
    ctx.restore();
    BM.Draw.text(ctx, toastText, C.W / 2, 115, { size: 16, align: 'center', color: '#fff', alpha: a });
  }

  BM.Game = {
    init(c) {
      canvas = c;
      ctx = canvas.getContext('2d');
      BM.Input.attach(canvas);
      BM.Touch.attach(canvas);
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', () => setTimeout(resize, 120));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
      window.addEventListener('blur', () => { if (current && current.onBlur) current.onBlur(); });
      // 手機切到別的 App / 分頁時自動暫停
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && current && current.onBlur) current.onBlur();
      });
      // 錯誤畫面出現後，點一下 / 按任意鍵就重新整理頁面
      window.addEventListener('pointerdown', () => { if (failure) location.reload(); });
      window.addEventListener('keydown', () => { if (failure) location.reload(); });
      resize();
      requestAnimationFrame(t => { last = t; frame(t); });
    },
    step,                              // 除錯 / 測試用：手動跑一格（含錯誤處理的外層由 frame 負責）
    get failure() { return failure; },
    onError,
    register(name, scene) { scenes[name] = scene; },
    setScene(name, params) {
      if (current && current.exit) current.exit();
      current = scenes[name];
      current.enter(params);
    },
    toast(text) { toastText = text; toastT = 2.4; },
    get scene() { return current; }   // 除錯用：目前的場景
  };
})(window.BM = window.BM || {});
