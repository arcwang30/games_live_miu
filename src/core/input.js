// 輸入：鍵盤 + 遊戲控制器（Gamepad API）+ 滑鼠點擊選單
// 每個 frame 開頭呼叫 update()，結尾呼叫 endFrame()。
//
// 鍵盤：方向鍵 / WASD 移動、Space 射擊（按住連發）、Enter/Space 確認、Esc/P 暫停
// 手把（標準對應）：左搖桿 / 十字鍵移動、A/X/Y/RB/RT 射擊、A/Start 確認、B/Select 返回、Start 暫停
(function (BM) {
  const held = {};
  const justDown = {};
  const PREVENT = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };

  let padPrev = [];
  let stickPrev = { up: false, down: false, left: false, right: false };
  let canvas = null;
  let pendingClick = null;
  let pendingMove = false;
  let keyActivity = false;

  function readPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].connected) return list[i];
    }
    return null;
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * BM.CONFIG.W,
      y: (e.clientY - r.top) / r.height * BM.CONFIG.H
    };
  }

  const I = BM.Input = {
    ax: 0, ay: 0,          // 移動向量（-1~1，手把搖桿為類比）
    fire: false,           // 射擊鍵是否按住
    pressed: {             // 本 frame 剛按下（邊緣觸發）
      confirm: false, back: false, pause: false,
      up: false, down: false, left: false, right: false,
      mute: false, fullscreen: false
    },
    pad: null,
    usingPad: false,
    pointer: { x: -1, y: -1 },
    moved: false,
    click: null,

    attach(c) {
      canvas = c;
      window.addEventListener('keydown', e => {
        if (PREVENT[e.code]) e.preventDefault();
        if (!e.repeat) justDown[e.code] = true;
        held[e.code] = true;
        keyActivity = true;
        BM.Touch.disable();          // 用鍵盤就關掉觸控介面與自動連射
        BM.Audio.unlock();
      });
      window.addEventListener('keyup', e => { held[e.code] = false; });
      window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
      canvas.addEventListener('pointermove', e => { I.pointer = toLogical(e); pendingMove = true; });
      canvas.addEventListener('pointerdown', e => {
        I.pointer = toLogical(e);
        pendingClick = { x: I.pointer.x, y: I.pointer.y };
        BM.Audio.unlock();
      });
      // 手機瀏覽器要在手指「放開」時才算使用者操作，這時才能解鎖音效
      window.addEventListener('pointerup', () => BM.Audio.unlock());
      window.addEventListener('gamepadconnected', e => {
        if (BM.Game) BM.Game.toast('已連接遊戲控制器：' + e.gamepad.id.slice(0, 28));
      });
      window.addEventListener('gamepaddisconnected', () => {
        if (BM.Game) BM.Game.toast('遊戲控制器已中斷連線');
      });
    },

    update() {
      const pad = readPad();
      this.pad = pad;

      let px = 0, py = 0, padFire = false;
      const cur = [];
      const stick = { up: false, down: false, left: false, right: false };

      if (pad) {
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        const mag = Math.hypot(ax, ay), dz = 0.28;
        if (mag > dz) {
          const k = (Math.min(1, mag) - dz) / (1 - dz) / mag;   // 死區 + 重新縮放，搖桿手感更平順
          px = ax * k; py = ay * k;
        }
        for (let i = 0; i < pad.buttons.length; i++) {
          const b = pad.buttons[i];
          cur[i] = !!b && (b.pressed || b.value > 0.5);
        }
        if (cur[14]) px = -1;
        if (cur[15]) px = 1;
        if (cur[12]) py = -1;
        if (cur[13]) py = 1;
        padFire = !!(cur[0] || cur[2] || cur[3] || cur[5] || cur[7]);
        stick.left = ax < -0.6 || !!cur[14];
        stick.right = ax > 0.6 || !!cur[15];
        stick.up = ay < -0.6 || !!cur[12];
        stick.down = ay > 0.6 || !!cur[13];
      }

      const padEdge = i => !!cur[i] && !padPrev[i];
      let anyPadEdge = false;
      for (let i = 0; i < cur.length; i++) if (padEdge(i)) anyPadEdge = true;
      if (anyPadEdge) { BM.Audio.unlock(); BM.Touch.disable(); }   // 用手把就關掉觸控介面

      // 鍵盤移動
      const kx = (held.ArrowRight || held.KeyD ? 1 : 0) - (held.ArrowLeft || held.KeyA ? 1 : 0);
      const ky = (held.ArrowDown || held.KeyS ? 1 : 0) - (held.ArrowUp || held.KeyW ? 1 : 0);
      // 觸控虛擬圓盤（類比）；鍵盤 / 手把有輸入時優先
      const T = BM.Touch, ts = T.stick;
      const tx = ts.active ? ts.vx : 0, ty = ts.active ? ts.vy : 0;
      let ax2 = kx !== 0 ? kx : (px !== 0 ? px : tx);
      let ay2 = ky !== 0 ? ky : (py !== 0 ? py : ty);
      const m = Math.hypot(ax2, ay2);
      if (m > 1) { ax2 /= m; ay2 /= m; }
      this.ax = ax2;
      this.ay = ay2;
      this.fire = !!held.Space || padFire || T.enabled;    // 觸控模式：子彈自動連射，不需要按鈕

      const jd = c => !!justDown[c];
      const se = k => stick[k] && !stickPrev[k];
      const P = this.pressed;
      P.confirm = jd('Enter') || jd('NumpadEnter') || jd('Space') || padEdge(0) || padEdge(9);
      P.back = jd('Escape') || jd('Backspace') || padEdge(1) || padEdge(8);
      P.pause = jd('Escape') || jd('KeyP') || padEdge(9) || T.takePause();
      P.up = jd('ArrowUp') || jd('KeyW') || se('up');
      P.down = jd('ArrowDown') || jd('KeyS') || se('down');
      P.left = jd('ArrowLeft') || jd('KeyA') || se('left');
      P.right = jd('ArrowRight') || jd('KeyD') || se('right');
      P.mute = jd('KeyM');
      P.fullscreen = jd('KeyF');

      if (keyActivity) this.usingPad = false;
      else if (anyPadEdge || Math.abs(px) + Math.abs(py) > 0.5) this.usingPad = true;

      this.moved = pendingMove;
      this.click = pendingClick;
      padPrev = cur;
      stickPrev = stick;
    },

    endFrame() {
      for (const k in justDown) delete justDown[k];
      pendingClick = null;
      pendingMove = false;
      keyActivity = false;
    }
  };
})(window.BM = window.BM || {});
