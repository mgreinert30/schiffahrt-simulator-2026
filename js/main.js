// main.js — Spielinitialisierung und Game Loop
import * as THREE from 'three';
import { ShipPhysics }      from './ship/ShipPhysics.js';
import { ShipController }   from './ship/ShipController.js';
import { Water }            from './world/Water.js';
import { WorldMap, PORTS }  from './world/WorldMap.js';
import { JobSystem }        from './systems/JobSystem.js';
import { EconomySystem }    from './systems/EconomySystem.js';
import { PortSystem }       from './systems/PortSystem.js';
import { UIManager }        from './ui/UIManager.js';
import { CameraController } from './camera/CameraController.js';

// -------------------------------------------------------
// Schiff-Geometrie
// -------------------------------------------------------
function buildShip(scene) {
  const group = new THREE.Group();

  const hull   = new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.7, metalness: 0.3 });
  const deck   = new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 1.0 });
  const cabin  = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.6 });
  const bridge = new THREE.MeshStandardMaterial({ color: 0xddd0ba, roughness: 0.5 });
  const funnel = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 });
  const steel  = new THREE.MeshStandardMaterial({ color: 0x7a8090, roughness: 0.5, metalness: 0.6 });
  const glass  = new THREE.MeshStandardMaterial({ color: 0x8ab8d0, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });
  const winch  = new THREE.MeshStandardMaterial({ color: 0x505060, roughness: 0.6, metalness: 0.5 });

  function box(mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
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

  // Rumpf — Länge entlang Z, Bug an -Z (vorwärts)
  box(hull, 0, 1.4, 0, 6.5, 2.8, 22);

  // Bug (geneigt): Keil-Form simuliert durch einen schlanken Box
  box(hull, 0, 0.8, -10.5, 5.5, 1.6, 3);
  box(hull, 0, 0.3, -12,   4.0, 1.0, 2);

  // Heck (abgerundet durch mehrere Stufen)
  box(hull, 0, 1.2, 11.5, 6.0, 2.2, 2);
  box(hull, 0, 0.8, 12.8, 5.2, 1.6, 1);

  // Deck (Laderaumdeckel vorne)
  box(deck, 0, 2.9, -4, 5.8, 0.4, 10);

  // Reling / Bordwand-Oberkante
  box(steel, 3.5,  2.5, 0, 0.2, 0.8, 20);
  box(steel, -3.5, 2.5, 0, 0.2, 0.8, 20);

  // Lukendeckel
  box(steel, 0, 3.1, -4, 4.6, 0.2, 7.5);

  // Aufbau / Kabine (achtern)
  box(cabin, 0, 4.5, 7.5, 6.2, 4, 6);

  // Brücke
  box(bridge, 0, 8.0, 7, 5.8, 2.4, 5);

  // Brückenfenster (Glasscheiben)
  box(glass,  0, 8.1, 4.45, 5.2, 1.4, 0.1);

  // Schornstein
  cyl(funnel, 0, 11.5, 8, 0.55, 0.75, 3.5);
  cyl(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }), 0, 13, 8, 0.56, 0.56, 0.3);

  // Mast (Bug)
  cyl(steel, 0, 7, -8, 0.15, 0.15, 10, 4);

  // Anker-Winde
  box(winch, 0, 3.2, -10, 1.8, 0.6, 1.2);

  // Heck-Poller
  cyl(steel,  2.5, 3.4, 11, 0.3, 0.3, 1.2, 6);
  cyl(steel, -2.5, 3.4, 11, 0.3, 0.3, 1.2, 6);

  // Navigationslichter
  const greenLightMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2 });
  const redLightMat   = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 });
  const mastLightMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });

  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), greenLightMat);
  gl.position.set(3.5, 5.5, -9); group.add(gl);
  const rl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), redLightMat);
  rl.position.set(-3.5, 5.5, -9); group.add(rl);
  const ml = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), mastLightMat);
  ml.position.set(0, 12.5, -8); group.add(ml);

  // Schiff in Startposition am Hafen 0
  const startPort = PORTS[0];
  group.position.set(startPort.x, 0, startPort.z - 60);

  scene.add(group);
  return group;
}

// -------------------------------------------------------
// Atmosphäre + Beleuchtung
// -------------------------------------------------------
function setupScene(scene) {
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog        = new THREE.FogExp2(0x87ceeb, 0.0003);

  // Ambient
  scene.add(new THREE.AmbientLight(0xb0c8e8, 0.6));

  // Sonne (Directional)
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sun.position.set(300, 500, -200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far  = 3000;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -600;
  sun.shadow.camera.right = sun.shadow.camera.top   =  600;
  scene.add(sun);

  // Himmel-Halbkugel
  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x285018, 0.5));
}

// -------------------------------------------------------
// Game-Klasse
// -------------------------------------------------------
class Game {
  constructor() {
    // Renderer
    const canvas  = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

    // Szene + Kamera
    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);

    this.clock  = new THREE.Clock();
    this.running = false;

    // Systeme
    this.economy    = new EconomySystem(5000);
    this.physics    = new ShipPhysics();
    this.controller = new ShipController(this.physics);
    this.ui         = new UIManager(this);
    this.jobs       = new JobSystem(this);
    this.portSystem = new PortSystem(this);
    this.camCtrl    = new CameraController(this.camera);

    // Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Globaler Zugriff für onclick-Handler in HTML
    window.game = this;
  }

  async start() {
    // Ladebildschirm
    this._showLoading();
    await this._load();
    this._hideLoading();

    // HUD + erster Hinweis
    this.ui.showHUD();
    this.ui.updateJobPanel(this.jobs);
    this.ui.showNotification('⚓ Willkommen! Fahre zum Industriehafen Nordheim und nimm deinen ersten Auftrag an. [E]', 6000);

    this.running = true;
    this.clock.start();
    this._loop();
  }

  async _load() {
    this._setLoading('Lade Atmosphäre...', 20);
    setupScene(this.scene);

    this._setLoading('Lade Wasser...', 40);
    this.water = new Water(this.scene);

    this._setLoading('Lade Welt...', 60);
    this.worldMap = new WorldMap(this.scene);

    this._setLoading('Lade Schiff...', 85);
    this.ship = buildShip(this.scene);
    this.controller.mesh = this.ship;

    // Physik-Startposition
    this.physics.x = this.ship.position.x;
    this.physics.z = this.ship.position.z;

    this._setLoading('Fertig!', 100);
    await new Promise(r => setTimeout(r, 300));
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05); // Max 50ms um Sprünge zu vermeiden

    // Systeme updaten
    this.water.update(dt);
    this.controller.update(dt, this);
    this.portSystem.update(dt, this.physics.x, this.physics.z);
    this.ui.update(dt, this.physics, this.controller);
    this.camCtrl.update(dt, this.ship);

    // Weltgrenze (Spieler bleibt im Kartenbereich)
    this.physics.x = Math.max(-2000, Math.min(2000, this.physics.x));
    this.physics.z = Math.max(-2000, Math.min(2000, this.physics.z));

    this.renderer.render(this.scene, this.camera);
  }

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

// -------------------------------------------------------
// Menü-Logik
// -------------------------------------------------------
let game = null;

document.getElementById('btn-new-game').addEventListener('click', async () => {
  document.getElementById('main-menu').style.display = 'none';
  game = new Game();
  await game.start();
});

document.getElementById('btn-load-game').addEventListener('click', () => {
  // Save-System kommt in Phase 2
  alert('Speichern wird in Phase 2 implementiert. Starte ein neues Spiel!');
});
