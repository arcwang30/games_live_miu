// 音效與背景音樂：全部用 Web Audio 即時合成（不需要任何音檔）
(function (BM) {
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let unlocked = false, muted = false;
  let wanted = null, current = null, timer = null, step = 0, nextTime = 0;

  try { muted = localStorage.getItem('bulletMeow.muted') === '1'; } catch (e) { /* ignore */ }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // 建立音訊節點：master → 喇叭；音效 sfxBus 直接進 master；音樂 musBus 先過壓縮器（多個聲部疊在一起時不會爆音）再進 master
  function build(c, gain) {
    ctx = c;
    master = ctx.createGain();
    master.gain.value = gain;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    musBus.connect(comp); comp.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    build(new AC(), muted ? 0 : 0.7);
    return true;
  }

  function tone(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.d);
    const v = o.v === undefined ? 0.1 : o.v;
    if (o.a) {                                                // 有淡入（鋪底和弦用）：先從 0 慢慢升到音量再淡出，沒有「啪」的一聲
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(o.a, o.d * 0.5));
    } else g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + o.d + 0.03);
  }

  function noise(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.f2) filt.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.v === undefined ? 0.2 : o.v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    src.connect(filt); filt.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + o.d + 0.03);
  }

  const SFX = {
    shoot()  { tone({ type: 'square', f: 1150, f2: 520, d: 0.07, v: 0.035 }); },
    hit()    { tone({ type: 'triangle', f: 420, f2: 200, d: 0.09, v: 0.14 }); },
    boom()   { noise({ d: 0.3, v: 0.22, f: 2200, f2: 200 }); tone({ type: 'sawtooth', f: 200, f2: 40, d: 0.28, v: 0.1 }); },
    die()    { noise({ d: 0.9, v: 0.3, f: 2600, f2: 120 }); tone({ type: 'sawtooth', f: 700, f2: 50, d: 0.9, v: 0.14 }); },
    enemyShot() { tone({ type: 'square', f: 360, f2: 210, d: 0.1, v: 0.03 }); },
    dive()   { tone({ type: 'sine', f: 800, f2: 300, d: 0.28, v: 0.05 }); },
    lock()   { tone({ type: 'square', f: 1400, d: 0.05, v: 0.04 }); },
    move()   { tone({ type: 'square', f: 660, d: 0.04, v: 0.06 }); },
    select() { tone({ type: 'square', f: 880, d: 0.07, v: 0.08 }); tone({ type: 'square', f: 1320, d: 0.1, v: 0.08, delay: 0.07 }); },
    extra()  { [72, 76, 79, 84].forEach((m, i) => tone({ type: 'square', f: mtof(m), d: 0.13, v: 0.09, delay: i * 0.09 })); },
    wave()   { [67, 72, 76, 79].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.2, v: 0.16, delay: i * 0.11 })); },
    clear()  { [72, 76, 79, 84, 88].forEach((m, i) => tone({ type: 'square', f: mtof(m), d: 0.16, v: 0.08, delay: i * 0.1 })); },
    over()   { [69, 65, 62, 57].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.4, v: 0.2, delay: i * 0.28 })); },

    // ---- 進場（起司月亮）----
    squeak() { tone({ type: 'sine', f: 1700, f2: 2500, d: 0.07, v: 0.07 }); tone({ type: 'sine', f: 1900, f2: 2700, d: 0.07, v: 0.07, delay: 0.1 }); },   // 「吱吱」
    pop()    { tone({ type: 'square', f: 900, f2: 1500, d: 0.04, v: 0.035 }); },
    ripple() { [72, 76, 79, 84, 88].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.16, v: 0.1, delay: i * 0.05 })); },

    // ---- BOSS ----
    warning()   { for (let i = 0; i < 6; i++) tone({ type: 'sawtooth', f: i % 2 ? 660 : 880, d: 0.26, v: 0.09, delay: i * 0.3 }); },
    poop()      { tone({ type: 'sine', f: 340, f2: 110, d: 0.16, v: 0.1 }); },
    cheese()    { tone({ type: 'square', f: 700, f2: 1500, d: 0.09, v: 0.06 }); noise({ d: 0.06, v: 0.05, f: 4000 }); },
    clawWind()  { tone({ type: 'triangle', f: 900, f2: 1800, d: 0.5, v: 0.07 }); },
    slash()     { noise({ d: 0.22, v: 0.16, f: 6000, f2: 800 }); tone({ type: 'sawtooth', f: 1200, f2: 300, d: 0.2, v: 0.06 }); },
    charge()    { noise({ d: 0.5, v: 0.14, f: 600, f2: 3000 }); tone({ type: 'sawtooth', f: 100, f2: 400, d: 0.5, v: 0.08 }); },
    reflect()   { tone({ type: 'triangle', f: 1600, f2: 900, d: 0.1, v: 0.09 }); },
    bossHit()   { tone({ type: 'sine', f: 200, f2: 90, d: 0.06, v: 0.1 }); },
    roar()      { noise({ d: 0.6, v: 0.2, f: 900, f2: 150 }); tone({ type: 'sawtooth', f: 140, f2: 60, d: 0.6, v: 0.14 }); },
    sigh()      { [392, 370, 349, 311].forEach((f, i) => tone({ type: 'triangle', f, f2: f * 0.93, d: 0.42, v: 0.16, delay: i * 0.38 })); },   // 「哇～哇～哇～」失落音
    bossBoom()  { noise({ d: 0.95, v: 0.32, f: 2600, f2: 80 }); tone({ type: 'sawtooth', f: 260, f2: 30, d: 1.0, v: 0.14 }); }
  };

  // ---- 背景音樂 ----
  // 8 分音符步進。每首曲子有：主旋律 lead、低音 bass，再依「和弦進行」自動長出其他聲部（和聲、琶音、鋪底和弦、八度加厚）與鼓組。
  // 編曲會隨旋律重複的遍數推進（每 4 遍一輪）：第 1 遍只有主旋律 + 低音 + 輕鼓，之後每一遍多疊一些聲部，第 4 遍最滿並在最後一小節加過門，然後回到第 1 遍。
  const cat = (...bars) => [].concat(...bars);       // 把每一小節（8 個 8 分音符）接成一整首
  const rep = (bar, n) => cat(...new Array(n).fill(bar));

  // 和弦：[根音的音級 0~11, 種類]。M 大三和弦、m 小三和弦、7 屬七和弦
  const Q = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10] };
  const pcsOf = c => Q[c[1]].map(x => (c[0] + x) % 12);
  const lowest = (pc, base) => base + (((pc - base) % 12) + 12) % 12;      // 比 base 高（或等於）的最低音高
  const chordAt = (chords, i) => chords[Math.floor(i / 8) % chords.length];

  // 琶音：每小節依和弦取 [根音、三音、五音、(七音)、高八度根音]，照 pat 的順序彈（-1 = 休止）
  function arpOf(chords, bars, base, pat) {
    const out = [];
    for (let b = 0; b < bars; b++) {
      const ts = pcsOf(chords[b % chords.length]).map(pc => lowest(pc, base)).sort((a, c) => a - c);
      ts.push(ts[0] + 12);
      for (let s = 0; s < 8; s++) out.push(pat[s] < 0 ? 0 : ts[pat[s] % ts.length]);
    }
    return out;
  }

  // 和聲：主旋律每個「和弦內音」的下方 3~9 個半音找最近的和弦音（大約是下三度～下六度）；經過音不加，避免不協和
  function harmOf(lead, chords) {
    return lead.map((n, i) => {
      if (!n) return 0;
      const pcs = pcsOf(chordAt(chords, i));
      if (!pcs.includes(n % 12)) return 0;
      for (let m = n - 3; m >= n - 9; m--) if (pcs.includes(((m % 12) + 12) % 12)) return m;
      return 0;
    });
  }

  // 鋪底和弦：每小節第一拍彈一個長音三和弦
  function padOf(chords, bars, base) {
    const out = [];
    for (let b = 0; b < bars; b++) {
      out.push(pcsOf(chords[b % chords.length]).slice(0, 3).map(pc => lowest(pc, base)));
      for (let s = 1; s < 8; s++) out.push(0);
    }
    return out;
  }

  // 八度加厚：主旋律低一個八度（太低的音不加）
  const octDown = lead => lead.map(n => (n - 12 >= 55 ? n - 12 : 0));

  // 鼓組：k 大鼓、s 小鼓、h 汽鈴。四遍由輕到滿：p0 → p1 → p2 → p2 + 最後一小節過門
  const drumSet = (bars, p0, p1, p2, fill) => [rep(p0, bars), rep(p1, bars), rep(p2, bars), cat(rep(p2, bars - 1), fill)];
  const K = 'k', S = 's', H = 'h';

  const lay = (type, v, len, notes, on, a) => ({ type, v, len, notes, on, a });   // 一個聲部；on = 四遍各自開不開

  // 主選單 · C 大調 · 128 BPM：和弦 C–F–G–C
  const MENU_CH = [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']];
  const MENU_LEAD = [76, 79, 84, 79, 76, 79, 84, 79,   77, 81, 84, 81, 77, 81, 84, 81,
                     79, 83, 86, 83, 79, 83, 86, 83,   84, 0, 79, 0, 76, 0, 72, 0];
  const MENU = {
    bpm: 128,
    lead: MENU_LEAD,
    bass: [48, 0, 48, 0, 55, 0, 48, 0,   53, 0, 53, 0, 60, 0, 53, 0,
           55, 0, 55, 0, 62, 0, 55, 0,   48, 0, 55, 0, 48, 0, 43, 0],
    layers: [
      lay('square', 0.035, 0.85, harmOf(MENU_LEAD, MENU_CH), [0, 1, 1, 1]),                                  // 和聲
      lay('triangle', 0.05, 7.4, padOf(MENU_CH, 4, 52), [0, 1, 1, 1], 0.2),                                  // 鋪底和弦
      lay('sine', 0.05, 1.2, arpOf(MENU_CH, 4, 72, [-1, 1, -1, 2, -1, 3, -1, 2]), [0, 0, 1, 1]),             // 高音閃爍琶音（只彈反拍）
      lay('triangle', 0.08, 0.9, octDown(MENU_LEAD), [0, 0, 0, 1])                                            // 八度加厚
    ],
    drums: drumSet(4, [0, 0, H, 0, 0, 0, H, 0], [K, 0, H, 0, S, 0, H, 0], [K, H, S, H, K, H, S, H], [K, H, S, S, K, S, S, S])
  };

  // 白天（遊戲）· A 小調 · 156 BPM：和弦 Am–F–G–E
  const PLAY_CH = [[9, 'm'], [5, 'M'], [7, 'M'], [4, 'M']];
  const PLAY_LEAD = [81, 0, 76, 0, 81, 84, 81, 76,   77, 0, 81, 0, 77, 84, 81, 77,
                     79, 0, 83, 0, 79, 86, 83, 79,   76, 0, 80, 0, 76, 83, 80, 76];
  const PLAY = {
    bpm: 156,
    lead: PLAY_LEAD,
    bass: [45, 45, 57, 45, 45, 45, 57, 45,   41, 41, 53, 41, 41, 41, 53, 41,
           43, 43, 55, 43, 43, 43, 55, 43,   40, 40, 52, 40, 40, 40, 52, 40],
    layers: [
      lay('square', 0.035, 0.85, harmOf(PLAY_LEAD, PLAY_CH), [0, 1, 1, 1]),                                  // 和聲
      lay('triangle', 0.06, 0.8, arpOf(PLAY_CH, 4, 57, [-1, 1, -1, 2, -1, 3, -1, 2]), [0, 0, 1, 1]),         // 中音域反拍琶音
      lay('triangle', 0.04, 7.4, padOf(PLAY_CH, 4, 48), [0, 0, 1, 1], 0.15),                                 // 鋪底和弦
      lay('square', 0.04, 0.85, octDown(PLAY_LEAD), [0, 0, 0, 1])                                            // 八度加厚
    ],
    drums: drumSet(4, [K, 0, H, 0, K, 0, H, 0], [K, H, S, H, K, H, S, H], [K, H, S, H, K, K, S, H], [K, H, S, S, K, S, S, S])
  };

  // BOSS · D 小調 · 172 BPM：和弦 Dm–Bb–C–A。一開始鼓組就比較滿
  const BOSS_CH = [[2, 'm'], [10, 'M'], [0, 'M'], [9, 'M']];
  const BOSS_LEAD = [74, 0, 74, 77, 0, 74, 81, 0,   70, 0, 70, 74, 0, 70, 77, 0,
                     72, 0, 72, 76, 0, 72, 79, 0,   69, 0, 69, 73, 0, 69, 76, 81];
  const BOSS = {
    bpm: 172,
    lead: BOSS_LEAD,
    bass: [38, 38, 50, 38, 38, 38, 50, 38,   34, 34, 46, 34, 34, 34, 46, 34,
           36, 36, 48, 36, 36, 36, 48, 36,   33, 33, 45, 33, 33, 33, 45, 33],
    layers: [
      lay('square', 0.04, 0.85, harmOf(BOSS_LEAD, BOSS_CH), [1, 1, 1, 1]),                                   // 和聲
      lay('square', 0.03, 0.8, arpOf(BOSS_CH, 4, 57, [0, 1, 2, 3, 2, 1, 2, 1]), [0, 1, 1, 1]),               // 8 分琶音
      lay('triangle', 0.05, 7.4, padOf(BOSS_CH, 4, 45), [1, 1, 1, 1], 0.1),                                  // 鋪底和弦
      lay('square', 0.04, 0.85, octDown(BOSS_LEAD), [0, 0, 1, 1])                                            // 八度加厚
    ],
    drums: drumSet(4, [K, H, S, H, K, H, S, H], [K, H, S, H, K, K, S, H], [K, K, S, H, K, K, S, S], [K, H, S, S, K, S, S, S])
  };

  // 黃昏 · 夕陽：C 大調、慢板（108 BPM）。和弦 C–G–Am–Em–F–C–F–G，長音三角波旋律 + 方波琶音 + 輕柔鼓點，帶一點懷舊感
  const DUSK_CH = [[0, 'M'], [7, 'M'], [9, 'm'], [4, 'm'], [5, 'M'], [0, 'M'], [5, 'M'], [7, 'M']];
  const DUSK_LEAD = cat(
    [76, 0, 0, 0, 72, 0, 74, 0],   // C
    [71, 0, 0, 0, 67, 0, 71, 0],   // G
    [72, 0, 0, 0, 76, 0, 81, 0],   // Am
    [79, 0, 0, 0, 76, 0, 71, 0],   // Em
    [72, 0, 0, 0, 77, 0, 76, 0],   // F
    [74, 0, 0, 0, 72, 0, 67, 0],   // C
    [69, 0, 72, 0, 77, 0, 76, 0],   // F
    [74, 0, 71, 0, 67, 0, 71, 0]);  // G
  const DUSK = {
    bpm: 108,
    leadType: 'triangle', leadV: 0.14, leadLen: 3.4,
    lead: DUSK_LEAD,
    bass: cat(
      [48, 0, 0, 48, 55, 0, 48, 0],
      [43, 0, 0, 43, 50, 0, 43, 0],
      [45, 0, 0, 45, 52, 0, 45, 0],
      [40, 0, 0, 40, 47, 0, 40, 0],
      [41, 0, 0, 41, 48, 0, 41, 0],
      [48, 0, 0, 48, 55, 0, 48, 0],
      [41, 0, 0, 41, 48, 0, 41, 0],
      [43, 0, 0, 43, 50, 0, 43, 0]),
    layers: [
      lay('square', 0.028, 0.95, cat(                                                                        // 方波琶音（原有）
        [60, 64, 67, 72, 67, 64, 67, 64],
        [59, 62, 67, 71, 67, 62, 67, 62],
        [60, 64, 69, 72, 69, 64, 69, 64],
        [59, 64, 67, 71, 67, 64, 67, 64],
        [60, 65, 69, 72, 69, 65, 69, 65],
        [60, 64, 67, 72, 67, 64, 67, 64],
        [60, 65, 69, 72, 69, 65, 69, 65],
        [59, 62, 67, 71, 67, 62, 67, 62]), [1, 1, 1, 1]),
      lay('sine', 0.05, 7.6, padOf(DUSK_CH, 8, 48), [1, 1, 1, 1], 0.4),                                      // 鋪底和弦（慢慢淡入）
      lay('triangle', 0.08, 3.2, harmOf(DUSK_LEAD, DUSK_CH), [0, 1, 1, 1]),                                  // 和聲
      lay('sine', 0.07, 3.4, octDown(DUSK_LEAD), [0, 0, 1, 1])                                               // 八度加厚
    ],
    drums: drumSet(8, [K, 0, H, 0, S, 0, H, 0], [K, 0, H, 0, S, 0, H, H], [K, 0, H, K, S, 0, H, H], [K, 0, H, 0, S, H, S, S])
  };

  // 黑夜 · 星空：E 小調、中快板（136 BPM）。和弦 Em–C–G–D–Am–Em–C–B，跳動的 8 分低音 + 高音玻璃般的星星琶音（正弦波）+ 稀疏的方波旋律，神祕又帶緊張感
  const NIGHT_CH = [[4, 'm'], [0, 'M'], [7, 'M'], [2, 'M'], [9, 'm'], [4, 'm'], [0, 'M'], [11, '7']];
  const NIGHT_LEAD = cat(
    [71, 0, 0, 74, 76, 0, 0, 0],   // Em
    [72, 0, 0, 0, 76, 0, 74, 0],   // C
    [74, 0, 0, 0, 79, 0, 78, 0],   // G
    [74, 0, 78, 0, 81, 0, 78, 0],   // D
    [72, 0, 0, 76, 81, 0, 0, 0],   // Am
    [79, 0, 0, 76, 74, 0, 71, 0],   // Em
    [76, 0, 79, 0, 84, 0, 79, 0],   // C
    [75, 0, 78, 0, 83, 0, 78, 0]);  // B7
  const NIGHT = {
    bpm: 136,
    leadType: 'square', leadV: 0.05, leadLen: 2.2,
    lead: NIGHT_LEAD,
    bass: cat(
      [40, 0, 40, 0, 40, 40, 0, 40],
      [36, 0, 36, 0, 36, 36, 0, 36],
      [43, 0, 43, 0, 43, 43, 0, 43],
      [38, 0, 38, 0, 38, 38, 0, 38],
      [45, 0, 45, 0, 45, 45, 0, 45],
      [40, 0, 40, 0, 40, 40, 0, 40],
      [36, 0, 36, 0, 36, 36, 0, 36],
      [35, 0, 35, 0, 35, 35, 0, 35]),
    layers: [
      lay('sine', 0.08, 1.1, cat(                                                                            // 星星琶音（原有）
        [76, 79, 83, 88, 83, 79, 83, 79],
        [76, 79, 84, 88, 84, 79, 84, 79],
        [74, 79, 83, 86, 83, 79, 83, 79],
        [74, 78, 81, 86, 81, 78, 81, 78],
        [76, 81, 84, 88, 84, 81, 84, 81],
        [76, 79, 83, 88, 83, 79, 83, 79],
        [76, 79, 84, 88, 84, 79, 84, 79],
        [71, 75, 78, 83, 78, 75, 78, 75]), [1, 1, 1, 1]),
      lay('sine', 0.05, 7.6, padOf(NIGHT_CH, 8, 52), [1, 1, 1, 1], 0.4),                                     // 鋪底和弦
      lay('square', 0.028, 2.2, harmOf(NIGHT_LEAD, NIGHT_CH), [0, 1, 1, 1]),                                 // 和聲
      lay('square', 0.03, 2.2, octDown(NIGHT_LEAD), [0, 0, 0, 1])                                            // 八度加厚
    ],
    drums: drumSet(8, [K, 0, H, 0, S, 0, H, 0], [K, 0, H, K, S, 0, H, H], [K, H, H, K, S, H, K, H], [K, H, S, S, K, S, S, S])
  };

  const TRACKS = { menu: MENU, play: PLAY, boss: BOSS, dusk: DUSK, night: NIGHT };

  // 排一個 8 分音符步（i = 在旋律裡的第幾步，pass = 旋律重複到第幾遍）
  function playStep(T, i, pass, stepDur, delay) {
    if (T.lead[i]) tone({ type: T.leadType || 'square', f: mtof(T.lead[i]), d: stepDur * (T.leadLen || 0.85), v: T.leadV || 0.07, bus: musBus, delay });
    if (T.bass[i]) tone({ type: 'triangle', f: mtof(T.bass[i]), d: stepDur * 0.95, v: 0.16, bus: musBus, delay });
    for (const L of T.layers || []) {
      if (!L.on[pass % L.on.length]) continue;
      const n = L.notes[i % L.notes.length];
      if (!n) continue;
      for (const m of (Array.isArray(n) ? n : [n])) tone({ type: L.type, f: mtof(m), d: stepDur * L.len, v: L.v, a: L.a, bus: musBus, delay });
    }
    if (T.drums) { const D = T.drums[pass % T.drums.length]; drum(D[i % D.length], delay); }
  }

  function pump() {
    const T = TRACKS[current];
    if (!T || !ctx) return;
    const stepDur = 60 / T.bpm / 2, loop = T.lead.length;
    while (nextTime < ctx.currentTime + 0.25) {
      playStep(T, step % loop, Math.floor(step / loop) % 4, stepDur, Math.max(0, nextTime - ctx.currentTime));
      step++;
      nextTime += stepDur;
    }
  }

  // 輕量鼓組：k 大鼓、s 小鼓、h 汽鈴
  function drum(kind, delay) {
    if (kind === 'k') tone({ type: 'sine', f: 150, f2: 45, d: 0.13, v: 0.22, bus: musBus, delay });
    else if (kind === 's') noise({ d: 0.1, v: 0.08, f: 3600, bus: musBus, delay });
    else if (kind === 'h') noise({ d: 0.04, v: 0.035, f: 9000, bus: musBus, delay });
  }

  function startTrack(name) {
    stopTrack();
    if (!ensure()) return;
    current = name;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(pump, 60);
  }

  function stopTrack() {
    if (timer) clearInterval(timer);
    timer = null;
    current = null;
  }

  BM.Audio = {
    // 瀏覽器規定要有使用者操作後才能出聲，所以在第一次按鍵/點擊時呼叫
    unlock() {
      if (!ensure()) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      unlocked = true;
      if (wanted && current !== wanted) startTrack(wanted);
    },
    sfx(name) { if (unlocked && SFX[name]) SFX[name](); },
    playMusic(name) {
      wanted = name;
      if (unlocked && current !== name) startTrack(name);
    },
    stopMusic() { wanted = null; stopTrack(); },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('bulletMeow.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : 0.7;
      return muted;
    },
    get muted() { return muted; },

    // 測試 / 試聽用：把一首曲子的第 pass 遍（0~3）離線合成成 AudioBuffer（不會出聲，也不影響正在播放的音樂）。
    // 例：await BM.Audio.render('night', 3)  → 第 4 遍（最滿的編曲）
    async render(name, pass, sampleRate) {
      const T = TRACKS[name];
      if (!T) throw new Error('沒有這首曲子：' + name);
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const sr = sampleRate || 44100, stepDur = 60 / T.bpm / 2, loop = T.lead.length;
      const off = new OAC(2, Math.ceil(sr * (stepDur * loop + 2)), sr);
      const saved = { ctx, master, sfxBus, musBus, noiseBuf };
      try {
        build(off, 0.7);
        for (let i = 0; i < loop; i++) playStep(T, i, pass || 0, stepDur, i * stepDur);
      } finally {
        ({ ctx, master, sfxBus, musBus, noiseBuf } = saved);
      }
      return off.startRendering();
    }
  };
})(window.BM = window.BM || {});
