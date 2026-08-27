// WeatherSystem — Wind, Regen, Nebel, Sturm

const BASE_FOG = 0.000085;

const STATES = {
  clear:    { id:'clear',    label:'Sonnig ☀️',    fogMult:1.0,  windMax:1.5,  rain:false, waveAmp:0.9  },
  overcast: { id:'overcast', label:'Bewölkt 🌥️',  fogMult:1.8,  windMax:4.5,  rain:false, waveAmp:1.1  },
  rain:     { id:'rain',     label:'Regen 🌧️',    fogMult:3.2,  windMax:7.0,  rain:true,  waveAmp:1.5  },
  fog:      { id:'fog',      label:'Nebel 🌫️',    fogMult:11.0, windMax:1.5,  rain:false, waveAmp:0.7  },
  storm:    { id:'storm',    label:'Sturm ⛈️',    fogMult:5.5,  windMax:13.0, rain:true,  waveAmp:2.2  },
};

export class WeatherSystem {
  constructor(scene) {
    this.scene         = scene;
    this._state        = STATES.clear;
    this._nextChange   = 150;
    this._windDir      = 0.8;
    this._windStrength = 0.5;
    this._fogTarget    = BASE_FOG;
    this._fogCurrent   = BASE_FOG;
    this._rainEl       = null;

    this._buildOverlay();
    this._applyState(STATES.clear, true);
  }

  // ── Öffentliche Eigenschaften ──────────────────────────────────────────────
  get windX()        { return Math.sin(this._windDir) * this._windStrength; }
  get windZ()        { return Math.cos(this._windDir) * this._windStrength; }
  get windSpeed()    { return this._windStrength; }
  get label()        { return this._state.label; }
  get isRaining()    { return this._state.rain; }
  get waveAmplitude(){ return this._state.waveAmp; }
  get stateId()      { return this._state.id; }

  // ── Update ─────────────────────────────────────────────────────────────────
  update(dt) {
    this._nextChange -= dt;
    if (this._nextChange <= 0) {
      this._randomTransition();
      this._nextChange = 90 + Math.random() * 180;
    }

    // Wind langsam drehen
    this._windDir += (Math.random() - 0.5) * 0.002;

    // Fog smooth
    if (this.scene.fog) {
      this._fogCurrent += (this._fogTarget - this._fogCurrent) * Math.min(1, dt * 0.25);
      this.scene.fog.density = this._fogCurrent;
    }

    // Regen
    if (this._rainEl) {
      this._rainEl.style.opacity = this._state.rain ? '1' : '0';
    }
  }

  // Wetter sofort setzen (Debug/Start)
  setWeather(id) {
    if (STATES[id]) this._applyState(STATES[id], false);
  }

  // ── Interne Methoden ───────────────────────────────────────────────────────
  _randomTransition() {
    const keys = Object.keys(STATES);
    // Wetter-Wahrscheinlichkeiten: klar + bewölkt häufiger
    const weighted = ['clear','clear','clear','overcast','overcast','rain','rain','fog','storm'];
    const nextId   = weighted[Math.floor(Math.random() * weighted.length)];
    const prevState = this._state.id;
    this._applyState(STATES[nextId], false);
    return prevState !== nextId ? STATES[nextId].label : null;
  }

  _applyState(state, instant) {
    this._state      = state;
    this._fogTarget  = BASE_FOG * state.fogMult;
    this._windStrength = state.windMax * (0.25 + Math.random() * 0.75);
    this._windDir    = Math.random() * Math.PI * 2;
    if (instant) {
      this._fogCurrent = this._fogTarget;
      if (this.scene.fog) this.scene.fog.density = this._fogCurrent;
    }
  }

  _buildOverlay() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rain-shift {
        from { background-position: 0 0; }
        to   { background-position: -5px 150px; }
      }
      #weather-rain-overlay {
        position:fixed; inset:0; pointer-events:none; z-index:4;
        opacity:0; transition:opacity 5s ease;
        background: repeating-linear-gradient(
          168deg,
          transparent 0px, transparent 5px,
          rgba(150,195,255,0.055) 5px, rgba(150,195,255,0.055) 6px
        );
        background-size: 5px 150px;
        animation: rain-shift 0.3s linear infinite;
      }
    `;
    document.head.appendChild(style);

    this._rainEl = document.createElement('div');
    this._rainEl.id = 'weather-rain-overlay';
    document.body.appendChild(this._rainEl);
  }
}
