// LockSystem — Voll funktionierende Schleuse (Industriehafen-Einfahrt)

import * as THREE from 'three';

// Position an der Einfahrt zum Industriehafen-Arm
const LOCK = {
  x: -215, z: -960,
  halfW: 9,          // Halbe Breite der Kammer
  gateZ: -960,       // Z-Position des Tors
  interactRadius: 100,
  blockRadius: 4,    // Blockier-Radius wenn Tor zu
};

const GATE_SPEED = 0.9;   // rad/s

export const LOCK_STATES = {
  IDLE:     'idle',
  WAITING:  'waiting',    // Spieler hat angefordert, kurze Wartezeit
  OPENING:  'opening',
  OPEN:     'open',
  CLOSING:  'closing',
};

export class LockSystem {
  constructor(scene, physics) {
    this.scene       = scene;
    this.physics     = physics;
    this._state      = LOCK_STATES.IDLE;
    this._timer      = 0;
    this._gateAngle  = 0;          // 0=zu, PI/2=offen
    this._gateGrpL   = null;
    this._gateGrpR   = null;
    this._trafficLight = null;
    this._lightPt    = null;
    this._inZone     = false;

    this._build();
  }

  // ── Öffentlich ────────────────────────────────────────────────────────────
  get state()      { return this._state; }
  get isOpen()     { return this._state === LOCK_STATES.OPEN; }
  get inZone()     { return this._inZone; }

  get interactionHint() {
    if (!this._inZone) return null;
    switch (this._state) {
      case LOCK_STATES.IDLE:    return '[F] Schleusung anfordern';
      case LOCK_STATES.WAITING: return '⏳ Tor öffnet gleich...';
      case LOCK_STATES.OPENING: return '🚦 Tor öffnet sich — bitte warten';
      case LOCK_STATES.OPEN:    return '✅ Schleuse frei — einfahren!';
      case LOCK_STATES.CLOSING: return '⚠️ Tor schließt — bitte warten';
      default: return null;
    }
  }

  // F-Taste im Lock-Bereich
  request() {
    if (this._state !== LOCK_STATES.IDLE) return null;
    if (!this._inZone) return null;
    this._state = LOCK_STATES.WAITING;
    this._timer = 3.5; // kurze Verzögerung realistisch
    return '🔔 Schleusung angefordert. Nordheim Lock Control: Tor öffnet in Kürze.';
  }

  // Prüft ob Tor Spieler blockiert (für Physik-System)
  isBlocking(px, pz) {
    if (this._state === LOCK_STATES.OPEN || this._state === LOCK_STATES.OPENING) return false;
    const dx = px - LOCK.x;
    const dz = pz - LOCK.gateZ;
    return Math.abs(dx) < LOCK.halfW + 3 && Math.abs(dz) < LOCK.blockRadius;
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  update(dt) {
    const ph = this.physics;
    const dx = ph.x - LOCK.x;
    const dz = ph.z - LOCK.gateZ;
    this._inZone = Math.hypot(dx, dz) < LOCK.interactRadius;

    // Physik: Schiff blockieren wenn Tor zu
    if (this.isBlocking(ph.x, ph.z) && Math.abs(ph.speed) > 0.1) {
      ph.speed    *= 0.1;
      ph.z        += Math.sign(ph.z - LOCK.gateZ) * 0.5;
    }

    switch (this._state) {
      case LOCK_STATES.WAITING:
        this._timer -= dt;
        if (this._timer <= 0) {
          this._state = LOCK_STATES.OPENING;
          this._setLight('green');
        }
        break;

      case LOCK_STATES.OPENING:
        this._gateAngle = Math.min(Math.PI / 2, this._gateAngle + GATE_SPEED * dt);
        this._syncGates();
        if (this._gateAngle >= Math.PI / 2 - 0.04) {
          this._gateAngle = Math.PI / 2;
          this._state = LOCK_STATES.OPEN;
          this._timer = 30; // 30s bis Auto-Schließen
        }
        break;

      case LOCK_STATES.OPEN:
        this._timer -= dt;
        // Tor schließen wenn Spieler durch ist (Position hinter Schleuse)
        const playerPast = ph.z < LOCK.gateZ - 50;
        if (this._timer <= 0 || (playerPast && !this._inZone)) {
          this._state = LOCK_STATES.CLOSING;
          this._setLight('red');
        }
        break;

      case LOCK_STATES.CLOSING:
        this._gateAngle = Math.max(0, this._gateAngle - GATE_SPEED * dt);
        this._syncGates();
        if (this._gateAngle <= 0.03) {
          this._gateAngle = 0;
          this._syncGates();
          this._state = LOCK_STATES.IDLE;
          this._setLight('red');
        }
        break;
    }
  }

  // ── Bau-Methoden ──────────────────────────────────────────────────────────
  _build() {
    const matConcrete = new THREE.MeshStandardMaterial({ color: 0x5a6272, roughness: 0.88, metalness: 0.1 });
    const matSteel    = new THREE.MeshStandardMaterial({ color: 0x2a3848, roughness: 0.65, metalness: 0.45 });
    const matRust     = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.90 });

    const B = (mat, x, y, z, w, h, d) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      this.scene.add(m);
      return m;
    };

    const lx = LOCK.x, lz = LOCK.gateZ;
    const hw  = LOCK.halfW;

    // Schleusenmauern
    B(matConcrete, lx - hw - 2, 4,   lz, 4, 8, 55);   // linke Wand
    B(matConcrete, lx + hw + 2, 4,   lz, 4, 8, 55);   // rechte Wand
    // Tor-Fundamente
    B(matRust, lx - hw - 0.5, 1.5, lz, 1, 3, 3);
    B(matRust, lx + hw + 0.5, 1.5, lz, 1, 3, 3);

    // ── Tore (zwei Hälften, drehen sich auf) ────────────────────────────────
    this._gateGrpL = new THREE.Group();
    this._gateGrpR = new THREE.Group();

    const halfGateGeo = new THREE.BoxGeometry(hw - 0.5, 5, 0.9);
    const gL = new THREE.Mesh(halfGateGeo, matSteel);
    gL.position.set(-hw / 2, 2.5, 0);
    gL.castShadow = true;
    this._gateGrpL.add(gL);

    const gR = new THREE.Mesh(new THREE.BoxGeometry(hw - 0.5, 5, 0.9), matSteel);
    gR.position.set(hw / 2, 2.5, 0);
    gR.castShadow = true;
    this._gateGrpR.add(gR);

    // Quer-Streben
    const strutsL = new THREE.Mesh(new THREE.BoxGeometry(hw - 1, 0.3, 0.5), matSteel);
    strutsL.position.set(-hw / 2, 1.5, 0);
    this._gateGrpL.add(strutsL);
    const strutsR = strutsL.clone();
    this._gateGrpR.add(strutsR);

    this._gateGrpL.position.set(lx, 0, lz);
    this._gateGrpR.position.set(lx, 0, lz);
    this.scene.add(this._gateGrpL);
    this.scene.add(this._gateGrpR);

    // ── Ampel / Mastsignal ─────────────────────────────────────────────────
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 });
    const mastGeo = new THREE.CylinderGeometry(0.18, 0.22, 8, 6);
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(lx - hw - 5, 4, lz);
    this.scene.add(mast);

    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.8
    });
    this._trafficLight = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lightMat);
    this._trafficLight.position.set(lx - hw - 5, 8.5, lz);
    this.scene.add(this._trafficLight);

    this._lightPt = new THREE.PointLight(0xff2222, 10, 35, 2);
    this._lightPt.position.copy(this._trafficLight.position);
    this.scene.add(this._lightPt);

    // Schild
    const signMat = new THREE.MeshStandardMaterial({ color: 0x003388 });
    B(signMat, lx - hw - 7, 6, lz, 3.5, 1.2, 0.2);
  }

  _syncGates() {
    if (this._gateGrpL) this._gateGrpL.rotation.y =  this._gateAngle;
    if (this._gateGrpR) this._gateGrpR.rotation.y = -this._gateAngle;
  }

  _setLight(col) {
    const c = col === 'green' ? 0x22ff44 : 0xff2222;
    const e = col === 'green' ? 0x11cc33 : 0xcc1111;
    if (this._trafficLight) {
      this._trafficLight.material.color.setHex(c);
      this._trafficLight.material.emissive.setHex(e);
    }
    if (this._lightPt) this._lightPt.color.setHex(c);
  }
}
