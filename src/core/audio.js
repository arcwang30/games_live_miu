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
    src.connect(filt); filt.connect(g); g.connect(sfxBus);
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
  const TRACKS = {
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
      if (T.lead[i]) tone({ type: 'square', f: mtof(T.lead[i]), d: stepDur * 0.85, v: 0.07, bus: musBus, delay });
      if (T.bass[i]) tone({ type: 'triangle', f: mtof(T.bass[i]), d: stepDur * 0.95, v: 0.16, bus: musBus, delay });
      step++;
      nextTime += stepDur;
    }
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
