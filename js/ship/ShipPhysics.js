// ShipPhysics — Schiffsphysik-Simulation
// Realistische Trägheit: langsame Beschleunigung, langer Bremsweg, windabhängiges Handling

export class ShipPhysics {
  constructor(config = {}) {
    // Fahrzeug-Parameter (Level-1-Frachtschiff)
    this.maxSpeed       = config.maxSpeed      ?? 6.5;   // m/s vorwärts (~12 kn)
    this.maxReverse     = config.maxReverse    ?? 2.0;   // m/s rückwärts
    this.acceleration   = config.acceleration  ?? 1.8;   // m/s²
    this.deceleration   = config.deceleration  ?? 0.9;   // m/s² (eigene Bremsung)
    this.dragLinear     = config.dragLinear    ?? 0.55;  // Wasserwiderstand
    this.dragAngular    = config.dragAngular   ?? 3.5;   // Ruder-Dämpfung
    this.maxTurnRate    = config.maxTurnRate   ?? 0.55;  // rad/s bei Langsamfahrt
    this.turnSpeedScale = config.turnSpeedScale ?? 0.6;  // Wendeeffizienz bei Hochgeschwindigkeit

    // Zustand
    this.speed          = 0;   // m/s (positiv = vorwärts)
    this.angularSpeed   = 0;   // rad/s (positiv = links / CCW)
    this.heading        = 0;   // rad (world space rotation.y)

    // Eingaben (werden von ShipController gesetzt)
    this.throttle       = 0;   // -1 .. +1
    this.rudder         = 0;   // -1 (rechts) .. +1 (links)

    // Position (wird in main.js auf die Ship-Gruppe übertragen)
    this.x = 0;
    this.z = 0;

    // Treibstoff (0-100)
    this.fuel = 100;
    this.fuelConsumption = config.fuelConsumption ?? 0.004; // % pro Sekunde bei Volllast

    // Schiffsschaden (0-100, 0=kein Schaden)
    this.damage = 0;
  }

  update(dt) {
    const absFuel = this.fuel > 0;

    // --- Längsgeschwindigkeit ---
    if (this.throttle > 0 && absFuel) {
      this.speed += this.throttle * this.acceleration * dt;
    } else if (this.throttle < 0 && absFuel) {
      // Rückwärts: langsamere Beschleunigung
      this.speed += this.throttle * this.deceleration * dt;
    }

    // Wasserwiderstand
    this.speed -= this.speed * this.dragLinear * dt;

    // Geschwindigkeitsgrenzen
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));

    // Sehr kleine Geschwindigkeit auf Null setzen
    if (Math.abs(this.speed) < 0.01) this.speed = 0;

    // --- Winkelgeschwindigkeit (Ruder) ---
    // Wendeeffizienz steigt mit Fahrtgeschwindigkeit (kaum Wenden im Stand)
    const speedFactor = Math.min(1, Math.abs(this.speed) / (this.maxSpeed * 0.5));
    const effectiveTurnRate = this.maxTurnRate * (0.15 + speedFactor * this.turnSpeedScale);

    if (this.rudder !== 0) {
      this.angularSpeed += this.rudder * effectiveTurnRate * dt * 3;
    }

    // Ruder-Dämpfung
    this.angularSpeed -= this.angularSpeed * this.dragAngular * dt;
    if (Math.abs(this.angularSpeed) < 0.0005) this.angularSpeed = 0;

    // Kurs aktualisieren
    this.heading += this.angularSpeed * dt;

    // Position aktualisieren (Three.js: vorwärts = -Z bei heading=0)
    this.x -= Math.sin(this.heading) * this.speed * dt;
    this.z -= Math.cos(this.heading) * this.speed * dt;

    // Treibstoffverbrauch (proportional zum Motoranteil)
    if (absFuel && this.throttle !== 0) {
      this.fuel -= Math.abs(this.throttle) * this.fuelConsumption * dt;
      this.fuel = Math.max(0, this.fuel);
    }
  }

  // Geschwindigkeit in Knoten
  get speedKnots() {
    return this.speed * 1.94384;
  }

  // Kursrichtung als Kompass-Buchstabe
  get compassHeading() {
    const h = ((this.heading * 180 / Math.PI) % 360 + 360) % 360;
    const dirs = ['N','NO','O','SO','S','SW','W','NW','N'];
    return dirs[Math.round(h / 45) % 8];
  }

  // Kollisionsschaden
  applyCollision(force) {
    this.damage = Math.min(100, this.damage + force * 10);
    this.speed *= 0.2;
    this.angularSpeed *= 0.3;
  }
}
