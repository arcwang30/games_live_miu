// BOSS：三種角色輪流出現（play-scene.js 依 BOSS 等級 % 3 選擇），流程與階段規則共用：
//   流氓大老鼠（獨眼面罩 + 太空裝，kind='gangster'）
//     狀態機：enter（登場）→ idle（待機）→ 依洗牌袋輪流抽 4 種攻擊 → idle …
//       fan    傘狀便便彈：扇形散射便便，連發 3～4 輪，奇數輪錯開縫隙
//       cheese 丟起司：舉起起司（末段出現黃色瞄準線）後連續快速直線彈
//       charge 身體衝撞：地上標出紅色衝撞道，鎖定後直線俯衝出畫面，再從上方回場
//       claw   爪擊（近戰）：欺近玩家、舉爪蓄力（顯示危險扇形）、揮爪；
//              蓄力～收招期間有護盾，會把玩家子彈反彈回來（此時打不到 BOSS）
//   桐生爹鼠（白西裝硬派流氓，kind='kiryu'）：沒有護盾，改成非致命的「緩速」debuff
//       slash  揮刀：舉刀後射出刀劍光波子彈，大範圍扇形斬擊，連揮 1～3 次
//       punch  百裂拳：欺近玩家後兩手連續揮拳（近戰，命中判定是以身體為圓心的圓形範圍）
//       cone   三角錐攻擊：射出小刀，飛行一小段時間後在原地炸裂成一圈碎片四散
//       shout  「極！」：口中喊出文字並向外擴散，玩家碰到範圍內會被緩速（不會扣命）
//   狠蘭達鼠（阿修羅四臂法師，kind='asura'）：最終 BOSS，每 3 隻才出現一次（比另外兩隻更強、更快），純法術系、沒有近戰
//       blade   揮劍：雙重十字斬，兩輪扇形光刃交錯射出
//       trident 三叉戟：三發一組的貫穿齊射，瞄準玩家
//       bell    法鈴：以自己為圓心，一次齊發一整圈音波珠（跟桐生爹鼠的螺旋不同，是同時發射的滿圈）
//       wheel   法輪：射出會迴旋轉彎的法輪，軌跡難預測
// 血量 66% / 33% 進入第 2 / 3 階段（速度 ×1.12 / ×1.25，發數增加，三種 BOSS 共用）。
// 血量歸零 → dying：定格、換一張表情（厭世 / 被打趴 / 暈眩），嘆氣、講一句隨機抽的台詞，最後才爆炸 → dead。
(function (BM) {
  const C = BM.CONFIG, B = C.BOSS, B2 = C.BOSS2, B3 = C.BOSS3, M = BM.M, D = BM.Draw, W = C.W, H = C.H, PI = Math.PI;

  // ---- 死亡台詞：文字放在 i18n（流氓大老鼠 'boss.l.<id>'、桐生爹鼠 'boss2.l.<id>'，中日英各一份），這裡決定「什麼情況抽哪些」----
  // any 通用；day / dusk / night 依時段；lv1 / lv2 / lv3 依第幾隻 BOSS（lv3 = 第 3 隻起，台詞裡的 {n} 會換成第幾隻）；
  // flawless 這局一條命都沒丟過；manyDeaths 這局死了 3 次以上；fast 戰鬥很短；slow 戰鬥很久
  // 流氓大老鼠：厭世 / 社畜風格，55 句
  const LINES = {
    any: ['g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'g07', 'g08', 'g09', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16', 'g17', 'g18', 'g19', 'g20', 'g21', 'g22', 'g23', 'g24', 'g25', 'g26'],
    day: ['day1', 'day2', 'day3'], dusk: ['dusk1', 'dusk2', 'dusk3'], night: ['night1', 'night2', 'night3'],
    lv1: ['lv1a', 'lv1b', 'lv1c'], lv2: ['lv2a', 'lv2b', 'lv2c'], lv3: ['lv3a', 'lv3b', 'lv3c', 'lv3d'],
    flawless: ['flaw1', 'flaw2', 'flaw3'], manyDeaths: ['many1', 'many2', 'many3'], fast: ['fast1', 'fast2'], slow: ['slow1', 'slow2']
  };
  // 桐生爹鼠：硬派流氓大哥風格（比較自負、講義氣，偶爾也會慘叫），先給一組較小的台詞庫
  const LINES2 = {
    any: ['k01', 'k02', 'k03', 'k04', 'k05', 'k06', 'k07', 'k08', 'k09', 'k10', 'k11', 'k12'],
    lv1: ['klv1a', 'klv1b'], lv2: ['klv2a', 'klv2b'], lv3: ['klv3a', 'klv3b'],
    flawless: ['kflaw1', 'kflaw2'], manyDeaths: ['kmany1', 'kmany2'], fast: ['kfast1'], slow: ['kslow1']
  };
  // 狠蘭達鼠：最終 BOSS，神祕 / 超脫生死的語氣，呼應名字的諧音「很難打死」
  const LINES3 = {
    any: ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07', 'u08', 'u09', 'u10', 'u11', 'u12'],
    lv1: ['ulv1a', 'ulv1b'], lv2: ['ulv2a', 'ulv2b'], lv3: ['ulv3a', 'ulv3b'],
    flawless: ['uflaw1', 'uflaw2'], manyDeaths: ['umany1', 'umany2'], fast: ['ufast1'], slow: ['uslow1']
  };
  const SPECIFIC_WEIGHT = 4;             // 符合情境的台詞，被抽到的機會是通用台詞的 4 倍（一般情況下大約一半的時候會是「針對你這一場」的吐槽）
  const FAST_UNDER = 50, SLOW_OVER = 110; // 戰鬥秒數（含登場約 2 秒）：低於 / 高於這個算「很快 / 很久」
  const recent = [], recent2 = [], recent3 = [];   // 最近抽過的台詞（三隻 BOSS 分開記，不會連續重複）

  // ctx = { phase: 'day'|'dusk'|'night', level, deaths, time }；table 省略 = 流氓大老鼠；回傳台詞 id
  function pickLine(ctx, table, recentList) {
    table = table || LINES; recentList = recentList || recent;
    const groups = ['any', ctx.phase, ctx.level >= 3 ? 'lv3' : ctx.level === 2 ? 'lv2' : 'lv1'];
    if (ctx.deaths === 0) groups.push('flawless');
    if (ctx.deaths >= 3) groups.push('manyDeaths');
    if (ctx.time < FAST_UNDER) groups.push('fast');
    if (ctx.time > SLOW_OVER) groups.push('slow');
    let pool = [];
    for (const g of groups) for (const id of (table[g] || [])) if (!recentList.includes(id)) pool.push({ id, w: g === 'any' ? 1 : SPECIFIC_WEIGHT });
    if (!pool.length) pool = table.any.map(id => ({ id, w: 1 }));
    let r = Math.random() * pool.reduce((s, p) => s + p.w, 0), pick = pool[pool.length - 1];
    for (const p of pool) { r -= p.w; if (r <= 0) { pick = p; break; } }
    recentList.push(pick.id);
    if (recentList.length > 8) recentList.shift();
    return pick.id;
  }

  const KINDS = {                        // 每種 BOSS 的 4 招攻擊洗牌袋
    gangster: ['fan', 'cheese', 'charge', 'claw'],
    kiryu: ['slash', 'punch', 'cone', 'shout'],
    asura: ['blade', 'trident', 'bell', 'wheel']
  };

  class Boss {
    // 難度曲線改成「輪」為單位（一輪 = 3 隻 BOSS 依序登場）：輪內用 posInRound 做小幅遞增（壓軸的狠蘭達鼠最強），
    // 長期的難度成長主要交給 roundBonus（每過一輪 +1 級，封頂），這樣往後每一輪都會再更難一點，不會像舊版只看 level 連續遞增、
    // 到第 2～3 輪（level 6～9）就整個封頂、之後永遠一樣難。
    constructor(level, kind) {
      this.level = level;
      this.kind = kind === 'kiryu' ? 'kiryu' : kind === 'asura' ? 'asura' : 'gangster';
      const pos = this.posInRound, rb = this.roundBonus;
      this.maxHp = Math.min(B.hpMax + rb * 48, B.hpBase + B.hpPerLevel * (pos - 1) + rb * 48);
      if (this.kind === 'asura') this.maxHp = Math.min(450 + rb * 32, Math.round(this.maxHp * B3.hpMul));   // 最終 BOSS：血量在共用曲線上再加成，是三隻裡最硬的
      this.hp = this.maxHp;
      this.ghost = this.maxHp;          // 血條殘影
      this.x = W / 2; this.y = -180;
      this.radius = B.radius;           // 兩種 BOSS 尺寸相同
      this.guardR = B.guardRadius;
      this.state = 'enter';
      this.t = 0; this.time = 0;
      this.a = {};
      this.face = 'normal';
      this.phase = 1;
      this.flash = 0;
      this.guarding = false;
      this.rot = 0; this.sx = 0;
      this.bag = []; this.last = '';
      this.done = false;
      this.tele = null;
      this.puffs = [];
      this.swayT = Math.random() * 6;
      this.lm = Math.min(1.9, 1 + 0.05 * (pos - 1) + 0.1 * rb);     // 動作速度倍率：輪內小幅遞增 + 輪次主要成長
      this.bm = Math.min(1.7, 1 + 0.03 * (pos - 1) + 0.07 * rb);    // 子彈速度倍率：同上
      this.px = W / 2; this.py = 800;                      // 最近一次看到的玩家位置
      this.idleDur = 1;
    }

    get cy() { return this.y + 8; }                        // 身體判定圓中心
    get spd() { return this.lm * [1, 1.12, 1.25][this.phase - 1]; }
    get alive() { return this.state !== 'dying' && this.state !== 'dead'; }
    get vulnerable() { return this.alive && this.state !== 'enter' && !this.guarding; }
    get lethal() { return this.alive && this.state !== 'enter'; }      // 身體碰到玩家會致命
    get barK() { return this.state === 'enter' ? Math.min(1, this.t / 2.2) : 1; }
    get nameKey() { return this.kind === 'kiryu' ? 'boss2.name' : this.kind === 'asura' ? 'boss3.name' : 'boss.name'; }
    get spritePrefix() { return this.kind === 'kiryu' ? 'kiryu_' : this.kind === 'asura' ? 'asura_' : 'boss_'; }
    // 難度曲線以「輪」為單位（一輪 = 3 隻 BOSS 依序登場，15 波）：
    get posInRound() { return ((this.level - 1) % 3) + 1; }          // 這一輪裡第幾隻登場（1 流氓大老鼠／2 桐生爹鼠／3 狠蘭達鼠）
    get round() { return Math.ceil(this.level / 3); }                 // 第幾輪（1 起算）
    get roundBonus() { return Math.min(6, this.round - 1); }          // 血量／速度倍率的輪次加成，封頂（第 7 輪之後不再加）
    // 狠蘭達鼠第幾次出場（0 = 第一次，第 15 波；1 = 第 30 波…最多疊 3 次）：彈幕量第一次刻意壓低，之後每次出場再漸進變難
    get asuraTier() { return this.kind === 'asura' ? Math.min(3, this.round - 1) : 0; }

    // ------------------------------------------------ 受傷 / 死亡
    damage(n, w) {
      if (!this.alive) return;
      this.hp = Math.max(0, this.hp - n);
      this.flash = 0.07;
      const ph = this.hp <= this.maxHp * 0.33 ? 3 : this.hp <= this.maxHp * 0.66 ? 2 : 1;
      if (ph > this.phase && this.hp > 0) { this.phase = ph; w.onBossPhase(ph); }
      if (this.hp <= 0) this.die(w);
    }

    die(w) {
      this.state = 'dying';
      this.t = 0;
      this.a = { ex: 0, puff: 0 };
      // 死亡台詞：依時段 / 第幾隻 / 這局表現隨機抽（兩隻 BOSS 各用自己的台詞庫）
      const ctx = { phase: BM.Background.phaseFor(w.wave), level: this.level, deaths: w.deaths || 0, time: this.time };
      this.lineId = this.kind === 'kiryu' ? pickLine(ctx, LINES2, recent2) : this.kind === 'asura' ? pickLine(ctx, LINES3, recent3) : pickLine(ctx, LINES, recent);
      this.face = 'dead';
      this.guarding = false;
      w.onBossDying();
    }

    // ------------------------------------------------ 共用移動
    hover(dt, sway) {
      const tx = W / 2 + Math.sin(this.time * 0.8 + this.swayT) * 150 * sway;
      this.x += (tx - this.x) * Math.min(1, 2.2 * dt);
      this.y += (B.homeY + Math.sin(this.time * 2.1) * 7 - this.y) * Math.min(1, 4 * dt);
    }

    toIdle() {
      this.state = 'idle';
      this.t = 0;
      this.a = {};
      this.face = 'normal';
      this.idleDur = (this.kind === 'asura' ? B3.idle : B.idle) / this.spd;   // 最終 BOSS 攻擊間隔比另外兩隻短，逼玩家不能放鬆
    }

    nextAttack(w) {
      if (!this.bag.length) this.bag = M.shuffle(KINDS[this.kind].slice());
      let kind = this.bag.pop();
      if (kind === this.last && this.bag.length) { const o = this.bag.pop(); this.bag.push(kind); kind = o; }
      this.last = kind;
      this.state = kind;
      this.t = 0;
      this.face = 'angry';
      switch (kind) {
        case 'fan':    this.a = { stage: 'wind', t: 0, volley: 0, timer: 0, total: this.phase === 3 ? 4 : 3 }; break;
        case 'cheese': this.a = { stage: 'wind', t: 0, thrown: 0, timer: 0, total: 2 + this.phase }; break;
        case 'charge': this.a = { stage: 'tele', t: 0, lockX: this.x, locked: false, vy: 0, n: 0, total: this.phase === 3 ? 2 : 1 }; w.sfx('lock'); break;
        case 'claw':   this.a = { stage: 'approach', t: 0, n: 0, total: this.phase >= 2 ? 2 : 1, dir: 1, theta: PI / 2 }; w.sfx('clawWind'); break;
        case 'slash':  this.a = { stage: 'approach', t: 0, n: 0, total: this.phase >= 2 ? 2 : 1, flashT: 0 }; break;    // 跟爪擊同樣的欺近→蓄力→出招節奏，1～2 揮
        case 'punch':  this.a = { stage: 'approach', t: 0, n: 0, total: 4 + this.phase * 2, timer: 0, jab: false, jabT: 0 }; break;               // 6/8/10 拳
        case 'cone':   this.a = { stage: 'wind', t: 0, thrown: 0, timer: 0, total: this.phase, pending: [] }; break;   // 1/2/3 把，原本 2/3/4 太密
        case 'shout':  this.a = { stage: 'wind', t: 0, thrown: 0, timer: 0, total: 14 + this.phase * 4, ang: Math.random() * M.TAU }; w.sfx('shout'); break;  // 18/22/26 發，繞著 BOSS 轉出螺旋
        case 'blade':   this.a = { stage: 'wind', t: 0, volley: 0, timer: 0, total: 1 + this.phase }; break;                              // 2/3/4 輪雙重十字斬（使用者反應第 15 波密度太高難閃，減量；每輪的光刃數在 fireBlade() 依出場次數調整）
        case 'trident': this.a = { stage: 'wind', t: 0, thrown: 0, timer: 0, total: 1 + this.phase + this.asuraTier }; break;             // 2/3/4 組（第一次出場刻意減量），之後每次出場再 +1 組（最多 +3）
        case 'bell':    this.a = { stage: 'wind', t: 0, rung: 0, timer: 0, total: B3.bellRings + this.phase - 1 + this.asuraTier }; w.sfx('bellRing'); break;   // 2/3/4 圈（第一次出場刻意減量），之後每次出場再 +1 圈（最多 +3）
        case 'wheel':   this.a = { stage: 'wind', t: 0, thrown: 0, timer: 0, total: this.phase + Math.min(2, this.asuraTier) }; break;    // 1/2/3 個法輪，之後每次出場再 +1（最多 +2，法輪本來就難閃不宜加太多）
      }
    }

    // ------------------------------------------------ 更新
    update(dt, w) {
      this.time += dt; this.t += dt;
      if (this.flash > 0) this.flash -= dt;
      const p = w.player;
      this.px = p.x; this.py = p.y;
      this.ghost = Math.max(this.hp, this.ghost - this.maxHp * 0.3 * dt);
      this.sx = 0; this.tele = null; this.guarding = false;
      if (this.alive) this.rot += (0 - this.rot) * Math.min(1, 6 * dt);

      switch (this.state) {
        case 'enter': {
          const k = Math.min(1, this.t / 2.4);
          this.y = M.lerp(-180, B.homeY, M.easeOutCubic(k));
          if (k >= 1) this.toIdle();
          break;
        }
        case 'idle':
          this.hover(dt, 1);
          if (p.alive && this.t >= this.idleDur) this.nextAttack(w);
          break;
        case 'fan': this.updateFan(dt, w); break;
        case 'cheese': this.updateCheese(dt, w); break;
        case 'charge': this.updateCharge(dt, w); break;
        case 'claw': this.updateClaw(dt, w); break;
        case 'slash': this.updateSlash(dt, w); break;
        case 'punch': this.updatePunch(dt, w); break;
        case 'cone': this.updateCone(dt, w); break;
        case 'shout': this.updateShout(dt, w); break;
        case 'blade': this.updateBlade(dt, w); break;
        case 'trident': this.updateTrident(dt, w); break;
        case 'bell': this.updateBell(dt, w); break;
        case 'wheel': this.updateWheel(dt, w); break;
        case 'dying': this.updateDying(dt, w); break;
      }

      for (const f of this.puffs) { f.t += dt; f.y -= 34 * dt; f.x += 10 * dt; }
      this.puffs = this.puffs.filter(f => f.t < 1.6);
    }

    // ---- 傘狀便便彈 ----
    updateFan(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.4);
      if (!w.player.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.sx = Math.sin(this.time * 50) * 1.6;
        if (a.t >= 0.55 / this.spd) { a.stage = 'fire'; a.t = 0; a.timer = 0; }
      } else if (a.stage === 'fire') {
        a.timer -= dt;
        if (a.timer <= 0) {
          this.fireFan(w, a.volley);
          a.volley++;
          a.timer = 0.58 / this.spd;
          if (a.volley >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.7 / this.spd) this.toIdle();
    }

    fireFan(w, volley) {
      const count = this.phase >= 2 ? 9 : 7, span = 1.8;
      const center = M.clamp(Math.atan2(this.py - this.y, this.px - this.x), PI / 2 - 0.5, PI / 2 + 0.5);
      const odd = volley % 2 === 1, step = span / (count - 1);
      const n = odd ? count - 1 : count;
      const start = center - span / 2 + (odd ? step / 2 : 0);   // 奇數輪往旁邊錯半格，形成新的縫隙
      const sp = B.poopSpeed * this.bm * (this.phase === 3 ? 1.1 : 1);
      for (let i = 0; i < n; i++) w.fireBullet(this.x, this.y + 62, start + i * step, sp, 'poop');
      w.sfx('poop');
    }

    // ---- 丟起司 ----
    updateCheese(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.4);
      const p = w.player;
      if (!p.alive) { this.toIdle(); return; }
      const hx = this.x + 30, hy = this.y + 48;
      if (a.stage === 'wind') {
        const dur = 0.7 / this.spd;
        this.tele = { type: 'cheese', hx, hy, k: Math.min(1, a.t / dur), aim: a.t >= dur - 0.35 };
        if (a.t >= dur) { a.stage = 'throw'; a.t = 0; a.timer = 0; }
      } else if (a.stage === 'throw') {
        a.timer -= dt;
        if (a.timer <= 0) {
          // 微預判：只會左右橫移的玩家也會被打到（速度上限取鍵盤移動速度，觸控高速飛行時不會預判過頭）
          const lead = M.clamp(p.x + M.clamp(p.vx, -C.PLAYER.speed, C.PLAYER.speed) * 0.2, 20, W - 20);
          w.fireBullet(hx, hy, Math.atan2(p.y - hy, lead - hx), B.cheeseSpeed * this.bm, 'cheese');
          w.sfx('cheese');
          a.thrown++;
          a.timer = 0.26 / this.spd;
          if (a.thrown >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.7 / this.spd) this.toIdle();
    }

    // ---- 身體衝撞 ----
    updateCharge(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      switch (a.stage) {
        case 'tele': {
          const dur = (a.n === 0 ? 0.95 : 0.7) / this.spd;
          if (!a.locked) a.lockX += M.clamp(p.x - a.lockX, -260 * dt, 260 * dt);    // 衝撞道跟著玩家，最後 0.4 秒鎖定
          if (!a.locked && a.t >= dur - 0.4) { a.locked = true; w.sfx('lock'); }
          this.x += (a.lockX - this.x) * Math.min(1, 8 * dt);
          this.y += (B.homeY - 40 * M.easeOutCubic(Math.min(1, a.t / 0.4)) - this.y) * Math.min(1, 10 * dt);
          this.sx = Math.sin(this.time * 60) * 2.2;
          this.tele = { type: 'lane', x: a.lockX, locked: a.locked };
          if (a.t >= dur) { a.stage = 'rush'; a.t = 0; a.vy = 250; this.x = a.lockX; w.sfx('charge'); w.addShake(0.25); }
          break;
        }
        case 'rush':
          a.vy = Math.min(1150, a.vy + 2600 * dt);
          this.y += a.vy * dt;
          if (this.y > H + 140) { a.stage = 'gone'; a.t = 0; a.n++; }
          break;
        case 'gone':
          if (a.t >= 0.6) {
            this.x = W / 2 + M.rand(-100, 100); this.y = -180;
            a.stage = 'reenter'; a.t = 0; a.locked = false; a.lockX = this.x;
          }
          break;
        case 'reenter': {
          const k = Math.min(1, a.t / 1.0);
          this.y = M.lerp(-180, B.homeY - 40, M.easeOutCubic(k));
          if (k >= 1) {
            if (a.n < a.total && p.alive) { a.stage = 'tele'; a.t = 0; }
            else this.toIdle();
          }
          break;
        }
      }
    }

    // ---- 爪擊（近戰 + 反彈子彈）----
    updateClaw(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      const ty = M.clamp(p.y - 190, 300, 660);
      if (!p.alive && (a.stage === 'approach' || a.stage === 'wind' || a.stage === 'wind2')) { a.stage = 'retreat'; a.t = 0; }
      const SEC = B.clawSweep + B.clawHalf;

      switch (a.stage) {
        case 'approach':
          this.x += (p.x - this.x) * Math.min(1, 4 * dt);
          this.y += (ty - this.y) * Math.min(1, 5 * dt);
          if (a.t >= 0.9 / this.spd || (a.t > 0.4 && Math.abs(ty - this.y) < 10)) {
            a.stage = 'wind'; a.t = 0; a.dir = Math.random() < 0.5 ? 1 : -1; w.sfx('clawWind');
          }
          break;
        case 'wind': case 'wind2': {
          this.guarding = true;
          const dur = (a.stage === 'wind' ? 0.95 : 0.55) / this.spd;
          const locked = a.t >= dur - 0.28;
          if (!locked) this.x += M.clamp(p.x - this.x, -130 * dt, 130 * dt);          // 揮爪前 0.28 秒鎖定位置
          this.sx = Math.sin(this.time * 45) * 1.2;
          this.tele = { type: 'claw', k: Math.min(1, a.t / dur), locked, sec: SEC };
          if (a.t >= dur) { a.stage = 'swipe'; a.t = 0; w.sfx('slash'); w.addShake(0.2); }
          break;
        }
        case 'swipe': {
          this.guarding = true;
          const k = Math.min(1, a.t / 0.3);
          a.theta = PI / 2 + a.dir * (-B.clawSweep + 2 * B.clawSweep * k);
          this.tele = { type: 'claw', k: 1, locked: true, sec: SEC, theta: a.theta };   // 揮爪時也顯示危險扇形與當下的打擊範圍
          if (k >= 1) { a.n++; a.stage = 'recover'; a.t = 0; a.dir *= -1; }
          break;
        }
        case 'recover':
          this.guarding = true;
          if (a.t >= 0.5 / this.spd) {
            if (a.n < a.total && p.alive) { a.stage = 'wind2'; a.t = 0; w.sfx('clawWind'); }
            else { a.stage = 'retreat'; a.t = 0; }
          }
          break;
        case 'retreat':
          this.hover(dt, 0.6);
          if (Math.abs(this.y - B.homeY) < 14) this.toIdle();
          break;
      }
    }

    // 揮爪判定：以身體為圓心的扇形，隨揮動角度移動。
    // 判定範圍不會比畫面上的紅色危險扇形（±(clawSweep+clawHalf) 弧度、半徑 clawOut）更大：
    // 只有玩家中心點確實在扇形內才算被擊中，站在扇形之外一定安全。
    clawHit(p) {
      if (this.state !== 'claw' || this.a.stage !== 'swipe') return false;
      const dx = p.x - this.x, dy = p.y - this.cy, d = Math.hypot(dx, dy);
      if (d < B.clawIn || d > B.clawOut) return false;
      return Math.abs(M.wrapAngle(Math.atan2(dy, dx) - this.a.theta)) < B.clawHalf;
    }

    // 近戰命中判定總入口（play-scene.js 只呼叫這個）：流氓大老鼠是爪擊，桐生爹鼠是百裂拳
    meleeHit(p) {
      if (this.state === 'claw') return this.clawHit(p);
      if (this.state === 'punch') return this.punchHit(p);
      return false;
    }
    // 拳頭本身的判定：像流星拳一樣，整串連續出拳都打在同一個固定區塊（flurry 開始時鎖定的 a.tx/a.ty），不是追著玩家跑
    punchHit(p) {
      if (this.state !== 'punch' || !this.a.jab) return false;
      const dx = p.x - this.a.tx, dy = p.y - this.a.ty;
      return dx * dx + dy * dy < B2.punchHitR * B2.punchHitR;
    }
    // 拳頭座標：從「手」的固定位置（配合貼圖左右手，不是身體中心，也不是嘴巴）伸向鎖定的目標區塊；k = 伸出的進度（0~1）
    punchFist(k) {
      const a = this.a, hx = this.x + a.dir * 76, hy = this.y + 70;
      const dx = a.tx - hx, dy = a.ty - hy, full = Math.min(B2.punchReach + 80, Math.hypot(dx, dy) || 1);
      const ang = Math.atan2(dy, dx), ext = Math.min(1, k * 1.6);
      return { x: hx + Math.cos(ang) * full * ext, y: hy + Math.sin(ang) * full * ext, hx, hy, ang };
    }

    // ---- 桐生爹鼠：揮刀（節奏模擬流氓大老鼠的爪擊：欺近→舉刀蓄力→揮，但不是近戰，而是射出一道半月形弧光往畫面下方飛）----
    updateSlash(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      if (a.flashT > 0) a.flashT -= dt;
      if (!p.alive && (a.stage === 'approach' || a.stage === 'wind' || a.stage === 'wind2')) { a.stage = 'retreat'; a.t = 0; return; }
      switch (a.stage) {
        case 'approach':
          this.x += (p.x - this.x) * Math.min(1, 4 * dt);          // 欺近到玩家正上方（跟爪擊一樣），弧光才會準準地往玩家所在的方向落下
          this.y += (B.homeY - this.y) * Math.min(1, 5 * dt);
          if (a.t >= 0.7 / this.spd || a.t > 0.4) { a.stage = 'wind'; a.t = 0; w.sfx('clawWind'); }
          break;
        case 'wind': case 'wind2': {
          const dur = (a.stage === 'wind' ? 0.55 : 0.4) / this.spd;
          this.sx = Math.sin(this.time * 50) * 1.8;                 // 舉刀蓄力：身體顫抖 + 刀身閃光提示（drawTele 的 'slash' 類型）
          this.tele = { type: 'slash', k: Math.min(1, a.t / dur) };
          if (a.t >= dur) { a.stage = 'release'; a.t = 0; this.fireMoon(w); this.tele = null; }
          break;
        }
        case 'release':
          if (a.t >= 0.2 / this.spd) {
            a.n++;
            if (a.n < a.total && p.alive) { a.stage = 'wind2'; a.t = 0; w.sfx('clawWind'); }
            else { a.stage = 'retreat'; a.t = 0; }
          }
          break;
        case 'retreat':
          this.hover(dt, 0.6);
          if (Math.abs(this.y - B.homeY) < 14) this.toIdle();
          break;
      }
    }
    // 射出一道半月形弧光，直直往畫面下方飛（此時 BOSS 已經欺近到玩家正上方，等同瞄準了玩家）
    fireMoon(w) {
      w.fireBullet(this.x, this.y + 50, PI / 2, B2.moonSpeed * this.bm, 'moon');
      this.a.flashCenter = PI / 2; this.a.flashSpan = 1.15; this.a.flashT = 0.26;   // 揮刀的白色弧光（drawSwordFlash，加大加粗強化魄力）
      BM.Particles.explode(this.x, this.y + 50, '#bfe6ff', 16);
      BM.Particles.explode(this.x, this.y + 50, '#ffffff', 8);
      w.sfx('knife'); w.addShake(0.22);
    }

    // ---- 桐生爹鼠：百裂拳（欺近後連續揮拳，近戰）----
    updatePunch(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      if (!p.alive && a.stage === 'approach') { a.stage = 'retreat'; a.t = 0; return; }
      switch (a.stage) {
        case 'approach': {
          const ty = M.clamp(p.y - 150, 300, 660);
          this.x += (p.x - this.x) * Math.min(1, 4.4 * dt);
          this.y += (ty - this.y) * Math.min(1, 5 * dt);
          if (a.t >= 0.7 / this.spd || (a.t > 0.35 && Math.abs(ty - this.y) < 10)) {
            a.stage = 'flurry'; a.t = 0; a.timer = 0.35 / this.spd;   // 第一拳前留久一點的警示時間，讓玩家看得到紅色範圍再閃
            a.tx = M.clamp(p.x, C.PLAYER.minX, C.PLAYER.maxX); a.ty = p.y;   // 像流星拳一樣：鎖定一個固定區塊，接下來整串拳都打在這裡（不是追著玩家跑）
          }
          break;
        }
        case 'flurry':
          // 身體整個定住不動（不會飄回待機位置），靠雙手伸縮連續打向鎖定的區塊，才會像流星拳一樣密集
          this.tele = { type: 'punch', x: a.tx, y: a.ty };   // 紅色警示範圍：整串連續出拳期間都顯示，讓玩家知道哪裡會被打到
          if (a.jab) { a.jabT -= dt; if (a.jabT <= 0) a.jab = false; }
          a.timer -= dt;
          if (a.timer <= 0 && a.n < a.total) {
            a.jab = true; a.jabT = 0.12; a.dir = a.n % 2 === 0 ? 1 : -1; a.n++;
            a.timer = B2.punchGap / this.spd;
            w.sfx('punch'); w.addShake(0.08);
            BM.Particles.explode(a.tx, a.ty, '#ffffff', 4);
          } else if (a.timer <= 0 && a.n >= a.total) { a.stage = 'retreat'; a.t = 0; }
          break;
        case 'retreat':
          this.hover(dt, 0.6);
          if (Math.abs(this.y - B.homeY) < 14) this.toIdle();
          break;
      }
    }

    // ---- 桐生爹鼠：三角錐攻擊（小刀飛行一小段時間後原地炸裂分散）----
    updateCone(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.4);
      const p = w.player;
      if (!p.alive && !a.pending.length) { this.toIdle(); return; }
      const hx = this.x, hy = this.y + 50;
      if (a.stage === 'wind') {
        this.tele = { type: 'cone', hx, hy, k: Math.min(1, a.t / (0.5 / this.spd)) };
        if (a.t >= 0.5 / this.spd) { a.stage = 'throw'; a.t = 0; a.timer = 0; }
      } else if (a.stage === 'throw') {
        a.timer -= dt;
        if (a.timer <= 0 && a.thrown < a.total) {
          const lead = M.clamp(p.x + M.clamp(p.vx, -C.PLAYER.speed, C.PLAYER.speed) * 0.2, 20, W - 20);
          const ang = Math.atan2(p.y - hy, lead - hx), sp = B2.coneSpeed * this.bm;
          const knife = w.fireBullet(hx, hy, ang, sp, 'knife');
          if (knife) a.pending.push({ b: knife, t: B2.coneSplitDelay });   // 追蹤這把小刀，時間到了就在它「當下的位置」炸開（不是預測位置）
          w.sfx('knife');
          a.thrown++;
          a.timer = 0.3 / this.spd;
          if (a.thrown >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.4 / this.spd && !a.pending.length) this.toIdle();
      for (let i = a.pending.length - 1; i >= 0; i--) {                 // 小刀飛行一段時間後，在它當下的位置原地炸開成一圈碎片（原本那把小刀就此消失，不會繼續往下飛）
        const it = a.pending[i]; it.t -= dt;
        if (it.t <= 0 || it.b.dead) {
          if (!it.b.dead) {
            const n = B2.coneShards;
            for (let k = 0; k < n; k++) w.fireBullet(it.b.x, it.b.y, k / n * M.TAU, B2.coneShardSpeed * this.bm, 'knife');
            BM.Particles.explode(it.b.x, it.b.y, '#bfe6ff', 10);
            w.sfx('shard');
            it.b.dead = true;
          }
          a.pending.splice(i, 1);
        }
      }
    }

    // ---- 桐生爹鼠：「極！」（口中喊出的字本身就是一發子彈，玩家要真的碰到才會緩速，不是範圍攻擊；打中判定在 play-scene.js 的 collide()）----
    // 以 BOSS 為中心，朝外連續射出「極」字子彈，每發都比上一發轉一點角度 → 疊出一條展開中的螺旋
    updateShout(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      this.hover(dt, 0.3);
      const K = B2.shout, mx = this.x, my = this.y + 30;
      if (!p.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.sx = Math.sin(this.time * 40) * 1.4;
        this.tele = { type: 'shout', x: mx, y: my, k: Math.min(1, a.t / (K.charge / this.spd)) };
        if (a.t >= K.charge / this.spd) { a.stage = 'fire'; a.t = 0; a.timer = 0; this.tele = null; }
      } else if (a.stage === 'fire') {
        a.timer -= dt;
        if (a.timer <= 0 && a.thrown < a.total) {
          const b = w.fireBullet(mx, my, a.ang, K.speed * this.bm, 'goku');
          if (b) b.stunTime = K.stunTime;         // 標記這發子彈「打中只麻痺、不扣命」（collide() 會檢查這個欄位）
          w.sfx('gokuThrow');
          a.ang += K.spiralStep;                  // 下一發轉一個角度，疊出螺旋
          a.thrown++;
          a.timer = K.spiralGap / this.spd;
          if (a.thrown >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.4 / this.spd) this.toIdle();
    }

    // ---- 狠蘭達鼠：揮劍（雙重十字斬，兩輪扇形光刃交錯瞄準玩家射出，形成一個 X）----
    updateBlade(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.35);
      if (!w.player.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.sx = Math.sin(this.time * 55) * 1.6;
        this.tele = { type: 'blade', k: Math.min(1, a.t / (0.4 / this.spd)) };
        if (a.t >= 0.4 / this.spd) { a.stage = 'fire'; a.t = 0; a.timer = 0; this.tele = null; }
      } else if (a.stage === 'fire') {
        a.timer -= dt;
        if (a.timer <= 0 && a.volley < a.total) {
          this.fireBlade(w, a.volley);
          a.volley++;
          a.timer = 0.38 / this.spd;                    // 兩輪之間的間隔拉長一點（原 0.32），多給一點反應時間
          if (a.volley >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.4 / this.spd) this.toIdle();
    }
    fireBlade(w, volley) {
      const count = (this.phase >= 2 ? 7 : 5) + this.asuraTier, span = B3.bladeSpan;   // 使用者反應第 15 波密度太高難閃，再減量（原本 8/11 →第一版調降為 6/8 → 這次再降為 5/7）；之後每次出場再 +1 發（最多 +3）
      const base = M.clamp(Math.atan2(this.py - this.y, this.px - this.x), PI / 2 - 0.7, PI / 2 + 0.7);
      const center = base + (volley % 2 === 0 ? -0.32 : 0.32);         // 兩輪分別往左右偏，疊起來形成十字交錯
      const step = span / (count - 1), sp = B3.bladeSpeed * this.bm;
      for (let i = 0; i < count; i++) w.fireBullet(this.x, this.y + 50, center - span / 2 + i * step, sp, 'blade');
      w.sfx('knife'); w.addShake(0.1);
    }

    // ---- 狠蘭達鼠：三叉戟（三發一組的貫穿齊射，瞄準玩家，微幅預判橫移）----
    updateTrident(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      this.hover(dt, 0.35);
      if (!p.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.tele = { type: 'trident', k: Math.min(1, a.t / (0.35 / this.spd)) };
        if (a.t >= 0.35 / this.spd) { a.stage = 'fire'; a.t = 0; a.timer = 0; this.tele = null; }
      } else if (a.stage === 'fire') {
        a.timer -= dt;
        if (a.timer <= 0 && a.thrown < a.total) {
          this.fireTrident(w);
          a.thrown++;
          a.timer = B3.tridentGap / this.spd;
          if (a.thrown >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.3 / this.spd) this.toIdle();
    }
    fireTrident(w) {
      const p = w.player, hy = this.y + 55;
      const lead = M.clamp(p.x + M.clamp(p.vx, -C.PLAYER.speed, C.PLAYER.speed) * 0.22, 20, W - 20);
      const ang = Math.atan2(p.y - hy, lead - this.x), sp = B3.tridentSpeed * this.bm;
      for (const off of [-0.09, 0, 0.09]) w.fireBullet(this.x, hy, ang + off, sp, 'trident');
      w.sfx('cheese');
    }

    // ---- 狠蘭達鼠：法鈴（以自己為圓心，一次齊發一整圈音波珠；跟「極！」的展開螺旋不同，是同時發射的滿圈）----
    updateBell(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.25);
      if (!w.player.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.tele = { type: 'bell', k: Math.min(1, a.t / (0.5 / this.spd)) };
        if (a.t >= 0.5 / this.spd) { a.stage = 'ring'; a.t = 0; a.timer = 0; this.tele = null; }
      } else if (a.stage === 'ring') {
        a.timer -= dt;
        if (a.timer <= 0 && a.rung < a.total) {
          this.fireBell(w, a.rung);
          a.rung++;
          a.timer = B3.bellRingGap / this.spd;
          if (a.rung >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.35 / this.spd) this.toIdle();
    }
    fireBell(w, ring) {
      const n = 14, offset = ring * 0.22, sp = B3.bellSpeed * this.bm, my = this.y + 30;
      for (let i = 0; i < n; i++) w.fireBullet(this.x, my, offset + i / n * M.TAU, sp, 'ward');
      w.sfx('bellRing'); w.addShake(0.15);
    }

    // ---- 狠蘭達鼠：法輪（射出會迴旋轉彎的法輪，軌跡難預測；EnemyBullet 的 turn 欄位讓它邊飛邊轉方向）----
    updateWheel(dt, w) {
      const a = this.a, p = w.player; a.t += dt;
      this.hover(dt, 0.35);
      if (!p.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.tele = { type: 'wheel', k: Math.min(1, a.t / (0.4 / this.spd)) };
        if (a.t >= 0.4 / this.spd) { a.stage = 'fire'; a.t = 0; a.timer = 0; this.tele = null; }
      } else if (a.stage === 'fire') {
        a.timer -= dt;
        if (a.timer <= 0 && a.thrown < a.total) {
          this.fireWheel(w, a.thrown, a.total);
          a.thrown++;
          a.timer = 0.35 / this.spd;
          if (a.thrown >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.4 / this.spd) this.toIdle();
    }
    // 迴旋弧線：不是直接瞄準後亂轉（那樣角速度不夠精準時，飛到玩家那層樓之前早就轉到別的方向去了，幾乎打不到人）。
    // 改成「刻意偏出去再彎回來」的香蕉球：先朝瞄準角左右偏 wheelSpread 弧度射出，角速度用「切線-弦」幾何關係反推
    // （等速率繞圓弧飛行時，切線與弦的夾角＝弧心角的一半，所以繞圓半徑 R = 距離 ÷ (2×sin(偏移角))，角速度 = 2×速度×sin(偏移角) ÷ 距離），
    // 這樣整條弧線精準地從發射點繞回瞄準點（用模擬驗證過落點誤差 <5px）：飛行途中會明顯看到它轉彎、有空間閃，但若不躲確實會被彎回來的弧線打中。
    fireWheel(w, idx, total) {
      const p = w.player, ox = (idx - (total - 1) / 2) * 44;
      const hx = this.x + ox, hy = this.y + 40;
      const baseAng = Math.atan2(p.y - hy, p.x - hx);
      const dir = idx % 2 === 0 ? 1 : -1;                     // 交替左右偏出去，讓多個法輪交叉
      const dist = Math.max(60, Math.hypot(p.x - hx, p.y - hy));
      const sp = B3.wheelSpeed * this.bm;
      const b = w.fireBullet(hx, hy, baseAng + dir * B3.wheelSpread, sp, 'wheel');
      if (b) b.turn = -dir * (2 * sp * Math.sin(B3.wheelSpread) / dist);
      w.sfx('lock');
    }

    // ---- 厭世死亡演出 ----
    updateDying(dt, w) {
      const a = this.a;
      this.face = 'dead';
      this.rot += (0.16 - this.rot) * Math.min(1, 2 * dt);
      if (this.t < 1.0) {
        this.sx = Math.sin(this.time * 40) * 1.5;                // 定格：只有微微顫抖
      } else {
        this.y += 22 * dt;                                        // 慢慢漂下去
        a.ex -= dt;
        if (a.ex <= 0) {
          a.ex = 0.16;
          BM.Particles.explode(this.x + M.rand(-62, 62), this.y + M.rand(-70, 70), M.pick(['#ffd166', '#ff8c42', '#ffffff']), 8);
          w.sfx('boom');
          w.addShake(0.12);
        }
      }
      a.puff -= dt;
      if (a.puff <= 0) { a.puff = 0.55; this.puffs.push({ x: this.x + 4, y: this.y - 6, t: 0 }); }   // 嘆氣煙圈
      if (this.t >= B.deathTime) {
        for (let i = 0; i < 4; i++) BM.Particles.explode(this.x + M.rand(-40, 40), this.y + M.rand(-50, 50), M.pick(['#ffd166', '#ff6b8a', '#ffffff', '#7fe9ff']), 22);
        w.sfx('bossBoom');
        w.addShake(0.9);
        this.state = 'dead';
        this.done = true;
      }
    }

    // ------------------------------------------------ 繪製
    draw(ctx, t) {
      if (this.state === 'dead') return;
      this.drawTele(ctx, t);

      ctx.save();
      ctx.translate(this.x + this.sx, this.y);
      ctx.rotate(this.rot);
      if (this.alive) {
        if (this.kind === 'asura') this.drawAura(ctx, t);          // 狠蘭達鼠：赤腳懸浮，腳下是發光法陣，不是噴射火焰
        else {                                                      // 噴射火焰
          const rush = this.state === 'charge' && this.a.stage === 'rush' ? 40 : 0;
          for (const s of [-1, 1]) {                                 // 靴底噴射
            const fl = 26 + rush + Math.sin(t * 50 + s) * 6;
            const g = ctx.createLinearGradient(0, 102, 0, 102 + fl);
            g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffa040'); g.addColorStop(1, 'rgba(255,80,60,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(s * 24 - 10, 102); ctx.lineTo(s * 24, 102 + fl); ctx.lineTo(s * 24 + 10, 102); ctx.closePath(); ctx.fill();
          }
        }
      }
      const ASURA_WIND = ['blade', 'trident', 'bell', 'wheel'].includes(this.state) && this.a.stage === 'wind';
      const pulse = (this.state === 'fan' && this.a.stage === 'wind') || (this.state === 'slash' && (this.a.stage === 'wind' || this.a.stage === 'wind2')) || ASURA_WIND ? 1 + Math.sin(t * 30) * 0.03 : 1;
      BM.Sprites.draw(ctx, this.spritePrefix + this.face + (this.flash > 0 ? '_hit' : ''), 0, 0, 0, pulse);
      ctx.restore();

      if (this.guarding) { this.drawClaws(ctx, t); this.drawGuard(ctx, t); }
      if (this.state === 'claw' && this.a.stage === 'swipe') this.drawSlash(ctx);
      if (this.state === 'punch' && this.a.jab) this.drawPunch(ctx);
      if (this.state === 'slash' && this.a.flashT > 0) this.drawSwordFlash(ctx);
      for (const f of this.puffs) {                                // 嘆氣煙圈
        const k = f.t / 1.6;
        ctx.save();
        ctx.globalAlpha = 0.55 * (1 - k);
        ctx.fillStyle = '#e8ecf7';
        ctx.beginPath(); ctx.arc(f.x, f.y, 8 + k * 20, 0, M.TAU); ctx.fill();
        ctx.restore();
      }
      if (this.state === 'dying') this.drawBubble(ctx);
    }

    // 預警：衝撞道 / 爪擊危險扇形 / 起司瞄準線
    drawTele(ctx, t) {
      const tl = this.tele;
      if (!tl) return;
      ctx.save();
      if (tl.type === 'lane') {
        const pulse = 0.12 + 0.1 * Math.sin(t * 22) + (tl.locked ? 0.14 : 0);
        ctx.fillStyle = 'rgba(255,50,50,' + pulse + ')';
        ctx.fillRect(tl.x - 70, this.y, 140, H - this.y);
        ctx.strokeStyle = tl.locked ? 'rgba(255,90,90,0.95)' : 'rgba(255,140,140,0.5)';
        ctx.lineWidth = tl.locked ? 3 : 2;
        if (!tl.locked) ctx.setLineDash([12, 10]);
        ctx.strokeRect(tl.x - 70, this.y, 140, H - this.y);
        D.text(ctx, '!!', tl.x, H - 60, { size: 40, align: 'center', color: '#ff4d4d', stroke: '#fff', strokeW: 6, weight: '900', family: D.NUM, alpha: 0.5 + 0.5 * Math.sin(t * 20) });
      } else if (tl.type === 'claw') {
        const cx = this.x, cy = this.cy;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, B.clawOut, PI / 2 - tl.sec, PI / 2 + tl.sec);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,50,50,' + (0.08 + 0.12 * tl.k + (tl.locked ? 0.1 : 0)) + ')';
        ctx.fill();
        ctx.strokeStyle = tl.locked ? 'rgba(255,90,90,0.95)' : 'rgba(255,150,150,0.55)';
        ctx.lineWidth = tl.locked ? 3 : 2;
        if (!tl.locked) ctx.setLineDash([10, 9]);
        ctx.stroke();
        if (tl.theta !== undefined) {                       // 揮爪中：此刻正在打擊的楔形範圍（與實際判定完全一致）
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, B.clawOut, tl.theta - B.clawHalf, tl.theta + B.clawHalf);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,70,70,0.38)'; ctx.fill();
        }
      } else if (tl.type === 'cheese') {
        if (tl.aim) {
          ctx.strokeStyle = 'rgba(255,225,90,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
          ctx.beginPath(); ctx.moveTo(tl.hx, tl.hy); ctx.lineTo(this.px, this.py); ctx.stroke();
        }
        BM.Sprites.draw(ctx, 'cheese', tl.hx, tl.hy, -0.5, 0.9 + tl.k * 0.9);
      } else if (tl.type === 'cone') {                      // 三角錐攻擊：舉刀蓄力的閃光提示
        ctx.globalAlpha = tl.k;
        ctx.fillStyle = '#bfe6ff';
        ctx.beginPath(); ctx.arc(tl.hx + 30, tl.hy, 10 * tl.k, 0, M.TAU); ctx.fill();
      } else if (tl.type === 'slash') {                     // 揮刀：舉刀蓄力，刀身越來越亮
        const cx = this.x + 46, cy = this.y + 20, len = 18 + tl.k * 30;
        ctx.globalAlpha = 0.5 + tl.k * 0.5;
        ctx.strokeStyle = '#eaf7ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(140,220,255,0.9)'; ctx.shadowBlur = 10 * tl.k;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + len * 0.3, cy - len); ctx.stroke();
      } else if (tl.type === 'shout') {                     // 「極！」：蓄力時文字在頭頂上方放大（不會被身體擋住），準備射出去
        D.text(ctx, '極', tl.x, this.y - 104, { size: 20 + tl.k * 26, align: 'center', color: '#ff5a5a', stroke: '#fff', strokeW: 4, weight: '900' });
      } else if (tl.type === 'punch') {                     // 百裂拳：紅色警示範圍，整串拳都會打在這裡（跟 punchHit 的判定範圍一致）
        const pulse = 0.14 + 0.12 * Math.sin(t * 22);
        ctx.beginPath(); ctx.arc(tl.x, tl.y, B2.punchHitR, 0, M.TAU);
        ctx.fillStyle = 'rgba(255,50,50,' + pulse + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;         // 十字準星，更明確標出中心
        ctx.beginPath();
        ctx.moveTo(tl.x - B2.punchHitR - 10, tl.y); ctx.lineTo(tl.x + B2.punchHitR + 10, tl.y);
        ctx.moveTo(tl.x, tl.y - B2.punchHitR - 10); ctx.lineTo(tl.x, tl.y + B2.punchHitR + 10);
        ctx.stroke();
      } else if (tl.type === 'blade') {                    // 揮劍：雙重十字斬蓄力，兩道紫色光刃在身前交錯浮現
        const cx = this.x, cy = this.y + 20, len = 26 + tl.k * 46;
        ctx.globalAlpha = 0.35 + tl.k * 0.65;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(190,120,255,0.9)'; ctx.shadowBlur = 12 * tl.k;
        ctx.strokeStyle = '#e0c8ff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - len, cy - len * 0.55); ctx.lineTo(cx + len, cy + len * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - len, cy + len * 0.55); ctx.lineTo(cx + len, cy - len * 0.55); ctx.stroke();
      } else if (tl.type === 'trident') {                  // 三叉戟：瞄準線 + 胸口蓄力光點
        const hx = this.x, hy = this.y + 55;
        ctx.strokeStyle = 'rgba(255,225,180,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(this.px, this.py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = tl.k;
        ctx.fillStyle = '#ffe8c0';
        ctx.shadowColor = 'rgba(255,200,120,0.9)'; ctx.shadowBlur = 14 * tl.k;
        ctx.beginPath(); ctx.arc(hx, hy, 8 * tl.k, 0, M.TAU); ctx.fill();
      } else if (tl.type === 'bell') {                     // 法鈴：以身體為中心逐漸擴大的音波環
        const r = 40 + tl.k * 70;
        ctx.globalAlpha = 0.5 * tl.k;
        ctx.strokeStyle = 'rgba(232,178,61,0.9)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(this.x, this.y + 20, r, 0, M.TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(190,120,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y + 20, r * 0.6, 0, M.TAU); ctx.stroke();
      } else if (tl.type === 'wheel') {                    // 法輪：手邊逐漸亮起的自轉光環
        const hx = this.x - 92, hy = this.y - 6;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(t * 10);
        ctx.globalAlpha = tl.k;
        ctx.shadowColor = 'rgba(232,178,61,0.9)'; ctx.shadowBlur = 10 * tl.k;
        ctx.strokeStyle = '#e8b23d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 12 * tl.k, 0, M.TAU); ctx.stroke();
        for (let a = 0; a < 6; a++) { const an = a / 6 * M.TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 12 * tl.k, Math.sin(an) * 12 * tl.k); ctx.stroke(); }
        ctx.restore();
      }
      ctx.restore();
    }

    // 百裂拳的其中一拳：白西裝袖口 + 拳頭，從左右手的固定位置衝向鎖定的區塊（流星拳的效果：兩手交替出拳但都打在同一小塊地方）
    drawPunch(ctx) {
      const a = this.a, k = 1 - a.jabT / 0.12;
      const f = this.punchFist(k), ang = f.ang;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#241c1a'; ctx.lineWidth = 9;                                       // 手臂：從「手」的固定位置（貼圖上左右手的位置）伸出去，不是身體中心或嘴巴
      ctx.beginPath(); ctx.moveTo(f.hx, f.hy); ctx.lineTo(f.x, f.y); ctx.stroke();
      ctx.fillStyle = '#f7f5ef'; ctx.strokeStyle = '#241c1a'; ctx.lineWidth = 3;             // 白西裝袖口
      ctx.beginPath(); ctx.arc(f.x, f.y, 25, 0, M.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#caa588'; ctx.beginPath(); ctx.arc(f.x + Math.cos(ang) * 7, f.y + Math.sin(ang) * 7, 19, 0, M.TAU); ctx.fill(); ctx.stroke();   // 拳頭
      const perp = ang + PI / 2;
      for (let j = -1; j <= 1; j++) {                                                       // 指節
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(ang) * 16 + Math.cos(perp) * j * 9.5, f.y + Math.sin(ang) * 16 + Math.sin(perp) * j * 9.5, 4.2, 0, M.TAU);
        ctx.fillStyle = '#8a6f5c'; ctx.fill();
      }
      if (k > 0.55) {                                                                       // 衝擊瞬間的白色放射線
        ctx.globalAlpha = (k - 0.55) / 0.45 * 0.8;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
        for (let j = -1; j <= 1; j++) { const a2 = ang + j * 0.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a2) * 30, f.y + Math.sin(a2) * 30); ctx.stroke(); }
      }
      ctx.restore();
    }

    // 揮刀的白色弧光（跟 fireMoon 同一刻觸發，讓玩家看得到「揮了一刀」，不是子彈憑空出現；加大加粗強化魄力）
    drawSwordFlash(ctx) {
      const a = this.a, k = a.flashT / 0.26, cx = this.x, cy = this.y + 50;
      const c = a.flashCenter, s = a.flashSpan / 2;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(140,220,255,0.9)'; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(cx, cy, 96, c - s, c + s);
      ctx.strokeStyle = 'rgba(140,220,255,0.95)'; ctx.lineWidth = 26; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.stroke();
      ctx.restore();
    }

    // 爪擊時的大爪子：從身體伸出去，在危險扇形裡揮動 ——
    //   蓄力：舉在揮爪的起點（扇形邊緣）、越伸越長並微微顫抖；揮爪：沿著扇形掃過去；收招：停在終點
    //   完全伸出時爪尖剛好到判定範圍的外緣（clawOut），所以「爪子碰得到的地方」就是「會被打到的地方」
    drawClaws(ctx, t) {
      const a = this.a, cx = this.x + this.sx, cy = this.cy;
      const swiping = a.stage === 'swipe', winding = a.stage === 'wind' || a.stage === 'wind2';
      const theta = swiping ? a.theta : PI / 2 - a.dir * B.clawSweep;      // 爪子目前指的方向（收招時就是這一下的終點 = 下一下的起點）
      const wdur = (a.stage === 'wind2' ? 0.55 : 0.95) / this.spd;
      const ext = winding ? 0.4 + 0.6 * M.clamp(a.t / wdur, 0, 1) : 1;      // 伸出程度
      const reach = B.clawOut * ext;                                       // 爪尖離身體中心的距離
      const handX = Math.max(80, reach - 100);                             // 手掌的位置
      const shake = winding ? Math.sin(t * 45) * 0.025 : 0;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(theta + shake);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#2a2438';

      // 手臂
      D.roundRect(ctx, 40, -17, handX - 40, 34, 17);
      ctx.fillStyle = '#d9e2f4'; ctx.fill(); ctx.stroke();
      // 三根大爪（往外張開，爪尖朝向外緣）
      if (swiping) { ctx.shadowColor = 'rgba(255,60,60,0.95)'; ctx.shadowBlur = 22; }
      for (let k = -1; k <= 1; k++) {
        const bx = handX + 18, by = k * 22, tx = reach, ty = k * 58 * ext;
        ctx.beginPath();
        ctx.moveTo(bx, by - 11);
        ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2 - 16 - k * 6, tx, ty);            // 外側彎弧
        ctx.quadraticCurveTo((bx + tx) / 2 + 6, (by + ty) / 2 + 8 - k * 6, bx, by + 11);    // 內側收回
        ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // 手掌（蓋在爪子根部）
      ctx.beginPath(); ctx.arc(handX, 0, 40, 0, M.TAU);
      ctx.fillStyle = '#f4f8ff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(handX - 6, 4, 22, 0.4, PI - 0.4);                            // 手套上的皺褶線
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(42,36,56,0.45)'; ctx.stroke();
      ctx.restore();
    }

    // 狠蘭達鼠：赤腳懸浮，腳下浮著一圈發光法陣（+旋轉的金色光點），取代另外兩隻 BOSS 的噴射靴火焰
    drawAura(ctx, t) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 4);
      ctx.strokeStyle = 'rgba(190,120,255,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 104, 46, 13, 0, 0, M.TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,178,61,0.7)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 104, 33, 9, 0, 0, M.TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = t * 1.4 + i / 6 * M.TAU;
        ctx.fillStyle = 'rgba(232,178,61,0.9)';
        ctx.beginPath(); ctx.arc(Math.cos(ang) * 46, 104 + Math.sin(ang) * 13, 3, 0, M.TAU); ctx.fill();
      }
      ctx.restore();
    }

    // 反彈護盾
    drawGuard(ctx, t) {
      ctx.save();
      ctx.translate(this.x, this.cy);
      ctx.beginPath(); ctx.arc(0, 0, this.guardR, 0, M.TAU);
      ctx.fillStyle = 'rgba(140,235,255,0.10)'; ctx.fill();
      ctx.strokeStyle = 'rgba(140,235,255,0.75)'; ctx.lineWidth = 3;
      ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 60;
      ctx.stroke();
      ctx.restore();
    }

    // 揮爪的三道爪痕
    drawSlash(ctx) {
      const a = this.a, cx = this.x, cy = this.cy;
      const from = a.theta - a.dir * 0.6, to = a.theta + a.dir * B.clawHalf;   // 爪痕最前端 = 判定楔形的前緣
      const a0 = Math.min(to, from), a1 = Math.max(to, from);
      ctx.save();
      ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) {
        const r = 120 + j * 55;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1);
        ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5; ctx.stroke();
      }
      ctx.restore();
    }

    // 死亡時的對話框
    // 先出現「……」（停頓鋪陳），1.1 秒後換成這次抽到的台詞；台詞太長就自動斷成兩行（英文依單字、中日文逐字）
    drawBubble(ctx) {
      const first = this.t < 1.1, prefix = this.kind === 'kiryu' ? 'boss2.' : this.kind === 'asura' ? 'boss3.' : 'boss.';
      const text = first ? BM.I18n.t('boss.bubble1') : BM.I18n.t(this.lineId ? prefix + 'l.' + this.lineId : prefix + 'bubble2', { n: this.level });
      ctx.save(); ctx.font = '900 24px ' + D.CJK;
      const oneW = ctx.measureText(text).width;
      ctx.restore();
      const wrap = oneW > 290;
      const lines = wrap ? D.wrap(ctx, text, 290, 22, '900').slice(0, 2) : [text];
      const bw = wrap ? 330 : Math.min(330, Math.max(84, oneW + 40)), bh = wrap ? 76 : 46;      // 對話框寬度依文字長度（多語系）
      const bx = M.clamp(this.x + 100, bw / 2 + 8, W - bw / 2 - 8), by = this.y - 108 - (bh - 46) / 2;   // 底邊固定，兩行時往上長高
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a2438'; ctx.lineWidth = 3;
      D.roundRect(ctx, bx - bw / 2, by - bh / 2, bw, bh, 16);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();                                             // 對話框尾巴
      ctx.moveTo(bx - bw / 2 + 22, by + bh / 2 - 1); ctx.lineTo(this.x + 58, this.y - 70); ctx.lineTo(bx - bw / 2 + 46, by + bh / 2 - 1);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
      if (wrap) lines.forEach((ln, i) => D.text(ctx, ln, bx, by - 15 + i * 29 + 2, { size: 22, align: 'center', color: '#2a2438', weight: '900', maxW: bw - 24 }));
      else D.text(ctx, text, bx, by + 2, { size: 24, align: 'center', color: '#2a2438', weight: '900', maxW: bw - 24 });
    }
  }

  Boss.LINES = LINES;
  Boss.LINES2 = LINES2;
  Boss.pickLine = pickLine;
  BM.Boss = Boss;
})(window.BM = window.BM || {});
