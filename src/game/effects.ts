import Phaser from "phaser";
import { reduceMotion } from "@/motion";

/** Ambient-effect helpers shared by illustrated worlds (see World1Scene / World2Scene). */
type Zone = Phaser.Geom.Rectangle | { x: number; y: number }[];
type Cfg = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

/** Rising sparks: the default look for crystals, embers and torch smoke. */
export const RISE: Cfg = { speedY: { min: -40, max: -18 }, lifespan: 1800, frequency: 240, scale: { start: 1.6, end: 0 } };
/** Slow drifting motes: fireflies. */
export const DRIFT: Cfg = { speed: { min: 6, max: 18 }, angle: { min: 0, max: 360 }, lifespan: 3200, frequency: 380, scale: { start: 1.6, end: 0.4 } };
/** Stationary twinkle: glints on water. */
export const GLINT: Cfg = { lifespan: 1000, frequency: 110, scale: { start: 1.4, end: 0 } };

const source = (zone: Zone): Cfg["emitZone"] =>
  Array.isArray(zone)
    ? { type: "random", source: { getRandomPoint: (v: Phaser.Types.Math.Vector2Like) => Object.assign(v, Phaser.Utils.Array.GetRandom(zone)) } }
    : { type: "random", source: zone, quantity: 1 };

/** Additive pulsing halo. */
export function glow(scene: Phaser.Scene, x: number, y: number, tint: number, scale: number, ms = 1600): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, "glow").setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setScale(scale);
  scene.tweens.add({ targets: img, alpha: { from: 0.35, to: 0.9 }, scale: { from: scale * 0.9, to: scale * 1.1 }, duration: ms, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  return img;
}

/** Tiny additive sparks spawned inside a rectangle or at any of a list of points. */
export function sparks(scene: Phaser.Scene, zone: Zone, tint: number, cfg: Cfg = RISE): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(0, 0, "spark", { alpha: { start: 0.9, end: 0 }, blendMode: "ADD", tint, emitZone: source(zone), ...cfg });
}

/** Soft additive haze (waterfall spray, chasm mist). */
export function mist(scene: Phaser.Scene, rect: Phaser.Geom.Rectangle, tint = 0xffffff, alpha = 0.3): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(0, 0, "glow", {
    emitZone: source(rect),
    speedY: { min: -18, max: -6 },
    lifespan: 1800,
    frequency: 220,
    scale: { start: 0.35, end: 1.0 },
    alpha: { start: alpha, end: 0 },
    tint,
    blendMode: "ADD",
  });
}

/** Flickering flame halo. */
export function torch(scene: Phaser.Scene, x: number, y: number): void {
  const flame = scene.add.image(x, y, "glow").setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa030).setScale(1.1);
  scene.tweens.add({
    targets: flame,
    alpha: { from: 0.5, to: 1 },
    scale: { from: 0.9, to: 1.2 },
    duration: 220 + Math.random() * 120,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
}

/** Rotating rune circle on the ground — Byte's arrival point. Also hides any patch painted out of the mockup. */
export function summoningCircle(scene: Phaser.Scene, x: number, y: number): void {
  const g = scene.add.graphics();
  g.lineStyle(3, 0x4fd8ff, 0.8).strokeCircle(0, 0, 58).strokeCircle(0, 0, 40);
  g.lineStyle(2, 0x4fd8ff, 0.6).strokeCircle(0, 0, 22);
  const ring = scene.add.container(x, y + 14, [g]).setDepth(-5);
  Array.from("ᚠᚢᚦᚨᚱᚲᚷᚹ").forEach((glyph, i, all) => {
    const a = (i / all.length) * Math.PI * 2;
    ring.add(scene.add.text(Math.cos(a) * 49, Math.sin(a) * 49, glyph, { fontSize: "14px", color: "#4fd8ff" }).setOrigin(0.5).setRotation(a + Math.PI / 2));
  });
  if (!reduceMotion()) scene.tweens.add({ targets: ring, angle: 360, duration: 24000, repeat: -1 });
  glow(scene, x, y + 14, 0x4fd8ff, 3.4, 1800).setDepth(-5);
}
