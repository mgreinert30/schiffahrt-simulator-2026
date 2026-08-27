// GameState — Zentraler Spielzustand (Single Source of Truth)

export class GameState {
  constructor() {
    this.money       = 5000;
    this.xp          = 0;
    this.fuel        = 500;       // Liter
    this.maxFuel     = 500;
    this.damage      = 0;         // 0–100 % (0 = kein Schaden)
    this.cargo       = null;      // { type, mass, jobId } oder null
    this.activeJob   = null;      // JobState-Objekt oder null
    this.gameTime    = 8 * 60;    // 08:00 in Spielminuten
    this.playTime    = 0;         // Echtsekunden gespielt
    this.jobsDone    = 0;
    this.totalEarned = 0;
    this.shipX       = 0;
    this.shipZ       = 0;
    this.shipHeading = 0;
    this.shipSpeed   = 0;
  }

  get fuelPct()    { return Math.max(0, this.fuel / this.maxFuel * 100); }
  get integrityPct() { return Math.max(0, 100 - this.damage); }
  get hasCargo()   { return this.cargo !== null; }

  addMoney(amt, label = '') {
    this.money += amt;
    this.totalEarned += (amt > 0 ? amt : 0);
  }
  spendMoney(amt) {
    if (this.money < amt) return false;
    this.money -= amt;
    return true;
  }

  toJSON() {
    return {
      money: this.money, xp: this.xp, fuel: this.fuel, damage: this.damage,
      cargo: this.cargo, activeJob: this.activeJob,
      gameTime: this.gameTime, playTime: this.playTime,
      jobsDone: this.jobsDone, totalEarned: this.totalEarned,
      shipX: this.shipX, shipZ: this.shipZ, shipHeading: this.shipHeading,
    };
  }

  fromJSON(d) {
    if (!d) return;
    Object.assign(this, d);
  }
}
