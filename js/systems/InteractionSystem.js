// InteractionSystem — F-Taste als einheitlicher Interaktionsauslöser

export class InteractionSystem {
  constructor(game) {
    this.game    = game;
    this._fDown  = false;
    this._cooldown = 0;

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyF' && !this._fDown) {
        this._fDown = true;
        this._tryInteract();
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'KeyF') this._fDown = false;
    });
  }

  _tryInteract() {
    if (this._cooldown > 0) return;

    // Schleuse zuerst prüfen
    const lock = this.game.lock;
    if (lock?.inZone && lock.state === 'idle') {
      const msg = lock.request();
      if (msg) {
        this.game.ui?.showNotification(msg, 4000);
        this.game.ui?.showRadioMessage('🔔 Schleusung bestätigt. Nordheim Lock Control.');
        this._cooldown = 2.0;
        return;
      }
    }

    const port   = this.game.portSystem;
    const action = port.availableAction;
    if (!action) return;

    this._cooldown = 0.5;

    switch (action.type) {
      case 'market': this._openJobMarket(); break;
      case 'load':   this._startLoad();    break;
      case 'unload': this._startUnload();  break;
      case 'fuel':   this._openFuelDialog();   break;
      case 'repair': this._openRepairDialog(); break;
    }
  }

  update(dt) {
    if (this._cooldown > 0) this._cooldown -= dt;
  }

  _openJobMarket() {
    const port = this.game.portSystem.nearPort;
    if (!port) return;
    const jobs = this.game.jobs.jobsAt(port.id);
    this.game.ui.showJobMarket(port, jobs);
  }

  _startLoad() {
    const game  = this.game;
    const job   = game.jobs.active;
    if (!job || game.cargo.isBusy) return;

    // Prüfe Geschwindigkeit
    if (Math.abs(game.physics.speed) > 0.8) {
      game.ui.showNotification('⚠️ Bitte erst stoppen! (< 0.5 kn)', 2000);
      return;
    }

    game.jobs.setLoading();
    const success = game.cargo.startLoad(
      { type: job.cargo.name, mass: job.mass, jobId: job.id },
      () => {
        game.jobs.setInTransit();
        game.ui.showNotification(`✅ Fracht geladen! ${job.mass}t ${job.cargo.name}`, 3500);
        game.ui.updateAll();
        game.save.save();
      }
    );
    if (success) {
      game.ui.showNotification(`📦 Lade ${job.mass}t ${job.cargo.name}...`, 12000);
    }
  }

  _startUnload() {
    const game = this.game;
    if (!game.cargo.hasCargo || game.cargo.isBusy) return;

    if (Math.abs(game.physics.speed) > 0.8) {
      game.ui.showNotification('⚠️ Bitte erst stoppen! (< 0.5 kn)', 2000);
      return;
    }

    game.jobs.setUnloading();
    const noDmgBonus   = game.state.damage < 5;
    const fuelBonus    = game.state.fuel > game.state.maxFuel * 0.25;

    game.cargo.startUnload(() => {
      const result = game.jobs.complete(noDmgBonus, fuelBonus);
      if (result) {
        game.ui.showDeliveryResult(result);
        game.ui.updateAll();
        game.save.save();
      }
    });
    game.ui.showNotification('📬 Fracht wird entladen...', 10000);
  }

  _openFuelDialog() {
    const game = this.game;
    const fuel = game.fuelSystem;
    game.ui.showFuelDialog(
      Math.round(fuel.missingLiters),
      fuel.fullRefuelCost,
      () => {
        const cost = fuel.refuel(fuel.missingLiters);
        if (cost === -1) {
          game.ui.showNotification('❌ Nicht genug Geld!', 2000);
        } else {
          game.ui.showNotification(`⛽ Aufgetankt! -€ ${cost.toLocaleString('de-DE')}`, 3000);
          game.ui.updateAll();
          game.save.save();
        }
      }
    );
  }

  _openRepairDialog() {
    const game = this.game;
    const dmg  = game.damageSystem;
    const cost = dmg.repairCost();
    game.ui.showRepairDialog(
      Math.round(game.state.damage),
      cost,
      () => {
        const paid = dmg.repair();
        if (paid === -1) {
          game.ui.showNotification('❌ Nicht genug Geld!', 2000);
        } else {
          game.ui.showNotification(`🔧 Repariert! -€ ${paid.toLocaleString('de-DE')}`, 3000);
          game.ui.updateAll();
          game.save.save();
        }
      }
    );
  }

  // Auftrag annehmen (aus Job-Market-UI aufgerufen)
  acceptJob(jobId) {
    const game = this.game;
    if (game.jobs.accept(jobId)) {
      game.ui.hideJobMarket();
      game.ui.updateAll();
      const job = game.jobs.active;
      game.ui.showNotification(`✅ Auftrag angenommen! Fahre zur Ladestation in ${job.from.shortName}`, 4000);
      game.save.save();
    }
  }
}
