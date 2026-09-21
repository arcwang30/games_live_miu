// 排行榜（前 20 名）：雲端（Firebase）為主、本機 localStorage 當快取與離線備援。
// 每一筆：{ score 分數, wave 結束時的波數, name 簽名（最多 4 個英數字）, date 本機日期 }
//
//   list() / best() / qualifies()   讀「目前的榜單」（同步）：連上雲端後是全球前 20 名，還沒連上就是本機的
//   submit(score, wave, name)       送出成績：先立刻放進榜單（畫面馬上看得到），再在背景上傳到雲端，成功後重新取得榜單
//   refresh()                       重新取得雲端榜單（開遊戲、進排行榜、開始新遊戲、結算時會呼叫）
//   status                          'idle' | 'loading' | 'ok'（榜單來自雲端）| 'offline'（沒連上，顯示本機紀錄）
//   version                         榜單每次改變就 +1（畫面用來知道要不要重算名次）
// 上傳失敗（離線）的成績會存在 pending，下次連上網時自動補傳。
// 舊版（只有 score / date）的本機紀錄仍可讀取：沒有簽名顯示 ----、沒有波數顯示 --；連上雲端後榜單會換成雲端資料。
(function (BM) {
  const KEY = 'bulletMeow.scores.v1';          // 榜單快取（跟舊版同一個 key）
  const PKEY = 'bulletMeow.pending.v1';        // 還沒上傳成功的成績
  const MAX = 20;                              // 排行榜名額
  const NAME_LEN = 4;                          // 簽名字數
  const DEFAULT_NAME = 'MEOW';                 // 沒有簽名就送出時使用
  const MAX_TRIES = 3;                         // 同一筆成績最多重試幾次（避免壞資料永遠卡在待傳清單）

  let board = null, pending = null;
  let status = 'idle', version = 0, busy = null, dirty = false, lastEntry = null;

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 無痕模式等情況忽略 */ }
  }
  function load() {
    if (board) return;
    board = read(KEY).filter(e => e && typeof e.score === 'number').slice(0, MAX);
    pending = read(PKEY).filter(e => e && e.id && typeof e.score === 'number');
  }

  // 簽名只留 A–Z、0–9，轉大寫、去掉頭尾空白，最多 4 個字元；空的就用預設名字
  function cleanName(name) {
    const s = String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, NAME_LEN);
    return s || DEFAULT_NAME;
  }

  const same = (a, b) => a.score === b.score && (a.wave | 0) === (b.wave | 0) && (a.name || '') === (b.name || '');

  // 把雲端榜單和「還沒上傳」的成績合併成目前的榜單（分數高的在前，同分先到的在前）
  function merge(top) {
    const l = top.slice();
    for (const p of pending) {
      if (!l.some(e => same(e, p))) l.push({ score: p.score, wave: p.wave, name: p.name, date: p.date });
    }
    l.sort((a, b) => b.score - a.score);
    return l.slice(0, MAX);
  }

  function touch() { version++; }

  // 補傳待傳的成績（一筆一筆傳），全部處理完再重新取得榜單
  async function flush() {
    const C = BM.Cloud;
    for (const p of pending.slice()) {
      try {
        await C.add(p);
        pending.splice(pending.indexOf(p), 1);
      } catch (e) {
        const denied = e && e.code === 'permission-denied';        // 已經在雲端了（重送被擋）或資料不合規則：都不用再傳
        p.tries = (p.tries || 0) + 1;
        if (denied || p.tries >= MAX_TRIES) pending.splice(pending.indexOf(p), 1);
        else break;                                                 // 網路問題：先停，下次再補傳
      }
    }
    write(PKEY, pending);
  }

  const S = BM.Storage = {
    MAX, NAME_LEN, DEFAULT_NAME,
    get status() { return status; },
    get version() { return version; },
    get lastEntry() { return lastEntry; },

    list() { load(); return board.slice(); },
    best() { load(); return board.length ? board[0].score : 0; },

    // 這個分數進得了排行榜嗎？（0 分不算；榜單滿了要比最後一名高才行）
    // 榜單只會越來越高，所以就算快取有點舊，也只會「多讓玩家簽名」，不會漏掉該進榜的成績
    qualifies(score) {
      if (score <= 0) return false;
      load();
      return board.length < MAX || score > board[board.length - 1].score;
    },

    // 這一筆在目前榜單裡排第幾（0 起算），不在榜上回傳 -1
    rankOf(e) {
      load();
      return e ? board.findIndex(x => same(x, e)) : -1;
    },

    // 啟動時呼叫：補傳上次沒傳成功的成績並取得榜單
    init() { load(); return S.refresh(); },

    // 重新取得雲端榜單；同時只會有一個在跑。失敗（離線）就維持目前的榜單並標示 offline
    refresh() {
      load();
      if (busy) { dirty = true; return busy; }                 // 同步途中又有新成績：這一輪結束後再跑一次
      if (!BM.Cloud || !BM.Cloud.available) { status = 'offline'; touch(); return Promise.resolve(); }
      status = 'loading'; touch();
      busy = (async () => {
        try {
          if (pending.length) await flush();
          const top = await BM.Cloud.fetchTop(MAX);
          board = merge(top);
          write(KEY, board);
          status = 'ok';
        } catch (e) {
          status = 'offline';
          console.warn('排行榜同步失敗，改顯示本機紀錄：', e);
        }
        busy = null;
        touch();
        if (dirty) { dirty = false; S.refresh(); }
      })();
      return busy;
    },

    // 送出成績；回傳名次（0 起算），沒進榜或 0 分回傳 -1。榜單立刻更新，雲端上傳在背景進行
    submit(score, wave, name) {
      if (!S.qualifies(score)) return -1;
      load();
      const d = new Date();
      const date = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
      const entry = { score, wave: Math.max(1, wave | 0), name: cleanName(name), date };
      board.push(entry);
      board.sort((a, b) => b.score - a.score);          // 分數相同時，先達成的排在前面（排序是穩定的）
      board = board.slice(0, MAX);
      write(KEY, board);
      lastEntry = entry;

      pending.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: entry.name, score: entry.score, wave: entry.wave, date });
      write(PKEY, pending);
      touch();
      S.refresh();                                        // 背景上傳 → 重新取得榜單（沒有雲端時只是標示 offline）
      return board.indexOf(entry);
    }
  };
})(window.BM = window.BM || {});
