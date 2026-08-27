// main.js — Systemintegration und Game Loop (vollständige Gameplay-Version)
import * as THREE from 'three';

// ── Welt & Rendering ──────────────────────────────────────────────────────────
import { Water, SUN_DIR }   from './world/Water.js';
import { Sky }              from './world/Sky.js';
import { WakeSystem }       from './world/WakeSystem.js';
import { Vegetation }       from './world/Vegetation.js';
import { WorldMap, PORTS }  from './world/WorldMap.js';
import { PostProcessing }   from './rendering/PostProcessing.js';
import { QualityManager }   from './rendering/QualityManager.js';

// ── Schiff ────────────────────────────────────────────────────────────────────
import { ShipPhysics }      from './ship/ShipPhysics.js';
import { ShipController }   from './ship/ShipController.js';

// ── State ─────────────────────────────────────────────────────────────────────
import { GameState }        from './state/GameState.js';

// ── Systeme ───────────────────────────────────────────────────────────────────
import { FuelSystem }       from './systems/FuelSystem.js';
import { DamageSystem }     from './systems/DamageSystem.js';
import { CargoSystem }      from './systems/CargoSystem.js';
import { CollisionSystem }  from './systems/CollisionSystem.js';
import { JobSystem }        from './systems/JobSystem.js';
import { PortSystem }       from './systems/PortSystem.js';
import { InteractionSystem }from './systems/InteractionSystem.js';
import { EconomySystem }    from './systems/EconomySystem.js';
import { NavigationSystem } from './systems/NavigationSystem.js';
import { SaveSystem }       from './systems/SaveSystem.js';
import { TimeSystem }       from './systems/TimeSystem.js';
import { NPCSystem }        from './systems/NPCSystem.js';

// ── UI & Kamera ───────────────────────────────────────────────────────────────
import { UIManager }        from './ui/UIManager.js';
import { CameraController } from './camera/CameraController.js';
import { TutorialSystem }   from './systems/TutorialSystem.js';
import { ShipShopSystem }   from './systems/ShipShopSystem.js';

// ──────────────────────────────────────────────────────────────────────────────
// Schiff-Geometrie
// ──────────────────────────────────────────────────────────────────────────────
function buildShip(scene) {
  const group = new THREE.Group();

  const matHull   = new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.65, metalness: 0.35 });
  const matBottom = new THREE.MeshStandardMaterial({ color: 0x8b1010, roughness: 0.70 });
  const matDeck   = new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 1.0 });
  const matCabin  = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.65 });
  const matBridge = new THREE.MeshStandardMaterial({ color: 0xddd0ba, roughness: 0.55 });
  const matFunnel = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.80 });
  const matSteel  = new THREE.MeshStandardMaterial({ color: 0x7a8090, roughness: 0.50, metalness: 0.55 });
  const matGlass  = new THREE.MeshStandardMaterial({ color: 0x8ab8d0, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0.65 });

  const B = (mat, x, y, z, w, h, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  const C = (mat, x, y, z, rt, rb, h, segs = 8) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    m.position.set(x, y, z); m.castShadow = true; group.add(m);
  };

  B(matBottom, 0, 0.0,  0,  6.8, 1.4, 22);   // Unterwasserschiff
  B(matHull,   0, 1.6,  0,  6.5, 2.8, 22);   // Rumpf
  B(matHull,   0, 0.8, -10.5, 5.5, 1.6, 3);  // Bug-Übergang
  B(matHull,   0, 0.3, -12.2, 4.0, 1.0, 2);  // Bugspitze
  B(matHull,   0, 1.2,  11.5, 6.0, 2.2, 2);  // Heck
  B(matDeck,   0, 2.9, -4,   5.8, 0.4, 10);  // Deck
  B(matSteel,  0, 3.1, -4,   4.6, 0.2, 7.5); // Lukendeckel
  B(matSteel,  3.5, 2.5,  0, 0.2, 0.8, 20);  // BB-Reling
  B(matSteel, -3.5, 2.5,  0, 0.2, 0.8, 20);  // SB-Reling
  B(matCabin,  0, 4.5, 7.5, 6.2, 4.0, 6);   // Kabine
  B(matBridge, 0, 8.0, 7.0, 5.8, 2.4, 5);   // Brücke
  B(matGlass,  0, 8.1, 4.45, 5.2, 1.4, 0.1);// Brückenfenster
  C(matFunnel, 0, 11.5, 8, 0.55, 0.75, 3.5); // Schornstein
  C(new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, 13, 8, 0.57, 0.57, 0.3);
  C(matSteel, 0, 7, -8, 0.15, 0.18, 10, 4);  // Mast
  B(matSteel, 0, 3.2, -10, 1.8, 0.6, 1.2);   // Ankerwinde
  C(matSteel,  2.5, 3.4, 11, 0.3, 0.3, 1.2, 6);
  C(matSteel, -2.5, 3.4, 11, 0.3, 0.3, 1.2, 6);

  // Navigationslichter
  const mkLight = (col, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.5 }));
    m.position.set(x, y, z); group.add(m);
  };
  mkLight(0x00ff44,  3.5, 5.5, -9);   // Steuerbord
  mkLight(0xff2222, -3.5, 5.5, -9);   // Backbord
  mkLight(0xffffff,  0, 12.5, -8);    // Mastlicht

  // Mastlicht-Schein
  const ml = new THREE.PointLight(0xfff0c0, 4, 40, 2);
  ml.position.set(0, 12.5, -8); group.add(ml);

  group.position.set(PORTS[0].x, 0, PORTS[0].z - 70);
  scene.add(group);
  return group;
}

// ──────────────────────────────────────────────────────────────────────────────
// Beleuchtung
// ──────────────────────────────────────────────────────────────────────────────
function setupLighting(scene, shadowMapSize) {
  scene.add(new THREE.AmbientLight(0xb8d0ea, 0.55));
  scene.add(new THREE.HemisphereLight(0x88ccee, 0x2a5010, 0.55));

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.55);
  sun.position.copy(SUN_DIR).multiplyScalar(600);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 4000;
  sun.shadow.camera.left   = sun.shadow.camera.bottom = -800;
  sun.shadow.camera.right  = sun.shadow.camera.top    =  800;
  sun.shadow.normalBias    = 0.05;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.35);
  fill.position.set(-200, 150, 200);
  scene.add(fill);

  return sun;
}

// ──────────────────────────────────────────────────────────────────────────────
// Game-Klasse
// ──────────────────────────────────────────────────────────────────────────────
class Game {
  constructor(qualityName = 'medium') {
    // ── Qualität ──────────────────────────────────────────────────────────────
    this.quality = new QualityManager(qualityName);

    // ── Renderer ──────────────────────────────────────────────────────────────
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled  = true;
    this.renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace    = THREE.SRGBColorSpace;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 14000);
    this.clock  = new THREE.Clock();
    this.running = false;
    this._totalTime = 0;

    // ── Zentraler Spielzustand ────────────────────────────────────────────────
    this.state   = new GameState();

    // ── Schiffsphysik ─────────────────────────────────────────────────────────
    this.physics    = new ShipPhysics();
    this.controller = new ShipController(this.physics);

    // ── Spielsysteme ──────────────────────────────────────────────────────────
    this.fuelSystem    = new FuelSystem(this.state);
    this.damageSystem  = new DamageSystem(this.state);
    this.cargo         = new CargoSystem(this.state, this.physics);
    this.collisionSystem = new CollisionSystem(this.physics, this.damageSystem);
    this.economy       = new EconomySystem(this.state);
    this.jobs          = new JobSystem(this);
    this.portSystem    = new PortSystem(this);
    this.interaction   = new InteractionSystem(this);
    this.navigation    = new NavigationSystem(this.state);
    this.save          = new SaveSystem(this);
    this.timeSystem    = new TimeSystem(this.state);
    this.ui            = new UIManager(this);
    this.camCtrl       = new CameraController(this.camera);
    this.shipShop      = new ShipShopSystem(this);
    this.tutorial      = null; // wird nach _load() erstellt (DOM muss bereit sein)

    // Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.postFX) this.postFX.setSize(window.innerWidth, window.innerHeight);
    });

    window.game = this;
  }

  async start() {
    this._showLoading();
    await this._load();
    this._hideLoading();

    this.ui.showHUD();
    this.ui.updateAll();

    // Tutorial nach HUD-Start erstellen (DOM bereit)
    this.tutorial = new TutorialSystem(this);
    this.ui.setupShopKeyListener(this);

    this.running = true;
    this.clock.start();
    this._loop();
  }

  async _load() {
    this._setLoading('Atmosphäre...', 8);
    this.scene.fog = new THREE.FogExp2(0x88c8e8, this.quality.fogDensity);
    this.sun = setupLighting(this.scene, this.quality.shadowMapSize);

    this._setLoading('Himmel...', 18);
    this.sky = new Sky(this.scene);

    this._setLoading('Wasser...', 32);
    this.water = new Water(this.scene, this.quality.waterSegments);

    this._setLoading('Welt...', 48);
    this.worldMap = new WorldMap(this.scene);

    if (this.quality.vegetation) {
      this._setLoading('Vegetation...', 62);
      this.vegetation = new Vegetation(this.scene);
    }

    this._setLoading('Schiff...', 72);
    this.ship = buildShip(this.scene);
    this.controller.mesh = this.ship;
    this.physics.x = this.ship.position.x;
    this.physics.z = this.ship.position.z;
    this.state.shipX = this.physics.x;
    this.state.shipZ = this.physics.z;

    this._setLoading('NPC-Schiffe...', 80);
    this.npcSystem = new NPCSystem(this.scene, this.collisionSystem);

    this._setLoading('Kielwasser...', 88);
    this.wakeSystem = new WakeSystem(this.scene);

    if (this.quality.postprocess) {
      this._setLoading('PostFX...', 94);
      this.postFX = new PostProcessing(this.renderer, this.scene, this.camera, this.quality.name);
    }

    this._setLoading('Fertig!', 100);
    // Ship-Shop Physik-Werte anwenden
    this.shipShop.applyToPhysics(this.physics);
    await new Promise(r => setTimeout(r, 300));
  }

  // ── Hauptschleife ─────────────────────────────────────────────────────────
  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._totalTime += dt;

    // ── Fuel → Motor-Enable ────────────────────────────────────────────────
    const fuelSig = this.fuelSystem.update(dt, Math.abs(this.physics.telegraphLevel));
    if (fuelSig === 'EMPTY') {
      this.physics.setMotorEnabled(false);
      this.ui.showNotification('⛽ TANK LEER! Motor ausgefallen. Tanken im nächsten Hafen!', 5000);
    }
    if (this.state.fuel > 0) this.physics.setMotorEnabled(true);

    // ── Physik-Scaler (Schaden, Ladung) ────────────────────────────────────
    this.physics.powerFactor    = this.damageSystem.powerFactor;
    this.physics.maxSpeedFactor = this.damageSystem.maxSpeedFactor;

    // ── Controller (Ruder + Motor) ─────────────────────────────────────────
    this.controller.update(dt, this);

    // ── Kollisionen ────────────────────────────────────────────────────────
    const col = this.collisionSystem.update(dt);
    if (col.collision && col.dmg > 0) {
      this.ui.showNotification(`💥 Kollision! -${col.dmg.toFixed(0)}% Rumpf`, 2500);
    }
    if (col.grounded) {
      this.ui.showNotification('⚠️ GRUNDBERÜHRUNG! Langsamer fahren!', 800);
    }

    // ── NPC ────────────────────────────────────────────────────────────────
    this.npcSystem.update(dt);

    // ── Fracht-Animations-Timer ────────────────────────────────────────────
    this.cargo.update(dt);

    // ── Hafen & Interaktion ────────────────────────────────────────────────
    this.portSystem.update(dt, this.physics.x, this.physics.z);
    this.interaction.update(dt);

    // ── Zeit ───────────────────────────────────────────────────────────────
    this.timeSystem.update(dt);

    // ── Tag/Nacht ──────────────────────────────────────────────────────────
    const dayT = this.timeSystem.dayFraction;
    if (this.sky)   this.sky.setDaytime(dayT);
    if (this.water) this.water.setSkyColors?.(this.sky?.zenith, this.sky?.horizon);
    this.sun.intensity = 0.35 + dayT * 1.3;
    const fogColor = new THREE.Color(0x88c8e8).lerp(new THREE.Color(0x040810), 1 - dayT);
    this.scene.fog.color.copy(fogColor);
    if (this.postFX) { dayT < 0.3 || dayT > 0.8 ? this.postFX.setEvening() : this.postFX.setDay(); }

    // ── Wasser & Wake ──────────────────────────────────────────────────────
    this.water.update(dt, this.camera);
    this.wakeSystem.update(dt, this.ship, this.physics.speed);

    // ── Kamera ─────────────────────────────────────────────────────────────
    this.camCtrl.update(dt, this.ship);

    // ── State-Sync ─────────────────────────────────────────────────────────
    this.state.shipX       = this.physics.x;
    this.state.shipZ       = this.physics.z;
    this.state.shipHeading = this.physics.heading;

    // ── Tutorial ───────────────────────────────────────────────────────────
    this.tutorial?.update(dt);

    // ── Autosave ───────────────────────────────────────────────────────────
    this.save.update(dt);

    // ── UI ─────────────────────────────────────────────────────────────────
    this.ui.update(dt, this.physics, this.controller);

    // ── Render ─────────────────────────────────────────────────────────────
    if (this.postFX) this.postFX.render();
    else             this.renderer.render(this.scene, this.camera);
  }

  // ── Qualität wechseln ──────────────────────────────────────────────────────
  setQuality(name) {
    localStorage.setItem('quality', name);
    location.reload();
  }

  // ── Ladescreen ────────────────────────────────────────────────────────────
  _showLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('main-menu').style.display = 'none';
  }
  _hideLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
  }
  _setLoading(text, pct) {
    const t = document.getElementById('loading-text');
    const f = document.getElementById('loading-fill');
    if (t) t.textContent = text;
    if (f) f.style.width = pct + '%';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Menü-Logik
// ──────────────────────────────────────────────────────────────────────────────
let game = null;

document.getElementById('btn-new-game').addEventListener('click', async () => {
  document.getElementById('main-menu').style.display = 'none';
  const q = localStorage.getItem('quality') || 'medium';
  game = new Game(q);
  // Explizit kein Laden — frisches Spiel
  game.save.deleteSave();
  await game.start();
});

document.getElementById('btn-load-game').addEventListener('click', async () => {
  const q = localStorage.getItem('quality') || 'medium';
  game = new Game(q);
  const ok = game.save.hasSave();
  document.getElementById('main-menu').style.display = 'none';
  await game._load();
  document.getElementById('loading-screen').classList.add('hidden');
  if (ok) {
    const loaded = game.save.load();
    game.ship.position.x = game.physics.x;
    game.ship.position.z = game.physics.z;
    game.ship.rotation.y = game.physics.heading;
    game.ui.showNotification(loaded ? '✅ Spielstand geladen!' : '⚠️ Kein Spielstand gefunden.', 3000);
  }
  game.ui.showHUD();
  game.ui.updateAll();
  game.running = true;
  game.clock.start();
  game._loop();
});

// Qualitäts-Buttons
['low', 'medium', 'high'].forEach(q => {
  const btn = document.getElementById('btn-quality-' + q);
  if (btn) btn.addEventListener('click', () => {
    localStorage.setItem('quality', q);
    document.querySelectorAll('.btn-quality').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

window.addEventListener('DOMContentLoaded', () => {
  const q   = localStorage.getItem('quality') || 'medium';
  const btn = document.getElementById('btn-quality-' + q);
  if (btn) btn.classList.add('active');
  // "Spiel laden" Button greyen wenn kein Save
  const loadBtn = document.getElementById('btn-load-game');
  if (loadBtn && !localStorage.getItem('schiff2026_save')) {
    loadBtn.style.opacity = '0.4';
    loadBtn.title = 'Kein Spielstand vorhanden';
  }
});
