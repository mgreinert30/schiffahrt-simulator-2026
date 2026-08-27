// ShipPhysics — Massenträgheit, Telegraph, Hydrodynamik, Auftrieb

// Telegraph-Stufen: -4 (Full Astern) … 0 (Stop) … +4 (Full Ahead)
export const TELEGRAPH = {
  FULL_ASTERN: -4, HALF_ASTERN: -3, SLOW_ASTERN: -2, DEAD_SLOW_ASTERN: -1,
  STOP: 0,
  DEAD_SLOW_AHEAD: 1, SLOW_AHEAD: 2, HALF_AHEAD: 3, FULL_AHEAD: 4,
};

// Ziel-Geschwindigkeit pro Stufe (m/s) — Vorwärts positiv
// Full Ahead = 16.5 m/s ≈ 59 km/h (Gameplay-optimiert)
const TARGET_SPEED = [-5.5, -4.0, -2.5, -1.2, 0, 2.5, 6.0, 10.5, 16.5];
// Index = level + 4  (level -4 → index 0)

// Schiff-Basisparameter (leeres Frachtschiff)
const BASE = {
  mass:          90000,  // kg (90 t leer)
  maxCargo:      80000,  // kg (80 t max Zuladung)
  length:        24,     // m
  width:         6.5,    // m
  draftEmpty:    1.4,    // m
  draftFull:     2.0,    // m
  motorForce:    280000, // N (aufgestockt für 60 km/h-Gameplay)
  dragCoeff:     0.38,   // Wasserwiderstand (angepasst)
  turnDragCoeff: 3.2,    // Drehdämpfung
  maxTurnRate:   0.55,   // rad/s
};

export class ShipPhysics {
  constructor() {
    // Zustand
    this.speed        = 0;      // m/s (+ = vorwärts)
    this.angularSpeed = 0;      // rad/s
    this.heading      = 0;      // rad
    this.x            = 0;
    this.z            = 0;

    // Telegraph
    this.telegraphLevel  = 0;   // -4 … +4 (gesetzt von Controller)
    this._motorEnabled   = true;

    // Ladung
    this.cargoMass    = 0;      // kg

    // Extern gesetzte Scaler (von Damage/Cargo-System)
    this.powerFactor    = 1.0;
    this.maxSpeedFactor = 1.0;

    // Abgeleitete Werte (readonly)
    this.rudder       = 0;      // -1 … +1 (von Controller)
    this.throttle     = 0;      // -1 … +1 (für HUD-Kompatibilität)
  }

  // ── Gesamtmasse ────────────────────────────────────────────────────────────
  get totalMass()  { return BASE.mass + this.cargoMass; }
  get massRatio()  { return this.totalMass / BASE.mass; } // 1.0 leer … ~1.89 voll

  // ── Tiefgang ───────────────────────────────────────────────────────────────
  get draft() {
    const t = this.cargoMass / BASE.maxCargo;
    return BASE.draftEmpty + t * (BASE.draftFull - BASE.draftEmpty);
  }

  // ── Effektive Höchstgeschwindigkeit ───────────────────────────────────────
  get effectiveMaxSpeed() {
    const base = TARGET_SPEED[TELEGRAPH.FULL_AHEAD + 4];
    // Schwerere Ladung → etwas langsamer
    const loadPenalty = 1 - this.cargoMass / BASE.maxCargo * 0.15;
    return base * loadPenalty * this.maxSpeedFactor;
  }

  // ── Geschwindigkeit in Knoten ──────────────────────────────────────────────
  get speedKnots() { return this.speed * 1.94384; }

  // ── Kompass-Richtung ──────────────────────────────────────────────────────
  get compassHeading() {
    const deg = ((this.heading * 180 / Math.PI) % 360 + 360) % 360;
    const dirs = ['N','NO','O','SO','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  // ── Motor ein/aus ─────────────────────────────────────────────────────────
  setMotorEnabled(on) { this._motorEnabled = on; }

  // ── Physics-Step ──────────────────────────────────────────────────────────
  update(dt) {
    if (dt <= 0) return;

    const level    = this._motorEnabled ? this.telegraphLevel : 0;
    const target   = TARGET_SPEED[level + 4];  // Zielgeschwindigkeit für diesen Level
    const mass     = this.totalMass;

    // Motorschub (reduziert durch Schaden)
    const forceFactor  = this.powerFactor;
    const motorForce   = BASE.motorForce * forceFactor;

    // Beschleunigung = Kraft / Masse
    const accelRaw = motorForce / mass;         // m/s²

    // Proportionale Kraft: mehr Kraft wenn weit vom Ziel
    const delta    = target - this.speed;
    const thrust   = Math.sign(delta) * Math.min(Math.abs(delta) * 2.5, 1) * accelRaw;

    // Hydrodynamischer Widerstand (v²): stark bei hoher Geschwindigkeit
    const drag     = this.speed * Math.abs(this.speed) * BASE.dragCoeff / (mass / BASE.mass);

    // Netto-Beschleunigung
    const accel    = (thrust - drag * 0.5) ;
    this.speed    += accel * dt;

    // Zusätzlicher Drag damit das Schiff nie über Ziel hinaus schießt
    if (Math.abs(this.speed) > Math.abs(target) && Math.sign(this.speed) === Math.sign(target)) {
      this.speed  += (target - this.speed) * Math.min(1, dt * 1.5);
    }

    // Sicherheitsbegrenzer
    const absMax = 20.0 * this.maxSpeedFactor;
    this.speed    = Math.max(-2.5, Math.min(absMax, this.speed));
    if (Math.abs(this.speed) < 0.005) this.speed = 0;

    // HUD-Kompatibilitäts-Property
    this.throttle = this.speed / 6.5;

    // ── Ruderphysik ─────────────────────────────────────────────────────────
    // Wirkung proportional zur Fahrtgeschwindigkeit (bei Stand: ~5 %)
    const speedFactor = Math.max(0.05, Math.min(1, Math.abs(this.speed) / 4.0));
    // Kurventrägheit abhängig von Masse
    const turnInertia = BASE.mass / this.totalMass;
    const turnRate    = BASE.maxTurnRate * speedFactor * turnInertia;

    this.angularSpeed += this.rudder * turnRate * dt * 4;
    this.angularSpeed -= this.angularSpeed * BASE.turnDragCoeff * dt;
    if (Math.abs(this.angularSpeed) < 0.0003) this.angularSpeed = 0;

    this.heading  += this.angularSpeed * dt;

    // Position (vorwärts = -Z bei heading 0)
    this.x -= Math.sin(this.heading) * this.speed * dt;
    this.z -= Math.cos(this.heading) * this.speed * dt;
  }

  // ── Kollisionsreaktion ────────────────────────────────────────────────────
  bounce(normalX, normalZ) {
    // Reflektiere Geschwindigkeit an Oberflächennormale und dämpfe
    const dot     = this.speed * (Math.sin(this.heading) * normalX + Math.cos(this.heading) * normalZ);
    this.speed   *= 0.15;
    this.angularSpeed *= 0.3;
    // Schiff leicht zurückdrängen
    this.x += normalX * 1.5;
    this.z += normalZ * 1.5;
  }
}
