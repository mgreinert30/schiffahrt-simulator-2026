// ShipController — Telegraph-Eingabe, Ruder, Horn, Kamera-Auslöser
import * as THREE from 'three';
import { TELEGRAPH } from './ShipPhysics.js';

// Web Audio – Schiffshorn
function makeHornFn() {
  let ctx = null;
  return function playHorn() {
    try {
      if (!ctx) ctx = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(95, ctx.currentTime + 1.8);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 2.0);
      osc.start(); osc.stop(ctx.currentTime + 2.1);
    } catch {}
  };
}

export class ShipController {
  constructor(physics) {
    this.physics = physics;
    this.mesh    = null;

    this._keys      = {};
    this._time      = 0;
    this._hornCD    = 0;
    this._playHorn  = makeHornFn();

    // Tastendruck-Debounce für Telegraph-Stufen
    this._wDown     = false;
    this._sDown     = false;

    this._bindKeys();
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      if (!this._keys[e.code]) {
        this._keys[e.code] = true;
        this._onKeyPress(e.code);
      }
    });
    window.addEventListener('keyup', e => { this._keys[e.code] = false; });
  }

  _onKeyPress(code) {
    const ph = this.physics;
    if (code === 'KeyW' || code === 'ArrowUp') {
      ph.telegraphLevel = Math.min(TELEGRAPH.FULL_AHEAD, ph.telegraphLevel + 1);
    }
    if (code === 'KeyS' || code === 'ArrowDown') {
      ph.telegraphLevel = Math.max(TELEGRAPH.FULL_ASTERN, ph.telegraphLevel - 1);
    }
  }

  isDown(...codes) { return codes.some(c => this._keys[c]); }

  update(dt, game) {
    const ph    = this.physics;
    this._time += dt;

    // Ruder (kontinuierlich gehalten)
    if (this.isDown('KeyA', 'ArrowLeft')) {
      ph.rudder = Math.min(1, ph.rudder + dt * 2.5);
    } else if (this.isDown('KeyD', 'ArrowRight')) {
      ph.rudder = Math.max(-1, ph.rudder - dt * 2.5);
    } else {
      // Ruder kehrt zur Mitte zurück
      ph.rudder -= Math.sign(ph.rudder) * Math.min(Math.abs(ph.rudder), dt * 3);
      if (Math.abs(ph.rudder) < 0.01) ph.rudder = 0;
    }

    // Horn
    this._hornCD -= dt;
    if (this.isDown('KeyH') && this._hornCD <= 0) {
      this._hornCD = 2.5;
      this._playHorn();
      game?.ui?.showNotification('📢 TUUUUT!', 1800);
    }

    // Motor-Enable durch FuelSystem
    ph.update(dt);

    // Mesh synchronisieren
    if (this.mesh) {
      this.mesh.position.x = ph.x;
      this.mesh.position.z = ph.z;
      this.mesh.rotation.y = ph.heading;

      // Schaukeln abhängig von Wellenbewegung und Geschwindigkeit
      const spdFactor = 0.3 + Math.min(1, Math.abs(ph.speed) / 6.5) * 0.7;
      const roll  = Math.sin(this._time * 0.55) * 0.014 * spdFactor;
      const pitch = Math.cos(this._time * 0.42) * 0.009 * spdFactor;
      const bob   = Math.sin(this._time * 0.75) * 0.18;

      this.mesh.rotation.z = roll;
      this.mesh.rotation.x = pitch;
      this.mesh.position.y = bob;
    }
  }

  // Telegraph-Label für HUD
  get telegraphLabel() {
    const lvl = this.physics.telegraphLevel;
    const LABELS = [
      'FULL ASTERN', 'HALF ASTERN', 'SLOW ASTERN', 'DEAD SLOW ASTERN', 'STOP',
      'DEAD SLOW AHEAD', 'SLOW AHEAD', 'HALF AHEAD', 'FULL AHEAD',
    ];
    return LABELS[lvl + 4] ?? 'STOP';
  }
}
