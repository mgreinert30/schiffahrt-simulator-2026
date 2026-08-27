// TutorialSystem — Schritt-für-Schritt Einführung für neue Spieler
import { PORTS } from '../world/WorldMap.js';

const STEPS = [
  {
    id: 'welcome',
    title: '⚓ Willkommen, Kapitän!',
    text: 'Du bist Kapitän eines Frachtschiffes auf dem Rhein.\nDeine Aufgabe: Transportaufträge annehmen, Fracht laden, Geld verdienen und dein Schiff ausbauen.',
    arrow: null,
    action: null,
  },
  {
    id: 'controls',
    title: '🎮 Steuerung',
    text: 'W / S → Maschinenleistung (je Klick eine Stufe)\nA / D → Ruder links / rechts\nF → Interaktion (Auftrag, Tanken, ...)\nM → Navigationskarte\nC → Kamera wechseln\nH → Horn\nP → Schiffsshop\nTab → Debug-Info',
    arrow: null,
    action: null,
  },
  {
    id: 'go_north',
    title: '⬆️ Fahre nach Nordheim',
    text: 'Drücke W mehrmals um Fahrt aufzunehmen. Dein Ziel: Industriehafen Nordheim im Norden.\nDrücke M um die Karte zu öffnen.',
    arrow: 'north',
    action: 'reach_port:industriehafen',
    hint: 'Fahre in den Hafen (gelber Kreis auf der Karte)',
  },
  {
    id: 'open_market',
    title: '📋 Auftragsmarkt',
    text: 'Du bist im Hafen!\nFahre langsam zur Ladestation und drücke F um den Auftragsmarkt zu öffnen.',
    arrow: null,
    action: 'open_market',
    hint: '[F] drücken wenn die Aufforderung erscheint',
  },
  {
    id: 'accept_job',
    title: '✅ Auftrag annehmen',
    text: 'Wähle einen Auftrag aus und klicke auf "Auftrag annehmen".\nDas Ziel erscheint danach auf der Karte.',
    arrow: null,
    action: 'accept_job',
  },
  {
    id: 'load_cargo',
    title: '📦 Fracht laden',
    text: 'Stoppe das Schiff an der Ladestation (< 0,5 kn) und drücke F.\nDie Fracht wird innerhalb von ~12 Sekunden geladen.',
    arrow: null,
    action: 'load_cargo',
    hint: '[W] mehrmals für Stop, [F] zum Laden',
  },
  {
    id: 'navigate',
    title: '🗺️ Navigation',
    text: 'Die Route ist auf der Karte [M] eingezeichnet.\nFahre zum Zielhafen. Achte auf Kollisionen!',
    arrow: null,
    action: 'reach_dest',
    hint: 'Ziel: Stadthafen Rheinburg im Süden',
  },
  {
    id: 'unload',
    title: '📬 Entladen',
    text: 'Stoppe im Zielhafen und drücke F zum Entladen.',
    arrow: null,
    action: 'unload_cargo',
  },
  {
    id: 'complete',
    title: '🎉 Erster Auftrag geschafft!',
    text: 'Glückwunsch! Du hast deinen ersten Auftrag abgeschlossen und Geld verdient.\nMit dem Geld kannst du im Schiffsshop [P] dein Schiff aufrüsten oder neue Schiffe kaufen!',
    arrow: null,
    action: null,
    final: true,
  },
];

export class TutorialSystem {
  constructor(game) {
    this.game    = game;
    this._step   = 0;
    this._active = true;
    this._done   = false;

    // Prüfe ob Tutorial bereits abgeschlossen
    if (localStorage.getItem('tutorial_done') === '1') {
      this._active = false;
      this._done   = true;
    }

    this._renderStep();
  }

  get active()    { return this._active; }
  get isDone()    { return this._done; }
  get stepData()  { return STEPS[this._step] ?? null; }

  update(dt) {
    if (!this._active || this._done) return;
    const step = this.stepData;
    if (!step || !step.action) return;

    const ph   = this.game.physics;
    const jobs = this.game.jobs;
    const port = this.game.portSystem;
    const cargo= this.game.cargo;

    switch (step.action) {
      case 'reach_port:industriehafen':
        if (port.nearPort?.id === 'industriehafen') this.nextStep();
        break;
      case 'open_market':
        // Auto-advance if job market was opened (detected via job count change)
        if (!document.getElementById('job-market-overlay')?.classList.contains('hidden')) this.nextStep();
        break;
      case 'accept_job':
        if (jobs.hasActive) this.nextStep();
        break;
      case 'load_cargo':
        if (jobs.isLoaded) this.nextStep();
        break;
      case 'reach_dest':
        if (port.nearPort?.id === jobs.destination?.id) this.nextStep();
        break;
      case 'unload_cargo':
        if (!jobs.hasActive && this._step > 6) this.nextStep();
        break;
    }
  }

  nextStep() {
    this._step++;
    if (this._step >= STEPS.length) {
      this._complete();
    } else {
      this._renderStep();
    }
  }

  prevStep() {
    if (this._step > 0) {
      this._step--;
      this._renderStep();
    }
  }

  skip() {
    this._complete();
  }

  _complete() {
    this._active = false;
    this._done   = true;
    localStorage.setItem('tutorial_done', '1');
    this._hideTutorial();
    this.game.ui?.showNotification('🎓 Tutorial abgeschlossen! Drücke P für den Schiffsshop.', 5000);
  }

  _renderStep() {
    const el = document.getElementById('tutorial-overlay');
    if (!el) return;
    const step = this.stepData;
    if (!step || !this._active) { this._hideTutorial(); return; }

    document.getElementById('tut-title').textContent  = step.title;
    document.getElementById('tut-text').innerText     = step.text;
    document.getElementById('tut-hint').textContent   = step.hint ?? '';
    document.getElementById('tut-hint').style.display = step.hint ? '' : 'none';
    document.getElementById('tut-step').textContent   = `${this._step + 1} / ${STEPS.length}`;
    document.getElementById('tut-prev').disabled      = this._step === 0;
    document.getElementById('tut-next').textContent   = step.final ? 'Los geht\'s!' : 'Weiter';
    document.getElementById('tut-action').textContent = step.action
      ? `Warte auf Aktion...` : '';

    // Richtungspfeil (nördliche Häfen)
    const arrow = document.getElementById('tut-arrow');
    if (arrow) {
      arrow.style.display = step.arrow === 'north' ? '' : 'none';
    }

    el.classList.remove('hidden');
  }

  _hideTutorial() {
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
  }
}
