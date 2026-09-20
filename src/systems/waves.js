// 波次：產生 15×5 敵機、依波數調整難度；Director 負責調度敵機何時出擊。
(function (BM) {
  const C = BM.CONFIG, F = C.FORMATION, M = BM.M;

  BM.Waves = {
    // 難度曲線（波數越高：同時出擊數 ↑、間隔 ↓、速度 ↑、子彈速度 ↑，皆有上限）
    params(wave) {
      return {
        wave,
        maxAttackers: Math.min(2 + Math.floor((wave - 1) * 0.75), 6),
        interval: Math.max(0.65, 1.9 - 0.14 * (wave - 1)),
        speedMul: Math.min(1.5, 1 + 0.06 * (wave - 1)),
        bulletSpeed: Math.min(340, 220 + 12 * (wave - 1))
      };
    },

    // 建立 75 隻敵機。四種 AI 依 (col+row)%4 斜線交錯排列，數量幾乎相等。
    spawn() {
      const list = [];
      for (let r = 0; r < F.rows; r++) {
        for (let c = 0; c < F.cols; c++) {
          const e = new BM.Enemy((c + r) % 4, c, r);
          e.side = r % 2 === 0 ? 1 : -1;                       // 奇偶列左右交替登場
          const k = e.side === 1 ? c : F.cols - 1 - c;
          e.delay = 0.5 + r * 0.6 + k * 0.065;
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
