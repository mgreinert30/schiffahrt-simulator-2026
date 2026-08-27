// JobSystem — Auftragsmanagement
import { PORTS } from '../world/WorldMap.js';

const CARGO_TYPES = [
  { name: 'Baustoffe',     weight: 20, icon: '🧱', basePrice: 480  },
  { name: 'Stahl',         weight: 35, icon: '⚙️',  basePrice: 680  },
  { name: 'Getreide',      weight: 28, icon: '🌾', basePrice: 420  },
  { name: 'Container',     weight: 40, icon: '📦', basePrice: 750  },
  { name: 'Kies',          weight: 50, icon: '🪨', basePrice: 320  },
  { name: 'Maschinenteile',weight: 18, icon: '🔧', basePrice: 820  },
  { name: 'Treibstoff',    weight: 45, icon: '⛽', basePrice: 620  },
  { name: 'Fahrzeuge',     weight: 30, icon: '🚗', basePrice: 980  },
];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function generateJob(seed, tutorialMode = false) {
  if (tutorialMode) {
    return {
      id:      'tutorial_01',
      from:    PORTS[0],
      to:      PORTS[1],
      cargo:   CARGO_TYPES[0], // Baustoffe
      weight:  20,
      reward:  500,
      bonus:   120,
      timelimit: null,
      dist:    Math.round(distance(PORTS[0], PORTS[1])),
      status:  'available',
    };
  }

  const rng = seededRng(seed);
  const fromIdx = Math.floor(rng() * PORTS.length);
  let toIdx = Math.floor(rng() * (PORTS.length - 1));
  if (toIdx >= fromIdx) toIdx++;

  const from  = PORTS[fromIdx];
  const to    = PORTS[toIdx];
  const cargo = CARGO_TYPES[Math.floor(rng() * CARGO_TYPES.length)];
  const dist  = Math.round(distance(from, to));
  const reward = Math.round(cargo.basePrice + dist * 0.18 + cargo.weight * 4);

  return {
    id:     `job_${seed}`,
    from, to, cargo,
    weight: cargo.weight,
    reward,
    bonus:  Math.round(reward * 0.2),
    timelimit: null,
    dist,
    status: 'available',
  };
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export class JobSystem {
  constructor(game) {
    this.game       = game;
    this.active     = null;
    this.available  = [];
    this.completed  = 0;
    this._seed      = 1337;

    // Tutorial-Auftrag als ersten verfügbaren Job setzen
    this.available.push(generateJob(0, true));
    this._refillJobs();
  }

  _refillJobs() {
    while (this.available.length < 4) {
      this._seed += 7;
      const j = generateJob(this._seed);
      if (!this.available.find(a => a.id === j.id)) {
        this.available.push(j);
      }
    }
  }

  // Gibt Jobs zurück, die an diesem Hafen angenommen werden können
  jobsAt(portId) {
    return this.available.filter(j => j.from.id === portId);
  }

  accept(jobId) {
    if (this.active) return false; // Nur ein Auftrag gleichzeitig in Phase 1
    const idx = this.available.findIndex(j => j.id === jobId);
    if (idx === -1) return false;
    this.active = this.available.splice(idx, 1)[0];
    this.active.status = 'active';
    this.active.acceptedAt = Date.now();
    return true;
  }

  // Gibt zurück ob der Spieler an seinem Zielhafen ist
  isAtDestination(portId) {
    return this.active?.to.id === portId;
  }

  complete(onTime = true) {
    if (!this.active) return null;

    const job     = this.active;
    const reward  = job.reward + (onTime ? job.bonus : 0);
    const elapsed = (Date.now() - job.acceptedAt) / 1000;

    this.game.economy.add(reward, `Lieferung: ${job.cargo.name}`);
    job.status     = 'completed';
    job.earnedAt   = Date.now();
    job.earnedAmt  = reward;

    this.active    = null;
    this.completed++;
    this._refillJobs();

    return { job, reward, onTime, elapsed };
  }

  get hasActive() { return this.active !== null; }
  get destination() { return this.active?.to ?? null; }
}
