// WorldMap.js — Detaillierte europäische Fluss-Welt
import * as THREE from 'three';

// ── Hafen-Definitionen (auch von PortSystem genutzt) ──────────────────────────
export const PORTS = [
  {
    id: 'industriehafen', name: 'Industriehafen Nordheim', shortName: 'Nordheim',
    x: -380, z: -950, radius: 130,
    color: 0xf59e0b,
    produces: ['Stahl', 'Kohle', 'Maschinenteile'],
    accepts:  ['Container', 'Getreide', 'Treibstoff'],
  },
  {
    id: 'stadthafen', name: 'Stadthafen Rheinburg', shortName: 'Rheinburg',
    x: 320, z: 900, radius: 130,
    color: 0x22c55e,
    produces: ['Container', 'Getreide', 'Konsumgüter'],
    accepts:  ['Stahl', 'Kies', 'Maschinenteile'],
  },
  {
    id: 'terminal_ost', name: 'Containerterminal Osterfeld', shortName: 'Osterfeld',
    x: 600, z: -200, radius: 110,
    color: 0x3b82f6,
    produces: ['Container'],
    accepts:  ['Container', 'Fahrzeuge'],
  },
];

// ── Material-Bibliothek ────────────────────────────────────────────────────────
function makeMats() {
  return {
    concrete:  new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.92 }),
    concreteD: new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.95 }),
    steel:     new THREE.MeshStandardMaterial({ color: 0x9090a0, roughness: 0.45, metalness: 0.6 }),
    yellow:    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7  }),
    rust:      new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.95, metalness: 0.2 }),
    dark:      new THREE.MeshStandardMaterial({ color: 0x252530, roughness: 1    }),
    darkMid:   new THREE.MeshStandardMaterial({ color: 0x353540, roughness: 0.9  }),
    cream:     new THREE.MeshStandardMaterial({ color: 0xd4c8aa, roughness: 0.7  }),
    red:       new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8  }),
    white:     new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7  }),
    blue:      new THREE.MeshStandardMaterial({ color: 0x2255aa, roughness: 0.7  }),
    orange:    new THREE.MeshStandardMaterial({ color: 0xdd6611, roughness: 0.8  }),
    grass:     new THREE.MeshStandardMaterial({ color: 0x3a6e1a, roughness: 1    }),
    grassLight:new THREE.MeshStandardMaterial({ color: 0x4c8820, roughness: 1    }),
    asphalt:   new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 1    }),
    gravel:    new THREE.MeshStandardMaterial({ color: 0x888870, roughness: 1    }),
    emit:      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.9 }),
    emitRed:   new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 1   }),
    emitGrn:   new THREE.MeshStandardMaterial({ color: 0x22ff44, emissive: 0x22ff44, emissiveIntensity: 1   }),
    emitBlue:  new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.8 }),
    glass:     new THREE.MeshStandardMaterial({ color: 0x7ab8d0, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.65 }),
    wood:      new THREE.MeshStandardMaterial({ color: 0x5c3a18, roughness: 1    }),
    tank:      new THREE.MeshStandardMaterial({ color: 0xb0b8b0, roughness: 0.4, metalness: 0.5 }),
  };
}

export class WorldMap {
  constructor(scene) {
    this.scene = scene;
    this.m     = makeMats();
    this._buildTerrain();
    this._buildRoads();
    this._buildBridge();
    this._buildPorts();
    this._buildTowns();
    this._buildInfrastructure();
    this._buildBuoys();
    this._buildLighthouse();
  }

  // ── Terrain ────────────────────────────────────────────────────────────────
  _buildTerrain() {
    const { grass, grassLight, gravel, concrete } = this.m;

    // West-Ufer (Hauptlandmasse)
    this._box(grass, -2100, -0.5, 0, 3000, 12, 8000);
    // Ost-Ufer
    this._box(grass, 2100, -0.5, 0, 3000, 12, 8000);

    // Deiche / Böschungen am Ufer (leicht erhöhte Streifen)
    this._box(grassLight, -260, 1.5, 0, 80, 4, 8000);  // West-Deich
    this._box(grassLight,  260, 1.5, 0, 80, 4, 8000);  // Ost-Deich

    // Sandbänke / Schlickzonen
    this._box(new THREE.MeshStandardMaterial({ color: 0xa89868, roughness: 1 }),
              -150, 0.05, -500, 60, 0.5, 300);
    this._box(new THREE.MeshStandardMaterial({ color: 0xb8a878, roughness: 1 }),
               180, 0.05,  400, 50, 0.5, 200);

    // Insel im Fluss
    this._box(grass, 20, -0.2, -100, 160, 8, 240);
    this._box(grassLight, 20, 4.0, -100, 130, 2, 200);

    // Hügelketten im Hintergrund (Silhouette)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x1a3410, roughness: 1 });
    for (let i = 0; i < 12; i++) {
      const x = -3200 + i * 60;
      const h = 60 + Math.sin(i * 0.9) * 30;
      this._box(hillMat, x, h * 0.5 + 6, (i % 3 - 1) * 400, 180, h, 380);
    }
    for (let i = 0; i < 10; i++) {
      const x = 3200 + i * 60;
      const h = 50 + Math.cos(i * 1.1) * 25;
      this._box(hillMat, x, h * 0.5 + 6, (i % 3 - 1) * 350, 160, h, 320);
    }
  }

  // ── Straßen ────────────────────────────────────────────────────────────────
  _buildRoads() {
    const { asphalt } = this.m;
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });

    // Küstenstraße West
    this._box(asphalt, -350, 0.1, 0, 16, 0.4, 7000);
    // Küstenstraße Ost
    this._box(asphalt,  350, 0.1, 0, 16, 0.4, 7000);

    // Querstraße über Brücke
    this._box(asphalt, 0, 6.5, -400, 740, 2, 18);

    // Straßenmittellinien
    for (let z = -3400; z < 3400; z += 80) {
      this._box(lineMat, -350, 0.25, z, 1.2, 0.1, 40);
      this._box(lineMat,  350, 0.25, z, 1.2, 0.1, 40);
    }

    // Straßenlaternen West
    for (let z = -1800; z < 1800; z += 180) {
      this._lampPost(-310, z);
      this._lampPost( 310, z);
    }
  }

  _lampPost(x, z) {
    const { steel, emit } = this.m;
    this._box(steel, x, 5, z, 0.5, 10, 0.5);
    this._box(steel, x + 2, 10, z, 4, 0.4, 0.4);
    this._sphere(emit, x + 4, 10, z, 0.6);
    const pl = new THREE.PointLight(0xfef0a0, 8, 60, 2);
    pl.position.set(x + 4, 10, z);
    this.scene.add(pl);
  }

  // ── Brücke ────────────────────────────────────────────────────────────────
  _buildBridge() {
    const { concrete, steel, cream } = this.m;

    // Fahrbahn
    this._box(concrete, 0, 6, -400, 740, 2.5, 20);
    // Geländer
    this._box(steel,  0, 8, -411, 740, 1.5, 1.5);
    this._box(steel,  0, 8, -389, 740, 1.5, 1.5);
    // Stützpfeiler
    for (const x of [-280, -90, 90, 280]) {
      this._box(cream, x, 2.5, -400, 14, 14, 14);
      this._box(cream, x, 5.0, -400, 8, 6, 8);
    }
    // Bögen (vereinfacht: stählerne Querträger)
    for (const x of [-190, 0, 190]) {
      this._box(steel, x, 10, -400, 10, 1, 24);
    }
  }

  // ── Häfen ────────────────────────────────────────────────────────────────
  _buildPorts() {
    this._buildPortNordheim();
    this._buildPortRheinburg();
    this._buildTerminalOsterfeld();
  }

  _buildPortNordheim() {
    const px = -380, pz = -950;
    const { concrete, concreteD, steel, yellow, dark, darkMid, cream,
            asphalt, gravel, tank, rust, emit, emitRed } = this.m;

    // Hauptkai
    this._box(concreteD, px, 1.5, pz, 280, 4, 220);
    // Asphalt-Lagerfläche
    this._box(asphalt,   px - 80, 3.5, pz - 60, 100, 0.3, 180);
    // Kaimauer
    this._box(concreteD, px + 140, 1.5, pz, 4, 6, 220);

    // Kran 1 (groß)
    this._portCrane(px + 50, pz - 40, 'large', yellow);
    // Kran 2
    this._portCrane(px + 80, pz + 60, 'medium', yellow);

    // Treibstofftanks (weiße Großzylinder)
    for (let i = 0; i < 3; i++) {
      this._cyl(tank, px - 110, 14, pz - 60 + i * 45, 12, 12, 28, 12);
      this._cyl(tank, px - 110,  0, pz - 60 + i * 45,  8,  9,  2, 12);
    }
    // Verbindungsrohre (stilisiert)
    this._box(steel, px - 100, 4, pz - 15, 2, 2, 90);
    this._box(steel, px - 95,  5, pz - 65, 30, 1.5, 2);

    // Lagerhallen (3 Stück)
    for (let i = 0; i < 3; i++) {
      this._buildWarehouse(px - 55, 3.5, pz - 80 + i * 70, 60, 22, 55, darkMid);
    }

    // Kohlehaufen / Erzhaufen
    this._mound(px + 20, pz - 90, 0x333330, 35, 8);
    this._mound(px + 55, pz - 70, 0x5c4a2a, 25, 6);

    // Kaimauer-Poller (alle 15m)
    for (let z = pz - 100; z <= pz + 100; z += 18) {
      this._cyl(concrete, px + 140, 5.5, z, 1.2, 1.2, 3, 8);
      this._box(steel, px + 140, 7.5, z, 3, 1, 2);  // Poller-Kopf
    }

    // Fender (Schutzpuffer)
    for (let z = pz - 80; z <= pz + 80; z += 20) {
      this._box(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 }),
                px + 143, 3, z, 3, 4, 8);
    }

    // Hafenbeleuchtung
    for (let z = pz - 100; z <= pz + 100; z += 60) {
      this._mast(emit, px + 120, z, 18);
      const pl = new THREE.PointLight(0xfff5c0, 40, 180, 2);
      pl.position.set(px + 125, 19, z);
      this.scene.add(pl);
    }

    // Verwaltungsgebäude
    this._buildBuilding(px - 130, 3.5, pz + 90, 50, 28, 40, cream, 5);

    // Hafenschilder (leuchtend)
    this._signBox(px + 90, 8, pz - 110, 'NORDHEIM', emitRed);

    // Sicherheitszaun
    this._box(steel, px - 20, 5, pz - 115, 250, 3, 1.5);
    this._box(steel, px - 20, 5, pz + 115, 250, 3, 1.5);
  }

  _buildPortRheinburg() {
    const px = 320, pz = 900;
    const { concrete, concreteD, steel, yellow, dark, cream, emit,
            asphalt, wood, blue, white, emitGrn } = this.m;

    // Hafenbecken-Kai
    this._box(concrete, px, 2, pz, 220, 5, 200);
    this._box(asphalt,  px - 50, 4.5, pz - 30, 120, 0.3, 140);

    // Kran
    this._portCrane(px + 20, pz - 30, 'medium', yellow);

    // Kleines Containerfeld
    this._containerStack(px - 20, 5, pz + 30, 4, 2, 3);

    // Fähranleger (Holzsteg)
    this._box(wood, px + 115, 2, pz, 6, 1.5, 180);
    for (let z = pz - 90; z <= pz + 90; z += 12) {
      this._box(wood, px + 118, 2, z, 12, 0.5, 2);
    }

    // Terminal-Gebäude (Glasfront)
    this._buildBuilding(px - 80, 4.5, pz - 60, 70, 18, 45, cream, 3);
    // Fährterminal (Glaswand)
    this._box(cream, px + 90, 4.5, pz - 40, 30, 12, 35);
    this._box(this.m.glass, px + 105, 5, pz - 40, 1, 8, 30);

    // Promenade / Quai-Mauer mit Bänken
    this._box(concrete, px + 130, 4, pz, 8, 2, 200);
    for (let z = pz - 80; z <= pz + 80; z += 30) {
      this._box(wood, px + 130, 6.5, z, 4, 1.5, 10);  // Sitzbank
    }

    // Hafenlichter
    for (let z = pz - 90; z <= pz + 90; z += 50) {
      this._mast(emitGrn, px + 125, z, 14);
      const pl = new THREE.PointLight(0xe0ffe0, 30, 150, 2);
      pl.position.set(px + 125, 15, z);
      this.scene.add(pl);
    }

    // Kaimauer-Poller
    for (let z = pz - 90; z <= pz + 90; z += 18) {
      this._cyl(concrete, px + 110, 6, z, 1.2, 1.2, 3, 8);
    }
  }

  _buildTerminalOsterfeld() {
    const px = 600, pz = -200;
    const { concrete, concreteD, steel, yellow, asphalt, emit, emitBlue } = this.m;

    this._box(concreteD, px, 2, pz, 200, 5, 160);
    this._box(asphalt,   px - 30, 4.5, pz, 140, 0.3, 120);

    // Großer Portalkran
    this._portalCrane(px, pz - 20, yellow);
    // Zweiter Portalkran
    this._portalCrane(px, pz + 40, steel);

    // Container-Stapel (mehrfarbig)
    this._containerStack(px - 60, 5, pz - 40, 5, 3, 4);
    this._containerStack(px - 60, 5, pz + 30, 5, 2, 4);

    // Hafenmast
    for (let z = pz - 70; z <= pz + 70; z += 60) {
      this._mast(emitBlue, px + 100, z, 20);
      const pl = new THREE.PointLight(0xd0e8ff, 35, 160, 2);
      pl.position.set(px + 104, 21, z);
      this.scene.add(pl);
    }
  }

  // ── Städte und Dörfer ─────────────────────────────────────────────────────
  _buildTowns() {
    this._buildTownRheinburg();
    this._buildVillageNord();
  }

  _buildTownRheinburg() {
    const bx = 700, bz = 700;
    const { cream, dark, red, white, glass } = this.m;

    // Wohnhäuser (kleine europäische Blöcke)
    const colors = [0xd4c8aa, 0xc8b898, 0xe0d8c0, 0xb8a888, 0xddd0b8];
    const roofCols = [0x8a2020, 0x7a3010, 0x904020, 0x6a1818, 0x702808];
    const rng = this._rng(42);

    for (let i = 0; i < 18; i++) {
      const x   = bx + (rng() - 0.5) * 400;
      const z   = bz + (rng() - 0.5) * 500;
      const w   = 15 + rng() * 20;
      const h   = 10 + rng() * 16;
      const d   = 15 + rng() * 18;
      const col = colors[Math.floor(rng() * colors.length)];
      const rcol = roofCols[Math.floor(rng() * roofCols.length)];
      this._buildBuilding(x, 0, z, w, h, d,
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }),
        Math.floor(h / 4));
    }

    // Kirche / markantes Gebäude
    this._buildChurch(bx + 80, bz - 80);

    // Geschäftsgebäude (Glasfassaden)
    this._buildBuilding(bx - 60, 0, bz + 40, 40, 25, 30, cream, 4);
    this._box(this.m.glass, bx - 60, 0, bz + 40, 42, 22, 3);

    // Uferbebauung Richtung Hafen
    for (let i = 0; i < 6; i++) {
      this._buildBuilding(550 + i * 35, 0, bz - 100, 28, 14 + i * 2, 22,
        new THREE.MeshStandardMaterial({ color: 0xd0c8b0, roughness: 0.9 }), 3);
    }
  }

  _buildChurch(x, z) {
    const { cream, white } = this.m;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb0a890, roughness: 0.9 });
    // Kirchenschiff
    this._box(stoneMat, x, 9, z, 22, 18, 45);
    // Turm
    this._box(stoneMat, x, 18, z - 18, 10, 36, 10);
    // Turmspitze (Pyramide via ConeGeometry)
    this._cone(stoneMat, x, 40, z - 18, 6, 14, 4);
    // Querschiff
    this._box(stoneMat, x, 9, z + 5, 40, 12, 12);
    // Kirchenlichter
    for (let i = 0; i < 3; i++) {
      this._box(new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xfff0cc, emissiveIntensity: 0.4 }),
                x + (i - 1) * 8, 8, z + 14, 3, 6, 0.5);
    }
  }

  _buildVillageNord() {
    const vx = -600, vz = -1600;
    const rng = this._rng(88);
    const cols = [0xd8c8aa, 0xe0d0b8, 0xc8b890, 0xddd8c0];

    for (let i = 0; i < 8; i++) {
      const x = vx + (rng() - 0.5) * 250;
      const z = vz + (rng() - 0.5) * 200;
      const w = 12 + rng() * 14;
      const h = 8 + rng() * 10;
      this._buildBuilding(x, 0, z, w, h, 16 + rng() * 10,
        new THREE.MeshStandardMaterial({ color: cols[Math.floor(rng() * cols.length)], roughness: 0.9 }),
        Math.floor(h/4));
    }
    // Dorfkirche
    this._buildChurch(vx + 20, vz + 30);
  }

  // ── Infrastruktur ─────────────────────────────────────────────────────────
  _buildInfrastructure() {
    // Schleusentor (stilisiert) — Beginn Kanal
    const { concreteD, steel, emit } = this.m;
    const lx = -240, lz = 500;
    this._box(concreteD, lx - 60, 5, lz, 80, 14, 18);  // West-Wand
    this._box(concreteD, lx + 60, 5, lz, 80, 14, 18);  // Ost-Wand
    this._box(steel,     lx - 18, 6, lz, 28, 12,  2);  // Torflügel L
    this._box(steel,     lx + 18, 6, lz, 28, 12,  2);  // Torflügel R
    // Ampelmasten
    this._mast(emit, lx - 70, lz - 12, 12);
    this._mast(emit, lx + 70, lz - 12, 12);

    // Windmühle / Windkraft (Silhouette am Horizont)
    for (let i = 0; i < 3; i++) {
      this._windTurbine(-1800 + i * 200, -800 + i * 150);
    }
  }

  _windTurbine(x, z) {
    const { white } = this.m;
    this._cyl(white, x, 40, z, 2.5, 3.5, 80, 6);  // Mast
    this._cyl(white, x, 81, z, 2, 2, 4, 6);         // Gondel
    // 3 Rotorblätter (vereinfacht)
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const bx = x + Math.cos(angle) * 20;
      const by = 81 + Math.sin(angle) * 20;
      const rot = new THREE.Mesh(new THREE.BoxGeometry(3, 40, 0.8), white);
      rot.position.set(bx, by, z);
      rot.rotation.z = angle;
      this.scene.add(rot);
    }
  }

  // ── Tonnen / Bojen ────────────────────────────────────────────────────────
  _buildBuoys() {
    const positions = [
      { x: -80, z: -800, col: 0xff2222 }, { x:  80, z: -800, col: 0x22cc22 },
      { x: -80, z: -500, col: 0xff2222 }, { x:  80, z: -500, col: 0x22cc22 },
      { x: -80, z: -200, col: 0xff2222 }, { x:  80, z: -200, col: 0x22cc22 },
      { x: -80, z:  100, col: 0xff2222 }, { x:  80, z:  100, col: 0x22cc22 },
      { x: -80, z:  400, col: 0xff2222 }, { x:  80, z:  400, col: 0x22cc22 },
      { x: -80, z:  700, col: 0xff2222 }, { x:  80, z:  700, col: 0x22cc22 },
    ];
    for (const b of positions) {
      const mat = new THREE.MeshStandardMaterial({
        color: b.col, emissive: b.col, emissiveIntensity: 0.6, roughness: 0.8
      });
      this._cyl(mat, b.x, 2, b.z, 2, 2, 4, 6);
      this._cyl(mat, b.x, 5, b.z, 0.4, 0.4, 4, 4);  // Mast
      const pl = new THREE.PointLight(b.col, 12, 80, 2);
      pl.position.set(b.x, 6, b.z);
      this.scene.add(pl);
    }
  }

  // ── Leuchtturm ────────────────────────────────────────────────────────────
  _buildLighthouse() {
    const { white, red, emit } = this.m;
    const lx = -480, lz = -1550;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 });
    this._cyl(stoneMat,  lx, 20, lz, 4, 6, 40, 10);      // Turm
    this._cyl(red,       lx, 22, lz, 4.2, 4.2, 6, 10);   // Streifen
    this._cyl(red,       lx, 32, lz, 4.2, 4.2, 6, 10);
    this._cyl(stoneMat,  lx, 40, lz, 3.0, 3.5, 4, 10);   // Balkon
    this._cyl(emit,      lx, 43, lz, 2.2, 2.2, 3, 8);    // Laterne
    this._cone(stoneMat, lx, 45, lz, 3, 4, 8);            // Spitze

    const pl = new THREE.PointLight(0xfff0a0, 200, 1200, 1.2);
    pl.position.set(lx, 45, lz);
    this.scene.add(pl);

    // Wächterhaus
    this._buildBuilding(lx - 20, 0, lz + 10, 18, 10, 14,
      new THREE.MeshStandardMaterial({ color: 0xd0c8b0, roughness: 0.9 }), 2);
  }

  // ── Hilfsmethoden ─────────────────────────────────────────────────────────

  _portCrane(x, z, size = 'medium', mat) {
    const h = size === 'large' ? 50 : 36;
    const a = size === 'large' ? 40 : 28;
    this._box(mat, x,   h/2, z, 4,  h,  4);       // Säule
    this._box(mat, x+a/2, h, z, a, 3.5, 4);        // Ausleger
    this._box(mat, x-8,   h, z, 16, 4,  4);        // Gegengewicht
    this._cyl(mat, x+a,   h - a*0.7, z, 1.5, 1.5, a*1.4, 4); // Hängung
    this._box(mat, x+a,   h - a*0.7 - 2, z, 6, 4, 4); // Haken
  }

  _portalCrane(x, z, mat) {
    const H = 45;
    // Zwei Beine
    this._box(mat, x - 18, H/2, z, 4, H, 4);
    this._box(mat, x + 18, H/2, z, 4, H, 4);
    // Querträger
    this._box(mat, x, H, z, 40, 4, 4);
    // Trolley
    this._box(mat, x, H + 3, z, 8, 5, 5);
    // Kabel
    this._box(this.m.steel, x, H - 20, z, 1.5, 40, 1.5);
  }

  _containerStack(cx, y, cz, cols, rows, depth) {
    const colors = [0xcc3322, 0x2255bb, 0x228844, 0xddaa22, 0x885522, 0x335599];
    const rng = this._rng(cx + cz);
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        for (let d = 0; d < depth; d++) {
          const c = colors[Math.floor(rng() * colors.length)];
          const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
          const m = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 6), mat);
          m.position.set(cx + col * 13, y + row * 5.5, cz + d * 7);
          m.castShadow = true;
          this.scene.add(m);
        }
      }
    }
  }

  _buildWarehouse(x, y, z, w, h, d, mat) {
    this._box(mat, x, y + h/2, z, w, h, d);
    // Satteldach
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6a6870, roughness: 0.9, metalness: 0.2 });
    this._box(roofMat, x, y + h + 1.5, z, w + 2, 3, d + 2);
    // Fensterreihe
    const winMat = this.m.glass;
    for (let wi = -w/2 + 6; wi < w/2; wi += 12) {
      this._box(winMat, x + wi, y + h * 0.55, z - d/2 - 0.1, 4, 4, 0.5);
      this._box(winMat, x + wi, y + h * 0.55, z + d/2 + 0.1, 4, 4, 0.5);
    }
    // Tore
    this._box(this.m.darkMid, x, y + h * 0.4, z + d/2 + 0.2, 8, h * 0.8, 0.5);
  }

  _buildBuilding(x, y, z, w, h, d, mat, floors = 3) {
    this._box(mat, x, y + h/2, z, w, h, d);
    // Roofline / Attika
    this._box(this.m.concreteD, x, y + h, z, w + 0.5, 1.5, d + 0.5);
    // Fenster (instanced — vereinfacht als Reihen)
    const wMat = this.m.glass;
    const fw = 3.5, fh = 2.8;
    for (let fl = 0; fl < floors; fl++) {
      const fy = y + 4 + fl * (h / floors);
      for (let wi = -w/2 + 4; wi < w/2 - 2; wi += 6) {
        this._box(wMat, x + wi, fy, z + d/2 + 0.15, fw, fh, 0.4);
        this._box(wMat, x + wi, fy, z - d/2 - 0.15, fw, fh, 0.4);
      }
      for (let di = -d/2 + 4; di < d/2 - 2; di += 6) {
        this._box(wMat, x + w/2 + 0.15, fy, z + di, 0.4, fh, fw);
        this._box(wMat, x - w/2 - 0.15, fy, z + di, 0.4, fh, fw);
      }
    }
  }

  _mound(cx, cz, color, r, h) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    const geo = new THREE.ConeGeometry(r, h, 12);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cx, h/2 + 0.2, cz);
    m.castShadow = m.receiveShadow = true;
    this.scene.add(m);
  }

  _mast(mat, x, z, h) {
    this._cyl(this.m.steel, x, h/2, z, 0.3, 0.4, h, 4);
    this._box(this.m.steel, x + 3, h, z, 6, 0.4, 0.4);
    this._sphere(mat, x + 6, h, z, 0.8);
  }

  _signBox(x, y, z, text, mat) {
    this._box(mat, x, y, z, 30, 5, 2);
  }

  // Primitive Helfer
  _box(mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }
  _cyl(mat, x, y, z, rt, rb, h, segs = 8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }
  _cone(mat, x, y, z, r, h, segs = 6) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    this.scene.add(m);
    return m;
  }
  _sphere(mat, x, y, z, r) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }
  _rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
  }
}
