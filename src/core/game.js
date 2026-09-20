// 遊戲引擎外殼：畫布縮放（保持 9:16）、主迴圈、場景切換、提示訊息
(function (BM) {
  const C = BM.CONFIG;
  const scenes = {};
  let canvas, ctx, scale = 1;
  let current = null;
  let last = 0;
  let toastText = '', toastT = 0;

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
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
    requestAnimationFrame(frame);
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
      window.addEventListener('resize', resize);
      window.addEventListener('blur', () => { if (current && current.onBlur) current.onBlur(); });
      resize();
      requestAnimationFrame(t => { last = t; frame(t); });
    },
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
