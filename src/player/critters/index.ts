/**
 * EVERY CHARACTER, PLAYED (2026-11-20): who plays how, and how each is drawn while played. The hedgehogs have a body
 * of their own (player/standIn.ts, posed limb by limb); the others are drawn with their own model from the Club
 * (npc/patrons.ts) moved as a whole: leaning, rocking with each step, squashed and stretched, spun, tumbled, hidden
 * underground. (Their limbs are not posed one by one yet: prototypes.) What they throw, the rings, the yarn, the
 * mound of earth and the things that fall on the jinxed are drawn here too.
 */
import * as THREE from 'three';
import { makePatron, type PatronBody, type PatronKind, type PatronLook } from '../../npc/patrons';
import { HedgehogController, type HogEvents } from '../hedgehogController';
import { StandIn } from '../standIn';
import type { Critter, CritterEvents, CritterInput, CritterWorld } from './base';
import { DiggerCritter, DotCritter } from './moles';
import { AshCritter, MoCritter, PebbleCritter, VixCritter } from './turtlesFoxes';
import { BiscuitCritter, JinxCritter, SlinkCritter, SnowCritter, TawnyCritter } from './ferretsOwlsJinx';

/** Who each of them is, as a player: his kind, his look, and the one line of what he does. */
export const PLAYABLE: Record<PatronLook, { kind: PatronKind; name: string; does: string }> = {
  bramble: { kind: 'hedgehog', name: 'Bramble', does: 'rolls into a ball, spits' },
  thistle: { kind: 'hedgehog', name: 'Thistle', does: 'a pogo ball, a fan of quills' },
  digger: { kind: 'mole', name: 'Digger', does: 'digs under the floor, bursts up' },
  dot: { kind: 'mole', name: 'Dot', does: 'yarn: reeled up onto ledges' },
  pebble: { kind: 'turtle', name: 'Pebble', does: 'a sliding shell, dives' },
  mo: { kind: 'turtle', name: 'Mo', does: 'immovable, stomps, walks the bottom' },
  vix: { kind: 'fox', name: 'Vix', does: 'the fastest, a long pounce' },
  ash: { kind: 'fox', name: 'Ash', does: 'a shadow dash, twice in the air' },
  slink: { kind: 'ferret', name: 'Slink', does: 'climbs walls, slinks under' },
  biscuit: { kind: 'ferret', name: 'Biscuit', does: 'the war dance, a double jump' },
  tawny: { kind: 'owl', name: 'Tawny', does: 'flaps, glides, a talon dive' },
  snow: { kind: 'owl', name: 'Snow', does: 'hovers, feather darts' },
  jinx: { kind: 'rat', name: 'Jinx', does: 'hex magic: bad luck, blinks' },
};
export const PLAYABLE_LOOKS = Object.keys(PLAYABLE) as PatronLook[];

/** A character as the game moves him: where he is, and his step. */
export interface Playable {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  facing: number;
  grounded: boolean;
  readonly state: string;
  readonly untouchable: boolean;
  readonly steadfast: boolean;
  /** How fast he is going along the ground. */
  readonly speed: number;
  update(dt: number, input: CritterInput, w: CritterWorld, pinned: 'hurt' | 'dead' | null): CritterEvents;
}
/** ...and as the game draws him. */
export interface PlayableView {
  readonly root: THREE.Object3D;
  readonly effects: THREE.Object3D;
  setTransform(at: THREE.Vector3, facing: number): void;
  update(dt: number, events: CritterEvents | null): void;
}

/** The hedgehogs, whose controller came first (player/hedgehogController.ts), joined to the rest. */
class HogPlayable implements Playable {
  readonly hog: HedgehogController;
  last: HogEvents | null = null;
  readonly steadfast = false;
  readonly untouchable = false;
  constructor(at: THREE.Vector3, look: 'bramble' | 'thistle') {
    this.hog = new HedgehogController(at, look);
  }
  get position(): THREE.Vector3 {
    return this.hog.position;
  }
  get velocity(): THREE.Vector3 {
    return this.hog.velocity;
  }
  get facing(): number {
    return this.hog.facing;
  }
  set facing(v: number) {
    this.hog.facing = v;
  }
  get grounded(): boolean {
    return this.hog.grounded;
  }
  set grounded(v: boolean) {
    this.hog.grounded = v;
  }
  get state(): string {
    return this.hog.state;
  }
  get speed(): number {
    return this.hog.speed;
  }
  update(dt: number, input: CritterInput, w: CritterWorld, pinned: 'hurt' | 'dead' | null): CritterEvents {
    const e = this.hog.update(dt, input, w.colliders, w.water, w.foes, pinned);
    // (Kept for his body: a frame may hold more than one step.)
    if (!this.last) this.last = e;
    else {
      this.last.jumped ||= e.jumped;
      this.last.curled ||= e.curled;
      this.last.uncurled ||= e.uncurled;
      this.last.spat ||= e.spat;
      this.last.burst ||= e.burst;
      this.last.landed = Math.max(this.last.landed, e.landed);
      this.last.bounced = Math.max(this.last.bounced, e.bounced);
    }
    const sfx: CritterEvents['sfx'] = [];
    if (e.jumped) sfx.push(['jump', 0.5, 1.35]);
    if (e.curled || e.uncurled) sfx.push(['dodge', 0.6, e.curled ? 1.25 : 1.05]);
    if (e.spat) sfx.push(this.hog.look === 'thistle' ? ['whoosh', 0.6, 2] : ['spit', 0.8, 1.3]);
    if (e.burst) sfx.push(['spikeHit', 0.7, 1.5]);
    if (e.bounced > 0) sfx.push(['land', Math.min(0.8, e.bounced / 10), 1.4]);
    for (let i = 0; i < e.splats.length; i++) sfx.push(['splat', 0.5, 1.4]);
    return { hits: e.hits, sfx, jumped: e.jumped, landed: e.landed };
  }
}
class HogView implements PlayableView {
  private readonly body: StandIn;
  constructor(private readonly p: HogPlayable, look: 'bramble' | 'thistle') {
    this.body = new StandIn(look);
  }
  get root(): THREE.Object3D {
    return this.body.root;
  }
  get effects(): THREE.Object3D {
    return this.body.effects;
  }
  setTransform(at: THREE.Vector3, facing: number): void {
    this.body.setTransform(at, facing);
  }
  update(dt: number): void {
    this.body.update(dt, this.p.hog, this.p.last);
    this.p.last = null;
  }
}

/** Everyone else's body: his Club model, moved as a whole (on springs), and what he does drawn round him. */
class CritterView implements PlayableView {
  readonly root = new THREE.Group();
  readonly effects = new THREE.Group();
  private readonly pose = new THREE.Group();
  private readonly model: PatronBody;
  private readonly spring = { lean: { x: 0, v: 0 }, roll: { x: 0, v: 0 }, squash: { x: 0, v: 0 }, lift: { x: 0, v: 0 } };
  private time = 0;
  private readonly pools = new Map<string, THREE.Object3D[]>();
  private used = new Map<string, number>();
  constructor(private readonly c: Critter, private readonly kind: PatronKind, look: PatronLook) {
    this.model = makePatron(kind, look);
    this.pose.add(this.model.root);
    this.root.add(this.pose);
  }
  setTransform(at: THREE.Vector3, facing: number): void {
    this.root.position.copy(at);
    this.root.rotation.y = facing;
  }
  update(dt: number, ev: CritterEvents | null): void {
    this.time += dt;
    const c = this.c;
    const L = c.look;
    // (An owl in the air waves its wings: the model's talking hands do it.)
    const flying = this.kind === 'owl' && !c.grounded && c.state !== 'swim';
    this.model.update(dt, { time: this.time, talking: flying, mouth: flying ? 0.5 + 0.5 * Math.sin(this.time * 20) : 0, headYaw: 0, doing: 'stand', seated: false, turn: 0 });
    if (ev?.landed && ev.landed > 3) this.spring.squash.v -= Math.min(6, ev.landed * 0.5);
    if (ev?.jumped) this.spring.squash.v += 3;
    const step = L.step * Math.sin(L.stride);
    const want = { lean: L.lean, roll: L.roll + 0.07 * step, squash: L.squash, lift: L.lift + 0.03 * Math.abs(step) };
    for (const k of ['lean', 'roll', 'squash', 'lift'] as const) {
      const q = this.spring[k];
      const n = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < n; i++) {
        q.v += (196 * (want[k] - q.x) - 2 * 0.5 * 14 * q.v) * (dt / n);
        q.x += q.v * (dt / n);
      }
    }
    const sq = Math.max(-0.5, Math.min(0.4, this.spring.squash.x));
    // (Turned about his middle, so a tumble or a lean does not swing his feet through the floor.)
    const mid = 0.45;
    this.pose.position.set(0, this.spring.lift.x + mid, 0);
    this.model.root.position.set(0, -mid, 0);
    this.pose.rotation.set(this.spring.lean.x + L.tumble, L.spin, this.spring.roll.x, 'YXZ');
    this.pose.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    this.pose.visible = !L.hidden;
    this.drawFx();
  }

  private take<T extends THREE.Object3D>(key: string, make: () => T): T {
    const list = this.pools.get(key) ?? [];
    this.pools.set(key, list);
    const n = this.used.get(key) ?? 0;
    this.used.set(key, n + 1);
    if (!list[n]) {
      list[n] = make();
      this.effects.add(list[n]);
    }
    list[n].visible = true;
    return list[n] as T;
  }
  private drawFx(): void {
    for (const list of this.pools.values()) for (const o of list) o.visible = false;
    this.used = new Map();
    const c = this.c;
    for (const s of c.shots) {
      const m = this.take('shot', () => new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ transparent: true })));
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.set(s.color);
      mat.opacity = s.end ? Math.max(0, 1 - s.end.age / 0.4) : 1;
      m.position.copy(s.end ? s.end.at : s.pos);
      m.scale.setScalar(s.radius * (s.end ? 1.8 : 1));
    }
    for (const r of c.fx.rings) {
      const m = this.take('ring', () => {
        const o = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }));
        o.rotation.x = -Math.PI / 2;
        return o;
      });
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.set(r.color);
      mat.opacity = r.alpha;
      m.position.set(r.x, r.y, r.z);
      m.scale.setScalar(r.r);
    }
    for (const l of c.fx.lines) {
      const m = this.take('line', () => new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4).translate(0, 0.5, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial()));
      (m.material as THREE.MeshBasicMaterial).color.set(l.color);
      m.position.copy(l.a);
      m.lookAt(l.b);
      m.scale.set(1, 1, Math.max(0.01, l.a.distanceTo(l.b)));
    }
    for (const p of c.fx.props) {
      const m = this.take(p.kind, () => PROPS[p.kind]());
      m.position.set(p.x, p.y, p.z);
      m.rotation.set(p.kind === 'die' ? p.turn : 0, p.turn, 0);
      if (p.kind === 'ghost') ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = p.alpha ?? 0.4;
    }
  }
}

const solid = (color: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color });
/** The things drawn round them: a mound of earth, the things that fall on the jinxed, a shadow left behind. */
const PROPS: Record<string, () => THREE.Object3D> = {
  mound: () => new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1.3), solid(0x6a4a2e)),
  spool: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), solid(0xc84a3a)));
    for (const y of [-0.27, 0.27]) {
      const end = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), solid(0xd8b888));
      end.position.y = y;
      g.add(end);
    }
    return g;
  },
  teacup: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.22, 0.38, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xf0ece4, side: THREE.DoubleSide })));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 4, 8), solid(0xf0ece4));
    handle.position.x = 0.36;
    g.add(handle);
    return g;
  },
  die: () => new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), solid(0xf4f2ec)),
  button: () => new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 14), solid(0x3a6ad0)),
  ghost: () => new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6).scale(0.8, 1.3, 1.2).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0x2a2440, transparent: true, depthWrite: false })),
};

/** A character to play, by look, started where the knight is. */
export function makePlayable(look: PatronLook, at: THREE.Vector3): { ctl: Playable; view: PlayableView } {
  if (look === 'bramble' || look === 'thistle') {
    const ctl = new HogPlayable(at, look);
    return { ctl, view: new HogView(ctl, look) };
  }
  const c: Critter =
    look === 'digger' ? new DiggerCritter(at)
    : look === 'dot' ? new DotCritter(at)
    : look === 'pebble' ? new PebbleCritter(at)
    : look === 'mo' ? new MoCritter(at)
    : look === 'vix' ? new VixCritter(at)
    : look === 'ash' ? new AshCritter(at)
    : look === 'slink' ? new SlinkCritter(at)
    : look === 'biscuit' ? new BiscuitCritter(at)
    : look === 'tawny' ? new TawnyCritter(at)
    : look === 'snow' ? new SnowCritter(at)
    : new JinxCritter(at);
  return { ctl: c, view: new CritterView(c, PLAYABLE[look].kind, look) };
}
