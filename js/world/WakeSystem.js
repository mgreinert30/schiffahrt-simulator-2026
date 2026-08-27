// WakeSystem — Kielwasser und Bugwelle hinter dem Schiff
import * as THREE from 'three';

const WAKE_VERT = /* glsl */`
  attribute float aAlpha;
  attribute float aWidth;
  varying   float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WAKE_FRAG = /* glsl */`
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(0.82, 0.92, 1.0, vAlpha * 0.38);
  }
`;

export class WakeSystem {
  constructor(scene) {
    this._trail   = [];
    this._maxLen  = 100;
    this._tick    = 0;
    this._INTERVAL = 0.08; // Sekunden zwischen Trail-Punkten

    const MAX_VERTS = this._maxLen * 2;

    this._posArr   = new Float32Array(MAX_VERTS * 3);
    this._alphaArr = new Float32Array(MAX_VERTS);

    const geo = new THREE.BufferGeometry();
    this._posBuf   = new THREE.BufferAttribute(this._posArr,   3);
    this._alphaBuf = new THREE.BufferAttribute(this._alphaArr, 1);
    geo.setAttribute('position', this._posBuf);
    geo.setAttribute('aAlpha',   this._alphaBuf);

    // Dreiecksindizes: je 2 Vertices → 2 Dreiecke pro Segment
    const idx = [];
    for (let i = 0; i < (this._maxLen - 1) * 2; i += 2) {
      idx.push(i, i+2, i+1,  i+1, i+2, i+3);
    }
    geo.setIndex(idx);

    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader:   WAKE_VERT,
      fragmentShader: WAKE_FRAG,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Bugwellen-Sprite (V-förmig)
    this._buildBowWave(scene);
  }

  _buildBowWave(scene) {
    // Statische V-Form, wird mit Schiff mitbewegt
    const pts = [];
    const N   = 16;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(new THREE.Vector3(-14 * t, 0.4, -12 * t));
      pts.push(new THREE.Vector3( 14 * t, 0.4, -12 * t));
    }
    const bowGeo  = new THREE.BufferGeometry().setFromPoints(pts);
    this.bowMesh  = new THREE.LineSegments(bowGeo,
      new THREE.LineBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.5 }));
    scene.add(this.bowMesh);
  }

  update(dt, ship, speed) {
    // Bugwelle mit Schiff mitbewegen
    this.bowMesh.position.copy(ship.position);
    this.bowMesh.rotation.copy(ship.rotation);
    this.bowMesh.visible = Math.abs(speed) > 0.5;

    // Kielwasser-Trail nur bei Fahrt
    this._tick += dt;
    if (this._tick >= this._INTERVAL && Math.abs(speed) > 0.3) {
      this._tick = 0;
      this._trail.unshift({
        x: ship.position.x,
        z: ship.position.z,
        angle: ship.rotation.y,
        spd: Math.abs(speed),
      });
      if (this._trail.length > this._maxLen) this._trail.pop();
    }

    this._updateGeometry();
  }

  _updateGeometry() {
    const tr = this._trail;
    const n  = tr.length;

    for (let i = 0; i < n; i++) {
      const p     = tr[i];
      const fade  = Math.pow(1.0 - i / this._maxLen, 1.4);
      const width = 8 + (i / n) * 14;
      const sina  = Math.sin(p.angle);
      const cosa  = Math.cos(p.angle);
      // Seitenversatz quer zur Fahrtrichtung
      const sx = cosa * width;
      const sz = -sina * width;
      const vi = i * 2;

      this._posArr[vi*3    ] = p.x - sx;
      this._posArr[vi*3 + 1] = 0.25;
      this._posArr[vi*3 + 2] = p.z - sz;
      this._posArr[(vi+1)*3    ] = p.x + sx;
      this._posArr[(vi+1)*3 + 1] = 0.25;
      this._posArr[(vi+1)*3 + 2] = p.z + sz;
      this._alphaArr[vi]   = fade;
      this._alphaArr[vi+1] = fade;
    }
    // Leere Vertices verstecken
    for (let i = n * 2; i < this._maxLen * 2; i++) {
      this._posArr[i*3]   = 0;
      this._posArr[i*3+1] = -50;
      this._posArr[i*3+2] = 0;
      this._alphaArr[i]   = 0;
    }
    this._posBuf.needsUpdate   = true;
    this._alphaBuf.needsUpdate = true;
  }
}
