// PortSystem — Hafen-Erkennung, Anlegen, Be-/Entladung
import { PORTS } from '../world/WorldMap.js';

export class PortSystem {
  constructor(game) {
    this.game       = game;
    this.nearPort   = null;    // Hafen in Reichweite
    this.docking    = false;
    this.loadTimer  = 0;
    this.loadDuration = 4;     // Sekunden für Beladung
    this._promptOpen = false;
  }

  update(dt, shipX, shipZ) {
    const prev = this.nearPort;

    // Nächsten Hafen in Reichweite prüfen
    this.nearPort = null;
    for (const port of PORTS) {
      const dist = Math.hypot(shipX - port.x, shipZ - port.z);
      if (dist < port.radius) {
        this.nearPort = port;
        break;
      }
    }

    // Hafen betreten
    if (!prev && this.nearPort) {
      this.game.ui.showNotification(`⚓ ${this.nearPort.name} — Drücke E zum Anlegen`, 3000);
      this.game.ui.setPortPrompt(this.nearPort, this.game.jobs);
    }
    // Hafen verlassen
    if (prev && !this.nearPort) {
      this.closePrompt();
    }

    // Beladungs-Animation
    if (this.docking) {
      this.loadTimer += dt;
      const pct = Math.min(1, this.loadTimer / this.loadDuration);
      this.game.ui.setLoadingProgress(pct);
      if (this.loadTimer >= this.loadDuration) {
        this._finishLoading();
      }
    }
  }

  openPrompt() {
    if (!this.nearPort) return;
    this._promptOpen = true;
    this.game.ui.showPortPrompt(this.nearPort, this.game.jobs);
  }

  closePrompt() {
    this._promptOpen = false;
    this.game.ui.hidePortPrompt();
  }

  // Auftrag annehmen und Beladung starten
  startLoading(jobId) {
    if (!this.game.jobs.accept(jobId)) return;
    this.closePrompt();
    this.docking   = true;
    this.loadTimer = 0;
    this.game.ui.showNotification(`📦 Fracht wird geladen... (${this.loadDuration}s)`, this.loadDuration * 1000);
  }

  // Lieferung abschließen
  deliver() {
    const job = this.game.jobs.active;
    if (!job) return;
    if (!this.game.jobs.isAtDestination(this.nearPort?.id)) return;

    this.docking   = false;
    this.loadTimer = 0;
    this.closePrompt();

    const result = this.game.jobs.complete(true);
    if (result) {
      this.game.ui.showDeliveryResult(result);
    }
  }

  _finishLoading() {
    this.docking   = false;
    this.loadTimer = 0;
    this.game.ui.setLoadingProgress(0);
    this.game.ui.showNotification('✅ Fracht geladen! Fahrt zum Zielhafen.', 3000);
    this.game.ui.updateJobPanel(this.game.jobs);
  }
}
