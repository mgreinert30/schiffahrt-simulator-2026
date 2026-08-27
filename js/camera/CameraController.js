// CameraController — Kameraperspektiven und sanftes Folgen
import * as THREE from 'three';

export const CAM_MODES = ['follow', 'bridge', 'side', 'top'];

export class CameraController {
  constructor(camera) {
    this.camera  = camera;
    this.mode    = 0; // Index in CAM_MODES
    this._target = new THREE.Vector3();
    this._pos    = new THREE.Vector3();

    // Für sanftes Lerpen
    this._lerpPos = 0.06;
    this._lerpLook = 0.08;

    // Aktuelle Kameraposition (sanft interpoliert)
    this._currentPos  = new THREE.Vector3(0, 60, 200);
    this._currentLook = new THREE.Vector3(0, 0, 0);

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyC') this.nextMode();
    });
  }

  nextMode() {
    this.mode = (this.mode + 1) % CAM_MODES.length;
  }

  get modeName() { return CAM_MODES[this.mode]; }

  update(dt, ship) {
    if (!ship) return;

    const shipPos = ship.position;
    const rot     = ship.rotation.y;

    let targetPos  = new THREE.Vector3();
    let lookAt     = new THREE.Vector3();

    switch (CAM_MODES[this.mode]) {
      case 'follow': {
        // Third-Person-Verfolgerkamera, schaut über das Heck
        const back = new THREE.Vector3(Math.sin(rot) * 60, 22, Math.cos(rot) * 60);
        targetPos.copy(shipPos).add(back);
        targetPos.y = 22;
        lookAt.copy(shipPos).add(new THREE.Vector3(0, 4, 0));
        break;
      }
      case 'bridge': {
        // Brücken-Perspektive (First Person)
        const fwd = new THREE.Vector3(-Math.sin(rot) * 10, 10, -Math.cos(rot) * 10);
        targetPos.copy(shipPos).add(fwd);
        targetPos.y = shipPos.y + 11;
        lookAt.copy(shipPos).add(new THREE.Vector3(-Math.sin(rot) * 200, 8, -Math.cos(rot) * 200));
        break;
      }
      case 'side': {
        // Seitenansicht
        targetPos.set(shipPos.x + 80, shipPos.y + 30, shipPos.z);
        lookAt.copy(shipPos);
        break;
      }
      case 'top': {
        // Vogelperspektive
        targetPos.set(shipPos.x, shipPos.y + 180, shipPos.z + 30);
        lookAt.copy(shipPos);
        break;
      }
    }

    // Sanftes Interpolieren (Lerp)
    const lp = 1 - Math.pow(1 - this._lerpPos,  dt * 60);
    const ll = 1 - Math.pow(1 - this._lerpLook, dt * 60);

    this._currentPos.lerp(targetPos,  lp);
    this._currentLook.lerp(lookAt, ll);

    this.camera.position.copy(this._currentPos);
    this.camera.lookAt(this._currentLook);
  }
}
