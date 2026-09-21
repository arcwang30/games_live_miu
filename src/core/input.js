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
  let typedNow = [];                       // 這個 frame 敲下的英數字（簽名用）
  let wheelAcc = 0, dragAcc = 0, downNow = false, downPos = null, lastY = 0;   // 滾輪 / 按住拖曳的累積量（邏輯座標，捲動長文字用）
  let padEdges = [];                       // 這個 frame 剛按下的手把按鈕
  const navHold = { up: 0, down: 0, left: 0, right: 0 };   // 方向鍵 / 十字鍵按住的起始時間（連發用）
  const NAV_DELAY = 400, NAV_RATE = 90;    // 按住多久開始連發、連發間隔（毫秒）

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
    target: null,          // 觸控：戰機要飛去的定點 {x,y}（null = 沒有）
    fire: false,           // 射擊鍵是否按住
    pressed: {             // 本 frame 剛按下（邊緣觸發）
      confirm: false, back: false, pause: false,
      up: false, down: false, left: false, right: false,
      mute: false, fullscreen: false
    },
    // 簽名輸入用（只有簽名畫面會用到）：
    textMode: false,       // true 時鍵盤字母不會觸發 M 靜音 / F 全螢幕
    wheel: 0,              // 本 frame 滑鼠滾輪的捲動量（邏輯座標像素，往下滾為正）
    drag: 0,               // 本 frame 按住畫面上下拖曳的量（手指往上拖 = 正，內容往下捲）
    pointerDown: false,    // 現在有沒有按住（滑鼠左鍵 / 手指）
    downPos: null,         // 這次按下時的位置 {x, y}
    typed: [],             // 本 frame 敲下的英數字（'A'~'Z'、'0'~'9'；含主鍵盤與數字鍵盤）
    nav: { up: false, down: false, left: false, right: false },   // 只含「方向鍵 + 手把方向」（不含 WASD，WASD 是字母），按住會連發
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
        if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const m = /^(?:Key([A-Z])|Digit([0-9])|Numpad([0-9]))$/.exec(e.code);
          if (m) typedNow.push(m[1] || m[2] || m[3]);
        }
        BM.Touch.disable();          // 用鍵盤就關掉觸控介面與自動連射
        BM.Audio.unlock();
      });
      window.addEventListener('keyup', e => { held[e.code] = false; });
      window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
      canvas.addEventListener('pointermove', e => {
        I.pointer = toLogical(e); pendingMove = true;
        if (downNow) { dragAcc += lastY - I.pointer.y; lastY = I.pointer.y; }      // 按住拖曳：往上拖 = 內容往下捲
      });
      canvas.addEventListener('wheel', e => {                                     // 滑鼠滾輪（長文字捲動用）
        const r = canvas.getBoundingClientRect();
        wheelAcc += e.deltaY * (e.deltaMode === 1 ? 20 : 1) * BM.CONFIG.W / r.width;
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('pointerdown', e => {
        I.pointer = toLogical(e);
        pendingClick = { x: I.pointer.x, y: I.pointer.y };
        downNow = true; downPos = { x: I.pointer.x, y: I.pointer.y }; lastY = I.pointer.y;
        BM.Audio.unlock();
      });
      // 手機瀏覽器要在手指「放開」時才算使用者操作，這時才能解鎖音效
      window.addEventListener('pointerup', () => { downNow = false; BM.Audio.unlock(); });
      window.addEventListener('pointercancel', () => { downNow = false; });
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
      padEdges = [];
      for (let i = 0; i < cur.length; i++) if (padEdge(i)) { anyPadEdge = true; padEdges[i] = true; }
      if (anyPadEdge) { BM.Audio.unlock(); BM.Touch.disable(); }   // 用手把就關掉觸控介面

      // 鍵盤移動
      const kx = (held.ArrowRight || held.KeyD ? 1 : 0) - (held.ArrowLeft || held.KeyA ? 1 : 0);
      const ky = (held.ArrowDown || held.KeyS ? 1 : 0) - (held.ArrowUp || held.KeyW ? 1 : 0);
      let ax2 = kx !== 0 ? kx : px;
      let ay2 = ky !== 0 ? ky : py;
      const m = Math.hypot(ax2, ay2);
      if (m > 1) { ax2 /= m; ay2 /= m; }
      this.ax = ax2;
      this.ay = ay2;
      // 觸控：戰機要飛去的定點（在手指上方）；鍵盤 / 手把有輸入時優先，這時不使用觸控定點
      const T = BM.Touch;
      this.target = (T.enabled && T.mode === 'play' && ax2 === 0 && ay2 === 0) ? T.target : null;
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
      P.mute = jd('KeyM') && !this.textMode;
      P.fullscreen = jd('KeyF') && !this.textMode;

      // 方向鍵 + 手把方向（不含 WASD）：邊緣觸發，按住一小段時間後連發
      const now = performance.now(), N = this.nav;
      const dirHeld = { up: !!held.ArrowUp || stick.up, down: !!held.ArrowDown || stick.down, left: !!held.ArrowLeft || stick.left, right: !!held.ArrowRight || stick.right };
      for (const d of ['up', 'down', 'left', 'right']) {
        const key = 'Arrow' + d[0].toUpperCase() + d.slice(1);
        const edge = jd(key) || se(d);
        if (!dirHeld[d]) { navHold[d] = 0; N[d] = false; continue; }
        if (edge || !navHold[d]) { navHold[d] = now + NAV_DELAY; N[d] = true; }
        else if (now >= navHold[d]) { navHold[d] = now + NAV_RATE; N[d] = true; }
        else N[d] = false;
      }
      this.typed = typedNow; typedNow = [];

      if (keyActivity) this.usingPad = false;
      else if (anyPadEdge || Math.abs(px) + Math.abs(py) > 0.5) this.usingPad = true;

      this.moved = pendingMove;
      this.click = pendingClick;
      this.wheel = wheelAcc; this.drag = dragAcc; wheelAcc = 0; dragAcc = 0;
      this.pointerDown = downNow; this.downPos = downPos;
      padPrev = cur;
      stickPrev = stick;
    },

    key(code) { return !!justDown[code]; },          // 這個 frame 剛按下的鍵盤按鍵（KeyboardEvent.code）
    padPressed(i) { return !!padEdges[i]; },          // 這個 frame 剛按下的手把按鈕（標準對應：0 = A、1 = B、9 = Start）

    endFrame() {
      for (const k in justDown) delete justDown[k];
      pendingClick = null;
      pendingMove = false;
      keyActivity = false;
    }
  };
})(window.BM = window.BM || {});
