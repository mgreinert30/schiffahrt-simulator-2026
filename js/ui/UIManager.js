// UIManager — Vollständige HUD, Overlays, Job-Market, Dialoge
import { PORTS } from '../world/WorldMap.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this._notifTO = null;
    this._pendingFuelCb   = null;
    this._pendingRepairCb = null;

    // HUD
    this.$hud        = document.getElementById('hud');
    this.$speed      = document.getElementById('speed-display');
    this.$engine     = document.getElementById('engine-display');
    this.$fuelBar    = document.getElementById('fuel-bar');
    this.$fuelText   = document.getElementById('fuel-text');
    this.$money      = document.getElementById('money-display');
    this.$time       = document.getElementById('time-display');
    this.$compass    = document.getElementById('compass-display');
    this.$rudder     = document.getElementById('rudder-indicator');
    this.$engFwd     = document.getElementById('engine-fwd');
    this.$engRev     = document.getElementById('engine-rev');
    this.$notif      = document.getElementById('notification');
    this.$jobTitle   = document.getElementById('job-title');
    this.$jobCargo   = document.getElementById('job-cargo');
    this.$jobDest    = document.getElementById('job-dest');
    this.$jobReward  = document.getElementById('job-reward');
    this.$dmgBar     = document.getElementById('damage-bar');
    this.$dmgText    = document.getElementById('damage-text');
    this.$cargoBadge = document.getElementById('cargo-badge');
    this.$interact   = document.getElementById('interaction-prompt');
    this.$interactTx = document.getElementById('interaction-text');
    this.$depthWarn  = document.getElementById('depth-warning');
    this.$debug      = document.getElementById('debug-overlay');
    this.$camMode    = document.getElementById('cam-mode-display');
    this.$jobDist    = document.getElementById('job-distance');

    // Event-Listener
    document.getElementById('close-map')?.addEventListener('click', () => this.hideMap());
    document.getElementById('close-delivery')?.addEventListener('click', () => document.getElementById('delivery-overlay').classList.add('hidden'));
    document.getElementById('close-job-market')?.addEventListener('click', () => this.hideJobMarket());
    document.getElementById('fuel-cancel')?.addEventListener('click', () => this.hideFuelDialog());
    document.getElementById('fuel-confirm')?.addEventListener('click', () => { if (this._pendingFuelCb) { this._pendingFuelCb(); this.hideFuelDialog(); } });
    document.getElementById('repair-cancel')?.addEventListener('click', () => this.hideRepairDialog());
    document.getElementById('repair-confirm')?.addEventListener('click', () => { if (this._pendingRepairCb) { this._pendingRepairCb(); this.hideRepairDialog(); } });

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyM') this.toggleMap();
      if (e.code === 'Tab')  { e.preventDefault(); this.toggleDebug(); }
    });
  }

  showHUD() { this.$hud?.classList.remove('hidden'); }
  hideHUD() { this.$hud?.classList.add('hidden'); }

  // ── Frame-Update ──────────────────────────────────────────────────────────
  update(dt, physics, controller) {
    const state = this.game.state;
    const jobs  = this.game.jobs;
    const nav   = this.game.navigation;
    const time  = this.game.timeSystem;

    // Geschwindigkeit
    if (this.$speed) this.$speed.textContent = `${Math.abs(physics.speedKnots).toFixed(1)} kn`;

    // Kompass
    if (this.$compass) this.$compass.textContent = physics.compassHeading;

    // Uhrzeit
    if (this.$time && time) this.$time.textContent = time.formatted;

    // Telegraph-Motor
    if (this.$engine && controller) {
      const lvl   = physics.telegraphLevel;
      const label = controller.telegraphLabel;
      if (this.$engine) this.$engine.textContent = label;
      const fwd = lvl > 0 ? `${Math.round(lvl / 4 * 100)}%` : '0%';
      const rev = lvl < 0 ? `${Math.round(-lvl / 4 * 100)}%` : '0%';
      if (this.$engFwd) this.$engFwd.style.setProperty('--fill', fwd);
      if (this.$engRev) this.$engRev.style.setProperty('--fill', rev);
    }

    // Treibstoff
    if (this.$fuelBar && this.$fuelText) {
      const pct = state.fuelPct;
      this.$fuelBar.style.width = `${pct.toFixed(1)}%`;
      this.$fuelText.textContent = `${Math.round(pct)}%`;
      this.$fuelBar.style.background = pct < 20
        ? 'linear-gradient(90deg,#ef4444,#f87171)' : '';
    }

    // Schaden
    if (this.$dmgBar && this.$dmgText) {
      const intg = state.integrityPct;
      this.$dmgBar.style.width = `${intg}%`;
      this.$dmgText.textContent = `${Math.round(intg)}%`;
      this.$dmgBar.style.background = intg < 40
        ? 'linear-gradient(90deg,#ef4444,#f87171)'
        : intg < 70 ? 'linear-gradient(90deg,#f59e0b,#fcd34d)' : '';
    }

    // Geld
    if (this.$money) this.$money.textContent = '€ ' + Math.floor(state.money).toLocaleString('de-DE');

    // Ruder
    if (this.$rudder) {
      const pct = ((physics.rudder + 1) / 2) * 100;
      this.$rudder.style.left = `${pct}%`;
    }

    // Cargo-Badge
    if (this.$cargoBadge) {
      this.$cargoBadge.style.display = state.hasCargo ? '' : 'none';
      if (state.hasCargo) this.$cargoBadge.textContent = `📦 ${state.cargo.mass}t`;
    }

    // Job-Panel
    this._updateJobPanel(jobs, nav);

    // Kamera-Modus
    if (this.$camMode && this.game.camCtrl) {
      this.$camMode.textContent = this.game.camCtrl.modeLabel;
    }

    // Interaktions-Prompt
    const action = this.game.portSystem?.availableAction;
    if (this.$interact) {
      if (action && !this.game.cargo?.isBusy) {
        this.$interactTx.textContent = action.label;
        this.$interact.classList.remove('hidden');
      } else {
        this.$interact.classList.add('hidden');
      }
    }

    // Wassertiefe-Warnung
    if (this.$depthWarn && this.game.collisionSystem) {
      const depth = this.game.collisionSystem.waterDepth;
      const draft = physics.draft ?? 1.4;
      if (depth < draft * 1.3) {
        this.$depthWarn.textContent = `⚠️ FLACHWASSER ${depth.toFixed(1)}m / Tiefgang ${draft.toFixed(1)}m`;
        this.$depthWarn.classList.remove('hidden');
      } else {
        this.$depthWarn.classList.add('hidden');
      }
    }

    // Lade-Fortschritt
    if (this.game.cargo?.isBusy) {
      const pct = Math.round(this.game.cargo.progress * 100);
      const op  = this.game.cargo.isLoading ? 'Laden' : 'Entladen';
      this.showNotification(`📦 ${op}... ${pct}%`, 300);
    }

    // Debug
    this._updateDebug(physics);
  }

  _updateJobPanel(jobs, nav) {
    const job = jobs.active;
    if (!job) {
      if (this.$jobTitle)  this.$jobTitle.textContent  = 'Kein aktiver Auftrag';
      if (this.$jobCargo)  this.$jobCargo.textContent  = 'Fahre in einen Hafen [F]';
      if (this.$jobDest)   this.$jobDest.textContent   = '';
      if (this.$jobReward) this.$jobReward.textContent = '';
      if (this.$jobDist)   this.$jobDist.textContent   = '';
      return;
    }

    if (this.$jobTitle) this.$jobTitle.textContent = `${job.cargo.icon} ${job.cargo.name}`;
    if (this.$jobCargo) this.$jobCargo.textContent = `${job.mass}t`;

    const statusEmoji = { accepted: '📍', loading: '📦', in_transit: '🚢', unloading: '📬' };
    const emoji = statusEmoji[job.status] ?? '';

    if (this.$jobDest) this.$jobDest.textContent = `${emoji} → ${job.to.shortName}`;
    if (this.$jobReward) this.$jobReward.textContent = `€ ${job.reward.toLocaleString('de-DE')}`;

    // Distanz zum Ziel
    if (nav && this.$jobDist) {
      const dist = nav.distanceToTarget;
      if (dist !== null) {
        this.$jobDist.textContent = `${dist.toFixed(1)} km`;
      }
    }
  }

  // ── Benachrichtigung ───────────────────────────────────────────────────────
  showNotification(msg, duration = 2500) {
    if (!this.$notif) return;
    this.$notif.textContent = msg;
    this.$notif.classList.remove('hidden');
    clearTimeout(this._notifTO);
    if (duration > 500) {
      this._notifTO = setTimeout(() => this.$notif.classList.add('hidden'), duration);
    }
  }

  // ── Port Events ────────────────────────────────────────────────────────────
  onPortEnter(port) {
    this.showNotification(`⚓ ${port.name}`, 3000);
  }
  onPortExit() { /* noop */ }

  // ── Job Market ─────────────────────────────────────────────────────────────
  showJobMarket(port, jobs) {
    const el   = document.getElementById('job-market-overlay');
    const name = document.getElementById('job-market-port-name');
    const list = document.getElementById('job-market-list');
    if (!el || !list) return;

    if (name) name.textContent = `⚓ ${port.name} — Auftragsmarkt`;
    list.innerHTML = '';

    if (jobs.length === 0) {
      list.innerHTML = '<div class="jm-empty">Keine Aufträge verfügbar.</div>';
    } else {
      for (const job of jobs) {
        const card = document.createElement('div');
        card.className = 'jm-card';
        card.innerHTML = `
          <div class="jm-cargo">${job.cargo.icon} <strong>${job.cargo.name}</strong></div>
          <div class="jm-route">${job.from.shortName} → ${job.to.shortName}</div>
          <div class="jm-details">
            <span>📦 ${job.mass} t</span>
            <span>📏 ${(job.dist / 200).toFixed(1)} km</span>
          </div>
          <div class="jm-reward">€ ${job.reward.toLocaleString('de-DE')} <span class="jm-bonus">+€${job.bonus} Bonus</span></div>
          <button class="btn-primary jm-accept" data-id="${job.id}">Auftrag annehmen</button>
        `;
        list.appendChild(card);
      }
      list.querySelectorAll('.jm-accept').forEach(btn => {
        btn.addEventListener('click', () => {
          this.game.interaction.acceptJob(btn.dataset.id);
        });
      });
    }
    el.classList.remove('hidden');
  }

  hideJobMarket() {
    document.getElementById('job-market-overlay')?.classList.add('hidden');
  }

  // ── Fuel Dialog ────────────────────────────────────────────────────────────
  showFuelDialog(liters, cost, onConfirm) {
    this._pendingFuelCb = onConfirm;
    document.getElementById('fuel-liters')
      && (document.getElementById('fuel-liters').textContent = `${liters} L`);
    document.getElementById('fuel-cost-display')
      && (document.getElementById('fuel-cost-display').textContent = `€ ${cost.toLocaleString('de-DE')}`);
    document.getElementById('fuel-dialog')?.classList.remove('hidden');
  }
  hideFuelDialog() {
    document.getElementById('fuel-dialog')?.classList.add('hidden');
    this._pendingFuelCb = null;
  }

  // ── Repair Dialog ──────────────────────────────────────────────────────────
  showRepairDialog(dmgPct, cost, onConfirm) {
    this._pendingRepairCb = onConfirm;
    document.getElementById('repair-dmg')
      && (document.getElementById('repair-dmg').textContent = `${dmgPct} % Schaden`);
    document.getElementById('repair-cost-display')
      && (document.getElementById('repair-cost-display').textContent = `€ ${cost.toLocaleString('de-DE')}`);
    document.getElementById('repair-dialog')?.classList.remove('hidden');
  }
  hideRepairDialog() {
    document.getElementById('repair-dialog')?.classList.add('hidden');
    this._pendingRepairCb = null;
  }

  // ── Delivery Result ─────────────────────────────────────────────────────────
  showDeliveryResult(result) {
    const el      = document.getElementById('delivery-overlay');
    const details = document.getElementById('delivery-details');
    if (!el || !details) return;

    const rows = result.breakdown.map(b =>
      `<div class="delivery-row"><span>${b.label}</span><span>€ ${b.amt.toLocaleString('de-DE')}</span></div>`
    ).join('');

    details.innerHTML = `
      ${rows}
      <div class="delivery-row total-row">
        <span><strong>Gesamt erhalten</strong></span>
        <span class="reward-total">€ ${result.total.toLocaleString('de-DE')}</span>
      </div>
      <div class="delivery-stat">${result.job.cargo.icon} ${result.job.cargo.name} · ${result.job.mass}t</div>
    `;
    el.classList.remove('hidden');
    this.updateAll();
  }

  // ── Karte ─────────────────────────────────────────────────────────────────
  toggleMap() {
    const el = document.getElementById('map-overlay');
    if (!el) return;
    if (el.classList.contains('hidden')) { this.renderMap(); el.classList.remove('hidden'); }
    else el.classList.add('hidden');
  }

  hideMap() { document.getElementById('map-overlay')?.classList.add('hidden'); }

  renderMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const RANGE = 2400;
    const toX = x => (x + RANGE) / (RANGE * 2) * W;
    const toZ = z => (z + RANGE) / (RANGE * 2) * H;

    // Hintergrund — Wasser
    ctx.fillStyle = '#0a1e38'; ctx.fillRect(0, 0, W, H);

    // Ufer (Grün)
    ctx.fillStyle = '#1e4010';
    ctx.fillRect(0, 0, toX(-215), H);
    ctx.fillRect(toX(215), 0, W - toX(215), H);

    // Hafenarme
    const arms = [
      { x: -460, z: -1110, w: 245, h: 300 },   // industriehafen
      { x: 215, z: 800, w: 245, h: 260 },        // stadthafen
      { x: 215, z: -340, w: 515, h: 280 },       // terminal_ost
    ];
    ctx.fillStyle = '#0a1e38';
    for (const a of arms) ctx.fillRect(toX(a.x), toZ(a.z), toX(a.x + a.w) - toX(a.x), toZ(a.z + a.h) - toZ(a.z));

    // Fahrrinne (gestrichelt)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.setLineDash([6,6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), H); ctx.stroke();
    ctx.setLineDash([]);

    // Aktive Route
    const job = this.game.jobs.active;
    if (job) {
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(toX(job.from.x), toZ(job.from.z));
      ctx.lineTo(toX(job.to.x), toZ(job.to.z));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Häfen
    for (const p of PORTS) {
      const mx = toX(p.x), mz = toZ(p.z);
      ctx.beginPath(); ctx.arc(mx, mz, 8, 0, Math.PI*2);
      ctx.fillStyle = p === job?.to ? '#22c55e' : '#facc15';
      ctx.fill();
      if (p === job?.to) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, mz, 14, 0, Math.PI*2); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
      ctx.fillText(p.shortName, mx + 12, mz + 4);
    }

    // Spielerschiff (Dreieck)
    const ph = this.game.physics;
    if (ph) {
      const sx = toX(ph.x), sz = toZ(ph.z);
      ctx.save(); ctx.translate(sx, sz); ctx.rotate(ph.heading);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 8); ctx.lineTo(-5, 8);
      ctx.closePath(); ctx.fill(); ctx.restore();

      // Kurs-Linie
      if (job) {
        ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, sz);
        ctx.lineTo(toX(job.to.x), toZ(job.to.z)); ctx.stroke();
      }
    }

    // NPC-Schiffe
    if (this.game.npcSystem) {
      ctx.fillStyle = '#aaa';
      for (const npc of this.game.npcSystem.positions) {
        ctx.beginPath(); ctx.arc(toX(npc.x), toZ(npc.z), 3, 0, Math.PI*2); ctx.fill();
      }
    }

    // Rahmen
    ctx.strokeStyle = 'rgba(59,130,246,0.3)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W-2, H-2);
  }

  // ── Debug-Overlay ─────────────────────────────────────────────────────────
  toggleDebug() {
    if (this.$debug) this.$debug.classList.toggle('hidden');
  }

  _updateDebug(ph) {
    if (!this.$debug || this.$debug.classList.contains('hidden')) return;
    const state = this.game.state;
    const col   = this.game.collisionSystem;
    this.$debug.innerHTML = `
      <div><b>SPEED</b> ${ph.speed.toFixed(2)} m/s · ${ph.speedKnots.toFixed(1)} kn</div>
      <div><b>TELEGRAPH</b> ${ph.telegraphLevel} · ${this.game.controller?.telegraphLabel}</div>
      <div><b>HEADING</b> ${(ph.heading * 180/Math.PI).toFixed(1)}°</div>
      <div><b>POS</b> x=${ph.x.toFixed(0)} z=${ph.z.toFixed(0)}</div>
      <div><b>MASS</b> ${(ph.totalMass/1000).toFixed(0)} t</div>
      <div><b>DRAFT</b> ${ph.draft?.toFixed(2)} m</div>
      <div><b>FUEL</b> ${state.fuel.toFixed(0)} L (${state.fuelPct.toFixed(0)}%)</div>
      <div><b>DAMAGE</b> ${state.damage.toFixed(1)}%</div>
      <div><b>DEPTH</b> ${col?.waterDepth.toFixed(1)} m</div>
      <div><b>CARGO</b> ${state.hasCargo ? state.cargo.type + ' ' + state.cargo.mass + 't' : 'leer'}</div>
      <div><b>ZONE</b> ${this.game.portSystem?.nearPort?.shortName ?? '—'} / ${this.game.portSystem?.currentZone ?? '—'}</div>
    `;
  }

  // ── Sammel-Update ─────────────────────────────────────────────────────────
  updateAll() {
    const jobs = this.game.jobs;
    const nav  = this.game.navigation;
    this._updateJobPanel(jobs, nav);
    if (this.$money) this.$money.textContent = '€ ' + Math.floor(this.game.state.money).toLocaleString('de-DE');
  }
}
