// CargoSystem — Beladung/Entladung mit physikalischem Effekt auf Schiff

const LOAD_DURATION   = 12;  // Sekunden (Beladung)
const UNLOAD_DURATION = 10;  // Sekunden (Entladung)

export class CargoSystem {
  constructor(state, physics) {
    this.state    = state;
    this.physics  = physics;

    this._loading   = false;
    this._unloading = false;
    this._timer     = 0;
    this._duration  = 0;
    this._pendingCargo = null;
    this._onDone    = null;
  }

  get isLoading()   { return this._loading; }
  get isUnloading() { return this._unloading; }
  get isBusy()      { return this._loading || this._unloading; }
  get progress()    { return this._duration > 0 ? Math.min(1, this._timer / this._duration) : 0; }

  // Beladung starten — cargo: { type, mass, jobId }
  startLoad(cargo, onDone) {
    if (this.isBusy || this.state.hasCargo) return false;
    this._loading      = true;
    this._timer        = 0;
    this._duration     = LOAD_DURATION;
    this._pendingCargo = cargo;
    this._onDone       = onDone;
    return true;
  }

  // Entladung starten
  startUnload(onDone) {
    if (this.isBusy || !this.state.hasCargo) return false;
    this._unloading = true;
    this._timer     = 0;
    this._duration  = UNLOAD_DURATION;
    this._onDone    = onDone;
    return true;
  }

  update(dt) {
    if (!this.isBusy) return;

    this._timer += dt;
    if (this._timer >= this._duration) {
      this._finish();
    }
  }

  _finish() {
    if (this._loading) {
      // Fracht laden → Schiff schwerer
      this.state.cargo      = this._pendingCargo;
      this.physics.cargoMass = this._pendingCargo.mass * 1000; // t → kg
    } else if (this._unloading) {
      // Fracht entladen → Schiff leichter
      this.state.cargo      = null;
      this.physics.cargoMass = 0;
    }

    this._loading      = false;
    this._unloading    = false;
    this._timer        = 0;
    this._pendingCargo = null;

    const cb = this._onDone;
    this._onDone = null;
    if (cb) cb();
  }

  cancel() {
    this._loading   = false;
    this._unloading = false;
    this._timer     = 0;
    this._onDone    = null;
  }

  get cargo()    { return this.state.cargo; }
  get hasCargo() { return this.state.hasCargo; }
}
