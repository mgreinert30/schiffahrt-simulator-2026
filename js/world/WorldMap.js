// WorldMap — Spielwelt: Landmassen, Häfen, Umgebungsobjekte
import * as THREE from 'three';

// Hafen-Definitionen (werden auch von PortSystem genutzt)
export const PORTS = [
  {
    id: 'industriehafen',
    name: 'Industriehafen Nordheim',
    shortName: 'Nordheim',
    x: -380, z: -950,
    radius: 120,
    color: 0xf59e0b,
    produces: ['Stahl', 'Kohle', 'Maschinenteile'],
    accepts:  ['Container', 'Getreide', 'Treibstoff'],
  },
  {
    id: 'stadthafen',
    name: 'Stadthafen Rheinburg',
    shortName: 'Rheinburg',
    x: 320, z: 900,
    radius: 120,
    color: 0x22c55e,
    produces: ['Container', 'Getreide', 'Konsumgüter'],
    accepts:  ['Stahl', 'Kies', 'Maschinenteile'],
  },
  {
    id: 'terminal_ost',
    name: 'Containerterminal Osterfeld',
    shortName: 'Osterfeld',
    x: 600, z: -200,
    radius: 100,
    color: 0x3b82f6,
    produces: ['Container'],
    accepts:  ['Container', 'Fahrzeuge'],
  },
];

export class WorldMap {
  constructor(scene) {
    this.scene = scene;
    this._buildLand();
    this._buildPorts();
    this._buildEnvironment();
  }

  _buildLand() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2d5a1b,
      roughness: 0.95,
    });
    const landDark = new THREE.MeshStandardMaterial({
      color: 0x1e3d12,
      roughness: 1,
    });

    // Westliches Ufer
    this._box(mat, -2200, -0.5, 0, 3200, 12, 8000);
    // Östliches Ufer
    this._box(mat, 2200, -0.5, 0, 3200, 12, 8000);

    // Flussverengung in der Mitte (Kanal)
    this._box(landDark, -1200, -0.5, -200, 1400, 10, 400);
    this._box(landDark, 1100,  -0.5, 300,  1000, 10, 600);

    // Insel
    this._box(mat, 0, -0.5, -100, 180, 8, 260);

    // Landzunge Nord-West
    this._box(mat, -600, -0.5, -1600, 600, 9, 500);
    // Landzunge Süd-Ost
    this._box(mat, 800, -0.5, 1400, 500, 9, 400);
  }

  _buildPorts() {
    for (const port of PORTS) {
      this._buildPort(port);
    }
  }

  _buildPort(port) {
    const { x, z } = port;
    const concrete = new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.9 });
    const steel    = new THREE.MeshStandardMaterial({ color: 0x8a8a9a, roughness: 0.6, metalness: 0.4 });
    const yellow   = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
    const dark     = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 1 });
    const red      = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
    const emit     = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 1 });

    // Pier-Plattform
    this._box(concrete, x, 1, z, 200, 3, 160);
    // Verlängerter Steg ins Wasser
    this._box(concrete, x, 0.5, z + 120, 40, 1.5, 80);
    this._box(concrete, x, 0.5, z - 120, 40, 1.5, 80);

    // Lagerhalle
    this._box(dark, x - 60, 6, z - 30, 80, 12, 70);
    // Dach der Halle
    this._box(steel, x - 60, 12.5, z - 30, 82, 2, 72);

    // Portalkran
    this._crane(x + 40, z);

    // Lagersilos (nur für produzierende Häfen)
    this._cyl(concrete, x + 80, 12, z + 20, 5, 5, 24, 8);
    this._cyl(concrete, x + 94, 12, z + 20, 5, 5, 24, 8);

    // Hafenlichter
    this._light(emit, x - 80,  8, z - 70);
    this._light(emit, x + 80,  8, z - 70);
    this._light(emit, x - 80,  8, z + 70);
    this._light(emit, x + 80,  8, z + 70);

    // Point Light für Atmosphäre
    const pl = new THREE.PointLight(0xfef08a, 60, 350, 2);
    pl.position.set(x, 20, z);
    this.scene.add(pl);

    // Hafenkennzeichnung (farbiger Würfel als Marker)
    const markerMat = new THREE.MeshStandardMaterial({
      color: port.color,
      emissive: port.color,
      emissiveIntensity: 0.4,
    });
    const markerGeo = new THREE.BoxGeometry(8, 8, 8);
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(x, 20, z);
    this.scene.add(marker);

    // Hafenname-Schild (Billboard-Würfel mit Farbe)
    const sign = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 2), markerMat);
    sign.position.set(x, 18, z - 85);
    this.scene.add(sign);
  }

  _buildEnvironment() {
    // Hintergrundberge (weit entfernt)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x1a3a0e, roughness: 1 });
    this._box(hillMat, -3500, 30, 0, 200, 60, 8000);
    this._box(hillMat, 3500,  30, 0, 200, 60, 8000);

    // Bäume (einfache Kegel)
    this._trees(-1700, -600, 15);
    this._trees(-1700,  400, 12);
    this._trees(1600,  -500, 10);
    this._trees(1600,   600, 8);

    // Leuchtturm
    this._lighthouse(-480, -1550);

    // Bojen im Fahrwasser (Kanalmarkierung)
    for (let z = -800; z < 800; z += 300) {
      this._buoy(-80, z, 0xff0000);
      this._buoy( 80, z, 0x00cc00);
    }
  }

  _crane(x, z) {
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
    // Vertikale Säule
    this._box(yellow, x, 16, z, 4, 32, 4);
    // Horizontaler Ausleger
    this._box(yellow, x + 20, 32, z, 44, 3, 3);
    // Hängelinie (stilisiert)
    this._box(yellow, x + 40, 20, z, 2, 24, 2);
    // Gegengewicht
    this._box(yellow, x - 6,  32, z, 14, 4, 4);
  }

  _lighthouse(x, z) {
    const white = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.8 });
    const red   = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
    const light = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 2 });
    // Turm
    const geo = new THREE.CylinderGeometry(4, 6, 40, 8);
    const m = new THREE.Mesh(geo, white);
    m.position.set(x, 20, z);
    this.scene.add(m);
    // Streifen
    const stripe = new THREE.CylinderGeometry(4.1, 4.1, 6, 8);
    const s = new THREE.Mesh(stripe, red);
    s.position.set(x, 22, z);
    this.scene.add(s);
    // Licht
    const gl = new THREE.CylinderGeometry(2.5, 2.5, 4, 8);
    const g = new THREE.Mesh(gl, light);
    g.position.set(x, 41, z);
    this.scene.add(g);
    // Point Light
    const pl = new THREE.PointLight(0xfff0a0, 120, 800, 1.5);
    pl.position.set(x, 42, z);
    this.scene.add(pl);
  }

  _buoy(x, z, color) {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
    const geo = new THREE.CylinderGeometry(2, 2, 4, 6);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 2, z);
    this.scene.add(m);
  }

  _trees(cx, cz, count) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 1 });
    const leafMat  = new THREE.MeshStandardMaterial({ color: 0x1e5c1e, roughness: 1 });
    const rng = this._seededRng(cx + cz);
    for (let i = 0; i < count; i++) {
      const x = cx + (rng() - 0.5) * 400;
      const z = cz + (rng() - 0.5) * 400;
      const h = 8 + rng() * 10;
      // Stamm
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, h, 5), trunkMat);
      trunk.position.set(x, h/2 + 0.5, z);
      this.scene.add(trunk);
      // Krone
      const crown = new THREE.Mesh(new THREE.ConeGeometry(4 + rng() * 2, 10 + rng() * 4, 6), leafMat);
      crown.position.set(x, h + 4, z);
      this.scene.add(crown);
    }
  }

  // Einfacher seeded Zufallszahlengenerator
  _seededRng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }

  // Hilfsmethoden für Geometrie
  _box(mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    this.scene.add(m);
    return m;
  }

  _cyl(mat, x, y, z, rt, rb, h, segs = 8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  _light(mat, x, y, z) {
    // Lichtmast
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, y, 4),
      new THREE.MeshStandardMaterial({ color: 0x888888 }));
    post.position.set(x, y/2, z);
    this.scene.add(post);
    // Lampe
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), mat);
    lamp.position.set(x, y + 1.2, z);
    this.scene.add(lamp);
  }
}
