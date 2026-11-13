/* רישום שירים. כל שיר הוא קובץ נתונים נפרד שקורא ל-SG.registerSong.
   המנוע (js/engine) לא מכיר שום שיר מסוים. */
(function () {
  const SG = (window.SG = window.SG || {});
  SG.songs = [];
  SG.registerSong = function (song) {
    SG.songs.push(song);
    SG.songs.sort((a, b) => a.order - b.order);
  };
})();
