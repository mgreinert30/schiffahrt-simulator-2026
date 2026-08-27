// Water — Animiertes Wasser mit Custom Vertex/Fragment Shader
import * as THREE from 'three';

const VERT = /* glsl */`
  uniform float uTime;
  varying float vElevation;
  varying vec2  vUv;

  void main() {
    vUv = uv;
    vec4 mPos = modelMatrix * vec4(position, 1.0);

    float w1 = sin(mPos.x * 0.007  + uTime * 0.38) * 1.8;
    float w2 = sin(mPos.z * 0.011  + uTime * 0.55) * 1.4;
    float w3 = sin((mPos.x + mPos.z) * 0.005 + uTime * 0.72) * 1.0;
    float w4 = sin(mPos.x * 0.022  - uTime * 0.9 ) * 0.4;
    float elev = w1 + w2 + w3 + w4;

    mPos.y += elev;
    vElevation = elev;

    gl_Position = projectionMatrix * viewMatrix * mPos;
  }
`;

const FRAG = /* glsl */`
  varying float vElevation;
  varying vec2  vUv;
  uniform float uTime;

  void main() {
    vec3 deep    = vec3(0.01, 0.09, 0.22);
    vec3 mid     = vec3(0.04, 0.28, 0.52);
    vec3 shallow = vec3(0.10, 0.48, 0.68);
    vec3 foam    = vec3(0.65, 0.85, 1.00);

    float norm = (vElevation + 4.6) / 9.2;
    vec3  col  = mix(deep, mid, smoothstep(0.0, 0.5, norm));
    col        = mix(col,  shallow, smoothstep(0.5, 0.75, norm));

    // Schaumkämme auf Wellenbergen
    float f = smoothstep(0.72, 0.88, norm);
    col = mix(col, foam, f * 0.55);

    // Glanzpunkt
    float shine = pow(max(0.0, norm - 0.6), 3.0) * 0.3;
    col += shine;

    gl_FragColor = vec4(col, 0.94);
  }
`;

export class Water {
  constructor(scene) {
    this._time = 0;

    const geo = new THREE.PlaneGeometry(8000, 8000, 160, 160);
    geo.rotateX(-Math.PI / 2);

    this._mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      side: THREE.FrontSide,
    });

    this.mesh = new THREE.Mesh(geo, this._mat);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Wasserboden (verhindert Durchsehen bei flachem Winkel)
    const floorGeo = new THREE.PlaneGeometry(8000, 8000);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x021020 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -6;
    scene.add(floor);
  }

  update(dt) {
    this._time += dt;
    this._mat.uniforms.uTime.value = this._time;
  }

  // Gibt die ungefähre Wellenhöhe an Position (x, z) zurück
  getHeightAt(x, z, time) {
    const t = time ?? this._time;
    const w1 = Math.sin(x * 0.007 + t * 0.38) * 1.8;
    const w2 = Math.sin(z * 0.011 + t * 0.55) * 1.4;
    const w3 = Math.sin((x + z) * 0.005 + t * 0.72) * 1.0;
    const w4 = Math.sin(x * 0.022 - t * 0.9) * 0.4;
    return w1 + w2 + w3 + w4;
  }
}
