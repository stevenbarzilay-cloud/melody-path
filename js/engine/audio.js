/* סינתזה: קסילופון לדוגמה, פעמה שקטה, ספירה ואפקטים. הכול מנוגן מתוך נתוני התווים. */
(function () {
  const SG = (window.SG = window.SG || {});
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  SG.Audio = class {
    constructor() {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.live = new Set();
      this.pitched = []; // מרווחי זמן שבהם מתנגן צליל בעל גובה
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      this.voiceOsc = null;
    }
    now() { return this.ctx.currentTime; }
    resume() { return this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve(); }

    _track(node, g) {
      const rec = { node, g };
      this.live.add(rec);
      node.onended = () => { this.live.delete(rec); try { g.disconnect(); } catch (e) {} };
    }
    _tone(freq, when, dur, peak, type, decay) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, when + (decay || dur));
      o.connect(g); g.connect(this.master);
      o.start(when); o.stop(when + (decay || dur) + 0.03);
      this._track(o, g);
    }
    _noise(when, dur, peak, freq, q) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise;
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
      g.gain.setValueAtTime(peak, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(when); s.stop(when + dur + 0.02);
      this._track(s, g);
      return f;
    }
    _markPitched(a, b) {
      const t = this.now();
      this.pitched = this.pitched.filter((p) => p[1] > t - 1);
      this.pitched.push([a, b]);
    }

    // תו קסילופון של המלודיה המנחה
    guide(midi, when, dur) {
      const f = mtof(midi), ring = Math.min(1.1, Math.max(0.45, dur * 1.1));
      this._tone(f, when, ring, 0.5, 'sine', ring);
      this._tone(f * 4, when, 0.22, 0.12, 'sine', 0.22);
      this._tone(f * 2, when, 0.3, 0.05, 'triangle', 0.3);
      this._markPitched(when, when + Math.min(ring, 0.7));
    }
    tick(when, kind) {
      when = Math.max(when, this.now());
      if (kind === 'count') this._noise(when, 0.06, 0.6, 1800, 6);
      else if (kind === 'hop') this._noise(when, 0.09, 0.18, 700, 0.8);
      else this._noise(when, 0.035, 0.1, 1100, 5); // הפעמה השקטה בזמן השירה
    }
    fx(name, when, o) {
      when = Math.max(when, this.now());
      const tonic = (o && o.tonic) || 62;
      if (name === 'miss') {
        this._tone(mtof(64), when, 0.16, 0.16, 'triangle');
        this._tone(mtof(60), when + 0.17, 0.25, 0.16, 'triangle');
        this._markPitched(when, when + 0.45);
      } else if (name === 'chirp') {
        for (let i = 0; i < 5; i++) this._tone(2600 + (i % 2) * 500, when + i * 0.11, 0.07, 0.12, 'sine');
        this._markPitched(when, when + 0.65);
      } else if (name === 'rip') {
        const f = this._noise(when, 0.32, 0.5, 900, 1.2);
        f.frequency.exponentialRampToValueAtTime(3800, when + 0.3);
      } else if (name === 'fanfare') {
        [0, 4, 7, 12].forEach((p, i) => this.guide(tonic + p, when + i * 0.16, 0.5));
      }
    }
    // גובה-קול רציף במצב הדגמה (ה„קול” של המקלדת)
    voice(midi) {
      const c = this.ctx;
      if (midi == null) {
        if (this.voiceOsc) {
          const { o, g } = this.voiceOsc;
          g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
          o.stop(c.currentTime + 0.2);
          this.voiceOsc = null;
        }
        return;
      }
      if (!this.voiceOsc) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle';
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.14, c.currentTime, 0.02);
        o.connect(g); g.connect(this.master);
        o.start();
        this.voiceOsc = { o, g };
      }
      this.voiceOsc.o.frequency.setTargetAtTime(mtof(midi), c.currentTime, 0.01);
    }
    // האם הדוגמה (או אפקט בעל גובה) נשמעת כרגע: בזמן הזה מתעלמים מהמיקרופון
    guideSounding() {
      const t = this.now();
      return this.pitched.some((p) => t >= p[0] - 0.03 && t <= p[1] + 0.12);
    }
    cancel() {
      const t = this.now();
      this.live.forEach((r) => {
        try { r.g.gain.cancelScheduledValues(t); r.g.gain.setValueAtTime(0.0001, t); r.node.stop(t + 0.01); } catch (e) {}
      });
      this.live.clear();
      this.pitched = [];
    }
  };

  // מקור „גובה קול” של מצב ההדגמה: מקלדת או כפתורי מסך
  SG.DemoInput = class {
    constructor(audio) { this.kind = 'demo'; this.audio = audio; this.held = new Map(); this.getTarget = () => null; this.keys = []; this.tonic = () => 60; }
    press(id) { this.held.delete(id); this.held.set(id, true); }
    release(id) { this.held.delete(id); }
    releaseAll() { this.held.clear(); }
    current() {
      const ids = [...this.held.keys()];
      if (!ids.length) return null;
      const id = ids[ids.length - 1];
      if (id === 'target') return this.getTarget();
      return this.tonic() + this.keys[id];
    }
    read() {
      const midi = this.current();
      this.audio.voice(midi);
      return { midi, rms: midi == null ? 0 : 0.2 };
    }
    stop() { this.held.clear(); this.audio.voice(null); }
  };
})();
