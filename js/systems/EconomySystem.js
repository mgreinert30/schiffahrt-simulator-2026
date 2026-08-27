// EconomySystem — Geldverwaltung und Transaktionshistorie

export class EconomySystem {
  constructor(startMoney = 5000) {
    this.money   = startMoney;
    this.history = [];
  }

  add(amount, label = '') {
    this.money += amount;
    this.history.push({ type: 'income',  amount, label, time: Date.now() });
  }

  spend(amount, label = '') {
    if (this.money < amount) return false;
    this.money -= amount;
    this.history.push({ type: 'expense', amount, label, time: Date.now() });
    return true;
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  // Formatierung: € 12.500
  get formatted() {
    return '€ ' + Math.floor(this.money).toLocaleString('de-DE');
  }
}
