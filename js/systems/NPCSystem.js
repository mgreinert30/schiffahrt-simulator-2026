// NPCSystem — KI-Schiffe auf vordefinierten Routen
import * as THREE from 'three';

// Ovale Routen: Array von Wegpunkten [x, z]
const ROUTES = [
  // Route 1: Nordhafen ↔ Mittelterminal
  [[-200, -1800], [-150, -1000], [-250, -950], [-200, -800], [-100, -400], [100, -200], [200, -150], [180, 200], [100, 800], [0, 1200]],
  // Route 2: Stadthafen ↔ Mittelterminal (kurz)
  [[250, 900], [300, 700], [200, 400], [100, 100], [150, -100], [300, -200], [400, -180], [350, 200], [320, 600]],
  // Route 3: Großes Oval (Hauptfluss)
  [[-150, -1900], [-80, -1200], [50, -600], [120, 0], [80, 600], [-50, 1200], [-100, 1800], [-130, 1200], [-80, 600], [30, 100], [80, -400], [-100, -1000]],
  // Route 4: Kurze Pendelroute Süd
  [[80, 600], [120, 1000], [200, 900], [280, 750], [200, 500], [80, 300]],
  // Route 5: Nordpendel
  [[-100, -800], [-160, -1050], [-200, -950], [-150, -700], [-80, -500]],
];

const NPC_SPEEDS = [1.8, 2.2, 1.5, 2.5, 1.2];    // m/s
const NPC_COLORS = [0x334466, 0x443322, 0x223344, 0x442233, 0x334422];

// Einfaches NPC-Schiff bauen
function buildNPCMesh(scene, color) {
  const g = new THREE.Group();
  const hull  = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const cabin = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7 });
  const fn = (mat, x, y, z, w, h, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
  };
  fn(hull,  0, 1.0, 0,  5.5, 2.2, 18);  // Rumpf
  fn(hull,  0, 0.4, -8.5, 4.5, 1.2, 2); // Bug
  fn(cabin, 0, 3.5, 5,  5.0, 3.0, 5);   // Aufbau
  const cyl = (mat, x, y, z, r, h) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r*1.3, h, 6), mat);
    m.position.set(x, y, z); g.add(m);
  };
  cyl(new THREE.MeshStandardMaterial({ color: 0xcc4422 }), 0, 6.5, 6, 0.5, 2.5);
  scene.add(g);
  return g;
}

export class NPCSystem {
  constructor(scene, collision) {
    this.collision = collision;
    this._ships    = [];

    for (let i = 0; i < ROUTES.length; i++) {
      const route = ROUTES[i];
      const mesh  = buildNPCMesh(scene, NPC_COLORS[i % NPC_COLORS.length]);

      const startWp = Math.floor(Math.random() * route.length);
      const start   = route[startWp];

      this._ships.push({
        mesh,
        route,
        wpIdx:   startWp,
        speed:   NPC_SPEEDS[i % NPC_SPEEDS.length],
        x:       start[0],
        z:       start[1],
        heading: 0,
        radius:  9,        // Kollisionsradius (m)
        dir:     (Math.random() < 0.5 ? 1 : -1),  // Richtung auf Route
      });
    }

    this._syncMeshes();
  }

  update(dt) {
    for (const ship of this._ships) {
      this._moveShip(ship, dt);

      // Kollision mit Spielerschiff prüfen
      this.collision.checkNPC(ship.x, ship.z, ship.radius);
    }
    this._syncMeshes();
  }

  _moveShip(ship, dt) {
    const route = ship.route;
    const wp    = route[ship.wpIdx];
    const dx    = wp[0] - ship.x;
    const dz    = wp[1] - ship.z;
    const dist  = Math.hypot(dx, dz);

    if (dist < 15) {
      // Nächsten Wegpunkt
      ship.wpIdx = (ship.wpIdx + ship.dir + route.length) % route.length;
    } else {
      const nx = dx / dist;
      const nz = dz / dist;
      ship.x += nx * ship.speed * dt;
      ship.z += nz * ship.speed * dt;
      ship.heading = Math.atan2(-nx, -nz);
    }
  }

  _syncMeshes() {
    for (const ship of this._ships) {
      ship.mesh.position.set(ship.x, 0, ship.z);
      ship.mesh.rotation.y = ship.heading;
    }
  }

  // Alle NPC-Positionen für Debug
  get positions() {
    return this._ships.map(s => ({ x: s.x, z: s.z, r: s.radius }));
  }
}
