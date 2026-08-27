// ShipShopSystem — Schiffskauf, Motor-/Rumpf-/Tank-Upgrades, Designs

export const SHIPS = [
  {
    id: 'pionier',
    name: 'MS Pionier',
    desc: 'Das klassische Startschiff. Klein, wendig, zuverlässig.',
    price: 0,
    maxCargo: 80,     // t
    maxSpeed: 16.5,   // m/s
    draft:    1.4,
    icon: '🚢',
    color: 0x1c2330,
  },
  {
    id: 'rhein1',
    name: 'MS Rhein I',
    desc: 'Mittelgroßes Frachtschiff für anspruchsvolle Routen.',
    price: 18000,
    maxCargo: 150,
    maxSpeed: 19.0,
    draft:    1.8,
    icon: '🚤',
    color: 0x1a3050,
  },
  {
    id: 'elbe',
    name: 'MS Elbe',
    desc: 'Großes Frachtschiff — mehr Kapazität, stärkerer Motor.',
    price: 42000,
    maxCargo: 250,
    maxSpeed: 21.5,
    draft:    2.2,
    icon: '⛴️',
    color: 0x112240,
  },
  {
    id: 'titan',
    name: 'MS Titan',
    desc: 'Das schwere Flaggschiff — maximale Kapazität.',
    price: 95000,
    maxCargo: 420,
    maxSpeed: 24.0,
    draft:    2.8,
    icon: '🛳️',
    color: 0x0a1828,
  },
];

export const UPGRADES = {
  engine: [
    { id: 'eng1', name: 'Standardmotor',    desc: '100% Leistung',  price: 0,     tier: 1, speedBonus: 1.00 },
    { id: 'eng2', name: 'Motor Stufe II',   desc: '+25% Leistung',  price: 2500,  tier: 2, speedBonus: 1.25 },
    { id: 'eng3', name: 'Motor Stufe III',  desc: '+50% Leistung',  price: 7500,  tier: 3, speedBonus: 1.50 },
    { id: 'eng4', name: 'Motor Stufe IV',   desc: '+80% Leistung',  price: 18000, tier: 4, speedBonus: 1.80 },
  ],
  hull: [
    { id: 'hull1', name: 'Standardrumpf',      desc: 'Standard',          price: 0,    tier: 1, dmgReduction: 0.00 },
    { id: 'hull2', name: 'Verstärkter Rumpf',  desc: '-30% Kollisionsschaden', price: 2000, tier: 2, dmgReduction: 0.30 },
    { id: 'hull3', name: 'Gepanzerter Rumpf',  desc: '-60% Kollisionsschaden', price: 6000, tier: 3, dmgReduction: 0.60 },
  ],
  tank: [
    { id: 'tank1', name: 'Standardtank (500L)',  desc: '~2h Volllast', price: 0,    tier: 1, liters: 500  },
    { id: 'tank2', name: 'Erweiterter Tank (750L)',desc: '~3h Volllast', price: 1500, tier: 2, liters: 750  },
    { id: 'tank3', name: 'Großtank (1.200L)',    desc: '~5h Volllast', price: 4000, tier: 3, liters: 1200 },
  ],
  cosmetic: [
    { id: 'cos1', name: 'Standardlackierung',   desc: 'Dunkelgrau / Schwarz',    price: 0,    gift: false, color: 0x1c2330 },
    { id: 'cos2', name: 'Racing-Rot',            desc: 'Rote Akzentlinie',        price: 800,  gift: false, color: 0x8b1010 },
    { id: 'cos3', name: 'Marine-Blau',           desc: 'Tiefes Marineblau',       price: 1400, gift: false, color: 0x112244 },
    { id: 'cos4', name: 'Ehrenkapitän-Livery',  desc: 'Freischalten: 5 Aufträge', price: 0, gift: true, giftAfterJobs: 5, color: 0x2a4820 },
  ],
};

// Startkonfiguration
const DEFAULT_CONFIG = {
  shipId:     'pionier',
  engineTier: 1,
  hullTier:   1,
  tankTier:   1,
  cosmeticId: 'cos1',
};

export class ShipShopSystem {
  constructor(game) {
    this.game   = game;
    this.config = { ...DEFAULT_CONFIG };

    // Aus State wiederherstellen
    const saved = game.state.shopConfig;
    if (saved) Object.assign(this.config, saved);
  }

  get currentShip()    { return SHIPS.find(s => s.id === this.config.shipId) ?? SHIPS[0]; }
  get engineUpgrade()  { return UPGRADES.engine.find(u => u.tier === this.config.engineTier) ?? UPGRADES.engine[0]; }
  get hullUpgrade()    { return UPGRADES.hull.find(u => u.tier === this.config.hullTier)     ?? UPGRADES.hull[0]; }
  get tankUpgrade()    { return UPGRADES.tank.find(u => u.tier === this.config.tankTier)     ?? UPGRADES.tank[0]; }
  get cosmeticConfig() { return UPGRADES.cosmetic.find(c => c.id === this.config.cosmeticId) ?? UPGRADES.cosmetic[0]; }

  // Effektive Maximalgeschwindigkeit (Schiff × Motorbonus)
  get effectiveMaxSpeed() {
    return this.currentShip.maxSpeed * this.engineUpgrade.speedBonus;
  }

  // Schaden-Reduktionsfaktor
  get dmgReductionFactor() {
    return 1 - this.hullUpgrade.dmgReduction;
  }

  // Tankgröße in Litern
  get tankLiters() {
    return this.tankUpgrade.liters;
  }

  // ── Kaufen ────────────────────────────────────────────────────────────────
  buyShip(shipId) {
    const ship = SHIPS.find(s => s.id === shipId);
    if (!ship) return { ok: false, msg: 'Schiff nicht gefunden' };
    if (ship.id === this.config.shipId) return { ok: false, msg: 'Schiff bereits im Besitz' };
    if (!this.game.state.spendMoney(ship.price)) return { ok: false, msg: 'Nicht genug Geld' };

    this.config.shipId = ship.id;
    // Alle Upgrades zurücksetzen
    this.config.engineTier = 1;
    this.config.hullTier   = 1;
    this.config.tankTier   = 1;
    this.config.cosmeticId = 'cos1';
    this._sync();
    return { ok: true, msg: `${ship.name} gekauft!` };
  }

  buyEngineUpgrade(tier) {
    const upg = UPGRADES.engine.find(u => u.tier === tier);
    if (!upg || tier <= this.config.engineTier) return { ok: false, msg: 'Bereits vorhanden' };
    if (!this.game.state.spendMoney(upg.price)) return { ok: false, msg: 'Nicht genug Geld' };
    this.config.engineTier = tier;
    this._sync();
    return { ok: true, msg: `${upg.name} installiert!` };
  }

  buyHullUpgrade(tier) {
    const upg = UPGRADES.hull.find(u => u.tier === tier);
    if (!upg || tier <= this.config.hullTier) return { ok: false, msg: 'Bereits vorhanden' };
    if (!this.game.state.spendMoney(upg.price)) return { ok: false, msg: 'Nicht genug Geld' };
    this.config.hullTier = tier;
    this._sync();
    return { ok: true, msg: `${upg.name} installiert!` };
  }

  buyTankUpgrade(tier) {
    const upg = UPGRADES.tank.find(u => u.tier === tier);
    if (!upg || tier <= this.config.tankTier) return { ok: false, msg: 'Bereits vorhanden' };
    if (!this.game.state.spendMoney(upg.price)) return { ok: false, msg: 'Nicht genug Geld' };
    this.config.tankTier = tier;
    this.game.state.maxFuel = upg.liters;
    this._sync();
    return { ok: true, msg: `${upg.name} installiert!` };
  }

  buyCosmetic(cosId) {
    const cos = UPGRADES.cosmetic.find(c => c.id === cosId);
    if (!cos) return { ok: false, msg: 'Design nicht gefunden' };
    if (cos.gift) {
      if ((this.game.state.jobsDone ?? 0) < (cos.giftAfterJobs ?? 999))
        return { ok: false, msg: `Freischaltung: ${cos.giftAfterJobs} Aufträge nötig` };
    } else {
      if (!this.game.state.spendMoney(cos.price)) return { ok: false, msg: 'Nicht genug Geld' };
    }
    this.config.cosmeticId = cosId;
    this._sync();
    return { ok: true, msg: `Design "${cos.name}" aktiviert!` };
  }

  // Physik-Werte auf Ship-Objekte anwenden
  applyToPhysics(physics) {
    const ship = this.currentShip;
    const eng  = this.engineUpgrade;
    const tank = this.tankUpgrade;

    // Max-Geschwindigkeit anpassen
    const baseMaxSpeed = 16.5; // Basis des ShipPhysics-Systems
    physics.maxSpeedFactor = (ship.maxSpeed * eng.speedBonus) / baseMaxSpeed;
    physics.powerFactor    = eng.speedBonus;

    // Tank
    this.game.state.maxFuel = tank.liters;
  }

  _sync() {
    this.game.state.shopConfig = { ...this.config };
    this.applyToPhysics(this.game.physics);
    this.game.save.save();
  }

  // Überprüfung auf Geschenke (aufgerufen nach jedem Auftrag)
  checkGifts() {
    const jobs = this.game.state.jobsDone ?? 0;
    for (const cos of UPGRADES.cosmetic) {
      if (cos.gift && jobs >= cos.giftAfterJobs) {
        // Noch nicht freigeschaltet?
        if (this.config.cosmeticId !== cos.id &&
            !(this.game.state.unlockedCosmetics ?? []).includes(cos.id)) {
          const unlocked = this.game.state.unlockedCosmetics ?? [];
          unlocked.push(cos.id);
          this.game.state.unlockedCosmetics = unlocked;
          this.game.ui?.showNotification(`🎁 Neues Design freigeschaltet: "${cos.name}"! Jetzt im Shop [P] verfügbar.`, 5000);
        }
      }
    }
  }
}
