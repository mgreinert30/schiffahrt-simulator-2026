// SaveSystem — Speichern & Laden via localStorage + Autosave

const SAVE_KEY     = 'schiff2026_save';
const AUTOSAVE_INT = 60; // Sekunden

export class SaveSystem {
  constructor(game) {
    this.game     = game;
    this._timer   = 0;
    this._version = 2;
  }

  update(dt) {
    this._timer += dt;
    if (this._timer >= AUTOSAVE_INT) {
      this._timer = 0;
      this.save();
    }
  }

  save() {
    const g  = this.game;
    const ph = g.physics;
    const st = g.state;

    // Sync aktuelle Physik-Position in State
    st.shipX       = ph.x;
    st.shipZ       = ph.z;
    st.shipHeading = ph.heading;
    st.shipSpeed   = ph.speed;

    const data = {
      version:   this._version,
      timestamp: Date.now(),
      state:     st.toJSON(),
      jobs:      {
        available: g.jobs.available,
        seed:      g.jobs._seed,
        completed: g.jobs.completed,
      },
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== this._version) return false;

      const g = this.game;
      g.state.fromJSON(data.state);

      // Physik-Zustand wiederherstellen
      g.physics.x       = g.state.shipX;
      g.physics.z       = g.state.shipZ;
      g.physics.heading = g.state.shipHeading;
      g.physics.speed   = 0; // Spieler soll nicht mit Fahrt starten

      if (data.jobs) {
        g.jobs.available  = data.jobs.available || [];
        g.jobs._seed      = data.jobs.seed || 1337;
        g.jobs.completed  = data.jobs.completed || 0;
      }
      if (g.state.activeJob) {
        g.jobs.active = g.state.activeJob;
      }
      return true;
    } catch {
      return false;
    }
  }

  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  }
}
