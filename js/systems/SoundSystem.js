// SoundSystem — Motor, Regen, Wind, Kollision via WebAudio API

export class SoundSystem {
  constructor() {
    this._ctx       = null;
    this._master    = null;
    this._engGain   = null;
    this._engOsc    = null;
    this._engFilter = null;
    this._rainGain  = null;
    this._windGain  = null;
    this._windOsc   = null;
    this._waterGain = null;
    this._ready     = false;

    // Lazy init bei erster User-Interaktion (Browser-Autoplay-Policy)
    const init = () => { this._init(); };
    document.addEventListener('keydown', init, { once: true });
    document.addEventListener('click',   init, { once: true });
  }

  // ── Initialisierung ────────────────────────────────────────────────────────
  _init() {
    if (this._ready) return;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.32;
      this._master.connect(this._ctx.destination);

      // ── Motor: Sägezahn → Verzerrer → Tiefpass ──────────────────────────
      this._engGain = this._ctx.createGain();
      this._engGain.gain.value = 0;
      this._engGain.connect(this._master);

      this._engOsc  = this._ctx.createOscillator();
      this._engOsc.type = 'sawtooth';
      this._engOsc.frequency.value = 48;

      const dist = this._ctx.createWaveShaper();
      dist.curve = this._distCurve(40);
      dist.oversample = '4x';

      this._engFilter = this._ctx.createBiquadFilter();
      this._engFilter.type = 'lowpass';
      this._engFilter.frequency.value = 200;
      this._engFilter.Q.value = 2.2;

      this._engOsc.connect(dist);
      dist.connect(this._engFilter);
      this._engFilter.connect(this._engGain);
      this._engOsc.start();

      // ── Regen: Weißes Rauschen → Bandpass ────────────────────────────────
      this._rainGain = this._ctx.createGain();
      this._rainGain.gain.value = 0;
      this._rainGain.connect(this._master);

      const bufLen  = this._ctx.sampleRate * 3;
      const nBuf    = this._ctx.createBuffer(1, bufLen, this._ctx.sampleRate);
      const nData   = nBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) nData[i] = Math.random() * 2 - 1;

      const nSrc = this._ctx.createBufferSource();
      nSrc.buffer = nBuf;
      nSrc.loop   = true;

      const rainBP = this._ctx.createBiquadFilter();
      rainBP.type  = 'bandpass';
      rainBP.frequency.value = 1100;
      rainBP.Q.value = 0.45;

      nSrc.connect(rainBP);
      rainBP.connect(this._rainGain);
      nSrc.start();

      // ── Wind: Sinus → Bandpass ────────────────────────────────────────────
      this._windGain = this._ctx.createGain();
      this._windGain.gain.value = 0;
      this._windGain.connect(this._master);

      this._windOsc = this._ctx.createOscillator();
      this._windOsc.type = 'sine';
      this._windOsc.frequency.value = 72;

      const windBP = this._ctx.createBiquadFilter();
      windBP.type  = 'bandpass';
      windBP.frequency.value = 320;
      windBP.Q.value = 0.65;

      this._windOsc.connect(windBP);
      windBP.connect(this._windGain);
      this._windOsc.start();

      // ── Wasserrauschen (Rumpf) ────────────────────────────────────────────
      this._waterGain = this._ctx.createGain();
      this._waterGain.gain.value = 0;
      this._waterGain.connect(this._master);

      const wBuf  = this._ctx.createBuffer(1, bufLen, this._ctx.sampleRate);
      const wData = wBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) wData[i] = Math.random() * 2 - 1;

      const wSrc = this._ctx.createBufferSource();
      wSrc.buffer = wBuf;
      wSrc.loop   = true;

      const waterLP = this._ctx.createBiquadFilter();
      waterLP.type  = 'lowpass';
      waterLP.frequency.value = 600;

      wSrc.connect(waterLP);
      waterLP.connect(this._waterGain);
      wSrc.start();

      this._ready = true;
    } catch (e) {
      console.warn('SoundSystem init failed:', e);
    }
  }

  // ── Frame-Update ──────────────────────────────────────────────────────────
  update(telegraphLevel, speed, weatherSystem) {
    if (!this._ready) return;
    const now = this._ctx.currentTime;
    const abs = Math.abs(telegraphLevel);
    const spd = Math.abs(speed ?? 0);

    // Motor: Frequenz + Lautstärke abhängig von Telegraph
    const engFreq = 42 + abs * 32;
    const engVol  = abs > 0 ? 0.10 + abs * 0.038 : 0.008;
    const cutoff  = 110 + abs * 110;
    this._engOsc.frequency.setTargetAtTime(engFreq, now, 0.5);
    this._engFilter.frequency.setTargetAtTime(cutoff, now, 0.5);
    this._engGain.gain.setTargetAtTime(engVol, now, 0.35);

    // Wasser am Rumpf: abhängig von Geschwindigkeit
    const waterVol = Math.min(0.08, spd * 0.004);
    this._waterGain.gain.setTargetAtTime(waterVol, now, 0.8);

    // Wetter-abhängige Sounds
    if (weatherSystem) {
      const rainVol = weatherSystem.isRaining ? 0.09 : 0;
      this._rainGain.gain.setTargetAtTime(rainVol, now, 3.0);

      const wSpd = weatherSystem.windSpeed;
      const windVol = wSpd > 2.5 ? (wSpd - 2.5) * 0.012 : 0;
      this._windGain.gain.setTargetAtTime(windVol, now, 2.5);
      if (this._windOsc) {
        this._windOsc.frequency.setTargetAtTime(58 + wSpd * 7, now, 1.5);
      }
    }
  }

  // ── Einzeleffekte ─────────────────────────────────────────────────────────
  playCollision(speed) {
    if (!this._ready || speed < 0.5) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = Math.max(35, 110 - speed * 4);
    gain.gain.value = Math.min(0.35, speed * 0.035);
    gain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.22);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.55);
  }

  playHorn() {
    if (!this._ready) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    gain.gain.value = 0.38;
    gain.gain.setTargetAtTime(0, this._ctx.currentTime + 1.8, 0.25);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 2.5);
  }

  playDocking() {
    if (!this._ready) return;
    // Metallisches Quietschen beim Anlegen
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 280;
    osc.frequency.linearRampToValueAtTime(180, this._ctx.currentTime + 0.4);
    gain.gain.value = 0.15;
    gain.gain.setTargetAtTime(0, this._ctx.currentTime + 0.3, 0.1);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.6);
  }

  _distCurve(amount) {
    const n = 256;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return c;
  }
}
