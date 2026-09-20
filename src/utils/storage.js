// 排行榜：存在瀏覽器 localStorage（最多保留前 10 名）
(function (BM) {
  const KEY = 'bulletMeow.scores.v1';
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
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* 無痕模式等情況忽略 */ }
  }

  BM.Storage = {
    list() { return load().slice(); },
    best() { const l = load(); return l.length ? l[0].score : 0; },

    // 送出成績；回傳名次（0 起算），沒進榜或 0 分回傳 -1
    submit(score) {
      if (score <= 0) return -1;
      const l = load();
      const d = new Date();
      const date = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
      const entry = { score, date };
      l.push(entry);
      l.sort((a, b) => b.score - a.score);
      cache = l.slice(0, 10);
      save();
      return cache.indexOf(entry);
    }
  };
})(window.BM = window.BM || {});
