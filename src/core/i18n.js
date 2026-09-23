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
      'menu.start': '開始遊戲', 'menu.ranking': '排行榜', 'menu.howto': '操作說明', 'menu.settings': '設定', 'menu.history': '了解歷史', 'menu.testboss': '測試 BOSS',
      'test.title': '測試 BOSS', 'test.hint': '選擇要挑戰的 BOSS，會直接開始戰鬥（略過一般波）',
      'test.keys': '↑ ↓ 選擇　Enter 確認　Esc / B 返回', 'test.tap': '點選 BOSS 開始',
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
      'tab.volume': '音量', 'vol.music': '音樂', 'vol.sfx': '音效', 'vol.hint': '↑ ↓ 選擇音樂 / 音效　Enter 調整（0～5，5 之後回到 0）',
      'credit.planning': '企劃', 'credit.programming': '程式', 'credit.art': '美術', 'credit.music': '音樂', 'credit.thanks': '特別感謝',
      'about.0': '關於射擊遊戲', 'about.1': '概念結構', 'about.2': '關於Arc遊戲庫', 'about.soon': '（內容準備中）',
      // 要補「關於」三個分頁的內文：在這裡加上 'about.body.0'（關於射擊遊戲）、'about.body.1'（概念結構）、'about.body.2'（關於Arc遊戲庫），
      // 用 \n 換行；日文 / 英文在各自的字典加同名 key（沒有時會顯示中文）。沒有內文的分頁顯示「準備中」。
      // 「關於射擊遊戲」內文（作者提供，縱向射擊遊戲的歷史）。樣式標記同下方「概念結構」
      'about.body.0':
        '縱向射擊遊戲（Vertical Scrolling Shooter，常簡稱為縱捲軸射擊或簡稱 STG）是電子遊戲史上最古老且最輝煌的類型之一。這種類型通常採用由上而下（Top-Down）的鳥瞰視角，玩家操縱位於畫面下方的戰機，迎擊從上方如潮水般湧現的敵軍。從早期一兩個像素組成的子彈，到後來滿螢幕華麗的彈幕，縱向射擊遊戲經歷了數個技術與玩法上的關鍵變革階段：\n' +
        '# 1. 奠基期（1970年代末）：固定畫面與移動的先驅\n' +
        '在「捲軸（Scrolling）」技術尚未成熟前，早期的射擊遊戲多為固定畫面（Single-screen）。\n' +
        '• 《太空侵略者》（Space Invaders, 1978）： 雖然不是捲軸遊戲，但它確立了「橫向移動、向上射擊」的黃金公式，為縱向射擊遊戲打下了核心玩法的地基。\n' +
        '• 《小蜜蜂》（Galaxian, 1979）： 首度引進彩色畫面與敵機弧形軌道俯衝攻擊，使畫面生動許多。\n' +
        '# 2. 捲軸革命與黃金期（1980年代）：真正的「縱向捲軸」誕生\n' +
        '1980年代初期，背景能不斷向後滾動的捲軸技術被發明，這讓玩家產生了「戰機正向前翱翔」的空間延伸感。\n' +
        '• 《鐵板陣》（Xevious, 1983）： 由 南夢宮 (Namco) 推出，這款作品被公認為縱向捲軸射擊遊戲的始祖與里程碑。它開創性地將武器分為對空的雷射與對地的炸彈（需要對準地面準星），並首次加入完整的世界觀與隱藏要素，奠定了傳統 STG 的標準架構。\n' +
        '• 《1942》（1984）： 卡普空 (Capcom) 以二戰為背景的名作，引入了「迴旋（Loop）」的緊急閃避機制，並開創了二戰軍事風 STG 的熱潮。\n' +
        '• 《大旋風》、《究極虎》（Twin Cobra, 1987）： 由東亞企劃（Toaplan）開發，確立了「強化火力（P子彈）＋全螢幕保命炸彈（Bomb）」的 STG 經典公式。\n' +
        '• 《兵蜂》（TwinBee, 1985）： 科樂美 (Konami) 推出的作品，打破了當時一味的科幻與軍事嚴肅風格，以粉嫩可愛的色調與「射擊鈴鐺改變顏色以獲得不同特殊能力」的逗趣系統著稱。\n' +
        '# 3. 高峰與極致（1990年代）：音速戰機與「彈幕」的誕生\n' +
        '進入90年代後，雖然大型電玩（街機）市場逐漸被 2D 格鬥遊戲（如《快打旋風》）佔據，但縱向射擊遊戲在技術與美術上達到了頂峰，並分化出極限流派。\n' +
        '• 《四國戰機 / 音速戰機》（Sonic Wings, 1992）： 引進多國戰機與各具特色的駕駛員（包括一隻貓），節奏明快，成為街機房的常客。\n' +
        '• 《雷電》（Raiden, 1990）： 由 Seibu Kaihatsu 開發，以極具重量感的戰機設計、流暢的擦彈與極高難度聞名，成為縱向射擊代名詞之一。\n' +
        '• 《閃電風暴》（RayForce, 1994）： TAITO 製作的經典作品，主打雙層視角概念，戰機可以鎖定「位於下方背景層」的敵人發射追蹤雷射，美術與音樂表現皆達神級水準。\n' +
        '• 彈幕射擊遊戲（Bullet Hell / Danmaku）的興起：\n' +
        '◦ 1995年，由東亞企劃班底重組的 CAVE 公司 推出了《首領蜂》（DonPachi），隨後在 1997年 推出 《怒首領蜂》。\n' +
        '◦ 這正式宣告了「彈幕（Bullet Hell）」時代的來臨。這類遊戲將敵機子彈壓縮得極密、極多、極其華麗，但將玩家戰機的被判定受擊點（Hitbox）縮小到只有一兩個像素，玩法從早期的「背敵機位置」轉變為極度考驗動態視力與微操的「在彈幕縫隙中求生」。\n' +
        '# 4. 小眾與精神延續（2000年代至今）：東方 Project 與獨立遊戲\n' +
        '隨著 3D 遊戲全面普及，2D 縱向射擊遊戲在商業主流市場逐漸式微，轉變為核心玩家群體的硬派狂歡，並在同人與獨立遊戲界開出奇花。\n' +
        '• 《斑鳩》（Ikaruga, 2001）： 由 Treasure 開發，引入了震驚業界的「黑與白」同色免疫、異色雙倍傷害屬性轉換系統，將射擊遊戲提升到了如同解謎一般的策略高度。\n' +
        '• 《東方 Project》系列（1996年至今）： 由神主 ZUN 一人核心開發的同人彈幕遊戲系列（如《東方紅魔鄉》、《東方妖妖夢》）。它憑藉著優秀的彈幕設計、世界觀和無數迷人的美少女角色，引爆了龐大的二創熱潮，成功讓彈幕射擊文化在網路世代得以發揚光大。\n' +
        '• 現代移動端與獨立遊戲： 近年來，許多縱向射擊遊戲轉戰智慧型手機（如《傲氣雄鷹 Sky Force》系列、各式微課金雷霆戰機類手遊），利用單指滑動便能輕鬆遊玩；或是像《J数を再定義する》之類的獨立作品，繼續傳承著傳統 STG 的硬派精神。\n' +
        '# 總結\n' +
        '縱向射擊遊戲的歷史是一段「從大眾娛樂走向極致硬派」的演變史。它雖然不再身處遊戲產業的舞台中央，但它留下的捲軸技術、判定概念與極限流暢的硬體優化經驗，早已深深烙印在現代電子遊戲的基因之中。',
      // 「概念結構」內文（作者提供）。開頭的 # • ◦ > 是樣式標記（標題 / 項目 / 次項目 / 次項目接續），說明見 menu-scene.js 的 aboutLayout
      'about.body.1':
        '縱向飛機射擊遊戲（Vertical Scrolling Shooter，簡稱 STG），核心開發流程可以拆解為以下幾個關鍵模組：\n' +
        '# 1. 遊戲視角與場景初始化\n' +
        '• 相機設定： 將相機調整為正交投影（Orthographic），視角由上往下看（Top-down）。\n' +
        '• 背景滾動（捲軸）： 縱向射擊遊戲的「前進感」通常是透過背景移動來營造的。\n' +
        '◦ 實作方法： 讓一張無限循環的星空或地面貼圖，透過程式碼不斷改變其 UV 偏移量（Offset），或者讓兩張背景圖交替拼接、往下移動並循環重置坐標。\n' +
        '# 2. 玩家戰機控制 (Player)\n' +
        '• 移動邏輯： 監聽鍵盤（WASD / 方向鍵）、滑鼠或手機觸控。\n' +
        '◦ 關鍵細節： 必須使用 Mathf.Clamp 限制戰機的坐標，防止玩家飛出螢幕邊界。\n' +
        '• 自動射擊 / 手動射擊：\n' +
        '◦ 設定一個射擊間隔時間（CD）。當玩家按下按鍵或畫面按壓時，透過 Instantiate（生成）子彈物件，並給予子彈一個向上的速度。\n' +
        '# 3. 子彈與彈幕系統 (Bullets & Danmaku)\n' +
        '• 子彈移動： 子彈生成後，朝特定方向直行或沿著特定軌跡（如追蹤、散射）移動。\n' +
        '• 物件池（Object Pooling）技術： 這是射擊遊戲最重要的優化！ 畫面上會同時出現成百上千顆子彈，如果頻繁地建立（Create）與銷毀（Destroy）物件，會導致遊戲嚴重卡頓（GC 凍結）。\n' +
        '◦ 實作方法： 事先建立一個子彈池，子彈射出時「啟用（Active）」，飛出螢幕或打中敵人時「隱藏（Deactive）」，重複循環使用。\n' +
        '• 邊界回收： 在螢幕上方與下方設定一個隱形的邊界觸發器（Boundary Trigger），任何子彈或敵人越過此邊界，立刻回收或銷毀，避免消耗效能。\n' +
        '# 4. 敵人與生成器 (Enemies & Spawner)\n' +
        '• 敵人行為： 建立不同類型的敵人路徑（如：直直往下飛、S型走位、在空中停留一陣子後離去）。\n' +
        '• 生成控制器（Spawn Manager）：\n' +
        '◦ 定時生成： 使用協程（Coroutine）或計時器，每隔幾秒在螢幕上方隨機坐標生成敵人。\n' +
        '◦ 關卡劇本： 進階做法是寫一個 XML/JSON 配置表或時間軸，規定在遊戲開始第 10 秒出現小兵 A、第 30 秒出現精英怪 B、第 60 秒出現 Boss。\n' +
        '# 5. 碰撞檢測與生命值 (Collision & HP)\n' +
        '• 碰撞分組（Layer Matrix）： 明確區分碰撞層，避免「敵人的子彈打到敵人」或「玩家的子彈打到自己」。\n' +
        '◦ 玩家子彈 只能與 敵人/敵人子彈 發生碰撞。\n' +
        '◦ 敵人子彈 只能與 玩家 發生碰撞。\n' +
        '• 受傷觸發： 當觸發碰撞（Trigger Enter）時：\n' +
        '> 1. 扣除目標的 HP。\n' +
        '> 2. 生成爆炸特效（VFX）與音效（SFX）。\n' +
        '> 3. 如果 HP <= 0，觸發毀滅邏輯（玩家扣命或遊戲結束、敵人給予積分）。\n' +
        '# 6. 遊戲主循環與 UI 系統 (Game Loop & UI)\n' +
        '• 分數與核心數據： 建立一個 GameManager 來記錄當前分數、玩家剩餘生命（Lives）。\n' +
        '• UI 介面： 製作抬頭顯示器（HUD），展示血條、炸彈數量、當前得分。\n' +
        '• 狀態切換： 處理「主選單 → 遊戲中 → 暫停 → 玩家死亡 → Game Over / 重新開始」的邏輯切換。',
      // 「關於Arc遊戲庫」內文（作者提供）
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
      'nav.keys.vol': '← → 切換頁籤　↑ ↓ 選擇　Enter 調整　Esc / B 返回', 'nav.tap.vol': '點選格子調整音量',
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
      'banner.bosswarn': 'BOSS  {name} 來襲', 'banner.bonus': '通關獎勵 +{n}', 'banner.bossdown': '擊破 BOSS +{n}',
      'boss.name': '流氓大老鼠', 'boss.bubble1': '……', 'boss.bubble2': '唉，下班了',
      'boss2.name': '桐生爹鼠', 'boss2.bubble2': '哼…算你有種',
      'boss3.name': '狠蘭達鼠', 'boss3.bubble2': '哼…下一世再見',
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
      // 桐生爹鼠死亡台詞（硬派流氓大哥風格，中文不要用空白，斷行會依空白分字）
      'boss2.l.k01': '這拳頭…還是不夠燙嗎', 'boss2.l.k02': '算你有種，記住這股熱血', 'boss2.l.k03': '哼，這身西裝…弄髒了',
      'boss2.l.k04': '輸了就輸了，男子漢不狡辯', 'boss2.l.k05': '下次…換我請你吃拳頭', 'boss2.l.k06': '這條路，我走得無怨無悔',
      'boss2.l.k07': '極…也有失手的時候', 'boss2.l.k08': '別得意，這才第一回合', 'boss2.l.k09': '我桐生的名號，你記住了',
      'boss2.l.k10': '這一拳，算我欠你的', 'boss2.l.k11': '喵的…被一隻貓打敗', 'boss2.l.k12': '痛快，好久沒這麼痛快了',
      'boss2.l.klv1a': '哦？第一次見面就這麼囂張', 'boss2.l.klv1b': '新來的貓，膽子不小',
      'boss2.l.klv2a': '又是你…上次的帳還沒算完', 'boss2.l.klv2b': '第二次了，這次我認真了',
      'boss2.l.klv3a': '第{n}次了…你到底練了多久', 'boss2.l.klv3b': '第{n}回合，我桐生家的面子都被你打光了',
      'boss2.l.kflaw1': '一條命都沒丟？你不是普通貓', 'boss2.l.kflaw2': '這麼硬…改天來我這裡上班',
      'boss2.l.kmany1': '你也摔了好幾次…算扯平了', 'boss2.l.kmany2': '彼此彼此，都掛了彩',
      'boss2.l.kfast1': '這麼快就分出勝負…爽快', 'boss2.l.kslow1': '打這麼久，我這身西裝都濕透了',
      // 狠蘭達鼠死亡台詞：神祕、超脫生死的語氣，呼應名字的諧音「很難打死」
      'boss3.l.u01': '死亡…對我而言不過是換一副皮囊', 'boss3.l.u02': '你以為打倒了我？我從未真正存在過', 'boss3.l.u03': '這具鼠身，早已生死看淡',
      'boss3.l.u04': '很…難打死，你現在明白這名字的意思了', 'boss3.l.u05': '輪迴一圈，又是新的開始', 'boss3.l.u06': '法器落地，心不會落地',
      'boss3.l.u07': '你的子彈，打穿的只是幻象', 'boss3.l.u08': '這一世的軀殼碎了，下一世再會', 'boss3.l.u09': '阿修羅的怒，本就是無常的一部分',
      'boss3.l.u10': '我閉眼千次，睜眼仍是我', 'boss3.l.u11': '這場修行…算你替我完成了一半', 'boss3.l.u12': '很好，你讓我又更接近「不生不滅」一步',
      'boss3.l.ulv1a': '小貓，你踏入的是我的道場', 'boss3.l.ulv1b': '第一次見面，就見識我的四臂吧',
      'boss3.l.ulv2a': '又見面了，看來你也在修行「不放棄」', 'boss3.l.ulv2b': '第二回，我倒要看看你能撐幾招',
      'boss3.l.ulv3a': '第{n}次了…你這條命也真是難打死', 'boss3.l.ulv3b': '第{n}回合，我們倒是像了同一種「難纏」',
      'boss3.l.uflaw1': '一次都沒倒下？你的心倒是比我還静', 'boss3.l.uflaw2': '全身而退…看來你也悟出了一點道理',
      'boss3.l.umany1': '你也摔了好幾次…我們半斤八兩', 'boss3.l.umany2': '生生死死，你倒是很熟練了',
      'boss3.l.ufast1': '這麼快…看來我這身法袍還沒暖', 'boss3.l.uslow1': '這麼久的糾纏，倒也是一種緣分',
      'touch.hint1': '按住畫面：戰機在手指上方', 'touch.hint2': '子彈自動連射',
      'toast.sound.on': '音效：開', 'toast.sound.off': '音效：關'
    },

    ja: {
      'menu.start': 'ゲーム開始', 'menu.ranking': 'ランキング', 'menu.howto': '操作説明', 'menu.settings': '設定', 'menu.history': '歴史を知る', 'menu.testboss': 'ボステスト',
      'test.title': 'ボステスト', 'test.hint': '挑戦するボスを選ぶと、すぐに戦闘が始まります（通常波はスキップ）',
      'test.keys': '↑ ↓ 選択　Enter 決定　Esc / B 戻る', 'test.tap': 'ボスをタップして開始',
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
      'tab.volume': '音量', 'vol.music': '音楽', 'vol.sfx': '効果音', 'vol.hint': '↑ ↓ 音楽 / 効果音を選択　Enter で調整（0～5、5の次は0に戻る）',
      'credit.planning': '企画', 'credit.programming': 'プログラム', 'credit.art': 'アート', 'credit.music': '音楽', 'credit.thanks': 'スペシャルサンクス',
      'about.0': '射撃ゲームについて', 'about.1': 'コンセプト構成', 'about.2': 'Arcゲームライブラリ', 'about.soon': '（準備中）',
      // 「射撃ゲームについて」内文（日文）。スタイル記号は下の「コンセプト構成」と同じ
      'about.body.0':
        '縦スクロールシューティングゲーム（Vertical Scrolling Shooter、一般に縦シューやSTGと略される）は、ビデオゲームの歴史において最も古く、かつ最も輝かしいジャンルの一つです。このジャンルは通常、上から見下ろすトップダウン（俯瞰）視点を採用しており、プレイヤーは画面下部にある自機を操作し、上方から怒涛の如く押し寄せる敵軍を迎え撃ちます。初期の1〜2ピクセルで構成された弾から、のちに画面を埋め尽くす華麗な弾幕に至るまで、縦スクロールシューティングは技術とゲームプレイの両面でいくつかの重要な変革期を経てきました。\n' +
        '# 1. 黎明期（1970年代末）：固定画面と移動の先駆者\n' +
        '「スクロール」技術がまだ成熟していなかった初期のシューティングゲームは、その多くが固定画面（Single-screen）でした。\n' +
        '• 『スペースインベーダー』（Space Invaders, 1978）： スクロールゲームではありませんが、「左右に移動し、上に向かって撃つ」という黄金律を確立し、縦スクロールシューティングのコアなゲームプレイの基礎を築きました。\n' +
        '• 『ギャラクシアン』（Galaxian, 1979）： 初めてカラー画面を導入し、敵機が弧を描いてインベーダーのように一斉にではなく、個別にダイブ攻撃を仕掛けてくるなど、画面をより躍動的にしました。\n' +
        '# 2. スクロール革命と黄金期（1980年代）：真の「縦スクロール」誕生\n' +
        '1980年代初頭、背景が絶え間なく後方へと流れるスクロール技術が発明され、これによりプレイヤーに「自機が前方に突き進んでいる」という空間的な広がりを感じさせることができるようになりました。\n' +
        '• 『ゼビウス』（Xevious, 1983）： ナムコ（Namco）がリリースしたこの作品は、縦スクロールシューティングゲームの始祖であり、大いなるマイルストーンとして広く認められています。武器を対空レーザーと対地爆弾（地上照準を合わせる必要がある）に分けるという画期的なシステムを導入し、初めて本格的な世界観や隠し要素を盛り込み、伝統的なSTGの標準的な骨組みを確立しました。\n' +
        '• 『1942』（1984）： カプコン（Capcom）による第二次世界大戦を舞台にした名作。緊急回避メカニズムである「宙返り（Loop）」を導入し、第二次世界大戦風ミリタリーSTGのブームを巻き起こしました。\n' +
        '• 『究極タイガー』（Twin Cobra, 1987）： 東亜プラン（Toaplan）が開発し、「ショットパワーアップ（Pアイテム）＋画面全体攻撃の緊急回避ボンバー（Bomb）」という、STGのクラシックな公式を決定づけました。\n' +
        '• 『ツインビー』（TwinBee, 1985）： コナミ（Konami）がリリースした作品。当時のSFやミリタリーといったシリアスな路線を打ち破り、パステルカラーの可愛らしい色調と、「ベルを撃って色を変えることで異なる特殊能力を獲得する」というコミカルなシステムで人気を博しました。\n' +
        '# 3. ピークと極致（1990年代）：音速の戦いと「弾幕」の誕生\n' +
        '1990年代に入ると、アーケード（ゲームセンター）市場は次第に2D格闘ゲーム（『ストリートファイター』など）に占拠されていきましたが、縦スクロールシューティングは技術とグラフィックの面で頂点に達し、さらに極限の派生ジャンルを生み出しました。\n' +
        '• 『ソニックウィングス』（Sonic Wings, 1992）： 多国籍の戦闘機と、それぞれ個性豊かなパイロット（猫を含む）を導入。テンポが良く、ゲームセンターの定番タイトルとなりました。\n' +
        '• 『雷電』（Raiden, 1990）： セイブ開発（Seibu Kaihatsu）が開発。非常に重量感のある機体デザイン、滑らかなドット絵、そして非常に高い難易度で知られ、縦スクロールシューティングの代名詞の一つとなりました。\n' +
        '• 『レイフォース』（RayForce, 1994）： タイトー（TAITO）が制作した傑作。2層の視点概念を主軸に据え、自機は「下層の背景レイヤーにいる」敵をロックオンして誘導レーザーを発射することができ、グラフィックと音楽の表現は神がかったクオリティに達していました。\n' +
        '• 弾幕シューティングゲーム（Bullet Hell / Danmaku）の台頭：\n' +
        '◦ 1995年、東亜プランの元スタッフが再集結して設立されたCAVE（ケイブ）が『首領蜂』（DonPachi）をリリース、続く1997年に『怒首領蜂』をリリースしました。\n' +
        '◦ これにより、正式に「弾幕」時代の到来が告げられました。このタイプのゲームは、敵の弾を極限まで高密度、大量、そして華麗に詰め込む一方、プレイヤー側の自機の当たり判定（Hitbox）をわずか1〜2ピクセルにまで縮小させました。ゲームプレイは、初期の「敵の出現位置を覚える」ものから、動体視力と繊細なレバー捌き（精密操作）が極限まで試される「弾幕の隙間を縫って生き残る」ものへと変貌を遂げました。\n' +
        '# 4. ニッチ化と精神の継承（2000年代〜現在）：東方Projectとインディーゲーム\n' +
        '3Dゲームが全面的に普及するにつれ、2D縦スクロールシューティングは商業的なメインストリーム市場からは次第に姿を消し、コアなプレイヤー層のためのハードコアな狂宴へと変化していきました。しかし、同人やインディーゲームの領域で独自の進化を遂げることになります。\n' +
        '• 『斑鳩』（Ikaruga, 2001）： トレジャー（Treasure）が開発。業界に衝撃を与えた「白と黒」の属性変更システム（同色の弾は吸収・無効化し、異色の敵には2倍のダメージを与える）を導入し、シューティングゲームをまるでパズルを解くかのような戦略的な高さへと引き上げました。\n' +
        '• 『東方Project』シリーズ（1996年〜現在）： 主宰のZUN氏がほぼ一人で開発している同人弾幕ゲームシリーズ（『東方紅魔郷』『東方妖々夢』など）。優れた弾幕デザイン、魅力的な世界観、そして数多くの魅力的な美少女キャラクターによって爆発的な二次創作ブームを巻き起こし、弾幕シューティング文化をインターネット世代に広く浸透させることに成功しました。\n' +
        '• 現代のモバイル展開とインディーゲーム： 近年、多くの縦スクロールシューティングゲームがスマートフォンへと舞台を移し（『Sky Force』シリーズや、各種課金型のシューティングアプリなど）、指一本のフリックで手軽に遊べるようになっています。あるいは、伝統的なSTGの硬派な精神を受け継ぐような、様々なインディー作品が開発され続けています。\n' +
        '# まとめ\n' +
        '縦スクロールシューティングゲームの歴史は、「大衆娯楽から極限のハードコアへ」と至る変遷の歴史です。もはやゲーム産業のステージ中央に身を置くことはなくなりましたが、このジャンルが遺したスクロール技術、当たり判定の概念、そして極限までスムーズなハードウェアの最適化ノウハウは、現代のビデオゲームの遺伝子の中に今も深く刻み込まれています。',
      // 「コンセプト構成」内文（日文）。行頭の # • ◦ > はスタイル記号（見出し / 項目 / 副項目 / 副項目の続き）
      'about.body.1':
        '縦スクロールシューティングゲーム（Vertical Scrolling Shooter、略称：STG）のコア開発フローは、主に以下のキーモジュールに分解することができます。\n' +
        '# 1. ゲーム視点とシーンの初期化 (Camera & Background)\n' +
        '• カメラ設定： カメラの投影モードを正投影（Orthographic）に設定し、視点を上から下へ見下ろすトップダウン（Top-down）にします。\n' +
        '• 背景のスクロール（スクロール）： 縦スクロールシューティングにおける「前進感」は、通常、背景を移動させることで表現します。\n' +
        '◦ 実装方法： 無限ループする星空や地面のテクスチャを用意し、コードからUVオフセット（Offset）を常に変化させるか、2枚の背景画像を交互につなぎ合わせ、下方向へ移動させて座標をループリセットします。\n' +
        '# 2. プレイヤー機体の制御 (Player)\n' +
        '• 移動ロジック： キーボード（WASD / 方向キー）、マウス、またはスマホのタッチ操作を監視（リスン）します。\n' +
        '◦ 重要なディテール： 機体が画面外に飛び出さないよう、Mathf.Clamp などを使って機体の座標を制限する必要があります。\n' +
        '• オート射撃 / マニュアル射撃：\n' +
        '◦ 射撃のインターバル時間（クールダウン：CD）を設定します。プレイヤーがボタンを押す、または画面をタップしている間、Instantiate（生成）によって弾オブジェクトを生成し、弾に上方向の速度を与えます。\n' +
        '# 3. 弾と弾幕システム (Bullets & Danmaku)\n' +
        '• 弾の移動： 弾は生成された後、特定の方向へ直進するか、特定の軌道（追跡、拡散など）に沿って移動します。\n' +
        '• オブジェクトプール（Object Pooling）技術： これはシューティングゲームにおいて最も重要な最適化です！ 画面上には同時に何百、何千もの弾が表示されます。オブジェクトの生成（Create）と破棄（Destroy）を頻繁に繰り返すと、深刻なラグ（GCフリーズ）の原因になります。\n' +
        '◦ 実装方法： あらかじめ弾のプールを作成しておき、弾を発射するときに「有効化（Active）」し、画面外に出るか敵に当たったときに「非有効化（Deactive）」して、繰り返し再利用します。\n' +
        '• 境界での回収： 画面の上下に透明な境界トリガー（Boundary Trigger）を設定し、弾や敵がこの境界を越えたらすぐに回収または破棄することで、パフォーマンスの浪費を防ぎます。\n' +
        '# 4. 敵とスポナー (Enemies & Spawner)\n' +
        '• 敵の挙動： さまざまなタイプの敵の移動ルートを作成します（例：まっすぐ下降する、S字に動く、空中でしばらく停止してから去るなど）。\n' +
        '• 生成コントローラー（Spawn Manager）：\n' +
        '◦ 定期生成： コルーチン（Coroutine）やタイマーを使用し、数秒ごとに画面上部のランダムな座標に敵を生成します。\n' +
        '◦ ステージスクリプト（タイムライン）： 応用的なアプローチとして、XML/JSONの構成表やタイムラインを作成し、「ゲーム開始10秒後にザコ敵Aが登場」「30秒後にエリート敵Bが登場」「60秒後にボスが登場」といったルールを設定します。\n' +
        '# 5. 当たり判定と体力 (Collision & HP)\n' +
        '• 衝突レイヤー設定（Layer Matrix）： 「敵の弾が敵に当たる」「プレイヤーの弾が自分に当たる」といった誤判定を防ぐため、衝突レイヤーを明確に区別します。\n' +
        '◦ プレイヤーの弾は、敵 / 敵の弾 とのみ衝突する。\n' +
        '◦ 敵の弾は、プレイヤー とのみ衝突する。\n' +
        '• 被弾トリガー： 衝突（Trigger Enter）を検知した際、以下の処理を行います。\n' +
        '> 1. 対象のHPを減算する。\n' +
        '> 2. 爆発エフェクト（VFX）と効果音（SFX）を生成する。\n' +
        '> 3. HPが0以下になった場合、撃破ロジック（プレイヤーなら残機減少またはゲームオーバー、敵ならスコア加算）を実行する。\n' +
        '# 6. ゲームのメインループとUIシステム (Game Loop & UI)\n' +
        '• スコアとコアデータ： GameManager を作成し、現在のスコアやプレイヤーの残機（Lives）を管理・記録します。\n' +
        '• UI表示： HUD（ヘッドアップディスプレイ）を作成し、HPバー、ボムの残り数、現在のスコアなどを表示します。\n' +
        '• 状態の遷移（ステート管理）： 「メインメニュー → ゲーム中 → 一時停止 → プレイヤー死亡 → ゲームオーバー / リトライ」というロジックの切り替えを処理します。',
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
      'nav.keys.vol': '← → タブ切替　↑ ↓ 選択　Enter 調整　Esc / B 戻る', 'nav.tap.vol': 'マスをタップして調整',
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
      'banner.bosswarn': 'BOSS  {name} 襲来', 'banner.bonus': 'クリアボーナス +{n}', 'banner.bossdown': 'ボス撃破 +{n}',
      'boss.name': 'ギャング大ネズミ', 'boss.bubble1': '……', 'boss.bubble2': 'はぁ…定時であがります',
      'boss2.name': 'キリュウ親父ネズミ', 'boss2.bubble2': 'ふん…やるじゃねえか',
      'boss3.name': '不滅羅刹鼠', 'boss3.bubble2': 'ふん…来世でまた会おう',
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
      // 桐生爹鼠死亡台詞（日文、ヤクザの親分風）
      'boss2.l.k01': 'この拳が…まだ足りないってか', 'boss2.l.k02': 'なかなかやるな、その熱さ覚えとけ', 'boss2.l.k03': 'ふん、スーツが汚れちまった',
      'boss2.l.k04': '負けは負けだ、男は言い訳しない', 'boss2.l.k05': '次は…お前に拳をご馳走してやる', 'boss2.l.k06': 'この道を、俺は悔いなく歩いてきた',
      'boss2.l.k07': '「極」にも…しくじる時はある', 'boss2.l.k08': '調子に乗るな、まだ一回戦だ', 'boss2.l.k09': '俺の名前、しっかり覚えとけ',
      'boss2.l.k10': 'この一発は…貸しにしといてやる', 'boss2.l.k11': 'くそ…猫にやられるとはな', 'boss2.l.k12': '爽快だ…こんなに痛快なのは久しぶりだ',
      'boss2.l.klv1a': 'ほう？初対面からずいぶん威勢がいいな', 'boss2.l.klv1b': '新入りの猫にしちゃ、いい度胸だ',
      'boss2.l.klv2a': 'またお前か…この前の借りがまだだぞ', 'boss2.l.klv2b': '二度目か、今度は本気でいくぞ',
      'boss2.l.klv3a': '{n}回目か…どれだけ鍛えてきたんだ', 'boss2.l.klv3b': '{n}回戦目、桐生の名に泥を塗られたな',
      'boss2.l.kflaw1': '一度もやられなかったのか？ただの猫じゃないな', 'boss2.l.kflaw2': 'そんなに強いなら…うちで働かないか',
      'boss2.l.kmany1': 'お前も何度も倒れてたな…お互い様だ', 'boss2.l.kmany2': '傷だらけ同士、これで手打ちだ',
      'boss2.l.kfast1': 'こんなに早く決着とはな…爽快だぜ', 'boss2.l.kslow1': '長い戦いだったな…スーツが汗でびしょ濡れだ',
      'boss3.l.u01': '死とは…この身にとってただの衣替えに過ぎぬ', 'boss3.l.u02': '我を倒したと思うか？我は元より実在せぬ', 'boss3.l.u03': 'この鼠の身、とうに生死を超えている',
      'boss3.l.u04': '不滅…その名の意味、今わかったか', 'boss3.l.u05': '輪廻はまた一巡り、そして新たな始まり', 'boss3.l.u06': '法具は落ちても、心は落ちぬ',
      'boss3.l.u07': 'お前の弾が貫くのは幻影に過ぎぬ', 'boss3.l.u08': 'この世の殻が砕けても、また来世で会おう', 'boss3.l.u09': '阿修羅の怒りとは、無常の一部に過ぎぬ',
      'boss3.l.u10': '千度目を閉じても、開けば我はまだ我だ', 'boss3.l.u11': 'この修行…半分はお前が完成させたな', 'boss3.l.u12': 'よかろう、お前のおかげで「不生不滅」にまた一歩近づいた',
      'boss3.l.ulv1a': '小さき猫よ、ここは我が道場だ', 'boss3.l.ulv1b': '初対面から、我が四本の腕を見せてやろう',
      'boss3.l.ulv2a': 'また会ったな、お前も「諦めぬ道」を修めているようだ', 'boss3.l.ulv2b': '二度目か、何手まで凌げるか見せてもらおう',
      'boss3.l.ulv3a': '{n}度目か…お前の命もなかなか死なぬな', 'boss3.l.ulv3b': '第{n}戦、我らはどうやら同じ「しぶとさ」らしい',
      'boss3.l.uflaw1': '一度も倒れなかったか？お前の心は我より静かだ', 'boss3.l.uflaw2': '無傷で退くとは…お前も少し悟りを開いたようだな',
      'boss3.l.umany1': 'お前も何度も倒れたな…似たもの同士だ', 'boss3.l.umany2': '生と死を繰り返すのが、ずいぶん板についてきたな',
      'boss3.l.ufast1': 'こんなに早いとは…この法衣もまだ温まっておらぬのに', 'boss3.l.uslow1': 'これほど長い因縁とは、これもまた縁というものか',
      'touch.hint1': '画面を押す：機体は指の上', 'touch.hint2': '弾は自動連射',
      'toast.sound.on': 'サウンド：ON', 'toast.sound.off': 'サウンド：OFF'
    },

    en: {
      'menu.start': 'START GAME', 'menu.ranking': 'RANKING', 'menu.howto': 'HOW TO PLAY', 'menu.settings': 'SETTINGS', 'menu.history': 'Learn History', 'menu.testboss': 'Boss Test',
      'test.title': 'Boss Test', 'test.hint': 'Pick a boss to fight immediately (skips the regular waves)',
      'test.keys': 'Up/Down select   Enter confirm   Esc/B back', 'test.tap': 'Tap a boss to start',
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
      'tab.volume': 'Volume', 'vol.music': 'Music', 'vol.sfx': 'SFX', 'vol.hint': 'Up/Down select Music / SFX   Enter to adjust (0-5, wraps back to 0)',
      'credit.planning': 'Planning', 'credit.programming': 'Programming', 'credit.art': 'Art', 'credit.music': 'Music', 'credit.thanks': 'Special Thanks',
      'about.0': 'About Shooting Games', 'about.1': 'Concept Structure', 'about.2': 'About Arc Games', 'about.soon': '(Coming soon)',
      // "About Shooting Games" body text (English). Same style markers as "Concept Structure" below. Plain apostrophes only (see the note further down)
      'about.body.0':
        'Vertical Scrolling Shooters (often shortened to vertical shmups or simply STGs) are one of the oldest and most glorious genres in video game history. Typically featuring a top-down, bird\'s-eye perspective, players control a ship at the bottom of the screen to fend off waves of enemies flooding in from above. From the early days of bullets made of just one or two pixels to the screen-filling, dazzling bullet hells of later years, the vertical shooter has undergone several pivotal eras of evolution in both technology and gameplay:\n' +
        '# 1. The Foundation Era (Late 1970s): Single-Screen and Movement Pioneers\n' +
        'Before scrolling technology matured, early shooting games were mostly confined to a single, fixed screen.\n' +
        '• Space Invaders (1978): While not a scrolling game, it established the golden formula of "horizontal movement and upward shooting," laying the core gameplay foundation for all future vertical shooters.\n' +
        '• Galaxian (1979): This title introduced color graphics and enemies that dove at the player in sweeping, curved paths, bringing a newfound dynamism to the screen.\n' +
        '# 2. The Scrolling Revolution & Golden Age (1980s): The Birth of the True "Vertical Scroll"\n' +
        'In the early 1980s, the invention of scrolling technology—where the background constantly rolled downward—gave players a powerful sense of spatial expansion, making them feel as if their ship was genuinely soaring forward.\n' +
        '• Xevious (1983): Released by Namco, this masterpiece is widely recognized as the pioneer and milestone of vertical scrolling shooters. It innovatively split weapons into anti-air lasers and air-to-ground bombs (which required aligning a ground reticle). It was also the first to feature a fully realized world-building lore and hidden secrets, setting the definitive framework for traditional STGs.\n' +
        '• 1942 (1984): Capcom\'s World War II-themed classic introduced the "loop" emergency evasion mechanic and ignited a massive wave of military-styled WW2 shooters.\n' +
        '• Twin Cobra (1987): Developed by Toaplan, this game solidified the classic STG formula: "weapon power-ups (P items) + screen-clearing panic bombs."\n' +
        '• TwinBee (1985): Released by Konami, this game broke away from the serious sci-fi and military themes of the era. It became famous for its pastel, cute aesthetic and a playful system where players shot floating bells to change their colors and gain different special abilities.\n' +
        '# 3. The Peak & The Extreme (1990s): High-Speed Fighting and the Birth of "Bullet Hell"\n' +
        'As the 1990s rolled in, the arcade market was gradually taken over by 2D fighting games like Street Fighter. However, vertical shooters reached their technical and artistic zenith during this time, branching out into extreme subgenres.\n' +
        '• Sonic Wings / Aero Fighters (1992): This game introduced aircraft from multiple nations alongside a quirky cast of pilots (including a cat). Its brisk pace made it an absolute staple in arcades.\n' +
        '• Raiden (1990): Developed by Seibu Kaihatsu, it became synonymous with vertical shooters thanks to its heavy, mechanical ship designs, smooth sprite animation, and notoriously punishing difficulty.\n' +
        '• RayForce (1994): A classic produced by Taito, it centered on a dual-layer perspective concept. Players could lock onto enemies located on the lower background layer and fire homing lasers. Its art direction and musical score achieved legendary, god-tier status.\n' +
        '• The Rise of Bullet Hell (Danmaku) Games:\n' +
        '◦ In 1995, CAVE—a company formed by former Toaplan staff—released DonPachi, followed by DoDonpachi in 1997.\n' +
        '◦ This officially heralded the arrival of the "Bullet Hell" era. These games compressed enemy fire into incredibly dense, massive, and stunningly intricate patterns. To compensate, they shrank the player ship\'s hitbox down to just one or two pixels. Gameplay shifted from the early days of memorizing enemy spawns to an extreme test of dynamic vision and pixel-perfect micro-dodging to survive in the gaps between bullets.\n' +
        '# 4. Niche Appeal & Spiritual Succession (2000s–Present): Touhou Project and Indie Games\n' +
        'With the mainstream adoption of 3D gaming, 2D vertical shooters gradually receded from commercial mass markets, transforming into a hardcore celebration for dedicated enthusiasts and blooming beautifully in the doujin and indie scenes.\n' +
        '• Ikaruga (2001): Developed by Treasure, it shocked the industry with its "Black and White" polarity-shifting system. Absorbing bullets of the same color while dealing double damage to opposite-colored enemies elevated the shooter genre to a strategic, puzzle-like depth.\n' +
        '• Touhou Project Series (1996–Present): A doujin bullet hell series developed almost entirely by a single creator, ZUN (e.g., The Embodiment of Scarlet Devil, Perfect Cherry Blossom). Driven by excellent bullet patterns, deep lore, and a cast of charming anime heroines, it sparked a massive wave of fan-made derivative content, successfully preserving and popularizing bullet hell culture for the internet generation.\n' +
        '• Modern Mobile & Indie Games: In recent years, many vertical shooters have migrated to smartphones (such as the Sky Force series and various free-to-play, microtransaction-based mobile shmups), allowing casual play with single-finger swiping. Meanwhile, distinct indie titles continue to pass down the unyielding, hardcore spirit of traditional STGs.\n' +
        '# Conclusion\n' +
        'The history of vertical scrolling shooters is an evolution of "moving from mass entertainment to the absolute extreme of hardcore gaming." Though it no longer stands at the center stage of the gaming industry, its legacy—scrolling mechanics, the concept of precise hitboxes, and hyper-optimized hardware performance—has been deeply woven into the DNA of modern video games.',
      // "Concept Structure" body text (English). Leading # • ◦ > are style markers (heading / bullet / sub-bullet / sub-bullet continuation), see aboutLayout in menu-scene.js
      'about.body.1':
        'Vertical Scrolling Shooter (commonly abbreviated as STG), the core development workflow can be broken down into the following key modules:\n' +
        '# 1. Game View and Scene Initialization\n' +
        '• Camera Setup: Adjust the camera projection to Orthographic and set the view to Top-down (looking straight down from above).\n' +
        '• Background Scrolling: The sensation of "moving forward" in a vertical shooter is typically created by moving the background.\n' +
        '◦ Implementation: Use a seamlessly looping texture of a starry sky or terrain and constantly update its UV Offset via code. Alternatively, tile two background images together, move them downward, and reset their coordinates in a continuous cycle.\n' +
        '# 2. Player Control\n' +
        '• Movement Logic: Listen for inputs from the keyboard (WASD / Arrow Keys), mouse, or mobile touch controls.\n' +
        '◦ Critical Detail: You must use Mathf.Clamp to restrict the starfighter\'s coordinates, preventing the player from flying off the screen boundaries.\n' +
        '• Auto-fire / Manual Fire:\n' +
        '◦ Set a firing interval (Cooldown / CD). When the player presses the designated key or touches the screen, use Instantiate to spawn bullet objects and apply an upward velocity to them.\n' +
        '# 3. Bullets & Danmaku System\n' +
        '• Bullet Movement: Once spawned, bullets move forward in a specific direction or follow designated trajectories (e.g., homing, spread shots).\n' +
        '• Object Pooling Technique: This is the most crucial optimization in shooting games! Hundreds or thousands of bullets can appear on screen simultaneously. Frequently creating and destroying these objects will cause severe game stuttering (GC spikes/freezes).\n' +
        '◦ Implementation: Instantiate a bullet pool in advance. When a bullet is fired, "set it to active". When it flies off-screen or hits an enemy, "deactivate it" so it can be recycled and reused.\n' +
        '• Boundary Recycling: Place an invisible Boundary Trigger at the top and bottom of the screen. Any bullet or enemy crossing this boundary is immediately recycled or destroyed to prevent performance waste.\n' +
        '# 4. Enemies & Spawner\n' +
        '• Enemy Behavior: Create distinct movement paths for different types of enemies (e.g., flying straight down, moving in an S-pattern, or hovering in the air for a while before exiting).\n' +
        '• Spawn Manager:\n' +
        '◦ Timed Spawning: Use a Coroutine or a timer to spawn enemies at random coordinates along the top of the screen every few seconds.\n' +
        '◦ Level Scripting (Timeline): An advanced approach is to write an XML/JSON configuration table or timeline. This specifies that Enemy Minion A appears at 10 seconds, Elite Monster B appears at 30 seconds, and the Boss appears at 60 seconds.\n' +
        '# 5. Collision & HP\n' +
        '• Collision Masking (Layer Matrix): Clearly separate collision layers to prevent accidental interactions like "enemy bullets hitting enemies" or "player bullets hitting the player".\n' +
        '◦ Player Bullets should only collide with Enemies / Enemy Bullets.\n' +
        '◦ Enemy Bullets should only collide with the Player.\n' +
        '• On-Hit Trigger: When a collision is detected (OnTriggerEnter), execute the following:\n' +
        '> 1. Deduct HP from the target.\n' +
        '> 2. Spawn explosion visual effects (VFX) and play sound effects (SFX).\n' +
        '> 3. If HP <= 0, trigger the destruction logic (lose a life/Game Over for the player, or award points for an enemy).\n' +
        '# 6. Game Loop & UI System\n' +
        '• Score & Core Data: Create a GameManager to keep track of the current score and the player\'s remaining lives.\n' +
        '• UI Interface: Design a Heads-Up Display (HUD) to display the health bar, bomb count, and current score.\n' +
        '• State Management: Handle the state machine transitions between: Main Menu → In-Game → Paused → Player Death → Game Over / Restart.',
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
      'nav.keys.vol': '← → Tab　↑ ↓ Select　Enter: adjust　Esc / B: Back', 'nav.tap.vol': 'Tap a bar to adjust',
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
      'banner.bosswarn': 'BOSS  {name} incoming', 'banner.bonus': 'Clear bonus +{n}', 'banner.bossdown': 'Boss defeated +{n}',
      'boss.name': 'Gangster Rat', 'boss.bubble1': '……', 'boss.bubble2': 'Sigh… clocking out.',
      'boss2.name': 'Don Kiryu Rat', 'boss2.bubble2': 'Heh… you\'ve got guts.',
      'boss3.name': 'Undying Asura Rat', 'boss3.bubble2': 'Heh... see you in the next life.',
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
      // Kiryu Daddy Rat death lines (English, tough-guy yakuza boss)
      'boss2.l.k01': 'This fist... still not hot enough for you?', 'boss2.l.k02': 'Not bad. Remember this fire.', 'boss2.l.k03': 'Tch... my suit\'s ruined.',
      'boss2.l.k04': 'A loss is a loss. A real man doesn\'t make excuses.', 'boss2.l.k05': 'Next time... I\'ll treat you to a real beating.', 'boss2.l.k06': 'This road, I\'ve walked it without regret.',
      'boss2.l.k07': 'Even "Extreme" stumbles sometimes.', 'boss2.l.k08': 'Don\'t get cocky. This was only round one.', 'boss2.l.k09': 'Remember my name.',
      'boss2.l.k10': 'This one\'s on me. I owe you.', 'boss2.l.k11': 'Damn... beaten by a cat.', 'boss2.l.k12': 'That felt good. Been a while since a fight felt this good.',
      'boss2.l.klv1a': 'Oh? Pretty bold for a first meeting.', 'boss2.l.klv1b': 'Not bad guts, for a rookie cat.',
      'boss2.l.klv2a': 'You again... you still owe me from last time.', 'boss2.l.klv2b': 'Second time, huh. I\'m going all in now.',
      'boss2.l.klv3a': 'Round {n}... how long have you been training?', 'boss2.l.klv3b': 'Round {n}. You\'ve dragged my name through the mud.',
      'boss2.l.kflaw1': 'Not a single life lost? You\'re no ordinary cat.', 'boss2.l.kflaw2': 'That tough? Come work for me sometime.',
      'boss2.l.kmany1': 'You went down a few times too... we\'re even.', 'boss2.l.kmany2': 'Both of us covered in bruises. Truce.',
      'boss2.l.kfast1': 'Over that fast? Now that\'s satisfying.', 'boss2.l.kslow1': 'Long fight... my suit\'s soaked through.',
      'boss3.l.u01': 'Death... is merely a change of skin to me.', 'boss3.l.u02': 'You think you\'ve defeated me? I never truly existed.', 'boss3.l.u03': 'This rat\'s body gave up on life and death long ago.',
      'boss3.l.u04': 'Undying... now you understand what that name means.', 'boss3.l.u05': 'One turn of the wheel, and a new beginning starts.', 'boss3.l.u06': 'The relic falls, but the heart does not.',
      'boss3.l.u07': 'Your bullets only pierce illusions.', 'boss3.l.u08': 'This shell shatters — we\'ll meet again in the next life.', 'boss3.l.u09': 'An Asura\'s wrath is just another part of impermanence.',
      'boss3.l.u10': 'I\'ve closed my eyes a thousand times. I\'m still me when I open them.', 'boss3.l.u11': 'This trial... you\'ve finished half of it for me.', 'boss3.l.u12': 'Well done. You\'ve brought me one step closer to the deathless.',
      'boss3.l.ulv1a': 'Little cat, you\'ve stepped into my dojo.', 'boss3.l.ulv1b': 'Since it\'s our first meeting, witness my four arms.',
      'boss3.l.ulv2a': 'We meet again — seems you\'re training in "never giving up" too.', 'boss3.l.ulv2b': 'Round two. Let\'s see how many strikes you can weather.',
      'boss3.l.ulv3a': 'The {n}th time... your life is quite hard to kill too.', 'boss3.l.ulv3b': 'Round {n}. Seems we\'re both equally hard to put down.',
      'boss3.l.uflaw1': 'Not a single fall? Your mind is calmer than mine.', 'boss3.l.uflaw2': 'Walked away unscathed... seems you\'ve glimpsed a little enlightenment too.',
      'boss3.l.umany1': 'You\'ve fallen more than a few times too... we\'re not so different.', 'boss3.l.umany2': 'Dying and living, over and over — you\'re getting good at this.',
      'boss3.l.ufast1': 'That fast... my robes haven\'t even warmed up yet.', 'boss3.l.uslow1': 'Such a long entanglement... I suppose that\'s fate too.',
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
