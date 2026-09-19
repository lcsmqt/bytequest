import Phaser from "phaser";
import enemySizes from "./enemySheets.json";

export type BugKind = keyof typeof enemySizes;
export interface Point {
  x: number;
  y: number;
}

/** Per-monster look: displayed height (world px at ws=1), hover height for flyers, frame roles in its 3-pose sheet. */
const LOOK: Record<BugKind, { h: number; hover: number; move: [number, number]; attack: number; tint: number; faceLeft?: boolean }> = {
  slime: { h: 28, hover: 0, move: [0, 1], attack: 1, tint: 0x7dff5c },
  wraith: { h: 40, hover: 8, move: [0, 1], attack: 2, tint: 0x6a7dff },
  imp: { h: 34, hover: 0, move: [0, 2], attack: 1, tint: 0xff6a3c },
  bat: { h: 34, hover: 16, move: [0, 1], attack: 2, tint: 0xd05cff },
  goblin: { h: 40, hover: 0, move: [0, 1], attack: 2, tint: 0xa8ff5c, faceLeft: true },
};

type State = "wander" | "notice" | "chase" | "engaged" | "away" | "dead";

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/**
 * A roaming bug. Wanders near home; when Byte comes close it notices him ("!"), then chases at a pace he can
 * outrun (walking is 140, sprinting ~217; chase is ~64). Catching him returns true from update() and the scene starts
 * the debug encounter. Fleeing far enough — or closing the encounter — makes it slink back home.
 */
export class Bug {
  x: number;
  y: number;
  state: State = "wander";
  gone = false;

  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly look: (typeof LOOK)[BugKind];
  private readonly scale: number;
  private readonly feet: number;
  private readonly home: Point;
  private target: Point | null = null;
  private waitUntil = 0;
  private noticeUntil = 0;
  private calmUntil = 0;
  private hop = 0; // vertical offset from hopping/hovering, added to the sprite only

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly o: { kind: BugKind; x: number; y: number; ws: number; roam: number; walkable: (x: number, y: number) => boolean },
  ) {
    this.look = LOOK[o.kind];
    this.scale = (this.look.h * o.ws) / 84;
    this.feet = 42 * this.scale;
    this.x = o.x;
    this.y = o.y;
    this.home = { x: o.x, y: o.y };
    this.sprite = scene.add
      .sprite(o.x, o.y, `enemy-${o.kind}`, 0)
      .setOrigin(0.5, (85 - 42) / 86)
      .setScale(this.scale);
    this.shadow = scene.add.ellipse(o.x, o.y + this.feet, 22 * o.ws, 7 * o.ws, 0x000000, 0.3).setDepth(-4);
    this.waitUntil = scene.time.now + rand(400, 2500);
    this.calmUntil = scene.time.now + 3500; // no ambush the moment the scene opens
  }

  get chasing(): boolean {
    return this.state === "chase" || this.state === "notice";
  }

  /** Returns true on the frame the bug catches Byte. `active` = the player is free to be caught (no dialogue/terminal). */
  update(time: number, dt: number, player: Point, active: boolean): boolean {
    if (this.gone) return false;
    const { ws } = this.o;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    let caught = false;

    if (this.state === "engaged" || this.state === "dead" || !active) {
      this.idle(time);
    } else if (this.state === "notice") {
      this.sprite.setFrame(this.look.attack);
      if (time > this.noticeUntil) this.state = "chase";
    } else if (this.state === "chase") {
      if (dist > 150 * ws) this.giveUp(time);
      else if (dist < 24 * ws) {
        this.state = "engaged";
        caught = true;
      } else this.step(player.x, player.y, 64 * ws, dt, time);
    } else if (this.state === "away") {
      if (Math.hypot(this.home.x - this.x, this.home.y - this.y) < 6 || time > this.calmUntil + 4000) this.state = "wander";
      else this.step(this.home.x, this.home.y, 52 * ws, dt, time);
    } else {
      // wander
      if (time > this.calmUntil && dist < 105 * ws && this.clearLine(player)) this.notice(time);
      else if (this.target) {
        if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 4) {
          this.target = null;
          this.waitUntil = time + rand(1200, 3600);
        } else this.step(this.target.x, this.target.y, 24 * ws, dt, time);
      } else {
        this.idle(time);
        if (time > this.waitUntil) this.pickTarget(time);
      }
    }
    this.place(time);
    return caught;
  }

  /** Byte is caught: snap to the attack pose. */
  engage(): void {
    this.state = "engaged";
    this.sprite.setFrame(this.look.attack);
  }

  /** After a wrong answer: a quick lunge. */
  lunge(dir: number): void {
    this.sprite.setFrame(this.look.attack);
    this.scene.tweens.add({ targets: this, x: this.x + dir * 10 * this.o.ws, duration: 110, yoyo: true, ease: "Quad.out" });
  }

  /** Encounter abandoned: back off and stay calm for a while. */
  retreat(time: number, ms = 5000): void {
    this.state = "away";
    this.calmUntil = time + ms;
    this.target = null;
  }

  defeat(burst: (x: number, y: number, tint: number) => void): void {
    this.state = "dead";
    this.sprite.setTint(0xff5c5c);
    if (this.o.kind === "slime") this.sprite.setFrame(2); // the X-eyed hurt pose
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0,
      scaleY: this.scale * 1.3,
      angle: 200,
      alpha: 0,
      duration: 520,
      delay: 160,
      ease: "Back.in",
      onStart: () => burst(this.x, this.y, this.look.tint),
      onComplete: () => {
        this.sprite.destroy();
        this.shadow.destroy();
        this.gone = true;
      },
    });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 600 });
  }

  private notice(time: number): void {
    this.state = "notice";
    this.noticeUntil = time + 480;
    this.target = null;
    const mark = this.scene.add
      .text(this.x, this.y - this.feet - 14 * this.o.ws, "!", { fontFamily: '"Press Start 2P"', fontSize: `${12 * this.o.ws}px`, color: "#ff5c5c" })
      .setOrigin(0.5)
      .setDepth(1e5)
      .setScale(0.2);
    this.scene.tweens.add({ targets: mark, scale: 1, y: mark.y - 6, duration: 180, ease: "Back.out" });
    this.scene.tweens.add({ targets: mark, alpha: 0, delay: 420, duration: 200, onComplete: () => mark.destroy() });
    this.scene.tweens.add({ targets: this.sprite, scaleY: this.scale * 1.25, scaleX: this.scale * 0.85, duration: 120, yoyo: true });
  }

  private giveUp(time: number): void {
    this.state = "away";
    this.calmUntil = time + 3000;
  }

  private pickTarget(time: number): void {
    for (let i = 0; i < 12; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(this.o.roam * 0.3, this.o.roam);
      const tx = this.home.x + Math.cos(a) * r;
      const ty = this.home.y + Math.sin(a) * r * 0.6;
      if (this.spot(tx, ty)) {
        this.target = { x: tx, y: ty };
        return;
      }
    }
    this.waitUntil = time + 2000;
  }

  private spot(x: number, y: number): boolean {
    const { ws, walkable } = this.o;
    const fy = y + this.feet;
    return walkable(x, fy) && walkable(x - 8 * ws, fy) && walkable(x + 8 * ws, fy);
  }

  /** Straight line to Byte free of walls (a bug behind a cliff does not notice him). */
  private clearLine(p: Point): boolean {
    const n = Math.ceil(Math.hypot(p.x - this.x, p.y - this.y) / 14);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.o.walkable(this.x + (p.x - this.x) * t, this.y + this.feet + (p.y - this.y) * t)) return false;
    }
    return true;
  }

  private step(tx: number, ty: number, speed: number, dt: number, time: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const s = Math.min(d, speed * (dt / 1000));
    const nx = this.x + (dx / d) * s;
    const ny = this.y + (dy / d) * s;
    // axis-separated so it slides along walls instead of freezing on them
    if (this.spot(nx, this.y)) this.x = nx;
    if (this.spot(this.x, ny)) this.y = ny;
    if (Math.abs(dx) > 1) this.sprite.setFlipX(this.look.faceLeft ? dx > 0 : false);
    this.animateMove(time);
  }

  private animateMove(time: number): void {
    const { ws, kind } = this.o;
    if (kind === "slime") {
      const phase = Math.abs(Math.sin(time / 170));
      this.hop = -phase * 7 * ws;
      this.sprite.setFrame(phase > 0.55 ? this.look.move[1] : 0);
      this.sprite.setScale(this.scale * (1 + 0.1 * (1 - phase)), this.scale * (1 - 0.1 * (1 - phase))); // squash on landing
    } else {
      this.sprite.setFrame(this.look.move[Math.floor(time / 230) % 2]);
      this.hop = -Math.abs(Math.sin(time / 120)) * 2.5 * ws;
      this.sprite.setScale(this.scale);
    }
  }

  private idle(time: number): void {
    const { ws, kind } = this.o;
    if (this.state !== "engaged" && this.state !== "dead") this.sprite.setFrame(0);
    this.hop = 0;
    const breathe = 1 + 0.03 * Math.sin(time / 300 + this.home.x);
    if (this.state !== "dead") this.sprite.setScale(this.scale * (kind === "slime" ? 1 / breathe : 1), this.scale * breathe);
    if (this.look.hover) this.hop = Math.sin(time / 260 + this.home.y) * 2 * ws;
  }

  private place(time: number): void {
    const { ws } = this.o;
    const hover = this.look.hover * ws + (this.look.hover ? Math.sin(time / 260 + this.home.y) * 2.5 * ws : 0);
    this.sprite.setPosition(this.x, this.y - hover + this.hop).setDepth(this.y);
    // shadow shrinks as the sprite rises above the ground
    const lift = hover - this.hop;
    this.shadow.setPosition(this.x, this.y + this.feet).setScale(Phaser.Math.Clamp(1 - lift / (40 * ws), 0.5, 1)).setDepth(this.y - 1);
  }
}
