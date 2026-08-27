// PostProcessing.js — EffectComposer: Bloom + Color-Grading + Vignette
import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';

// Farbkorrektur + Vignette als Custom-ShaderPass
const COLOR_GRADE = {
  uniforms: {
    tDiffuse:    { value: null },
    uContrast:   { value: 1.05 },
    uSaturation: { value: 1.10 },
    uBrightness: { value: 0.02 },
    uVignette:   { value: 0.30 },
    uWarmth:     { value: 0.04 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uBrightness;
    uniform float uVignette;
    uniform float uWarmth;
    varying vec2 vUv;

    vec3 adjustSaturation(vec3 c, float s) {
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(lum), c, s);
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;

      // Helligkeit + Kontrast
      col = (col - 0.5) * uContrast + 0.5 + uBrightness;
      // Sättigung
      col = adjustSaturation(col, uSaturation);
      // Wärme (leicht gelblich-golden)
      col.r += uWarmth;
      col.g += uWarmth * 0.5;
      // Vignette
      vec2 uv2  = vUv - 0.5;
      float vig = 1.0 - dot(uv2, uv2) * uVignette * 2.2;
      col *= clamp(vig, 0.0, 1.0);
      // Tone-Clip
      col = clamp(col, 0.0, 1.0);

      gl_FragColor = vec4(col, tex.a);
    }
  `,
};

export class PostProcessing {
  constructor(renderer, scene, camera, quality = 'medium') {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // Bloom nur ab Medium
    if (quality !== 'low') {
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.10,   // strength  — sehr subtil
        0.45,   // radius
        0.82,   // threshold
      );
      this.composer.addPass(bloom);
    }

    const colorPass = new ShaderPass(COLOR_GRADE);
    colorPass.renderToScreen = true;
    this.composer.addPass(colorPass);

    this._colorPass = colorPass;
  }

  render() { this.composer.render(); }

  setSize(w, h) { this.composer.setSize(w, h); }

  // Abend-Stimmung: wärmer, roter
  setEvening() {
    this._colorPass.uniforms.uWarmth.value     = 0.10;
    this._colorPass.uniforms.uSaturation.value = 1.15;
  }
  setDay() {
    this._colorPass.uniforms.uWarmth.value     = 0.03;
    this._colorPass.uniforms.uSaturation.value = 1.08;
  }
}
