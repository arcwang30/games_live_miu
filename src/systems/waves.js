// 波次：依波數決定敵機數量並產生陣形、調整難度；Director 負責調度敵機何時出擊。
(function (BM) {
  const C = BM.CONFIG, F = C.FORMATION, M = BM.M;

  const ROUND_LEN = C.BOSS.EVERY * 3;             // 一輪 = 3 隻 BOSS 依序登場 = 15 波
  const ROUND_NORMAL = ROUND_LEN - 3;             // 一輪裡的一般波數（15 波扣掉 3 場 BOSS 戰 = 12）

  BM.Waves = {
    // 難度曲線以「輪」為單位（同時出擊數 ↑、間隔 ↓、速度 ↑、子彈速度 ↑，皆有上限）：
    // 輪內（pos 1~15）沿用原本的漸進曲線；輪次加成（rb）讓每過一輪基準線再往上墊一點，
    // 不會像舊版只看連續波數，波數一高（約第 10~11 波）就整個封頂、之後永遠一樣難。
    params(wave) {
      const pos = ((wave - 1) % ROUND_LEN) + 1;
      const rb = Math.min(4, Math.ceil(wave / ROUND_LEN) - 1);        // 第 2 輪起每輪 +1 級，封頂 +4（第 5 輪之後不再加）
      return {
        wave,
        maxAttackers: Math.min(6 + rb, 2 + Math.floor((pos - 1) * 0.75) + rb),
        interval: Math.max(0.65 - 0.04 * rb, 1.9 - 0.14 * (pos - 1)),
        speedMul: Math.min(1.5 + 0.1 * rb, 1 + 0.06 * (pos - 1) + 0.1 * rb),
        bulletSpeed: Math.min(340 + 20 * rb, 220 + 12 * (pos - 1) + 20 * rb)
      };
    },

    // 第 n 個「一般波」的敵機數量與列數（n 從 1 開始，BOSS 波不計入；同樣以輪為單位漸進）
    plan(n) {
      const pos = ((n - 1) % ROUND_NORMAL) + 1;
      const rb = Math.min(4, Math.ceil(n / ROUND_NORMAL) - 1);        // 每輪 +5 隻，封頂 +20（第 5 輪之後不再加）
      const count = Math.min(F.maxCount + rb * 5, F.startCount + F.perWave * (pos - 1) + rb * 5);
      return { count, rows: Math.ceil(count / F.cols) };
    },

    // 建立該波的敵機。一列 15 隻，最後一列不滿時置中（欄位可以是半格）。
    // 四種 AI 依 (欄+列)%4 斜線交錯排列，數量幾乎相等。
    // 進場順序：月亮先抖動 startDelay 秒，接著依序（第一列先）每隻間隔 spacing 秒從洞口噴出。
    spawn(n) {
      const { count, rows } = BM.Waves.plan(n);
      const E = C.ENTRANCE;
      const list = [];
      let order = 0;
      for (let r = 0; r < rows; r++) {
        const k = r < rows - 1 ? F.cols : count - F.cols * (rows - 1);   // 這一列的隻數
        const start = (F.cols - k) / 2;
        for (let i = 0; i < k; i++) {
          const e = new BM.Enemy((Math.floor(start) + i + r) % 4, start + i, r);
          e.delay = E.startDelay + order * E.spacing;
          order++;
          list.push(e);
        }
      }
      return list;
    }
  };

  // 出擊調度：用「洗牌袋」輪流抽 4 種類型，確保四種 AI 出場機率平均，不會連續同一種。
  class Director {
    constructor() { this.t = 1.0; this.bag = []; }

    update(dt, w) {
      const list = w.enemies;
      let attackers = 0, inForm = 0;
      for (const e of list) {
        if (e.state === 'attack') attackers++;
        else if (e.state === 'formation') inForm++;
      }
      const few = list.length <= 15;                          // 剩不多時更積極，避免拖戲
      const maxA = w.params.maxAttackers + (few ? 1 : 0);
      const interval = w.params.interval * (few ? 0.7 : 1);

      this.t -= dt;
      if (this.t > 0 || attackers >= maxA || inForm === 0) return;

      const e = this.pick(list);
      if (e) BM.AI[e.type].launch(e, w);
      this.t = interval * M.rand(0.8, 1.25);
    }

    pick(list) {
      for (let tries = 0; tries < 6; tries++) {
        if (!this.bag.length) this.bag = M.shuffle([0, 1, 2, 3]);
        const type = this.bag.pop();
        const cands = list.filter(e => e.state === 'formation' && e.type === type);
        if (cands.length) return M.pick(cands);
      }
      return null;
    }
  }

  BM.Director = Director;
})(window.BM = window.BM || {});
