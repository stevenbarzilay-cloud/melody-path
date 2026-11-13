/* ממשק: מסך בחירה, התאמת סולם, מסך המשחק. מחבר בין הנתונים, המנוע, השמע והקלט. */
(function () {
  const SG = window.SG;
  const $ = (id) => document.getElementById(id);
  const NOTE_NAMES = ['דו', 'דו♯', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
  const ICONS = {
    tree: '<svg viewBox="0 0 96 96"><rect x="41" y="52" width="14" height="36" rx="4" fill="#7a4f2a"/><circle cx="48" cy="38" r="28" fill="#4c9c45"/><circle cx="30" cy="48" r="16" fill="#3d8639"/><circle cx="66" cy="48" r="16" fill="#58b24c"/><ellipse cx="58" cy="34" rx="11" ry="5" fill="#9a6b35"/><circle cx="54" cy="30" r="4" fill="#ffd84a"/><circle cx="62" cy="30" r="4" fill="#ffd84a"/></svg>',
    bell: '<svg viewBox="0 0 96 96"><rect x="30" y="34" width="36" height="54" fill="#c9c2b6"/><path d="M26 36 L48 10 L70 36Z" fill="#d9534a"/><path d="M38 66c0-8 4-14 10-14s10 6 10 14l4 6H34z" fill="#ffd84a" stroke="#b8860b" stroke-width="2"/><circle cx="48" cy="76" r="4" fill="#b8860b"/></svg>',
    boat: '<svg viewBox="0 0 96 96"><path d="M8 66q10-8 20 0t20 0 20 0 20 0v22H8z" fill="#5db7f0"/><path d="M22 54h52l-8 14H30z" fill="#a8713b"/><rect x="46" y="20" width="4" height="34" fill="#6b4424"/><path d="M50 22l20 26H50z" fill="#fff" stroke="#1d3557" stroke-width="2"/></svg>',
    star: '<svg viewBox="0 0 96 96"><rect x="0" y="0" width="96" height="96" rx="20" fill="#273469"/><path d="M48 16l8 20 22 2-17 14 6 21-19-12-19 12 6-21-17-14 22-2z" fill="#ffd84a"/><circle cx="18" cy="22" r="3" fill="#fff"/><circle cx="80" cy="70" r="3" fill="#fff"/><ellipse cx="26" cy="80" rx="18" ry="8" fill="#dfe7ff"/></svg>',
  };

  const app = (SG.app = { song: null, tonic: 62, audio: null, input: null, mic: null, run: null, view: null, beatOn: true, raf: 0, humming: null });

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }
  function ensureAudio() {
    if (!app.audio) app.audio = new SG.Audio();
    app.audio.resume();
    return app.audio;
  }
  function releaseMic() {
    if (app.mic) { app.mic.stop(); app.mic = null; }
  }
  // נקרא רק מתוך לחיצה מפורשת
  async function ensureMic() {
    if (app.mic && app.mic.isOpen()) return app.mic;
    const audio = ensureAudio();
    app.mic = await SG.Pitch.openMic(audio.ctx);
    return app.mic;
  }
  function micDenied() {
    $('mic-note').hidden = false;
    $('btn-start-demo').classList.add('primary', 'pulse');
    $('btn-start-mic').classList.remove('primary');
  }
  const clampTonic = (t) => Math.max(45, Math.min(74, t));
  function keyText() { return 'סולם: ' + NOTE_NAMES[((app.tonic % 12) + 12) % 12]; }

  /* ---------- מסך בחירה ---------- */
  function buildSelect() {
    const grid = $('song-grid');
    grid.innerHTML = '';
    SG.songs.forEach((s, i) => {
      const el = document.createElement(s.available ? 'button' : 'div');
      el.className = 'song-card' + (s.available ? '' : ' locked');
      el.innerHTML = `<span class="num">${i + 1}</span>${ICONS[s.icon] || ''}<div class="t" ${/[a-z]/i.test(s.title) ? 'dir="ltr"' : ''}>${s.title}</div><div class="b">${s.blurb}</div><span class="go">${s.available ? '▶ שחקו' : '🔒 בקרוב'}</span>`;
      if (s.available) el.addEventListener('click', () => openSetup(s));
      else el.setAttribute('aria-disabled', 'true');
      grid.appendChild(el);
    });
  }
  function toSelect() {
    stopRun();
    stopHum();
    if (app.audio) { app.audio.cancel(); app.audio.voice(null); }
    releaseMic(); // יוצאים מהשלב: משחררים את המיקרופון
    show('screen-select');
  }

  /* ---------- התאמת סולם ---------- */
  function openSetup(song) {
    app.song = song;
    app.tonic = song.defaultTonic;
    $('setup-title').textContent = song.title;
    $('key-label').textContent = keyText();
    $('mic-note').hidden = true;
    $('btn-start-demo').classList.remove('primary', 'pulse');
    $('btn-start-mic').classList.add('primary');
    $('hum-status').textContent = 'אפשר להתחיל מיד, או לזמזם צליל נוח כדי שנבחר סולם מתאים.';
    show('screen-setup');
  }
  function playSample() {
    const a = ensureAudio(), L = SG.buildLevel(app.song), ph = L.phrases[0], spb = 60 / app.song.bpm, t0 = a.now() + 0.1;
    a.cancel();
    for (let k = ph.first; k <= ph.last; k++) { const n = L.notes[k]; a.guide(app.tonic + n.p, t0 + n.beat * spb, n.d * spb); }
  }
  function setSetupTonic(t, play) {
    app.tonic = clampTonic(t);
    $('key-label').textContent = keyText();
    if (play) playSample();
  }
  function stopHum() {
    if (app.humming) { cancelAnimationFrame(app.humming.raf); app.humming = null; $('btn-hum').disabled = false; }
  }
  async function startHum() {
    const status = $('hum-status');
    let mic;
    try { mic = await ensureMic(); } catch (e) { micDenied(); status.textContent = 'אין מיקרופון, אז נשארים עם הסולם שנבחר.'; return; }
    app.audio.cancel();
    status.textContent = '🎵 זמזמו עכשיו צליל נוח וארוך…';
    $('btn-hum').disabled = true;
    const h = (app.humming = { vals: [], since: performance.now(), raf: 0 });
    const loop = () => {
      const s = app.audio.guideSounding() ? { midi: null } : mic.read();
      if (s.midi != null) {
        const v = h.vals;
        if (v.length && Math.abs(s.midi - v[v.length - 1].m) > 0.8) v.length = 0; // הצליל זז: מתחילים מחדש
        v.push({ m: s.midi, t: performance.now() });
        if (v.length > 4 && v[v.length - 1].t - v[0].t >= 600) {
          const sorted = v.map((x) => x.m).sort((a, b) => a - b), med = sorted[sorted.length >> 1];
          stopHum();
          setSetupTonic(SG.pickTonic(app.song, med), true);
          status.textContent = '✅ מצוין! התאמנו את השיר לקול. כך הוא יישמע:';
          return;
        }
      }
      if (performance.now() - h.since > 9000) { stopHum(); status.textContent = 'לא שמענו צליל יציב. אפשר לנסות שוב או להתחיל עם הסולם הזה.'; return; }
      h.raf = requestAnimationFrame(loop);
    };
    h.raf = requestAnimationFrame(loop);
  }

  /* ---------- המשחק ---------- */
  function buildDemoKeys(input) {
    const box = $('demo-keys');
    box.innerHTML = '';
    const mk = (id, html, cls) => {
      const b = document.createElement('button');
      b.className = 'btn' + (cls ? ' ' + cls : '');
      b.innerHTML = html;
      b.dataset.key = id;
      const down = (e) => { e.preventDefault(); input.press(id); b.classList.add('down'); };
      const up = (e) => { e.preventDefault(); input.release(id); b.classList.remove('down'); };
      b.addEventListener('pointerdown', down);
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, up));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      box.appendChild(b);
    };
    app.song.demoKeys.forEach((_, i) => mk(i, `${app.song.demoKeyNames[i]}<small>${i + 1}</small>`));
    mk('target', '⭐ התו הנכון<small>רווח</small>', 'star');
  }
  function keyToDemoId(e) {
    if (e.code === 'Space') return 'target';
    const m = /^(Digit|Numpad)(\d)$/.exec(e.code);
    if (m) { const i = +m[2] - 1; if (i >= 0 && i < app.song.demoKeys.length) return i; }
    return null;
  }
  function onKey(e, down) {
    if (!app.run) return;
    if (app.input && app.input.kind === 'demo') {
      const id = keyToDemoId(e);
      if (id != null) {
        e.preventDefault();
        if (down) { if (!e.repeat) app.input.press(id); } else app.input.release(id);
        const b = document.querySelector(`#demo-keys [data-key="${id}"]`);
        if (b) b.classList.toggle('down', down);
        return;
      }
    }
    if (down && !e.repeat) {
      if (e.code === 'Enter' && app.run.state === 'wait') { e.preventDefault(); app.run.retry(app.audio.now()); }
      else if (e.code === 'KeyH') app.run.hearAgain(app.audio.now());
    }
  }

  function startRun(mode) {
    stopHum();
    const audio = ensureAudio();
    audio.cancel();
    stopRun();
    if (mode === 'demo') {
      releaseMic();
      const inp = new SG.DemoInput(audio);
      inp.keys = app.song.demoKeys;
      inp.tonic = () => app.run.tonic;
      inp.getTarget = () => app.run.targetMidi();
      app.input = inp;
      buildDemoKeys(inp);
    } else app.input = app.mic;
    $('demo-keys').hidden = mode !== 'demo';
    $('screen-play').classList.toggle('has-demo', mode === 'demo');
    show('screen-play');
    app.mode = mode;
    app.run = new SG.Run(app.song, { audio, tonic: app.tonic, beatOn: app.beatOn });
    app.view = new SG.View($('stage'), app.run, app.song);
    app.run.start(audio.now() + 0.5);
    let last = performance.now();
    const frame = (ts) => {
      const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
      const now = audio.now();
      let sample = app.input.read();
      // כשהדוגמה מתנגנת מתעלמים מהמיקרופון, כדי שהרמקול לא „ישיר” במקום הילד
      if (app.input.kind === 'mic' && audio.guideSounding()) sample = { midi: null };
      app.run.update(now, sample);
      app.view.step(now, dt);
      app.view.draw(now);
      syncHud(now);
      app.raf = requestAnimationFrame(frame);
    };
    app.raf = requestAnimationFrame(frame);
  }
  function stopRun() {
    cancelAnimationFrame(app.raf);
    if (app.input && app.input.kind === 'demo') app.input.stop();
    app.run = null; app.view = null; app.input = null;
  }

  let lastHud = '';
  function syncHud(now) {
    const run = app.run, st = run.state;
    let text = '', cls = '';
    if (st === 'listen') text = '👂 מקשיבים';
    else if (st === 'cue') { const cd = run.countdown(now); if (cd === 'cue') text = '🔔 הצליל הראשון'; else { text = String(cd); cls = 'count'; } }
    else if (st === 'sing') { text = app.mode === 'demo' ? '🎹 מנגנים!' : '🎤 שרים!'; cls = 'sing'; }
    else if (st === 'wait') text = '🙂 עוד ניסיון?';
    const key = st + '|' + text + '|' + run.beatOn;
    if (key === lastHud) return;
    lastHud = key;
    const s = $('status');
    s.textContent = text; s.className = 'status ' + cls;
    $('wait-panel').hidden = st !== 'wait';
    $('done-panel').hidden = st !== 'done';
    const canKey = run.canChangeKey();
    $('btn-key-down').disabled = !canKey; $('btn-key-up').disabled = !canKey;
    $('btn-again').disabled = st === 'finale' || st === 'done' || st === 'wait';
    $('demo-keys').style.visibility = st === 'done' || st === 'wait' ? 'hidden' : 'visible';
  }
  function shiftRunKey(d) {
    if (!app.run) return;
    const t = clampTonic(app.run.tonic + d);
    if (app.run.setTonic(t, app.audio.now())) app.tonic = t;
  }

  /* ---------- חיבור כפתורים ---------- */
  function init() {
    buildSelect();
    $('btn-setup-back').addEventListener('click', toSelect);
    $('btn-lower').addEventListener('click', () => setSetupTonic(app.tonic - 1, true));
    $('btn-higher').addEventListener('click', () => setSetupTonic(app.tonic + 1, true));
    $('btn-sample').addEventListener('click', playSample);
    $('btn-hum').addEventListener('click', startHum);
    $('btn-start-mic').addEventListener('click', async () => {
      try { await ensureMic(); } catch (e) { micDenied(); return; }
      startRun('mic');
    });
    $('btn-start-demo').addEventListener('click', () => startRun('demo'));
    $('btn-exit').addEventListener('click', toSelect);
    $('btn-done-exit').addEventListener('click', toSelect);
    $('btn-replay').addEventListener('click', () => startRun(app.mode));
    $('btn-again').addEventListener('click', () => app.run && app.run.hearAgain(app.audio.now()));
    $('btn-wait-again').addEventListener('click', () => app.run && app.run.hearAgain(app.audio.now()));
    $('btn-retry').addEventListener('click', () => app.run && app.run.retry(app.audio.now()));
    $('btn-beat').addEventListener('click', () => {
      app.beatOn = !app.beatOn;
      $('btn-beat').setAttribute('aria-pressed', String(app.beatOn));
      if (app.run) app.run.beatOn = app.beatOn;
    });
    $('btn-key-down').addEventListener('click', () => shiftRunKey(-1));
    $('btn-key-up').addEventListener('click', () => shiftRunKey(1));
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    window.addEventListener('blur', () => app.input && app.input.kind === 'demo' && app.input.releaseAll());
    window.addEventListener('resize', () => app.view && app.view.resize());
    window.addEventListener('pagehide', releaseMic);
  }
  init();
})();
