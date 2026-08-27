// main.js — Spielinitialisierung und Game Loop (Graphics Upgrade)
import * as THREE from 'three';
import { ShipPhysics }      from './ship/ShipPhysics.js';
import { ShipController }   from './ship/ShipController.js';
import { Water, SUN_DIR }   from './world/Water.js';
import { Sky }              from './world/Sky.js';
import { WakeSystem }       from './world/WakeSystem.js';
import { Vegetation }       from './world/Vegetation.js';
import { WorldMap, PORTS }  from './world/WorldMap.js';
import { PostProcessing }   from './rendering/PostProcessing.js';
import { QualityManager }   from './rendering/QualityManager.js';
import { JobSystem }        from './systems/JobSystem.js';
import { EconomySystem }    from './systems/EconomySystem.js';
import { PortSystem }       from './systems/PortSystem.js';
import { UIManager }        from './ui/UIManager.js';
import { CameraController } from './camera/CameraController.js';

// ──────────────────────────────────────────────────────────────────────────────
// Schiff-Geometrie
// ──────────────────────────────────────────────────────────────────────────────
function buildShip(scene) {
  const group = new THREE.Group();

  const hull   = new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.65, metalness: 0.35 });
  const hullRed= new THREE.MeshStandardMaterial({ color: 0x8b1010, roughness: 0.70 });  // Unterwasserschiff
  const deck   = new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 1.0 });
  const cabin  = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.65 });
  const bridge = new THREE.MeshStandardMaterial({ color: 0xddd0ba, roughness: 0.55 });
  const funnel = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.80 });
  const steel  = new THREE.MeshStandardMaterial({ color: 0x7a8090, roughness: 0.50, metalness: 0.55 });
  const glass  = new THREE.MeshStandardMaterial({ color: 0x8ab8d0, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0.65 });
  const rope   = new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 1 });

  function box(mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  }
  function cyl(mat, x, y, z, rt, rb, h, segs = 8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  // ── Rumpf ──
  box(hullRed, 0,  0.0,  0, 6.8, 1.4, 22);       // Unterwasserschiff
  box(hull,    0,  1.6,  0, 6.5, 2.8, 22);        // Hauptrumpf
  box(hull,    0,  0.8, -10.5, 5.5, 1.6, 3);      // Bug-Übergang
  box(hull,    0,  0.3, -12.2, 4.0, 1.0, 2);      // Bugspitze
  box(hull,    0,  1.2,  11.5, 6.0, 2.2, 2);      // Heck-Stufe 1
  box(hull,    0,  0.8,  12.8, 5.2, 1.6, 1);      // Heck-Stufe 2

  // ── Deck ──
  box(deck,    0,  2.9, -4, 5.8, 0.4, 10);        // Laderaumdeck
  box(steel,   0,  3.1, -4, 4.6, 0.2, 7.5);       // Lukendeckel
  box(steel,   3.5,  2.5,  0, 0.2, 0.8, 20);      // BB-Reling
  box(steel,  -3.5,  2.5,  0, 0.2, 0.8, 20);      // SB-Reling

  // ── Aufbau / Kabine ──
  box(cabin,   0, 4.5, 7.5, 6.2, 4,   6);
  box(bridge,  0, 8.0, 7.0, 5.8, 2.4, 5);
  box(glass,   0, 8.1, 4.45, 5.2, 1.4, 0.1);     // Brückenfenster

  // ── Schornstein ──
  cyl(funnel, 0, 11.5, 8, 0.55, 0.75, 3.5);
  cyl(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }), 0, 13, 8, 0.57, 0.57, 0.3);

  // ── Mast (Bug) ──
  cyl(steel, 0, 7, -8, 0.15, 0.18, 10, 4);
  // Mastlicht
  cyl(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 }),
      0, 12.2, -8, 0.18, 0.18, 0.3, 6);

  // ── Winden + Details ──
  box(steel, 0, 3.2, -10, 1.8, 0.6, 1.2);        // Ankerwinde
  box(steel, 0, 3.2,  10, 1.5, 0.5, 1.0);        // Heckwinde
  cyl(rope,  0, 3.6,  -9.5, 0.6, 0.6, 0.4, 8);   // Seilspule

  // ── Heck-Poller ──
  cyl(steel,  2.5, 3.4, 11, 0.30, 0.30, 1.2, 6);
  cyl(steel, -2.5, 3.4, 11, 0.30, 0.30, 1.2, 6);

  // ── Navigationslichter ──
  const navGrn  = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2.5 });
  const navRed  = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.5 });
  const navWht  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 });
  const mkSphere = (mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), mat);
    m.position.set(x, y, z);
    group.add(m);
  };
  mkSphere(navGrn,  3.5, 5.5, -9);
  mkSphere(navRed, -3.5, 5.5, -9);
  mkSphere(navWht,  0,  12.5, -8);

  group.position.set(PORTS[0].x, 0, PORTS[0].z - 60);
  scene.add(group);
  return group;
}

// ──────────────────────────────────────────────────────────────────────────────
// Beleuchtung (qualitätsabhängig)
// ──────────────────────────────────────────────────────────────────────────────
function setupLighting(scene, quality) {
  const shadowSize = quality.shadowMapSize;

  // Ambiente
  scene.add(new THREE.AmbientLight(0xb8d0ea, 0.55));

  // Hemisphärenlicht (Himmel ↔ Boden)
  scene.add(new THREE.HemisphereLight(0x88ccee, 0x2a5010, 0.55));

  // Sonne (DirectionalLight) — Richtung muss mit SUN_DIR in Water.js übereinstimmen
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.55);
  sun.position.copy(SUN_DIR).multiplyScalar(600);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 4000;
  sun.shadow.camera.left   = sun.shadow.camera.bottom = -800;
  sun.shadow.camera.right  = sun.shadow.camera.top    =  800;
  sun.shadow.normalBias    = 0.05;
  scene.add(sun);

  // Füll-Licht (weich, von der anderen Seite)
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = this.quality.settings.shadowSoft
      ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace    = THREE.SRGBColorSpace;

    // ── Szene + Kamera ────────────────────────────────────────────────────────
    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 14000);

    this.clock   = new THREE.Clock();
    this.running = false;
    this._time   = 0;   // Gesamtzeit für Tag/Nacht-Übergang

    // ── Spielsysteme ──────────────────────────────────────────────────────────
    this.economy    = new EconomySystem(5000);
    this.physics    = new ShipPhysics();
    this.controller = new ShipController(this.physics);
    this.ui         = new UIManager(this);
    this.jobs       = new JobSystem(this);
    this.portSystem = new PortSystem(this);
    this.camCtrl    = new CameraController(this.camera);

    // ── Resize ────────────────────────────────────────────────────────────────
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
    this.ui.updateJobPanel(this.jobs);
    this.ui.showNotification('⚓ Willkommen! Fahre zum Industriehafen Nordheim und nimm deinen ersten Auftrag an. [E]', 6500);

    this.running = true;
    this.clock.start();
    this._loop();
  }

  async _load() {
    this._setLoading('Lade Atmosphäre...', 10);
    // Fog — passend zu Qualität
    this.scene.fog = new THREE.FogExp2(0x88c8e8, this.quality.fogDensity);

    this._setLoading('Lade Beleuchtung...', 20);
    this.sun = setupLighting(this.scene, this.quality);

    this._setLoading('Lade Himmel...', 30);
    this.sky = new Sky(this.scene);

    this._setLoading('Lade Wasser...', 45);
    this.water = new Water(this.scene, this.quality.waterSegments);

    this._setLoading('Lade Welt...', 60);
    this.worldMap = new WorldMap(this.scene);

    // Vegetation nur ab Medium
    if (this.quality.vegetation) {
      this._setLoading('Lade Vegetation...', 72);
      this.vegetation = new Vegetation(this.scene);
    }

    this._setLoading('Lade Schiff...', 82);
    this.ship = buildShip(this.scene);
    this.controller.mesh = this.ship;
    this.physics.x = this.ship.position.x;
    this.physics.z = this.ship.position.z;

    // Kielwasser
    this._setLoading('Lade Effekte...', 90);
    this.wakeSystem = new WakeSystem(this.scene);

    // Post-Processing nur ab Medium
    if (this.quality.postprocess) {
      this.postFX = new PostProcessing(
        this.renderer, this.scene, this.camera, this.quality.name
      );
    }

    this._setLoading('Fertig!', 100);
    await new Promise(r => setTimeout(r, 300));
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._time += dt;

    // ── Tag/Nacht-Zyklus (sehr langsam — ~20 Minuten pro vollem Zyklus) ──────
    const dayT = (Math.sin(this._time * 0.00524 - Math.PI * 0.5) + 1) * 0.5; // 0–1
    if (this.sky)   this.sky.setDaytime(dayT);
    if (this.water) this.water.setSkyColors(this.sky.zenith, this.sky.horizon);

    // Sonnenintensität
    const sunIntensity = 0.4 + dayT * 1.2;
    this.sun.intensity = sunIntensity;

    // Fog-Farbe
    const fogColor = new THREE.Color(0x88c8e8).lerp(new THREE.Color(0x050a15), 1 - dayT);
    this.scene.fog.color.copy(fogColor);

    // PostFX Stimmung
    if (this.postFX) {
      dayT < 0.35 || dayT > 0.80 ? this.postFX.setEvening() : this.postFX.setDay();
    }

    // ── Spielsysteme ──────────────────────────────────────────────────────────
    this.water.update(dt, this.camera);
    this.controller.update(dt, this);
    this.wakeSystem.update(dt, this.ship, this.physics.speed || 0);
    this.portSystem.update(dt, this.physics.x, this.physics.z);
    this.ui.update(dt, this.physics, this.controller);
    this.camCtrl.update(dt, this.ship);

    // Weltgrenze
    this.physics.x = Math.max(-2000, Math.min(2000, this.physics.x));
    this.physics.z = Math.max(-2000, Math.min(2000, this.physics.z));

    // ── Render ────────────────────────────────────────────────────────────────
    if (this.postFX) {
      this.postFX.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ── Qualität zur Laufzeit wechseln ────────────────────────────────────────
  setQuality(name) {
    if (!['low', 'medium', 'high'].includes(name)) return;
    localStorage.setItem('quality', name);
    location.reload();   // einfachste zuverlässige Methode
  }

  // ── Ladebildschirm ────────────────────────────────────────────────────────
  _showLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('main-menu').style.display = 'none';
  }
  _hideLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
  }
  _setLoading(text, pct) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-fill').style.width = pct + '%';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Menü-Logik
// ──────────────────────────────────────────────────────────────────────────────
let game = null;

document.getElementById('btn-new-game').addEventListener('click', async () => {
  document.getElementById('main-menu').style.display = 'none';
  const savedQuality = localStorage.getItem('quality') || 'medium';
  game = new Game(savedQuality);
  await game.start();
});

document.getElementById('btn-load-game').addEventListener('click', () => {
  alert('Speichern wird in Phase 2 implementiert. Starte ein neues Spiel!');
});

// Qualitäts-Buttons (falls in index.html vorhanden)
['low', 'medium', 'high'].forEach(q => {
  const btn = document.getElementById('btn-quality-' + q);
  if (btn) btn.addEventListener('click', () => {
    localStorage.setItem('quality', q);
    // Setze aktiven Button
    ['low', 'medium', 'high'].forEach(qq => {
      const b = document.getElementById('btn-quality-' + qq);
      if (b) b.classList.toggle('active', qq === q);
    });
  });
});

// Beim Laden: gespeicherte Qualität markieren
window.addEventListener('DOMContentLoaded', () => {
  const q = localStorage.getItem('quality') || 'medium';
  const btn = document.getElementById('btn-quality-' + q);
  if (btn) btn.classList.add('active');
});
