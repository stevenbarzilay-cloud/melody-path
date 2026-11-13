/* לוגיקת המשחק: מכונת מצבים של „שומעים ואז שרים”. ללא DOM וללא ציור,
   כך שאפשר להריץ אותה גם בבדיקות. מקבלת שעון (שניות) ודגימת גובה קול בכל פריים.
   מצבים: idle → listen → cue → sing → landed → (listen הבא | finale → done), ו-wait אחרי פספוס. */
(function () {
  const SG = (window.SG = window.SG || {});

  SG.defaults = {
    toleranceSemis: 1.5, // מרווח סלחני בגובה (חצאי טונים, בכל אוקטבה)
    holdSec: 0.11,       // כמה זמן הצליל צריך להיות יציב כדי להפעיל תנועה
    earlyBeats: 0.22,    // אפשר להקדים
    lateBeats: 0.3,      // ואפשר לאחר
    cueBeats: 4,         // צליל פתיחה + ספירה
    listenLead: 0.35,
  };

  // הפרש בחצאי טונים מקופל לאוקטבה הקרובה: ‎-6..6
  SG.fold = function (d) {
    d = ((d % 12) + 12) % 12;
    return d > 6 ? d - 12 : d;
  };

  SG.buildLevel = function (song) {
    const notes = [], phrases = [];
    let beat = 0, minP = Infinity, maxP = -Infinity;
    song.phrases.forEach((ph, pi) => {
      const first = notes.length, startBeat = beat;
      ph.notes.forEach((n) => {
        notes.push({ i: notes.length, phrase: pi, p: n.p, d: n.d, beat, style: n.style || ph.style, crawl: n.crawl || null, prop: n.prop || null, flag: n.flag || null, fx: n.fx || null });
        beat += n.d + (n.rest || 0);
        minP = Math.min(minP, n.p); maxP = Math.max(maxP, n.p);
      });
      phrases.push({ first, last: notes.length - 1, startBeat, endBeat: beat });
    });
    return { notes, phrases, totalBeats: beat, minP, maxP };
  };

  // בחירת סולם לפי תו נוח שהילד זמזם: ממקמים את אמצע הטווח של כל השלב על התו הזה
  SG.pickTonic = function (song, hummedMidi) {
    const L = SG.buildLevel(song);
    let t = Math.round(hummedMidi - (L.minP + L.maxP) / 2);
    const [lo, hi] = song.tonicRange;
    while (t < lo) t += 12;
    while (t > hi) t -= 12;
    return t;
  };

  SG.Run = class {
    constructor(song, o) {
      this.song = song;
      this.level = SG.buildLevel(song);
      this.audio = o.audio;
      this.tonic = o.tonic != null ? o.tonic : song.defaultTonic;
      this.cfg = Object.assign({}, SG.defaults, song.tuning || {});
      this.spb = 60 / song.bpm;
      this.beatOn = o.beatOn !== false;
      this.state = 'idle';
      this.onNote = -1;   // המשטח שהדמות עומדת עליו (‎-1 = משטח ההתחלה)
      this.pending = 0;   // התו הבא שצריך לשיר
      this.seg = null;
      this.flags = {};
      this.hitAt = [];
      this.events = [];
      this.stable = 0;
      this.diff = null;
      this.lastNow = null;
      this.misses = 0;
    }

    // מקור אמת יחיד לגובה: גם הדוגמה המנוגנת וגם הזיהוי משתמשים בו
    midiOf(i) { return this.tonic + this.level.notes[i].p; }
    targetMidi() { return this.pending < this.level.notes.length ? this.midiOf(this.pending) : null; }

    start(now) { this.beginListen(now, 0); }

    beginListen(now, from) {
      const L = this.level, n0 = L.notes[from], ph = L.phrases[n0.phrase];
      this.audio.cancel();
      this.seg = { from, to: ph.last, phrase: n0.phrase };
      this.pending = from;
      this.stable = 0;
      this.state = 'listen';
      this.t0 = now + this.cfg.listenLead;
      for (let k = from; k <= ph.last; k++) {
        const n = L.notes[k];
        this.audio.guide(this.midiOf(k), this.t0 + (n.beat - n0.beat) * this.spb, n.d * this.spb);
      }
      const last = L.notes[ph.last];
      this.listenEnd = this.t0 + (last.beat + last.d - n0.beat + 0.25) * this.spb;
    }

    beginCue(now) {
      this.audio.cancel();
      this.seg.from = this.pending;
      this.state = 'cue';
      this.stable = 0;
      const tc = now + 0.08, cb = this.cfg.cueBeats;
      this.cueAt = tc;
      this.audio.guide(this.midiOf(this.pending), tc, 0.9 * this.spb); // צליל הפתיחה שוב
      this.audio.tick(tc + (cb - 2) * this.spb, 'count');
      this.audio.tick(tc + (cb - 1) * this.spb, 'count');
      this.singStart = tc + cb * this.spb;
      this.nextTickBeat = 0;
    }

    hearAgain(now) {
      if (this.state === 'idle' || this.state === 'finale' || this.state === 'done') return;
      if (this.pending >= this.level.notes.length) return;
      this.beginListen(now, this.pending);
    }

    retry(now) { if (this.state === 'wait') this.beginCue(now); }

    canChangeKey() { return this.state === 'listen' || this.state === 'cue' || this.state === 'wait' || this.state === 'idle'; }

    setTonic(tonic, now) {
      if (!this.canChangeKey()) return false;
      this.tonic = tonic;
      if (this.state !== 'idle') this.beginListen(now, this.pending);
      return true;
    }

    segStartBeat() { return this.level.notes[this.seg.from].beat; }
    playheadBeat(now) { return this.segStartBeat() + (now - this.singStart) / this.spb; }
    listenBeat(now) { return this.segStartBeat() + (now - this.t0) / this.spb; }

    // לתצוגה: 'cue' בזמן צליל הפתיחה, ואז 1, 2
    countdown(now) {
      if (this.state !== 'cue') return null;
      const left = (this.singStart - now) / this.spb;
      return left > 2 ? 'cue' : left > 1 ? 1 : 2;
    }

    update(now, sample) {
      const gap = this.lastNow == null ? 0 : now - this.lastNow;
      const dt = Math.min(0.1, gap);
      this.lastNow = now;
      const L = this.level, c = this.cfg;
      const tgt = this.targetMidi();
      this.diff = sample && sample.midi != null && tgt != null ? SG.fold(sample.midi - tgt) : null;

      switch (this.state) {
        case 'listen':
          if (now >= this.listenEnd) this.beginCue(now);
          break;
        case 'cue':
          if (now >= this.singStart - c.earlyBeats * this.spb) this.state = 'sing';
          break;
        case 'sing': {
          if (gap > 0.5) { this.toWait(now, false); break; } // הלשונית הוסתרה באמצע
          this.scheduleTicks(now);
          const n = L.notes[this.pending], tb = this.playheadBeat(now);
          if (tb < n.beat - c.earlyBeats) { this.stable = 0; break; }
          if (this.diff != null && Math.abs(this.diff) <= c.toleranceSemis) this.stable += dt;
          else this.stable = Math.max(0, this.stable - 2 * dt);
          if (this.stable >= c.holdSec) this.hit(now);
          else if (tb > n.beat + n.d + c.lateBeats) this.toWait(now, true);
          break;
        }
        case 'landed':
          if (now >= this.landedUntil) {
            if (this.pending >= L.notes.length) {
              this.state = 'finale';
              this.finaleAt = now;
              this.audio.fx('fanfare', now + 2.2, { tonic: this.tonic });
            } else this.beginListen(now, this.pending);
          }
          break;
        case 'finale':
          if (now - this.finaleAt >= 5.2) this.state = 'done';
          break;
      }
    }

    scheduleTicks(now) {
      const last = this.level.notes[this.seg.to];
      const segBeats = last.beat + last.d - this.segStartBeat();
      while (this.nextTickBeat < segBeats) {
        const t = this.singStart + this.nextTickBeat * this.spb;
        if (t > now + 0.12) break;
        if (this.beatOn && t >= now - 0.03) this.audio.tick(Math.max(t, now), 'beat');
        this.nextTickBeat++;
      }
    }

    hit(now) {
      const L = this.level, i = this.pending, n = L.notes[i];
      this.hitAt[i] = now;
      this.onNote = i;
      this.events.push({ type: 'hit', i });
      this.audio.tick(now, 'hop');
      if (n.flag) this.flags[n.flag] = true;
      if (n.fx) this.audio.fx(n.fx, now + 0.18, { tonic: this.tonic });
      this.pending++;
      this.stable = 0;
      if (this.pending > this.seg.to) {
        this.state = 'landed';
        const noteEnd = this.singStart + (n.beat + n.d - this.segStartBeat()) * this.spb;
        this.landedUntil = Math.max(now + 0.7, noteEnd) + (n.fx ? 0.7 : 0);
      }
    }

    toWait(now, missed) {
      this.state = 'wait';
      this.stable = 0;
      if (missed) {
        this.misses++;
        this.events.push({ type: 'miss', i: this.pending });
        this.audio.fx('miss', now);
      }
    }
  };
})();
