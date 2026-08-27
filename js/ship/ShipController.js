// ShipController — Eingabeverarbeitung + Schiffsmesh-Update
import * as THREE from 'three';

export class ShipController {
  constructor(physics) {
    this.physics = physics;
    this.keys    = {};
    this.mesh    = null;    // Gesetzt von main.js nach Schiffserstellung

    this._time   = 0;       // Für Schaukeln
    this._hornCooldown = 0;

    this._bindKeys();
  }

  _bindKeys() {
    window.addEventListener('keydown', e => { this.keys[e.code] = true; });
    window.addEventListener('keyup',   e => { this.keys[e.code] = false; });
  }

  isDown(...codes) {
    return codes.some(c => this.keys[c]);
  }

  update(dt, game) {
    const ph = this.physics;
    this._time += dt;

    // --- Throttle ---
    if (this.isDown('KeyW', 'ArrowUp')) {
      ph.throttle = Math.min(1, ph.throttle + dt * 2);
    } else if (this.isDown('KeyS', 'ArrowDown')) {
      ph.throttle = Math.max(-1, ph.throttle - dt * 2);
    } else {
      // Leerlauf: Throttle läuft langsam auf 0
      if (ph.throttle > 0) ph.throttle = Math.max(0, ph.throttle - dt * 1.5);
      if (ph.throttle < 0) ph.throttle = Math.min(0, ph.throttle + dt * 1.5);
    }

    // --- Ruder ---
    if (this.isDown('KeyA', 'ArrowLeft')) {
      ph.rudder = Math.min(1, ph.rudder + dt * 3);
    } else if (this.isDown('KeyD', 'ArrowRight')) {
      ph.rudder = Math.max(-1, ph.rudder - dt * 3);
    } else {
      // Ruder kehrt in Neutralstellung zurück
      if (ph.rudder > 0) ph.rudder = Math.max(0, ph.rudder - dt * 4);
      if (ph.rudder < 0) ph.rudder = Math.min(0, ph.rudder + dt * 4);
    }

    // Horn
    this._hornCooldown -= dt;
    if (this.isDown('KeyH') && this._hornCooldown <= 0) {
      this._hornCooldown = 3;
      game?.ui?.showNotification('📢 Tuuuut!', 1500);
    }

    // Physik-Schritt
    ph.update(dt);

    // Mesh synchronisieren
    if (this.mesh) {
      this.mesh.position.x = ph.x;
      this.mesh.position.z = ph.z;
      this.mesh.rotation.y = ph.heading;

      // Sanftes Schaukeln (abhängig von Fahrtgeschwindigkeit und Wellenzeit)
      const sway   = Math.sin(this._time * 0.6) * 0.018 * (0.3 + Math.abs(ph.speed) * 0.1);
      const pitch  = Math.cos(this._time * 0.45) * 0.010;
      const bob    = Math.sin(this._time * 0.8) * 0.15;

      this.mesh.rotation.z = sway;
      this.mesh.rotation.x = pitch;
      this.mesh.position.y = bob;
    }
  }

  // Tatsächliche Eingabe-Stärke für HUD-Anzeige
  get throttleDisplay() { return this.physics.throttle; }
  get rudderDisplay()   { return this.physics.rudder; }
}
