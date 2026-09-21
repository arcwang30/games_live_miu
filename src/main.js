// 進入點：建立貼圖、載入圖片素材、註冊場景、顯示主選單
(function (BM) {
  BM.Cloud.init();               // 雲端排行榜（沒有網路 / SDK 載入失敗時自動改用本機）
  BM.Storage.init();             // 補傳上次沒傳成功的成績、取得榜單
  BM.Sprites.init();
  BM.Background.init();

  BM.Game.register('menu', new BM.MenuScene());
  BM.Game.register('play', new BM.PlayScene());
  BM.Game.register('gameover', new BM.GameOverScene());

  // 先載入主角圖片（失敗會自動改用程式繪製的備用貓咪），載入完再開始遊戲
  BM.Sprites.loadImages().then(() => {
    BM.Game.init(document.getElementById('game'));
    BM.Game.setScene('menu');
  });
})(window.BM = window.BM || {});
