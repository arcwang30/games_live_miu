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
      'ctrl.tip': '消滅所有老鼠進入下一波！分數到 3 萬、9 萬、18 萬… 各多一台戰機',
      'enemy.0.name': '迅捷鼠', 'enemy.0.desc': '波浪形俯衝，途中射出瞄準彈',
      'enemy.1.name': '狙擊鼠', 'enemy.1.desc': '懸停瞄準，紅線鎖定後連射（2 滴血）',
      'enemy.2.name': '衝撞鼠', 'enemy.2.desc': '蓄力後追蹤衝撞，橫向閃避即可',
      'enemy.3.name': '旋轉鼠', 'enemy.3.desc': '迴旋一圈半後俯衝，發射三向散彈',
      'enemy.x2': '出擊中的敵機分數 ×2！',
      'enemy.4.name': '金必鼠', 'enemy.4.desc': '稀有！在畫面上方徘徊，限時飛走。打中 11 發才會爆炸：高分＋1 台預備機', 'gold.appear': '金必鼠出現！',
      // 設定（三個頁籤，由左至右：語言 / 了解歷史 / CREDIT；「了解歷史」內含 3 個分頁 about.0~2）
      'settings.title': '設定', 'tab.credit': 'CREDIT', 'tab.language': '語言', 'tab.history': '了解歷史',
      'lang.hint': '選擇後立即套用',
      'credit.planning': '企劃', 'credit.programming': '程式', 'credit.art': '美術', 'credit.music': '音樂', 'credit.thanks': '特別感謝',
      'about.0': '關於射擊遊戲', 'about.1': '概念結構', 'about.2': '關於Arc遊戲庫', 'about.soon': '（內容準備中）',
      // 要補「關於」三個分頁的內文：在這裡加上 'about.body.0'（關於射擊遊戲）、'about.body.1'（概念結構）、'about.body.2'（關於Arc遊戲庫），
      // 用 \n 換行；日文 / 英文在各自的字典加同名 key（沒有時會顯示中文）。沒有內文的分頁顯示「準備中」。
      // 「關於Arc遊戲庫」內文（作者提供）。日文 / 英文還沒有翻譯，會先顯示中文
      'about.body.2':
        '「ARCの概遊庫」這個名字，發想起源於諧音「蓋油庫」(即:概念遊戲保藏庫)。期望自己，以及所有開發者所開發的作品，都能夠像「蓋油庫」一樣，賺大錢！\n' +
        '同時也可以很自豪、很酷地說出自己開發遊戲的喜悅，以及一路走來的心路歷程。除了可以從遊戲中遊玩雛型範本之外，同時可透過內建的歷史功能，了解各系列類型遊戲的組成與開發構成等相關知識，進而對遊戲開發產生興趣。\n' +
        '目前年過50的作者，回頭一看，進入遊戲業界也將近25年了。這一路走來，雖然參與、開發過不少遊戲，卻始終沒有真正做出一款讓自己「超級成名」的TITLE。\n' +
        '近年來AI開發盛行，遊戲產業也正面臨前所未有的變化。「選擇走遊戲這條路，究竟是正確的嗎？」這個問題開始不斷浮現在我的腦海裡。\n' +
        '因此我不得不重新思考——人生走到這個階段，我存在的意義究竟是什麼？而其中，我最常問自己的一個問題就是：「我能為這個產業留下什麼？」\n' +
        '常常在想，是否能夠運用自己這25年來所學到的東西，讓那些對遊戲開發有興趣的新生代，重新產生一點「想做遊戲」的衝動？但要怎麼做？\n' +
        '「不然，就來做一本可以玩的遊戲書吧！」從小，我就是個很不愛看「有字的書」的人。（漫畫除外！）與其坐在那裡讀一大堆文字，不如先親身體驗看看。覺得有興趣，再回頭鑽研。就這樣——「ARCの概遊庫」誕生了！\n' +
        '就像我常常形容的：大多數的遊戲開發者，幾乎很難能成為第二個宮本茂，也未必能像神話般屢屢敗部復活的小島秀夫桑一樣，成為世人熟知的大師。難道就因此喪志、放棄嗎？我想不必。\n' +
        '因為每一個開發者，都曾經擁有那顆熱愛遊戲的赤子之心。曾經捧著遊戲雜誌，期待下一款新作的到來；曾經跑進電玩店，投下硬幣，和朋友一起打《快打旋風》，為了輸贏大呼小叫；曾經為了一款遊戲可以興奮上一整天。\n' +
        '那些年華與時光，也許就像短暫的流星般一閃而過。但直到現在，我還是相信——玩遊戲，是因為好玩；而做遊戲，不也就是因為好玩嗎？\n' +
        '即使我們未必能成為那個站在聚光燈下的人，至少，也可以留下自己曾經努力做過、曾經熱愛過的作品。這，就是我想做「ARCの概遊庫」的理由。\n' +
        '「ARCの概遊庫」，一款可以玩的遊戲書、一段屬於遊戲開發者的故事。也是一群喜歡遊戲的人所留下的足跡。希望各位喜歡。感謝！！',
      'nav.back': '返回',
      'nav.keys': '← → 切換頁籤　Esc / B 返回',
      'nav.keys.lang': '← → 切換頁籤　↑ ↓ 選擇　Enter 確認　Esc / B 返回',
      'nav.keys.history': '← → 切換頁籤　↑ ↓ / 滾輪 捲動（到底再按 = 換分頁）　Esc / B 返回',
      'nav.tap': '點選頁籤切換',
      'nav.tap.history': '點選分頁　上下滑動閱讀',
      'about.fb': '前往 Facebook 粉絲團', 'about.fb.blocked': '瀏覽器擋住了新視窗，請手動開啟粉絲團網址',
      'toast.lang': '語言：中文',
      // 結算
      'go.sub': '老鼠入侵了…喵嗚', 'go.record': '★ 新的最高紀錄！ ★', 'go.rank': '第 {n} 名！進入排行榜',
      'go.board': '— 排行榜 —', 'go.again': '再玩一次', 'go.menu': '回主選單',
      'sign.title': '請簽名（A–Z、0–9）', 'sign.del': '刪除',
      'sign.hint.kb': '直接打字 A–Z、0–9　Backspace 刪除　↑ ↓ 換字　← → 換格　Enter 送出',
      'sign.hint.pad': '↑ ↓ 換字　← → 換格　A 確定這格　B 退格　Start 送出',
      'sign.hint.touch': '點下方鍵盤輸入簽名　點格子選位置　⌫ 刪除　OK 送出',
      'ranking.sync.loading': '同步中…', 'ranking.sync.ok': '全球排行榜', 'ranking.sync.offline': '離線・顯示本機紀錄',
      // 暫停
      'pause.title': '暫停', 'pause.resume': '繼續遊戲', 'pause.menu': '回主選單',
      'pause.hint': 'Esc / P / Start 繼續', 'pause.hint.touch': '點一下選項',
      // 遊戲中
      'banner.bosswarn': 'BOSS  流氓大老鼠 來襲', 'banner.bonus': '通關獎勵 +{n}', 'banner.bossdown': '擊破 BOSS +{n}',
      'boss.name': '流氓大老鼠', 'boss.bubble1': '……', 'boss.bubble2': '唉，下班了',
      // BOSS 死亡台詞（隨機抽一句，見 boss.js 的 LINES）。{n} = 這是第幾隻 BOSS。中文不要用空白（斷行會依空白分字）
      'boss.l.g01': '唉，下班了', 'boss.l.g02': '這個月的績效…完蛋了', 'boss.l.g03': '我只是來打工的啊', 'boss.l.g04': '早知道就請假了',
      'boss.l.g05': '又要寫報告了…', 'boss.l.g06': '起司…還沒吃完…', 'boss.l.g07': '好想回家躺著', 'boss.l.g08': '我的年終獎金…',
      'boss.l.g09': '老闆說不用加班的…', 'boss.l.g10': '可以幫我打卡嗎…', 'boss.l.g11': '我要去領資遣費了', 'boss.l.g12': '薪水那麼少，還要賣命',
      'boss.l.g13': '這樣算工傷嗎？', 'boss.l.g14': '下輩子要當貓', 'boss.l.g15': '誰來幫我簽死亡證明', 'boss.l.g16': '麻煩幫我把起司打包',
      'boss.l.g17': '我的存款…只剩起司了', 'boss.l.g18': '我不玩了，我要回老家', 'boss.l.g19': '這個BUG…不是我寫的…', 'boss.l.g20': '幫我轉告老媽…我很好',
      'boss.l.g21': '剛才那一擊…有加班費嗎', 'boss.l.g22': '我想辭職，可是房貸…', 'boss.l.g23': '好，我躺平了', 'boss.l.g24': '其實我只是想放個假',
      'boss.l.g25': '這種死法，履歷怎麼寫', 'boss.l.g26': '不要碰我，我要準時下班',
      'boss.l.day1': '大白天的就被打，好丟臉…', 'boss.l.day2': '太陽這麼大，我想午休…', 'boss.l.day3': '日正當中，正好下班',
      'boss.l.dusk1': '都黃昏了，連晚餐都沒吃…', 'boss.l.dusk2': '夕陽這麼美，我卻…', 'boss.l.dusk3': '快下班了，你偏偏這時候',
      'boss.l.night1': '大半夜還要加班…', 'boss.l.night2': '這個時間，我該睡了啊', 'boss.l.night3': '夜班津貼…有嗎？',
      'boss.l.lv1a': '新人第一天就這樣…', 'boss.l.lv1b': '我明明只是實習生…', 'boss.l.lv1c': '試用期…是不是沒過了',
      'boss.l.lv2a': '又是我？上次不是才…', 'boss.l.lv2b': '第二次了…我要轉部門', 'boss.l.lv2c': '我記得我已經離職了啊…',
      'boss.l.lv3a': '第{n}隻了…我習慣了', 'boss.l.lv3b': '第{n}隻了，工會會找你談', 'boss.l.lv3c': '我是第{n}代，還是被欺負', 'boss.l.lv3d': '老闆還會再派一隻來的…',
      'boss.l.flaw1': '你…連一條命都沒丟？', 'boss.l.flaw2': '一次都沒死…你是外掛嗎', 'boss.l.flaw3': '這麼強，來我們公司吧',
      'boss.l.many1': '你也死了好幾次…不容易', 'boss.l.many2': '兩敗俱傷…都回家吧', 'boss.l.many3': '陣亡那麼多次還能贏…',
      'boss.l.fast1': '這麼快？我才剛暖身', 'boss.l.fast2': '才幾分鐘，我的午茶呢',
      'boss.l.slow1': '打這麼久，加班費你出？', 'boss.l.slow2': '這場會議，開太久了…',
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
      'ctrl.tip': 'ネズミを全滅させて次のウェーブへ！3万・9万・18万…点で残機が1機ずつ増えます',
      'enemy.0.name': '迅速ネズミ', 'enemy.0.desc': '波状に急降下し、途中で狙い撃ちを放つ',
      'enemy.1.name': '狙撃ネズミ', 'enemy.1.desc': '空中で照準し、赤い線が固定されたら連射（HP2）',
      'enemy.2.name': '突撃ネズミ', 'enemy.2.desc': '溜めてから追尾突撃。横に避ければOK',
      'enemy.3.name': '回転ネズミ', 'enemy.3.desc': '1.5回転してから急降下し、3方向に散弾',
      'enemy.x2': '出撃中の敵は得点2倍！',
      'enemy.4.name': '金必ネズミ', 'enemy.4.desc': 'レア！画面上部を漂い、時間が来ると飛び去る。11発当てると爆発：高得点＋残機1', 'gold.appear': '金必ネズミ出現！',
      'settings.title': '設定', 'tab.credit': 'CREDIT', 'tab.language': '言語', 'tab.history': '歴史を知る',
      'lang.hint': '選ぶとすぐに切り替わります',
      'credit.planning': '企画', 'credit.programming': 'プログラム', 'credit.art': 'アート', 'credit.music': '音楽', 'credit.thanks': 'スペシャルサンクス',
      'about.0': '射撃ゲームについて', 'about.1': 'コンセプト構成', 'about.2': 'Arcゲームライブラリ', 'about.soon': '（準備中）',
      // 「Arcゲームライブラリ」内文（日文）
      'about.body.2':
        '「ARCの概遊庫（がいゆうこ）」という名前は、台湾華語の「蓋油庫（ガイヨウクー：油槽所を建てる）」という言葉の語呂合わせから生まれました（その真の意味は「概念ゲームの保藏庫」です）。自分自身、そしてすべての開発者が生み出す作品が、この「蓋油庫」の言葉通り、大儲けできる（油田を掘り当てる）ような存在になってほしいという願いが込められています。\n' +
        '同時に、自分がゲームを開発する喜びや、これまでの道のりを、誇らしく、そしてクールに語れる場所でもあります。ここではゲームのプロトタイプを実際に遊べるだけでなく、内蔵された「歴史機能」を通じて、様々なジャンルのゲームがどのように構成され、開発されてきたかという知識を学ぶことができます。そこから、ゲーム開発に興味を持つきっかけになれば幸いです。\n' +
        '現在、50歳を超えた私がふと振り返ると、ゲーム業界に入ってからもうすぐ25年になります。これまでの道のりで、数多くのゲームに関わり、開発してきましたが、自分を「超有名」にするような代表作（タイトル）には、ついに巡り合えませんでした。\n' +
        '近年、AI開発が盛んになり、ゲーム産業はかつてない変革期を迎えています。「ゲームの道を選んだことは、果たして正しかったのだろうか？」そんな問いが、最近頭をよぎるようになりました。\n' +
        '人生のこのステージに至り、「自分が存在する意味とは一体何だろう？」と、改めて考えざるを得なくなったのです。その中で、私が最も自分に問いかけたのは、「自分はこの産業に何を残せるだろうか？」ということでした。\n' +
        '自分がこの25年間で学んできたことを活かし、ゲーム開発に興味を持つ次世代の若者たちに、もう一度「ゲームを作りたい！」という衝動を呼び起こすことはできないだろうか？ ――そう常々考えていました。しかし、一体どうすればいいのか？\n' +
        '「それなら、“遊べるゲームの参考書”を作ってみよう！」幼い頃から、私は「文字ばかりの本」を読むのが大の苦手でした（漫画は別ですが！）。机に向かって膨大な文字を読むくらいなら、まずは体感してみる。面白いと思ったら、そこから深く掘り下げればいい。そうして生まれたのが、この「ARCの概遊庫」です。\n' +
        '私がよく口にする言葉があります。ほとんどのゲーム開発者は、第二の宮本茂氏になることは難しいですし、神話のように何度も窮地から復活を遂げた小島秀夫氏のように、世界に名を馳せる巨匠になれるわけでもありません。だからといって、志を失い、諦めるべきでしょうか？ 私はそうは思いません。\n' +
        'なぜなら、すべての開発者が、かつてゲームを純粋に愛する少年のような心を持っていたからです。ゲーム雑誌を握りしめ、新作の発売を心待ちにしていた日々。ゲームセンターに駆け込み、コインを投入し、友達と『ストリートファイター』で勝った負けたと大騒ぎしたこと。たった一本のゲームのために、丸一日中興奮していられたあの頃。\n' +
        'あの輝かしい青春や時間は、一瞬で駆け抜ける流れ星のようだったかもしれません。それでも私は今でも信じています。「ゲームを遊ぶのは楽しいからであり、ゲームを作るのもまた、楽しいからではないか」と。\n' +
        'たとえ私たちがスポットライトを浴びる存在になれなかったとしても、少なくとも、自分がかつて必死に作り、心から愛した作品をここに残すことはできる。それこそが、私が「ARCの概遊庫」を作ろうと思った理由です。\n' +
        '「ARCの概遊庫」――それは遊べるゲームの参考書であり、ゲーム開発者の物語。そして、ゲームを愛する者たちが残した足跡（そくせき）でもあります。皆さんに楽しんでいただけることを願っています。ありがとうございました！！',
      'nav.back': '戻る',
      'nav.keys': '← → タブ切替　Esc / B 戻る',
      'nav.keys.lang': '← → タブ切替　↑ ↓ 選択　Enter 決定　Esc / B 戻る',
      'nav.keys.history': '← → タブ切替　↑ ↓ / ホイール スクロール（端でさらに = ページ切替）　Esc / B 戻る',
      'nav.tap': 'タブをタップして切り替え',
      'nav.tap.history': 'ページをタップ・上下にスワイプで読む',
      'about.fb': 'Facebook ファンページへ', 'about.fb.blocked': '新しいウィンドウがブロックされました。手動でURLを開いてください',
      'toast.lang': '言語：日本語',
      'go.sub': 'ネズミに侵略された…にゃう', 'go.record': '★ 新記録！ ★', 'go.rank': '第{n}位！ランキング入り',
      'go.board': '— ランキング —', 'go.again': 'もう一度', 'go.menu': 'メインメニュー',
      'sign.title': 'サインを入力（A–Z、0–9）', 'sign.del': '消す',
      'sign.hint.kb': 'A–Z、0–9 を入力　Backspace 削除　↑ ↓ 文字　← → 枠移動　Enter 決定',
      'sign.hint.pad': '↑ ↓ 文字　← → 枠移動　A この枠を決定　B 戻る　Start 決定',
      'sign.hint.touch': '下のキーボードで入力　枠をタップで選択　⌫ 削除　OK 決定',
      'ranking.sync.loading': '同期中…', 'ranking.sync.ok': '世界ランキング', 'ranking.sync.offline': 'オフライン・本体の記録を表示',
      'pause.title': 'ポーズ', 'pause.resume': 'ゲームに戻る', 'pause.menu': 'メインメニューへ',
      'pause.hint': 'Esc / P / Start で再開', 'pause.hint.touch': 'タップして選択',
      'banner.bosswarn': 'BOSS  ギャング大ネズミ 襲来', 'banner.bonus': 'クリアボーナス +{n}', 'banner.bossdown': 'ボス撃破 +{n}',
      'boss.name': 'ギャング大ネズミ', 'boss.bubble1': '……', 'boss.bubble2': 'はぁ…定時であがります',
      // BOSS 死亡台詞（日文）
      'boss.l.g01': 'はぁ…お先に失礼します', 'boss.l.g02': '今月の評価が…終わった', 'boss.l.g03': 'バイトなだけなのに…', 'boss.l.g04': '有給取っとけばよかった',
      'boss.l.g05': 'また始末書か…', 'boss.l.g06': 'チーズ…まだ食べてない…', 'boss.l.g07': '家に帰って寝たい…', 'boss.l.g08': '私のボーナスが…',
      'boss.l.g09': '残業なしって言ったのに…', 'boss.l.g10': '誰か代わりに打刻して…', 'boss.l.g11': '退職金をもらってくる', 'boss.l.g12': '給料は安いのに命がけ',
      'boss.l.g13': 'これって労災になる？', 'boss.l.g14': '来世は猫になる', 'boss.l.g15': '誰か死亡診断書にサインを…', 'boss.l.g16': 'チーズを持ち帰りにして…',
      'boss.l.g17': '貯金が…チーズだけに', 'boss.l.g18': 'もう辞める、実家に帰る', 'boss.l.g19': 'このバグ…俺のせいじゃない…', 'boss.l.g20': '母さんに伝えて…元気だって',
      'boss.l.g21': '今の一撃…残業代出る？', 'boss.l.g22': '辞めたい…でもローンが…', 'boss.l.g23': 'よし、寝そべります', 'boss.l.g24': '本当はただ休みたかった',
      'boss.l.g25': 'この死因、履歴書にどう書く？', 'boss.l.g26': '触らないで、定時で帰るから',
      'boss.l.day1': '真っ昼間にやられるなんて…', 'boss.l.day2': '日差しが強い、昼寝したい…', 'boss.l.day3': '昼間だけど、もう上がります',
      'boss.l.dusk1': 'もう夕方なのに晩ごはんが…', 'boss.l.dusk2': '夕日が綺麗なのに、俺は…', 'boss.l.dusk3': '定時直前に来るなんて…',
      'boss.l.night1': '真夜中まで残業なんて…', 'boss.l.night2': 'もう寝る時間なんだけど', 'boss.l.night3': '夜勤手当…出る？',
      'boss.l.lv1a': '新人初日でこれかよ…', 'boss.l.lv1b': 'ただのインターンなのに…', 'boss.l.lv1c': '試用期間、落ちたかも…',
      'boss.l.lv2a': 'また俺？この前も…', 'boss.l.lv2b': '二度目か…部署変えたい', 'boss.l.lv2c': '辞めたはずなのに…',
      'boss.l.lv3a': 'もう{n}匹目…慣れた', 'boss.l.lv3b': '{n}匹目…組合が黙ってないぞ', 'boss.l.lv3c': '{n}代目なのにまだいじめられる', 'boss.l.lv3d': '上司がまた次を送るだけさ…',
      'boss.l.flaw1': '一機も落ちてない…だと？', 'boss.l.flaw2': 'ノーミスとか、チートか？', 'boss.l.flaw3': 'その腕前、うちに来ないか？',
      'boss.l.many1': '君も何度もやられたな…', 'boss.l.many2': '相打ちか…もう帰ろう', 'boss.l.many3': 'あれだけやられて勝つのか…',
      'boss.l.fast1': '早っ！まだ準備運動中…', 'boss.l.fast2': 'まだティータイム前なのに…',
      'boss.l.slow1': '長引いたな、残業代は？', 'boss.l.slow2': 'この会議、長すぎ…',
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
      'ctrl.tip': 'Defeat all mice to reach the next wave! Extra ships at 30K, 90K, 180K...',
      'enemy.0.name': 'Swift Mouse', 'enemy.0.desc': 'Dives in a wave pattern and fires aimed shots',
      'enemy.1.name': 'Sniper Mouse', 'enemy.1.desc': 'Hovers and locks on; fires once the red line locks (2 HP)',
      'enemy.2.name': 'Rammer Mouse', 'enemy.2.desc': 'Charges up, then homes in. Just sidestep it',
      'enemy.3.name': 'Spinner Mouse', 'enemy.3.desc': 'Loops 1.5 times, dives, then fires a 3-way spread',
      'enemy.x2': 'Attacking enemies score ×2!',
      'enemy.4.name': 'Jackpot Mouse', 'enemy.4.desc': 'Rare! Hovers at the top, then flies off. Takes 11 hits: big score + 1 extra ship', 'gold.appear': 'Jackpot Mouse!',
      'settings.title': 'SETTINGS', 'tab.credit': 'CREDIT', 'tab.language': 'Language', 'tab.history': 'Learn History',
      'lang.hint': 'Applied immediately',
      'credit.planning': 'Planning', 'credit.programming': 'Programming', 'credit.art': 'Art', 'credit.music': 'Music', 'credit.thanks': 'Special Thanks',
      'about.0': 'About Shooting Games', 'about.1': 'Concept Structure', 'about.2': 'About Arc Games', 'about.soon': '(Coming soon)',
      // "About Arc Games" body text (English). The CJK-first font renders a curly apostrophe as a wide glyph, so plain apostrophes are used
      'about.body.2':
        'The name "ARC\'s Concept Play-Chamber" (ARCの概遊庫) was inspired by a Chinese wordplay on "building an oil depot" (Gai You Ku), which in this context stands for a "Concept Game Repository." My hope is that my own work, alongside the creations of all fellow developers, can be just like that "oil depot"—bringing in massive wealth and striking it rich!\n' +
        'At the same time, it is a place where we can proudly and coolly share the sheer joy of game development, as well as the emotional journey we\'ve walked along the way. Beyond just playing prototype templates within the game, users can utilize the built-in history feature to understand the structural composition and development of various game genres. Through this hands-on knowledge, I hope to spark a genuine interest in game development for the next generation.\n' +
        'Now past the age of 50, I look back and realize I\'ve been in the game industry for nearly 25 years. Walking this path, though I\'ve participated in and developed quite a few games, I\'ve never truly made that one "megahit" title to skyrocket my name into stardom.\n' +
        'With the recent boom in AI development, the game industry is facing unprecedented shifts. Questions have begun to constantly haunt my mind: "Was choosing the path of game development really the right choice?"\n' +
        'Consequently, I found myself forced to rethink—at this stage of my life, what is the ultimate meaning of my existence? Among all my thoughts, the question I ask myself most frequently is: "What can I leave behind for this industry?"\n' +
        'I often wonder if I can take what I\'ve learned over these past 25 years and reignite that spark, that raw impulse of "I want to make games!" within the new generation who are interested in development. But how?\n' +
        '"Well, why not make a playable game-book?" Since childhood, I\'ve always been someone who hated reading "books with too many words" (except for manga, of course!). Instead of sitting there reading walls of text, I\'d rather experience it firsthand. If it sparks an interest, I can always go back and dive deeper later. And just like that—"ARC\'s Concept Play-Chamber" was born!\n' +
        'As I often say: most game developers will likely never become the next Shigeru Miyamoto. Nor will we necessarily become world-renowned masters like Hideo Kojima, who mythically rises from the ashes time and time again. Should we lose heart and give up because of that? I think not.\n' +
        'Because every single developer once possessed that innocent, childlike heart that deeply loved games. We once clutched gaming magazines, eagerly awaiting the arrival of the next new title. We once ran into arcades, dropped coins into the slots, and shouted at the top of our lungs with friends over a match of Street Fighter, living and dying by the win or loss. We once stayed excited for an entire day over just one game.\n' +
        'Those years and moments might have flashed by like a fleeting shooting star. But even now, I still believe—we play games because they are fun, and don\'t we make games for the exact same reason?\n' +
        'Even if we might never be the ones standing under the spotlight, at the very least, we can leave behind the works we once poured our hearts into, the works we once truly loved. This is precisely why I wanted to create "ARC\'s Concept Play-Chamber."\n' +
        '"ARC\'s Concept Play-Chamber"—a playable game-book, a story belonging to game developers, and the footprints left behind by a group of people who simply love games. I hope you all enjoy it. Thank you so much!',
      'nav.back': 'Back',
      'nav.keys': '← → Switch tab　Esc / B: Back',
      'nav.keys.lang': '← → Tab　↑ ↓ Select　Enter: OK　Esc / B: Back',
      'nav.keys.history': '← → Tab　↑ ↓ / Wheel: scroll (at the end = next page)　Esc / B: Back',
      'nav.tap': 'Tap a tab to switch',
      'nav.tap.history': 'Tap a page · swipe up / down to read',
      'about.fb': 'Facebook Fan Page', 'about.fb.blocked': 'The new window was blocked. Please open the page manually',
      'toast.lang': 'Language: English',
      'go.sub': 'The mice invaded... meow', 'go.record': '★ NEW RECORD! ★', 'go.rank': 'Rank #{n}! You made the board',
      'go.board': '— RANKING —', 'go.again': 'Play again', 'go.menu': 'Main menu',
      'sign.title': 'Sign your name (A–Z, 0–9)', 'sign.del': 'DEL',
      'sign.hint.kb': 'Type A–Z, 0–9   Backspace: delete   Up/Down: letter   Left/Right: slot   Enter: submit',
      'sign.hint.pad': 'Up/Down: letter   Left/Right: slot   A: confirm slot   B: back   Start: submit',
      'sign.hint.touch': 'Tap the keys below   Tap a box to select   ⌫ delete   OK submit',
      'ranking.sync.loading': 'Syncing…', 'ranking.sync.ok': 'Global ranking', 'ranking.sync.offline': 'Offline – showing local records',
      'pause.title': 'PAUSE', 'pause.resume': 'Resume', 'pause.menu': 'Main menu',
      'pause.hint': 'Esc / P / Start: resume', 'pause.hint.touch': 'Tap an option',
      'banner.bosswarn': 'BOSS  Gangster Rat incoming', 'banner.bonus': 'Clear bonus +{n}', 'banner.bossdown': 'Boss defeated +{n}',
      'boss.name': 'Gangster Rat', 'boss.bubble1': '……', 'boss.bubble2': 'Sigh… clocking out.',
      // BOSS death lines (English)
      'boss.l.g01': 'Sigh… clocking out.', 'boss.l.g02': 'My performance review… I\'m done for.', 'boss.l.g03': 'I\'m just a part-timer here!', 'boss.l.g04': 'Should\'ve taken a sick day.',
      'boss.l.g05': 'Now I have to write a report…', 'boss.l.g06': 'The cheese… I hadn\'t finished…', 'boss.l.g07': 'I just want to go home and lie down.', 'boss.l.g08': 'My year-end bonus…',
      'boss.l.g09': 'The boss said no overtime…', 'boss.l.g10': 'Can someone clock out for me?', 'boss.l.g11': 'Off to collect my severance.', 'boss.l.g12': 'Paid peanuts, and I risked my life.',
      'boss.l.g13': 'Does this count as a work injury?', 'boss.l.g14': 'Next life, I\'m being a cat.', 'boss.l.g15': 'Someone sign my death certificate…', 'boss.l.g16': 'Could you pack the cheese to go?',
      'boss.l.g17': 'My savings… all cheese now.', 'boss.l.g18': 'I quit. I\'m going back home.', 'boss.l.g19': 'That bug… wasn\'t mine…', 'boss.l.g20': 'Tell Mom… I\'m fine.',
      'boss.l.g21': 'That last hit… any overtime pay?', 'boss.l.g22': 'I want to quit, but the mortgage…', 'boss.l.g23': 'Okay. I\'m lying flat now.', 'boss.l.g24': 'I just wanted a day off.',
      'boss.l.g25': 'How do I put THIS on my résumé?', 'boss.l.g26': 'Don\'t touch me. I\'m leaving on time.',
      'boss.l.day1': 'Beaten in broad daylight… so embarrassing.', 'boss.l.day2': 'It\'s so sunny. I wanted a nap…', 'boss.l.day3': 'High noon. Perfect time to clock out.',
      'boss.l.dusk1': 'It\'s dusk and I haven\'t had dinner…', 'boss.l.dusk2': 'Such a pretty sunset, and I\'m…', 'boss.l.dusk3': 'Right before closing time? Really?',
      'boss.l.night1': 'Overtime at midnight…', 'boss.l.night2': 'It\'s way past my bedtime.', 'boss.l.night3': 'Night-shift pay… anyone?',
      'boss.l.lv1a': 'First day on the job and this happens…', 'boss.l.lv1b': 'I\'m just an intern!', 'boss.l.lv1c': 'Probation… I probably failed.',
      'boss.l.lv2a': 'Me again? Didn\'t this just happen?', 'boss.l.lv2b': 'Second time… I want a transfer.', 'boss.l.lv2c': 'I thought I already resigned…',
      'boss.l.lv3a': 'Boss #{n}… I\'m used to it.', 'boss.l.lv3b': 'That\'s #{n}. The union will hear about this.', 'boss.l.lv3c': 'Generation {n}, still getting bullied.', 'boss.l.lv3d': 'The boss will just send another one…',
      'boss.l.flaw1': 'You haven\'t lost a single life?!', 'boss.l.flaw2': 'No deaths? Are you hacking?', 'boss.l.flaw3': 'You\'re good. Wanna join our company?',
      'boss.l.many1': 'You died a few times too… rough day.', 'boss.l.many2': 'We both took a beating… let\'s go home.', 'boss.l.many3': 'You died that much and still won…',
      'boss.l.fast1': 'Already?! I was still warming up.', 'boss.l.fast2': 'It just started, and where\'s my tea break?',
      'boss.l.slow1': 'This took forever. You paying overtime?', 'boss.l.slow2': 'This meeting ran way too long…',
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
