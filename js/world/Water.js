// Water.js — Physikalisch korrekte Gerstner-Wellen + Fresnel-Reflexion
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(0.55, 0.82, -0.15).normalize();

// ── Vertex Shader ─────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  #define PI 3.14159265359

  uniform float uTime;
  uniform float uScale;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying float vFoamMask;

  // Gerstner wave: modifiziert p in-place, akkumuliert Tangente/Binormale
  vec3 gerstner(vec2 dir, float Q, float A, float waveLen, vec3 p, float t,
                inout vec3 tangent, inout vec3 binormal) {
    float k   = 2.0 * PI / waveLen;
    float w   = sqrt(9.81 * k);
    vec2  d   = normalize(dir);
    float phi = k * dot(d, p.xz) - w * t;
    float C   = cos(phi);
    float S   = sin(phi);
    float QA  = Q * A;

    tangent  += vec3(-QA*k*d.x*d.x*S,  QA*k*d.x*C, -QA*k*d.x*d.y*S);
    binormal += vec3(-QA*k*d.x*d.y*S,  QA*k*d.y*C, -QA*k*d.y*d.y*S);

    return vec3(QA * d.x * C, A * S, QA * d.y * C);
  }

  void main() {
    vec4 world4 = modelMatrix * vec4(position, 1.0);
    vec3 p      = world4.xyz;
    float t     = uTime * uScale;

    vec3 tangent  = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);

    // 6 überlagerte Wellen (dir, Steepness Q, Amplitude A, Wellenlänge)
    p += gerstner(vec2( 1.0,  0.2), 0.6, 0.55, 90.0,  p, t, tangent, binormal);
    p += gerstner(vec2( 0.5,  0.9), 0.5, 0.40, 58.0,  p, t, tangent, binormal);
    p += gerstner(vec2(-0.3,  1.0), 0.4, 0.28, 38.0,  p, t, tangent, binormal);
    p += gerstner(vec2( 0.9, -0.4), 0.3, 0.18, 24.0,  p, t, tangent, binormal);
    p += gerstner(vec2(-0.7,  0.5), 0.2, 0.10, 15.0,  p, t, tangent, binormal);
    p += gerstner(vec2( 0.4, -0.8), 0.2, 0.06, 9.0,   p, t, tangent, binormal);

    vec3 N  = normalize(cross(binormal, tangent));
    N.y     = abs(N.y); // Sicherheit: Normal immer nach oben

    vWorldPos = p;
    vNormal   = N;
    // Schaum-Maske: hohe Wellenberge = mehr Schaum
    vFoamMask = clamp((p.y - 0.4) * 0.7, 0.0, 1.0);

    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

// ── Fragment Shader ────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
  uniform vec3  uSunDir;
  uniform vec3  uSunColor;
  uniform vec3  uSkyZenith;
  uniform vec3  uSkyHorizon;
  uniform vec3  uCamPos;
  uniform float uTime;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying float vFoamMask;

  // Value noise (für Schaumtextur)
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),         hash(i + vec2(1,0)), f.x),
      mix(hash(i+vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y
    );
  }

  void main() {
    vec3 N  = normalize(vNormal);
    vec3 V  = normalize(uCamPos - vWorldPos);
    vec3 L  = normalize(uSunDir);
    vec3 H  = normalize(V + L);

    // ── Fresnel (Schlick) ──────────────────────────────────────────
    float cosV    = max(0.0, dot(N, V));
    float fresnel = 0.04 + 0.96 * pow(1.0 - cosV, 5.0);

    // ── Himmel-Reflexion ───────────────────────────────────────────
    vec3  R        = reflect(-V, N);
    float skyT     = clamp(R.y * 0.5 + 0.5, 0.0, 1.0);
    vec3  skyRef   = mix(uSkyHorizon, uSkyZenith, skyT);

    // ── Wasserfarbe (tiefenabhängig) ───────────────────────────────
    vec3 deepCol    = vec3(0.010, 0.065, 0.16);
    vec3 midCol     = vec3(0.030, 0.190, 0.38);
    vec3 shallowCol = vec3(0.055, 0.310, 0.52);
    float depth = clamp(vWorldPos.y * 0.18 + 0.5, 0.0, 1.0);
    vec3 waterCol   = mix(deepCol, mix(midCol, shallowCol, depth), depth);

    // ── Spekularlicht (Sonne) ──────────────────────────────────────
    float diff = max(0.0, dot(N, L));
    float spec = pow(max(0.0, dot(N, H)), 768.0) * 22.0;
    vec3 specCol = uSunColor * spec * (0.4 + diff * 0.6);

    // ── Schaum an Wellenkämmen ─────────────────────────────────────
    float n1   = vnoise(vWorldPos.xz * 0.045 + uTime * 0.012);
    float n2   = vnoise(vWorldPos.xz * 0.100 - uTime * 0.018);
    float foam = smoothstep(0.25, 0.85, vFoamMask + n1 * 0.35 + n2 * 0.15);
    vec3 foamCol = vec3(0.87, 0.93, 1.0);

    // ── Zusammensetzen ────────────────────────────────────────────
    vec3 col = mix(waterCol, skyRef, clamp(fresnel, 0.0, 0.94));
    col     += specCol;
    col      = mix(col, foamCol, foam * 0.60);

    // ── Atmosphärische Distanz ────────────────────────────────────
    float dist      = length(uCamPos.xz - vWorldPos.xz);
    float fogFactor = exp(-dist * 0.000075);
    vec3  fogColor  = mix(uSkyHorizon, uSkyZenith * 0.7, 0.25);
    col = mix(fogColor, col, fogFactor);

    gl_FragColor = vec4(col, 0.97);
  }
`;

export class Water {
  constructor(scene, quality = 'high') {
    this._time = 0;

    const segs  = quality === 'low' ? 80 : quality === 'medium' ? 160 : 256;
    const scale = quality === 'low' ? 0.65 : 1.0;

    const geo = new THREE.PlaneGeometry(8000, 8000, segs, segs);
    geo.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime:      { value: 0 },
      uScale:     { value: scale },
      uSunDir:    { value: SUN_DIR.clone() },
      uSunColor:  { value: new THREE.Vector3(1.0, 0.93, 0.78) },
      uSkyZenith: { value: new THREE.Vector3(0.08, 0.18, 0.50) },
      uSkyHorizon:{ value: new THREE.Vector3(0.50, 0.70, 0.88) },
      uCamPos:    { value: new THREE.Vector3() },
    };

    this._mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       this.uniforms,
      transparent:    true,
    });

    this.mesh = new THREE.Mesh(geo, this._mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Meeresgrund
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x010a14 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), floorMat);
    floor.rotateX(-Math.PI / 2);
    floor.position.y = -10;
    scene.add(floor);
  }

  update(dt, camera) {
    this._time += dt;
    this.uniforms.uTime.value = this._time;
    if (camera) this.uniforms.uCamPos.value.copy(camera.position);
  }

  setSkyColors(zenith, horizon) {
    this.uniforms.uSkyZenith.value.set(zenith.r, zenith.g, zenith.b);
    this.uniforms.uSkyHorizon.value.set(horizon.r, horizon.g, horizon.b);
  }
}
