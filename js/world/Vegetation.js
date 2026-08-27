// Vegetation.js — Vielfältige europäische Bäume, Felder, Büsche (GPU-Instancing)
import * as THREE from 'three';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ── Instanced-Mesh Helper ─────────────────────────────────────────────────────
function iMesh(geo, mat, count, scene) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.castShadow = m.receiveShadow = true;
  scene.add(m); return m;
}

export class Vegetation {
  constructor(scene) {
    this.scene = scene;
    this._buildOakForest();
    this._buildBirchGroves();
    this._buildPineTrees();
    this._buildPoplarRows();
    this._buildWillowsRiver();
    this._buildReeds();
    this._buildBushes();
    this._buildRapseedFields();
    this._buildWheatFields();
    this._buildMixedFields();
    this._buildOrchards();
  }

  // ── EICHEN-WÄLDER ──────────────────────────────────────────────────────────
  _buildOakForest() {
    const ZONES = [
      { cx: -1750, cz: -700, n: 90, sx: 420, sz: 700 },
      { cx: -1700, cz:  500, n: 70, sx: 380, sz: 550 },
      { cx:  1620, cz: -650, n: 60, sx: 350, sz: 500 },
      { cx:  1680, cz:  800, n: 65, sx: 360, sz: 600 },
      { cx:  -600, cz:-1700, n: 45, sx: 280, sz: 220 },
      { cx:   700, cz: 1600, n: 50, sx: 300, sz: 250 },
    ];
    const total = ZONES.reduce((s, z) => s + z.n, 0);
    const dummy = new THREE.Object3D();
    const rng   = seededRng(1337);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2010, roughness: 1 });
    const leaf1Mat = new THREE.MeshStandardMaterial({ color: 0x1e4a10, roughness: 1 });  // dunkelgrün
    const leaf2Mat = new THREE.MeshStandardMaterial({ color: 0x2b5814, roughness: 1 });  // mittelgrün
    const leaf3Mat = new THREE.MeshStandardMaterial({ color: 0x3d6818, roughness: 1 });  // hellgrün

    const trunkGeo = new THREE.CylinderGeometry(0.55, 0.85, 1, 6);
    const crownGeo = new THREE.SphereGeometry(1, 7, 5);

    const trunks = iMesh(trunkGeo, trunkMat, total, this.scene);
    const leaves1 = iMesh(crownGeo, leaf1Mat, Math.ceil(total * 0.5), this.scene);
    const leaves2 = iMesh(crownGeo, leaf2Mat, Math.ceil(total * 0.3), this.scene);
    const leaves3 = iMesh(crownGeo, leaf3Mat, Math.ceil(total * 0.2), this.scene);

    let i1=0, i2=0, i3=0, iT=0;
    for (const z of ZONES) {
      for (let i = 0; i < z.n; i++) {
        const x  = z.cx + (rng() - 0.5) * z.sx;
        const zz = z.cz + (rng() - 0.5) * z.sz;
        const h  = 9 + rng() * 9;
        const sw = 0.85 + rng() * 0.55;

        dummy.position.set(x, h * 0.5 + 0.5, zz);
        dummy.scale.set(sw, h, sw);
        dummy.rotation.set(0, rng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        trunks.setMatrixAt(iT++, dummy.matrix);

        const crown = 3.5 + rng() * 3.0;
        dummy.position.set(x, h + crown * 0.3, zz);
        dummy.scale.set(crown * sw, crown * 0.9, crown * sw);
        dummy.updateMatrix();

        const r = rng();
        if (r < 0.5 && i1 < leaves1.count)       leaves1.setMatrixAt(i1++, dummy.matrix);
        else if (r < 0.8 && i2 < leaves2.count)   leaves2.setMatrixAt(i2++, dummy.matrix);
        else if (i3 < leaves3.count)               leaves3.setMatrixAt(i3++, dummy.matrix);
      }
    }
    leaves1.count = i1; leaves2.count = i2; leaves3.count = i3;
    [trunks,leaves1,leaves2,leaves3].forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  // ── BIRKEN-HAINE (helle Stämme, hellgrüne Kronen) ─────────────────────────
  _buildBirchGroves() {
    const ZONES = [
      { cx: -1400, cz: -200, n: 40, sx: 220, sz: 300 },
      { cx:  1350, cz:  300, n: 35, sx: 200, sz: 250 },
      { cx: -1500, cz: 1200, n: 30, sx: 180, sz: 200 },
    ];
    const total = ZONES.reduce((s, z) => s + z.n, 0);
    const dummy = new THREE.Object3D();
    const rng   = seededRng(2468);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 }); // heller Birkenstamm
    const leafMat  = new THREE.MeshStandardMaterial({ color: 0x4e8018, roughness: 1 }); // frisches hellgrün

    const trunks = iMesh(new THREE.CylinderGeometry(0.30, 0.42, 1, 5), trunkMat, total, this.scene);
    const leaves = iMesh(new THREE.SphereGeometry(1, 6, 5), leafMat, total, this.scene);

    let idx = 0;
    for (const z of ZONES) {
      for (let i = 0; i < z.n; i++) {
        const x  = z.cx + (rng() - 0.5) * z.sx;
        const zz = z.cz + (rng() - 0.5) * z.sz;
        const h  = 10 + rng() * 7;

        dummy.position.set(x, h*0.5, zz);
        dummy.scale.set(0.6, h, 0.6);
        dummy.rotation.set(0, rng()*Math.PI*2, 0);
        dummy.updateMatrix();
        trunks.setMatrixAt(idx, dummy.matrix);

        const cr = 2.5 + rng() * 2;
        dummy.position.set(x, h + cr*0.25, zz);
        dummy.scale.set(cr*0.75, cr*1.1, cr*0.75); // schmal
        dummy.updateMatrix();
        leaves.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    [trunks, leaves].forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  // ── NADELBÄUME / KIEFERN ──────────────────────────────────────────────────
  _buildPineTrees() {
    const ZONES = [
      { cx: -2000, cz:  400, n: 50, sx: 280, sz: 400 },
      { cx:  1900, cz: -300, n: 45, sx: 260, sz: 350 },
      { cx: -2100, cz:-1100, n: 35, sx: 220, sz: 280 },
    ];
    const total = ZONES.reduce((s, z) => s + z.n, 0);
    const dummy = new THREE.Object3D();
    const rng   = seededRng(3579);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2808, roughness: 1 });
    const leaf1Mat = new THREE.MeshStandardMaterial({ color: 0x0e2a08, roughness: 1 }); // dunkel
    const leaf2Mat = new THREE.MeshStandardMaterial({ color: 0x163210, roughness: 1 }); // mittel

    const trunks = iMesh(new THREE.CylinderGeometry(0.30, 0.55, 1, 5), trunkMat, total, this.scene);
    const cones1 = iMesh(new THREE.ConeGeometry(1, 1, 6), leaf1Mat, Math.ceil(total*0.55), this.scene);
    const cones2 = iMesh(new THREE.ConeGeometry(1, 1, 6), leaf2Mat, Math.ceil(total*0.45), this.scene);

    let iT=0, i1=0, i2=0;
    for (const z of ZONES) {
      for (let i = 0; i < z.n; i++) {
        const x  = z.cx + (rng()-0.5)*z.sx;
        const zz = z.cz + (rng()-0.5)*z.sz;
        const h  = 12 + rng() * 8;
        const sw = 0.7 + rng() * 0.4;

        dummy.position.set(x, h*0.5, zz);
        dummy.scale.set(sw, h, sw);
        dummy.updateMatrix();
        trunks.setMatrixAt(iT++, dummy.matrix);

        // Multi-Ebenen Kegel (2 Etagen)
        for (let tier = 0; tier < 2; tier++) {
          const tierH  = h * (0.55 + tier * 0.25);
          const tierR  = (3.0 - tier * 0.8) * sw;
          const tierHt = (5 + rng() * 3) * (1 - tier * 0.3);
          dummy.position.set(x, tierH + tierHt*0.5, zz);
          dummy.scale.set(tierR, tierHt, tierR);
          dummy.updateMatrix();
          if (rng() < 0.55 && i1 < cones1.count) cones1.setMatrixAt(i1++, dummy.matrix);
          else if (i2 < cones2.count)              cones2.setMatrixAt(i2++, dummy.matrix);
        }
      }
    }
    cones1.count = i1; cones2.count = i2;
    [trunks,cones1,cones2].forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  // ── PAPPELN (hoch und schlank, typisch entlang Feldwegen) ─────────────────
  _buildPoplarRows() {
    const rng    = seededRng(4680);
    const dummy  = new THREE.Object3D();
    const COUNT  = 60;

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 1 });
    const leafMat  = new THREE.MeshStandardMaterial({ color: 0x2d5c12, roughness: 1 });

    const trunks = iMesh(new THREE.CylinderGeometry(0.28, 0.40, 1, 5), trunkMat, COUNT, this.scene);
    const crowns = iMesh(new THREE.CylinderGeometry(0.8, 1.4, 1, 6), leafMat, COUNT, this.scene); // säulenartig

    // Feldreihen: links und rechts des Flusses
    for (let i = 0; i < COUNT; i++) {
      const side = i < COUNT/2 ? -1 : 1;
      const z    = -1500 + (i % (COUNT/2)) * 58 + rng() * 12;
      const x    = (280 + rng() * 200) * side;
      const h    = 16 + rng() * 8;

      dummy.position.set(x, h*0.5, z);
      dummy.scale.set(0.65, h, 0.65);
      dummy.rotation.set(0, rng()*Math.PI*2, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, h*0.55, z);
      dummy.scale.set(1.0, h*0.6, 1.0); // schmal
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    }
    [trunks, crowns].forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  // ── WEIDEN AM UFER (hängende Krone) ──────────────────────────────────────
  _buildWillowsRiver() {
    const rng    = seededRng(555);
    const dummy  = new THREE.Object3D();
    const COUNT  = 70;

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1 });
    const leafMat  = new THREE.MeshStandardMaterial({ color: 0x3a6c10, roughness: 1 });

    const trunks = iMesh(new THREE.CylinderGeometry(0.4, 0.65, 1, 5), trunkMat, COUNT, this.scene);
    const crowns = iMesh(new THREE.SphereGeometry(1, 7, 5), leafMat, COUNT, this.scene);

    for (let i = 0; i < COUNT; i++) {
      const side = i < COUNT/2 ? -1 : 1;
      const z    = -1900 + (i % (COUNT/2)) * 56 + rng() * 20;
      const x    = (215 + rng() * 60) * side;
      const h    = 7 + rng() * 6;
      const cr   = 4 + rng() * 3;

      dummy.position.set(x, h*0.5+0.5, z);
      dummy.scale.set(0.8, h, 0.8);
      dummy.rotation.set(0, rng()*Math.PI*2, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      // Krone tief hängend (y etwas unter Baum-Top)
      dummy.position.set(x, h + cr*0.2, z);
      dummy.scale.set(cr, cr*0.65, cr); // abgeflacht, hängend
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    }
    [trunks, crowns].forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  // ── SCHILF AM UFER ────────────────────────────────────────────────────────
  _buildReeds() {
    const COUNT  = 600;
    const dummy  = new THREE.Object3D();
    const rng    = seededRng(777);

    const reedMat  = new THREE.MeshStandardMaterial({ color: 0x8a9838, roughness: 1 });
    const reedMat2 = new THREE.MeshStandardMaterial({ color: 0x6a7828, roughness: 1 });
    const reedGeo  = new THREE.CylinderGeometry(0.06, 0.10, 2.2, 4);

    const reeds  = iMesh(reedGeo, reedMat,  Math.ceil(COUNT*0.6), this.scene);
    const reeds2 = iMesh(reedGeo, reedMat2, Math.ceil(COUNT*0.4), this.scene);

    let i1=0, i2=0;
    for (let i = 0; i < COUNT; i++) {
      // Uferbereich: x nahe ±215
      const side  = rng() < 0.5 ? -1 : 1;
      const x     = (188 + rng() * 40) * side;
      const z     = (rng() - 0.5) * 4000;
      const h     = 0.5 + rng() * 0.8;
      dummy.position.set(x, 1.1 * h, z);
      dummy.rotation.set((rng()-0.5)*0.4, rng()*Math.PI*2, (rng()-0.5)*0.35);
      dummy.scale.setScalar(h);
      dummy.updateMatrix();
      if (rng() < 0.6 && i1 < reeds.count)  reeds.setMatrixAt(i1++, dummy.matrix);
      else if (i2 < reeds2.count)            reeds2.setMatrixAt(i2++, dummy.matrix);
    }
    reeds.count = i1; reeds2.count = i2;
    [reeds, reeds2].forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  // ── BÜSCHE (verschiedene Größen und Grüntöne) ─────────────────────────────
  _buildBushes() {
    const COUNT = 280;
    const dummy = new THREE.Object3D();
    const rng   = seededRng(999);

    const mats = [
      new THREE.MeshStandardMaterial({ color: 0x2f5c1a, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x3a6820, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x254e14, roughness: 1 }),
    ];
    const geo = new THREE.SphereGeometry(1, 6, 4);

    for (let mi = 0; mi < 3; mi++) {
      const n = Math.ceil(COUNT / 3);
      const im = iMesh(geo, mats[mi], n, this.scene);
      let idx = 0;
      for (let i = 0; i < n; i++) {
        const side = rng() < 0.5 ? -1 : 1;
        const x    = (230 + rng() * 500) * side;
        const z    = (rng() - 0.5) * 4000;
        const s    = 1.2 + rng() * 2.2;
        dummy.position.set(x, s*0.45+0.1, z);
        dummy.scale.set(s, s*0.72, s);
        dummy.rotation.set(0, rng()*Math.PI*2, 0);
        dummy.updateMatrix();
        im.setMatrixAt(idx++, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  // ── RAPSFELDER (leuchtend gelb — typisch europäisch) ──────────────────────
  _buildRapseedFields() {
    const ZONES = [
      { cx:  1500, cz:  250, w: 520, d: 700 },
      { cx: -1450, cz: -800, w: 460, d: 550 },
      { cx:  1700, cz: 1100, w: 380, d: 420 },
    ];

    const rapsMat  = new THREE.MeshStandardMaterial({ color: 0xf5d800, roughness: 1 }); // leuchtend gelb
    const rapsRow  = new THREE.MeshStandardMaterial({ color: 0xd8b800, roughness: 1 }); // Zwischenreihen
    const edgeMat  = new THREE.MeshStandardMaterial({ color: 0x3a5a1a, roughness: 1 }); // Randstreifen grün

    for (const z of ZONES) {
      // Hauptfläche
      const geo = new THREE.PlaneGeometry(z.w, z.d);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, rapsMat);
      m.position.set(z.cx, 0.08, z.cz);
      m.receiveShadow = true;
      this.scene.add(m);

      // Reihenstreifen (etwas dunkler)
      for (let i = -z.w/2 + 18; i < z.w/2; i += 28) {
        const lGeo = new THREE.PlaneGeometry(2.5, z.d);
        lGeo.rotateX(-Math.PI / 2);
        const lm = new THREE.Mesh(lGeo, rapsRow);
        lm.position.set(z.cx + i, 0.10, z.cz);
        this.scene.add(lm);
      }

      // Grüner Rand
      const b1 = new THREE.Mesh(new THREE.PlaneGeometry(z.w + 20, 8).rotateX(-Math.PI/2), edgeMat);
      b1.position.set(z.cx, 0.07, z.cz - z.d/2 - 4);
      this.scene.add(b1);
      const b2 = b1.clone();
      b2.position.z = z.cz + z.d/2 + 4;
      this.scene.add(b2);
    }
  }

  // ── WEIZENFELDER (goldgelb, typisches Sommer-Europa) ─────────────────────
  _buildWheatFields() {
    const ZONES = [
      { cx:  1600, cz: -400, w: 480, d: 580 },
      { cx: -1550, cz:  500, w: 440, d: 520 },
      { cx: -1650, cz:-1200, w: 360, d: 400 },
    ];

    const wheatMat = new THREE.MeshStandardMaterial({ color: 0xc8a030, roughness: 1 }); // reifes Getreide
    const rowMat   = new THREE.MeshStandardMaterial({ color: 0xa88020, roughness: 1 }); // Ährenreihen
    const stubble  = new THREE.MeshStandardMaterial({ color: 0xb89040, roughness: 1 }); // Stoppelstreifen

    for (const z of ZONES) {
      const geo = new THREE.PlaneGeometry(z.w, z.d);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, wheatMat);
      m.position.set(z.cx, 0.08, z.cz);
      m.receiveShadow = true;
      this.scene.add(m);

      // Getreide-Reihen
      for (let i = -z.d/2 + 15; i < z.d/2; i += 18) {
        const lGeo = new THREE.PlaneGeometry(z.w, 2);
        lGeo.rotateX(-Math.PI / 2);
        const lm = new THREE.Mesh(lGeo, rowMat);
        lm.position.set(z.cx, 0.10, z.cz + i);
        this.scene.add(lm);
      }

      // Fahrspur
      for (const xOff of [-z.w*0.25, z.w*0.25]) {
        const spGeo = new THREE.PlaneGeometry(3, z.d);
        spGeo.rotateX(-Math.PI / 2);
        const sp = new THREE.Mesh(spGeo, new THREE.MeshStandardMaterial({ color: 0x6a5818, roughness: 1 }));
        sp.position.set(z.cx + xOff, 0.09, z.cz);
        this.scene.add(sp);
      }
    }
  }

  // ── GEMISCHTE FELDER (frisch gepflügt, Mais, Grünland) ───────────────────
  _buildMixedFields() {
    const fields = [
      { cx: -1600, cz:  -50, w: 400, d: 480, color: 0x3a2510, label:'pflug' }, // gepflügt
      { cx:  1580, cz:  900, w: 360, d: 440, color: 0x2e5c14, label:'mais'  }, // Mais
      { cx: -1700, cz: 1300, w: 420, d: 380, color: 0x508a20, label:'gruen' }, // Grünland
      { cx:  1400, cz:-1100, w: 340, d: 460, color: 0x8a7030, label:'gerst' }, // Gerste
    ];

    for (const f of fields) {
      const mat = new THREE.MeshStandardMaterial({ color: f.color, roughness: 1 });
      const geo = new THREE.PlaneGeometry(f.w, f.d);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(f.cx, 0.06, f.cz);
      m.receiveShadow = true;
      this.scene.add(m);

      // Feldlinien
      if (f.label === 'pflug') {
        // Pflugstreifen (dunkle Furchen)
        const furrowMat = new THREE.MeshStandardMaterial({ color: 0x231608, roughness: 1 });
        for (let i = -f.d/2 + 12; i < f.d/2; i += 15) {
          const fGeo = new THREE.PlaneGeometry(f.w, 1.5);
          fGeo.rotateX(-Math.PI / 2);
          const fm = new THREE.Mesh(fGeo, furrowMat);
          fm.position.set(f.cx, 0.08, f.cz + i);
          this.scene.add(fm);
        }
      }
      if (f.label === 'mais') {
        // Maisreihen (dunkelgrüne Streifen)
        const maisRow = new THREE.MeshStandardMaterial({ color: 0x1e4008, roughness: 1 });
        for (let i = -f.w/2 + 14; i < f.w/2; i += 20) {
          const mGeo = new THREE.PlaneGeometry(3, f.d);
          mGeo.rotateX(-Math.PI / 2);
          const mm = new THREE.Mesh(mGeo, maisRow);
          mm.position.set(f.cx + i, 0.09, f.cz);
          this.scene.add(mm);
        }
      }
    }
  }

  // ── OBSTGÄRTEN / BAUMREIHEN DÖRFER ────────────────────────────────────────
  _buildOrchards() {
    const rng   = seededRng(7890);
    const dummy = new THREE.Object3D();
    const COUNT = 45;

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1 });
    const leafMat  = new THREE.MeshStandardMaterial({ color: 0x306018, roughness: 1 });

    const trunks = iMesh(new THREE.CylinderGeometry(0.22, 0.32, 1, 5), trunkMat, COUNT, this.scene);
    const crowns = iMesh(new THREE.SphereGeometry(1, 6, 5), leafMat, COUNT, this.scene);

    // Obstgarten bei Stadthafen und Nordheim-Dorf
    const POSITIONS = [
      [650, 800], [680, 830], [710, 800], [680, 770],
      [650, 860], [710, 860], [740, 800], [650, 740],
      [-680,-1550],[-710,-1580],[-680,-1610],[-650,-1550],
    ];

    for (let i = 0; i < Math.min(COUNT, POSITIONS.length + 20); i++) {
      let x, z;
      if (i < POSITIONS.length) {
        x = POSITIONS[i][0] + rng()*10-5;
        z = POSITIONS[i][1] + rng()*10-5;
      } else {
        x = 550 + rng()*300;
        z = 700 + rng()*400;
      }
      const h = 4 + rng() * 3;
      const cr = 2 + rng() * 1.5;

      dummy.position.set(x, h*0.5, z);
      dummy.scale.set(0.55, h, 0.55);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, h + cr*0.4, z);
      dummy.scale.setScalar(cr);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    }
    [trunks, crowns].forEach(m => m.instanceMatrix.needsUpdate = true);
  }
}
