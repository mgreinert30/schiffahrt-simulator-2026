// Vegetation.js — Instanced Bäume, Büsche, Schilf für hohe Performance
import * as THREE from 'three';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

export class Vegetation {
  constructor(scene) {
    this.scene = scene;
    this._buildForestTrees();
    this._buildRiverTrees();
    this._buildReeds();
    this._buildBushes();
    this._buildFieldRows();
  }

  // Dichter Wald (weit von Hafen entfernt)
  _buildForestTrees() {
    const ZONES = [
      { cx: -1750, cz: -700,  n: 80, sx: 420, sz: 700 },
      { cx: -1700, cz:  500,  n: 65, sx: 380, sz: 550 },
      { cx:  1620, cz: -650,  n: 55, sx: 350, sz: 500 },
      { cx:  1680, cz:  800,  n: 60, sx: 360, sz: 600 },
      { cx: -600,  cz: -1700, n: 40, sx: 280, sz: 220 },
      { cx:  700,  cz:  1600, n: 45, sx: 300, sz: 250 },
    ];
    const total = ZONES.reduce((s, z) => s + z.n, 0);
    const dummy = new THREE.Object3D();
    const rng   = seededRng(1337);

    // Baumstamm (Instanced)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2010, roughness: 1 });
    const trunkGeo = new THREE.CylinderGeometry(0.55, 0.85, 1, 6);
    const trunks   = new THREE.InstancedMesh(trunkGeo, trunkMat, total);
    trunks.castShadow   = true;
    trunks.receiveShadow = true;

    // Baumkrone (Instanced)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e4a10, roughness: 1 });
    const leafGeo = new THREE.ConeGeometry(1, 1, 7);
    const leaves  = new THREE.InstancedMesh(leafGeo, leafMat, total);
    leaves.castShadow   = true;

    // Herbstliche Baumkrone (Akzente)
    const leafMatB = new THREE.MeshStandardMaterial({ color: 0x2a5c14, roughness: 1 });
    const leavesB  = new THREE.InstancedMesh(leafGeo, leafMatB, Math.floor(total * 0.3));
    leavesB.castShadow = true;

    let idx = 0, idxB = 0;

    for (const z of ZONES) {
      for (let i = 0; i < z.n; i++) {
        const x  = z.cx + (rng() - 0.5) * z.sx;
        const zz = z.cz + (rng() - 0.5) * z.sz;
        const h  = 9 + rng() * 8;
        const sw = 0.9 + rng() * 0.5;
        const isB = rng() < 0.3;

        dummy.position.set(x, h * 0.5 + 0.5, zz);
        dummy.scale.set(sw, h, sw);
        dummy.rotation.set(0, rng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        trunks.setMatrixAt(idx, dummy.matrix);

        const crown = 3.5 + rng() * 2.5;
        dummy.position.set(x, h + crown * 0.4, zz);
        dummy.scale.set(crown * sw, crown * 1.1, crown * sw);
        dummy.updateMatrix();

        if (isB && idxB < leavesB.count) {
          leavesB.setMatrixAt(idxB++, dummy.matrix);
        } else {
          leaves.setMatrixAt(idx, dummy.matrix);
        }
        idx++;
      }
    }

    this.scene.add(trunks);
    this.scene.add(leaves);
    this.scene.add(leavesB);
  }

  // Baumreihen am Ufer
  _buildRiverTrees() {
    const dummy  = new THREE.Object3D();
    const rng    = seededRng(555);
    const COUNT  = 80;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2410, roughness: 1 });
    const leafMat  = new THREE.MeshStandardMaterial({ color: 0x254d12, roughness: 1 });
    const trunks   = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 1, 5), trunkMat, COUNT);
    const crowns   = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), leafMat, COUNT);
    trunks.castShadow = crowns.castShadow = true;

    for (let i = 0; i < COUNT; i++) {
      const side = i < COUNT / 2 ? -1 : 1;
      const zz   = -1800 + (i % (COUNT / 2)) * (3600 / (COUNT / 2));
      const xOff = (200 + rng() * 100) * side;
      const h    = 8 + rng() * 6;
      const cr   = 3.5 + rng() * 2;

      dummy.position.set(xOff, h/2 + 0.5, zz);
      dummy.scale.set(0.8, h, 0.8);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(xOff, h + cr * 0.4, zz);
      dummy.scale.setScalar(cr);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(trunks);
    this.scene.add(crowns);
  }

  // Schilf an Uferzonen
  _buildReeds() {
    const COUNT  = 500;
    const dummy  = new THREE.Object3D();
    const rng    = seededRng(777);
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x7a8a3a, roughness: 1 });
    const reedGeo = new THREE.CylinderGeometry(0.07, 0.10, 2.2, 4);
    const reeds   = new THREE.InstancedMesh(reedGeo, reedMat, COUNT);

    for (let i = 0; i < COUNT; i++) {
      const angle = rng() * Math.PI * 2;
      const dist  = 185 + rng() * 50;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      dummy.position.set(x, 1.1, z);
      dummy.rotation.set((rng()-0.5)*0.4, rng()*Math.PI*2, (rng()-0.5)*0.4);
      dummy.scale.setScalar(0.6 + rng() * 0.7);
      dummy.updateMatrix();
      reeds.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(reeds);
  }

  // Büsche am Ufer und in Feldecken
  _buildBushes() {
    const COUNT   = 200;
    const dummy   = new THREE.Object3D();
    const rng     = seededRng(999);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2f5c1a, roughness: 1 });
    const bushGeo = new THREE.SphereGeometry(1, 7, 5);
    const bushes  = new THREE.InstancedMesh(bushGeo, bushMat, COUNT);
    bushes.castShadow = true;

    for (let i = 0; i < COUNT; i++) {
      const x  = (rng() - 0.5) * 3600 * (rng() < 0.5 ? -1 : 1);
      const zz = (rng() - 0.5) * 3600;
      const s  = 1.5 + rng() * 2.0;
      dummy.position.set(Math.sign(x) * (210 + Math.abs(x) * 0.4), s * 0.5 + 0.2, zz);
      dummy.scale.set(s, s * 0.7, s);
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(bushes);
  }

  // Feldreihen (Instanced Planes in verschiedenen Grüntönen)
  _buildFieldRows() {
    const fieldColors = [0x5a8a2a, 0x6a9a30, 0x8aaa40, 0xc8b830, 0x9a7020, 0x4a7010];
    const ZONE = [
      { cx:  1500, cz:  600, w: 600, d: 800 },
      { cx:  1600, cz: -400, w: 500, d: 600 },
      { cx: -1600, cz:  300, w: 550, d: 700 },
      { cx: -1500, cz: -600, w: 480, d: 500 },
    ];
    for (const z of ZONE) {
      const col = fieldColors[Math.floor(Math.random() * fieldColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 1 });
      const geo = new THREE.PlaneGeometry(z.w, z.d);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(z.cx, 0.05, z.cz);
      m.receiveShadow = true;
      this.scene.add(m);

      // Feldlinien (dunkle Streifen)
      const lineMat = new THREE.MeshStandardMaterial({ color: Math.floor(col * 0.7), roughness: 1 });
      for (let i = -z.w/2 + 15; i < z.w/2; i += 22) {
        const lineGeo = new THREE.PlaneGeometry(2, z.d);
        lineGeo.rotateX(-Math.PI / 2);
        const lm = new THREE.Mesh(lineGeo, lineMat);
        lm.position.set(z.cx + i, 0.07, z.cz);
        this.scene.add(lm);
      }
    }
  }
}
