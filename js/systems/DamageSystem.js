// DamageSystem — Rumpfschäden, Kollisionsfolgen, Reparatur

const REPAIR_COST_PER_PCT = 55; // € pro Prozent Schaden

export class DamageSystem {
  constructor(state) {
    this.state = state;
  }

  // Kollisionsschaden – impactSpeed in m/s
  applyCollision(impactSpeed, physics) {
    const speed = Math.abs(impactSpeed);
    let dmg = 0;
    if (speed < 0.8)       dmg = 0;
    else if (speed < 1.5)  dmg = speed * 1.5;
    else if (speed < 3.0)  dmg = speed * 4;
    else                   dmg = speed * 9;

    dmg = Math.round(dmg * 10) / 10;
    this.state.damage = Math.min(100, this.state.damage + dmg);

    // Physikalische Reaktion
    if (physics) {
      physics.speed    *= (1 - speed * 0.35);
      physics.angularSpeed *= 0.4;
    }
    return dmg;
  }

  // Grundberührung – kontinuierlicher Schaden
  applyGrounding(dt, severity) {
    // severity 0–1
    const dmgPerSec = severity * 2.5;
    this.state.damage = Math.min(100, this.state.damage + dmgPerSec * dt);
  }

  // Schaden-Effekt auf Motorleistung (0.5 … 1.0 Multiplikator)
  get powerFactor() {
    if (this.state.damage < 20) return 1.0;
    if (this.state.damage < 50) return 1.0 - (this.state.damage - 20) / 30 * 0.25;
    if (this.state.damage < 80) return 0.75 - (this.state.damage - 50) / 30 * 0.25;
    return Math.max(0.2, 0.5 - (this.state.damage - 80) / 20 * 0.3);
  }

  // Schaden-Effekt auf Höchstgeschwindigkeit (0.6 … 1.0)
  get maxSpeedFactor() {
    return Math.max(0.6, 1.0 - this.state.damage / 100 * 0.4);
  }

  // Reparatur
  repairCost() {
    return Math.round(this.state.damage * REPAIR_COST_PER_PCT);
  }

  repair() {
    const cost = this.repairCost();
    if (!this.state.spendMoney(cost)) return -1;
    this.state.damage = 0;
    return cost;
  }

  get isManeuverImpaired() { return this.state.damage >= 80; }
  get isDisabled()         { return this.state.damage >= 100; }
}
