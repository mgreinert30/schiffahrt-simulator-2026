// CameraController — 4 Kameraperspektiven, sanftes Lerpen
import * as THREE from 'three';

const MODES = [
  { name: 'Verfolgung',   label: 'CAM: Verfolgung' },
  { name: 'Brücke',       label: 'CAM: Brücke' },
  { name: 'Weitwinkel',   label: 'CAM: Weitwinkel' },
  { name: 'Bug-Kamera',   label: 'CAM: Bug' },
];

export class CameraController {
  constructor(camera) {
    this.camera     = camera;
    this._modeIdx   = 0;
    this._curPos    = new THREE.Vector3(0, 60, 200);
    this._curLook   = new THREE.Vector3();
    this._lerpPos   = 0.07;
    this._lerpLook  = 0.10;

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyC') this._nextMode();
    });
  }

  _nextMode() {
    this._modeIdx = (this._modeIdx + 1) % MODES.length;
  }

  get modeLabel() { return MODES[this._modeIdx].label; }

  update(dt, ship) {
    if (!ship) return;
    const pos = ship.position;
    const rot = ship.rotation.y;
    const sin = Math.sin(rot), cos = Math.cos(rot);

    let tPos = new THREE.Vector3();
    let tLook = new THREE.Vector3();

    switch (this._modeIdx) {
      case 0: {  // Verfolgerkamera (Third Person, leicht erhöht)
        tPos.set(pos.x + sin * 65, pos.y + 24, pos.z + cos * 65);
        tLook.set(pos.x - sin * 5, pos.y + 4, pos.z - cos * 5);
        break;
      }
      case 1: {  // Brücke (First Person auf der Brücke)
        const fwdX = -sin * 8, fwdZ = -cos * 8;
        tPos.set(pos.x + fwdX, pos.y + 11, pos.z + fwdZ);
        tLook.set(pos.x - sin * 400, pos.y + 9, pos.z - cos * 400);
        break;
      }
      case 2: {  // Weitwinkel (hohe Außenansicht)
        tPos.set(pos.x + sin * 120, pos.y + 55, pos.z + cos * 120);
        tLook.set(pos.x, pos.y, pos.z);
        break;
      }
      case 3: {  // Bug-Kamera (von vorne schauend)
        const bugX = -sin * 13, bugZ = -cos * 13;
        tPos.set(pos.x + bugX, pos.y + 7, pos.z + bugZ);
        tLook.set(pos.x + bugX * 0.5 - sin * 80, pos.y + 5, pos.z + bugZ * 0.5 - cos * 80);
        break;
      }
    }

    // Mindesthöhe: Kamera niemals unter Wasser
    tPos.y = Math.max(2.5, tPos.y);

    const lp = 1 - Math.pow(1 - this._lerpPos,  dt * 60);
    const ll = 1 - Math.pow(1 - this._lerpLook, dt * 60);
    this._curPos.lerp(tPos, lp);
    this._curLook.lerp(tLook, ll);

    this.camera.position.copy(this._curPos);
    this.camera.lookAt(this._curLook);
  }
}
