/* זיהוי גובה קול מקומי בדפדפן (אלגוריתם YIN על אות המיקרופון). שום דבר לא נשלח או מוקלט. */
(function () {
  const SG = (window.SG = window.SG || {});
  let dBuf = null;

  function detect(buf, sr) {
    const n = buf.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.01) return { freq: null, rms, clarity: 0 };
    const tauMin = Math.max(2, Math.floor(sr / 1100));
    const tauMax = Math.min(Math.floor(sr / 70), n >> 1);
    const W = n - tauMax;
    if (!dBuf || dBuf.length < tauMax + 2) dBuf = new Float32Array(tauMax + 2);
    const d = dBuf;
    let run = 0;
    d[0] = 1;
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let j = 0; j < W; j += 2) { const x = buf[j] - buf[j + tau]; s += x * x; }
      run += s;
      d[tau] = run > 0 ? (s * tau) / run : 1;
    }
    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (d[t] < 0.15) { while (t + 1 < tauMax && d[t + 1] < d[t]) t++; tau = t; break; }
    }
    if (tau < 0) {
      let m = 1, mi = -1;
      for (let t = tauMin; t < tauMax; t++) if (d[t] < m) { m = d[t]; mi = t; }
      if (mi < 0 || m > 0.3) return { freq: null, rms, clarity: 1 - m };
      tau = mi;
    }
    let ti = tau;
    if (tau > 1 && tau < tauMax) {
      const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a - 2 * b + c;
      if (den !== 0) ti = tau + (a - c) / (2 * den);
    }
    return { freq: sr / ti, rms, clarity: 1 - d[tau] };
  }

  const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // נקרא רק מתוך לחיצה מפורשת של המשתמש
  async function openMic(ctx) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('unsupported');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      video: false,
    });
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an); // לא מחובר לרמקולים
    const buf = new Float32Array(an.fftSize);
    let open = true;
    return {
      kind: 'mic',
      stream,
      read() {
        if (!open) return { midi: null, rms: 0 };
        an.getFloatTimeDomainData(buf);
        const r = detect(buf, ctx.sampleRate);
        return { midi: r.freq ? freqToMidi(r.freq) : null, rms: r.rms, clarity: r.clarity };
      },
      stop() { // שחרור המיקרופון
        if (!open) return;
        open = false;
        stream.getTracks().forEach((t) => t.stop());
        try { src.disconnect(); } catch (e) {}
      },
      isOpen: () => open,
    };
  }

  SG.Pitch = { detect, freqToMidi, midiToFreq, openMic };
})();
