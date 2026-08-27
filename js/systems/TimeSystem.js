// TimeSystem — Spielzeit-Zyklus (1 Echtzeitsekunde = 5 Spielminuten)
export const GAME_MINUTES_PER_REAL_SEC = 5;

export class TimeSystem {
  constructor(state) {
    this.state = state;
  }

  update(dt) {
    this.state.gameTime += dt * GAME_MINUTES_PER_REAL_SEC;
    if (this.state.gameTime >= 1440) this.state.gameTime -= 1440;
    this.state.playTime += dt;
  }

  get hours()   { return Math.floor(this.state.gameTime / 60); }
  get minutes() { return Math.floor(this.state.gameTime % 60); }

  get formatted() {
    return `${String(this.hours).padStart(2,'0')}:${String(this.minutes).padStart(2,'0')}`;
  }

  // 0 (Mitternacht) … 1 (Mittag) … 0 (Mitternacht) — für Sky-System
  get dayFraction() {
    const h = this.state.gameTime / 60;
    return Math.max(0, Math.sin((h - 6) / 24 * Math.PI * 2));
  }
}
