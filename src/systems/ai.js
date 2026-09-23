// 4 種敵機 AI。每種各有一個「威脅來源」，互相制衡，難度均衡：
//
//   0 迅捷鼠 Diver     波浪俯衝 + 1~2 發瞄準彈      威脅：位置預判（軌跡固定、好閃）  血量 1（第 2 波起射 2 發）
//   1 狙擊鼠 Sniper    懸停鎖定，紅線預警後連射      威脅：子彈（有預警線，鎖定後 0.3 秒才發射）血量 2
//   2 衝撞鼠 Kamikaze  蓄力後追蹤衝撞，無子彈        威脅：身體（轉彎半徑大，橫移就能閃）血量 1
//   3 旋轉鼠 Looper    迴旋一圈半後俯衝 + 三向散彈    威脅：範圍彈幕（前搖長，出手慢）血量 1
//
// 每個 AI 有 launch(e, w)（離開陣形開始攻擊）與 update(e, dt, w)（每 frame 行為）。
// w = PlayScene，提供 w.player、w.params、w.fireBullet()、w.sfx()。
// 攻擊結束時呼叫 e.startReturn(fromTop) 回到陣形。
(function (BM) {
  const C = BM.CONFIG, M = BM.M, W = C.W, H = C.H, PI = Math.PI;

  // 瞄準玩家開一槍（敵機已經飛到玩家下方就不射，避免不合理的反向彈）
  function aimedShot(e, w, speedMul, spread) {
    const p = w.player;
    if (e.y > p.y - 30) return;
    const a = Math.atan2(p.y - e.y, p.x - e.x) + (spread || 0);
    w.fireBullet(e.x, e.y + 6, a, w.params.bulletSpeed * (speedMul || 1));
  }

  function spread3(e, w, gap) {
    const p = w.player;
    if (e.y > p.y - 30) return;
    const base = Math.atan2(p.y - e.y, p.x - e.x);
    for (const k of [-1, 0, 1]) w.fireBullet(e.x, e.y + 6, base + k * gap, w.params.bulletSpeed * 0.9);
  }

  function out(e, m) { return e.y > H + m || e.x < -m || e.x > W + m || e.y < -140; }
  function targetX(w) { return w.player.alive ? w.player.x : W / 2; }

  const AI = {};

  // ---------------------------------------------------------------- 迅捷鼠
  AI[0] = {
    launch(e, w) {
      const vy = 250 * w.params.speedMul;
      const a = e.ai = {
        t: 0, x0: e.x, y0: e.y, vy, shots: 0,
        amp: M.rand(45, 80), freq: M.rand(2.4, 3.4)
      };
      const T = Math.max(0.8, (w.player.y - a.y0) / vy);
      a.drift = (targetX(w) - a.x0) / T * 0.75;       // 只往玩家方向修正 75%，保留閃避空間
      e.state = 'attack';
      w.sfx('dive');
    },
    update(e, dt, w) {
      const a = e.ai;
      a.t += dt;
      const px = e.x, py = e.y;
      e.x = M.clamp(a.x0 + a.drift * a.t + a.amp * Math.sin(a.freq * a.t), 16, W - 16);
      e.y = a.y0 + a.vy * a.t;
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy > 0.0001) e.heading = M.lerpAngle(e.heading, Math.atan2(dy, dx), Math.min(1, 10 * dt));

      if (a.shots === 0 && e.y > a.y0 + 130) { aimedShot(e, w, 1); a.shots = 1; w.sfx('enemyShot'); }
      if (a.shots === 1 && w.wave >= 2 && e.y > 560) { aimedShot(e, w, 1); a.shots = 2; w.sfx('enemyShot'); }
      if (out(e, 40)) e.startReturn(true);
    }
  };

  // ---------------------------------------------------------------- 狙擊鼠
  AI[1] = {
    launch(e, w) {
      e.ai = {
        phase: 'move', t: 0, volley: 0, shotsLeft: 0, burstT: 0,
        maxVolley: w.wave >= 4 ? 3 : 2,
        burst: w.wave >= 5 ? 3 : 2,
        hx: M.clamp(targetX(w) + M.rand(-140, 140), 50, W - 50),
        hy: M.rand(585, 630)                                    // 陣形下緣與玩家活動區之間
      };
      e.state = 'attack';
      w.sfx('dive');
    },
    update(e, dt, w) {
      const a = e.ai, p = w.player;
      if (a.phase === 'move') {
        const dx = a.hx - e.x, dy = a.hy - e.y, d = Math.hypot(dx, dy);
        const step = 260 * w.params.speedMul * dt;
        if (d <= step + 2) {
          e.x = a.hx; e.y = a.hy;
          a.phase = 'aim'; a.t = 0; a.aimTime = 0.95; a.locked = false;
        } else {
          e.x += dx / d * step; e.y += dy / d * step;
          e.heading = M.lerpAngle(e.heading, Math.atan2(dy, dx), Math.min(1, 10 * dt));
        }
      } else if (a.phase === 'aim') {
        a.t += dt;
        e.tele = Math.min(1, a.t / a.aimTime);
        if (!a.locked) {
          e.x += M.clamp(targetX(w) - e.x, -70 * dt, 70 * dt);            // 慢慢橫移追玩家
          a.angle = Math.atan2(p.y - e.y, p.x - e.x);
          if (a.t >= a.aimTime - 0.3) { a.locked = true; w.sfx('lock'); }   // 開火前 0.3 秒鎖定，玩家可閃
        }
        e.aimAngle = a.angle;
        e.aimLocked = a.locked;
        e.heading = M.lerpAngle(e.heading, a.angle, Math.min(1, 12 * dt));
        if (a.t >= a.aimTime) { a.phase = 'burst'; a.shotsLeft = a.burst; a.burstT = 0; }
      } else if (a.phase === 'burst') {
        a.burstT -= dt;
        if (a.burstT <= 0) {
          w.fireBullet(e.x, e.y + 6, a.angle, w.params.bulletSpeed * 1.3);
          w.sfx('enemyShot');
          a.shotsLeft--;
          a.burstT = 0.16;
          if (a.shotsLeft <= 0) {
            a.volley++;
            e.aimAngle = null;
            if (a.volley >= a.maxVolley) { e.tele = 0; e.startReturn(false); }
            else { a.phase = 'aim'; a.t = 0; a.aimTime = 0.75; a.locked = false; }
          }
        }
      }
    }
  };

  // ---------------------------------------------------------------- 衝撞鼠
  AI[2] = {
    launch(e, w) {
      e.ai = {
        phase: 'windup', t: 0, life: 0, speed: 120, x0: e.x, y0: e.y,
        max: 285 * w.params.speedMul,
        turn: (() => {                                        // 轉向速度有限 -> 可以橫移閃開；以「輪」為單位漸進（跟 waves.js 的難度曲線一致）
          const RL = C.BOSS.EVERY * 3, pos = ((w.wave - 1) % RL) + 1, rb = Math.min(4, Math.ceil(w.wave / RL) - 1);
          return Math.min(2.3 + 0.15 * rb, 1.5 + 0.07 * (pos - 1) + 0.15 * rb);
        })()
      };
      e.warn = true;
      e.state = 'attack';
      w.sfx('lock');
    },
    update(e, dt, w) {
      const a = e.ai, p = w.player;
      if (a.phase === 'windup') {                              // 0.5 秒蓄力：抖動 + 往後拉，頭上冒驚嘆號
        a.t += dt;
        const k = Math.min(1, a.t / 0.5);
        e.x = a.x0 + Math.sin(a.t * 70) * 1.6;
        e.y = a.y0 - 18 * M.easeOutCubic(k);
        e.heading = M.lerpAngle(e.heading, PI / 2, Math.min(1, 12 * dt));
        if (a.t >= 0.5) { a.phase = 'chase'; e.warn = false; e.heading = PI / 2; w.sfx('dive'); }
      } else {
        a.life += dt;
        a.speed = Math.min(a.max, a.speed + 320 * dt);
        const committed = !p.alive || e.y > p.y + 40;           // 衝過玩家後不再追
        if (!committed) {
          const want = Math.atan2(p.y - e.y, p.x - e.x);
          const diff = M.wrapAngle(want - e.heading);
          e.heading += M.clamp(diff, -a.turn * dt, a.turn * dt);
        }
        e.x += Math.cos(e.heading) * a.speed * dt;
        e.y += Math.sin(e.heading) * a.speed * dt;
        if (out(e, 40)) e.startReturn(true);
        else if (a.life > 4.2) e.startReturn(false);
      }
    }
  };

  // ---------------------------------------------------------------- 旋轉鼠
  AI[3] = {
    launch(e, w) {
      e.heading = -PI / 2;
      e.ai = {
        phase: 'loop', s: e.x < W / 2 ? 1 : -1,            // 往畫面中央的方向繞圈
        turned: 0, shots: 0,
        v: 250 * w.params.speedMul, omega: 3.4
      };
      e.state = 'attack';
      w.sfx('dive');
    },
    update(e, dt, w) {
      const a = e.ai, p = w.player;
      if (a.phase === 'loop') {                              // 迴旋 1.5 圈（540 度），結束時剛好朝下
        const d = a.omega * dt;
        e.heading += a.s * d;
        a.turned += d;
        e.x += Math.cos(e.heading) * a.v * dt;
        e.y += Math.sin(e.heading) * a.v * dt;
        if (a.turned >= 3 * PI) {
          e.heading = PI / 2;
          a.phase = 'dive';
          spread3(e, w, 0.34);
          w.sfx('enemyShot');
        }
      } else {                                               // 俯衝：緩慢朝玩家修正（限制在正下方 ±26 度內）
        const spd = 300 * w.params.speedMul;
        const want = M.clamp(Math.atan2(p.y - e.y, p.x - e.x), PI / 2 - 0.45, PI / 2 + 0.45);
        e.heading += M.clamp(M.wrapAngle(want - e.heading), -0.9 * dt, 0.9 * dt);
        e.x += Math.cos(e.heading) * spd * dt;
        e.y += Math.sin(e.heading) * spd * dt;
        if (a.shots === 0 && w.wave >= 3 && e.y > 640) { spread3(e, w, 0.34); w.sfx('enemyShot'); a.shots = 1; }
        if (out(e, 40)) e.startReturn(true);
      }
    }
  };

  BM.AI = AI;
})(window.BM = window.BM || {});
