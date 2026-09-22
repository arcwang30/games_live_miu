// BOSS：兩種角色輪流出現（play-scene.js 依 BOSS 等級奇偶選擇），流程與階段規則共用：
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
// 血量 66% / 33% 進入第 2 / 3 階段（速度 ×1.12 / ×1.25，發數增加，兩種 BOSS 共用）。
// 血量歸零 → dying：定格、一臉厭世（或被打趴）、碎面罩、嘆氣、講一句隨機抽的台詞，最後才爆炸 → dead。
(function (BM) {
  const C = BM.CONFIG, B = C.BOSS, B2 = C.BOSS2, M = BM.M, D = BM.Draw, W = C.W, H = C.H, PI = Math.PI;

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
  const SPECIFIC_WEIGHT = 4;             // 符合情境的台詞，被抽到的機會是通用台詞的 4 倍（一般情況下大約一半的時候會是「針對你這一場」的吐槽）
  const FAST_UNDER = 50, SLOW_OVER = 110; // 戰鬥秒數（含登場約 2 秒）：低於 / 高於這個算「很快 / 很久」
  const recent = [], recent2 = [];       // 最近抽過的台詞（兩隻 BOSS 分開記，不會連續重複）

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
    kiryu: ['slash', 'punch', 'cone', 'shout']
  };

  class Boss {
    constructor(level, kind) {
      this.level = level;
      this.kind = kind === 'kiryu' ? 'kiryu' : 'gangster';
      this.maxHp = Math.min(B.hpMax, B.hpBase + B.hpPerLevel * (level - 1));
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
      this.lm = Math.min(1.6, 1 + 0.1 * (level - 1));     // 動作速度倍率（隨 BOSS 等級）
      this.bm = Math.min(1.5, 1 + 0.06 * (level - 1));    // 子彈速度倍率
      this.px = W / 2; this.py = 800;                      // 最近一次看到的玩家位置
      this.idleDur = 1;
    }

    get cy() { return this.y + 8; }                        // 身體判定圓中心
    get spd() { return this.lm * [1, 1.12, 1.25][this.phase - 1]; }
    get alive() { return this.state !== 'dying' && this.state !== 'dead'; }
    get vulnerable() { return this.alive && this.state !== 'enter' && !this.guarding; }
    get lethal() { return this.alive && this.state !== 'enter'; }      // 身體碰到玩家會致命
    get barK() { return this.state === 'enter' ? Math.min(1, this.t / 2.2) : 1; }
    get nameKey() { return this.kind === 'kiryu' ? 'boss2.name' : 'boss.name'; }
    get spritePrefix() { return this.kind === 'kiryu' ? 'kiryu_' : 'boss_'; }

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
      this.lineId = this.kind === 'kiryu' ? pickLine(ctx, LINES2, recent2) : pickLine(ctx, LINES, recent);
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
      this.idleDur = B.idle / this.spd;
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
        case 'slash':  this.a = { stage: 'wind', t: 0, volley: 0, timer: 0, total: this.phase }; break;                                          // 連揮 1～3 次
        case 'punch':  this.a = { stage: 'approach', t: 0, n: 0, total: 4 + this.phase * 2, timer: 0, jab: false, jabT: 0 }; break;               // 6/8/10 拳
        case 'cone':   this.a = { stage: 'wind', t: 0, thrown: 0, timer: 0, total: 1 + this.phase, pending: [] }; break;
        case 'shout':  this.a = { stage: 'wind', t: 0, hit: false }; w.sfx('shout'); break;
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
    punchHit(p) {
      if (this.state !== 'punch' || !this.a.jab) return false;
      const dx = p.x - this.x, dy = p.y - this.cy;
      return dx * dx + dy * dy < B2.punchRange * B2.punchRange;
    }

    // ---- 桐生爹鼠：揮刀（刀劍光波，大範圍扇形斬擊）----
    updateSlash(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.4);
      if (!w.player.alive) { this.toIdle(); return; }
      if (a.stage === 'wind') {
        this.sx = Math.sin(this.time * 50) * 1.8;
        if (a.t >= 0.45 / this.spd) { a.stage = 'fire'; a.t = 0; w.sfx('knife'); this.fireSlash(w); a.volley = 1; a.timer = 0.5 / this.spd; }
      } else if (a.stage === 'fire') {
        a.timer -= dt;
        if (a.timer <= 0) {
          if (a.volley < a.total) { this.fireSlash(w); a.volley++; a.timer = 0.5 / this.spd; w.sfx('knife'); }
          else { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.6 / this.spd) this.toIdle();
    }
    fireSlash(w) {
      const count = this.phase >= 2 ? 11 : 8, span = 2.4;      // 比流氓大老鼠的傘狀彈更寬，強調「大範圍斬擊」
      const center = M.clamp(Math.atan2(this.py - this.y, this.px - this.x), PI / 2 - 0.6, PI / 2 + 0.6);
      const step = span / (count - 1), sp = B2.knifeSpeed * this.bm * (this.phase === 3 ? 1.1 : 1);
      for (let i = 0; i < count; i++) w.fireBullet(this.x, this.y + 50, center - span / 2 + i * step, sp, 'knife');
      BM.Particles.explode(this.x + 40, this.y + 10, '#bfe6ff', 6);
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
          if (a.t >= 0.7 / this.spd || (a.t > 0.35 && Math.abs(ty - this.y) < 10)) { a.stage = 'flurry'; a.t = 0; a.timer = 0.16 / this.spd; }
          break;
        }
        case 'flurry':
          this.hover(dt, 0.15);
          if (a.jab) { a.jabT -= dt; if (a.jabT <= 0) a.jab = false; }
          a.timer -= dt;
          if (a.timer <= 0 && a.n < a.total) {
            a.jab = true; a.jabT = 0.09; a.dir = a.n % 2 === 0 ? 1 : -1; a.n++;
            a.timer = B2.punchGap / this.spd;
            w.sfx('punch'); w.addShake(0.08);
            BM.Particles.explode(this.x + a.dir * 30, this.cy + 10, '#ffffff', 3);
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
          w.fireBullet(hx, hy, ang, sp, 'knife');
          a.pending.push({ x: hx + Math.cos(ang) * sp * B2.coneSplitDelay, y: hy + Math.sin(ang) * sp * B2.coneSplitDelay, t: B2.coneSplitDelay });
          w.sfx('knife');
          a.thrown++;
          a.timer = 0.3 / this.spd;
          if (a.thrown >= a.total) { a.stage = 'end'; a.t = 0; }
        }
      } else if (a.t >= 0.4 / this.spd && !a.pending.length) this.toIdle();
      for (let i = a.pending.length - 1; i >= 0; i--) {                 // 小刀飛行一段時間後，在預測的落點原地炸開成一圈碎片
        const it = a.pending[i]; it.t -= dt;
        if (it.t <= 0) {
          const n = B2.coneShards;
          for (let k = 0; k < n; k++) w.fireBullet(it.x, it.y, k / n * M.TAU, B2.coneShardSpeed * this.bm, 'knife');
          BM.Particles.explode(it.x, it.y, '#bfe6ff', 10);
          w.sfx('shard');
          a.pending.splice(i, 1);
        }
      }
    }

    // ---- 桐生爹鼠：「極！」（口中喊出文字向外擴散，碰到會緩速，不會扣命）----
    updateShout(dt, w) {
      const a = this.a; a.t += dt;
      this.hover(dt, 0.3);
      const K = B2.shout, mx = this.x, my = this.y + 30;
      if (a.stage === 'wind') {
        this.sx = Math.sin(this.time * 40) * 1.4;
        this.tele = { type: 'shout', x: mx, y: my, k: Math.min(1, a.t / (K.charge / this.spd)) };
        if (a.t >= K.charge / this.spd) { a.stage = 'hold'; a.t = 0; }
      } else if (a.stage === 'hold') {
        // 範圍像衝擊波一樣持續擴大（從口中往外罩住整個畫面），蓄力階段的「極」字放大是唯一的預警，
        // 想閃開就要趁擴散還沒到達自己所在的位置前先移動
        const dur = K.hold / this.spd, k = Math.min(1, a.t / dur);
        const r = K.maxRadius * k;
        this.tele = { type: 'shout', x: mx, y: my, k: 1, r };
        const p = w.player;
        if (p.alive) {
          const dx = p.x - mx, dy = p.y - my;
          if (dx * dx + dy * dy < r * r) { p.applySlow(K.slowTime); if (!a.hit) { a.hit = true; w.sfx('slowHit'); } }
        }
        if (a.t >= dur) { a.stage = 'end'; a.t = 0; }
      } else if (a.t >= 0.35 / this.spd) this.toIdle();
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
      if (this.alive) {                                            // 噴射火焰
        const rush = this.state === 'charge' && this.a.stage === 'rush' ? 40 : 0;
        for (const s of [-1, 1]) {                                 // 靴底噴射
          const fl = 26 + rush + Math.sin(t * 50 + s) * 6;
          const g = ctx.createLinearGradient(0, 102, 0, 102 + fl);
          g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffa040'); g.addColorStop(1, 'rgba(255,80,60,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(s * 24 - 10, 102); ctx.lineTo(s * 24, 102 + fl); ctx.lineTo(s * 24 + 10, 102); ctx.closePath(); ctx.fill();
        }
      }
      const pulse = (this.state === 'fan' || this.state === 'slash') && this.a.stage === 'wind' ? 1 + Math.sin(t * 30) * 0.03 : 1;
      BM.Sprites.draw(ctx, this.spritePrefix + this.face + (this.flash > 0 ? '_hit' : ''), 0, 0, 0, pulse);
      ctx.restore();

      if (this.guarding) { this.drawClaws(ctx, t); this.drawGuard(ctx, t); }
      if (this.state === 'claw' && this.a.stage === 'swipe') this.drawSlash(ctx);
      if (this.state === 'punch' && this.a.jab) this.drawPunch(ctx);
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
      } else if (tl.type === 'shout') {                     // 「極！」：從口中喊出的文字向外擴散（範圍中心在嘴巴，但文字畫在頭頂上方，才不會被身體擋住）
        const labelY = this.y - 104;
        if (tl.r === undefined) {                             // 蓄力：文字放大
          D.text(ctx, '極', tl.x, labelY, { size: 20 + tl.k * 24, align: 'center', color: '#ff5a5a', stroke: '#fff', strokeW: 4, weight: '900' });
        } else {
          const pulse = 0.1 + 0.08 * Math.sin(t * 20);
          ctx.beginPath(); ctx.arc(tl.x, tl.y, tl.r, 0, M.TAU);
          ctx.fillStyle = 'rgba(255,70,70,' + pulse + ')'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,110,110,0.8)'; ctx.lineWidth = 3; ctx.stroke();
          D.text(ctx, '極！', tl.x, labelY, { size: 44, align: 'center', color: '#ff5a5a', stroke: '#fff', strokeW: 5, weight: '900', alpha: Math.min(1, tl.r / 60) });
        }
      }
      ctx.restore();
    }

    // 百裂拳的其中一拳：一團白色拳頭殘影從身體衝出去，配合 punchHit 的判定範圍
    drawPunch(ctx) {
      const a = this.a, cx = this.x, cy = this.cy, k = 1 - a.jabT / 0.09;
      const r = B2.punchRange * (0.35 + 0.65 * k);
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - k);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx + a.dir * r * 0.5, cy, 20, 0, M.TAU); ctx.fill();
      ctx.globalAlpha = 0.16;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, M.TAU); ctx.fill();
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
      const first = this.t < 1.1, prefix = this.kind === 'kiryu' ? 'boss2.' : 'boss.';
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
