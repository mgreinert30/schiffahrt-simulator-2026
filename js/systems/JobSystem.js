// JobSystem — Vollständige Job-Zustandsmaschine
// States: AVAILABLE → ACCEPTED → LOADING → IN_TRANSIT → UNLOADING → COMPLETED | FAILED
import { PORTS } from '../world/WorldMap.js';

export const JOB_STATUS = {
  AVAILABLE: 'available', ACCEPTED: 'accepted', LOADING: 'loading',
  IN_TRANSIT: 'in_transit', UNLOADING: 'unloading',
  COMPLETED: 'completed', FAILED: 'failed',
};

const CARGO_TYPES = [
  { name: 'Baustoffe',      mass: 22, icon: '🧱', price: 480, from: ['industriehafen'], to: ['stadthafen','terminal_ost'] },
  { name: 'Stahl',          mass: 35, icon: '⚙️',  price: 680, from: ['industriehafen'], to: ['stadthafen'] },
  { name: 'Getreide',       mass: 28, icon: '🌾', price: 420, from: ['stadthafen'], to: ['industriehafen','terminal_ost'] },
  { name: 'Container',      mass: 40, icon: '📦', price: 750, from: ['terminal_ost'],  to: ['stadthafen','industriehafen'] },
  { name: 'Kies',           mass: 50, icon: '🪨', price: 320, from: ['industriehafen'], to: ['stadthafen'] },
  { name: 'Maschinenteile', mass: 18, icon: '🔧', price: 820, from: ['industriehafen'], to: ['terminal_ost'] },
  { name: 'Treibstoff',     mass: 45, icon: '⛽', price: 620, from: ['terminal_ost'],  to: ['industriehafen'] },
  { name: 'Fahrzeuge',      mass: 30, icon: '🚗', price: 980, from: ['terminal_ost'],  to: ['stadthafen'] },
];

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function generateJob(seed) {
  const rng   = seededRng(seed);
  const cargo = CARGO_TYPES[Math.floor(rng() * CARGO_TYPES.length)];
  const fromId = cargo.from[Math.floor(rng() * cargo.from.length)];
  const toId   = cargo.to[Math.floor(rng() * cargo.to.length)];
  const from   = PORTS.find(p => p.id === fromId) ?? PORTS[0];
  const to     = PORTS.find(p => p.id === toId)   ?? PORTS[1];

  if (from.id === to.id) return null; // Skip ungültige Jobs

  const d      = Math.round(dist(from, to));
  const reward = Math.round(cargo.price + d * 0.22 + cargo.mass * 5);
  const bonus  = Math.round(reward * 0.18);

  return {
    id:     `job_${seed}`,
    from, to, cargo,
    mass:   cargo.mass,
    reward, bonus, dist: d,
    status: JOB_STATUS.AVAILABLE,
    acceptedAt: null,
    completedAt: null,
    earnedAmt: 0,
  };
}

export class JobSystem {
  constructor(game) {
    this.game      = game;
    this.active    = null;
    this.available = [];
    this.completed = 0;
    this._seed     = 1337;

    // Tutorial-Job
    this.available.push({
      id: 'tutorial',
      from: PORTS.find(p => p.id === 'industriehafen') ?? PORTS[0],
      to:   PORTS.find(p => p.id === 'stadthafen')     ?? PORTS[1],
      cargo: CARGO_TYPES[2], // Getreide
      mass: 25, reward: 800, bonus: 150,
      dist: Math.round(dist(PORTS[0], PORTS[1])),
      status: JOB_STATUS.AVAILABLE,
      acceptedAt: null, completedAt: null, earnedAmt: 0,
    });
    this._refill();
  }

  _refill() {
    let attempts = 0;
    while (this.available.length < 4 && attempts < 20) {
      this._seed += 7;
      const j = generateJob(this._seed);
      if (j && !this.available.find(a => a.id === j.id)) {
        this.available.push(j);
      }
      attempts++;
    }
  }

  // Jobs an diesem Hafen
  jobsAt(portId) {
    return this.available.filter(j => j.from.id === portId);
  }

  // ── ACCEPT ──────────────────────────────────────────────────────────────
  accept(jobId) {
    if (this.active) return false;
    const idx = this.available.findIndex(j => j.id === jobId);
    if (idx === -1) return false;
    this.active = this.available.splice(idx, 1)[0];
    this.active.status     = JOB_STATUS.ACCEPTED;
    this.active.acceptedAt = Date.now();
    this.game.state.activeJob = this.active;
    return true;
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  setLoading() {
    if (!this.active) return;
    this.active.status = JOB_STATUS.LOADING;
  }

  // ── IN_TRANSIT ────────────────────────────────────────────────────────────
  setInTransit() {
    if (!this.active) return;
    this.active.status = JOB_STATUS.IN_TRANSIT;
    this.game.state.activeJob = this.active;
  }

  // ── UNLOADING ──────────────────────────────────────────────────────────
  setUnloading() {
    if (!this.active) return;
    this.active.status = JOB_STATUS.UNLOADING;
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  complete(noDamagBonus = false, fuelBonus = false) {
    if (!this.active) return null;
    const job = this.active;

    const elapsed = (Date.now() - job.acceptedAt) / 1000;
    const onTime  = elapsed < job.dist * 2.5; // Sehr großzügig

    let total = job.reward;
    const breakdown = [{ label: 'Grundvergütung', amt: job.reward }];

    if (onTime)          { total += job.bonus;  breakdown.push({ label: 'Pünktlich', amt: job.bonus }); }
    if (noDamagBonus)    { const b = Math.round(job.reward * 0.08); total += b; breakdown.push({ label: 'Keine Schäden', amt: b }); }
    if (fuelBonus)       { const b = Math.round(job.reward * 0.05); total += b; breakdown.push({ label: 'Treibstoffbonus', amt: b }); }

    job.earnedAmt    = total;
    job.status       = JOB_STATUS.COMPLETED;
    job.completedAt  = Date.now();

    this.game.state.addMoney(total, `Lieferung: ${job.cargo.name}`);
    this.game.state.activeJob = null;
    this.game.state.jobsDone++;

    this.active = null;
    this.completed++;
    this._refill();

    return { job, total, breakdown, onTime };
  }

  // ── FAIL ────────────────────────────────────────────────────────────────
  fail(reason = '') {
    if (!this.active) return;
    this.active.status   = JOB_STATUS.FAILED;
    this.game.state.activeJob = null;
    this.active = null;
    this._refill();
  }

  get hasActive() { return this.active !== null; }
  get destination() { return this.active?.to ?? null; }
  get isLoaded() { return this.active?.status === JOB_STATUS.IN_TRANSIT; }
}
