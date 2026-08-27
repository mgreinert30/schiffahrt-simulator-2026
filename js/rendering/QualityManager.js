// QualityManager — Grafik-Qualitätsstufen
export const PRESETS = {
  low: {
    waterSegments: 80,
    shadowMapSize: 512,
    shadowSoft:    false,
    vegetation:    false,
    bloom:         false,
    postprocess:   false,
    fogDensity:    0.00050,
    waveScale:     0.55,
    pixelRatio:    1.0,
    drawDistance:  3500,
  },
  medium: {
    waterSegments: 160,
    shadowMapSize: 1024,
    shadowSoft:    true,
    vegetation:    true,
    bloom:         true,
    postprocess:   true,
    fogDensity:    0.00022,
    waveScale:     0.85,
    pixelRatio:    Math.min(window.devicePixelRatio, 1.5),
    drawDistance:  6000,
  },
  high: {
    waterSegments: 256,
    shadowMapSize: 2048,
    shadowSoft:    true,
    vegetation:    true,
    bloom:         true,
    postprocess:   true,
    fogDensity:    0.00016,
    waveScale:     1.0,
    pixelRatio:    Math.min(window.devicePixelRatio, 2.0),
    drawDistance:  9000,
  },
};

export class QualityManager {
  constructor(initial = 'medium') {
    // Auto-Erkennung: Mobile → Low, Mid-Range → Medium, High-End → High
    if (/Mobi/i.test(navigator.userAgent)) initial = 'low';

    this.quality  = initial;
    this.settings = PRESETS[initial];
  }

  get name()           { return this.quality; }
  get waterSegments()  { return this.settings.waterSegments; }
  get shadowMapSize()  { return this.settings.shadowMapSize; }
  get vegetation()     { return this.settings.vegetation; }
  get postprocess()    { return this.settings.postprocess; }
  get fogDensity()     { return this.settings.fogDensity; }
  get pixelRatio()     { return this.settings.pixelRatio; }
}
