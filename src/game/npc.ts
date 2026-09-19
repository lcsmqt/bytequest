import Phaser from "phaser";
import type { NpcSheet } from "./sprites";

type Dir = "up" | "down" | "left" | "right";
export interface Point {
  x: number;
  y: number;
}

export interface NpcOptions {
  sheet: NpcSheet;
  x: number;
  y: number;
  /** World scale of the room (characters are drawn bigger in illustrated worlds). */
  ws: number;
  /** Radius around home the NPC strolls within; 0 = stands in place. */
  roam: number;
  /** Is a foot position walkable? Lets illustrated worlds keep NPCs off cliffs and water. */
  walkable: (x: number, y: number) => boolean;
  tint?: number;
  /** Stroll speed in world px/s at ws=1. */
  speed?: number;
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/**
 * A living background character: strolls around its home point with the walk cycle (mirrored for left),
 * pauses, turns to look at Byte when close, freezes and faces him while a dialogue is open, and now and then
 * strikes its cast pose. Position is the sprite's mid-body point, like the player's, so distance checks match.
 */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  /** Set while the player is talking to it; cleared automatically once the dialogue closes. */
  talking = false;

  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly home: Point;
  private readonly scale: number;
  private readonly feet: number;
  private target: Point | null = null;
  private waitUntil = 0;
  private castUntil = 0;
  private nextCast: number;
  private facing: Dir = "down";
  private player: Point = { x: 0, y: 0 };
  private greeted = false;
  private hopStart = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly o: NpcOptions,
  ) {
    const { sheet, ws } = o;
    this.scale = (sheet.height * ws) / sheet.content;
    this.feet = (sheet.content / 2) * this.scale; // mid-body -> ground
    this.x = o.x;
    this.y = o.y;
    this.home = { x: o.x, y: o.y };
    this.sprite = scene.add
      .sprite(o.x, o.y, sheet.key, sheet.front)
      .setOrigin(0.5, (sheet.h - 1 - sheet.content / 2) / sheet.h)
      .setScale(this.scale);
    if (o.tint !== undefined) this.sprite.setTint(o.tint);
    this.shadow = scene.add.ellipse(o.x, o.y + this.feet, 18 * ws, 6 * ws, 0x000000, 0.28).setDepth(-4);
    this.waitUntil = scene.time.now + rand(500, 3000);
    this.nextCast = scene.time.now + rand(5000, 12000);
  }

  update(time: number, dt: number, player: Point, dialogueOpen: boolean): void {
    this.player = player;
    const near = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (this.talking && !dialogueOpen) this.talking = false;

    if (this.talking) {
      this.face(player);
      this.idle(time);
    } else if (time < this.castUntil) {
      // holding the cast pose
    } else if (this.target) {
      this.stroll(time, dt, near);
    } else {
      if (near < 140 * this.o.ws) this.face(player);
      this.idle(time);
      if (time > this.waitUntil && this.o.roam > 0) this.pickTarget();
      else if (time > this.nextCast && this.o.sheet.cast) this.cast(time);
    }

    // greeting: a small hop the first time Byte comes close, re-armed once he has walked away
    if (!this.greeted && near < 110 * this.o.ws) {
      this.greeted = true;
      this.hopStart = time;
    } else if (this.greeted && near > 220 * this.o.ws) this.greeted = false;
    const t = time - this.hopStart;
    const hop = this.hopStart >= 0 && t < 380 ? Math.sin((Math.PI * t) / 380) * 8 * this.o.ws : 0;
    this.sprite.setPosition(this.x, this.y - hop).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + this.feet).setDepth(this.y - 1);
  }

  private stroll(time: number, dt: number, playerDist: number): void {
    const t = this.target!;
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4 || playerDist < 38 * this.o.ws) {
      // arrived, or Byte is in the way: stop and wait a little
      this.target = null;
      this.waitUntil = time + rand(1200, 4000);
      return;
    }
    const step = Math.min(dist, (this.o.speed ?? 42) * this.o.ws * (dt / 1000));
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.animateWalk(dx, dy, time);
  }

  private animateWalk(dx: number, dy: number, time: number): void {
    const s = this.sprite;
    const { sheet } = this.o;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.facing = dx < 0 ? "left" : "right";
      s.setFlipX(dx < 0).setAngle(0);
      s.anims.play(sheet.key === "byte-sheet" ? "byte-walk" : `${sheet.key}-walk`, true);
      s.anims.timeScale = sheet.key === "byte-sheet" ? 0.55 : 1; // strolling, not marching
    } else {
      this.facing = dy < 0 ? "up" : "down";
      s.anims.stop();
      s.setFlipX(false).setFrame(dy < 0 ? sheet.back : sheet.front).setAngle(Math.sin(time / 70) * 3.5);
    }
    // little footfall squash so single-frame walkers still read as stepping
    const bounce = Math.abs(Math.sin(time / 110));
    s.setScale(this.scale * (1 - 0.02 * bounce), this.scale * (1 + 0.035 * bounce));
  }

  private idle(time: number): void {
    const s = this.sprite;
    const { sheet } = this.o;
    s.anims.stop();
    s.setAngle(0).setScale(this.scale, this.scale * (1 + 0.015 * Math.sin(time / 420 + this.home.x)));
    const side = this.facing === "left" ? sheet.left : sheet.right;
    if (this.facing === "up") s.setFlipX(false).setFrame(sheet.back);
    else if (this.facing === "down") s.setFlipX(false).setFrame(sheet.front);
    else if (side !== undefined) s.setFlipX(false).setFrame(side);
    else s.setFlipX(this.facing === "left").setFrame(sheet.front);
  }

  private face(p: Point): void {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) * 1.4 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }

  private cast(time: number): void {
    const { sheet } = this.o;
    const frames = sheet.cast!;
    this.castUntil = time + 900;
    this.nextCast = time + rand(7000, 14000);
    this.sprite.anims.stop();
    this.sprite.setFlipX(this.facing === "left").setAngle(0).setScale(this.scale).setFrame(frames[frames.length - 1]);
    this.scene.tweens.add({ targets: this.sprite, scaleY: this.scale * 1.06, duration: 220, yoyo: true, ease: "Quad.out" });
  }

  private pickTarget(): void {
    const { roam, ws } = this.o;
    for (let i = 0; i < 20; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(roam * 0.4, roam);
      const tx = this.home.x + Math.cos(a) * r;
      const ty = this.home.y + Math.sin(a) * r * 0.6; // strolls wider than tall: top-down feels natural
      const clearOfPlayer = Math.hypot(tx - this.player.x, ty - this.player.y) > 42 * ws; // never stroll into Byte
      if (clearOfPlayer && this.pathClear(this.x, this.y, tx, ty, ws)) {
        this.target = { x: tx, y: ty };
        return;
      }
    }
    this.waitUntil = this.scene.time.now + rand(1500, 3500); // boxed in: try again later
  }

  /** Samples the straight line so NPCs never cut across water/cliffs painted in the backdrop. */
  private pathClear(x0: number, y0: number, x1: number, y1: number, ws: number): boolean {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n + this.feet;
      // feet and both shoulders must be on walkable ground
      if (!this.o.walkable(x, y) || !this.o.walkable(x - 9 * ws, y) || !this.o.walkable(x + 9 * ws, y)) return false;
    }
    return true;
  }
}
