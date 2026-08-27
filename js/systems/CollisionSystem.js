// CollisionSystem — Ufer, Hafenmauern, NPC-Schiffe, Grundberührung

// ── Fahrrinne & Hafenarme ─────────────────────────────────────────────────────
// Befahrbare Rechteck-Zonen (min/max x/z) — Schiff muss in mind. einer Zone sein
const NAV_ZONES = [
  { xMin: -215, xMax: 215,  zMin: -2100, zMax: 2100 },  // Hauptfluss
  { xMin: -460, xMax: -215, zMin: -1110, zMax: -810 },  // industriehafen-Arm
  { xMin:  215, xMax:  460, zMin:  800,  zMax: 1060 },   // stadthafen-Arm
  { xMin:  215, xMax:  730, zMin: -340,  zMax:  -60 },   // terminal_ost-Arm
];

// Wassertiefe in Fahrrinne (vereinfacht) und in Seichtzonen
function getWaterDepth(x, z) {
  const inMain = x > -210 && x < 210;
  if (inMain) return 6.0;                // Fahrrinne: 6m tief
  // Hafenbecken etwas flacher
  if (x < -210) return 3.5;
  return 4.0;
}

function inNavZone(x, z) {
  for (const zone of NAV_ZONES) {
    if (x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax) return true;
  }
  return false;
}

export class CollisionSystem {
  constructor(physics, damage) {
    this.physics  = physics;
    this.damage   = damage;
    this._blocked = false;  // letztes Frame blockiert?
  }

  // Gibt zurück: { grounded, groundSeverity, collision }
  update(dt) {
    const ph = this.physics;
    const result = { grounded: false, groundSeverity: 0, collision: false, dmg: 0 };

    // ── Weltgrenze (absolut) ──────────────────────────────────────────────
    if (Math.abs(ph.x) > 2100 || Math.abs(ph.z) > 2100) {
      ph.x = Math.max(-2100, Math.min(2100, ph.x));
      ph.z = Math.max(-2100, Math.min(2100, ph.z));
      ph.speed *= 0.1;
    }

    // ── Ufer-Kollision ────────────────────────────────────────────────────
    if (!inNavZone(ph.x, ph.z)) {
      result.collision = true;
      const impactSpeed = Math.abs(ph.speed);
      result.dmg = this.damage.applyCollision(impactSpeed, ph);

      // Rückstoß: in Richtung nächster Fahrrinne
      const nx = -Math.sign(ph.x) * (Math.abs(ph.x) > 215 ? 1 : 0);
      const nz = 0;
      ph.bounce(nx, nz);
      result.collision = impactSpeed > 0.5;
    }

    // ── Grundberührung ────────────────────────────────────────────────────
    const depth = getWaterDepth(ph.x, ph.z);
    const draft = ph.draft ?? 1.4;
    if (depth < draft) {
      const severity = Math.min(1, (draft - depth) / draft);
      result.grounded      = true;
      result.groundSeverity = severity;
      this.damage.applyGrounding(dt, severity);

      // Fahrt bremsen abhängig von Grundberührung
      ph.speed *= (1 - severity * 3 * dt);
    }

    return result;
  }

  // Für NPC-Schiff-Kollision (aufgerufen von NPCSystem)
  checkNPC(npcX, npcZ, npcR) {
    const ph  = this.physics;
    const dx  = ph.x - npcX;
    const dz  = ph.z - npcZ;
    const dist = Math.hypot(dx, dz);
    const minDist = npcR + 8; // Schiff-Halbbreite ~8m
    if (dist < minDist && dist > 0) {
      const impactSpeed = Math.abs(ph.speed);
      const dmg = this.damage.applyCollision(impactSpeed * 0.5, ph);
      // Abstoßen
      const norm = 1 / dist;
      ph.x += dx * norm * (minDist - dist) * 0.7;
      ph.z += dz * norm * (minDist - dist) * 0.7;
      ph.speed *= 0.4;
      return { collision: impactSpeed > 0.5, dmg };
    }
    return { collision: false, dmg: 0 };
  }

  // Wassertiefe an aktueller Position
  get waterDepth() {
    return getWaterDepth(this.physics.x, this.physics.z);
  }

  // Fahrrinnen-Verletzung (für Warnung)
  get isOutOfChannel() {
    return !inNavZone(this.physics.x, this.physics.z);
  }
}
