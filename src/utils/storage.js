// 排行榜：存在瀏覽器 localStorage（最多保留前 20 名）
// 每一筆：{ score 分數, wave 結束時的波數, name 簽名（最多 4 個英數字）, date 日期 }
// 舊版（只有 score / date）的紀錄仍然可以讀取：沒有簽名顯示 ----、沒有波數顯示 --。
(function (BM) {
  const KEY = 'bulletMeow.scores.v1';
  const MAX = 20;                     // 排行榜名額
  const NAME_LEN = 4;                 // 簽名字數
  const DEFAULT_NAME = 'MEOW';        // 沒有簽名就送出時使用
  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      cache = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cache)) cache = [];
    } catch (e) {
      cache = [];
    }
    cache = cache.filter(e => e && typeof e.score === 'number').slice(0, MAX);
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* 無痕模式等情況忽略 */ }
  }

  // 簽名只留 A–Z、0–9，轉大寫、去掉頭尾空白，最多 4 個字元；空的就用預設名字
  function cleanName(name) {
    const s = String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, NAME_LEN);
    return s || DEFAULT_NAME;
  }

  BM.Storage = {
    MAX, NAME_LEN, DEFAULT_NAME,
    list() { return load().slice(); },
    best() { const l = load(); return l.length ? l[0].score : 0; },

    // 這個分數進得了排行榜嗎？（0 分不算；榜單滿了要比最後一名高才行）
    qualifies(score) {
      if (score <= 0) return false;
      const l = load();
      return l.length < MAX || score > l[l.length - 1].score;
    },

    // 送出成績；回傳名次（0 起算），沒進榜或 0 分回傳 -1
    submit(score, wave, name) {
      if (!this.qualifies(score)) return -1;
      const l = load();
      const d = new Date();
      const date = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
      const entry = { score, wave: Math.max(1, wave | 0), name: cleanName(name), date };
      l.push(entry);
      l.sort((a, b) => b.score - a.score);          // 分數相同時，先達成的排在前面（排序是穩定的）
      cache = l.slice(0, MAX);
      save();
      return cache.indexOf(entry);
    }
  };
})(window.BM = window.BM || {});
