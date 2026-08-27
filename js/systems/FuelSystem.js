// FuelSystem — Treibstoffverbrauch und Tankstellen-Logik

// Verbrauch in Liter/Minute pro Telegraph-Level (0=Stop … 4=Full)
const FUEL_RATE = [0, 0.25, 0.70, 1.60, 3.50];  // Vorwärts
const FUEL_PRICE_PER_LITER = 1.45;               // €/L

export class FuelSystem {
  constructor(state) {
    this.state       = state;
    this._empty      = false;     // Einmalige Warnung
  }

  // dt in Sekunden, level 0..4 (absoluter Telegraph-Betrag)
  update(dt, absLevel) {
    if (absLevel < 0 || absLevel > 4) absLevel = Math.min(4, Math.abs(absLevel));

    const ratePerSec = (FUEL_RATE[Math.round(absLevel)] ?? 0) / 60;
    this.state.fuel  = Math.max(0, this.state.fuel - ratePerSec * dt);

    if (this.state.fuel <= 0 && !this._empty) {
      this._empty = true;
      return 'EMPTY';   // Signal an game: Motor abschalten
    }
    if (this.state.fuel > 0 && this._empty) this._empty = false;
    return null;
  }

  // Kosten für aufzutankende Menge
  refuelCost(liters) {
    return Math.round(liters * FUEL_PRICE_PER_LITER);
  }

  // Tanken — gibt tatsächliche Kosten zurück oder -1 wenn kein Geld
  refuel(liters) {
    const need = Math.min(liters, this.state.maxFuel - this.state.fuel);
    const cost = this.refuelCost(need);
    if (!this.state.spendMoney(cost)) return -1;
    this.state.fuel = Math.min(this.state.maxFuel, this.state.fuel + need);
    this._empty = false;
    return cost;
  }

  // Für UI: Liter die noch fehlen für vollen Tank
  get missingLiters() {
    return Math.max(0, this.state.maxFuel - this.state.fuel);
  }

  get fullRefuelCost() {
    return this.refuelCost(this.missingLiters);
  }
}
