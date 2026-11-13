/* שלבים עתידיים: מופיעים במסך הבחירה כ„בקרוב”.
   כדי להפוך שיר לשלב אמיתי מוסיפים לו bpm, start, phrases וכו׳ באותו מבנה כמו yonatan.js
   ומשנים available ל-true. סגנונות משטח ותפאורה חדשים נרשמים ב-SG.Render. */
(function () {
  const reg = window.SG.registerSong;
  reg({ id: 'frere-jacques', order: 2, available: false, title: 'Frère Jacques', blurb: 'עולים במגדל הפעמונים ומצלצלים בפעמון', icon: 'bell' });
  reg({ id: 'row-your-boat', order: 3, available: false, title: 'Row, Row, Row Your Boat', blurb: 'שטים בנהר: מעל גלים ומתחת לגשרים', icon: 'boat' });
  reg({ id: 'twinkle', order: 4, available: false, title: 'Twinkle, Twinkle, Little Star', blurb: 'מהגג אל העננים, מדליקים כוכבים', icon: 'star' });
})();
