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
    musBus = ctx.createGain(); musBus.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    musBus.connect(comp); comp.connect(master);
    // 殘響：音樂另外送一份進「小廳堂」（隨機噪音做成漸漸消失的脈衝響應），讓聲音更飽滿、有空間感；音效不加殘響
    // 脈衝響應用固定種子的亂數產生（每次聽到的殘響一樣）；送進殘響前先濾掉低頻，不然大鼓 / 低音會在殘響尾巴裡隨機「嗡」一聲
    const len = Math.floor(ctx.sampleRate * 1.3), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    let seed = 20260921;
    const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    const wet = ctx.createGain(); wet.gain.value = 0.2;
    musBus.connect(hp); hp.connect(conv); conv.connect(wet); wet.connect(comp);
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

  // 音源。基本：type 波形、f 頻率（f2 = 滑音終點）、d 長度、v 音量、a 淡入時間、delay 延後多久、bus 送去哪條匯流排。
  // 樂器用的進階選項（音效沒用到）：
  //   uni  兩個左右微微失諧（±cents）的振盪器疊在一起 → 像弦樂團 / 合成器的厚度
  //   lp   低通濾波器 { f 起始截止頻率, f2 掃到哪, t 掃頻花多少比例的音長, q } → 撥弦（由亮到暗）、銅管（由暗到亮）、合成低音
  //   fm   調頻 { ratio 調變頻率倍數, idx 調變深度, decay 深度在多少比例的音長內衰減 } → 鐘琴、電鋼琴
  //   vib  顫音 { rate Hz, depth cents } → 長笛
  //   pan  左右聲道 -1 ~ 1
  function tone(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0), end = t0 + o.d + 0.03;
    const g = ctx.createGain();
    const v = (o.v === undefined ? 0.1 : o.v) * (o.uni ? 0.7 : 1);
    if (o.a) {                                                // 有淡入（鋪底和弦用）：先從 0 慢慢升到音量再淡出，沒有「啪」的一聲
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(o.a, o.d * 0.5));
    } else g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);

    let src = g;                                              // 振盪器接到哪裡：有濾波器就先過濾波器
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = o.lp.q || 1;
      f.frequency.setValueAtTime(o.lp.f, t0);
      if (o.lp.f2) f.frequency.exponentialRampToValueAtTime(o.lp.f2, t0 + o.d * (o.lp.t || 0.6));
      f.connect(g);
      src = f;
    }
    for (const cents of (o.uni ? [-o.uni, o.uni] : [0])) {
      const osc = ctx.createOscillator();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.d);
      if (cents) osc.detune.value = cents;
      if (o.vib) {
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = o.vib.rate; lg.gain.value = o.vib.depth;
        lfo.connect(lg); lg.connect(osc.detune);
        lfo.start(t0); lfo.stop(end);
      }
      if (o.fm) {
        const m = ctx.createOscillator(), mg = ctx.createGain();
        const depth = o.f * o.fm.ratio * o.fm.idx;
        m.frequency.setValueAtTime(o.f * o.fm.ratio, t0);
        mg.gain.setValueAtTime(depth, t0);
        mg.gain.exponentialRampToValueAtTime(Math.max(0.01, depth * 0.03), t0 + o.d * (o.fm.decay || 0.5));
        m.connect(mg); mg.connect(osc.frequency);
        m.start(t0); m.stop(end);
      }
      osc.connect(src);
      osc.start(t0);
      osc.stop(end);
    }
    let out = g;
    if (o.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p);
      out = p;
    }
    out.connect(o.bus || sfxBus);
  }

  // 噪音：f 濾波器頻率（f2 = 掃到哪）、ft 濾波器種類（預設 lowpass；小鼓 / 汽鈴用 highpass 或 bandpass）、q
  function noise(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = o.ft || 'lowpass';
    if (o.q) filt.Q.value = o.q;
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

    // ---- 金必鼠 ----
    goldIn()  { [84, 88, 91, 96].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.14, v: 0.08, delay: i * 0.07 })); },     // 出現：閃亮的上行琶音
    goldHit(n) { const f = 1100 + (n || 0) * 70; tone({ type: 'triangle', f, f2: f * 0.9, d: 0.08, v: 0.09 }); tone({ type: 'sine', f: f * 2, d: 0.1, v: 0.04 }); },   // 打中：金屬「叮」，越打音越高
    goldDie() { for (let i = 0; i < 9; i++) tone({ type: i % 2 ? 'triangle' : 'sine', f: 1700 + Math.random() * 1500, d: 0.09, v: 0.06, delay: i * 0.045 }); [72, 76, 79, 84, 88].forEach((m, i) => tone({ type: 'square', f: mtof(m), d: 0.14, v: 0.08, delay: 0.1 + i * 0.08 })); },   // 擊落：硬幣嘩啦 + 得意的上行音階
    goldOut() { [96, 91, 88, 84].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.16, v: 0.06, delay: i * 0.09 })); },   // 飛走：下行的「掰掰」

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
    bossBoom()  { noise({ d: 0.95, v: 0.32, f: 2600, f2: 80 }); tone({ type: 'sawtooth', f: 260, f2: 30, d: 1.0, v: 0.14 }); },

    // ---- BOSS：桐生爹鼠 ----
    knife()     { noise({ d: 0.14, v: 0.1, f: 7000, f2: 2000 }); tone({ type: 'triangle', f: 1800, f2: 2600, d: 0.08, v: 0.05 }); },   // 拔刀 / 揮刀
    shard()     { for (let i = 0; i < 5; i++) tone({ type: 'sine', f: 2200 + Math.random() * 1400, d: 0.07, v: 0.05, delay: i * 0.02 }); },   // 小刀炸開分散
    punch()     { noise({ d: 0.06, v: 0.15, f: 500, f2: 90 }); tone({ type: 'square', f: 130, f2: 60, d: 0.05, v: 0.1 }); },   // 一拳
    shout()     { noise({ d: 0.35, v: 0.22, f: 700, f2: 2200 }); tone({ type: 'sawtooth', f: 90, f2: 220, d: 0.4, v: 0.16 }); },   // 「極！」怒喝（蓄力時）
    gokuThrow() { tone({ type: 'square', f: 720, f2: 1100, d: 0.1, v: 0.06 }); tone({ type: 'sine', f: 1400, d: 0.12, v: 0.04, delay: 0.02 }); },   // 「極」字射出
    slowHit()   { tone({ type: 'triangle', f: 500, f2: 140, d: 0.3, v: 0.1 }); }   // 玩家被「極！」擊中緩速
  };

  // ---- 背景音樂 ----
  // 8 分音符步進（鼓組與「16 分」聲部再把每一步切成兩半）。每首曲子有：主旋律 lead、低音 bass，再依「和弦進行」自動長出其他聲部
  // （和聲、琶音、鋪底和弦、八度加厚、銅管和弦、節奏低音、鐘琴…）與鼓組。
  // 編曲會隨旋律重複的遍數推進（每 4 遍一輪）：第 1 遍只有主旋律 + 低音 + 輕鼓，之後每一遍多疊一些聲部、節奏越來越滿，
  // 第 4 遍最滿並在最後一小節加鼓的過門；每個 4 小節樂句的結尾也有小過門，然後回到第 1 遍。
  const cat = (...bars) => [].concat(...bars);       // 把每一小節（8 個 8 分音符）接成一整首
  const rep = (bar, n) => cat(...new Array(n).fill(bar));

  // 樂器（全部由振盪器 + 濾波器合成，選項說明見上方 tone()）
  const INS = {
    square: { type: 'square' }, triangle: { type: 'triangle' }, sine: { type: 'sine' }, sawtooth: { type: 'sawtooth' },
    bell: { type: 'sine', fm: { ratio: 3.5, idx: 1.4, decay: 0.4 } },                         // 鐘琴：明亮的金屬敲擊聲，很快衰減
    epiano: { type: 'sine', fm: { ratio: 1, idx: 1.0, decay: 0.5 } },                         // 電鋼琴：溫暖的圓潤音色
    pluck: { type: 'sawtooth', lp: { f: 4200, f2: 500, t: 0.5, q: 2 } },                     // 撥弦：一彈就由亮變暗
    strings: { type: 'sawtooth', uni: 9, lp: { f: 1500, q: 0.7 } },                           // 弦樂：兩個失諧的鋸齒波，聽起來有厚度
    brass: { type: 'sawtooth', lp: { f: 500, f2: 3200, t: 0.18, q: 1.5 } },                   // 銅管：由悶到亮的一記和弦
    flute: { type: 'sine', vib: { rate: 5.5, depth: 14 } },                                   // 長笛：帶顫音的柔和音色
    synbass: { type: 'sawtooth', lp: { f: 900, f2: 200, t: 0.6, q: 3 } }                      // 合成低音：有力的濾波鋸齒波
  };

  // 和弦：[根音的音級 0~11, 種類]。M 大三和弦、m 小三和弦、7 屬七和弦
  const Q = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10] };
  const pcsOf = c => Q[c[1]].map(x => (c[0] + x) % 12);
  const lowest = (pc, base) => base + (((pc - base) % 12) + 12) % 12;      // 比 base 高（或等於）的最低音高
  const chordAt = (chords, i) => chords[Math.floor(i / 8) % chords.length];

  // 琶音：每小節依和弦取 [根音、三音、五音、(七音)、高八度根音]，照 pat 的順序彈（-1 = 休止）。
  // pat 有 8 格 = 每個 8 分音符一個音；有 16 格 = 每個 16 分音符一個音（聲部要設 sub: true）
  function arpOf(chords, bars, base, pat) {
    const out = [];
    for (let b = 0; b < bars; b++) {
      const ts = pcsOf(chords[b % chords.length]).map(pc => lowest(pc, base)).sort((a, c) => a - c);
      ts.push(ts[0] + 12);
      for (let s = 0; s < pat.length; s++) out.push(pat[s] < 0 ? 0 : ts[pat[s] % ts.length]);
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

  // 和弦重音（銅管）：pat 裡是 1 的那一步同時彈三和弦
  function stabOf(chords, bars, base, pat) {
    const out = [];
    for (let b = 0; b < bars; b++) {
      const ts = pcsOf(chords[b % chords.length]).slice(0, 3).map(pc => lowest(pc, base));
      for (let s = 0; s < 8; s++) out.push(pat[s] ? ts : 0);
    }
    return out;
  }

  // 16 分音符的節奏低音：每小節 16 格，0 休止、1 根音、2 高八度、3 五音
  function bass16Of(chords, bars, base, pat) {
    const out = [];
    for (let b = 0; b < bars; b++) {
      const root = lowest(chords[b % chords.length][0], base);
      for (let s = 0; s < 16; s++) out.push(pat[s] === 0 ? 0 : pat[s] === 1 ? root : pat[s] === 2 ? root + 12 : root + 7);
    }
    return out;
  }

  // 八度加厚：主旋律低一個八度（太低的音不加）
  const octDown = lead => lead.map(n => (n - 12 >= 55 ? n - 12 : 0));

  // 鼓組：每個 8 分音符一格，格內用 / 隔開「正拍 / 後半拍（16 分音符）」；- 是休止。
  //   k 大鼓  s 小鼓  c 拍手  g 鬼音小鼓（很輕）  h 閉合汽鈴  o 開放汽鈴  t 高通鼓  u 低通鼓  x 鈸（樂句開頭）
  // 例："k/h h/h sc/h h/h" = 大鼓+汽鈴、汽鈴+汽鈴、小鼓+拍手+汽鈴、汽鈴+汽鈴
  const P = s => s.split(' ').map(x => (x === '-' ? '' : x));
  // 四遍由輕到滿（ps 是四個小節的鼓譜）：第 2 遍起每一遍開頭加鈸，每 4 小節的最後兩格加小過門，第 4 遍的最後一小節換成 fill 大過門
  function drumSet(bars, ps, fill) {
    return ps.map((p, k) => {
      const a = rep(P(p), bars);
      if (k > 0) {
        a[0] = a[0].replace(/^([^/]*)/, '$1x');
        for (const b of [3, 7]) if (b < bars) { a[b * 8 + 6] = 's/s'; a[b * 8 + 7] = 't/u'; }
      }
      if (k === 3) a.splice((bars - 1) * 8, 8, ...P(fill));
      return a;
    });
  }
  const FILL = 'k/h s/s sc/s t/t k/t t/u u/u sc/sc';                 // 大過門：小鼓連打 → 通鼓滾動 → 收尾

  // 一個聲部：ins 樂器、v 音量、len 音長（單位：8 分音符）、notes 每步的音（音高、和弦陣列或 0）、on 四遍各自開不開、
  // a 淡入、pan 左右聲道、sub = 音符是 16 分音符一格（notes 長度是旋律的兩倍）
  const lay = (ins, v, len, notes, on, a, pan, sub) => ({ ins, v, len, notes, on, a, pan, sub });

  // 主選單 · C 大調 · 128 BPM：和弦 C–F–G–C
  const MENU_CH = [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']];
  const MENU_LEAD = [76, 79, 84, 79, 76, 79, 84, 79,   77, 81, 84, 81, 77, 81, 84, 81,
                     79, 83, 86, 83, 79, 83, 86, 83,   84, 0, 79, 0, 76, 0, 72, 0];
  const MENU_BASS = [48, 0, 48, 0, 55, 0, 48, 0,   53, 0, 53, 0, 60, 0, 53, 0,
                     55, 0, 55, 0, 62, 0, 55, 0,   48, 0, 55, 0, 48, 0, 43, 0];
  const MENU = {
    bpm: 128,
    lead: MENU_LEAD,
    bass: MENU_BASS,
    layers: [
      lay('square', 0.035, 0.85, harmOf(MENU_LEAD, MENU_CH), [0, 1, 1, 1], 0, -0.3),                                    // 和聲
      lay('strings', 0.032, 7.4, padOf(MENU_CH, 4, 52), [0, 1, 1, 1], 0.25),                                           // 弦樂鋪底
      lay('bell', 0.045, 1.2, arpOf(MENU_CH, 4, 72, [-1, 1, -1, 2, -1, 3, -1, 2]), [0, 1, 1, 1], 0, 0.4),              // 鐘琴閃爍琶音（只彈反拍）
      lay('pluck', 0.04, 0.7, MENU_LEAD, [0, 0, 1, 1], 0, 0.3),                                                        // 撥弦加厚主旋律
      lay('synbass', 0.06, 0.9, MENU_BASS, [0, 0, 1, 1]),                                                              // 合成低音疊在原低音上
      lay('triangle', 0.08, 0.9, octDown(MENU_LEAD), [0, 0, 0, 1])                                                     // 八度加厚
    ],
    drums: drumSet(4, ['- - h - - - h -', 'k - h - s - h -', 'k/h h/h sc/h h/h k/h h/h sc/h h/o', 'k/h h/h sc/h h/k k/h h/h sc/h h/o'], FILL)
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
      lay('square', 0.035, 0.85, harmOf(PLAY_LEAD, PLAY_CH), [0, 1, 1, 1], 0, -0.3),                                    // 和聲
      lay('pluck', 0.06, 0.8, arpOf(PLAY_CH, 4, 57, [-1, 1, -1, 2, -1, 3, -1, 2]), [0, 0, 1, 1], 0, -0.3),             // 撥弦反拍琶音
      lay('strings', 0.03, 7.4, padOf(PLAY_CH, 4, 48), [0, 0, 1, 1], 0.15),                                            // 弦樂鋪底
      lay('brass', 0.04, 0.7, stabOf(PLAY_CH, 4, 57, [1, 0, 0, 1, 0, 0, 1, 0]), [0, 0, 1, 1], 0, 0.25),                // 銅管和弦重音（切分）
      lay('bell', 0.04, 1.3, PLAY_LEAD, [0, 1, 1, 1], 0, 0.35),                                                        // 鐘琴加厚主旋律
      lay('synbass', 0.07, 0.5, bass16Of(PLAY_CH, 4, 33, [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 0, 3, 2]), [0, 1, 1, 1], 0, 0, true),   // 16 分節奏低音
      lay('square', 0.04, 0.85, octDown(PLAY_LEAD), [0, 0, 0, 1])                                                      // 八度加厚
    ],
    drums: drumSet(4, ['k - h - k - h -', 'k h s h k h s h', 'k/h h/h sc/h h/h k/k h/h sc/h h/o', 'k/h h/h sc/g h/k k/h h/g sc/h h/o'], FILL)
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
      lay('square', 0.04, 0.85, harmOf(BOSS_LEAD, BOSS_CH), [1, 1, 1, 1], 0, -0.3),                                     // 和聲
      lay('pluck', 0.045, 0.7, arpOf(BOSS_CH, 4, 57, [0, 1, 2, 3, 2, 1, 2, 1]), [0, 1, 1, 1], 0, -0.3),                // 撥弦 8 分琶音
      lay('strings', 0.03, 7.4, padOf(BOSS_CH, 4, 45), [1, 1, 1, 1], 0.1),                                             // 弦樂鋪底
      lay('brass', 0.05, 0.6, stabOf(BOSS_CH, 4, 57, [1, 0, 0, 1, 0, 1, 0, 0]), [0, 1, 1, 1], 0, 0.25),                // 銅管和弦重音
      lay('synbass', 0.08, 0.45, bass16Of(BOSS_CH, 4, 33, [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 3, 2]), [1, 1, 1, 1], 0, 0, true),   // 16 分節奏低音（重）
      lay('square', 0.04, 0.85, octDown(BOSS_LEAD), [0, 0, 1, 1])                                                      // 八度加厚
    ],
    drums: drumSet(4, ['k/h h/h s/h h/h k/k h/h s/h h/h', 'k/h h/h sc/h h/k k/k h/h sc/h h/h', 'k/k h/h sc/h k/h k/k h/k sc/h h/o', 'k/k h/k sc/g k/h k/k h/k sc/s s/s'], FILL)
  };

  // 黃昏 · 夕陽：C 大調、慢板（108 BPM）。和弦 C–G–Am–Em–F–C–F–G，長音三角波旋律 + 電鋼琴琶音 + 長笛 + 輕柔鼓點，帶一點懷舊感
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
      lay('epiano', 0.06, 1.8, cat(                                                                                    // 電鋼琴琶音（原本方波琶音的音符）
        [60, 64, 67, 72, 67, 64, 67, 64],
        [59, 62, 67, 71, 67, 62, 67, 62],
        [60, 64, 69, 72, 69, 64, 69, 64],
        [59, 64, 67, 71, 67, 64, 67, 64],
        [60, 65, 69, 72, 69, 65, 69, 65],
        [60, 64, 67, 72, 67, 64, 67, 64],
        [60, 65, 69, 72, 69, 65, 69, 65],
        [59, 62, 67, 71, 67, 62, 67, 62]), [1, 1, 1, 1], 0, -0.3),
      lay('strings', 0.03, 7.6, padOf(DUSK_CH, 8, 48), [1, 1, 1, 1], 0.5),                                            // 弦樂鋪底（慢慢淡入）
      lay('triangle', 0.08, 3.2, harmOf(DUSK_LEAD, DUSK_CH), [0, 1, 1, 1], 0, -0.2),                                   // 和聲
      lay('flute', 0.06, 3.2, DUSK_LEAD, [0, 1, 1, 1], 0, 0.2),                                                        // 長笛跟著主旋律（帶顫音）
      lay('bell', 0.035, 1.6, arpOf(DUSK_CH, 8, 84, [-1, -1, -1, 1, -1, -1, 2, -1]), [0, 0, 1, 1], 0, 0.4),            // 鐘琴的星光點綴
      lay('sine', 0.07, 3.4, octDown(DUSK_LEAD), [0, 0, 1, 1])                                                         // 八度加厚
    ],
    drums: drumSet(8, ['k - h - s - h -', 'k - h/h - s - h/h h', 'k - h/h k s - h/h h/o', 'k - h/h k/g s - h/h h/o'], 'k - h - s t/t u/u sc')
  };

  // 黑夜 · 星空：E 小調、中快板（136 BPM）。和弦 Em–C–G–D–Am–Em–C–B，跳動的節奏低音 + 高音玻璃般的星星琶音 + 稀疏的方波旋律，神祕又帶緊張感
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
      lay('sine', 0.08, 1.1, cat(                                                                                      // 星星琶音（原有）
        [76, 79, 83, 88, 83, 79, 83, 79],
        [76, 79, 84, 88, 84, 79, 84, 79],
        [74, 79, 83, 86, 83, 79, 83, 79],
        [74, 78, 81, 86, 81, 78, 81, 78],
        [76, 81, 84, 88, 84, 81, 84, 81],
        [76, 79, 83, 88, 83, 79, 83, 79],
        [76, 79, 84, 88, 84, 79, 84, 79],
        [71, 75, 78, 83, 78, 75, 78, 75]), [1, 1, 1, 1], 0, 0.3),
      lay('strings', 0.032, 7.6, padOf(NIGHT_CH, 8, 52), [1, 1, 1, 1], 0.5),                                           // 弦樂鋪底
      lay('square', 0.028, 2.2, harmOf(NIGHT_LEAD, NIGHT_CH), [0, 1, 1, 1], 0, -0.3),                                  // 和聲
      lay('pluck', 0.045, 0.8, arpOf(NIGHT_CH, 8, 52, [0, 2, 1, 2, 0, 2, 1, 2]), [0, 1, 1, 1], 0, -0.35),              // 撥弦琶音（中音域）
      lay('bell', 0.03, 1.6, arpOf(NIGHT_CH, 8, 84, [-1, 1, -1, -1, 2, -1, -1, 3]), [0, 0, 1, 1], 0, 0.4),             // 鐘琴的星星閃爍
      lay('synbass', 0.07, 0.5, bass16Of(NIGHT_CH, 8, 33, [1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 1, 0, 2, 0, 3, 0]), [0, 0, 1, 1], 0, 0, true),   // 16 分節奏低音
      lay('square', 0.03, 2.2, octDown(NIGHT_LEAD), [0, 0, 0, 1])                                                      // 八度加厚
    ],
    drums: drumSet(8, ['k - h - s - h -', 'k - h/h k s - h/h h/h', 'k h/h h/h k s h/h k h/o', 'k/h h/h s/h k/h s/k h/h s/h h/o'], FILL)
  };

  const TRACKS = { menu: MENU, play: PLAY, boss: BOSS, dusk: DUSK, night: NIGHT };

  // 排一個 8 分音符步（i = 在旋律裡的第幾步，pass = 旋律重複到第幾遍）
  function playStep(T, i, pass, stepDur, delay) {
    if (T.lead[i]) tone(Object.assign({}, INS[T.leadType || 'square'], { f: mtof(T.lead[i]), d: stepDur * (T.leadLen || 0.85), v: T.leadV || 0.07, bus: musBus, delay }));
    if (T.bass[i]) tone({ type: 'triangle', f: mtof(T.bass[i]), d: stepDur * 0.95, v: 0.16, bus: musBus, delay });
    for (const L of T.layers || []) {
      if (!L.on[pass % L.on.length]) continue;
      for (let h = 0; h < (L.sub ? 2 : 1); h++) {                          // sub 聲部每個 8 分音符裡排兩個 16 分音符
        const note = L.notes[(L.sub ? i * 2 + h : i) % L.notes.length];
        if (!note) continue;
        for (const m of (Array.isArray(note) ? note : [note])) {
          tone(Object.assign({}, INS[L.ins], { f: mtof(m), d: stepDur * L.len, v: L.v, a: L.a, pan: L.pan, bus: musBus, delay: delay + h * stepDur / 2 }));
        }
      }
    }
    if (T.drums) { const D = T.drums[pass % T.drums.length]; drum(D[i % D.length], delay, stepDur); }
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

  // 鼓：一格的寫法是「正拍 / 後半拍」，後半拍在半個 8 分音符之後（16 分音符）
  function drum(entry, delay, stepDur) {
    if (!entry) return;
    const parts = entry.split('/');
    hit(parts[0], delay);
    if (parts[1]) hit(parts[1], delay + stepDur / 2);
  }
  function hit(chars, delay) {
    for (const ch of chars) {
      if (ch === 'k') tone({ type: 'sine', f: 150, f2: 45, d: 0.13, v: 0.22, bus: musBus, delay });
      else if (ch === 's') { noise({ d: 0.1, v: 0.08, f: 3600, bus: musBus, delay }); tone({ type: 'triangle', f: 200, f2: 110, d: 0.08, v: 0.06, bus: musBus, delay }); }
      else if (ch === 'c') noise({ d: 0.08, v: 0.09, f: 1700, ft: 'bandpass', q: 1.2, bus: musBus, delay });
      else if (ch === 'g') noise({ d: 0.05, v: 0.03, f: 3000, bus: musBus, delay });
      else if (ch === 'h') noise({ d: 0.04, v: 0.035, f: 9000, ft: 'highpass', bus: musBus, delay });
      else if (ch === 'o') noise({ d: 0.18, v: 0.04, f: 8000, ft: 'highpass', bus: musBus, delay });
      else if (ch === 't') tone({ type: 'sine', f: 230, f2: 120, d: 0.16, v: 0.14, bus: musBus, delay });
      else if (ch === 'u') tone({ type: 'sine', f: 150, f2: 70, d: 0.2, v: 0.15, bus: musBus, delay });
      else if (ch === 'x') noise({ d: 1.1, v: 0.06, f: 5500, ft: 'highpass', bus: musBus, delay });
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
    sfx(name, arg) { if (unlocked && SFX[name]) SFX[name](arg); },
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
    get tracks() { return TRACKS; },                    // 測試用：曲子資料（可以暫時關掉某個聲部來單獨試聽 / 量音量）

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
