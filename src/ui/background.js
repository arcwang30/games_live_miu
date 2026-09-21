// 縱向捲動的天空背景，含晝夜變化：
//   - 四組調色盤：menu（主選單，維持原本的深藍夜空）、day 白天、dusk 黃昏、night 黑夜（= 原本的背景再調暗）
//   - 遊戲中依波數切換：每 CONFIG.DAYNIGHT.every（5）個波段換一次，白天 → 黃昏 → 黑夜循環；
//     打敗 BOSS 後開始轉場，天空顏色、太陽 / 月亮、星星、雲的顏色、城鎮燈火、場景小點綴都是平滑漸變
//   - 起司球（老鼠進場的來源）就是白天的「太陽」：白天有太陽般的放射光芒、黃昏光芒慢慢減弱
//     （黃昏 5 個波段之內還會一波比一波弱）、黑夜沒有光芒
//   - 場景小點綴（畫在最底層、低透明度，數量很少，不影響判讀子彈）：
//       白天 成群飛過的小鳥、遠方的熱氣球
//       黃昏 滑翔的海鷗剪影（沒有夕陽）
//       黑夜 流星、螢火蟲、偶爾飛過的小 UFO，城鎮窗戶亮燈
(function (BM) {
  const C = BM.CONFIG, W = C.W, H = C.H, M = BM.M, MOON = C.MOON, DN = C.DAYNIGHT;

  // ------------------------------------------------ 調色盤（全部是數字，轉場時逐項插值）
  const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  function pal(o) {
    const t = rgb(o.top), m = rgb(o.mid), b = rgb(o.bot);
    return {
      tr: t[0], tg: t[1], tb: t[2], mr: m[0], mg: m[1], mb: m[2], br: b[0], bg: b[1], bb: b[2],   // 天空漸層（上 / 中 / 下）
      star: o.star,                                                       // 星星可見度
      moonA: o.moonA,                                                     // 起司球亮度
      rays: o.rays,                                                       // 起司球的太陽光芒強度（白天 1、黃昏漸弱、黑夜 0）
      cloud: o.cloud,                                                     // 雲的透明度倍率
      tWhite: o.tint[0], tWarm: o.tint[1], tCool: o.tint[2],              // 雲的顏色權重（白 / 暖 / 冷）
      kDay: o.sky[0], kDusk: o.sky[1], kNight: o.sky[2],                  // 城鎮剪影配色權重
      oBird: o.orn[0], oBalloon: o.orn[1], oGull: o.orn[2], oMeteor: o.orn[3], oFly: o.orn[4], oUfo: o.orn[5]   // 小點綴強度
    };
  }

  const PALETTES = {
    // 天空上沒有太陽 / 夕陽：白天由起司球擔任太陽（rays=1 有放射光芒）；黃昏光芒減弱；黑夜沒有光芒
    menu:  pal({ top: '#0d1240', mid: '#22378a', bot: '#3f7fd6', star: 1,    moonA: 1,   rays: 0,    cloud: 1,   tint: [1, 0, 0], sky: [0, 0, 1], orn: [0, 0, 0, 0, 0, 0] }),
    day:   pal({ top: '#2c78d6', mid: '#5da6ee', bot: '#9fd0f8', star: 0,    moonA: 1,   rays: 1,    cloud: 4.5, tint: [1, 0, 0], sky: [1, 0, 0], orn: [1, 1, 0, 0, 0, 0] }),
    dusk:  pal({ top: '#2d2b73', mid: '#c25a8a', bot: '#f58f7c', star: 0.35, moonA: 0.95, rays: 0.55, cloud: 3.4, tint: [0, 1, 0], sky: [0, 1, 0], orn: [0, 0, 1, 0, 0, 0] }),
    night: pal({ top: '#070a23', mid: '#131e4c', bot: '#234676', star: 1,    moonA: 1,   rays: 0,    cloud: 0.8, tint: [0, 0, 1], sky: [0, 0, 1], orn: [0, 0, 0, 1, 1, 1] })
  };
  const DUSK_RAYS = [0.65, 0.22];   // 黃昏 5 個波段之內光芒從 0.65 慢慢減弱到 0.22

  const rgbStr = (r, g, b) => 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';

  // ------------------------------------------------ 城鎮剪影（三種配色各預先畫好，依權重混合）
  const SKYLINE_H = 70;
  let skylines = null;          // { day, dusk, night }（畫布）
  let layout = [];              // 建築配置（三種配色共用）

  function buildLayout() {
    layout = [];
    let x = -6;
    while (x < W) {
      const w = M.randInt(26, 46), h = M.randInt(18, 38), wins = [];
      for (let wy = H - h + 6; wy < H - 6; wy += 11) for (let wx = x + 6; wx < x + w - 6; wx += 12) if (Math.random() < 0.55) wins.push([wx, wy]);
      layout.push({ x, w, h, wins });
      x += w + M.randInt(2, 8);
    }
  }

  function renderSkyline(color, winColor) {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = SKYLINE_H * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    g.translate(0, -(H - SKYLINE_H));
    for (const b of layout) {
      g.fillStyle = color;
      g.fillRect(b.x, H - b.h, b.w, b.h);
      g.beginPath();                                         // 貓耳屋頂
      g.moveTo(b.x - 2, H - b.h);
      g.lineTo(b.x + b.w * 0.22, H - b.h - 12);
      g.lineTo(b.x + b.w * 0.5, H - b.h);
      g.lineTo(b.x + b.w * 0.78, H - b.h - 12);
      g.lineTo(b.x + b.w + 2, H - b.h);
      g.closePath(); g.fill();
      if (winColor) {                                        // 燈火窗戶
        g.fillStyle = winColor;
        for (const w of b.wins) g.fillRect(w[0], w[1], 5, 5);
      }
    }
    return c;
  }

  // ------------------------------------------------ 場景狀態
  let stars = [], clouds = [];
  let cur = null, from = null, to = null;      // 目前值 / 轉場起點 / 轉場終點（都是調色盤物件）
  let tk = 1, tdur = 4;                        // 轉場進度 0~1 與長度（秒）
  let phaseName = 'menu', phaseKey = 'menu';   // phaseKey：時段名稱（黃昏再加上「光芒進度」），用來判斷是否需要重新轉場

  // 小點綴（數量很少：出現頻率低、成群的隻數也少）
  const orn = { birds: [], balloons: [], gulls: [], meteors: [], ufos: [] };
  let flies = [];
  const timers = { bird: 5, balloon: 20, gull: 5, meteor: 8, ufo: 30 };

  function lerpPal(a, b, k) {
    const o = {};
    for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k;
    return o;
  }

  BM.Background = {
    init() {
      buildLayout();
      skylines = {
        day: renderSkyline('#3f66a8', 'rgba(214,236,255,0.72)'),             // 白天：亮藍灰色、窗戶保留（淡藍玻璃色、沒有燈光）
        dusk: renderSkyline('#2a2050', 'rgba(255,214,120,0.6)'),          // 黃昏：紫色剪影、部分亮燈
        night: renderSkyline('#0a1038', 'rgba(255,220,120,0.85)')         // 黑夜 / 主選單：原本的樣子
      };
      stars = [];
      for (let i = 0; i < 70; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: M.rand(0.6, 1.8), tw: Math.random() * 6, v: M.rand(8, 22) });
      }
      clouds = [];
      for (let i = 0; i < 9; i++) {
        const far = i < 5;
        clouds.push({
          x: Math.random() * W, y: Math.random() * (H + 120) - 60,
          v: far ? M.rand(26, 38) : M.rand(70, 95),
          s: far ? M.rand(0.6, 0.9) : M.rand(1.0, 1.5),
          a: far ? 0.10 : 0.17,
          k: M.randInt(0, 2)
        });
      }
      flies = [];
      for (let i = 0; i < 5; i++) flies.push({ x: M.rand(20, W - 20), y: M.rand(720, 930), ph: Math.random() * 6, sp: M.rand(0.3, 0.7) });
      cur = Object.assign({}, PALETTES.menu);
      phaseName = phaseKey = 'menu';
      tk = 1;
    },

    // ---- 晝夜 ----
    // 第 wave 波該是哪個時段：每 DN.every 個波段換一次，依 DN.order 循環（第 1~5 波 = 白天）
    phaseFor(wave) { return DN.order[Math.floor((wave - 1) / DN.every) % DN.order.length]; },
    get phase() { return phaseName; },
    get ornaments() { return orn; },          // 測試 / 除錯用：目前場上的小點綴
    get transitioning() { return tk < 1; },

    // 切換到某個時段：instant=true 立即套用；否則用 duration 秒平滑轉場（從「目前看到的樣子」出發，轉場途中再切換也不會跳）。
    // progress（0~1，只有黃昏會用到）：這個時段裡的第幾波，黃昏的起司球光芒會隨著 progress 慢慢減弱。
    setPhase(name, opts) {
      opts = opts || {};
      if (!PALETTES[name]) return;
      const target = Object.assign({}, PALETTES[name]);
      let key = name;
      if (name === 'dusk' && opts.progress !== undefined) {
        target.rays = M.lerp(DUSK_RAYS[0], DUSK_RAYS[1], M.clamp(opts.progress, 0, 1));
        key = 'dusk:' + opts.progress.toFixed(2);
      }
      if (key === phaseKey && !opts.instant) return;
      phaseKey = key;
      phaseName = name;
      if (opts.instant) { cur = Object.assign({}, target); tk = 1; return; }
      from = Object.assign({}, cur);
      to = target;
      tk = 0;
      tdur = opts.duration || 4;
    },

    // ---- 起司月亮的狀態：shake=進場前抖動（0/1）、glow=正在噴出老鼠時發亮（會平滑過渡）----
    moonShake: 0, moonGlow: 0, moonGlowTarget: 0,
    moon(shake, glow) { this.moonShake = shake; this.moonGlowTarget = glow; },

    update(dt) {
      this.moonGlow += (this.moonGlowTarget - this.moonGlow) * Math.min(1, 6 * dt);
      if (tk < 1) {
        tk = Math.min(1, tk + dt / tdur);
        cur = lerpPal(from, to, M.easeInOutSine(tk));
      }
      for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y -= H; s.x = Math.random() * W; } }
      for (const c of clouds) {
        c.y += c.v * dt;
        if (c.y > H + 80) { c.y = -80; c.x = Math.random() * W; }
      }
      this.updateOrnaments(dt);
    },

    // ------------------------------------------------ 場景小點綴：生成與移動
    updateOrnaments(dt) {
      const spawn = (key, on, lo, hi, fn) => {
        timers[key] -= dt;
        if (timers[key] <= 0) { if (on) fn(); timers[key] = M.rand(lo, hi); }
      };
      spawn('bird', cur.oBird > 0.6, 24, 40, () => {                       // 一小群小鳥（V 字隊形）從側邊飛過
        const dir = Math.random() < 0.5 ? 1 : -1;
        orn.birds.push({ x: dir > 0 ? -60 : W + 60, y: M.rand(130, 400), vx: dir * M.rand(55, 80), dir, n: M.randInt(2, 3), ph: Math.random() * 6 });
      });
      spawn('balloon', cur.oBalloon > 0.6, 90, 140, () => {                // 遠方的熱氣球緩緩飄過
        orn.balloons.push({ x: M.rand(60, W - 60), y: -50, vy: M.rand(14, 20), sw: Math.random() * 6, s: M.rand(0.8, 1.1) });
      });
      spawn('gull', cur.oGull > 0.6, 20, 32, () => {                       // 兩隻海鷗慢慢滑翔過去
        const dir = Math.random() < 0.5 ? 1 : -1, y0 = M.rand(160, 420);
        for (let i = 0; i < 2; i++) orn.gulls.push({ x: (dir > 0 ? -40 : W + 40) - dir * i * 38, y: y0 + i * M.rand(-16, 16), vx: dir * M.rand(42, 56), ph: Math.random() * 6, amp: M.rand(8, 14), s: M.rand(0.9, 1.15) });
      });
      spawn('meteor', cur.oMeteor > 0.6, 10, 20, () => {                   // 流星：右上往左下
        orn.meteors.push({ x: M.rand(240, W + 40), y: M.rand(100, 320), vx: -M.rand(380, 520), vy: M.rand(170, 260), life: 0 });
      });
      spawn('ufo', cur.oUfo > 0.6, 80, 140, () => {                        // 小 UFO 橫向飛過
        const dir = Math.random() < 0.5 ? 1 : -1;
        orn.ufos.push({ x: dir > 0 ? -40 : W + 40, y: M.rand(190, 340), vx: dir * M.rand(40, 55), ph: Math.random() * 6 });
      });

      for (const b of orn.birds) b.x += b.vx * dt;
      for (const b of orn.balloons) { b.y += b.vy * dt; b.sw += dt * 0.7; b.x += Math.sin(b.sw) * 6 * dt; }
      for (const g of orn.gulls) g.x += g.vx * dt;
      for (const m of orn.meteors) { m.x += m.vx * dt; m.y += m.vy * dt; m.life += dt; }
      for (const u of orn.ufos) { u.x += u.vx * dt; u.ph += dt * 3; }
      for (const f of flies) { f.ph += dt * f.sp; f.x += Math.sin(f.ph * 1.7) * 10 * dt; f.y += Math.cos(f.ph * 1.3) * 8 * dt; f.y = M.clamp(f.y, 700, 935); f.x = M.clamp(f.x, 10, W - 10); }
      orn.birds = orn.birds.filter(b => b.x > -140 && b.x < W + 140);
      orn.balloons = orn.balloons.filter(b => b.y < H + 60);
      orn.gulls = orn.gulls.filter(g => g.x > -110 && g.x < W + 110);
      orn.meteors = orn.meteors.filter(m => m.life < 1.0);
      orn.ufos = orn.ufos.filter(u => u.x > -80 && u.x < W + 80);
    },

    // ------------------------------------------------ 繪製
    // 起司球：黃色的球上有幾個洞（老鼠從洞裡噴出來）；噴出時發亮、洞口變深。
    // 它就是白天的「太陽」：cur.rays（白天 1、黃昏漸弱、黑夜 0）決定太陽般的放射光芒強度。
    drawMoon(ctx, t, alpha) {
      const m = MOON, sh = this.moonShake, gl = this.moonGlow, rays = cur.rays;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(m.x + (sh ? Math.sin(t * 70) * 2.6 : 0), m.y + (sh ? Math.cos(t * 63) * 2 : 0));
      if (rays > 0.02) {
        const R2 = m.r * (2.6 + rays * 1.4);                                   // 大範圍的暖色光暈
        const wg = ctx.createRadialGradient(0, 0, m.r * 0.9, 0, 0, R2);
        wg.addColorStop(0, 'rgba(255,240,170,' + (0.5 * rays) + ')');
        wg.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.arc(0, 0, R2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,244,176,' + (0.42 * rays) + ')';             // 16 條錐形光芒，長短交錯、緩慢旋轉
        for (let i = 0; i < 16; i++) {
          const a = i * Math.PI / 8 + t * 0.1, d = i % 2 === 0 ? 0.10 : 0.075;
          const L = m.r + (i % 2 === 0 ? 46 : 26) * (0.55 + 0.45 * rays), r0 = m.r * 1.02;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a - d) * r0, Math.sin(a - d) * r0);
          ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
          ctx.lineTo(Math.cos(a + d) * r0, Math.sin(a + d) * r0);
          ctx.closePath(); ctx.fill();
        }
      }
      const pulse = gl * (0.7 + 0.3 * Math.sin(t * 12));
      const halo = ctx.createRadialGradient(0, 0, m.r * 0.8, 0, 0, m.r * 2.1 + pulse * 14);   // 光暈
      halo.addColorStop(0, 'rgba(255,226,122,' + (0.35 + 0.3 * pulse) + ')');
      halo.addColorStop(1, 'rgba(255,226,122,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, m.r * 2.1 + pulse * 14, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createRadialGradient(-10, -12, 4, 0, 0, m.r);                            // 月亮本體（起司黃）
      body.addColorStop(0, '#fff2ac');
      body.addColorStop(1, '#ffd456');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#e6a92a'; ctx.stroke();
      for (const h of m.holes) {                                                                 // 起司的洞
        ctx.fillStyle = gl > 0.3 ? '#8a5410' : '#e8b640';
        ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(h.x - h.r * 0.25, h.y - h.r * 0.3, h.r * 0.45, h.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },


    draw(ctx, t) {
      // 1. 天空漸層
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgbStr(cur.tr, cur.tg, cur.tb));
      g.addColorStop(0.5, rgbStr(cur.mr, cur.mg, cur.mb));
      g.addColorStop(1, rgbStr(cur.br, cur.bg, cur.bb));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 2. 星星（白天看不到、黃昏漸漸出現）
      if (cur.star > 0.02) {
        ctx.fillStyle = '#fff';
        for (const s of stars) {
          ctx.globalAlpha = cur.star * (0.35 + 0.5 * Math.abs(Math.sin(t * 1.6 + s.tw)));
          ctx.fillRect(s.x, s.y, s.r, s.r);
        }
        ctx.globalAlpha = 1;
      }

      // 3. 太陽、起司月亮
      this.drawMoon(ctx, t, cur.moonA);

      // 4. 雲（白 / 暖 / 冷三種顏色依權重混合）
      const tints = [['', cur.tWhite], ['w', cur.tWarm], ['c', cur.tCool]];
      for (const c of clouds) {
        for (const tn of tints) {
          if (tn[1] < 0.02) continue;
          BM.Sprites.draw(ctx, 'cloud' + c.k + tn[0], c.x, c.y, 0, c.s, Math.min(0.95, c.a * cur.cloud * tn[1]));
        }
      }
      ctx.globalAlpha = 1;

      // 5. 場景小點綴（在天際線後面 / 上方，低透明度）
      this.drawOrnaments(ctx, t);

      // 6. 城鎮剪影：三種配色依權重疊合（從最底層開始，逐層以「新權重 / 累積權重」的透明度疊上去，等於線性混合）
      const ws = [['day', cur.kDay], ['dusk', cur.kDusk], ['night', cur.kNight]];
      let acc = 0;
      for (const w of ws) {
        if (w[1] < 0.01) continue;
        acc += w[1];
        ctx.globalAlpha = w[1] / acc;
        ctx.drawImage(skylines[w[0]], 0, H - SKYLINE_H, W, SKYLINE_H);
      }
      ctx.globalAlpha = 1;

      // 7. 螢火蟲（在城鎮前面閃爍）
      if (cur.oFly > 0.02) {
        for (const f of flies) {
          const blink = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + f.ph * 3));
          const a = 0.55 * cur.oFly * blink;
          const gl = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
          gl.addColorStop(0, 'rgba(210,255,120,' + a + ')');
          gl.addColorStop(1, 'rgba(210,255,120,0)');
          ctx.fillStyle = gl;
          ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(240,255,190,' + a + ')';
          ctx.beginPath(); ctx.arc(f.x, f.y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    },

    // ------------------------------------------------ 場景小點綴：繪製
    drawOrnaments(ctx, t) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // 白天：小鳥（V 字隊形、拍翅膀）
      if (cur.oBird > 0.02) {
        ctx.strokeStyle = '#27407a'; ctx.lineWidth = 1.8;
        for (const b of orn.birds) {
          ctx.globalAlpha = 0.6 * cur.oBird;
          for (let i = 0; i < b.n; i++) {
            const bx = b.x - b.dir * Math.ceil(i / 2) * 13, by = b.y + Math.ceil(i / 2) * 7 * (i % 2 ? 1 : -1);
            const fl = Math.sin(t * 9 + b.ph + i) * 4.5;
            ctx.beginPath(); ctx.moveTo(bx - 7, by - fl); ctx.quadraticCurveTo(bx - 3, by + 2 + fl * 0.3, bx, by); ctx.quadraticCurveTo(bx + 3, by + 2 + fl * 0.3, bx + 7, by - fl); ctx.stroke();
          }
        }
        // 白天：熱氣球
        for (const b of orn.balloons) {
          ctx.save();
          ctx.globalAlpha = 0.55 * cur.oBalloon;
          ctx.translate(b.x, b.y); ctx.rotate(Math.sin(b.sw) * 0.06); ctx.scale(b.s, b.s);
          ctx.fillStyle = '#e8574f'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 19, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 19, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-9, 15); ctx.lineTo(-4, 26); ctx.moveTo(9, 15); ctx.lineTo(4, 26); ctx.stroke();
          ctx.fillStyle = '#8a5a34'; ctx.fillRect(-5, 26, 10, 7);
          ctx.restore();
        }
      }

      // 黃昏：海鷗剪影（寬長的翅膀、翅膀中段彎折成「M」形，慢慢拍翅、輕輕起伏地滑翔）
      if (cur.oGull > 0.02) {
        ctx.fillStyle = '#2a1738';
        for (const s of orn.gulls) {
          ctx.globalAlpha = 0.7 * cur.oGull;
          const y = s.y + Math.sin(t * 0.9 + s.ph) * s.amp, x = s.x, k = s.s;
          const flap = Math.sin(t * 2.4 + s.ph);                       // -1（翅膀壓低）~ 1（翅膀高舉），週期約 2.6 秒
          ctx.strokeStyle = '#2a1738'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const side of [-1, 1]) {                                // 左右兩片翅膀（鏡像）：用圓頭的粗線條畫出經典的海鷗「︵」形，沒有蝙蝠的尖角與膜
            const ex = x + side * 13 * k, ey = y - 8 * k - flap * 3;                    // 肘部（翅膀最高處）
            const tx = x + side * 27 * k, ty = y - 3.5 * k + flap * 3;                  // 翼尖（微微下垂）
            ctx.lineWidth = 2.2 * k;                                                    // 同一條路徑一次畫完，避免半透明重疊出現深色斑點
            ctx.beginPath(); ctx.moveTo(x + side * 1.5, y); ctx.quadraticCurveTo(x + side * 6 * k, ey - 1.5 * k, ex, ey); ctx.quadraticCurveTo(x + side * 21 * k, ey - 1.5 * k, tx, ty); ctx.stroke();
          }
          ctx.beginPath(); ctx.ellipse(x, y + 0.8 * k, 4.2 * k, 2.2 * k, 0, 0, Math.PI * 2); ctx.fill();                   // 身體
          ctx.beginPath(); ctx.arc(x, y - 1.6 * k, 1.7 * k, 0, Math.PI * 2); ctx.fill();                                    // 頭
        }
      }

      // 黑夜：流星、小 UFO
      if (cur.oMeteor > 0.02) {
        for (const m of orn.meteors) {
          const k = m.life / 1.0, a = Math.sin(Math.PI * Math.min(1, k)) * 0.85 * cur.oMeteor;
          const len = 90, sp = Math.hypot(m.vx, m.vy), tx = m.x - m.vx / sp * len, ty = m.y - m.vy / sp * len;
          const gr = ctx.createLinearGradient(m.x, m.y, tx, ty);
          gr.addColorStop(0, 'rgba(255,255,255,' + a + ')');
          gr.addColorStop(1, 'rgba(180,210,255,0)');
          ctx.globalAlpha = 1;
          ctx.strokeStyle = gr; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
        }
      }
      if (cur.oUfo > 0.02) {
        for (const u of orn.ufos) {
          const y = u.y + Math.sin(u.ph) * 5;
          ctx.globalAlpha = 0.6 * cur.oUfo;
          ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.ellipse(u.x, y - 5, 8, 6, 0, Math.PI, 0); ctx.fill();          // 圓頂
          ctx.fillStyle = '#c9d2e8'; ctx.beginPath(); ctx.ellipse(u.x, y, 17, 5.5, 0, 0, Math.PI * 2); ctx.fill();        // 飛碟盤
          for (let i = -1; i <= 1; i++) {                                                                                  // 閃爍的小燈
            ctx.fillStyle = Math.sin(t * 8 + i * 2) > 0 ? '#ffe27a' : '#ff7a9a';
            ctx.beginPath(); ctx.arc(u.x + i * 9, y + 0.5, 1.5, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    }
  };
})(window.BM = window.BM || {});
