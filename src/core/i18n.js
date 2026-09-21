// 多語系：中文（zh）、日文（ja）、英文（en）。
//   BM.I18n.t('menu.start')                 → 依目前語言取得文字
//   BM.I18n.t('go.rank', { n: 3 })          → 文字裡的 {n} 會被取代
//   BM.I18n.set('ja')                       → 切換語言（會存在 localStorage，下次開啟自動套用）
// 找不到翻譯時依序退回中文、再退回 key 本身。arcade 風格的英文標題（GAME OVER、WAVE CLEAR! 等）各語言共用，不在字典裡。
(function (BM) {
  const KEY = 'bulletMeow.lang';
  const LANGS = ['zh', 'ja', 'en'];

  const STR = {
    zh: {
      // 主選單
      'menu.start': '開始遊戲', 'menu.ranking': '排行榜', 'menu.howto': '操作說明', 'menu.settings': '設定',
      'hint.touch1': '點選按鈕開始　遊戲中按住畫面，戰機在手指上方跟隨',
      'hint.touch2': '子彈自動連射　右上角 ⏸ 可暫停',
      'hint.kb': '↑ ↓ / W S / 十字鍵 選擇　　Enter / 空白鍵 / A 確認',
      'hint.pad.yes': '● 已偵測到遊戲控制器', 'hint.pad.no': '○ 支援遊戲控制器（連接後按任一鍵）',
      'hint.keys': 'M 音效開關　F 全螢幕',
      // 排行榜
      'ranking.title': '排行榜', 'ranking.empty': '還沒有紀錄，快去挑戰吧！',
      // 操作說明（兩個頁籤：操作 / 敵機介紹）
      'howto.title': '操作說明', 'tab.controls': '操作', 'tab.enemies': '敵機介紹',
      'ctrl.keyboard': '鍵盤', 'ctrl.gamepad': '遊戲控制器',
      'ctrl.move': '移動', 'ctrl.fire': '射擊', 'ctrl.pause': '暫停',
      'ctrl.move.kb': '方向鍵 / WASD', 'ctrl.move.pad': '左搖桿 / 十字鍵',
      'ctrl.fire.kb': '空白鍵（可按住連發）', 'ctrl.fire.pad': 'A / X / Y / RB / RT',
      'ctrl.pause.kb': 'Esc / P', 'ctrl.pause.pad': 'Start',
      'ctrl.touch': '手機觸控',
      'ctrl.touch1': '按住畫面：戰機飛到手指正上方並跟隨移動（不被手指擋住）',
      'ctrl.touch2': '放開再點新位置，戰機快速飛過去',
      'ctrl.touch3': '子彈自動連射；右上角 ⏸ 按鈕暫停並開啟選單',
      'ctrl.tip': '消滅所有老鼠進入下一波！每 30000 分多一台戰機',
      'enemy.0.name': '迅捷鼠', 'enemy.0.desc': '波浪形俯衝，途中射出瞄準彈',
      'enemy.1.name': '狙擊鼠', 'enemy.1.desc': '懸停瞄準，紅線鎖定後連射（2 滴血）',
      'enemy.2.name': '衝撞鼠', 'enemy.2.desc': '蓄力後追蹤衝撞，橫向閃避即可',
      'enemy.3.name': '旋轉鼠', 'enemy.3.desc': '迴旋一圈半後俯衝，發射三向散彈',
      'enemy.x2': '出擊中的敵機分數 ×2！',
      // 設定（三個頁籤，由左至右：語言 / 了解歷史 / CREDIT；「了解歷史」內含 3 個分頁 about.0~2）
      'settings.title': '設定', 'tab.credit': 'CREDIT', 'tab.language': '語言', 'tab.history': '了解歷史',
      'lang.hint': '選擇後立即套用',
      'credit.planning': '企劃', 'credit.programming': '程式', 'credit.art': '美術', 'credit.music': '音樂', 'credit.thanks': '特別感謝',
      'about.0': '關於射擊遊戲', 'about.1': '概念結構', 'about.2': '關於Arc遊戲庫', 'about.soon': '（內容準備中）',
      // 要補「關於」三個分頁的內文：在這裡加上 'about.body.0'（關於射擊遊戲）、'about.body.1'（概念結構）、'about.body.2'（關於Arc遊戲庫），
      // 用 \n 換行；日文 / 英文在各自的字典加同名 key（沒有時會顯示中文）。沒有內文的分頁顯示「準備中」。
      'nav.back': '返回',
      'nav.keys': '← → 切換頁籤　Esc / B 返回',
      'nav.keys.lang': '← → 切換頁籤　↑ ↓ 選擇　Enter 確認　Esc / B 返回',
      'nav.keys.history': '← → 切換頁籤　↑ ↓ 切換分頁　Esc / B 返回',
      'nav.tap': '點選頁籤切換',
      'toast.lang': '語言：中文',
      // 結算
      'go.sub': '老鼠入侵了…喵嗚', 'go.record': '★ 新的最高紀錄！ ★', 'go.rank': '第 {n} 名！進入排行榜',
      'go.board': '— 排行榜 —', 'go.again': '再玩一次', 'go.menu': '回主選單',
      // 暫停
      'pause.title': '暫停', 'pause.resume': '繼續遊戲', 'pause.menu': '回主選單',
      'pause.hint': 'Esc / P / Start 繼續', 'pause.hint.touch': '點一下選項',
      // 遊戲中
      'banner.bosswarn': 'BOSS  流氓大老鼠 來襲', 'banner.bonus': '通關獎勵 +{n}', 'banner.bossdown': '擊破 BOSS +{n}',
      'boss.name': '流氓大老鼠', 'boss.bubble1': '……', 'boss.bubble2': '唉，下班了',
      'touch.hint1': '按住畫面：戰機在手指上方', 'touch.hint2': '子彈自動連射',
      'toast.sound.on': '音效：開', 'toast.sound.off': '音效：關'
    },

    ja: {
      'menu.start': 'ゲーム開始', 'menu.ranking': 'ランキング', 'menu.howto': '操作説明', 'menu.settings': '設定',
      'hint.touch1': 'ボタンをタップして開始　プレイ中は画面を押すと機体が指の上を追従',
      'hint.touch2': '弾は自動連射　右上の ⏸ で一時停止',
      'hint.kb': '↑ ↓ / W S / 十字キー 選択　　Enter / スペース / A 決定',
      'hint.pad.yes': '● コントローラーを検出しました', 'hint.pad.no': '○ コントローラー対応（接続後に何かボタンを押す）',
      'hint.keys': 'M サウンド切替　F フルスクリーン',
      'ranking.title': 'ランキング', 'ranking.empty': 'まだ記録がありません。挑戦しよう！',
      'howto.title': '操作説明', 'tab.controls': '操作', 'tab.enemies': '敵キャラ紹介',
      'ctrl.keyboard': 'キーボード', 'ctrl.gamepad': 'コントローラー',
      'ctrl.move': '移動', 'ctrl.fire': '射撃', 'ctrl.pause': 'ポーズ',
      'ctrl.move.kb': '矢印キー / WASD', 'ctrl.move.pad': '左スティック / 十字キー',
      'ctrl.fire.kb': 'スペース（長押しで連射）', 'ctrl.fire.pad': 'A / X / Y / RB / RT',
      'ctrl.pause.kb': 'Esc / P', 'ctrl.pause.pad': 'Start',
      'ctrl.touch': 'スマホ操作',
      'ctrl.touch1': '画面を押す：機体が指の真上へ飛んで追従（指に隠れない）',
      'ctrl.touch2': '指を離して別の場所をタップ：機体が素早く移動',
      'ctrl.touch3': '弾は自動連射。右上の ⏸ で一時停止・メニュー',
      'ctrl.tip': 'ネズミを全滅させて次のウェーブへ！30000点ごとに残機が1機増えます',
      'enemy.0.name': '迅速ネズミ', 'enemy.0.desc': '波状に急降下し、途中で狙い撃ちを放つ',
      'enemy.1.name': '狙撃ネズミ', 'enemy.1.desc': '空中で照準し、赤い線が固定されたら連射（HP2）',
      'enemy.2.name': '突撃ネズミ', 'enemy.2.desc': '溜めてから追尾突撃。横に避ければOK',
      'enemy.3.name': '回転ネズミ', 'enemy.3.desc': '1.5回転してから急降下し、3方向に散弾',
      'enemy.x2': '出撃中の敵は得点2倍！',
      'settings.title': '設定', 'tab.credit': 'CREDIT', 'tab.language': '言語', 'tab.history': '歴史を知る',
      'lang.hint': '選ぶとすぐに切り替わります',
      'credit.planning': '企画', 'credit.programming': 'プログラム', 'credit.art': 'アート', 'credit.music': '音楽', 'credit.thanks': 'スペシャルサンクス',
      'about.0': '射撃ゲームについて', 'about.1': 'コンセプト構成', 'about.2': 'Arcゲームライブラリ', 'about.soon': '（準備中）',
      'nav.back': '戻る',
      'nav.keys': '← → タブ切替　Esc / B 戻る',
      'nav.keys.lang': '← → タブ切替　↑ ↓ 選択　Enter 決定　Esc / B 戻る',
      'nav.keys.history': '← → タブ切替　↑ ↓ ページ切替　Esc / B 戻る',
      'nav.tap': 'タブをタップして切り替え',
      'toast.lang': '言語：日本語',
      'go.sub': 'ネズミに侵略された…にゃう', 'go.record': '★ 新記録！ ★', 'go.rank': '第{n}位！ランキング入り',
      'go.board': '— ランキング —', 'go.again': 'もう一度', 'go.menu': 'メインメニュー',
      'pause.title': 'ポーズ', 'pause.resume': 'ゲームに戻る', 'pause.menu': 'メインメニューへ',
      'pause.hint': 'Esc / P / Start で再開', 'pause.hint.touch': 'タップして選択',
      'banner.bosswarn': 'BOSS  ギャング大ネズミ 襲来', 'banner.bonus': 'クリアボーナス +{n}', 'banner.bossdown': 'ボス撃破 +{n}',
      'boss.name': 'ギャング大ネズミ', 'boss.bubble1': '……', 'boss.bubble2': 'はぁ…定時であがります',
      'touch.hint1': '画面を押す：機体は指の上', 'touch.hint2': '弾は自動連射',
      'toast.sound.on': 'サウンド：ON', 'toast.sound.off': 'サウンド：OFF'
    },

    en: {
      'menu.start': 'START GAME', 'menu.ranking': 'RANKING', 'menu.howto': 'HOW TO PLAY', 'menu.settings': 'SETTINGS',
      'hint.touch1': 'Tap to start · Hold the screen: ship follows your finger',
      'hint.touch2': 'Auto-fire · Pause with ⏸ (top right)',
      'hint.kb': '↑ ↓ / W S / D-pad: Select　　Enter / Space / A: OK',
      'hint.pad.yes': '● Gamepad detected', 'hint.pad.no': '○ Gamepad supported (press any button)',
      'hint.keys': 'M: Sound on/off　F: Fullscreen',
      'ranking.title': 'RANKING', 'ranking.empty': 'No records yet. Give it a try!',
      'howto.title': 'HOW TO PLAY', 'tab.controls': 'Controls', 'tab.enemies': 'Enemies',
      'ctrl.keyboard': 'Keyboard', 'ctrl.gamepad': 'Gamepad',
      'ctrl.move': 'Move', 'ctrl.fire': 'Fire', 'ctrl.pause': 'Pause',
      'ctrl.move.kb': 'Arrows / WASD', 'ctrl.move.pad': 'Left stick / D-pad',
      'ctrl.fire.kb': 'Space (hold to auto-fire)', 'ctrl.fire.pad': 'A / X / Y / RB / RT',
      'ctrl.pause.kb': 'Esc / P', 'ctrl.pause.pad': 'Start',
      'ctrl.touch': 'Touch',
      'ctrl.touch1': 'Hold the screen: the ship follows above your finger',
      'ctrl.touch2': 'Lift and tap a new spot: the ship dashes there',
      'ctrl.touch3': 'Auto-fire. Tap ⏸ (top right) to pause',
      'ctrl.tip': 'Defeat all mice to reach the next wave! Extra ship every 30,000 pts',
      'enemy.0.name': 'Swift Mouse', 'enemy.0.desc': 'Dives in a wave pattern and fires aimed shots',
      'enemy.1.name': 'Sniper Mouse', 'enemy.1.desc': 'Hovers and locks on; fires once the red line locks (2 HP)',
      'enemy.2.name': 'Rammer Mouse', 'enemy.2.desc': 'Charges up, then homes in. Just sidestep it',
      'enemy.3.name': 'Spinner Mouse', 'enemy.3.desc': 'Loops 1.5 times, dives, then fires a 3-way spread',
      'enemy.x2': 'Attacking enemies score ×2!',
      'settings.title': 'SETTINGS', 'tab.credit': 'CREDIT', 'tab.language': 'Language', 'tab.history': 'Learn History',
      'lang.hint': 'Applied immediately',
      'credit.planning': 'Planning', 'credit.programming': 'Programming', 'credit.art': 'Art', 'credit.music': 'Music', 'credit.thanks': 'Special Thanks',
      'about.0': 'About Shooting Games', 'about.1': 'Concept Structure', 'about.2': 'About Arc Games', 'about.soon': '(Coming soon)',
      'nav.back': 'Back',
      'nav.keys': '← → Switch tab　Esc / B: Back',
      'nav.keys.lang': '← → Tab　↑ ↓ Select　Enter: OK　Esc / B: Back',
      'nav.keys.history': '← → Tab　↑ ↓ Page　Esc / B: Back',
      'nav.tap': 'Tap a tab to switch',
      'toast.lang': 'Language: English',
      'go.sub': 'The mice invaded... meow', 'go.record': '★ NEW RECORD! ★', 'go.rank': 'Rank #{n}! You made the board',
      'go.board': '— RANKING —', 'go.again': 'Play again', 'go.menu': 'Main menu',
      'pause.title': 'PAUSE', 'pause.resume': 'Resume', 'pause.menu': 'Main menu',
      'pause.hint': 'Esc / P / Start: resume', 'pause.hint.touch': 'Tap an option',
      'banner.bosswarn': 'BOSS  Gangster Rat incoming', 'banner.bonus': 'Clear bonus +{n}', 'banner.bossdown': 'Boss defeated +{n}',
      'boss.name': 'Gangster Rat', 'boss.bubble1': '……', 'boss.bubble2': 'Sigh… clocking out.',
      'touch.hint1': 'Hold screen: ship above finger', 'touch.hint2': 'Auto-fire',
      'toast.sound.on': 'Sound: ON', 'toast.sound.off': 'Sound: OFF'
    }
  };

  let lang = 'zh';
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.indexOf(saved) >= 0) lang = saved;
  } catch (e) { /* 無痕模式等情況忽略 */ }
  if (document.documentElement) document.documentElement.lang = { zh: 'zh-Hant', ja: 'ja', en: 'en' }[lang];

  BM.I18n = {
    LANGS,
    get lang() { return lang; },
    set(l) {
      if (LANGS.indexOf(l) < 0) return;
      lang = l;
      try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
      document.documentElement.lang = { zh: 'zh-Hant', ja: 'ja', en: 'en' }[l];
    },
    // 目前語言（或中文）是否有這個 key
    has(key) { return STR[lang][key] !== undefined || STR.zh[key] !== undefined; },
    t(key, vars) {
      let s = STR[lang][key];
      if (s === undefined) s = STR.zh[key];
      if (s === undefined) return key;
      if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
      return s;
    },
    // 檢查各語言的字典是否齊全（測試用）：回傳缺少的 key
    missing() {
      const out = {};
      for (const l of LANGS) out[l] = Object.keys(STR.zh).filter(k => STR[l][k] === undefined);
      return out;
    }
  };
})(window.BM = window.BM || {});
