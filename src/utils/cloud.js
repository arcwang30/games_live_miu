// 雲端排行榜（Firebase Firestore）：所有玩家共用同一份前 20 名。
//   - 用 CDN 的 firebase-app-compat / firebase-firestore-compat（index.html 載入），這樣雙擊 index.html 也能執行
//   - 載入失敗（沒網路、CDN 被擋）時 available 為 false，遊戲會自動改用本機排行榜，不會卡住
//   - 資料：集合 scores，每筆 { name 簽名 1~4 個英數字, score 分數, wave 結束時的波數, ts 伺服器時間 }
//   - 防亂寫靠 Firestore 安全規則（只能新增、限制欄位與範圍；規則寫在 docs/GAME_DESIGN.md 與 docs/firestore.rules）
//   - 這組設定（apiKey 等）本來就會出現在網頁裡，不是機密
(function (BM) {
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDnmdxrBa7I5qwsyZ5KyAn9KDJ5lVutZMk',
    authDomain: 'my-claude-game-miumiu.firebaseapp.com',
    projectId: 'my-claude-game-miumiu',
    storageBucket: 'my-claude-game-miumiu.firebasestorage.app',
    messagingSenderId: '39836691921',
    appId: '1:39836691921:web:f6c30ed5d3a3a94f5604f0'
  };
  const COLLECTION = 'scores';
  const FETCH_TIMEOUT = 6000, ADD_TIMEOUT = 8000;      // 毫秒：網路不通時不要讓遊戲一直等

  let db = null;

  function withTimeout(p, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }

  BM.Cloud = {
    init() {
      try {
        if (typeof firebase === 'undefined') return;                       // SDK 沒載入
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        try { db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) { /* 舊版 SDK 忽略 */ }
      } catch (e) {
        db = null;
        console.warn('Firebase 初始化失敗，改用本機排行榜：', e);
      }
    },

    get available() { return !!db; },

    // 取得分數最高的前 n 筆，回傳 [{ name, score, wave }]
    async fetchTop(n) {
      const snap = await withTimeout(db.collection(COLLECTION).orderBy('score', 'desc').limit(n).get(), FETCH_TIMEOUT);
      return snap.docs.map(d => d.data())
        .filter(e => e && typeof e.score === 'number' && typeof e.name === 'string')
        .map(e => ({ name: e.name, score: e.score, wave: e.wave | 0 }));
    },

    // 送出一筆成績。用固定的文件 id：同一筆重送不會變成兩筆（第二次會被規則擋下，呼叫端把 permission-denied 當成「已經在了」）
    async add(e) {
      await withTimeout(db.collection(COLLECTION).doc(e.id).set({
        name: e.name, score: e.score, wave: e.wave,
        ts: firebase.firestore.FieldValue.serverTimestamp()
      }), ADD_TIMEOUT);
    }
  };
})(window.BM = window.BM || {});
