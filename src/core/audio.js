// 音效與背景音樂：全部用 Web Audio 即時合成（不需要任何音檔）
(function (BM) {
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let unlocked = false, muted = false;
  let wanted = null, current = null, timer = null, step = 0, nextTime = 0;

  try { muted = localStorage.getItem('bulletMeow.muted') === '1'; } catch (e) { /* ignore */ }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.55; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
    g.gain.setValueAtTime(o.v === undefined ? 0.1 : o.v, t0);
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

  // ---- 背景音樂（8 分音符步進，lead=方波旋律、bass=三角波低音）----
  const cat = (...bars) => [].concat(...bars);       // 把每一小節（8 個 8 分音符）接成一整首

  // 黃昏 · 夕陽：C 大調、慢板（108 BPM）。和弦 C–G–Am–Em–F–C–F–G，長音三角波旋律 + 方波琶音 + 輕柔鼓點，帶一點懷舊感
  const DUSK = {
    bpm: 108,
    leadType: 'triangle', leadV: 0.14, leadLen: 3.4,
    lead: cat(
      [76, 0, 0, 0, 72, 0, 74, 0],   // C
      [71, 0, 0, 0, 67, 0, 71, 0],   // G
      [72, 0, 0, 0, 76, 0, 81, 0],   // Am
      [79, 0, 0, 0, 76, 0, 71, 0],   // Em
      [72, 0, 0, 0, 77, 0, 76, 0],   // F
      [74, 0, 0, 0, 72, 0, 67, 0],   // C
      [69, 0, 72, 0, 77, 0, 76, 0],   // F
      [74, 0, 71, 0, 67, 0, 71, 0]),  // G
    bass: cat(
      [48, 0, 0, 48, 55, 0, 48, 0],
      [43, 0, 0, 43, 50, 0, 43, 0],
      [45, 0, 0, 45, 52, 0, 45, 0],
      [40, 0, 0, 40, 47, 0, 40, 0],
      [41, 0, 0, 41, 48, 0, 41, 0],
      [48, 0, 0, 48, 55, 0, 48, 0],
      [41, 0, 0, 41, 48, 0, 41, 0],
      [43, 0, 0, 43, 50, 0, 43, 0]),
    arp: {
      type: 'square', v: 0.028, len: 0.95,
      notes: cat(
        [60, 64, 67, 72, 67, 64, 67, 64],
        [59, 62, 67, 71, 67, 62, 67, 62],
        [60, 64, 69, 72, 69, 64, 69, 64],
        [59, 64, 67, 71, 67, 64, 67, 64],
        [60, 65, 69, 72, 69, 65, 69, 65],
        [60, 64, 67, 72, 67, 64, 67, 64],
        [60, 65, 69, 72, 69, 65, 69, 65],
        [59, 62, 67, 71, 67, 62, 67, 62])
    },
    drums: ['k', 0, 'h', 0, 's', 0, 'h', 0]
  };

  // 黑夜 · 星空：E 小調、中快板（136 BPM）。和弦 Em–C–G–D–Am–Em–C–B，跳動的 8 分低音 + 高音玻璃般的星星琶音（正弦波）+ 稀疏的方波旋律，神祕又帶緊張感
  const NIGHT = {
    bpm: 136,
    leadType: 'square', leadV: 0.05, leadLen: 2.2,
    lead: cat(
      [71, 0, 0, 74, 76, 0, 0, 0],   // Em
      [72, 0, 0, 0, 76, 0, 74, 0],   // C
      [74, 0, 0, 0, 79, 0, 78, 0],   // G
      [74, 0, 78, 0, 81, 0, 78, 0],   // D
      [72, 0, 0, 76, 81, 0, 0, 0],   // Am
      [79, 0, 0, 76, 74, 0, 71, 0],   // Em
      [76, 0, 79, 0, 84, 0, 79, 0],   // C
      [75, 0, 78, 0, 83, 0, 78, 0]),  // B7
    bass: cat(
      [40, 0, 40, 0, 40, 40, 0, 40],
      [36, 0, 36, 0, 36, 36, 0, 36],
      [43, 0, 43, 0, 43, 43, 0, 43],
      [38, 0, 38, 0, 38, 38, 0, 38],
      [45, 0, 45, 0, 45, 45, 0, 45],
      [40, 0, 40, 0, 40, 40, 0, 40],
      [36, 0, 36, 0, 36, 36, 0, 36],
      [35, 0, 35, 0, 35, 35, 0, 35]),
    arp: {
      type: 'sine', v: 0.08, len: 1.1,
      notes: cat(
        [76, 79, 83, 88, 83, 79, 83, 79],
        [76, 79, 84, 88, 84, 79, 84, 79],
        [74, 79, 83, 86, 83, 79, 83, 79],
        [74, 78, 81, 86, 81, 78, 81, 78],
        [76, 81, 84, 88, 84, 81, 84, 81],
        [76, 79, 83, 88, 83, 79, 83, 79],
        [76, 79, 84, 88, 84, 79, 84, 79],
        [71, 75, 78, 83, 78, 75, 78, 75])
    },
    drums: ['k', 0, 'h', 'k', 's', 0, 'h', 'h']
  };

  const TRACKS = {
    dusk: DUSK,
    night: NIGHT,
    menu: {
      bpm: 128,
      lead: [76, 79, 84, 79, 76, 79, 84, 79,   77, 81, 84, 81, 77, 81, 84, 81,
             79, 83, 86, 83, 79, 83, 86, 83,   84, 0, 79, 0, 76, 0, 72, 0],
      bass: [48, 0, 48, 0, 55, 0, 48, 0,   53, 0, 53, 0, 60, 0, 53, 0,
             55, 0, 55, 0, 62, 0, 55, 0,   48, 0, 55, 0, 48, 0, 43, 0]
    },
    play: {
      bpm: 156,
      lead: [81, 0, 76, 0, 81, 84, 81, 76,   77, 0, 81, 0, 77, 84, 81, 77,
             79, 0, 83, 0, 79, 86, 83, 79,   76, 0, 80, 0, 76, 83, 80, 76],
      bass: [45, 45, 57, 45, 45, 45, 57, 45,   41, 41, 53, 41, 41, 41, 53, 41,
             43, 43, 55, 43, 43, 43, 55, 43,   40, 40, 52, 40, 40, 40, 52, 40]
    },
    boss: {                       // BOSS 戰：D 小調、速度更快、低音更重
      bpm: 172,
      lead: [74, 0, 74, 77, 0, 74, 81, 0,   70, 0, 70, 74, 0, 70, 77, 0,
             72, 0, 72, 76, 0, 72, 79, 0,   69, 0, 69, 73, 0, 69, 76, 81],
      bass: [38, 38, 50, 38, 38, 38, 50, 38,   34, 34, 46, 34, 34, 34, 46, 34,
             36, 36, 48, 36, 36, 36, 48, 36,   33, 33, 45, 33, 33, 33, 45, 33]
    }
  };

  function pump() {
    const T = TRACKS[current];
    if (!T || !ctx) return;
    const stepDur = 60 / T.bpm / 2;
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % T.lead.length;
      const delay = Math.max(0, nextTime - ctx.currentTime);
      if (T.lead[i]) tone({ type: T.leadType || 'square', f: mtof(T.lead[i]), d: stepDur * (T.leadLen || 0.85), v: T.leadV || 0.07, bus: musBus, delay });
      if (T.bass[i]) tone({ type: 'triangle', f: mtof(T.bass[i]), d: stepDur * 0.95, v: 0.16, bus: musBus, delay });
      if (T.arp && T.arp.notes[i % T.arp.notes.length]) tone({ type: T.arp.type, f: mtof(T.arp.notes[i % T.arp.notes.length]), d: stepDur * T.arp.len, v: T.arp.v, bus: musBus, delay });
      if (T.drums) drum(T.drums[i % T.drums.length], delay);
      step++;
      nextTime += stepDur;
    }
  }

  // 輕量鼓組（只有新增的黃昏 / 黑夜曲子用）：k 大鼓、s 小鼓、h 汽鈴
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
    get muted() { return muted; }
  };
})(window.BM = window.BM || {});
