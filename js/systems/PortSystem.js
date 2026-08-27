// PortSystem — Hafen-Zonen, Interaktions-Trigger, Geschwindigkeitslimits
import { PORTS } from '../world/WorldMap.js';

// Hafen-Zonen: Positionen relativ zur Weltkarte
// Jede Zone hat absolute Koordinaten und Radius
const PORT_ZONES = {
  industriehafen: {
    entry:    { x: -380, z: -950, r: 170 },
    cargo:    { x: -290, z: -950, r: 90 },   // Kailinie (Pickup & Delivery)
    fuel:     { x: -340, z: -880, r: 80 },
    repair:   { x: -340, z: -1020, r: 80 },
    speedLimit: 3.0,  // kn
  },
  stadthafen: {
    entry:    { x:  320, z:  900, r: 160 },
    cargo:    { x:  400, z:  900, r: 85 },
    fuel:     { x:  340, z:  960, r: 75 },
    repair:   { x:  340, z:  840, r: 75 },
    speedLimit: 3.0,
  },
  terminal_ost: {
    entry:    { x:  600, z: -200, r: 150 },
    cargo:    { x:  665, z: -200, r: 85 },
    fuel:     { x:  600, z: -140, r: 75 },
    repair:   null,
    speedLimit: 4.0,
  },
};

function dist2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export class PortSystem {
  constructor(game) {
    this.game        = game;
    this.nearPort    = null;   // Hafen in Entry-Zone
    this.currentZone = null;   // 'entry' | 'cargo' | 'fuel' | 'repair' | null
    this._prevPort   = null;
  }

  update(dt, shipX, shipZ) {
    this._prevPort = this.nearPort;
    this.nearPort  = null;
    this.currentZone = null;

    const ph = this.game.physics;

    for (const port of PORTS) {
      const zones = PORT_ZONES[port.id];
      if (!zones) continue;

      const inEntry = dist2D(shipX, shipZ, zones.entry.x, zones.entry.z) < zones.entry.r;
      if (!inEntry) continue;

      this.nearPort    = port;

      // Spezifischere Zonen prüfen (innen nach außen)
      const inCargo   = dist2D(shipX, shipZ, zones.cargo.x, zones.cargo.z)  < zones.cargo.r;
      const inFuel    = zones.fuel   && dist2D(shipX, shipZ, zones.fuel.x,   zones.fuel.z)   < zones.fuel.r;
      const inRepair  = zones.repair && dist2D(shipX, shipZ, zones.repair.x, zones.repair.z) < zones.repair.r;

      if (inCargo)       this.currentZone = 'cargo';
      else if (inFuel)   this.currentZone = 'fuel';
      else if (inRepair) this.currentZone = 'repair';
      else               this.currentZone = 'entry';

      // Geschwindigkeitslimit
      const limitMs = (zones.speedLimit || 3) / 1.944; // kn → m/s
      if (Math.abs(ph.speed) > limitMs && !ph._speedWarned) {
        ph._speedWarned = true;
        this.game.ui?.showNotification(`⚠️ Hafengeschwindigkeit! Max. ${zones.speedLimit} kn`, 2000);
      }
      if (Math.abs(ph.speed) <= limitMs * 1.1) ph._speedWarned = false;

      break; // Nur ein Hafen gleichzeitig
    }

    // Hafen verlassen
    if (this._prevPort && !this.nearPort) {
      this.game.ui?.onPortExit();
    }

    // Hafen betreten
    if (!this._prevPort && this.nearPort) {
      this.game.ui?.onPortEnter(this.nearPort);
    }
  }

  // Zonen-Info für aktuellen Hafen (für UI)
  get zoneInfo() {
    if (!this.nearPort) return null;
    return PORT_ZONES[this.nearPort.id] ?? null;
  }

  // Welche F-Aktion ist aktuell verfügbar?
  get availableAction() {
    const zone = this.currentZone;
    const jobs = this.game.jobs;
    const cargo = this.game.cargo;
    const state = this.game.state;

    if (!zone) return null;

    if (zone === 'cargo') {
      // Pickup: Auftrag angenommen, noch nicht beladen, Starthafen
      if (jobs.hasActive && jobs.active?.status === 'accepted' && jobs.active?.from.id === this.nearPort?.id) {
        return { type: 'load', label: 'F — Fracht laden', icon: '📦' };
      }
      // Delivery: aktiver Auftrag, Fracht an Bord, Zielhafen
      if (jobs.hasActive && jobs.isLoaded && jobs.destination?.id === this.nearPort?.id) {
        return { type: 'unload', label: 'F — Fracht entladen', icon: '📬' };
      }
      // Jobmarkt: kein aktiver Auftrag
      if (!jobs.hasActive && jobs.jobsAt(this.nearPort?.id).length > 0) {
        return { type: 'market', label: 'F — Auftragsmarkt öffnen', icon: '📋' };
      }
    }

    if (zone === 'fuel') {
      if (state.fuel < state.maxFuel * 0.99) {
        return { type: 'fuel', label: 'F — Tanken', icon: '⛽' };
      }
    }

    if (zone === 'repair') {
      if (state.damage > 0) {
        return { type: 'repair', label: 'F — Reparieren', icon: '🔧' };
      }
    }

    // Fallback: Auftragsmarkt immer im Entry-Bereich wenn kein aktiver Job
    if (!jobs.hasActive) {
      const atPort = jobs.jobsAt(this.nearPort?.id);
      if (atPort.length > 0) {
        return { type: 'market', label: 'F — Auftragsmarkt öffnen', icon: '📋' };
      }
    }

    return null;
  }

  // Geschwindigkeitslimit des aktuellen Hafens (kn)
  get speedLimit() {
    if (!this.nearPort) return null;
    return PORT_ZONES[this.nearPort.id]?.speedLimit ?? null;
  }
}
