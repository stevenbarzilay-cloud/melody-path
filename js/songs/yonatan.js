/* שלב 1: „יונתן הקטן” (הלחן העממי Hänschen klein).
   p  = גובה התו בחצאי טונים מעל הטוניקה (דו=0, רה=2, מי=4, פה=5, סול=7)
   d  = אורך בפעמות (שמינית = 0.5), rest = הפסקה אחרי התו
   הרצף נבדק מול תווי הלחן (2/4):  סול מי מי | פה רה רה | דו רה מי פה | סול סול סול |
   סול מי מי | פה רה רה | דו מי סול סול | דו | רה רה רה רה | רה מי פה | מי מי מי מי | מי פה סול |
   סול מי מי | פה רה רה | דו מי סול סול | דו */
(function () {
  const n = (p, d, extra) => Object.assign({ p, d }, extra || {});
  const E = 0.5, Q = 1;

  window.SG.registerSong({
    id: 'yonatan',
    order: 1,
    available: true,
    title: 'יונתן הקטן',
    blurb: 'מטפסים על העץ ומחפשים אפרוחים',
    icon: 'tree',
    bpm: 60,
    defaultTonic: 62,          // רה4 – טווח נוח לילדים (רה–לה)
    tonicRange: [50, 69],
    demoKeys: [0, 2, 4, 5, 7], // מקשי 1–5 במצב הדגמה
    demoKeyNames: ['דו', 'רה', 'מי', 'פה', 'סול'],
    backdrop: 'morning',
    finale: 'tornPants',

    // המשטח הבטוח שממנו מתחילים: הבית על הגבעה, בגובה התו הראשון
    start: { p: 7, beats: 1.3, style: 'hilltop' },

    phrases: [
      // 1. בוקר: יורדים מהבית במדרגות האבן
      { style: 'stone', notes: [n(7, E), n(4, E), n(4, Q), n(5, E), n(2, E), n(2, Q)] },
      // 2. עולים בגבעה אל הגן
      { style: 'grass', notes: [n(0, E), n(2, E), n(4, E), n(5, E), n(7, E), n(7, E), n(7, Q)] },
      // 3. יורדים אל הגן
      { style: 'stone', notes: [n(7, E), n(4, E), n(4, Q), n(5, E), n(2, E), n(2, Q)] },
      // 4. זוחלים מתחת לקורה, מדלגים על הגדר ומגיעים לרגלי העץ
      { style: 'fence', notes: [n(0, E, { crawl: 'log', style: 'ground' }), n(4, E), n(7, E), n(7, E), n(0, Q, { style: 'ground', rest: 1 })] },
      // 5. על העץ: רצים על ענף נמוך ומתחילים לעלות
      { style: 'branch', notes: [n(2, E), n(2, E), n(2, E), n(2, E), n(2, E), n(4, E), n(5, Q)] },
      // 6. ענף גבוה יותר, ועד הצמרת: שם הקן
      { style: 'branch', notes: [n(4, E), n(4, E), n(4, E), n(4, E), n(4, E), n(5, E), n(7, Q, { prop: 'nest', flag: 'nestFound', fx: 'chirp' })] },
      // 7. יורדים בין הענפים
      { style: 'branch', notes: [n(7, E), n(4, E), n(4, Q), n(5, E), n(2, E), n(2, Q)] },
      // 8. זוחלים מתחת לשורש, מקפצים על הפטריות, ונוחתים על הקרקע דרך השיח הקוצני
      { style: 'mushroom', notes: [n(0, E, { crawl: 'root', style: 'ground' }), n(4, E), n(7, E), n(7, E), n(0, 2, { style: 'ground', prop: 'thorn', flag: 'torn', fx: 'rip' })] },
    ],

    // תפאורה לפי מיקום בפעמות (לא משפיעה על המשחק)
    props: [
      { type: 'house', beat: -0.75, p: 7 },
      { type: 'trunk', beat: 15.95 },
      { type: 'trunk', beat: 20.0 },
      { type: 'trunk', beat: 24.0 },
      { type: 'trunk', beat: 27.98 },
    ],
    zones: [{ type: 'canopy', from: 15.6, to: 28.6 }],
  });
})();
