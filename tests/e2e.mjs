// בדיקות דפדפן (Playwright + Chrome):  node tests/e2e.mjs
// המיקרופון כאן וירטואלי (אוסילטור שמוזן ל-getUserMedia), לא מיקרופון פיזי.
import { createRequire } from 'module';
import { spawn } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const PORT = 8765, PAGE = `http://localhost:${PORT}/index.html`;
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
let failed = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) failed++; };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const shots = process.env.SHOTS || '/tmp/shots';
require('fs').mkdirSync(shots, { recursive: true });

async function page(init, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1000, height: 600 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log('  ✗ pageerror: ' + e.message); failed++; });
  if (init) await p.addInitScript(init);
  await p.goto(PAGE);
  return p;
}
const state = (p) => p.evaluate(() => { const r = window.SG.app.run; return r ? { st: r.state, on: r.onNote, pending: r.pending, misses: r.misses, tonic: r.tonic } : null; });
async function waitState(p, pred, ms) {
  const t0 = Date.now();
  for (;;) { const s = await state(p); if (s && pred(s)) return s; if (Date.now() - t0 > ms) return s; await p.waitForTimeout(100); }
}

// 1. גישה למיקרופון נדחית → מצב הדגמה עם מקלדת
console.log('מיקרופון נדחה ומצב הדגמה');
{
  const p = await page(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
  ok((await p.locator('.song-card').count()) === 4 && (await p.locator('.song-card.locked').count()) === 3, 'מסך בחירה: 4 שירים, 3 מהם „בקרוב”');
  await p.screenshot({ path: `${shots}/1-select.png` });
  await p.locator('.song-card.locked').first().click({ force: true });
  ok(await p.locator('#screen-select.active').count() === 1, 'שלב עתידי לא נפתח');
  await p.locator('.song-card:not(.locked)').click();
  await p.screenshot({ path: `${shots}/2-setup.png` });
  await p.click('#btn-start-mic');
  await p.waitForTimeout(300);
  ok(await p.locator('#mic-note').isVisible() && await p.locator('#screen-setup.active').count() === 1, 'דחיית מיקרופון: מוצגת הודעה ומוצע מצב הדגמה');
  await p.click('#btn-start-demo', { force: true });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${shots}/3-listen.png` });
  // לא שרים: מפספסים, ואז „שמע שוב”
  let s = await waitState(p, (x) => x.st === 'wait', 15000);
  ok(s.st === 'wait' && s.on === -1, 'בלי קלט הדמות מחכה על המשטח הבטוח');
  await p.screenshot({ path: `${shots}/4-wait.png` });
  await p.click('#btn-wait-again');
  s = await waitState(p, (x) => x.st === 'listen', 1000);
  ok(s.st === 'listen', '„שמע שוב” מנגן את המשפט מחדש');
  // מקשי תווים: שרים את המשפט הראשון "ידנית" (סול מי מי פה רה רה = 5 3 3 4 2 2)
  await waitState(p, (x) => x.st === 'sing', 12000);
  const keys = { 0: 'Digit1', 2: 'Digit2', 4: 'Digit3', 5: 'Digit4', 7: 'Digit5' };
  let cur = null;
  for (let i = 0; i < 400; i++) {
    const info = await p.evaluate(() => { const r = window.SG.app.run; return { st: r.state, p: r.pending <= r.seg.to ? r.level.notes[r.pending].p : null }; });
    if (info.st !== 'sing') break;
    const k = keys[info.p];
    if (k !== cur) { if (cur) await p.keyboard.up(cur); await p.waitForTimeout(40); await p.keyboard.down(k); cur = k; if (i === 0) await p.screenshot({ path: `${shots}/5-sing.png` }); }
    await p.waitForTimeout(30);
  }
  if (cur) await p.keyboard.up(cur);
  s = await state(p);
  ok(s.on === 5 && s.misses === 1, 'מקשי 1–5: המשפט הראשון עבר תו אחרי תו');
  // מקש שגוי לא עובר
  await waitState(p, (x) => x.st === 'sing', 15000);
  await p.keyboard.down('Digit5');
  s = await waitState(p, (x) => x.st === 'wait', 6000);
  await p.keyboard.up('Digit5');
  ok(s.st === 'wait' && s.on === 5, 'תו שגוי (סול במקום דו) לא מזיז את הדמות');
  await p.click('#btn-retry');
  // מכאן מחזיקים רווח (= התו הנכון) עד הסוף
  await p.keyboard.down('Space');
  let nestShot = false, crawlShot = false;
  const t0 = Date.now();
  for (;;) {
    s = await state(p);
    if (!crawlShot && s.on === 19) { crawlShot = true; await p.screenshot({ path: `${shots}/6-crawl.png` }); }
    if (!nestShot && s.on === 37) { nestShot = true; await p.waitForTimeout(500); await p.screenshot({ path: `${shots}/7-nest.png` }); }
    if (s.st === 'done' || Date.now() - t0 > 150000) break;
    await p.waitForTimeout(60);
  }
  await p.keyboard.up('Space');
  ok(s.st === 'done', 'מצב הדגמה: אפשר לסיים את השלב');
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${shots}/8-done.png` });
  ok(await p.locator('#done-panel').isVisible(), 'מסך סיום מוצג');
  await p.click('#btn-done-exit');
  ok(await p.locator('#screen-select.active').count() === 1, 'חזרה למסך הבחירה');
  await p.context().close();
}

// מיקרופון וירטואלי: אוסילטור שנשלט מהבדיקה
const virtualMic = () => {
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = window.SG.app.audio.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), d = ctx.createMediaStreamDestination();
    o.type = 'sawtooth'; g.gain.value = 0; g2.gain.value = 0;
    o.connect(g); g.connect(d); o2.connect(g2); g2.connect(d); o.start(); o2.start();
    window.__tracks = d.stream.getTracks();
    window.__sing = (midi) => { if (midi == null) { g.gain.value = 0; return; } o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); g.gain.value = 0.25; };
    if (window.__loopback) window.SG.app.audio.master.connect(d); // הרמקול „דולף” למיקרופון
    return d.stream;
  };
};

// 2. שירה דרך צינור המיקרופון האמיתי (AnalyserNode + YIN), כולל שינוי סולם
console.log('מיקרופון וירטואלי: שירה, שינוי סולם, שחרור');
{
  const p = await page(virtualMic);
  await p.locator('.song-card:not(.locked)').click();
  for (let i = 0; i < 4; i++) await p.click('#btn-higher');
  ok((await p.evaluate(() => window.SG.app.tonic)) === 66, 'כפתור „גבוה יותר” ×4 → טוניקה 66');
  await p.click('#btn-start-mic');
  await p.waitForTimeout(300);
  // הזמר שר את התו הנכון רק בזמן 'sing', בסולם הישן (62) במשפט הראשון
  await p.evaluate(() => { window.__mode = 'old'; setInterval(() => { const r = window.SG.app.run; if (!r || !window.__sing) return; const tgt = r.targetMidi(); window.__sing(r.state === 'sing' && tgt != null ? tgt + (window.__mode === 'old' ? -4 - 12 : -12) : null); }, 15); });
  let s = await waitState(p, (x) => x.st === 'wait', 20000);
  ok(s.st === 'wait' && s.on === -1 && s.tonic === 66, 'שירה בסולם הישן אחרי ההעברה: הדמות לא זזה');
  await p.evaluate(() => { window.__mode = 'new'; });
  await p.click('#btn-retry');
  s = await waitState(p, (x) => x.on >= 5, 15000);
  ok(s.on >= 5, 'שירה בסולם החדש (אוקטבה מתחת): המשפט עובר דרך זיהוי הגובה');
  // שינוי סולם בזמן ההאזנה למשפט הבא
  await waitState(p, (x) => x.st === 'listen', 5000);
  await p.click('#btn-key-down'); await p.click('#btn-key-down'); await p.click('#btn-key-down');
  s = await state(p);
  ok(s.tonic === 63 && s.st === 'listen', 'שינוי סולם לפני הקטע: הדוגמה מתחילה מחדש בסולם 63');
  s = await waitState(p, (x) => x.st === 'done' || x.st === 'wait', 150000);
  ok(s.st === 'done', 'מסיימים את כל השלב דרך המיקרופון הווירטואלי');
  ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === 'live')), 'המיקרופון פעיל בזמן השלב');
  await p.click('#btn-done-exit');
  ok(await p.evaluate(() => window.__tracks.every((t) => t.readyState === 'ended') && window.SG.app.mic === null), 'ביציאה מהשלב המיקרופון משוחרר');
  await p.context().close();
}

// 3. הדוגמה דולפת מהרמקול למיקרופון: הדמות לא זזה, והגובה שמזוהה = הגובה שהמשחק מצפה לו
console.log('דליפת הדוגמה למיקרופון');
{
  const p = await page(`window.__loopback = true; (${virtualMic.toString()})();`);
  await p.locator('.song-card:not(.locked)').click();
  await p.click('#btn-lower'); await p.click('#btn-lower'); await p.click('#btn-lower');
  await p.click('#btn-start-mic');
  await p.waitForTimeout(200);
  // דוגמים את המיקרופון הגולמי (לפני ההשתקה) ומשווים לתו הדוגמה שמתנגן
  await p.evaluate(() => {
    window.__heard = []; window.__gated = 0; window.__raw = 0;
    const tick = () => {
      const a = window.SG.app, r = a.run;
      if (r && a.mic) {
        const s = a.mic.read();
        if (s.midi != null) {
          window.__raw++;
          if (!a.audio.guideSounding()) window.__gated++;
          if (r.state === 'listen') { const b = r.listenBeat(a.audio.now()); const n = r.level.notes.find((n) => n.i >= r.seg.from && n.i <= r.seg.to && b >= n.beat + 0.08 && b < n.beat + Math.min(n.d, 0.35)); if (n) window.__heard.push(s.midi - r.midiOf(n.i)); }
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
  const s = await waitState(p, (x) => x.st === 'wait', 20000);
  const h = await p.evaluate(() => ({ heard: window.__heard, raw: window.__raw, gated: window.__gated }));
  const maxErr = Math.max(...h.heard.map((d) => Math.abs(d)));
  ok(h.heard.length > 30, `המיקרופון באמת שמע את הדוגמה (${h.heard.length} דגימות עם גובה)`);
  ok(maxErr < 0.35, `הגובה שזוהה מהדוגמה זהה לגובה שהמשחק מצפה לו בסולם 59 (סטייה מרבית ${maxErr.toFixed(2)} חצאי טון)`);
  ok(s.st === 'wait' && s.on === -1, 'ניגון הדוגמה, צליל הפתיחה והספירה לא הזיזו את הדמות');
  console.log(`    (דגימות עם גובה: ${h.raw}, מתוכן מחוץ לחלון ההשתקה: ${h.gated})`);
  await p.context().close();
}

// 4. תצוגת טלפון לאורך
{
  const p = await page(null, { width: 390, height: 780 });
  await p.screenshot({ path: `${shots}/9-phone-select.png` });
  await p.locator('.song-card:not(.locked)').click();
  await p.screenshot({ path: `${shots}/10-phone-setup.png` });
  await p.click('#btn-start-demo');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${shots}/11-phone-play.png` });
  await p.context().close();
}

await browser.close(); srv.kill();
console.log(failed ? `\n${failed} בדיקות נכשלו` : '\nכל בדיקות הדפדפן עברו');
process.exit(failed ? 1 : 0);
