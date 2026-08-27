// EconomySystem — Wrapper um GameState für Geldverwaltung
export class EconomySystem {
  constructor(state) {
    this.state = state;
  }

  add(amount, label = '') {
    this.state.addMoney(amount, label);
  }

  spend(amount, label = '') {
    return this.state.spendMoney(amount);
  }

  canAfford(amount) {
    return this.state.money >= amount;
  }

  get money()     { return this.state.money; }
  get formatted() {
    return '€ ' + Math.floor(this.state.money).toLocaleString('de-DE');
  }
}
