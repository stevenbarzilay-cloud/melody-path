/* ציור: עולם דו־ממדי שבו ציר X הוא הזמן של השיר וציר Y הוא גובה התו.
   סגנונות משטח, תפאורה, רקעים וסיומים רשומים במילונים, כך ששלב חדש יכול להוסיף משלו. */
(function () {
  const SG = (window.SG = window.SG || {});
  const B = 170; // פיקסלים לפעמה
  const S = 30;  // פיקסלים לחצי טון
  const R = (SG.Render = { B, S, platformStyles: {}, props: {}, crawls: {}, zones: {}, backdrops: {}, finales: {} });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k) => k * k * (3 - 2 * k);
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
  }
  function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); }
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- סגנונות משטח ---------- */
  const PS = R.platformStyles;
  PS.stone = (c, p) => {
    const w = p.x1 - p.x0;
    c.fillStyle = '#c9c2b6'; c.fillRect(p.x0 + 9, p.y + 8, w - 18, -p.y - 8);
    c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1.5;
    for (let y = p.y + 30; y < -4; y += 22) line(c, p.x0 + 9, y, p.x1 - 9, y);
    c.fillStyle = '#8d8579'; rr(c, p.x0, p.y, w, 16, 7); c.fill();
    c.fillStyle = '#aaa294'; rr(c, p.x0 + 2, p.y, w - 4, 7, 5); c.fill();
  };
  PS.grass = (c, p) => {
    const w = p.x1 - p.x0;
    c.fillStyle = '#b98556'; c.fillRect(p.x0 + 2, p.y + 6, w - 4, -p.y - 6);
    c.fillStyle = 'rgba(0,0,0,.08)';
    for (let i = 0; i < 4; i++) { const yy = p.y + 26 + i * 40; if (yy < -8) { circle(c, p.x0 + 14 + rnd(p.x0 + i) * (w - 28), yy, 4); c.fill(); } }
    c.fillStyle = '#5fb04a'; rr(c, p.x0 - 2, p.y, w + 4, 15, 8); c.fill();
    c.fillStyle = '#7fcc5f'; rr(c, p.x0, p.y, w, 7, 5); c.fill();
  };
  PS.hilltop = (c, p) => {
    c.fillStyle = '#b98556'; c.fillRect(p.x0 - 700, p.y + 6, p.x1 - p.x0 + 700, -p.y - 6);
    c.fillStyle = '#5fb04a'; rr(c, p.x0 - 700, p.y, p.x1 - p.x0 + 702, 15, 8); c.fill();
    c.fillStyle = '#7fcc5f'; rr(c, p.x0 - 700, p.y, p.x1 - p.x0 + 700, 7, 5); c.fill();
  };
  PS.fence = (c, p) => {
    const w = p.x1 - p.x0;
    c.fillStyle = '#a8773f';
    c.fillRect(p.x0 + 8, p.y + 6, 11, -p.y - 6); c.fillRect(p.x1 - 19, p.y + 6, 11, -p.y - 6);
    c.fillStyle = '#c99655';
    for (let y = p.y + 34; y < -20; y += 44) c.fillRect(p.x0 + 4, y, w - 8, 9);
    c.fillStyle = '#d9a866'; rr(c, p.x0, p.y, w, 13, 4); c.fill();
    c.fillStyle = '#e8bd80'; rr(c, p.x0 + 2, p.y, w - 4, 5, 3); c.fill();
  };
  PS.branch = (c, p) => {
    const w = p.x1 - p.x0;
    c.fillStyle = '#3f8f3a';
    circle(c, p.x0 + 6, p.y + 14, 15); c.fill(); circle(c, p.x1 - 6, p.y + 15, 16); c.fill();
    c.fillStyle = '#7a4f2a'; rr(c, p.x0 - 3, p.y, w + 6, 15, 8); c.fill();
    c.fillStyle = '#93633a'; rr(c, p.x0, p.y, w, 6, 4); c.fill();
    c.fillStyle = '#58b24c';
    circle(c, p.x0 + 2, p.y + 20, 8); c.fill(); circle(c, p.x1 - 2, p.y + 22, 9); c.fill();
  };
  PS.mushroom = (c, p) => {
    const w = p.x1 - p.x0, cx = (p.x0 + p.x1) / 2;
    c.fillStyle = '#f3e7cf'; rr(c, cx - 11, p.y + 12, 22, -p.y - 12, 6); c.fill();
    c.fillStyle = '#e0483e';
    c.beginPath(); c.ellipse(cx, p.y + 20, w / 2 + 4, 22, 0, Math.PI, 0); c.closePath(); c.fill();
    c.fillStyle = '#fff';
    circle(c, cx - w / 4, p.y + 10, 5); c.fill(); circle(c, cx + w / 5, p.y + 8, 6); c.fill(); circle(c, cx, p.y + 14, 3.5); c.fill();
  };
  PS.ground = (c, p) => {
    c.fillStyle = '#e9d7a8';
    c.beginPath(); c.ellipse((p.x0 + p.x1) / 2, 7, (p.x1 - p.x0) / 2, 7, 0, 0, 6.2832); c.fill();
  };

  /* ---------- מכשולים שזוחלים מתחתם ---------- */
  R.crawls.log = (c, p) => {
    const a = p.x0 + 18, b = p.x1 - 2;
    c.fillStyle = '#8a5a2e'; c.fillRect(a, -44, 8, 44); c.fillRect(b - 8, -44, 8, 44);
    c.fillStyle = '#a8713b'; rr(c, a - 8, -50, b - a + 16, 20, 9); c.fill();
    c.fillStyle = '#e2bf8a'; circle(c, a - 1, -40, 6); c.fill();
    c.strokeStyle = '#a8713b'; c.lineWidth = 1.5; circle(c, a - 1, -40, 3); c.stroke();
  };
  R.crawls.root = (c, p) => {
    const a = p.x0 + 14, b = p.x1 + 4;
    c.strokeStyle = '#6b4424'; c.lineWidth = 15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(a - 16, -78); c.bezierCurveTo(a + 10, -34, b - 34, -42, b, 0); c.stroke();
    c.strokeStyle = '#7f5530'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(a - 16, -82); c.bezierCurveTo(a + 10, -40, b - 34, -48, b - 2, -6); c.stroke();
  };

  /* ---------- תפאורה ---------- */
  R.props.house = (c, pr) => {
    const x = pr.beat * B, y = -(pr.p || 0) * S;
    c.fillStyle = '#fff3d9'; c.fillRect(x - 58, y - 78, 116, 78);
    c.fillStyle = '#d9534a'; c.beginPath(); c.moveTo(x - 72, y - 76); c.lineTo(x, y - 132); c.lineTo(x + 72, y - 76); c.closePath(); c.fill();
    c.fillStyle = '#8a5a2e'; rr(c, x + 14, y - 50, 28, 50, [12, 12, 0, 0]); c.fill();
    c.fillStyle = '#9fd8ff'; c.fillRect(x - 42, y - 56, 30, 26);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(x - 42, y - 56, 30, 26); line(c, x - 27, y - 56, x - 27, y - 30);
    c.fillStyle = '#a34238'; c.fillRect(x - 40, y - 128, 14, 30);
  };
  R.props.trunk = (c, pr) => {
    const x = pr.beat * B;
    c.fillStyle = '#6b4424';
    c.beginPath(); c.moveTo(x - 30, 0); c.quadraticCurveTo(x - 16, -40, x - 18, -330); c.lineTo(x + 18, -330); c.quadraticCurveTo(x + 16, -40, x + 32, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) line(c, x - 8 + rnd(i + pr.beat) * 16, -40 - i * 46, x - 8 + rnd(i + pr.beat) * 16, -60 - i * 46);
  };
  // תפאורה שצמודה לתו
  R.props.nest = (c, p, view) => {
    const x = p.x1 - 34, y = p.y, found = view.run.flags.nestFound, t = view.t;
    if (found) {
      for (let i = 0; i < 3; i++) {
        const bx = x - 13 + i * 13, by = y - 13 - Math.abs(Math.sin(t * 6 + i * 1.7)) * 5;
        c.fillStyle = '#ffd84a'; circle(c, bx, by, 7); c.fill();
        c.fillStyle = '#ff9a2e'; c.beginPath(); c.moveTo(bx + 5, by - 1); c.lineTo(bx + 11, by + 1); c.lineTo(bx + 5, by + 3); c.fill();
        c.fillStyle = '#333'; circle(c, bx + 2, by - 2, 1.3); c.fill();
      }
    } else {
      c.fillStyle = '#fbf6ea';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x - 12 + i * 12, y - 9, 5, 7, 0, 0, 6.2832); c.fill(); }
    }
    c.fillStyle = '#9a6b35'; c.beginPath(); c.ellipse(x, y - 2, 26, 12, 0, 0, Math.PI); c.closePath(); c.fill();
    c.strokeStyle = '#6f4a22'; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) line(c, x - 24 + i * 8, y - 3, x - 20 + i * 8 + (i % 2 ? 5 : -5), y + 7);
    if (found) {
      c.fillStyle = '#ff6f91'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText('♥', x - 20 + i * 20, y - 30 - k * 40); }
      c.globalAlpha = 1;
    }
  };
  R.props.thorn = (c, p, view) => {
    const x = p.x0 + 2;
    c.strokeStyle = '#5d6b2f'; c.lineWidth = 5; c.lineCap = 'round';
    [[-14, -50], [4, -66], [22, -48], [-2, -34]].forEach(([dx, dy]) => line(c, x + 6, 0, x + 6 + dx, dy));
    c.lineWidth = 2.5;
    [[-14, -50], [4, -66], [22, -48]].forEach(([dx, dy]) => { line(c, x + 6 + dx, dy, x + dx - 2, dy - 8); line(c, x + 6 + dx, dy, x + 14 + dx, dy - 7); });
    if (view.run.flags.torn) { // חתיכת בד כחולה נשארה על השיח
      c.fillStyle = '#2f6fd0';
      c.beginPath(); c.moveTo(x + 8, -68); c.lineTo(x + 22, -62 + Math.sin(view.t * 5) * 2); c.lineTo(x + 13, -52); c.lineTo(x + 5, -58); c.closePath(); c.fill();
    }
  };

  R.zones.canopy = (c, z) => {
    const x0 = z.from * B, x1 = z.to * B;
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer ? '#4c9c45' : '#3d8639';
      for (let x = x0, i = 0; x <= x1; x += 70, i++) {
        const r = 58 + rnd(i + layer * 50) * 34;
        circle(c, x + rnd(i * 3 + layer) * 30, -305 + layer * 34 + rnd(i * 7 + layer) * 36, r); c.fill();
      }
    }
  };

  R.backdrops.morning = (c, W, H, gy, camX, t) => {
    const g = c.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, '#8fd0ff'); g.addColorStop(0.7, '#d9f0ff'); g.addColorStop(1, '#fff3d6');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = W * 0.8, sy = Math.max(60, gy - 330);
    c.fillStyle = 'rgba(255,224,102,.35)'; circle(c, sx, sy, 62 + Math.sin(t * 2) * 4); c.fill();
    c.fillStyle = '#ffd84a'; circle(c, sx, sy, 40); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 310 - camX * 0.18) % (W + 300) + W + 300) % (W + 300) - 150, y = Math.max(30, gy - 360) + (i % 3) * 46;
      circle(c, x, y, 22); c.fill(); circle(c, x + 26, y + 6, 18); c.fill(); circle(c, x - 26, y + 8, 16); c.fill();
    }
    c.fillStyle = '#b5dfa0';
    c.beginPath(); c.moveTo(0, gy);
    for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, gy - 60 - Math.sin((x + camX * 0.35) / 170) * 26 - Math.sin((x + camX * 0.35) / 61) * 8);
    c.lineTo(W + 20, gy); c.closePath(); c.fill();
  };

  /* ---------- הדמות ---------- */
  function drawHead(c, x, y, mood) {
    c.fillStyle = '#f6c9a0'; circle(c, x, y, 10); c.fill();
    c.fillStyle = '#5a3a22';
    c.beginPath(); c.arc(x, y, 10.5, Math.PI * 0.95, Math.PI * 1.95); c.quadraticCurveTo(x + 2, y - 4, x - 9, y - 1); c.fill();
    c.fillStyle = '#222';
    const er = mood === 'wow' ? 2.2 : 1.6;
    circle(c, x + 1.5, y, er); c.fill(); circle(c, x + 6.5, y, er); c.fill();
    c.strokeStyle = '#a14a3a'; c.lineWidth = 1.6; c.lineCap = 'round';
    if (mood === 'wow') { c.fillStyle = '#a14a3a'; circle(c, x + 4, y + 5.5, 2.2); c.fill(); }
    else { c.beginPath(); c.arc(x + 4, y + 3, 3.4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    if (mood === 'wow') { c.fillStyle = 'rgba(255,120,120,.55)'; circle(c, x - 3, y + 4, 2.6); c.fill(); circle(c, x + 9, y + 4, 2); c.fill(); }
  }
  function drawHole(c, x, y) {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.2832, r = i % 2 ? 6.2 : 4; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = '#e8453c';
    [[-2, -1], [2, 1.5], [1, -2.5], [-1.5, 2.5]].forEach(([dx, dy]) => { circle(c, x + dx, y + dy, 0.9); c.fill(); });
  }
  R.drawKid = function (c, x, y, pose, ph, o) {
    o = o || {};
    const skin = '#f6c9a0', shirt = '#e8453c', shorts = '#2f6fd0', shoe = '#4a4a4a';
    c.save(); c.translate(x, y); c.lineCap = 'round';
    if (pose === 'crawl') {
      const s = Math.sin(ph * 6.2832) * 5;
      c.strokeStyle = skin; c.lineWidth = 5;
      line(c, -16, -9, -21 + s, -2); line(c, -11, -9, -9 - s, -2);
      line(c, 7, -9, 9 + s, -2); line(c, 10, -9, 17 - s, -2);
      c.fillStyle = shorts; rr(c, -23, -21, 13, 13, 4); c.fill();
      c.fillStyle = shirt; rr(c, -12, -22, 25, 14, 5); c.fill();
      drawHead(c, 19, -19);
    } else if (pose === 'back') {
      c.strokeStyle = skin; c.lineWidth = 5;
      line(c, -4, -14, -4, -3); line(c, 4, -14, 4, -3);
      c.strokeStyle = shoe; line(c, -6, -1, -3, -1); line(c, 3, -1, 6, -1);
      c.strokeStyle = skin; c.lineWidth = 4.5; line(c, -9, -36, -13, -24); line(c, 9, -36, 13, -24);
      c.fillStyle = shirt; rr(c, -9, -40, 18, 18, 5); c.fill();
      c.fillStyle = shorts; rr(c, -9.5, -25, 19, 12, 3); c.fill();
      drawHole(c, 3, -19);
      if (o.turn > 0.5) drawHead(c, 1, -50, 'wow');
      else { c.fillStyle = skin; circle(c, 0, -50, 10); c.fill(); c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(0, -51, 10.5, Math.PI * 0.85, Math.PI * 2.15); c.closePath(); c.fill(); circle(c, 0, -52, 8.5); c.fill(); }
    } else {
      const a = pose === 'run' ? Math.sin(ph * 6.2832) * 0.85 : 0;
      c.strokeStyle = skin; c.lineWidth = 5;
      let f1, f2;
      if (pose === 'jump') { f1 = [-9, -7]; f2 = [8, -9]; }
      else { f1 = [-4 + Math.sin(a) * 13, -14 + Math.cos(a) * 12]; f2 = [4 - Math.sin(a) * 13, -14 + Math.cos(a) * 12]; }
      line(c, -4, -14, f1[0], f1[1]); line(c, 4, -14, f2[0], f2[1]);
      c.strokeStyle = shoe; line(c, f1[0] - 1, f1[1] + 1, f1[0] + 4, f1[1] + 1); line(c, f2[0] - 1, f2[1] + 1, f2[0] + 4, f2[1] + 1);
      c.strokeStyle = skin; c.lineWidth = 4.5;
      if (pose === 'jump') { line(c, -7, -37, -14, -49); line(c, 7, -37, 15, -48); }
      else { line(c, -7, -36, -9 - Math.sin(a) * 9, -25); line(c, 7, -36, 9 + Math.sin(a) * 9, -25); }
      c.fillStyle = shirt; rr(c, -9, -40, 18, 18, 5); c.fill();
      c.fillStyle = shorts; rr(c, -9.5, -25, 19, 12, 3); c.fill();
      drawHead(c, 1, -50 + (pose === 'idle' ? Math.sin(ph * 6.2832) * 0.8 : 0), o.mood);
      if (o.bubble) {
        c.fillStyle = '#fff'; circle(c, 20, -72, 13); c.fill(); circle(c, 10, -58, 3.5); c.fill();
        c.fillStyle = '#ff8a00'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.bubble, 20, -71);
      }
    }
    c.restore();
  };

  R.finales.tornPants = function (view, c, ft) {
    const ch = view.ch;
    if (ft < 0.6) R.drawKid(c, ch.x, ch.y, 'idle', view.t, { mood: 'wow' });
    else R.drawKid(c, ch.x, ch.y, 'back', 0, { turn: ft > 2.1 ? 1 : 0 });
  };
  R.finaleZoom = (ft) => 1 + 1.5 * ease(clamp((ft - 0.5) / 0.9, 0, 1));

  /* ---------- התצוגה ---------- */
  SG.View = class {
    constructor(canvas, run, song) {
      this.cv = canvas; this.c = canvas.getContext('2d'); this.run = run; this.song = song;
      const L = run.level, st = song.start;
      this.plats = L.notes.map((n) => ({ x0: n.beat * B + 7, x1: (n.beat + n.d) * B - 7, y: -n.p * S, note: n }));
      this.startPlat = { x0: -st.beats * B, x1: -7, y: -st.p * S, note: { style: st.style, p: st.p } };
      this.ch = { x: this.startPlat.x1 - 34, y: this.startPlat.y, plat: -1, jump: null, phase: 0, moving: false };
      this.camX = this.ch.x - 220; this.t = 0;
      this.bird = { x: this.ch.x, y: this.ch.y - 70 };
      this.markD = null; this.oops = -9;
      this.resize();
    }
    plat(i) { return i < 0 ? this.startPlat : this.plats[i]; }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = this.cv.getBoundingClientRect();
      const w = Math.max(50, r.width), h = Math.max(50, r.height);
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
      this.scale = Math.min(w / 540, h / 470);
      this.W = w / this.scale; this.H = h / this.scale; this.px = dpr * this.scale;
      this.gy = this.H <= 540 ? this.H - 62 : this.H - 62 - (this.H - 540) * 0.3;
    }

    step(now, dt) {
      const run = this.run, ch = this.ch, st = run.state;
      this.t += dt;
      for (const e of run.events.splice(0)) {
        if (e.type === 'hit') {
          const to = this.plat(e.i), up = to.y < ch.y - 2, same = Math.abs(to.y - ch.y) <= 2;
          ch.jump = { fromX: ch.x, fromY: ch.y, k: 0, dur: 0.24, arc: up ? 34 : same ? 20 : 12 };
          ch.plat = e.i;
        } else if (e.type === 'miss') this.oops = this.t;
      }
      const p = this.plat(ch.plat);
      let want = ch.x;
      if (st === 'sing' || st === 'landed') want = run.playheadBeat(now) * B;
      const lo = ch.plat < 0 ? p.x0 + 40 : p.x0 + 16;
      want = clamp(want, lo, p.x1 - 16);
      if (ch.jump) {
        const j = ch.jump; j.k += dt / j.dur;
        const k = Math.min(1, j.k);
        ch.x = j.fromX + (want - j.fromX) * ease(k);
        ch.y = j.fromY + (p.y - j.fromY) * k - j.arc * 4 * k * (1 - k);
        if (k >= 1) { ch.jump = null; ch.y = p.y; }
        ch.moving = true;
      } else {
        const dx = clamp(want - ch.x, -420 * dt, 420 * dt);
        ch.x += dx; ch.y = p.y; ch.moving = Math.abs(dx) > 0.2;
      }
      if (ch.moving) ch.phase += dt * 2.6;
      else ch.phase += dt * 0.5;

      // הציפור שמראה את המסלול בזמן הדוגמה
      if (st === 'listen') {
        const b = run.listenBeat(now), seg = run.seg, first = this.plat(seg.from), last = this.plat(seg.to);
        let ty = first.y;
        for (let k = seg.from; k <= seg.to; k++) if (run.level.notes[k].beat <= b) ty = this.plats[k].y;
        this.demoIdx = -1;
        for (let k = seg.from; k <= seg.to; k++) { const n = run.level.notes[k]; if (b >= n.beat && b < n.beat + n.d) this.demoIdx = k; }
        const bx = clamp(b * B + 20, first.x0 - 40, last.x1 - 10);
        this.bird.x += (bx - this.bird.x) * Math.min(1, dt * 12);
        this.bird.y += (ty - 34 - this.bird.y) * Math.min(1, dt * 16);
      } else {
        this.demoIdx = -1;
        this.bird.x += (ch.x - 26 - this.bird.x) * Math.min(1, dt * 4);
        this.bird.y += (ch.y - 86 + Math.sin(this.t * 3) * 5 - this.bird.y) * Math.min(1, dt * 4);
      }

      let camT;
      if (st === 'finale' || st === 'done') camT = ch.x - this.W / 2;
      else if (st === 'listen') camT = this.bird.x - this.W * 0.42;
      else camT = ch.x - this.W * 0.3;
      this.camX += (camT - this.camX) * Math.min(1, dt * 3.2);
    }

    draw(now) {
      const c = this.c, run = this.run, st = run.state, ch = this.ch, W = this.W, H = this.H, gy = this.gy, song = this.song, L = run.level;
      c.setTransform(this.px, 0, 0, this.px, 0, 0);
      (R.backdrops[song.backdrop] || R.backdrops.morning)(c, W, H, gy, this.camX, this.t);

      const ft = st === 'finale' ? now - run.finaleAt : st === 'done' ? 99 : -1;
      c.save();
      if (ft >= 0) {
        // זום אל הדמות, ומרימים אותה מעל כפתורי הסיום
        const z = R.finaleZoom(ft), e = (z - 1) / 1.5;
        c.translate(W / 2, gy + (Math.min(gy, H * 0.56) - gy) * e); c.scale(z, z); c.translate(-W / 2, -gy);
      }
      c.translate(-this.camX, gy);
      const vx0 = this.camX - 200, vx1 = this.camX + W + 200;

      (song.zones || []).forEach((z) => { if (R.zones[z.type] && z.to * B > vx0 - 200 && z.from * B < vx1 + 200) R.zones[z.type](c, z, this); });
      (song.props || []).forEach((pr) => { if (R.props[pr.type] && pr.beat * B > vx0 - 200 && pr.beat * B < vx1 + 200) R.props[pr.type](c, pr, this); });

      // קרקע
      c.fillStyle = '#7cc45c'; c.fillRect(vx0, 0, vx1 - vx0, 16);
      c.fillStyle = '#b98556'; c.fillRect(vx0, 14, vx1 - vx0, H);

      // משטחים
      const all = [this.startPlat].concat(this.plats);
      for (const p of all) {
        if (p.x1 < vx0 || p.x0 > vx1) continue;
        (PS[p.note.style] || PS.stone)(c, p);
      }
      for (const p of this.plats) {
        if (p.x1 < vx0 || p.x0 > vx1) continue;
        if (p.note.prop && R.props[p.note.prop]) R.props[p.note.prop](c, p, this);
      }

      // הדגשת המסלול של המשפט הנוכחי
      if (run.seg && (st === 'listen' || st === 'cue' || st === 'sing' || st === 'wait')) {
        c.setLineDash([3, 9]); c.lineWidth = 3.5; c.lineCap = 'round';
        for (let k = Math.max(run.seg.from, run.pending); k <= run.seg.to; k++) {
          const a = this.plat(k === run.pending ? run.onNote : k - 1), b = this.plats[k];
          const ax = k === run.pending ? clamp(ch.x, a.x0, a.x1) : (a.x0 + a.x1) / 2, bx = (b.x0 + b.x1) / 2;
          c.strokeStyle = 'rgba(255,255,255,.85)';
          c.beginPath(); c.moveTo(ax, a.y - 8);
          c.quadraticCurveTo((ax + bx) / 2, Math.min(a.y, b.y) - 46, bx, b.y - 8); c.stroke();
        }
        c.setLineDash([]);
        for (let k = run.seg.from; k <= run.seg.to; k++) {
          const p = this.plats[k], demo = k === this.demoIdx, target = k === run.pending && (st === 'sing' || st === 'cue' || st === 'wait');
          if (!demo && !target) continue;
          const pulse = 0.6 + 0.4 * Math.sin(this.t * 9);
          c.save();
          c.shadowColor = demo ? '#ffe45c' : '#ffffff'; c.shadowBlur = 18;
          c.strokeStyle = demo ? '#ffd21f' : `rgba(255,255,255,${pulse})`; c.lineWidth = demo ? 6 : 4;
          rr(c, p.x0 - 5, p.y - 5, p.x1 - p.x0 + 10, 26, 11); c.stroke();
          c.restore();
        }
      }

      // הציפור המנחה
      if (ft < 0) {
      const bd = this.bird, flap = Math.sin(this.t * 22) * 6;
      c.fillStyle = '#ffcf33'; circle(c, bd.x, bd.y, 9); c.fill();
      c.fillStyle = '#f2b100'; c.beginPath(); c.ellipse(bd.x - 4, bd.y - 2 + flap * 0.3, 8, 4 + Math.abs(flap) * 0.4, -0.5, 0, 6.2832); c.fill();
      c.fillStyle = '#ff8a2e'; c.beginPath(); c.moveTo(bd.x + 8, bd.y - 2); c.lineTo(bd.x + 16, bd.y + 1); c.lineTo(bd.x + 8, bd.y + 3); c.fill();
      c.fillStyle = '#333'; circle(c, bd.x + 4, bd.y - 3, 1.5); c.fill();
      }

      // הדמות
      const p = this.plat(ch.plat);
      if (ft >= 0) (R.finales[song.finale] || R.finales.tornPants)(this, c, ft);
      else {
        let pose = ch.jump ? 'jump' : ch.moving ? 'run' : 'idle';
        const underCrawl = p.note.crawl && ch.x < p.x1 + 6 && (!ch.jump || ch.jump.k > 0.45);
        if (underCrawl) pose = 'crawl';
        const o = {};
        if (st === 'wait') o.bubble = '?';
        else if (st === 'listen') o.bubble = '♪';
        if (this.t - this.oops < 0.5) o.mood = 'wow';
        R.drawKid(c, ch.x, ch.y, pose, ch.phase, o);
      }

      // מכשולי זחילה מצוירים מעל הדמות
      for (const pl of this.plats) {
        if (pl.x1 < vx0 || pl.x0 > vx1) continue;
        if (pl.note.crawl && R.crawls[pl.note.crawl]) R.crawls[pl.note.crawl](c, pl, this);
      }

      // סימון גובה הקול ליד המשטח הבא
      if ((st === 'sing' || st === 'cue' || st === 'wait') && run.pending < L.notes.length) {
        const tp = this.plats[run.pending], mx = tp.x0 - 16, sy = tp.y - 12, tol = run.cfg.toleranceSemis;
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; circle(c, mx, sy, 11); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
        if (run.diff != null) {
          const d = clamp(run.diff, -7, 7);
          this.markD = this.markD == null ? d : this.markD + (d - this.markD) * 0.4;
          const ok = Math.abs(run.diff) <= tol, my = sy - this.markD * S;
          c.strokeStyle = 'rgba(255,255,255,.6)'; c.setLineDash([2, 6]); c.lineWidth = 2; line(c, mx, my, mx, sy); c.setLineDash([]);
          c.fillStyle = ok ? '#2fd07a' : '#ff9f1c'; circle(c, mx, my, 8.5); c.fill();
          c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke();
          if (!ok) { // חץ: לאן להתקרב
            const dir = run.diff < 0 ? -1 : 1; // קול נמוך מדי → חץ למעלה
            c.fillStyle = '#fff';
            c.beginPath(); c.moveTo(mx, my + dir * 24); c.lineTo(mx - 8, my + dir * 13); c.lineTo(mx + 8, my + dir * 13); c.closePath(); c.fill();
          } else if (st === 'sing') {
            c.strokeStyle = '#2fd07a'; c.lineWidth = 4;
            c.beginPath(); c.arc(mx, sy, 15, -1.57, -1.57 + 6.2832 * clamp(run.stable / run.cfg.holdSec, 0, 1)); c.stroke();
          }
        } else this.markD = null;
      }
      c.restore();
    }
  };
})();
