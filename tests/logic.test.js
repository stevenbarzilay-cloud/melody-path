// בדיקות לוגיקה ללא דפדפן:  node tests/logic.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const window = {}; const ctx = vm.createContext({ window, console, Math, Float32Array, Object, Infinity });
for (const f of ['js/songs/registry.js', 'js/songs/yonatan.js', 'js/songs/upcoming.js', 'js/engine/run.js', 'js/engine/pitch.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const SG = window.SG, song = SG.songs.find((s) => s.id === 'yonatan');
let failed = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) failed++; };

class FakeAudio {
  constructor() { this.t = 0; this.guides = []; this.all = []; }
  now() { return this.t; }
  guide(midi, when, dur) { const g = { midi, when, dur }; this.guides.push(g); this.all.push(g); }
  tick() {} fx() {}
  cancel() { this.guides = this.guides.filter((g) => g.when + g.dur <= this.t); }
  sounding() { return this.guides.find((g) => this.t >= g.when && this.t < g.when + Math.min(g.dur, 0.6)); }
}
// singer(run, audio) → midi|null בכל פריים
function sim(singer, o = {}) {
  const audio = new FakeAudio(), run = new SG.Run(song, { audio, tonic: o.tonic });
  run.start(0);
  const dt = 1 / 60; let guard = 0;
  while (run.state !== 'done' && guard++ < 60 * 600) {
    audio.t += dt;
    if (o.before) o.before(run, audio);
    run.update(audio.t, { midi: singer(run, audio) });
    run.events.length = 0;
    if (run.state === 'wait') { if (o.onWait) { if (o.onWait(run, audio) === false) break; } else break; }
  }
  return { run, audio };
}
const perfect = (run) => (run.state === 'sing' ? run.targetMidi() : null);

console.log('רצף התווים');
const L = SG.buildLevel(song);
const expected = [7,4,4,5,2,2, 0,2,4,5,7,7,7, 7,4,4,5,2,2, 0,4,7,7,0, 2,2,2,2,2,4,5, 4,4,4,4,4,5,7, 7,4,4,5,2,2, 0,4,7,7,0];
ok(JSON.stringify(L.notes.map((n) => n.p)) === JSON.stringify(expected), '49 תווים תואמים ללחן (סול מי מי | פה רה רה | …)');
ok(L.phrases.every((p) => p.endBeat - p.startBeat === 4) && L.totalBeats === 32, '8 משפטים של 4 פעמות');

console.log('שירה מדויקת');
let r = sim(perfect);
ok(r.run.state === 'done' && r.run.misses === 0, 'אפשר לסיים את השלב בלי פספוסים');
ok(r.run.flags.nestFound && r.run.flags.torn, 'הקן מתגלה והמכנסיים נקרעים');
ok(r.audio.all.filter((g) => g.dur > 0).length >= 49 + 8, 'כל משפט מושמע כדוגמה ואחריו צליל פתיחה');

console.log('הדוגמה והזיהוי תואמים, גם אחרי שינוי סולם');
for (const tonic of [62, 57, 66]) {
  const audio = new FakeAudio(), run = new SG.Run(song, { audio, tonic });
  run.start(0);
  const want = L.notes.slice(0, 6).map((n) => tonic + n.p);
  ok(JSON.stringify(audio.guides.map((g) => g.midi)) === JSON.stringify(want) && run.targetMidi() === want[0], `טוניקה ${tonic}: תווי הדוגמה = התווים שהמשחק מצפה להם`);
}
r = sim((run) => (run.state === 'sing' ? 62 + run.level.notes[run.pending].p : null), { tonic: 66 });
ok(r.run.state === 'wait' && r.run.onNote === -1, 'אחרי העברה ל-66, שירה בסולם הישן (62) לא מזיזה את הדמות');
r = sim(perfect, { tonic: 66 });
ok(r.run.state === 'done', 'אחרי העברה ל-66, שירה בסולם החדש מסיימת את השלב');
{ // שינוי סולם באמצע (לפני הקטע)
  const audio = new FakeAudio(), run = new SG.Run(song, { audio });
  run.start(0); audio.t = 0.2; run.update(0.2, { midi: null });
  ok(run.setTonic(59, audio.t) && audio.guides.every((g) => g.midi === 59 + L.notes[audio.guides.indexOf(g)].p), 'שינוי סולם לפני הקטע משמיע את הדוגמה מחדש בגובה החדש');
  run.state = 'sing'; ok(run.setTonic(60, audio.t) === false, 'אי אפשר לשנות סולם באמצע השירה');
}

console.log('הדוגמה לבדה לא מפעילה את הדמות');
// „מיקרופון” ששומע רק את הרמקול: מחזיר את תו הדוגמה שמתנגן, ושקט בזמן השירה
r = sim((run, audio) => { const g = audio.sounding(); return g ? g.midi : null; });
ok(r.run.onNote === -1 && r.run.state === 'wait', 'דליפה של הדוגמה וצליל הפתיחה למיקרופון: הדמות נשארת במקום');
r = sim(() => null);
ok(r.run.onNote === -1 && r.run.state === 'wait', 'שקט: הדמות מחכה על המשטח הבטוח');

console.log('סלחנות ויציבות');
r = sim((run) => (run.state === 'sing' ? run.targetMidi() - 12 + 1.2 : null));
ok(r.run.state === 'done', 'אוקטבה נמוכה יותר ו-1.2 חצאי טון סטייה עדיין עוברים');
r = sim((run) => (run.state === 'sing' ? run.targetMidi() + 2.5 : null));
ok(r.run.onNote === -1, 'סטייה של 2.5 חצאי טון לא עוברת');
let f = 0;
r = sim((run) => (run.state === 'sing' && (f++ % 12) < 4 ? run.targetMidi() : null)); // פרצים של ~65ms
ok(r.run.onNote === -1, 'רעש רגעי (פרצים קצרים מ-110ms) לא מפעיל תנועה');
// איחור: מתחילים לשיר כל תו 0.3 שניות אחרי הזמן
r = sim((run, audio) => { if (run.state !== 'sing') return null; const n = run.level.notes[run.pending]; return run.playheadBeat(audio.t) >= n.beat + 0.3 ? run.targetMidi() : null; });
ok(r.run.state === 'done', 'איחור של 0.3 שניות בכל תו עדיין עובר');

console.log('עוד ניסיון מאותה נקודה');
let missedOnce = false, waitInfo = null;
r = sim((run) => { if (run.state !== 'sing') return null; if (run.pending === 3 && !missedOnce) return null; return run.targetMidi(); }, {
  onWait(run, audio) {
    if (!waitInfo) { waitInfo = { pending: run.pending, onNote: run.onNote }; missedOnce = true; audio.all.length = 0; run.hearAgain(audio.t); return true; }
    return false;
  },
});
ok(waitInfo && waitInfo.pending === 3 && waitInfo.onNote === 2, 'פספוס בתו הרביעי: הדמות מחכה על המשטח השלישי');
ok(r.audio.all.slice(0, 3).map((g) => g.midi).join() === [3, 4, 5].map((i) => r.run.midiOf(i)).join(), '„שמע שוב” מנגן את המשך המשפט מהנקודה שבה נעצרנו');
ok(r.run.state === 'done' && r.run.misses === 1, 'ממשיכים מאותה נקודה ומסיימים');
{ // "נסה שוב" בלי לשמוע
  let m = false; const rr = sim((run) => { if (run.state !== 'sing') return null; if (run.pending === 10 && !m) return null; return run.targetMidi(); }, { onWait(run, audio) { if (m) return false; m = true; run.retry(audio.t); return true; } });
  ok(rr.run.state === 'done', '„נסה שוב” ממשיך ישר לצליל הפתיחה ולספירה');
}

console.log('בחירת סולם מזמזום');
for (const h of [48, 57, 62, 65, 69, 74]) { const t = SG.pickTonic(song, h); ok(t >= 50 && t <= 69 && Math.abs(SG.fold(t + 3.5 - h)) <= 0.5, `זמזום ${h} → טוניקה ${t} (אמצע הטווח על התו שזומזם)`); }

console.log('זיהוי גובה קול (אות סינתטי)');
const sr = 48000, N = 2048;
const gen = (fn) => { const b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = fn(i / sr); return b; };
for (const f0 of [110, 196, 261.63, 330, 440, 587, 784]) {
  const b = gen((t) => 0.3 * Math.sin(6.2832 * f0 * t) + 0.15 * Math.sin(6.2832 * 2 * f0 * t + 1) + 0.08 * Math.sin(6.2832 * 3 * f0 * t + 2));
  const d = SG.Pitch.detect(b, sr);
  ok(d.freq && Math.abs(12 * Math.log2(d.freq / f0)) < 0.15, `קול עם הרמוניות ${f0}Hz → ${d.freq && d.freq.toFixed(1)}Hz`);
}
let seed = 1; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
ok(SG.Pitch.detect(gen(() => 0.3 * rand()), sr).freq === null, 'רעש לבן → אין גובה');
ok(SG.Pitch.detect(gen((t) => 0.004 * Math.sin(6.2832 * 300 * t)), sr).freq === null, 'אות חלש מאוד → אין גובה');

console.log(failed ? `\n${failed} בדיקות נכשלו` : '\nכל הבדיקות עברו');
process.exit(failed ? 1 : 0);
