// NavigationSystem — Distanz, Kurs, Route zum aktiven Auftragsziel
import { PORTS } from '../world/WorldMap.js';

// Welt-Einheit → km Umrechnung (1 WU ≈ 5 m → 200 WU = 1 km)
const WU_TO_KM = 1 / 200;

export class NavigationSystem {
  constructor(state) {
    this.state = state;
  }

  // Distanz (km) zur Zielposition
  distanceTo(tx, tz, sx = this.state.shipX, sz = this.state.shipZ) {
    return Math.hypot(tx - sx, tz - sz) * WU_TO_KM;
  }

  // Kurs (Grad) zur Zielposition, 0=N, 90=O, 180=S, 270=W
  bearingTo(tx, tz, sx = this.state.shipX, sz = this.state.shipZ) {
    const dx = tx - sx, dz = tz - sz;
    const angle = Math.atan2(dx, -dz) * 180 / Math.PI;
    return (angle + 360) % 360;
  }

  // Aktives Ziel (aus Job) oder null
  get target() {
    return this.state.activeJob ? this.state.activeJob.to : null;
  }

  // Distanz zum aktiven Ziel
  get distanceToTarget() {
    const t = this.target;
    if (!t) return null;
    return this.distanceTo(t.x, t.z);
  }

  // Bearing zum aktiven Ziel in Grad
  get bearingToTarget() {
    const t = this.target;
    if (!t) return null;
    return this.bearingTo(t.x, t.z);
  }

  // Nächster Hafen und dessen Distanz
  nearestPort(sx = this.state.shipX, sz = this.state.shipZ) {
    let best = null, bestDist = Infinity;
    for (const p of PORTS) {
      const d = Math.hypot(p.x - sx, p.z - sz);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return { port: best, distKm: bestDist * WU_TO_KM };
  }
}
