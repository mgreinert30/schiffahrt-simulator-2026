// Sky.js — Atmosphärischer Himmelsdome mit Mie-Streuung und Sonnenscheibe
import * as THREE from 'three';
import { SUN_DIR } from './Water.js';

const VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vec4 wPos = modelMatrix * vec4(position, 1.0);
    vDir = normalize(wPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform vec3  uSunDir;
  uniform vec3  uZenith;
  uniform vec3  uHorizon;
  uniform vec3  uGround;
  uniform float uSunStrength;

  varying vec3 vDir;

  // Vereinfachte Mie-Streuung für Sonnenhalo
  float mie(float cosA, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * 3.14159 * pow(max(0.0, 1.0 + g2 - 2.0*g*cosA), 1.5));
  }

  void main() {
    vec3  d   = normalize(vDir);
    float elv = d.y;

    // Himmelsfarbe (Zenit → Horizont)
    float t   = pow(clamp(elv, 0.0, 1.0), 0.55);
    vec3  sky = mix(uHorizon, uZenith, t);

    // Horizontdunst
    float haze = exp(-abs(elv) * 6.0) * 0.45;
    sky += vec3(0.75, 0.82, 0.92) * haze;

    // Unterhalb des Horizonts: Erde/Nebel
    if (elv < 0.0) {
      float g = clamp(-elv * 12.0, 0.0, 1.0);
      sky = mix(sky, uGround, g);
    }

    // Sonne
    float cosA     = dot(d, normalize(uSunDir));
    float sunDisk  = smoothstep(0.9994, 1.0, cosA) * 4.0 * uSunStrength;
    float sunGlow  = mie(cosA, 0.80) * 0.018 * uSunStrength;
    float sunHalo  = pow(max(0.0, cosA), 6.0) * 0.15 * uSunStrength;

    vec3 sunColor  = vec3(1.0, 0.95, 0.78);
    sky += sunColor * sunDisk;
    sky += vec3(1.0, 0.75, 0.40) * sunGlow;
    sky += vec3(1.0, 0.82, 0.60) * sunHalo;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export class Sky {
  constructor(scene) {
    this.uniforms = {
      uSunDir:     { value: SUN_DIR.clone() },
      uZenith:     { value: new THREE.Color(0.08, 0.18, 0.50) },
      uHorizon:    { value: new THREE.Color(0.50, 0.70, 0.88) },
      uGround:     { value: new THREE.Color(0.30, 0.40, 0.22) },
      uSunStrength:{ value: 1.0 },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       this.uniforms,
      side:           THREE.BackSide,
      depthWrite:     false,
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(5800, 32, 16), mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  get zenith()  { return this.uniforms.uZenith.value;  }
  get horizon() { return this.uniforms.uHorizon.value; }

  // Setzt Tageszeit-Farben (0=Nacht, 1=Mittag)
  setDaytime(t) {
    const night  = new THREE.Color(0.01, 0.02, 0.08);
    const dawn   = new THREE.Color(0.65, 0.35, 0.18);
    const day    = new THREE.Color(0.08, 0.18, 0.50);
    const nightH = new THREE.Color(0.02, 0.05, 0.12);
    const dawnH  = new THREE.Color(0.80, 0.55, 0.30);
    const dayH   = new THREE.Color(0.50, 0.70, 0.88);

    let zenith, horizon;
    if (t < 0.25) {
      const s = t / 0.25;
      zenith  = night.clone().lerp(dawn, s);
      horizon = nightH.clone().lerp(dawnH, s);
    } else if (t < 0.5) {
      const s = (t - 0.25) / 0.25;
      zenith  = dawn.clone().lerp(day, s);
      horizon = dawnH.clone().lerp(dayH, s);
    } else {
      zenith  = day.clone();
      horizon = dayH.clone();
    }

    this.uniforms.uZenith.value.copy(zenith);
    this.uniforms.uHorizon.value.copy(horizon);
    this.uniforms.uSunStrength.value = t > 0.1 ? 1.0 : t * 10;
  }
}
