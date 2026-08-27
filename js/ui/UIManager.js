// UIManager — HUD, Menüs, Overlays
import { PORTS } from '../world/WorldMap.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    this.$hud       = document.getElementById('hud');
    this.$speed     = document.getElementById('speed-display');
    this.$engine    = document.getElementById('engine-display');
    this.$fuelBar   = document.getElementById('fuel-bar');
    this.$fuelText  = document.getElementById('fuel-text');
    this.$money     = document.getElementById('money-display');
    this.$time      = document.getElementById('time-display');
    this.$compass   = document.getElementById('compass-display');
    this.$rudder    = document.getElementById('rudder-indicator');
    this.$engFwd    = document.getElementById('engine-fwd');
    this.$engRev    = document.getElementById('engine-rev');
    this.$notif     = document.getElementById('notification');
    this.$jobTitle  = document.getElementById('job-title');
    this.$jobCargo  = document.getElementById('job-cargo');
    this.$jobDest   = document.getElementById('job-dest');
    this.$jobReward = document.getElementById('job-reward');

    this._notifTimeout = null;
    this._gameTime = 8 * 60; // 08:00 in Minuten

    // Karte
    document.getElementById('close-map').addEventListener('click', () => this.hideMap());
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyM') this.toggleMap();
      if (e.code === 'KeyE') { if (game.portSystem.nearPort) game.portSystem.openPrompt(); }
    });

    // Lieferung schließen
    document.getElementById('close-delivery').addEventListener('click', () => {
      document.getElementById('delivery-overlay').classList.add('hidden');
    });
  }

  showHUD()  { this.$hud.classList.remove('hidden'); }
  hideHUD()  { this.$hud.classList.add('hidden'); }

  // Wird jedes Frame aufgerufen
  update(dt, physics, controller) {
    // Spielzeit (1 Echtzeitsekunde = 3 Spielminuten)
    this._gameTime += dt * 3;
    if (this._gameTime >= 24 * 60) this._gameTime -= 24 * 60;

    const h = Math.floor(this._gameTime / 60);
    const m = Math.floor(this._gameTime % 60);
    this.$time.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

    // Geschwindigkeit
    const kn = Math.abs(physics.speedKnots).toFixed(1);
    this.$speed.textContent = `${kn} kn`;

    // Kompass
    this.$compass.textContent = physics.compassHeading;

    // Motor-Status
    const thr = physics.throttle;
    if (thr > 0.05)       this.$engine.textContent = `VORWÄRTS (${Math.round(thr*100)}%)`;
    else if (thr < -0.05) this.$engine.textContent = `RÜCKWÄRTS (${Math.round(-thr*100)}%)`;
    else                   this.$engine.textContent = 'STOP';

    // Motor-Bars
    const fwdPct = thr > 0 ? `${Math.round(thr * 100)}%` : '0%';
    const revPct = thr < 0 ? `${Math.round(-thr * 100)}%` : '0%';
    this.$engFwd.style.setProperty('--fill', fwdPct);
    this.$engRev.style.setProperty('--fill', revPct);

    // Treibstoff
    const fuel = physics.fuel;
    this.$fuelBar.style.width = `${fuel}%`;
    this.$fuelText.textContent = `${Math.round(fuel)}%`;
    if (fuel < 20) this.$fuelBar.style.background = 'linear-gradient(90deg,#ef4444,#f87171)';
    else           this.$fuelBar.style.background = '';

    // Ruder-Indikator (50% = Mitte, 0% = ganz rechts, 100% = ganz links)
    const rudderPct = ((physics.rudder + 1) / 2) * 100;
    this.$rudder.style.left = `${rudderPct}%`;

    // Geld
    this.$money.textContent = this.game.economy.formatted;
  }

  updateJobPanel(jobs) {
    const job = jobs.active;
    if (!job) {
      this.$jobTitle.textContent  = 'Kein aktiver Auftrag';
      this.$jobCargo.textContent  = 'Gehe zu einem Hafen, um Aufträge anzunehmen.';
      this.$jobDest.textContent   = '';
      this.$jobReward.textContent = '';
    } else {
      this.$jobTitle.textContent  = `${job.cargo.icon} ${job.cargo.name}`;
      this.$jobCargo.textContent  = `${job.weight}t · ${job.dist} km`;
      this.$jobDest.textContent   = `→ ${job.to.name}`;
      this.$jobReward.textContent = `€ ${job.reward.toLocaleString('de-DE')}`;
    }
  }

  showNotification(msg, duration = 2500) {
    this.$notif.textContent = msg;
    this.$notif.classList.remove('hidden');
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      this.$notif.classList.add('hidden');
    }, duration);
  }

  setLoadingProgress(pct) {
    // Zeigt Ladebalken im Notification-Bereich
    if (pct > 0 && pct < 1) {
      this.$notif.textContent = `📦 Lade Fracht... ${Math.round(pct*100)}%`;
      this.$notif.classList.remove('hidden');
    } else if (pct >= 1) {
      this.$notif.classList.add('hidden');
    }
  }

  // --- Port Prompt ---
  setPortPrompt(port, jobs) { /* Minivorschau — wird durch showPortPrompt ersetzt */ }

  showPortPrompt(port, jobs) {
    const el   = document.getElementById('port-prompt');
    const name = document.getElementById('port-prompt-name');
    const desc = document.getElementById('port-prompt-desc');
    const acts = document.getElementById('port-actions');

    name.textContent = port.name;
    desc.textContent = `Verfügbare Produkte: ${port.produces.join(', ')}`;
    acts.innerHTML   = '';

    const availableJobs = jobs.jobsAt(port.id);

    if (jobs.hasActive && jobs.isAtDestination(port.id)) {
      // Lieferbutton
      const job = jobs.active;
      const btn = document.createElement('button');
      btn.className = 'btn-action';
      btn.innerHTML = `📦 Fracht entladen: ${job.cargo.icon} ${job.cargo.name}<span class="action-reward">+ € ${job.active?.reward ?? job.reward}</span>`;
      btn.onclick = () => { window.game.portSystem.deliver(); };
      acts.appendChild(btn);
    } else if (!jobs.hasActive && availableJobs.length > 0) {
      // Auftragsbuttons
      for (const job of availableJobs) {
        const btn = document.createElement('button');
        btn.className = 'btn-action';
        btn.innerHTML = `${job.cargo.icon} ${job.cargo.name} → ${job.to.shortName} (${job.weight}t)<span class="action-reward">€ ${job.reward.toLocaleString('de-DE')}</span>`;
        btn.onclick = () => {
          window.game.portSystem.startLoading(job.id);
          this.hidePortPrompt();
          this.updateJobPanel(window.game.jobs);
        };
        acts.appendChild(btn);
      }
    } else if (jobs.hasActive) {
      const info = document.createElement('div');
      info.style.cssText = 'color:#6080a0;font-size:13px;margin:8px 0';
      info.textContent   = 'Fahre zunächst deinen aktiven Auftrag ab.';
      acts.appendChild(info);
    } else {
      const info = document.createElement('div');
      info.style.cssText = 'color:#6080a0;font-size:13px;margin:8px 0';
      info.textContent   = 'Keine Aufträge von diesem Hafen verfügbar.';
      acts.appendChild(info);
    }

    el.classList.remove('hidden');
  }

  hidePortPrompt() {
    document.getElementById('port-prompt').classList.add('hidden');
  }

  // --- Karte ---
  toggleMap() {
    const el = document.getElementById('map-overlay');
    if (el.classList.contains('hidden')) {
      this.renderMap();
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  hideMap() {
    document.getElementById('map-overlay').classList.add('hidden');
  }

  renderMap() {
    const canvas = document.getElementById('map-canvas');
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Weltkoordinaten → Karte (Skalierung)
    const WORLD_RANGE = 2400;
    const toMapX = x => (x + WORLD_RANGE) / (WORLD_RANGE * 2) * W;
    const toMapZ = z => (z + WORLD_RANGE) / (WORLD_RANGE * 2) * H;

    // Hintergrund (Wasser)
    ctx.fillStyle = '#0a1e38';
    ctx.fillRect(0, 0, W, H);

    // Wellen-Muster
    ctx.strokeStyle = 'rgba(59,130,246,0.15)';
    ctx.lineWidth   = 1;
    for (let z = 0; z < H; z += 30) {
      ctx.beginPath();
      ctx.moveTo(0, z);
      ctx.lineTo(W, z);
      ctx.stroke();
    }

    // Landmassen
    ctx.fillStyle = '#2d5a1b';
    ctx.fillRect(0, 0, toMapX(-800), H);
    ctx.fillRect(toMapX(800), 0, W - toMapX(800), H);

    // Fahrrinne-Markierung
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(toMapX(0), 0);
    ctx.lineTo(toMapX(0), H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Routen-Linie (aktiver Auftrag)
    const job = this.game.jobs.active;
    if (job) {
      ctx.strokeStyle = 'rgba(34,197,94,0.6)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(toMapX(job.from.x), toMapZ(job.from.z));
      ctx.lineTo(toMapX(job.to.x),   toMapZ(job.to.z));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Häfen
    for (const port of PORTS) {
      const mx = toMapX(port.x);
      const mz = toMapZ(port.z);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mx, mz, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.fillStyle  = '#fff';
      ctx.font       = '11px sans-serif';
      ctx.fillText(port.shortName, mx + 12, mz + 4);
    }

    // Ziel-Hafen hervorheben
    if (job) {
      const to = job.to;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.arc(toMapX(to.x), toMapZ(to.z), 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Spielerschiff
    const ph = this.game.physics;
    if (ph) {
      const sx = toMapX(ph.x);
      const sz = toMapZ(ph.z);
      ctx.save();
      ctx.translate(sx, sz);
      ctx.rotate(ph.heading);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(5, 8);
      ctx.lineTo(-5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Rahmen
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W-2, H-2);
  }

  // --- Lieferergebnis ---
  showDeliveryResult(result) {
    const el      = document.getElementById('delivery-overlay');
    const details = document.getElementById('delivery-details');
    const { job, reward, onTime } = result;

    details.innerHTML = `
      <div class="delivery-row"><span>Grundvergütung</span><span>€ ${job.reward.toLocaleString('de-DE')}</span></div>
      ${onTime ? `<div class="delivery-row"><span>Pünktlichkeits-Bonus</span><span>+ € ${job.bonus.toLocaleString('de-DE')}</span></div>` : ''}
      <div class="delivery-row"><span>Frachtart</span><span>${job.cargo.icon} ${job.cargo.name}</span></div>
      <div class="delivery-row"><span><strong>Gesamt erhalten</strong></span><span>€ ${reward.toLocaleString('de-DE')}</span></div>
    `;
    el.classList.remove('hidden');
    this.updateJobPanel(this.game.jobs);
  }
}
