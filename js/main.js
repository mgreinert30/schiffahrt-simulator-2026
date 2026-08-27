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
import { WeatherSystem }    from './systems/WeatherSystem.js';
import { SoundSystem }      from './systems/SoundSystem.js';
import { LockSystem }       from './systems/LockSystem.js';

// ──────────────────────────────────────────────────────────────────────────────
// MS Pionier — realistisches Rhein-Frachtschiff (~30m)
// Koordinaten: bow = negative Z, stern = positive Z, Wasserlinie bei group.y=0
// ──────────────────────────────────────────────────────────────────────────────
function buildShip(scene) {
  const group = new THREE.Group();

  // Materialien
  const matBottom = new THREE.MeshStandardMaterial({ color: 0x6e1010, roughness: 0.75, metalness: 0.15 }); // rot Antifouling
  const matHull   = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.60, metalness: 0.32 }); // dunkel navy
  const matDeck   = new THREE.MeshStandardMaterial({ color: 0x2e1e10, roughness: 1.0  }); // dunkles Teakdeck
  const matHatch  = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.65, metalness: 0.45 }); // Lukendeckel
  const matCoam   = new THREE.MeshStandardMaterial({ color: 0x354050, roughness: 0.80, metalness: 0.22 }); // Lukenrahmen
  const matCabin  = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.58, metalness: 0.06 }); // cremefarbener Aufbau
  const matBridge = new THREE.MeshStandardMaterial({ color: 0xeeeadc, roughness: 0.48, metalness: 0.08 }); // Brücke weiß
  const matGlass  = new THREE.MeshStandardMaterial({ color: 0x7ab8d0, roughness: 0.06, metalness: 0.82, transparent: true, opacity: 0.58 });
  const matFunnel = new THREE.MeshStandardMaterial({ color: 0xf0a020, roughness: 0.72 }); // gelber Schornstein
  const matBlack  = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 }); // Schornstein-Kappe
  const matSteel  = new THREE.MeshStandardMaterial({ color: 0x7c8898, roughness: 0.42, metalness: 0.62 }); // Stahl
  const matRail   = new THREE.MeshStandardMaterial({ color: 0x606878, roughness: 0.52, metalness: 0.55 }); // Reling
  const matLife   = new THREE.MeshStandardMaterial({ color: 0xff6800, roughness: 0.80 }); // Rettungsring orange

  const B = (mat, x, y, z, w, h, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; group.add(m); return m;
  };
  const C = (mat, x, y, z, rt, rb, h, segs = 8) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    m.position.set(x, y, z); m.castShadow = true; group.add(m); return m;
  };

  // ── RUMPF UNTER WASSERLINIE (rot Antifouling, y -1.1…+0.45) ─────────────
  B(matBottom, 0,  -0.34, -1.0, 5.6, 1.5, 28);  // Hauptrumpf
  B(matBottom, 0,  -0.40, -15.2, 4.8, 1.4, 2.8); // Bug-Stufe 1
  B(matBottom, 0,  -0.52, -16.8, 3.4, 1.2, 2.2); // Bug-Stufe 2
  B(matBottom, 0,  -0.68, -18.0, 1.8, 1.0, 1.8); // Bugspitze

  // ── RUMPF ÜBER WASSERLINIE (navy, y +0.45…+2.65) ────────────────────────
  B(matHull,   0,  1.55, -1.0, 5.8, 2.2, 28);   // Hauptrumpf
  B(matHull,   0,  1.45, -15.2, 5.2, 2.0, 2.8); // Bug-Stufe 1
  B(matHull,   0,  1.30, -16.8, 3.7, 1.7, 2.2); // Bug-Stufe 2
  B(matHull,   0,  1.10, -18.0, 2.0, 1.4, 1.8); // Bugspitze
  B(matHull,   0,  1.55,  14.2, 5.5, 2.2, 2.5); // Heck-Stufe 1
  B(matHull,   0,  1.35,  15.8, 4.8, 1.8, 1.8); // Heck-Stufe 2

  // ── BULLWARK (Schutzwand auf Relinghöhe) ─────────────────────────────────
  B(matHull,  2.98, 3.15, -1.0, 0.18, 1.15, 28);  // Steuerbord
  B(matHull, -2.98, 3.15, -1.0, 0.18, 1.15, 28);  // Backbord

  // ── HAUPTDECK ─────────────────────────────────────────────────────────────
  B(matDeck,  0, 2.65,  -1.0, 5.44, 0.24, 28); // Decksplanken

  // ── VORDECK ───────────────────────────────────────────────────────────────
  B(matDeck,  0, 2.65, -14.8, 4.8, 0.24, 4.0); // Vordeck vor Luke
  // Ankerwinde
  B(matSteel, 0,  3.05, -16.2, 1.85, 0.45, 0.9); // Winden-Gehäuse
  C(matSteel, 0.9, 3.30, -16.2, 0.26, 0.26, 0.3, 6); // Walze SB
  C(matSteel,-0.9, 3.30, -16.2, 0.26, 0.26, 0.3, 6); // Walze BB

  // ── LUKE (Cargo Hold) ─────────────────────────────────────────────────────
  // Coaming-Rahmen (Wände um die Luke)
  B(matCoam,  2.2, 3.35, -3.5, 0.22, 0.72, 18); // Längsträger SB
  B(matCoam, -2.2, 3.35, -3.5, 0.22, 0.72, 18); // Längsträger BB
  B(matCoam,  0, 3.35, -12.55, 4.0, 0.72, 0.30); // Querträger Bug
  B(matCoam,  0, 3.35,  5.55, 4.0, 0.72, 0.30);  // Querträger Heck

  // Lukendeckel (3 Platten-Sektionen)
  B(matHatch, 0, 3.75, -10.2, 4.0, 0.20, 5.5); // Sektion A (Bug)
  B(matHatch, 0, 3.75,  -4.7, 4.0, 0.20, 5.5); // Sektion B (Mitte)
  B(matHatch, 0, 3.75,   0.8, 4.0, 0.20, 5.0); // Sektion C (Heck)

  // ── RELING AM VORDECK ─────────────────────────────────────────────────────
  B(matRail, 0, 3.90, -14.8, 4.6, 0.06, 4.0); // Untere Reling
  B(matRail, 0, 4.55, -14.8, 4.6, 0.06, 4.0); // Obere Reling
  // Stützen Vordeck
  for (const sz of [-16.8, -15.8, -13.5, -12.5]) {
    B(matRail, -2.3, 4.25, sz, 0.06, 1.5, 0.06);
    B(matRail,  2.3, 4.25, sz, 0.06, 1.5, 0.06);
  }

  // ── AUFBAU / DECKHAUS (Heck) ──────────────────────────────────────────────
  B(matCabin, 0, 5.15,  9.8, 5.5, 5.0, 12.5);  // Unteraufbau (Kabinen)
  // Frontfenster des Aufbaus
  B(matGlass, 0, 5.35, 3.50, 4.2, 1.20, 0.12); // Aufbau-Frontfenster

  // ── BRÜCKE ────────────────────────────────────────────────────────────────
  B(matBridge, 0, 9.05,  9.8, 5.3, 2.9, 10.0); // Brückenaufbau
  B(matBridge, 0, 9.05, 15.4, 5.0, 2.9,  1.2); // Heckwand
  // Frontscheibe (große Brückenscheibe)
  B(matGlass, 0, 9.10,  4.75, 4.6, 2.0, 0.12); // Brücken-Frontglas
  // Seitenfenster
  B(matGlass,  2.67, 9.10,  9.8, 0.12, 1.8, 7.0); // SB-Seitenglas
  B(matGlass, -2.67, 9.10,  9.8, 0.12, 1.8, 7.0); // BB-Seitenglas
  // Brückendach + Peildeck
  B(matCabin, 0, 10.55, 9.8, 5.5, 0.28, 10.2);  // Dachplatte
  B(matBridge, 0, 11.1, 9.8, 5.2, 0.55, 10.0);  // Peildeck

  // ── SCHORNSTEIN (gelb, schwarze Kappe) ────────────────────────────────────
  C(matFunnel, 0, 13.3, 12.5, 0.60, 0.82, 4.0, 8); // Funnel
  C(matBlack,  0, 15.35, 12.5, 0.64, 0.64, 0.5, 8); // Kappe

  // ── BUGMAST ───────────────────────────────────────────────────────────────
  C(matSteel, 0,  6.9, -15.5, 0.10, 0.14, 8.5, 5); // Mastrohr unten
  C(matSteel, 0, 11.5, -15.5, 0.06, 0.08, 1.8, 4); // Mastrohr oben
  // Radarschirm (flache Scheibe)
  B(matSteel, 0, 12.55, -15.5, 1.3, 0.10, 0.90);  // Radar horizontal
  B(matSteel, 0, 12.55, -15.0, 0.08, 0.50, 1.20);  // Radar Ständer

  // ── HECK-MAST (kurz) ──────────────────────────────────────────────────────
  C(matSteel, 0, 12.3, 15.2, 0.08, 0.10, 2.8, 4);  // Heck-Flaggenmast

  // ── POLLER (Festmach-Poller) ──────────────────────────────────────────────
  for (const [px, pz] of [[1.9,-17],[-1.9,-17],[2.1,-13.5],[-2.1,-13.5],[2.1,13.0],[-2.1,13.0],[2.1,15.5],[-2.1,15.5]]) {
    C(matSteel, px, 3.2, pz, 0.13, 0.13, 0.60, 5);
  }

  // ── LÜFTUNGSKÖPFE (typisch für Frachtschiffe) ────────────────────────────
  for (const [px, pz] of [[-1.3, 4.0],[1.3, 4.0],[-1.3,-10.5],[1.3,-10.5]]) {
    C(matSteel, px, 3.42, pz, 0.20, 0.25, 0.60, 6);
    B(matSteel, px, 3.78, pz, 0.52, 0.15, 0.52); // Haube oben
  }

  // ── RETTUNGSRINGE ─────────────────────────────────────────────────────────
  const ringGeo = new THREE.TorusGeometry(0.34, 0.10, 6, 10);
  for (const [px, pz] of [[3.1, 7.5],[3.1, 10.5],[-3.1, 7.5],[-3.1, 10.5]]) {
    const rg = new THREE.Mesh(ringGeo, matLife);
    rg.position.set(px, 5.2, pz);
    rg.rotation.y = Math.PI / 2;
    group.add(rg);
  }

  // ── NAVIGATIONSLICHTER ────────────────────────────────────────────────────
  const mkNavLight = (col, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 5),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3.5 }));
    m.position.set(x, y, z); group.add(m);
  };
  mkNavLight(0x00ee44,  3.1, 4.2, -10.5); // Steuerbord grün
  mkNavLight(0xff2020, -3.1, 4.2, -10.5); // Backbord rot
  mkNavLight(0xffffff,  0, 12.6, -15.5);  // Toplicht (Mast)
  mkNavLight(0xffffff,  0, 10.8,  15.5);  // Hecklicht

  // Mastlicht-Schein (PointLight)
  const ml = new THREE.PointLight(0xfff8e0, 5, 55, 2);
  ml.position.set(0, 12.6, -15.5); group.add(ml);

  // ── CONTAINER-GRUPPE (sichtbar wenn Ladung an Bord) ──────────────────────
  const cargoGroup = new THREE.Group();
  const CONT_COLORS = [0x2244aa, 0xaa2020, 0x226020, 0xcc8000, 0x606870];
  const colorPick   = [0, 2, 4, 1, 3, 0]; // je Container
  for (let col = 0; col < 2; col++) {       // 2 Spalten (x)
    for (let row = 0; row < 3; row++) {     // 3 Reihen (z)
      const cGeo = new THREE.BoxGeometry(2.32, 2.50, 5.30);
      const cMat = new THREE.MeshStandardMaterial({
        color: CONT_COLORS[colorPick[col * 3 + row]],
        roughness: 0.78, metalness: 0.20,
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.set(
        col === 0 ? -1.16 : 1.16,  // 2 Spalten-Positionen
        4.52,                        // über Lukendeckel
        -10.2 + row * 5.5           // z: Bug → Heck (-10.2, -4.7, +0.8)
      );
      cMesh.castShadow = true;
      cargoGroup.add(cMesh);
    }
  }
  cargoGroup.visible = false; // erst sichtbar wenn Ladung geladen
  group.add(cargoGroup);
  group._cargoGroup = cargoGroup;

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
    this.weather       = null;
    this.sound         = new SoundSystem();
    this.lock          = null;
    this._radioTimer   = 70;   // Hafenfunk-Timer

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

    this._setLoading('Wetter & Sound...', 96);
    this.weather = new WeatherSystem(this.scene);
    this.lock    = new LockSystem(this.scene, this.physics);

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

    // ── Wetter ────────────────────────────────────────────────────────────
    if (this.weather) {
      this.weather.update(dt);
      // Wind auf Physik übertragen
      this.physics.windX = this.weather.windX;
      this.physics.windZ = this.weather.windZ;
    }

    // ── Sound ─────────────────────────────────────────────────────────────
    this.sound.update(this.physics.telegraphLevel, this.physics.speed, this.weather);

    // ── Schleuse ──────────────────────────────────────────────────────────
    this.lock?.update(dt);

    // ── Hafenfunk (zufällige Ambient-Nachrichten) ──────────────────────────
    this._radioTimer -= dt;
    if (this._radioTimer <= 0) {
      this._radioTimer = 55 + Math.random() * 90;
      this._playRandomRadio();
    }

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
      this.sound.playCollision(Math.abs(this.physics.speed));
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

    // ── Schiffs-Draft + Container-Sichtbarkeit ────────────────────────────
    if (this.ship) {
      // Tiefgang: Schiff sitzt tiefer wenn beladen (bis -0.65m)
      const cargoRatio = Math.min(1, (this.physics.cargoMass || 0) / 80000);
      const targetDraftY = -cargoRatio * 0.65;
      this.ship.position.y += (targetDraftY - this.ship.position.y) * Math.min(1, dt * 0.9);

      // Container sichtbar wenn Ladung an Bord
      if (this.ship._cargoGroup) {
        this.ship._cargoGroup.visible = (this.physics.cargoMass || 0) > 100;
      }
    }

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

  // ── Hafenfunk ─────────────────────────────────────────────────────────────
  _playRandomRadio() {
    const wx = this.weather?.stateId ?? 'clear';
    const port = this.portSystem?.nearPort;
    const msgs = [
      '📻 Kanal 16: Fahrrinne frei — bitte Vorfahrt beachten.',
      '📻 Nordheim Port Control: Liegeplatz 3 verfügbar.',
      `📻 Wetter-Update: ${this.weather?.label ?? 'Klar'}, Wind ${this.weather?.windSpeed?.toFixed(0) ?? 0} m/s.`,
      '📻 Stadthafen: Entladekapazität voll — Terminal Ost empfohlen.',
      '📻 Achtung: Treibgut bei km 47,2. Bitte langsam fahren.',
      '📻 NMS Anna: Bitte Liegeplatz 7 freimachen. Danke.',
      '📻 Schleusensteuerung Nordheim: Nächste Schleusung in 10 Minuten.',
      '📻 Alle Fahrzeuge: Geschwindigkeitsbeschränkung 6 km/h im Hafenbereich.',
    ];
    if (wx === 'storm') msgs.push('📻 Sturmwarnung! Bitte Hafen aufsuchen!');
    if (wx === 'fog')   msgs.push('📻 Nebelwarnung: Sichtweite unter 200m. Navigation per Radar!');
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.ui?.showRadioMessage(msg);
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
